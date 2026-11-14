/* ---------- calc: a safe maths parser (no eval, no Function) + trading calculators ---------- */
const FUNCS = {
  sqrt: x => { if (x < 0) throw new Error("Square root of a negative number."); return Math.sqrt(x); },
  abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
  ln: x => { if (x <= 0) throw new Error("ln needs a positive number."); return Math.log(x); },
  log10: x => { if (x <= 0) throw new Error("log10 needs a positive number."); return Math.log10(x); },
  round: (x, d) => { d = d == null ? 0 : d; if (d < 0 || d > 12) throw new Error("round digits must be 0 to 12."); const k = Math.pow(10, d); return Math.round(x * k) / k; },
  min: Math.min, max: Math.max, pow: Math.pow,
  mod: (a, b) => { if (b === 0) throw new Error("Division by zero."); return a % b; }
};
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const s = String(src).replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/\*\*/g, "^").replace(/(\d),(?=\d{3}(\D|$))/g, "$1");
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (num) { out.push({ t: "n", v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = /^[a-z_][a-z0-9_]*/i.exec(s.slice(i));
    if (id) { out.push({ t: "i", v: id[0].toLowerCase() }); i += id[0].length; continue; }
    if ("+-*/^%(),".includes(c)) { out.push({ t: "o", v: c }); i++; continue; }
    throw new Error('Unsupported character "' + c + '". Only numbers, + - * / ^ % ( ) and simple functions are allowed.');
  }
  return out;
}

export function evaluate(expr) {
  if (typeof expr !== "string" || !expr.trim()) throw new Error("Give me an expression to calculate.");
  if (expr.length > 300) throw new Error("Expression is too long.");
  const tk = tokenize(expr);
  if (tk.length > 200) throw new Error("Expression is too long.");
  let p = 0;
  const peek = () => tk[p], isOp = v => tk[p] && tk[p].t === "o" && tk[p].v === v;
  const guard = r => { if (!Number.isFinite(r)) throw new Error("The result is not a finite number."); if (Math.abs(r) > 1e300) throw new Error("The number is too large."); return r; };
  function add(d) { let v = mul(d); while (isOp("+") || isOp("-")) { const o = tk[p++].v, r = mul(d); v = guard(o === "+" ? v + r : v - r); } return v; }
  function mul(d) { let v = unary(d); while (isOp("*") || isOp("/")) { const o = tk[p++].v, r = unary(d); if (o === "/" && r === 0) throw new Error("Division by zero."); v = guard(o === "*" ? v * r : v / r); } return v; }
  function unary(d) { if (isOp("-")) { p++; return -unary(d); } if (isOp("+")) { p++; return unary(d); } return pow(d); }
  function pow(d) { const b = post(d); if (isOp("^")) { p++; const e = unary(d); if (Math.abs(e) > 1000) throw new Error("Exponent is too large."); return guard(Math.pow(b, e)); } return b; }
  function post(d) { let v = prim(d); while (isOp("%")) { p++; v = v / 100; } return v; }
  function prim(d) {
    if (d > 40) throw new Error("Expression is nested too deeply.");
    const t = tk[p++];
    if (!t) throw new Error("The expression ends too early.");
    if (t.t === "n") return t.v;
    if (t.t === "o" && t.v === "(") { const v = add(d + 1); if (!isOp(")")) throw new Error("Missing closing bracket."); p++; return v; }
    if (t.t === "i") {
      if (isOp("(")) {
        const f = FUNCS[t.v]; if (!f) throw new Error('Unknown function "' + t.v + '".');
        p++; const args = [];
        if (!isOp(")")) { args.push(add(d + 1)); while (isOp(",")) { p++; args.push(add(d + 1)); } }
        if (!isOp(")")) throw new Error("Missing closing bracket."); p++;
        return guard(f.apply(null, args));
      }
      if (t.v in CONSTS) return CONSTS[t.v];
      throw new Error('Unknown name "' + t.v + '".');
    }
    throw new Error('Unexpected "' + t.v + '".');
  }
  const r = add(0);
  if (p < tk.length) throw new Error('Unexpected "' + tk[p].v + '".');
  return Number(guard(r).toPrecision(12));
}

/* ---------- trading & finance calculators ---------- */
const r2 = (x, d) => { const k = Math.pow(10, d == null ? 2 : d); return Math.round(x * k) / k; };
function need(o, keys) { for (const k of keys) if (typeof o[k] !== "number" || !Number.isFinite(o[k])) throw new Error('"' + k + '" must be a number.'); }
function spec(o) {
  const pair = String(o.pair || "").toUpperCase().replace(/[^A-Z]/g, "");
  let contract = 100000, pip = 0.0001, quote = pair.slice(3, 6), base = pair.slice(0, 3);
  if (pair === "XAUUSD") { contract = 100; pip = 0.1; }
  else if (pair === "XAGUSD") { contract = 5000; pip = 0.01; }
  else if (/^(BTC|ETH)/.test(pair)) { contract = 1; pip = 1; }
  else if (quote === "JPY") pip = 0.01;
  if (typeof o.contractSize === "number" && o.contractSize > 0) contract = o.contractSize;
  if (typeof o.pipSize === "number" && o.pipSize > 0) pip = o.pipSize;
  return { pair, contract, pip, quote, base };
}
/* how many account-currency (USD) one quote-currency unit is worth */
function quoteRate(o, sp, price) {
  if (typeof o.quoteToAccountRate === "number" && o.quoteToAccountRate > 0) return o.quoteToAccountRate;
  if (!sp.quote || sp.quote === "USD") return 1;
  if (sp.base === "USD" && price > 0) return 1 / price;
  throw new Error("This pair is quoted in " + sp.quote + ". Give quoteToAccountRate (how many USD one " + sp.quote + " is worth).");
}

export function tradeCalc(o) {
  o = o || {};
  switch (o.kind) {
    case "percent_change": {
      need(o, ["from", "to"]); if (o.from === 0) throw new Error("Start value can't be zero.");
      return { kind: o.kind, change: r2(o.to - o.from, 6), percent: r2((o.to - o.from) / Math.abs(o.from) * 100, 4) };
    }
    case "risk_reward": {
      need(o, ["entry", "stop", "target"]);
      const risk = Math.abs(o.entry - o.stop), reward = Math.abs(o.target - o.entry);
      if (risk === 0) throw new Error("Entry and stop can't be the same price.");
      const longSide = o.stop < o.entry, ok = longSide ? o.target > o.entry : o.target < o.entry;
      return { kind: o.kind, direction: longSide ? "long" : "short", risk, reward, ratio: r2(reward / risk, 2), note: ok ? "" : "The target is on the wrong side of the entry for this stop." , breakEvenWinRatePercent: r2(100 / (1 + reward / risk), 1) };
    }
    case "position_size": {
      need(o, ["balance", "riskPercent", "entry", "stop"]);
      if (o.balance <= 0 || o.riskPercent <= 0 || o.riskPercent > 100) throw new Error("Balance and risk % must be positive (risk % up to 100).");
      const dist = Math.abs(o.entry - o.stop); if (dist === 0) throw new Error("Entry and stop can't be the same price.");
      const sp = spec(o), q = quoteRate(o, sp, o.entry), riskAmount = o.balance * o.riskPercent / 100, perLot = dist * sp.contract * q;
      const lots = riskAmount / perLot;
      return { kind: o.kind, riskAmount: r2(riskAmount), stopDistance: dist, stopPips: r2(dist / sp.pip, 1), lossPerOneLot: r2(perLot), lots: r2(lots, 2), units: Math.floor(lots * sp.contract), assumptions: "Account in USD. 1 lot = " + sp.contract + " units; 1 pip = " + sp.pip + ". Spread, slippage and commission ignored." };
    }
    case "pip_value": {
      need(o, ["lots"]); const sp = spec(o);
      const px = typeof o.price === "number" ? o.price : (o.entry || 0), q = quoteRate(o, sp, px);
      return { kind: o.kind, pip: sp.pip, valuePerPipUSD: r2(o.lots * sp.contract * sp.pip * q, 4), assumptions: "Account in USD. 1 lot = " + sp.contract + " units." };
    }
    case "profit_loss": {
      need(o, ["entry", "exit", "lots"]);
      const sp = spec(o), q = quoteRate(o, sp, o.exit), dir = o.direction === "short" ? -1 : 1;
      const pnl = (o.exit - o.entry) * dir * o.lots * sp.contract * q;
      return { kind: o.kind, direction: dir === 1 ? "long" : "short", pips: r2((o.exit - o.entry) * dir / sp.pip, 1), profitLossUSD: r2(pnl), assumptions: "Account in USD. Spread, swaps and commission ignored." };
    }
    case "compound_interest": {
      need(o, ["principal", "ratePercent", "years"]);
      const n = typeof o.compoundsPerYear === "number" && o.compoundsPerYear > 0 ? Math.min(o.compoundsPerYear, 365) : 12;
      const contrib = typeof o.monthlyContribution === "number" ? o.monthlyContribution : 0;
      if (o.years <= 0 || o.years > 100) throw new Error("Years must be between 0 and 100.");
      let bal = o.principal, put = o.principal; const per = o.ratePercent / 100 / n, steps = Math.round(o.years * n), add = contrib * 12 / n;
      for (let i = 0; i < steps; i++) { bal = bal * (1 + per) + add; put += add; }
      return { kind: o.kind, finalBalance: r2(bal), totalPaidIn: r2(put), growth: r2(bal - put), assumptions: "Compounded " + n + " times a year, contributions spread evenly. Past or assumed returns are not guaranteed." };
    }
    default: throw new Error("kind must be one of: percent_change, risk_reward, position_size, pip_value, profit_loss, compound_interest.");
  }
}
