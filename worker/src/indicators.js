/* ---------- indicators: educational technical analysis on candles [{t,o,h,l,c}] oldest → newest ---------- */
export function sma(v, n) { if (v.length < n) return null; let s = 0; for (let i = v.length - n; i < v.length; i++) s += v[i]; return s / n; }

export function emaSeries(v, n) {
  const out = [], k = 2 / (n + 1); let e = null;
  for (let i = 0; i < v.length; i++) {
    if (i < n - 1) { out.push(null); continue; }
    if (i === n - 1) { let s = 0; for (let j = 0; j < n; j++) s += v[j]; e = s / n; } else e = v[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

export function rsi(v, n) {
  n = n || 14; if (v.length <= n) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = v[i] - v[i - 1]; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n;
  for (let i = n + 1; i < v.length; i++) { const d = v[i] - v[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  if (l === 0) return g === 0 ? 50 : 100;
  return 100 - 100 / (1 + g / l);
}

export function macd(v, f, s, sg) {
  f = f || 12; s = s || 26; sg = sg || 9;
  const ef = emaSeries(v, f), es = emaSeries(v, s), line = [];
  for (let i = 0; i < v.length; i++) if (ef[i] != null && es[i] != null) line.push(ef[i] - es[i]);
  if (line.length < sg) return null;
  const sig = emaSeries(line, sg), m = line[line.length - 1], si = sig[sig.length - 1];
  return { macd: m, signal: si, histogram: m - si };
}

export function atr(c, n) {
  n = n || 14; if (c.length <= n) return null;
  const tr = [];
  for (let i = 1; i < c.length; i++) tr.push(Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c)));
  let a = 0; for (let i = 0; i < n; i++) a += tr[i]; a /= n;
  for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n;
  return a;
}

/* swing highs / lows: a candle whose high (low) beats the k candles on each side */
export function swings(c, k) {
  k = k || 3; const hi = [], lo = [];
  for (let i = k; i < c.length - k; i++) {
    let isH = true, isL = true;
    for (let j = 1; j <= k; j++) {
      if (!(c[i].h > c[i - j].h && c[i].h > c[i + j].h)) isH = false;
      if (!(c[i].l < c[i - j].l && c[i].l < c[i + j].l)) isL = false;
    }
    if (isH) hi.push({ i, p: c[i].h }); if (isL) lo.push({ i, p: c[i].l });
  }
  return { hi, lo };
}

export function patterns(c) {
  const out = [], n = c.length; if (n < 2) return out;
  const k = c[n - 1], p = c[n - 2], body = Math.abs(k.c - k.o), range = k.h - k.l || 1e-12;
  const up = k.h - Math.max(k.o, k.c), dn = Math.min(k.o, k.c) - k.l;
  if (body <= range * 0.1) out.push("doji (indecision)");
  else if (dn >= body * 2 && up <= body * 0.5) out.push("hammer-shaped candle (long lower wick)");
  else if (up >= body * 2 && dn <= body * 0.5) out.push("shooting-star-shaped candle (long upper wick)");
  const pb = Math.abs(p.c - p.o);
  if (k.c > k.o && p.c < p.o && k.c >= p.o && k.o <= p.c && body > pb) out.push("bullish engulfing");
  if (k.c < k.o && p.c > p.o && k.c <= p.o && k.o >= p.c && body > pb) out.push("bearish engulfing");
  return out;
}

function dp(x) { const a = Math.abs(x); return a >= 1000 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : 6; }
const rd = (x, d) => (x == null ? null : Number(x.toFixed(d)));

export function summarize(c) {
  if (!Array.isArray(c) || c.length < 30) throw new Error("Not enough candles to analyse (need at least 30).");
  const cl = c.map(x => x.c), last = cl[cl.length - 1], d = dp(last);
  const s20 = sma(cl, 20), s50 = sma(cl, 50), r = rsi(cl, 14), m = macd(cl), a = atr(c, 14), sw = swings(c, 3);
  const sup = sw.lo.map(x => x.p).filter(p => p < last).sort((x, y) => y - x).slice(0, 2);
  const res = sw.hi.map(x => x.p).filter(p => p > last).sort((x, y) => x - y).slice(0, 2);
  const hh = sw.hi.slice(-2), ll = sw.lo.slice(-2);
  const hhhl = hh.length === 2 && ll.length === 2 && hh[1].p > hh[0].p && ll[1].p > ll[0].p;
  const lhll = hh.length === 2 && ll.length === 2 && hh[1].p < hh[0].p && ll[1].p < ll[0].p;
  let trend = "range / unclear", score = 0;
  if (s20 != null) score += last > s20 ? 1 : -1;
  if (s50 != null) score += last > s50 ? 1 : -1;
  if (s20 != null && s50 != null) score += s20 > s50 ? 1 : -1;
  if (hhhl) score += 1; if (lhll) score -= 1;
  if (score >= 3) trend = "uptrend"; else if (score <= -3) trend = "downtrend"; else if (score > 0) trend = "mild upward bias"; else if (score < 0) trend = "mild downward bias";
  const recent = c.slice(-20), hi20 = Math.max.apply(null, recent.map(x => x.h)), lo20 = Math.min.apply(null, recent.map(x => x.l));
  return {
    candles: c.length, lastClose: rd(last, d), lastCandleTime: c[c.length - 1].t,
    sma20: rd(s20, d), sma50: rd(s50, d),
    rsi14: rd(r, 1), rsiState: r == null ? null : r >= 70 ? "overbought zone" : r <= 30 ? "oversold zone" : "neutral",
    macd: m ? { line: rd(m.macd, d + 1), signal: rd(m.signal, d + 1), histogram: rd(m.histogram, d + 1), state: m.histogram > 0 ? "positive (bullish momentum)" : "negative (bearish momentum)" } : null,
    atr14: rd(a, d), atrPercent: a ? rd(a / last * 100, 2) : null,
    trend, structure: hhhl ? "higher highs and higher lows" : lhll ? "lower highs and lower lows" : "mixed",
    nearestSupport: sup.map(x => rd(x, d)), nearestResistance: res.map(x => rd(x, d)),
    range20: { high: rd(hi20, d), low: rd(lo20, d) }, candlePatterns: patterns(c),
    note: "Educational technical read on past prices only. Not a signal, not advice, and not a prediction."
  };
}
