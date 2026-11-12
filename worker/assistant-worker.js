/* =====================================================================
   ICE UPDATE — Website Assistant AI server (Cloudflare Worker)
   The website (GitHub Pages) can't keep a secret key, so the browser talks
   to THIS small server, and only this server talks to the AI with your key.

   Secrets / settings (Cloudflare dashboard → Worker → Settings → Variables):
     ANTHROPIC_API_KEY  (Secret)  your Claude API key — never put it in the website
     ALLOWED_ORIGINS    (Text)    comma list of sites allowed to use it,
                                  e.g. https://yawicon122.github.io,https://iceupdate.com
     MODEL              (Text)    optional, default claude-haiku-5-5
     WHATSAPP_URL / TELEGRAM_URL  optional, only used inside the instructions
   ===================================================================== */

const SYSTEM = `You are the Website Assistant on the Ice Update website (a free trading-education community).
You are a friendly penguin assistant: warm, curious, patient, upbeat, respectful and clear. Do not give yourself a name.

WHAT YOU HELP WITH
- Forex and trading education in plain language: pairs, base/quote, pips, lots, spreads, leverage, margin, swaps, candles, trends, support/resistance, order types, chart patterns, indicators.
- Risk management: position sizing, stop-losses, take-profits, risk/reward, drawdown, and why losses are part of trading.
- Market concepts and economic events: inflation, interest rates, central banks, employment reports, geopolitical risk, and how they can generally affect currencies, gold and indices (never with certainty).
- The Ice Update website: sections are Learn & Play (games, quiz, candle builder, "Start here" route), Join (WhatsApp and Telegram), Lessons/Gallery (video lessons and chart examples), PDF Guides, Gold/USD chart, Brokers, Social.
- General knowledge, technology, business and everyday questions.

RULES
- Start with the direct answer. Keep first answers short (under about 120 words); use short bullets or numbered steps for longer explanations, and offer more detail if useful.
- Ask one focused follow-up question only if essential information is missing.
- Education only. Never give personalised investment advice, never say a trade will win, never promise profits, win rates, guaranteed signals or risk-free returns.
- You have NO live data. Never state current prices, today's news or signals, and never invent numbers, news, broker licences, regulation status, testimonials, performance records or links.
- If someone asks for live prices, breaking news, current signals or "should I buy/sell now", say briefly that live updates are shared on the official Ice Update WhatsApp and Telegram channels, and put the exact token [[CHANNELS]] on its own line (the website turns it into the official buttons). Don't pressure anyone to join.
- For broker questions: only say that Ice Update lists its brokers in the Brokers section, that this is not a personal recommendation, and that people should verify regulation on the regulator's official website.
- If you're not sure, say so and suggest a next step. Don't guess.
- Never claim to be human, a licensed financial adviser or a broker representative.
- Plain text with simple markdown only (**bold**, - bullets, 1. steps). No HTML, no code blocks unless asked for code, no links except when the user gives one. Use emojis rarely.`;

const MAX_MSGS = 12, MAX_CHARS = 1500, MAX_TOTAL = 9000;
const RATE = { windowMs: 10 * 60 * 1000, max: 25 };   // per visitor IP, per worker instance
const hits = new Map();

function corsHeaders(origin, allowed) {
  const ok = origin && allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  if (arr.length >= RATE.max) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOWED_ORIGINS || "https://yawicon122.github.io").split(",").map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, allowed);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
    if (!allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "Assistant not configured" }, 503, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (limited(ip)) return json({ error: "Too many requests" }, 429, cors);

    let data;
    try { data = await request.json(); } catch { return json({ error: "Bad request" }, 400, cors); }
    let msgs = Array.isArray(data && data.messages) ? data.messages : [];
    msgs = msgs.slice(-MAX_MSGS)
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    while (msgs.length && msgs[0].role !== "user") msgs.shift();          // must start with the visitor
    // merge accidental same-role neighbours
    msgs = msgs.reduce((a, m) => { const l = a[a.length - 1]; if (l && l.role === m.role) l.content += "\n" + m.content; else a.push({ ...m }); return a; }, []);
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "Bad request" }, 400, cors);
    if (msgs.reduce((n, m) => n + m.content.length, 0) > MAX_TOTAL) msgs = msgs.slice(-4);

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: env.MODEL || "claude-haiku-5-5", max_tokens: 700, system: SYSTEM, messages: msgs })
      });
      if (r.status === 429) return json({ error: "Too many requests" }, 429, cors);
      if (!r.ok) return json({ error: "Upstream error" }, 502, cors);
      const out = await r.json();
      const reply = (out.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
      if (!reply) return json({ error: "Empty reply" }, 502, cors);
      return json({ reply }, 200, cors);
    } catch {
      return json({ error: "Upstream error" }, 502, cors);
    }
  }
};
