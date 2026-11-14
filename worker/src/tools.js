/* ---------- tools: what the AI is allowed to call. Results are plain data, wrapped as untrusted. ---------- */
export const TOOLS = [
  { name: "calculate", description: "Exact maths. Use for ANY arithmetic. Supports + - * / ^ ( ) , percent as a postfix (50% = 0.5, so '10% of 200' is 200*10%), and sqrt, abs, round(x,d), min, max, pow, mod, ln, log10, exp, floor, ceil, pi.",
    schema: { type: "object", properties: { expression: { type: "string", description: "e.g. 1500*(1+0.05)^3" } }, required: ["expression"] } },
  { name: "trade_calc", description: "Trading and finance calculators. kind: position_size (needs balance, riskPercent, entry, stop, pair), risk_reward (entry, stop, target), pip_value (pair, lots), profit_loss (pair, entry, exit, lots, direction), compound_interest (principal, ratePercent, years, optional monthlyContribution, compoundsPerYear), percent_change (from, to). Account currency is USD.",
    schema: { type: "object", properties: { kind: { type: "string", enum: ["position_size", "risk_reward", "pip_value", "profit_loss", "compound_interest", "percent_change"] }, pair: { type: "string" }, balance: { type: "number" }, riskPercent: { type: "number" }, entry: { type: "number" }, stop: { type: "number" }, target: { type: "number" }, exit: { type: "number" }, lots: { type: "number" }, direction: { type: "string", enum: ["long", "short"] }, price: { type: "number" }, quoteToAccountRate: { type: "number" }, contractSize: { type: "number" }, pipSize: { type: "number" }, principal: { type: "number" }, ratePercent: { type: "number" }, years: { type: "number" }, monthlyContribution: { type: "number" }, compoundsPerYear: { type: "number" }, from: { type: "number" }, to: { type: "number" } }, required: ["kind"] } },
  { name: "get_quote", description: "Live price for up to 4 instruments: forex pairs (EURUSD), gold/silver (XAUUSD, XAGUSD), crypto (BTC, ETH), indices (NASDAQ, SPX, DOW; shown via ETF proxies) and stock tickers (AAPL). Returns price, change, high/low, provider, timestamp and status. NEVER state a current price without calling this.",
    schema: { type: "object", properties: { symbols: { type: "array", items: { type: "string" }, maxItems: 4 } }, required: ["symbols"] } },
  { name: "analyze_market", description: "Educational technical read of one instrument from recent candles: trend, RSI, MACD, moving averages, ATR volatility, support/resistance, candle patterns. interval: 5min, 15min, 30min, 1h, 4h, 1day, 1week. For multi-timeframe analysis call it more than once.",
    schema: { type: "object", properties: { symbol: { type: "string" }, interval: { type: "string", enum: ["5min", "15min", "30min", "1h", "4h", "1day", "1week"] } }, required: ["symbol"] } },
  { name: "market_news", description: "Recent market headlines (general, forex, crypto, merger).",
    schema: { type: "object", properties: { category: { type: "string", enum: ["general", "forex", "crypto", "merger"] } } } },
  { name: "get_time", description: "Current UTC date and time.", schema: { type: "object", properties: {} } }
];

const fmtTime = iso => { const d = new Date(iso); return isNaN(d) ? String(iso) : d.toUTCString().replace(/^\w+, /, "").replace(/:\d\d GMT$/, " UTC"); };

/* ctx: { market, now(), collected: { quotes: [], analyses: [], sources: [] } } */
export function makeExecutor(ctx, evaluate, tradeCalc, summarize, untrusted) {
  return async function exec(name, args) {
    args = args && typeof args === "object" ? args : {};
    try {
      if (name === "calculate") return untrusted({ expression: String(args.expression || "").slice(0, 300), result: evaluate(args.expression) });
      if (name === "trade_calc") return untrusted(tradeCalc(args));
      if (name === "get_time") return untrusted({ utc: new Date(ctx.now()).toISOString() });
      if (name === "get_quote") {
        const syms = (Array.isArray(args.symbols) ? args.symbols : [args.symbols]).filter(Boolean).slice(0, 4);
        if (!syms.length) return untrusted({ error: "No symbols given." });
        const out = await Promise.all(syms.map(s => ctx.market.getQuote(s)));
        out.forEach(q => { if (q.ok) ctx.collected.quotes.push(q); });
        return untrusted(out);
      }
      if (name === "analyze_market") {
        const c = await ctx.market.getCandles(args.symbol, args.interval);
        if (!c.ok) return untrusted(c);
        const s = summarize(c.candles);
        ctx.collected.analyses.push({ instrument: c.instrument, provider: c.provider, interval: c.interval, lastCandleTime: s.lastCandleTime });
        return untrusted({ instrument: c.instrument, provider: c.provider, interval: c.interval, note: c.note, analysis: s });
      }
      if (name === "market_news") {
        const n = await ctx.market.getNews(args.category);
        return untrusted(n);
      }
      return untrusted({ error: "Unknown tool." });
    } catch (e) {
      return untrusted({ error: String(e && e.message || "Tool failed.").slice(0, 200) });
    }
  };
}

/* the data line is built from what the tools really returned, not from what the model says */
export function dataFooter(collected) {
  const lines = [];
  const seen = new Set();
  for (const q of collected.quotes) {
    if (seen.has(q.instrument)) continue; seen.add(q.instrument);
    lines.push(q.instrument + " " + q.price + " " + q.currency + " · " + q.provider + " · " + fmtTime(q.timestamp) + " · " + q.status + (q.status === "delayed" || q.status === "stale" ? " (" + Math.round(q.ageSeconds / 60) + " min old)" : ""));
  }
  for (const a of collected.analyses) lines.push("Candles: " + a.instrument + " " + a.interval + " · " + a.provider + " · last candle " + a.lastCandleTime);
  const src = [];
  for (const s of collected.sources) if (s.url && !src.some(x => x.url === s.url) && src.length < 4) src.push(s);
  let out = "";
  if (lines.length) out += "\n\nMarket data: " + lines.join("\nMarket data: ");
  if (src.length) out += "\n\nSources: " + src.map(s => (s.title || "link").slice(0, 70) + " (" + s.url + ")").join("; ");
  return out;
}
