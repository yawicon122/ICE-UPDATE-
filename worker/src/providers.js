/* ---------- providers: the tool-calling loop for Claude (Anthropic) or OpenAI. Keys are read from the server only. ---------- */
import { redact } from "./guard.js";
export class AiError extends Error { constructor(kind, status, detail) { super(kind); this.kind = kind; this.status = status; this.detail = detail; } }
/* every AI call gets a hard time limit, so a stuck provider fails in seconds, not minutes */
function timed(fetchFn, env) {
  const ms = Math.max(5000, parseInt(env.AI_TIMEOUT_MS || "25000", 10) || 25000);
  return (u, i) => fetchFn(u, { ...i, signal: AbortSignal.timeout(ms) }).catch(e => { if (e && (e.name === "TimeoutError" || e.name === "AbortError")) throw new AiError("timeout", 504); throw e; });
}
/* a MODEL setting left over from another AI (e.g. a Gemini name while using Claude) is ignored */
function pickModel(env, which) {
  const rx = { anthropic: /^claude/i, openai: /^(gpt|o\d|chatgpt)/i, gemini: /^(models\/)?gemini/i }[which];
  const own = env[which.toUpperCase() + "_MODEL"] || (which === "anthropic" ? "" : "");
  if (own) return own;
  if (env.MODEL && rx.test(env.MODEL)) return env.MODEL;
  return { anthropic: "claude-haiku-5-5", openai: "gpt-4.1", gemini: "gemini-flash-latest" }[which];
}
async function upErr(r, env) {
  let d = ""; try { d = (await r.text()).slice(0, 300); } catch (e) { /* no body */ }
  return new AiError("upstream", r.status, redact(d, [env.ANTHROPIC_API_KEY, env.OPENAI_API_KEY, env.GEMINI_API_KEY]));
}
const MAX_STEPS = 6;

export async function runAnthropic(o) {
  const { env, system, messages, tools, exec, collected } = o, fetchFn = timed(o.fetchFn, o.env);
  const defs = tools.map(t => ({ name: t.name, description: t.description, input_schema: t.schema }));
  if (env.WEB_SEARCH === "on" && !o.noSearch) defs.push({ type: "web_search_20250305", name: "web_search", max_uses: 2 });
  if (defs.length) defs[defs.length - 1].cache_control = { type: "ephemeral" };
  // the fixed instructions are cached by Anthropic (faster + cheaper); the time/notes part changes every call
  const cut = system.indexOf("\n\nCurrent UTC time:");
  const sys = cut > 0 ? [{ type: "text", text: system.slice(0, cut), cache_control: { type: "ephemeral" } }, { type: "text", text: system.slice(cut + 2) }] : system;
  const msgs = messages.slice();
  for (let step = 0; step < MAX_STEPS; step++) {
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: pickModel(env, "anthropic"), max_tokens: 700, system: sys, messages: msgs, ...(defs.length ? { tools: defs } : {}) })
    });
    if (r.status === 429) throw new AiError("rate");
    if (!r.ok) throw await upErr(r, env);
    const out = await r.json(), content = Array.isArray(out.content) ? out.content : [];
    for (const b of content) if (b.type === "text" && Array.isArray(b.citations)) for (const c of b.citations) if (c && c.url) collected.sources.push({ title: c.title, url: c.url });
    const uses = content.filter(b => b.type === "tool_use");
    if (out.stop_reason === "tool_use" && uses.length) {
      msgs.push({ role: "assistant", content });
      const results = await Promise.all(uses.map(async u => ({ type: "tool_result", tool_use_id: u.id, content: await exec(u.name, u.input) })));
      msgs.push({ role: "user", content: results });
      continue;
    }
    if (out.stop_reason === "pause_turn") { msgs.push({ role: "assistant", content }); continue; }
    const text = content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!text) throw new AiError("empty");
    return text;
  }
  throw new AiError("loop");
}

export async function runOpenAI(o) {
  const { env, system, messages, tools, exec, collected } = o, fetchFn = timed(o.fetchFn, o.env);
  const defs = tools.map(t => ({ type: "function", name: t.name, description: t.description, parameters: t.schema, strict: false }));
  if (env.WEB_SEARCH === "on" && !o.noSearch) defs.push({ type: "web_search" });
  const model = pickModel(env, "openai");
  let input = messages.map(m => ({ role: m.role, content: m.content })), prev = null;
  for (let step = 0; step < MAX_STEPS; step++) {
    const body = { model, instructions: system, input, ...(defs.length ? { tools: defs } : {}), max_output_tokens: 700 };
    if (prev) body.previous_response_id = prev;
    const r = await fetchFn("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (r.status === 429) throw new AiError("rate");
    if (!r.ok) throw await upErr(r, env);
    const out = await r.json(), items = Array.isArray(out.output) ? out.output : [];
    const calls = items.filter(i => i.type === "function_call");
    let text = "";
    for (const i of items) if (i.type === "message" && Array.isArray(i.content)) for (const c of i.content) if (c.type === "output_text") {
      text += (text ? "\n" : "") + c.text;
      for (const a of c.annotations || []) if (a && a.type === "url_citation" && a.url) collected.sources.push({ title: a.title, url: a.url });
    }
    if (!calls.length) { text = text.trim(); if (!text) throw new AiError("empty"); return text; }
    prev = out.id;
    input = await Promise.all(calls.map(async c => {
      let args = {}; try { args = JSON.parse(c.arguments || "{}"); } catch (e) { /* bad JSON from the model */ }
      return { type: "function_call_output", call_id: c.call_id, output: await exec(c.name, args) };
    }));
  }
  throw new AiError("loop");
}

/* Google Gemini (generateContent). The key goes in a header, never in the URL. */
const gType = n => Array.isArray(n) ? n.map(gType) : n && typeof n === "object" ? Object.fromEntries(Object.entries(n).map(([k, v]) => [k, k === "type" && typeof v === "string" ? v.toUpperCase() : gType(v)])) : n;

let geminiThinkingOk = true;   // flips off if a model rejects the thinking setting
export async function runGemini(o) {
  const { env, system, messages, tools, exec } = o, fetchFn = timed(o.fetchFn, o.env);
  const decls = tools.map(t => { const d = { name: t.name, description: t.description }; if (Object.keys(t.schema.properties || {}).length) d.parameters = gType(t.schema); return d; });
  let model = pickModel(env, "gemini").replace(/^models\//, "");
  const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  for (let step = 0; step < MAX_STEPS; step++) {
    const r = await fetchFn("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, ...(decls.length ? { tools: [{ functionDeclarations: decls }] } : {}), generationConfig: { maxOutputTokens: 4096, ...(geminiThinkingOk && /^-?\d+$/.test(env.GEMINI_THINKING_BUDGET || "") ? { thinkingConfig: { thinkingBudget: parseInt(env.GEMINI_THINKING_BUDGET, 10) } } : {}) } })
    });
    if (r.status === 429) throw new AiError("rate", 429);
    if (!r.ok) {
      const e = await upErr(r, env);
      // a retired or misspelled MODEL setting: fall back to Google's always-current alias instead of failing
      if (r.status === 404 && model !== "gemini-flash-latest" && /not found|not supported/i.test(e.detail || "")) { model = "gemini-flash-latest"; step--; continue; }
      if (r.status === 400 && geminiThinkingOk && /think/i.test(e.detail || "")) { geminiThinkingOk = false; step--; continue; }
      throw e;
    }
    const out = await r.json(), cand = out.candidates && out.candidates[0], parts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
    const calls = parts.filter(p => p.functionCall);
    if (calls.length) {
      // send the model's own parts back unchanged: Gemini needs its "thoughtSignature" values returned exactly as given
      contents.push({ role: "model", parts });
      const resp = await Promise.all(calls.map(async p => ({ functionResponse: { name: p.functionCall.name, response: { output: await exec(p.functionCall.name, p.functionCall.args) } } })));
      contents.push({ role: "user", parts: resp });
      continue;
    }
    const text = parts.filter(p => typeof p.text === "string" && !p.thought).map(p => p.text).join("").trim();
    if (!text) throw new AiError("empty", 200);
    return text;
  }
  throw new AiError("loop");
}
