/* ---------- market: live quotes, candles and news from real data providers (keys stay on the server) ---------- */
const CCY = new Set("USD EUR GBP JPY AUD NZD CAD CHF CNH SEK NOK DKK PLN CZK HUF TRY ZAR MXN SGD HKD INR THB ILS BRL KRW CNY AED SAR".split(" "));
const METALS = { XAU: "Gold", XAG: "Silver", XPT: "Platinum", XPD: "Palladium" };
const CRYPTO = { BTC: ["bitcoin", "Bitcoin"], ETH: ["ethereum", "Ethereum"], SOL: ["solana", "Solana"], XRP: ["ripple", "XRP"], ADA: ["cardano", "Cardano"], DOGE: ["dogecoin", "Dogecoin"], BNB: ["binancecoin", "BNB"], LTC: ["litecoin", "Litecoin"], TRX: ["tron", "TRON"], XLM: ["stellar", "Stellar"], DOT: ["polkadot", "Polkadot"], AVAX: ["avalanche-2", "Avalanche"], LINK: ["chainlink", "Chainlink"] };
const WORDS = { GOLD: "XAUUSD", SILVER: "XAGUSD", PLATINUM: "XPTUSD", PALLADIUM: "XPDUSD", BITCOIN: "BTC", ETHEREUM: "ETH", SOLANA: "SOL", RIPPLE: "XRP", CARDANO: "ADA", DOGECOIN: "DOGE", LITECOIN: "LTC", TRON: "TRX", STELLAR: "XLM", POLKADOT: "DOT", AVALANCHE: "AVAX", CHAINLINK: "LINK" };
const INDEX = {
  SPX: ["SPY", "S&P 500"], SP500: ["SPY", "S&P 500"], US500: ["SPY", "S&P 500"],
  NASDAQ: ["QQQ", "NASDAQ-100"], NASDAQ100: ["QQQ", "NASDAQ-100"], NDX: ["QQQ", "NASDAQ-100"], NAS100: ["QQQ", "NASDAQ-100"], US100: ["QQQ", "NASDAQ-100"],
  DOW: ["DIA", "Dow Jones"], DOWJONES: ["DIA", "Dow Jones"], DJI: ["DIA", "Dow Jones"], DJIA: ["DIA", "Dow Jones"], US30: ["DIA", "Dow Jones"]
};

export function resolveSymbol(input) {
  let s = String(input || "").toUpperCase().trim();
  if (!s || s.length > 24) return null;
  s = s.replace(/[^A-Z0-9.]/g, "");
  if (!s) return null;
  if (WORDS[s]) s = WORDS[s];
  if (INDEX[s]) { const [etf, name] = INDEX[s]; return { kind: "index", display: name, td: etf, fh: etf, currency: "USD", note: name + " is shown through the " + etf + " ETF (a close proxy, not the index level itself)." }; }
  const m6 = /^([A-Z]{3})([A-Z]{3})$/.exec(s);
  if (m6 && METALS[m6[1]] && m6[2] === "USD") return { kind: "metal", display: METALS[m6[1]] + " (" + m6[1] + "/USD)", td: m6[1] + "/USD", currency: "USD" };
  if (m6 && CCY.has(m6[1]) && CCY.has(m6[2]) && m6[1] !== m6[2]) return { kind: "forex", display: m6[1] + "/" + m6[2], td: m6[1] + "/" + m6[2], currency: m6[2] };
  const cm = /^([A-Z]{2,5}?)(USD|USDT)?$/.exec(s);
  if (cm && CRYPTO[cm[1]]) return { kind: "crypto", display: CRYPTO[cm[1]][1] + " (" + cm[1] + "/USD)", td: cm[1] + "/USD", cg: CRYPTO[cm[1]][0], currency: "USD" };
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(s)) return { kind: "stock", display: s, td: s, fh: s, currency: "USD" };
  return null;
}

export function classify(tsMs, nowMs, marketOpen) {
  const age = Math.max(0, Math.round((nowMs - tsMs) / 1000));
  if (marketOpen === false) return { status: "market-closed", ageSeconds: age };
  if (age <= 180) return { status: "real-time", ageSeconds: age };
  if (age <= 3600) return { status: "delayed", ageSeconds: age };
  return { status: "stale", ageSeconds: age };
}

const num = x => { const n = typeof x === "string" ? parseFloat(x) : x; return Number.isFinite(n) ? n : null; };
const iso = ms => new Date(ms).toISOString();

export function makeMarket(env, fetchFn, nowFn) {
  const now = nowFn || Date.now, cache = new Map(), calls = [];
  const secrets = [env.TWELVE_DATA_API_KEY, env.FINNHUB_API_KEY];
  const clean = t => { let s = String(t || ""); for (const k of secrets) if (k && k.length > 5) s = s.split(k).join("***"); return s.slice(0, 140); };
  async function getJson(url, tag) {
    if (tag === "td") { const t = now(); while (calls.length && t - calls[0] > 60000) calls.shift(); if (calls.length >= 7) throw new Error("Market-data request limit reached. Try again in a minute."); calls.push(t); }
    const r = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (r.status === 429) throw new Error("The data provider is rate-limiting us. Try again shortly.");
    if (!r.ok) throw new Error("The data provider returned HTTP " + r.status + ".");
    return r.json();
  }
  async function cached(key, ttl, fn) {
    const hit = cache.get(key), t = now();
    if (hit && t - hit.t < ttl) return hit.v;
    const v = await fn(); cache.set(key, { t, v }); if (cache.size > 200) cache.clear(); return v;
  }

  async function tdQuote(sym) {
    const d = await getJson("https://api.twelvedata.com/quote?symbol=" + encodeURIComponent(sym.td) + "&apikey=" + env.TWELVE_DATA_API_KEY, "td");
    if (d.status === "error" || d.code) throw new Error(clean(d.message || "Twelve Data could not return this symbol."));
    const price = num(d.close); if (price == null) throw new Error("Twelve Data returned no price.");
    const ts = (num(d.timestamp) || Math.floor(now() / 1000)) * 1000;
    const cl = classify(ts, now(), typeof d.is_market_open === "boolean" ? d.is_market_open : undefined);
    return { price, currency: d.currency || sym.currency, provider: "Twelve Data", timestamp: iso(ts), status: cl.status, ageSeconds: cl.ageSeconds, previousClose: num(d.previous_close), change: num(d.change), changePct: num(d.percent_change), open: num(d.open), high: num(d.high), low: num(d.low), marketOpen: typeof d.is_market_open === "boolean" ? d.is_market_open : null };
  }
  async function fhQuote(sym) {
    const d = await getJson("https://finnhub.io/api/v1/quote?symbol=" + encodeURIComponent(sym.fh) + "&token=" + env.FINNHUB_API_KEY, "fh");
    const price = num(d.c); if (price == null || price === 0 || !d.t) throw new Error("Finnhub returned no price for this symbol.");
    const ts = d.t * 1000, cl = classify(ts, now());
    return { price, currency: "USD", provider: "Finnhub", timestamp: iso(ts), status: cl.status === "stale" ? "market-closed" : cl.status, ageSeconds: cl.ageSeconds, previousClose: num(d.pc), change: num(d.d), changePct: num(d.dp), open: num(d.o), high: num(d.h), low: num(d.l), marketOpen: null };
  }
  async function cgQuote(sym) {
    const d = await getJson("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" + sym.cg, "cg");
    const c = Array.isArray(d) && d[0]; if (!c || num(c.current_price) == null) throw new Error("CoinGecko returned no price.");
    const ts = Date.parse(c.last_updated) || now(), cl = classify(ts, now());
    const price = num(c.current_price), ch = num(c.price_change_24h);
    return { price, currency: "USD", provider: "CoinGecko", timestamp: iso(ts), status: cl.status, ageSeconds: cl.ageSeconds, previousClose: ch == null ? null : price - ch, change: ch, changePct: num(c.price_change_percentage_24h), open: null, high: num(c.high_24h), low: num(c.low_24h), marketOpen: null, note24h: "Crypto trades 24/7, so change, high and low are for the last 24 hours." };
  }

  async function getQuote(input) {
    const sym = resolveSymbol(input);
    if (!sym) return { ok: false, instrument: String(input).slice(0, 24), error: "I don't recognise that symbol. Try a forex pair like EURUSD, gold (XAUUSD), a crypto like BTC, an index like NASDAQ, or a stock ticker." };
    const order = [];
    if (sym.kind === "crypto") { order.push(cgQuote); if (env.TWELVE_DATA_API_KEY) order.push(tdQuote); }
    else if (sym.kind === "stock" || sym.kind === "index") { if (env.TWELVE_DATA_API_KEY) order.push(tdQuote); if (env.FINNHUB_API_KEY) order.push(fhQuote); }
    else if (env.TWELVE_DATA_API_KEY) order.push(tdQuote);
    if (!order.length) return { ok: false, instrument: sym.display, error: "Live market data isn't switched on for " + sym.kind + " yet (no data key set on the server)." };
    return cached("q:" + sym.display, 20000, async () => {
      let lastErr = "";
      for (const fn of order) {
        try { const q = await fn(sym); const out = { ok: true, instrument: sym.display, ...q }; if (sym.note) out.note = sym.note; return out; }
        catch (e) { lastErr = clean(e && e.message); }
      }
      return { ok: false, instrument: sym.display, error: "Live data is unavailable right now. " + lastErr };
    });
  }

  const INTERVALS = { "5min": 1, "15min": 1, "30min": 1, "1h": 1, "4h": 1, "1day": 1, "1week": 1 };
  async function getCandles(input, interval) {
    const sym = resolveSymbol(input);
    if (!sym) return { ok: false, error: "I don't recognise that symbol." };
    interval = INTERVALS[interval] ? interval : "1h";
    return cached("c:" + sym.display + interval, 60000, async () => {
      try {
        if (env.TWELVE_DATA_API_KEY) {
          const d = await getJson("https://api.twelvedata.com/time_series?symbol=" + encodeURIComponent(sym.td) + "&interval=" + interval + "&outputsize=120&timezone=UTC&apikey=" + env.TWELVE_DATA_API_KEY, "td");
          if (d.status === "error" || d.code) throw new Error(clean(d.message || "No candles returned."));
          const c = (d.values || []).map(v => ({ t: v.datetime, o: num(v.open), h: num(v.high), l: num(v.low), c: num(v.close) })).filter(v => v.c != null && v.h != null && v.l != null && v.o != null).reverse();
          if (c.length) return { ok: true, instrument: sym.display, provider: "Twelve Data", interval, candles: c, note: sym.note };
        }
        if (sym.kind === "crypto") {
          const days = { "5min": 1, "15min": 1, "30min": 1, "1h": 7, "4h": 30, "1day": 90, "1week": 365 }[interval];
          const d = await getJson("https://api.coingecko.com/api/v3/coins/" + sym.cg + "/ohlc?vs_currency=usd&days=" + days, "cg");
          const c = (Array.isArray(d) ? d : []).map(v => ({ t: new Date(v[0]).toISOString(), o: v[1], h: v[2], l: v[3], c: v[4] }));
          if (c.length) return { ok: true, instrument: sym.display, provider: "CoinGecko", interval: days <= 2 ? "30min" : days <= 30 ? "4h" : "4day", candles: c, note: "CoinGecko picks the candle size automatically, so this is the closest it offers." };
        }
        return { ok: false, instrument: sym.display, error: "Candle data isn't available for this symbol (no data key set on the server)." };
      } catch (e) { return { ok: false, instrument: sym.display, error: "Candle data is unavailable right now. " + clean(e && e.message) }; }
    });
  }

  async function getNews(category) {
    const cat = ["general", "forex", "crypto", "merger"].includes(category) ? category : "general";
    if (!env.FINNHUB_API_KEY) return { ok: false, error: "Market news isn't switched on (no Finnhub key on the server)." };
    return cached("n:" + cat, 120000, async () => {
      try {
        const d = await getJson("https://finnhub.io/api/v1/news?category=" + cat + "&token=" + env.FINNHUB_API_KEY, "fh");
        const items = (Array.isArray(d) ? d : []).slice(0, 6).map(n => ({ headline: String(n.headline || "").slice(0, 160), source: String(n.source || "").slice(0, 40), time: n.datetime ? iso(n.datetime * 1000) : null, url: /^https:\/\//.test(n.url || "") ? n.url : null }));
        return { ok: true, provider: "Finnhub", category: cat, items };
      } catch (e) { return { ok: false, error: "News is unavailable right now. " + clean(e && e.message) }; }
    });
  }

  return { getQuote, getCandles, getNews };
}
