/* ---------- providers: the tool-calling loop for Claude (Anthropic) or OpenAI. Keys are read from the server only. ---------- */
export class AiError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
const MAX_STEPS = 6;

export async function runAnthropic(o) {
  const { env, system, messages, tools, exec, fetchFn, collected } = o;
  const defs = tools.map(t => ({ name: t.name, description: t.description, input_schema: t.schema }));
  if (env.WEB_SEARCH === "on") defs.push({ type: "web_search_20250305", name: "web_search", max_uses: 3 });
  const msgs = messages.slice();
  for (let step = 0; step < MAX_STEPS; step++) {
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.MODEL || "claude-haiku-5-5", max_tokens: 1000, system, messages: msgs, tools: defs })
    });
    if (r.status === 429) throw new AiError("rate");
    if (!r.ok) throw new AiError("upstream");
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
  const { env, system, messages, tools, exec, fetchFn, collected } = o;
  const defs = tools.map(t => ({ type: "function", name: t.name, description: t.description, parameters: t.schema, strict: false }));
  if (env.WEB_SEARCH === "on") defs.push({ type: "web_search" });
  const model = env.MODEL || env.OPENAI_MODEL || "gpt-4.1";
  let input = messages.map(m => ({ role: m.role, content: m.content })), prev = null;
  for (let step = 0; step < MAX_STEPS; step++) {
    const body = { model, instructions: system, input, tools: defs, max_output_tokens: 1000 };
    if (prev) body.previous_response_id = prev;
    const r = await fetchFn("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "content-type": "application/json" }, body: JSON.stringify(body)
    });
    if (r.status === 429) throw new AiError("rate");
    if (!r.ok) throw new AiError("upstream");
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
