/* =====================================================================
   ICE UPDATE — learning tools
     1) "Start here" learning route   (5 steps, progress saved on the visitor's own phone)
     2) "Build a candle" explorer     (4 sliders change a real candle + plain-language story)
     3) Before / after chart slider   (drag to reveal support & resistance zones)
   Text for the route and the optional real chart pictures live in config.js
   (route, compare). Nothing is sent anywhere; progress stays on the device.
   ===================================================================== */
(function () {
  "use strict";
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var NS = "http://www.w3.org/2000/svg";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ------------------------------------------------------------------
     1) START HERE — learning route
     ------------------------------------------------------------------ */
  var DEFAULT_ROUTE = [
    { id: "candle", title: "Understand a candlestick", desc: "Build a candle with the sliders and see what its body and wicks are telling you.", cta: "Open the candle explorer", go: "#explorer" },
    { id: "sr", title: "Learn support & resistance", desc: "Read the practical field guide on the levels where price often pauses or turns.", cta: "Open PDF Guides", pdf: true },
    { id: "risk", title: "Understand risk", desc: "Protecting your account comes before chasing profit. Read the short risk basics.", cta: "Read the risk basics", panel: "risk" },
    { id: "practise", title: "Practise with a historical example", desc: "Drag the slider to reveal the zones on a teaching chart, including a setup that failed.", cta: "Open the before / after chart", go: "#compare" },
    { id: "review", title: "Review what you learned", desc: "Look back over the key ideas in one place before you move on.", cta: "Open the recap", panel: "recap" }
  ];
  var ROUTE = (S.route && S.route.length) ? S.route : DEFAULT_ROUTE;
  var KEY = "iu_route_v1", done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { done = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }

  var PANELS = {
    risk: '<h4>Risk basics</h4><ul>' +
      '<li>Decide how much you can afford to lose <b>before</b> you enter a trade, not after.</li>' +
      '<li>A <b>stop-loss</b> is a pre-planned exit that limits the loss if you are wrong.</li>' +
      '<li>Many educators suggest risking only a small part of your account (often 1–2%) on a single idea.</li>' +
      '<li>Compare the possible loss with the possible gain (<b>risk-to-reward</b>) and skip trades that risk a lot to gain a little.</li>' +
      '<li>Leverage makes gains <b>and</b> losses bigger. Trading can lose money, and nothing here is financial advice.</li></ul>',
    recap: '<h4>Quick recap</h4><ul>' +
      '<li><b>Candles:</b> the body shows open to close; the wicks show how far price travelled and was pushed back.</li>' +
      '<li><b>One candle</b> never guarantees what comes next. Context matters.</li>' +
      '<li><b>Support & resistance:</b> zones where buyers or sellers have shown up before, not exact lines.</li>' +
      '<li><b>Setups fail:</b> plan the exit before the entry, so a failed idea costs a small, known amount.</li>' +
      '<li><b>Risk first:</b> protect the account, then think about profit.</li></ul>'
  };

  function buildRoute() {
    var host = $("#routeList"), bar = $("#routeProg"), txt = $("#routeText"), fill = $("#routeFill");
    if (!host) return;
    host.innerHTML = ROUTE.map(function (s, i) {
      var panel = s.panel && PANELS[s.panel] ? '<div class="lr-panel" id="lrp-' + esc(s.id) + '" hidden>' + PANELS[s.panel] + "</div>" : "";
      var act = s.pdf ? '<button type="button" class="lr-go" data-pdf="1">' + esc(s.cta || "Open") + "</button>"
        : s.go ? '<a class="lr-go" href="' + esc(s.go) + '">' + esc(s.cta || "Open") + "</a>"
        : s.panel ? '<button type="button" class="lr-go" data-panel="' + esc(s.id) + '" aria-expanded="false">' + esc(s.cta || "Open") + "</button>" : "";
      return '<li class="lr-step" data-id="' + esc(s.id) + '">' +
        '<button type="button" class="lr-node" aria-pressed="false" aria-label="Mark step ' + (i + 1) + ' as done"><span class="n">' + (i + 1) + '</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<div class="lr-card glass"><h3>' + esc(s.title) + "</h3><p>" + esc(s.desc) + '</p><div class="lr-act">' + act +
        '<button type="button" class="lr-done">Mark as done</button></div>' + panel + "</div></li>";
    }).join("");
    function paint() {
      var n = 0, steps = host.querySelectorAll(".lr-step");
      Array.prototype.forEach.call(steps, function (li) {
        var on = !!done[li.dataset.id]; if (on) n++;
        li.classList.toggle("done", on);
        li.querySelector(".lr-node").setAttribute("aria-pressed", on ? "true" : "false");
        li.querySelector(".lr-done").textContent = on ? "Done ✓ (tap to undo)" : "Mark as done";
      });
      txt.textContent = "Your learning progress: " + n + " of " + ROUTE.length + " complete.";
      var pct = ROUTE.length > 1 ? Math.max(0, (n - 1)) / (ROUTE.length - 1) : 0;   // glowing line reaches the last finished node
      host.style.setProperty("--lr-fill-n", (n ? pct : 0).toFixed(3));
      if (bar) bar.style.width = (100 * n / ROUTE.length).toFixed(0) + "%";
      if (fill) fill.hidden = !n;
    }
    host.addEventListener("click", function (e) {
      var li = e.target.closest(".lr-step"); if (!li) return;
      if (e.target.closest(".lr-node") || e.target.closest(".lr-done")) { done[li.dataset.id] = !done[li.dataset.id]; if (!done[li.dataset.id]) delete done[li.dataset.id]; save(); paint(); return; }
      var go = e.target.closest("a.lr-go[href^='#']");
      if (go) { var vn = { "#explorer": "explorer", "#compare": "compare" }[go.getAttribute("href")]; if (vn) { e.preventDefault(); openView(vn); return; } }
      var pdf = e.target.closest("[data-pdf]");
      if (pdf) { closeWin(); var c = document.getElementById("pdf-card"); if (c) setTimeout(function () { c.click(); }, 60); return; }
      var pb = e.target.closest("[data-panel]");
      if (pb) { var p = document.getElementById("lrp-" + pb.dataset.panel), open = p.hidden; p.hidden = !open; pb.setAttribute("aria-expanded", open ? "true" : "false"); }
    });
    var reset = $("#routeReset");
    if (reset) reset.addEventListener("click", function () { done = {}; save(); paint(); });
    paint();
  }

  /* ------------------------------------------------------------------
     2) BUILD A CANDLE — explorer
     ------------------------------------------------------------------ */
  var V = { o: 40, h: 82, l: 22, c: 68 }, part = "";
  var PRESETS = {
    "Bullish": { o: 35, h: 82, l: 28, c: 72 }, "Bearish": { o: 70, h: 78, l: 22, c: 30 },
    "Hammer shape": { o: 68, h: 72, l: 20, c: 71 }, "Shooting star shape": { o: 33, h: 86, l: 30, c: 30 },
    "Doji": { o: 50, h: 80, l: 20, c: 51 }, "Marubozu": { o: 25, h: 76, l: 24, c: 75 }
  };
  var PART_TXT = {
    body: "<b>The body</b> is the distance between the open and the close. A big body means one side was clearly in control during the period. A small body means buyers and sellers were close to balanced.",
    up: "<b>The upper wick</b> shows how high price travelled above the body before it was pushed back down. A long upper wick means higher prices were rejected.",
    low: "<b>The lower wick</b> shows how low price travelled below the body before it was pushed back up. A long lower wick means lower prices were rejected."
  };
  function norm() {                       // a candle can never have its high below the body, or its low above it
    var top = Math.max(V.o, V.c), bot = Math.min(V.o, V.c);
    V.h = Math.max(V.h, top); V.l = Math.min(V.l, bot);
  }
  function describe() {
    var top = Math.max(V.o, V.c), bot = Math.min(V.o, V.c), rng = Math.max(1, V.h - V.l), body = top - bot, up = V.h - top, lo = bot - V.l;
    var b = Math.max(body, rng * .06), bull = V.c > V.o, bear = V.c < V.o, name;
    if (body / rng > .8 && up + lo <= rng * .12) name = "Marubozu shape (almost no wicks)";
    else if (lo >= 2 * b && up <= b * .8 && body / rng < .4) name = "Hammer-type shape (long lower wick)";
    else if (up >= 2 * b && lo <= b * .8 && body / rng < .4) name = "Shooting-star-type shape (long upper wick)";
    else if (body / rng < .1) name = "Doji shape (open and close almost equal)";
    else name = (bull ? "Bullish" : bear ? "Bearish" : "Neutral") + " candle";
    var s = [];
    if (bull) s.push("Price closed higher than it opened (" + V.o + " → " + V.c + "): buyers had the upper hand in this period.");
    else if (bear) s.push("Price closed lower than it opened (" + V.o + " → " + V.c + "): sellers had the upper hand in this period.");
    else s.push("Price closed exactly where it opened: neither side won this period.");
    if (lo > Math.max(body, rng * .25)) s.push("The long lower wick shows sellers pushed price down to " + V.l + ", but buyers brought it back up.");
    if (up > Math.max(body, rng * .25)) s.push("The long upper wick shows buyers pushed price up to " + V.h + ", but sellers brought it back down.");
    if (body / rng > .7 && up + lo < rng * .3) s.push("A big body with short wicks means one side dominated the whole period.");
    if (body / rng < .15) s.push("A tiny body shows indecision.");
    return { name: name, story: s.join(" ") };
  }
  function drawCandle() {
    var svg = $("#cxSvg"); if (!svg) return;
    var Y = function (p) { return 14 + (100 - p) * 2.5; }, top = Math.max(V.o, V.c), bot = Math.min(V.o, V.c);
    var col = V.c > V.o ? "#2ee59d" : V.c < V.o ? "#ff5d73" : "#cfe0ff";
    var yb = Y(top), yt = Y(bot), bodyH = Math.max(3, yt - yb), cx = 76;
    var labs = [{ t: "High " + V.h, y: Y(V.h) }, { t: "Open " + V.o, y: Y(V.o) }, { t: "Close " + V.c, y: Y(V.c) }, { t: "Low " + V.l, y: Y(V.l) }];
    var order = labs.slice().sort(function (a, b) { return a.y - b.y; }), i;
    var pos = order.map(function (l) { return l.y; });
    for (i = 1; i < pos.length; i++) if (pos[i] < pos[i - 1] + 17) pos[i] = pos[i - 1] + 17;
    var hl = function (p) { return part === p ? ' class="on"' : ""; };
    var g = '<line x1="8" x2="212" y1="' + Y(100) + '" y2="' + Y(100) + '" class="grid"/><line x1="8" x2="212" y1="' + Y(0) + '" y2="' + Y(0) + '" class="grid"/>';
    g += '<g' + hl("up") + '><line x1="' + cx + '" x2="' + cx + '" y1="' + Y(V.h) + '" y2="' + yb + '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/></g>';
    g += '<g' + hl("low") + '><line x1="' + cx + '" x2="' + cx + '" y1="' + yt + '" y2="' + Y(V.l) + '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/></g>';
    g += '<g' + hl("body") + '><rect x="' + (cx - 28) + '" y="' + yb + '" width="56" height="' + bodyH + '" rx="4" fill="' + col + '" fill-opacity=".88" stroke="' + col + '" stroke-width="2"/></g>';
    g += '<rect class="hit" data-part="up" x="' + (cx - 22) + '" y="' + (Y(V.h) - 4) + '" width="44" height="' + Math.max(18, yb - Y(V.h) + 4) + '"/>';
    g += '<rect class="hit" data-part="low" x="' + (cx - 22) + '" y="' + (yt) + '" width="44" height="' + Math.max(18, Y(V.l) - yt + 4) + '"/>';
    g += '<rect class="hit" data-part="body" x="' + (cx - 28) + '" y="' + yb + '" width="56" height="' + bodyH + '"/>';
    order.forEach(function (l, k) { g += '<line x1="108" x2="128" y1="' + l.y + '" y2="' + pos[k] + '" class="lead"/><text x="132" y="' + (pos[k] + 4) + '" class="lab">' + l.t + "</text>"; });
    svg.innerHTML = g;
    var d = describe();
    $("#cxName").textContent = d.name;
    $("#cxStory").textContent = d.story;
    $("#cxPart").innerHTML = part ? PART_TXT[part] : "Tap the body or a wick on the candle to see what it means.";
  }
  function syncSliders() { ["o", "h", "l", "c"].forEach(function (k) { var r = $("#cx-" + k); if (r) { r.value = V[k]; $("#cxv-" + k).textContent = V[k]; } }); }
  function buildExplorer() {
    var host = $("#cxSvg"); if (!host) return;
    ["o", "h", "l", "c"].forEach(function (k) {
      var r = $("#cx-" + k);
      r.addEventListener("input", function () { V[k] = +r.value; norm(); syncSliders(); drawCandle(); });
    });
    host.addEventListener("click", function (e) { var t = e.target.closest("[data-part]"); if (!t) return; part = t.dataset.part; drawCandle(); });
    var pr = $("#cxPresets");
    Object.keys(PRESETS).forEach(function (n) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = n;
      b.addEventListener("click", function () { V = JSON.parse(JSON.stringify(PRESETS[n])); part = ""; syncSliders(); drawCandle(); });
      pr.appendChild(b);
    });
    syncSliders(); drawCandle();
  }

  /* ------------------------------------------------------------------
     3) BEFORE / AFTER chart slider
     ------------------------------------------------------------------ */
  var CLOSES = [62, 66, 70, 74, 77, 78, 74, 68, 62, 56, 50, 45, 42, 46, 52, 58, 64, 70, 75, 78, 79, 74, 68, 62, 55, 48, 43, 44, 50, 57, 63, 69];
  var OVR = { 5: { h: 81 }, 12: { l: 39 }, 20: { h: 82 }, 26: { l: 40 }, 27: { l: 35 } };
  function chartSVG(annot) {
    var W = 360, H = 220, X = function (i) { return 16 + i * 10.6; }, Y = function (p) { return 204 - (p - 20) * (188 / 70); };
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="' + W + '" height="' + H + '" fill="#0a1230"/>';
    for (var g = 30; g <= 90; g += 20) s += '<line x1="0" x2="' + W + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="rgba(255,255,255,.07)"/>';
    if (annot) {
      s += '<rect x="0" y="' + Y(82) + '" width="' + W + '" height="' + (Y(78) - Y(82)) + '" fill="rgba(255,107,214,.22)"/><line x1="0" x2="' + W + '" y1="' + Y(80) + '" y2="' + Y(80) + '" stroke="#ff6bd6" stroke-dasharray="5 4"/>';
      s += '<rect x="0" y="' + Y(42) + '" width="' + W + '" height="' + (Y(38) - Y(42)) + '" fill="rgba(77,225,255,.22)"/><line x1="0" x2="' + W + '" y1="' + Y(40) + '" y2="' + Y(40) + '" stroke="#4de1ff" stroke-dasharray="5 4"/>';
    }
    var prev = 60;
    CLOSES.forEach(function (c, i) {
      var o = prev, hi = Math.max(o, c) + 1.6, lo = Math.min(o, c) - 1.6, ov = OVR[i] || {};
      if (ov.h) hi = ov.h; if (ov.l) lo = ov.l; if (i === 27) o = 43;
      var up = c >= o, col = up ? "#2ee59d" : "#ff5d73", x = X(i), t = Y(Math.max(o, c)), bh = Math.max(2, Math.abs(Y(o) - Y(c)));
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + Y(hi) + '" y2="' + Y(lo) + '" stroke="' + col + '" stroke-width="1.6"/><rect x="' + (x - 3.4) + '" y="' + t + '" width="6.8" height="' + bh + '" fill="' + col + '"/>';
      prev = c;
    });
    if (annot) {
      var T = function (x, y, t, c, a) { return '<text x="' + x + '" y="' + y + '" fill="' + c + '" font-size="10" font-weight="800" letter-spacing=".5" text-anchor="' + (a || "start") + '">' + t + "</text>"; };
      s += T(352, Y(80) + 3.5, "RESISTANCE", "#ff9be4", "end") + T(8, Y(40) + 3.5, "SUPPORT", "#8be9ff");
      s += '<circle cx="' + X(27) + '" cy="' + Y(35) + '" r="9" fill="none" stroke="#ffd166" stroke-width="2"/>' + T(352, Y(35) + 22, "FALSE BREAK", "#ffd166", "end");
      s += '<circle cx="' + X(20) + '" cy="' + Y(82) + '" r="9" fill="none" stroke="#ffd166" stroke-width="2"/>' + T(X(20) - 14, Y(82) + 3, "REJECTED", "#ffd166", "end");
    }
    return s + "</svg>";
  }
  function buildCompare() {
    var host = $("#cpBox"); if (!host) return;
    var C = S.compare && S.compare.before && S.compare.after ? S.compare : null;
    var img = function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy" decoding="async">'; };
    host.innerHTML =
      '<div class="cp-layer cp-after">' + (C ? img(C.after) : chartSVG(true)) + '</div>' +
      '<div class="cp-layer cp-before">' + (C ? img(C.before) : chartSVG(false)) + '</div>' +
      '<span class="cp-tag l">Before</span><span class="cp-tag r">After</span>' +
      '<div class="cp-bar" id="cpBar"><button type="button" class="cp-handle" id="cpHandle" role="slider" aria-label="Reveal the annotations" aria-valuemin="0" aria-valuemax="100" aria-valuenow="88"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
    var p = 88, handle = $("#cpHandle");
    function set(v) { p = clamp(v, 0, 100); host.style.setProperty("--p", p.toFixed(1) + "%"); handle.setAttribute("aria-valuenow", Math.round(p)); }
    function fromEvent(e) { var r = host.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); }
    var drag = false;
    host.addEventListener("pointerdown", function (e) { drag = true; try { host.setPointerCapture(e.pointerId); } catch (x) {} fromEvent(e); });
    host.addEventListener("pointermove", function (e) { if (drag) fromEvent(e); });
    host.addEventListener("pointerup", function () { drag = false; });
    host.addEventListener("pointercancel", function () { drag = false; });
    handle.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { set(p - 6); e.preventDefault(); } else if (e.key === "ArrowRight") { set(p + 6); e.preventDefault(); }
      else if (e.key === "Home") { set(0); e.preventDefault(); } else if (e.key === "End") { set(100); e.preventDefault(); }
    });
    set(p);
    var note = $("#cpNote");
    if (note && C && C.note) note.textContent = C.note;
  }

  /* ------------------------------------------------------------------
     4) LEARN & PLAY window (opens from the Learn & Play card, like PDF Guides)
     ------------------------------------------------------------------ */
  var modal = $("#learn-modal"), curView = "home", lastFocus = null;
  var ITEMS = [
    { v: "predict", ico: "📈", t: "Predict the Market", d: "15 random charts. Spot the pattern, draw your line, then place a Buy or Sell trade. Scored at the end.", tag: "New" },
    { v: "quiz", ico: "🎮", t: "Candle Quiz", d: "12 questions on candles, patterns and support & resistance. Get a score at the end.", tag: "Play" },
    { v: "route", ico: "🧭", t: "Start here", d: "A five-step route from your first candle to your first review." },
    { v: "explorer", ico: "🕯️", t: "Build a candle", d: "Move the sliders and see what the body and wicks mean." },
    { v: "compare", ico: "↔️", t: "Before & after chart", d: "Drag to reveal support and resistance zones." }
  ];
  function openView(v) {
    if (!modal) return; curView = v;
    Array.prototype.forEach.call(modal.querySelectorAll(".lp-view"), function (el) { el.hidden = el.dataset.view !== v; el.scrollTop = 0; });
    $("#lp-back").hidden = v === "home";
    if (v === "quiz") quizShow();
    if (v === "predict") pmShow(); else pmStop();
  }
  function openWin(view) {
    if (!modal) return; lastFocus = document.activeElement;
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; document.documentElement.classList.add("iu-pdfopen");
    openView(view || "home"); var c = $("#lp-close"); if (c) c.focus();
  }
  function closeWin() {
    if (!modal || !modal.classList.contains("open")) return;
    pmStop(); modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; document.documentElement.classList.remove("iu-pdfopen");
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function buildHome() {
    var h = $("#lpItems"); if (!h) return;
    h.innerHTML = ITEMS.map(function (it, i) {
      return '<button type="button" class="lp-item glass' + (it.tag ? " feat" : "") + '" data-open="' + it.v + '" style="--i:' + i + '"><span class="lp-ico">' + it.ico + '</span><span class="lp-txt"><b>' + esc(it.t) + "</b><span>" + esc(it.d) + "</span></span>" +
        (it.tag ? '<em class="lp-tag">' + esc(it.tag) + "</em>" : '<i class="lp-go">&rsaquo;</i>') + "</button>";
    }).join("");
    h.addEventListener("click", function (e) { var b = e.target.closest("[data-open]"); if (b) openView(b.dataset.open); });
  }
  function wireWindow() {
    if (!modal) return;
    buildHome();
    var card = $("#learn-card");
    if (card) {
      card.addEventListener("click", function () { openWin("home"); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWin("home"); } });
    }
    var nav = $("#navLearn"); if (nav) nav.addEventListener("click", function (e) { e.preventDefault(); openWin("home"); });
    $("#lp-close").addEventListener("click", closeWin);
    $("#lp-back").addEventListener("click", function () { openView("home"); });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeWin(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) { if (curView !== "home") openView("home"); else closeWin(); } });
  }

  /* ------------------------------------------------------------------
     5) CANDLE QUIZ — "what is this?" with a score at the end
     candle = [open, high, low, close] on a 0-100 scale. Content comes from the
     15 Candlestick Patterns, Candlestick Charts Explained and S&R PDFs.
     ------------------------------------------------------------------ */
  var DN = [[84, 86, 76, 78], [78, 80, 68, 70], [70, 72, 60, 62]];
  var UP = [[34, 42, 33, 40], [40, 50, 39, 48], [48, 58, 47, 56]];
  var FLAT = [[50, 56, 46, 52], [52, 56, 48, 50], [50, 54, 46, 51]];
  var Q = [
    { c: DN.concat([[56, 57, 38, 55]]), hl: [3], q: "This candle appears after a downtrend. What is it?", o: ["Hammer", "Shooting Star", "Doji", "Hanging Man"], a: 0, w: "A small body near the top with a long lower wick (at least 2x the body) after a fall is a <b>Hammer</b>. Sellers pushed price down, but buyers pulled it back up. Wait for the next candle to close higher before trusting it." },
    { c: UP.concat([[54, 74, 51, 52]]), hl: [3], q: "Look at the last candle after an uptrend. What is this?", o: ["Hammer", "Shooting Star", "Bullish Engulfing", "Marubozu"], a: 1, w: "A small body near the bottom with a long upper wick after a rise is a <b>Shooting Star</b>. The failed rally warns that buyers are running out of strength. Wait for the next candle to close lower." },
    { c: UP.concat([[54, 56, 40, 55]]), hl: [3], q: "This looks exactly like a Hammer, but it appears after a rise. What is it called?", o: ["Hammer", "Hanging Man", "Inverted Hammer", "Doji"], a: 1, w: "Same shape, different place. After an <b>uptrend</b> it is a <b>Hanging Man</b>, an early warning that sellers are showing up. A red candle right after makes the warning real." },
    { c: UP.concat([[52, 66, 40, 52.5]]), hl: [3], q: "The last candle opened and closed at almost the same price. What is it?", o: ["Marubozu", "Hammer", "Doji", "Bearish Engulfing"], a: 2, w: "A <b>Doji</b> closes exactly where it opened: buyers and sellers are tied. After a strong trend it can say the trend is losing steam, but it is not a signal on its own. Look at the candle that follows." },
    { c: FLAT.concat([[51, 80, 51, 80]]), hl: [3], q: "A big green candle with no wicks. What does it show?", o: ["Buyers controlled the whole session", "Buyers and sellers were tied", "Sellers took control", "Price will fall next"], a: 0, w: "This is a green <b>Marubozu</b>: it opened at the low and closed at the high, so buyers controlled the entire session from open to close. It often signals the trend will continue in that colour's direction." },
    { c: DN.concat([[56, 57, 38, 55]]), hl: [3], part: "low", q: "The highlighted line is the lower wick. What is it telling you?", o: ["Price fell a long way, then buyers pushed it back up", "Price never went below the open", "The candle closed at its lowest point", "Sellers were in full control"], a: 0, w: "The <b>lower wick</b> shows how low price travelled below the body before it was pushed back up. A long lower wick means lower prices were rejected." },
    { c: FLAT.concat([[52, 53, 44, 46]]), hl: [3], part: "body", q: "The highlighted thick part is the body. What does the body show?", o: ["The highest and lowest prices", "The distance from open to close", "How many people traded", "Where price will go next"], a: 1, w: "The <b>body</b> shows open to close. The thin wicks show the high and low. A big body means one side was clearly in control; a small body means they were close to balanced." },
    { c: DN.concat([[60, 61, 54, 55], [52, 63, 51, 62]]), hl: [3, 4], q: "After a downtrend, a small red candle is followed by a big green one that covers it completely. What is this pattern?", o: ["Bullish Harami", "Bullish Engulfing", "Piercing Line", "Three White Soldiers"], a: 1, w: "The green body fully covers the red body: <b>Bullish Engulfing</b>. Buyers overwhelmed sellers in a single session. It is a strong reversal signal, but confirm it with a follow-up green candle." },
    { c: UP.concat([[54, 60, 53, 59], [61, 62, 48, 50]]), hl: [3, 4], q: "After an uptrend, a small green candle is followed by a big red candle that covers it. What is this?", o: ["Bearish Engulfing", "Dark Cloud Cover", "Evening Star", "Hanging Man"], a: 0, w: "A big red body that fully covers the green one is a <b>Bearish Engulfing</b>. Sellers took full control and erased the buyers' last effort. Confirm with a follow-up red candle." },
    { c: [[78, 80, 70, 72], [74, 75, 56, 57], [52, 54, 48, 50], [53, 72, 52, 70]], hl: [1, 2, 3], q: "A big red candle, a small candle that gaps down, then a big green candle. Which pattern is this?", o: ["Evening Star", "Morning Star", "Three Black Crows", "Bullish Harami"], a: 1, w: "Three candles at the bottom of a fall: big red, a small indecisive star, then a big green that closes well into the red body. That is a <b>Morning Star</b>, a bullish reversal." },
    { c: [[36, 50, 35, 48], [50, 51, 36, 37], [40, 41, 26, 27], [30, 31, 16, 17]], hl: [1, 2, 3], q: "Three red candles in a row, each closing lower, after a rise. What is this?", o: ["Three White Soldiers", "Three Black Crows", "Evening Star", "Bullish Engulfing"], a: 1, w: "<b>Three Black Crows</b> is three big red candles in a row, each closing lower. It is a strong bearish signal. Always use a stop-loss: no pattern works every time." },
    { c: [[78, 79, 70, 72], [76, 77, 50, 51], [46, 67, 45, 66]], hl: [1, 2], mark: 63.5, q: "A big red candle, then a green candle opens below its low and closes above the dashed midpoint, but does not cover it. What is this?", o: ["Bullish Engulfing", "Piercing Line", "Doji", "Dark Cloud Cover"], a: 1, w: "The green candle closes above the red candle's midpoint but does not fully cover it (that would be engulfing). That is a <b>Piercing Line</b>, showing buyers regaining control." }
  ];
  var SR = [
    { zone: true, q: "Price turned down at the pink band twice. What do traders call a price area like this?", o: ["Support", "Resistance", "A gap", "A moving average"], a: 1, w: "<b>Resistance</b> is a price area above the market where selling pressure has repeatedly stopped a rally. Support is the mirror image: an area below where buying has halted a decline." },
    { q: "How should you draw a support or resistance level?", o: ["As a razor-thin line", "As a zone (an area)", "Only through the closes", "Only on the weekly chart"], a: 1, w: "Markets respect <b>areas</b> where order flow changed, not exact pips. A zone puts your stop where the idea is genuinely wrong, not where a random tick can reach it." },
    { q: "A broken support level is retested from below and rejected. What has it often become?", o: ["Resistance", "A gap", "Stronger support", "Nothing"], a: 0, w: "This is <b>role reversal</b>: a broken floor frequently behaves like a new ceiling. It is a tendency, not a guarantee. Some breaks never retest, and some retests slice straight through." },
    { q: "How many touches make a level \"established\"?", o: ["One", "Two is enough to trade it", "Three or more", "It never matters"], a: 2, w: "Two touches is the minimum worth watching. <b>Three or more</b>, spread over time, means the market has repeatedly accepted that price. One touch proves nothing." }
  ];
  var QN = 12, qs = [], qi = 0, score = 0, picked = [], QK = "iu_quiz_best_v1";
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function best(v) {
    try { if (v != null) { var b = +localStorage.getItem(QK) || 0; if (v > b) localStorage.setItem(QK, v); } return +localStorage.getItem(QK) || 0; } catch (e) { return 0; }
  }
  function quizPic(q) {
    if (q.zone) {
      var pts = [[20, 80], [50, 44], [80, 76], [110, 36], [140, 78], [170, 48], [200, 76]], d = "M" + pts.map(function (p) { return p.join(","); }).join(" L");
      return '<svg viewBox="0 0 240 120" role="img" aria-label="Price rising to a pink band twice and turning down"><rect width="240" height="120" rx="10" fill="#0a1230"/><rect x="0" y="30" width="240" height="14" fill="rgba(255,107,214,.28)"/><line x1="0" x2="240" y1="37" y2="37" stroke="#ff6bd6" stroke-dasharray="5 4"/><path d="' + d + '" fill="none" stroke="#cfe0ff" stroke-width="2.4" stroke-linejoin="round"/></svg>';
    }
    if (!q.c) return "";
    var W = 240, H = 150, n = q.c.length, step = Math.min(44, (W - 24) / n), bw = Math.min(22, step * .55), Y = function (p) { return 140 - (p - 10) * 1.55; }, s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Candlestick chart for the question"><rect width="' + W + '" height="' + H + '" rx="10" fill="#0a1230"/>';
    var x0 = (W - step * n) / 2 + step / 2;
    if (q.mark) s += '<line x1="' + (x0 + step * (n - 2) - 18) + '" x2="' + (x0 + step * (n - 1) + 18) + '" y1="' + Y(q.mark) + '" y2="' + Y(q.mark) + '" stroke="#ffd166" stroke-dasharray="4 3"/><text x="' + (x0 + step * (n - 1) + 20) + '" y="' + (Y(q.mark) + 3.5) + '" fill="#ffd166" font-size="9" font-weight="800">50%</text>';
    q.c.forEach(function (k, i) {
      var o = k[0], h = k[1], l = k[2], c = k[3], x = x0 + i * step, up = c >= o, col = up ? "#2ee59d" : "#ff5d73", on = q.hl && q.hl.indexOf(i) > -1;
      var wick = q.part === "low" && on ? "#ffd166" : col, bodyc = q.part === "body" && on ? "#ffd166" : col;
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + Y(h) + '" y2="' + Y(l) + '" stroke="' + (q.part === "low" && on ? "#ffd166" : col) + '" stroke-width="' + (q.part === "low" && on ? 4 : 2.2) + '" stroke-linecap="round"/>';
      s += '<rect x="' + (x - bw / 2) + '" y="' + Y(Math.max(o, c)) + '" width="' + bw + '" height="' + Math.max(2.5, Math.abs(Y(o) - Y(c))) + '" rx="2" fill="' + col + '"' + (q.part === "body" && on ? ' stroke="#ffd166" stroke-width="3"' : "") + "/>";
      if (on && !q.part) s += '<rect x="' + (x - bw / 2 - 5) + '" y="' + (Y(h) - 5) + '" width="' + (bw + 10) + '" height="' + (Y(l) - Y(h) + 10) + '" rx="6" fill="none" stroke="rgba(255,209,102,.7)" stroke-dasharray="3 3"/>';
    });
    return s + "</svg>";
  }
  function quizStart() {
    qs = shuffle(Q.slice()).slice(0, 8).concat(shuffle(SR.slice()));
    qs = shuffle(qs).slice(0, QN); qi = 0; score = 0; picked = [];
    qs.forEach(function (q) { var right = q.o[q.a], opts = shuffle(q.o.slice()); q._o = opts; q._a = opts.indexOf(right); });
    quizQ();
  }
  function quizShow() {
    var host = $("#qz"); if (!host) return;
    host.innerHTML = '<div class="qz-intro"><div class="qz-hero" aria-hidden="true">' + quizPic({ c: DN.concat([[56, 57, 38, 55]]), hl: [3] }) + '</div><h2>Candle Quiz</h2>' +
      '<p class="pdf-sub">' + QN + ' questions. Look at the chart, tap your answer, and learn why. You get your score at the end.</p>' +
      (best() ? '<p class="qz-best">Your best score: <b>' + best() + " / " + QN + "</b></p>" : "") +
      '<button type="button" class="qz-btn" id="qzGo">Start the quiz</button><p class="cx-note">Based on the 15 Candlestick Patterns, Candlestick Charts Explained and Support &amp; Resistance guides. Education only, not advice.</p></div>';
    $("#qzGo").addEventListener("click", quizStart);
  }
  function quizQ() {
    var q = qs[qi], host = $("#qz"), pic = quizPic(q);
    host.innerHTML = '<div class="qz-top"><span>Question ' + (qi + 1) + " of " + qs.length + "</span><span>Score " + score + '</span></div><div class="lr-bar"><i style="width:' + (100 * qi / qs.length).toFixed(0) + '%"></i></div>' +
      '<div class="qz-card glass">' + (pic ? '<div class="qz-pic">' + pic + "</div>" : "") + '<h3 class="qz-q">' + esc(q.q) + '</h3><div class="qz-opts" role="group" aria-label="Answers">' +
      q._o.map(function (t, i) { return '<button type="button" class="qz-opt" data-i="' + i + '">' + esc(t) + "</button>"; }).join("") + '</div><div class="qz-fb" id="qzFb" aria-live="polite"></div></div>';
    host.querySelector(".qz-opts").addEventListener("click", function (e) {
      var b = e.target.closest(".qz-opt"); if (!b || b.disabled) return;
      var i = +b.dataset.i, ok = i === q._a; if (ok) score++; picked.push(ok);
      Array.prototype.forEach.call(host.querySelectorAll(".qz-opt"), function (x, k) { x.disabled = true; if (k === q._a) x.classList.add("right"); else if (k === i) x.classList.add("wrong"); });
      var last = qi === qs.length - 1;
      $("#qzFb").innerHTML = '<p class="qz-verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "Correct!" : "Not quite. The answer is " + esc(q._o[q._a]) + ".") + "</p><p>" + q.w + '</p><button type="button" class="qz-btn" id="qzNext">' + (last ? "See my score" : "Next question") + "</button>";
      var nx = $("#qzNext"); nx.addEventListener("click", function () { if (last) quizEnd(); else { qi++; quizQ(); var v = $("#lp-quiz"); if (v) v.scrollTop = 0; } });
      nx.focus();
    });
  }
  function quizEnd() {
    var n = qs.length, pct = score / n, prev = best(), isBest = score > prev; best(score);
    var msg = pct === 1 ? "Perfect score. You read candles like a pro." : pct >= .75 ? "Great work. You know your candles well." : pct >= .5 ? "Good start. Review the PDF guides and try again." : "Keep learning. Open the PDF guides and play again.";
    $("#qz").innerHTML = '<div class="qz-end"><h2>Your score</h2><div class="qz-score"><b>' + score + "</b><span>/ " + n + '</span></div><p class="qz-msg">' + msg + "</p>" + (isBest && score > 0 ? '<p class="qz-best">New best score!</p>' : "") +
      '<div class="qz-dots" aria-label="Answers review">' + picked.map(function (p, i) { return '<i class="' + (p ? "ok" : "no") + '" title="Question ' + (i + 1) + '">' + (p ? "✓" : "✗") + "</i>"; }).join("") + "</div>" +
      '<div class="qz-actions"><button type="button" class="qz-btn" id="qzAgain">Play again</button><button type="button" class="qz-btn alt" id="qzPdf">Open PDF Guides</button><button type="button" class="qz-btn alt" id="qzHome">More tools</button></div></div>';
    $("#qzAgain").addEventListener("click", quizStart);
    $("#qzHome").addEventListener("click", function () { openView("home"); });
    $("#qzPdf").addEventListener("click", function () { closeWin(); var c = document.getElementById("pdf-card"); if (c) setTimeout(function () { c.click(); }, 60); });
  }

  /* ------------------------------------------------------------------
     6) PREDICT THE MARKET — 15 random charts, trading-platform style
     Each question: watch the market move, pause, then
       1) say what you see (candle pattern, trend, range, support/resistance, breakout...)
       2) draw your line on the chart (trend line or flat level)
       3) place a Buy or Sell trade and watch what happens.
     Every chart is randomly generated. Setups only tilt the odds (about 62/38),
     so the market never moves one way every time.
     ------------------------------------------------------------------ */
  var PM_N = 15, PM_START = 10000, PM_RISK = 200, PM_KEY = "iu_predict_best_v2", PM_BASE = 4040, PM_SCALE = 5, PM_HIST = 62, PM_FUT = 14;
  var pm = { r: 0, bal: PM_START, pts: 0, wins: 0, log: [], S: null, timers: [], sc: null, rng: null };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.75; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle2(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function cndl(o, c, vol) { return [o, Math.max(o, c) + rnd(.05, .6) * vol, Math.min(o, c) - rnd(.05, .6) * vol, c]; }
  function last(a) { return a[a.length - 1]; }
  function run(p, steps) {                          // steps: [[n, delta, vol], ...] relative moves with noise
    var out = [], i, k, from, to, c, o;
    for (i = 0; i < steps.length; i++) {
      from = p; to = p + steps[i][1];
      for (k = 1; k <= steps[i][0]; k++) { c = from + (to - from) * k / steps[i][0] + gauss() * steps[i][2] * .7; o = p; out.push(cndl(o, c, steps[i][2])); p = c; }
    }
    return out;
  }
  function toward(p, target, n, vol) { return run(p, [[n, target - p, vol]]); }
  function chop(p, n, amp) { var st = [], left = n, s = Math.random() < .5 ? 1 : -1; while (left > 0) { var a = Math.min(left, Math.round(rnd(4, 8))); st.push([a, s * rnd(.6, 1) * amp, .85]); s = -s; left -= a; } return run(p, st); }
  function trend(p, dir, n) {
    var st = [], left = n;
    while (left > 0) { var a = Math.min(left, Math.round(rnd(7, 12))); st.push([a, dir * rnd(3.5, 6), .85]); left -= a; if (left > 4) { var b = Math.min(left, Math.round(rnd(4, 6))); st.push([b, -dir * rnd(1.4, 2.6), .8]); left -= b; } }
    return run(p, st);
  }
  function swings(p, lo, hi, n, startUp) {         // bounce between two levels
    var st = [], left = n, up = startUp, cur = p;
    while (left > 0) { var a = Math.min(left, Math.round(rnd(6, 9))); var tgt = (up ? hi : lo) + rnd(-.5, .5); st.push([a, tgt - cur, .8]); cur = tgt; up = !up; left -= a; }
    return run(p, st);
  }
  function lc(a) { return last(a)[3]; }
  function cat(/* arrays */) { return Array.prototype.concat.apply([], arguments); }
  /* every scenario: label, group, bias (+1 up, -1 down, 0 coin flip), line = what a good line looks like, why = how traders use it */
  var SCN = [
    { k: "up", label: "Uptrend", g: "Trend", bias: 1, line: "trend", why: "Higher highs and higher lows. Trend traders buy pullbacks to a rising trend line and put the stop under the last low. Trends can end, so size the risk.", b: function () { var a = chop(100, 14, 2.5), t = trend(lc(a), 1, PM_HIST - 14); return { h: cat(a, t) }; } },
    { k: "down", label: "Downtrend", g: "Trend", bias: -1, line: "trend", why: "Lower highs and lower lows. Trend traders sell rallies to a falling trend line and put the stop above the last high.", b: function () { var a = chop(120, 14, 2.5), t = trend(lc(a), -1, PM_HIST - 14); return { h: cat(a, t) }; } },
    { k: "pbu", label: "Pullback in an uptrend", g: "Trend", bias: 1, line: "trend", why: "Price rose, then dipped back toward the rising trend line. The classic trend-following entry is the end of the pullback, not the top of the move.", b: function () { var a = chop(100, 12, 2.5), t = trend(lc(a), 1, PM_HIST - 18), d = run(lc(t), [[6, -rnd(3, 4.5), .8]]); return { h: cat(a, t, d) }; } },
    { k: "pbd", label: "Rally in a downtrend", g: "Trend", bias: -1, line: "trend", why: "Price fell, then bounced up toward the falling trend line. Trend sellers wait for the bounce to fail near the line.", b: function () { var a = chop(120, 12, 2.5), t = trend(lc(a), -1, PM_HIST - 18), d = run(lc(t), [[6, rnd(3, 4.5), .8]]); return { h: cat(a, t, d) }; } },
    { k: "rng", label: "Consolidation (sideways range)", g: "Range", bias: 0, line: "flat", why: "Price is boxed between a floor and a ceiling. Range traders buy near support and sell near resistance. A close outside the box means the range is over.", b: function () { var lo = 100, hi = 109, a = swings(104, lo, hi, PM_HIST, Math.random() < .5); return { h: a, lv: [{ y: hi, t: "Resistance", c: "#ff6bd6" }, { y: lo, t: "Support", c: "#4de1ff" }] }; } },
    { k: "sup", label: "Bounce off support", g: "Support & resistance", bias: 1, line: "flat", why: "Price keeps turning up from the same floor. A third touch often bounces again. If price closes below the floor, the idea is wrong: that is your stop.", b: function () { var lo = 100, hi = 109, a = swings(104, lo, hi, PM_HIST - 8, false), t = toward(lc(a), lo + .6, 8, .8); return { h: cat(a, t), lv: [{ y: hi, t: "Resistance", c: "#ff6bd6" }, { y: lo, t: "Support", c: "#4de1ff" }] }; } },
    { k: "res", label: "Rejection at resistance", g: "Support & resistance", bias: -1, line: "flat", why: "Price keeps turning down from the same ceiling. A third touch often rejects again. A close above the ceiling means the idea failed.", b: function () { var lo = 100, hi = 109, a = swings(104, lo, hi, PM_HIST - 8, true), t = toward(lc(a), hi - .6, 8, .8); return { h: cat(a, t), lv: [{ y: hi, t: "Resistance", c: "#ff6bd6" }, { y: lo, t: "Support", c: "#4de1ff" }] }; } },
    { k: "bou", label: "Breakout above resistance", g: "Breakout", bias: 1, line: "flat", why: "Price closed above a ceiling it failed at before. Breakout traders join the move, but fakeouts are common: wait for a close, not a wick, and keep the stop behind the level.", b: function () { var lo = 100, hi = 109, a = swings(104, lo, hi, PM_HIST - 6, false), t = run(lc(a), [[3, hi - lc(a) + 1, .7], [3, 1.6, .7]]); return { h: cat(a, t), lv: [{ y: hi, t: "Broken resistance", c: "#ff6bd6" }, { y: lo, t: "Support", c: "#4de1ff" }] }; } },
    { k: "bod", label: "Breakdown below support", g: "Breakout", bias: -1, line: "flat", why: "Price closed below a floor that held before. Breakdown traders sell the break, but watch for a fakeout that snaps back inside the range.", b: function () { var lo = 100, hi = 109, a = swings(105, lo, hi, PM_HIST - 6, true), t = run(lc(a), [[3, lo - lc(a) - 1, .7], [3, -1.6, .7]]); return { h: cat(a, t), lv: [{ y: hi, t: "Resistance", c: "#ff6bd6" }, { y: lo, t: "Broken support", c: "#4de1ff" }] }; } },
    { k: "rtu", label: "Retest of broken resistance", g: "Breakout", bias: 1, line: "flat", why: "Role reversal: old resistance becomes new support. Waiting for the retest gives a closer stop than chasing the breakout. If price closes back below the level, stand aside.", b: function () { var lo = 100, hi = 109, a = swings(104, lo, hi, PM_HIST - 14, false), t = run(lc(a), [[4, hi - lc(a) + 3, .7], [5, 1.5, .8], [5, -(3.8), .7]]); return { h: cat(a, t), lv: [{ y: hi, t: "Old resistance = new support", c: "#ff6bd6", zone: true }] }; } },
    { k: "rtd", label: "Retest of broken support", g: "Breakout", bias: -1, line: "flat", why: "Role reversal: old support becomes new resistance. Sellers often wait for price to come back up to the broken floor and fail.", b: function () { var lo = 100, hi = 109, a = swings(105, lo, hi, PM_HIST - 14, true), t = run(lc(a), [[4, lo - lc(a) - 3, .7], [5, -1.5, .8], [5, 3.8, .7]]); return { h: cat(a, t), lv: [{ y: lo, t: "Old support = new resistance", c: "#4de1ff", zone: true }] }; } },
    { k: "dt", label: "Double top", g: "Chart pattern", bias: -1, line: "flat", why: "Price failed at the same high twice (an M). Sellers defend that ceiling. It is confirmed when price breaks the dip between the peaks.", b: function () { var a = chop(100, 12, 2), s = lc(a), t = run(s, [[8, 9, .8], [7, -6, .8], [8, 6.2, .8], [8, -5.5, .8], [4, 2.5, .8]]); return { h: cat(a, t, chop(lc(t), PM_HIST - 12 - 35, 1.5)).slice(0, PM_HIST), lv: [{ y: s + 9, t: "Resistance (two peaks)", c: "#ff6bd6" }, { y: s + 3, t: "Neckline", c: "#4de1ff" }] }; } },
    { k: "db", label: "Double bottom", g: "Chart pattern", bias: 1, line: "flat", why: "Price held the same low twice (a W). Buyers defend that floor. It is confirmed when price breaks the peak between the lows.", b: function () { var a = chop(110, 12, 2), s = lc(a), t = run(s, [[8, -9, .8], [7, 6, .8], [8, -6.2, .8], [8, 5.5, .8], [4, -2.5, .8]]); return { h: cat(a, t, chop(lc(t), PM_HIST - 12 - 35, 1.5)).slice(0, PM_HIST), lv: [{ y: s - 9, t: "Support (two lows)", c: "#4de1ff" }, { y: s - 3, t: "Neckline", c: "#ff6bd6" }] }; } },
    { k: "at", label: "Ascending triangle", g: "Chart pattern", bias: 1, line: "flat", why: "A flat ceiling with rising lows: buyers keep pressing. Breakouts through the flat top are common but not guaranteed.", b: function () { var a = chop(100, 14, 2), s = lc(a), top = s + 8, t = run(s, [[6, top - s, .8], [6, -7, .8], [6, 7, .8], [6, -4.5, .8], [6, 4.2, .8], [6, -2, .8], [5, 2, .7]]); return { h: cat(a, t, chop(lc(t), PM_HIST - 14 - 41, 1)).slice(0, PM_HIST), lv: [{ y: top, t: "Flat top", c: "#ff6bd6" }] }; } },
    { k: "dtri", label: "Descending triangle", g: "Chart pattern", bias: -1, line: "flat", why: "A flat floor with falling highs: sellers keep pressing. Breakdowns through the flat bottom are common but not guaranteed.", b: function () { var a = chop(110, 14, 2), s = lc(a), bot = s - 8, t = run(s, [[6, bot - s, .8], [6, 7, .8], [6, -7, .8], [6, 4.5, .8], [6, -4.2, .8], [6, 2, .8], [5, -2, .7]]); return { h: cat(a, t, chop(lc(t), PM_HIST - 14 - 41, 1)).slice(0, PM_HIST), lv: [{ y: bot, t: "Flat bottom", c: "#4de1ff" }] }; } },
    { k: "ham", label: "Hammer", g: "Candlestick", bias: 1, line: "trend", why: "Small body at the top, long lower wick, after a fall: sellers pushed down, buyers pulled it back. Wait for the next candle to close higher before trusting it.", b: function () { var a = chop(120, 14, 2), t = trend(lc(a), -1, PM_HIST - 15), p = lc(t); return { h: cat(a, t, [[p, p + .4, p - 3.6, p + .25]]), hl: 1 }; } },
    { k: "ss", label: "Shooting Star", g: "Candlestick", bias: -1, line: "trend", why: "Small body at the bottom, long upper wick, after a rise: the rally failed. Wait for the next candle to close lower before acting.", b: function () { var a = chop(100, 14, 2), t = trend(lc(a), 1, PM_HIST - 15), p = lc(t); return { h: cat(a, t, [[p, p + 3.6, p - .4, p - .25]]), hl: 1 }; } },
    { k: "bue", label: "Bullish Engulfing", g: "Candlestick", bias: 1, line: "trend", why: "A small red candle is covered by a big green one: buyers overwhelmed sellers. A strong reversal sign, best with a green follow-up candle.", b: function () { var a = chop(120, 14, 2), t = trend(lc(a), -1, PM_HIST - 16), p = lc(t); return { h: cat(a, t, [[p, p + .3, p - 1.1, p - .8], [p - 1.1, p + 2.3, p - 1.3, p + 2]]), hl: 2 }; } },
    { k: "bee", label: "Bearish Engulfing", g: "Candlestick", bias: -1, line: "trend", why: "A small green candle is covered by a big red one: sellers took control. A strong reversal sign, best with a red follow-up candle.", b: function () { var a = chop(100, 14, 2), t = trend(lc(a), 1, PM_HIST - 16), p = lc(t); return { h: cat(a, t, [[p, p + 1.1, p - .3, p + .8], [p + 1.1, p + 1.3, p - 2.3, p - 2]]), hl: 2 }; } },
    { k: "ms", label: "Morning Star", g: "Candlestick", bias: 1, line: "trend", why: "Big red candle, a small star, then a big green candle: selling fades and buyers take over. Bullish reversal, confirm with the next candle.", b: function () { var a = chop(120, 14, 2), t = trend(lc(a), -1, PM_HIST - 17), p = lc(t), q = p - 2.8; return { h: cat(a, t, [[p, p + .2, q - .2, q], [q - .6, q - .3, q - 1.2, q - .9], [q - .8, q + 2.6, q - 1, q + 2.3]]), hl: 3 }; } },
    { k: "es", label: "Evening Star", g: "Candlestick", bias: -1, line: "trend", why: "Big green candle, a small star, then a big red candle: buying fades and sellers take over. Bearish reversal, confirm with the next candle.", b: function () { var a = chop(100, 14, 2), t = trend(lc(a), 1, PM_HIST - 17), p = lc(t), q = p + 2.8; return { h: cat(a, t, [[p, q + .2, p - .2, q], [q + .6, q + 1.2, q + .3, q + .9], [q + .8, q + 1, q - 2.6, q - 2.3]]), hl: 3 }; } },
    { k: "tws", label: "Three White Soldiers", g: "Candlestick", bias: 1, line: "flat", why: "Three big green candles, each closing higher: strong buying. Often continues, but after a big run it can mean exhaustion.", b: function () { var a = chop(100, PM_HIST - 3, 2.5), p = lc(a); return { h: cat(a, [[p, p + 2.6, p - .3, p + 2.3], [p + 2.1, p + 4.9, p + 1.8, p + 4.6], [p + 4.4, p + 7.2, p + 4.1, p + 6.9]]), hl: 3 }; } },
    { k: "tbc", label: "Three Black Crows", g: "Candlestick", bias: -1, line: "flat", why: "Three big red candles, each closing lower: strong selling. Often continues, but after a big drop it can mean exhaustion.", b: function () { var a = chop(110, PM_HIST - 3, 2.5), p = lc(a); return { h: cat(a, [[p, p + .3, p - 2.6, p - 2.3], [p - 2.1, p - 1.8, p - 4.9, p - 4.6], [p - 4.4, p - 4.1, p - 7.2, p - 6.9]]), hl: 3 }; } },
    { k: "doj", label: "Doji (indecision)", g: "Candlestick", bias: 0, line: "trend", why: "Open and close almost the same: buyers and sellers are tied. After a strong move it can signal a pause or turn, but on its own it is not a signal. Read the next candle.", b: function () { var d = Math.random() < .5 ? 1 : -1, a = chop(110, 14, 2), t = trend(lc(a), d, PM_HIST - 15), p = lc(t); return { h: cat(a, t, [[p, p + 2.4, p - 2.4, p + .08 * d]]), hl: 1 }; } },
    { k: "non", label: "No clear setup", g: "None", bias: 0, line: "any", why: "Not every chart is tradeable. Choppy, messy candles with no trend, level or pattern are a reason to skip the trade.", b: function () { return { h: run(105, [[PM_HIST, rnd(-3, 3), 1.15]]) }; } }
  ];
  /* trend direction of the question, used for the "draw a line" explanation */
  function genRound(sc) {
    var b = sc.b(), hist = b.h.slice(0, PM_HIST), i, ai = 0;
    for (i = hist.length - 14; i < hist.length; i++) ai += hist[i][1] - hist[i][2];
    var atr = ai / 14, dir = sc.bias ? (Math.random() < .62 ? sc.bias : -sc.bias) : (Math.random() < .5 ? 1 : -1), p = lc(hist);
    var fut = run(p, [[PM_FUT, dir * atr * rnd(2.6, 5.2), .85]]);
    return { sc: sc, hist: hist, fut: fut, atr: atr, lv: b.lv || [], dir: dir, hl: b.hl || 0 };
  }
  function fmtP(x) { return (PM_BASE + x * PM_SCALE).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  /* ---- chart (pixel-sized so text is never stretched) ---- */
  function pmChart(cs, o) {
    o = o || {};
    var host = $("#pmChart"), W = host ? host.clientWidth || 360 : 360, H = host ? host.clientHeight || 340 : 340, axisW = 62, top = 10, bot = 22, i;
    var lo = Infinity, hi = -Infinity;
    cs.forEach(function (k) { lo = Math.min(lo, k[2]); hi = Math.max(hi, k[1]); });
    var pad = (hi - lo) * .1 + .6; lo -= pad; hi += pad;
    if (pm.rng) { lo = Math.min(lo, pm.rng.lo); hi = Math.max(hi, pm.rng.hi); }
    (o.lines || []).forEach(function (l) { if (l.fit) { lo = Math.min(lo, l.y - 1); hi = Math.max(hi, l.y + 1); } });
    pm.rng = { lo: lo, hi: hi };
    var plotH = H - top - bot, slots = o.slots || cs.length, step = (W - axisW - 6) / slots, bw = Math.max(2, step * .64);
    var Y = function (v) { return top + (hi - v) / (hi - lo) * plotH; };
    pm.sc = { W: W, H: H, step: step, hi: hi, lo: lo, top: top, plotH: plotH, axisW: axisW };
    var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Price chart"><rect width="' + W + '" height="' + H + '" fill="#0b0f1d"/>';
    var tick = (hi - lo) / 6, k2;
    for (i = 0; i <= 6; i++) { var v = lo + tick * i, y = Y(v); s += '<line x1="0" x2="' + (W - axisW) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.06)"/><text x="' + (W - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="10.5" font-weight="600" fill="#8b97b8">' + fmtP(v) + "</text>"; }
    for (i = 0; i < slots; i += 10) { var gx = 6 + step * i + step / 2; s += '<line x1="' + gx + '" x2="' + gx + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="rgba(255,255,255,.045)"/>'; }
    (o.lines || []).forEach(function (l) {
      if (l.i0 != null) { var x0 = 6 + step * l.i0 + step / 2, x1 = 6 + step * l.i1 + step / 2; s += '<line x1="' + x0 + '" y1="' + Y(l.p0) + '" x2="' + x1 + '" y2="' + Y(l.p1) + '" stroke="' + l.c + '" stroke-width="' + (l.w || 2) + '" stroke-linecap="round"' + (l.d ? ' stroke-dasharray="' + l.d + '"' : "") + "/>" + (l.dots ? '<circle cx="' + x0 + '" cy="' + Y(l.p0) + '" r="5" fill="' + l.c + '"/><circle cx="' + x1 + '" cy="' + Y(l.p1) + '" r="5" fill="' + l.c + '"/>' : "") + (l.t ? '<text x="' + (x1 - 4) + '" y="' + (Y(l.p1) - 7) + '" text-anchor="end" font-size="10.5" font-weight="800" fill="' + l.c + '">' + l.t + "</text>" : ""); return; }
      var y = Y(l.y);
      s += (l.zone ? '<rect x="0" y="' + (y - 5) + '" width="' + (W - axisW) + '" height="10" fill="' + l.c + '" opacity=".16"/>' : "") + '<line x1="0" x2="' + (W - axisW) + '" y1="' + y + '" y2="' + y + '" stroke="' + l.c + '" stroke-width="1.6" stroke-dasharray="' + (l.zone ? "6 4" : "5 4") + '"/><text x="6" y="' + (y - 5) + '" font-size="10.5" font-weight="800" fill="' + l.c + '">' + l.t + "</text>";
    });
    cs.forEach(function (k, idx) {
      var x = 6 + step * idx + step / 2, up = k[3] >= k[0], col = up ? "#089981" : "#f23645", hl = o.hl && idx >= cs.length - o.hl && o.mark;
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + Y(k[1]) + '" y2="' + Y(k[2]) + '" stroke="' + col + '" stroke-width="1.2"/><rect x="' + (x - bw / 2) + '" y="' + Y(Math.max(k[0], k[3])) + '" width="' + bw + '" height="' + Math.max(1.4, Math.abs(Y(k[0]) - Y(k[3]))) + '" fill="' + col + '"' + (hl ? ' stroke="#ffd166" stroke-width="1.2"' : "") + "/>";
    });
    if (o.mark && o.hl) { var xa = 6 + step * (cs.length - o.hl) - 3, xb = 6 + step * cs.length + 3; var hh = 0, ll = Infinity; cs.slice(-o.hl).forEach(function (k) { hh = Math.max(hh, k[1]); ll = Math.min(ll, k[2]); }); s += '<rect x="' + xa + '" y="' + (Y(hh) - 6) + '" width="' + (xb - xa) + '" height="' + (Y(ll) - Y(hh) + 12) + '" rx="5" fill="none" stroke="#ffd166" stroke-dasharray="4 3"/>'; }
    var lcl = lc(cs), ly = Y(lcl);
    s += '<line x1="0" x2="' + (W - axisW + 6) + '" y1="' + ly + '" y2="' + ly + '" stroke="' + (last(cs)[3] >= last(cs)[0] ? "#089981" : "#f23645") + '" stroke-width=".9" stroke-dasharray="2 3"/><rect x="' + (W - axisW + 2) + '" y="' + (ly - 9) + '" width="' + (axisW - 2) + '" height="18" rx="3" fill="' + (last(cs)[3] >= last(cs)[0] ? "#089981" : "#f23645") + '"/><text x="' + (W - 5) + '" y="' + (ly + 4) + '" text-anchor="end" font-size="10.5" font-weight="800" fill="#fff">' + fmtP(lcl) + "</text>";
    s += '<text x="8" y="' + (H - 7) + '" font-size="10" fill="#5f6b8c">Gold · practice chart · not real data</text>';
    return s + "</svg>";
  }
  function pmBest(v) {
    try { if (v != null) { var b = +localStorage.getItem(PM_KEY) || 0; if (v > b) localStorage.setItem(PM_KEY, Math.round(v)); } return +localStorage.getItem(PM_KEY) || 0; } catch (e) { return 0; }
  }
  function money(v) { return (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US"); }
  function pmStop() { pm.timers.forEach(clearTimeout); pm.timers = []; }
  function later(fn, ms) { pm.timers.push(setTimeout(fn, ms)); }
  function pmShow() {
    pmStop(); var host = $("#pm"); if (!host) return;
    host.innerHTML = '<div class="qz-intro"><div class="pm-hero" id="pmChart" aria-hidden="true"></div><h2>Predict the Market</h2>' +
      '<p class="pdf-sub">' + PM_N + ' random charts. For each one you will: <b>1)</b> watch the market move, <b>2)</b> say what you see (candle pattern, trend, range, support, resistance, breakout), <b>3)</b> draw your line on the chart, then <b>4)</b> place a Buy or Sell trade with a virtual ' + money(PM_START) + '.</p>' +
      '<p class="pdf-sub">Setups only tilt the odds. The market does not move the same way every time.</p>' +
      (pmBest() ? '<p class="qz-best">Your best score: <b>' + pmBest() + " / " + PM_N * 3 + "</b></p>" : "") +
      '<button type="button" class="qz-btn" id="pmGo">Start trading</button><p class="cx-note">Practice money only. Charts are randomly generated for teaching and are not real market data. Education only, not financial advice.</p></div>';
    var d = genRound(pick(SCN)); pm.rng = null; $("#pmChart").innerHTML = pmChart(d.hist.slice(-40));
    $("#pmGo").addEventListener("click", function () { pm.r = 0; pm.bal = PM_START; pm.pts = 0; pm.wins = 0; pm.log = []; pm.order = shuffle2(SCN.slice()).slice(0, PM_N); pmRound(); });
  }
  function pmHead() { return '<div class="qz-top"><span>Question ' + (pm.r + 1) + " of " + PM_N + "</span><span>Score <b>" + pm.pts + "</b> · Balance <b>" + money(pm.bal) + "</b></span></div>" + '<div class="lr-bar"><i style="width:' + (100 * pm.r / PM_N).toFixed(0) + '%"></i></div>'; }
  function panel(html) { $("#pmPanel").innerHTML = html; }
  function pmRound() {
    pmStop(); var S = genRound(pm.order[pm.r]); pm.S = S; pm.line = null; pm.rng = null; var v = $("#lp-predict"); if (v) v.scrollTop = 0;
    $("#pm").innerHTML = pmHead() + '<div class="pm-chart" id="pmChart"></div><div class="qz-card glass pm-panel" id="pmPanel" aria-live="polite"></div>';
    panel('<h3 class="qz-q">Watch the market…</h3><p class="pm-wait">Candles are drawing in. Look for trends, levels and patterns.</p>');
    var seen = S.hist.slice(0, 30), i = 30, slots = PM_HIST + PM_FUT;
    $("#pmChart").innerHTML = pmChart(seen, { slots: slots });
    (function tick() {
      if (i >= S.hist.length) { later(pmAsk, 600); return; }
      seen.push(S.hist[i++]); $("#pmChart").innerHTML = pmChart(seen, { slots: slots }); later(tick, 55);
    })();
  }
  function drawBase(o) { o = o || {}; o.slots = PM_HIST + PM_FUT; $("#pmChart").innerHTML = pmChart(pm.S.hist, o); }
  /* ---- step 1: what do you see? ---- */
  function pmAsk() {
    var S = pm.S, others = SCN.filter(function (x) { return x.k !== S.sc.k; }), opts = [S.sc].concat(shuffle2(others).slice(0, 3));
    shuffle2(opts); drawBase();
    panel('<h3 class="qz-q">1) What do you see on this chart?</h3><div class="qz-opts" role="group">' + opts.map(function (o) { return '<button type="button" class="qz-opt" data-k="' + o.k + '">' + esc(o.label) + "</button>"; }).join("") + "</div>");
    $("#pmPanel").querySelector(".qz-opts").addEventListener("click", function (e) {
      var b = e.target.closest(".qz-opt"); if (!b || b.disabled) return; var ok = b.dataset.k === S.sc.k;
      if (ok) { pm.pts++; } S.idOk = ok;
      Array.prototype.forEach.call($("#pmPanel").querySelectorAll(".qz-opt"), function (x) { x.disabled = true; if (x.dataset.k === S.sc.k) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
      drawBase({ lines: S.lv.map(function (l) { return { y: l.y, t: l.t, c: l.c, zone: l.zone }; }), hl: S.hl, mark: !!S.hl });
      var f = document.createElement("div"); f.className = "qz-fb";
      f.innerHTML = '<p class="qz-verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "Correct! +1 point" : "Not quite. This was: " + esc(S.sc.label)) + "</p><p><b>" + esc(S.sc.label) + "</b> (" + esc(S.sc.g) + "). " + esc(S.sc.why) + '</p><button type="button" class="qz-btn" id="pmN1">Next: draw your line</button>';
      $("#pmPanel").appendChild(f); $("#pmN1").addEventListener("click", pmDraw); f.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }
  /* ---- step 2: draw a line ---- */
  function pmDraw() {
    var S = pm.S, host = $("#pmChart"), drag = null; pm.line = null;
    drawBase();
    panel('<h3 class="qz-q">2) Draw your line</h3><p class="pm-wait">Drag your finger across the chart: a <b>trend line</b> along the move, or a <b>flat line</b> at support / resistance if price is ranging.</p><div class="pm-two"><button type="button" class="qz-btn alt" id="pmClr">Clear</button><button type="button" class="qz-btn" id="pmLineOk" disabled>Done</button></div>');
    host.classList.add("draw");
    function pt(e) {
      var r = host.getBoundingClientRect(), sc = pm.sc, x = e.clientX - r.left, y = e.clientY - r.top;
      return { i: Math.max(0, Math.min(PM_HIST - 1, (x - 6) / sc.step - .5)), p: sc.hi - (y - sc.top) / sc.plotH * (sc.hi - sc.lo) };
    }
    function show() { drawBase(pm.line ? { lines: [{ i0: pm.line.i0, p0: pm.line.p0, i1: pm.line.i1, p1: pm.line.p1, c: "#ffd166", w: 2.6, dots: true }] } : {}); }
    host.onpointerdown = function (e) { if (!host.classList.contains("draw")) return; var a = pt(e); drag = a; pm.line = { i0: a.i, p0: a.p, i1: a.i, p1: a.p }; try { host.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); };
    host.onpointermove = function (e) { if (!drag) return; var b = pt(e); pm.line = { i0: drag.i, p0: drag.p, i1: b.i, p1: b.p }; show(); };
    host.onpointerup = host.onpointercancel = function () { if (!drag) return; drag = null; var L = pm.line; $("#pmLineOk").disabled = !(L && Math.abs(L.i1 - L.i0) >= 6); };
    $("#pmClr").addEventListener("click", function () { pm.line = null; $("#pmLineOk").disabled = true; show(); });
    $("#pmLineOk").addEventListener("click", function () { host.classList.remove("draw"); host.onpointerdown = host.onpointermove = host.onpointerup = host.onpointercancel = null; gradeLine(); });
  }
  function gradeLine() {
    var S = pm.S, L = pm.line, a = Math.min(L.i0, L.i1), b = Math.max(L.i0, L.i1), sl = (L.p1 - L.p0) / (L.i1 - L.i0), n = 0, fit = 0, i, tol = 1.1 * S.atr;
    for (i = Math.ceil(a); i <= Math.floor(b) && i < S.hist.length; i++) { var y = L.p0 + sl * (i - L.i0), k = S.hist[i]; n++; if (y >= k[2] - tol * .35 && y <= k[1] + tol * .35) fit++; }
    var frac = n ? fit / n : 0, flat = Math.abs(L.p1 - L.p0) < 1.4 * S.atr, mid = (L.p0 + L.p1) / 2, near = flat && S.lv.some(function (l) { return Math.abs(l.y - mid) < .9 * S.atr; });
    var ok = S.sc.line === "any" ? true : (frac >= .5 || near);
    if (ok) pm.pts++;
    var lines = S.lv.map(function (l) { return { y: l.y, t: l.t, c: l.c, zone: l.zone }; });
    if (S.sc.line === "trend") {                        // reference: best-fit line through the last 36 closes
      var m = 36, x0 = S.hist.length - m, sx = 0, sy = 0, sxx = 0, sxy = 0, j;
      for (j = 0; j < m; j++) { var c = S.hist[x0 + j][3]; sx += j; sy += c; sxx += j * j; sxy += j * c; }
      var slope = (m * sxy - sx * sy) / (m * sxx - sx * sx), icp = (sy - slope * sx) / m;
      lines.push({ i0: x0, p0: icp, i1: x0 + m - 1, p1: icp + slope * (m - 1), c: "#4de1ff", w: 2, d: "6 4", t: slope > 0 ? "Trend line (up)" : "Trend line (down)" });
    }
    lines.push({ i0: L.i0, p0: L.p0, i1: L.i1, p1: L.p1, c: "#ffd166", w: 2.6, dots: true });
    drawBase({ lines: lines, hl: S.hl, mark: !!S.hl });
    var msg = S.sc.line === "any" ? "There was no clean line to draw here. That is the lesson: some charts have no setup." : ok ? (flat ? "Nice. Your flat line sits on a level price keeps respecting." : "Nice. Your line follows the move.") : "Your line did not follow the price well. The dashed blue line (or the pink / blue levels) shows a better fit.";
    panel('<p class="qz-verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "Good line! +1 point" : "Not quite.") + "</p><p>" + msg + '</p><p class="pm-key"><span style="color:#ffd166">Yellow</span> = your line · <span style="color:#4de1ff">dashed blue</span> = trend fit · pink/blue bands = key levels</p><button type="button" class="qz-btn" id="pmN2">Next: place your trade</button>');
    $("#pmN2").addEventListener("click", pmTradeAsk);
  }
  /* ---- step 3: trade ---- */
  function pmTradeAsk() {
    drawBase();
    panel('<h3 class="qz-q">3) Where does price go next?</h3><div class="pm-tix">Risk <b>' + money(PM_RISK) + '</b> · Stop loss 2× ATR · Take profit 3× ATR</div><div class="pm-btns"><button type="button" class="pm-buy" data-side="1">Buy ▲</button><button type="button" class="pm-sell" data-side="-1">Sell ▼</button></div>');
    $("#pmPanel").querySelector(".pm-btns").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) pmTrade(+b.dataset.side); });
  }
  function pmTrade(side) {
    var S = pm.S, entry = lc(S.hist), sl = entry - side * 2 * S.atr, tp = entry + side * 3 * S.atr, slD = 2 * S.atr, seen = S.hist.slice(), i = 0, res = null;
    var lines = [{ y: entry, t: (side > 0 ? "BUY " : "SELL ") + fmtP(entry), c: "#ffd166" }, { y: tp, t: "Take profit", c: "#089981", fit: 1 }, { y: sl, t: "Stop loss", c: "#f23645", fit: 1 }];
    function draw() { $("#pmChart").innerHTML = pmChart(seen, { lines: lines, slots: PM_HIST + PM_FUT }); }
    function finish() {
      pmStop(); var pnl, reason, mv = side * (lc(seen) - entry);
      if (res === "tp") { pnl = PM_RISK * 1.5; reason = "Take profit hit"; } else if (res === "sl") { pnl = -PM_RISK; reason = "Stop loss hit"; }
      else { pnl = Math.max(-PM_RISK, Math.min(PM_RISK * 1.5, PM_RISK * mv / slD)); reason = "Closed after " + PM_FUT + " candles"; }
      var right = mv > 0; if (right) pm.pts++; pm.bal += pnl; if (pnl > 0) pm.wins++;
      pm.log.push({ n: S.sc.label, p: (S.idOk ? 1 : 0) + 0, pnl: pnl });
      var lastQ = pm.r === PM_N - 1;
      panel('<p class="qz-verdict ' + (right ? "ok" : "no") + '">' + (right ? "You read the direction right! +1 point" : "Price went against you.") + "</p><p><b>" + (pnl >= 0 ? "Profit " : "Loss ") + money(pnl) + "</b> · " + reason + ". " + (S.sc.bias ? "This " + esc(S.sc.label) + " usually points " + (S.sc.bias > 0 ? "up" : "down") + "; this time the market went " + (S.dir > 0 ? "UP" : "DOWN") + (S.dir === S.sc.bias ? ", as expected." : ". Setups fail about 4 times in 10. That is why you always use a stop loss.") : "With no clear edge, price went " + (S.dir > 0 ? "up" : "down") + " this time. That one was a coin flip.") + '</p><button type="button" class="qz-btn" id="pmNext">' + (lastQ ? "See my score" : "Next question") + "</button>");
      $("#pm .qz-top span:last-child").innerHTML = "Score <b>" + pm.pts + "</b> · Balance <b>" + money(pm.bal) + "</b>";
      var nb = $("#pmNext"); nb.addEventListener("click", function () { if (lastQ) pmEnd(); else { pm.r++; pmRound(); } });
    }
    function tick() {
      if (i >= S.fut.length) { finish(); return; }
      var k = S.fut[i++]; seen.push(k); draw();
      var hitSL = side > 0 ? k[2] <= sl : k[1] >= sl, hitTP = side > 0 ? k[1] >= tp : k[2] <= tp;
      if (hitSL) { res = "sl"; later(finish, 500); return; } if (hitTP) { res = "tp"; later(finish, 500); return; }
      later(tick, 260);
    }
    draw(); panel('<h3 class="qz-q">Trade placed…</h3><button type="button" class="qz-btn alt" id="pmSkip">Skip animation</button>');
    later(tick, 450);
    $("#pmSkip").addEventListener("click", function () { pmStop(); while (!res && i < S.fut.length) { var k = S.fut[i++]; seen.push(k); if (side > 0 ? k[2] <= sl : k[1] >= sl) res = "sl"; else if (side > 0 ? k[1] >= tp : k[2] <= tp) res = "tp"; } draw(); finish(); });
  }
  function pmEnd() {
    pmStop(); var max = PM_N * 3, ret = (pm.bal - PM_START) / PM_START * 100, prev = pmBest(), isBest = pm.pts > prev; pmBest(pm.pts);
    var pct = pm.pts / max, msg = pct >= .8 ? "Elite. You read the market like a pro." : pct >= .6 ? "Strong. You see the setups well." : pct >= .4 ? "Good start. Replay and study the patterns in the PDF guides." : "Keep practising. Open the PDF guides and try again: every run is a new set of charts.";
    $("#pm").innerHTML = '<div class="qz-end"><h2>Your results</h2><div class="qz-score"><b>' + pm.pts + "</b><span>/ " + max + '</span></div><p class="qz-msg">' + msg + "</p>" +
      '<p class="qz-msg">Practice balance: <b style="color:' + (pm.bal >= PM_START ? "#2ee59d" : "#ff8a9a") + '">' + money(pm.bal) + "</b> (" + (ret >= 0 ? "+" : "") + ret.toFixed(1) + "%) · " + pm.wins + " of " + PM_N + " trades in profit</p>" + (isBest && pm.pts > 0 ? '<p class="qz-best">New best score!</p>' : "") +
      '<div class="pm-log">' + pm.log.map(function (l, i) { return '<span class="' + (l.pnl > 0 ? "ok" : "no") + '">' + (i + 1) + ". " + esc(l.n) + " " + (l.pnl > 0 ? "+" : "") + money(l.pnl) + "</span>"; }).join("") + "</div>" +
      '<div class="qz-actions"><button type="button" class="qz-btn" id="pmAgain">Play again (new random charts)</button><button type="button" class="qz-btn alt" id="pmQuiz">Play the Candle Quiz</button><button type="button" class="qz-btn alt" id="pmHome">More tools</button></div><p class="cx-note">Practice money only. Not financial advice.</p></div>';
    $("#pmAgain").addEventListener("click", pmShow); $("#pmQuiz").addEventListener("click", function () { openView("quiz"); }); $("#pmHome").addEventListener("click", function () { openView("home"); });
  }

  buildRoute(); buildExplorer(); buildCompare(); wireWindow();
})();
