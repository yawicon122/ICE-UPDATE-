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
    { v: "predict", ico: "📈", t: "Predict the Market", d: "Paper trading game. A random chart appears, you press Buy or Sell and watch the candles play out. 10 rounds.", tag: "New" },
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
     6) PREDICT THE MARKET — paper-trading game with random charts
     Every round makes a NEW random chart. Some end in a candlestick pattern
     or chart pattern; some are plain noise. The pattern only tilts the odds
     (about 70/30): the market never moves one way every time.
     ------------------------------------------------------------------ */
  var PM_ROUNDS = 10, PM_START = 10000, PM_RISK = 200, PM_KEY = "iu_predict_best_v1", PM_BASE = 4960, PM_SCALE = 3;
  var pm = { r: 0, bal: PM_START, wins: 0, log: [], round: null, timers: [] };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.75; }   // roughly -2..2
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mk(o, c, up, dn) { return [o, Math.max(o, c) + Math.max(.05, up), Math.min(o, c) - Math.max(.05, dn), c]; }
  function noisy(o, c) { return mk(o, c, rnd(.1, .5), rnd(.1, .5)); }
  function walk(from, to, n, startPrice) {          // n noisy candles drifting from one price to another
    var out = [], p = startPrice, step = (to - from) / n, i, c;
    for (i = 0; i < n; i++) { c = from + step * (i + 1) + gauss() * .45; out.push(noisy(p, c)); p = c; }
    return out;
  }
  function through(pts, startPrice) {               // pts = [[index, price],...] -> candles that pass through the waypoints
    var out = [], p = startPrice, i, k, c;
    for (i = 0; i < pts.length; i++) {
      var n = i ? pts[i][0] - pts[i - 1][0] : pts[i][0];
      var from = i ? pts[i - 1][1] : startPrice;
      for (k = 1; k <= n; k++) { c = from + (pts[i][1] - from) * k / n + gauss() * .35; out.push(noisy(p, c)); p = c; }
    }
    return out;
  }
  function last(a) { return a[a.length - 1]; }
  var PATTERNS = [
    { name: "Hammer", kind: "Candlestick", bias: 1, why: "A small body near the top with a long lower wick after a fall: sellers pushed down, buyers pulled it back. Usually a bullish reversal.", build: function () {
      var h = walk(14, 6, 18, 14), p = last(h)[3]; h.push(mk(p - .1, p + .15, .15, 2.6)); return { h: h }; } },
    { name: "Shooting Star", kind: "Candlestick", bias: -1, why: "A small body near the bottom with a long upper wick after a rise: the rally failed. Usually a bearish reversal.", build: function () {
      var h = walk(6, 14, 18, 6), p = last(h)[3]; h.push(mk(p + .1, p - .15, 2.6, .15)); return { h: h }; } },
    { name: "Bullish Engulfing", kind: "Candlestick", bias: 1, why: "A small red candle is covered by a big green one: buyers overwhelmed sellers in one session. Usually a bullish reversal.", build: function () {
      var h = walk(15, 6, 18, 15), p = last(h)[3]; h.push(mk(p, p - .7, .15, .15)); h.push(mk(p - .9, p + 1.6, .2, .15)); return { h: h }; } },
    { name: "Bearish Engulfing", kind: "Candlestick", bias: -1, why: "A small green candle is covered by a big red one: sellers took full control. Usually a bearish reversal.", build: function () {
      var h = walk(5, 14, 18, 5), p = last(h)[3]; h.push(mk(p, p + .7, .15, .15)); h.push(mk(p + .9, p - 1.6, .15, .2)); return { h: h }; } },
    { name: "Morning Star", kind: "Candlestick", bias: 1, why: "Big red candle, a small indecisive star, then a big green candle: selling fades and buyers take over. Usually bullish.", build: function () {
      var h = walk(16, 7, 17, 16), p = last(h)[3]; h.push(mk(p, p - 1.9, .2, .2)); var q = p - 1.9; h.push(mk(q - .5, q - .7, .25, .25)); h.push(mk(q - .6, q + 1.7, .2, .2)); return { h: h }; } },
    { name: "Evening Star", kind: "Candlestick", bias: -1, why: "Big green candle, a small star, then a big red candle: buying fades and sellers take over. Usually bearish.", build: function () {
      var h = walk(4, 13, 17, 4), p = last(h)[3]; h.push(mk(p, p + 1.9, .2, .2)); var q = p + 1.9; h.push(mk(q + .5, q + .7, .25, .25)); h.push(mk(q + .6, q - 1.7, .2, .2)); return { h: h }; } },
    { name: "Double Bottom", kind: "Chart pattern", bias: 1, why: "Price fell to the same low twice and bounced both times (a \"W\"). Buyers defended that floor. Usually bullish once it breaks the middle peak.", build: function () {
      var h = through([[6, 8], [9, 0], [14, 7], [19, .2], [24, 4.8]], 8.5); return { h: h, lv: [{ y: 0, t: "Support", c: "#4de1ff" }, { y: 7, t: "Neckline", c: "#ff6bd6" }] }; } },
    { name: "Double Top", kind: "Chart pattern", bias: -1, why: "Price rose to the same high twice and was rejected both times (an \"M\"). Sellers defended that ceiling. Usually bearish once it breaks the middle dip.", build: function () {
      var h = through([[6, 2], [9, 10], [14, 3], [19, 9.8], [24, 5.2]], 1.5); return { h: h, lv: [{ y: 10, t: "Resistance", c: "#ff6bd6" }, { y: 3, t: "Neckline", c: "#4de1ff" }] }; } },
    { name: "Support Bounce", kind: "Chart pattern", bias: 1, why: "Price keeps turning up from the same floor. A third touch of support often bounces again, but a break below would fail the idea.", build: function () {
      var h = through([[5, 7], [9, 0.2], [14, 7], [18, .1], [23, 7], [27, .6]], 5); return { h: h, lv: [{ y: 0, t: "Support", c: "#4de1ff" }, { y: 7.2, t: "Resistance", c: "#ff6bd6" }] }; } },
    { name: "Resistance Rejection", kind: "Chart pattern", bias: -1, why: "Price keeps turning down from the same ceiling. A third touch of resistance often rejects again, but a close above would fail the idea.", build: function () {
      var h = through([[5, 1], [9, 7.8], [14, 1], [18, 7.9], [23, 1.2], [27, 7.2]], 3); return { h: h, lv: [{ y: 8, t: "Resistance", c: "#ff6bd6" }, { y: 1, t: "Support", c: "#4de1ff" }] }; } },
    { name: "Ascending Triangle", kind: "Chart pattern", bias: 1, why: "A flat ceiling with higher and higher lows: buyers keep pressing. Often breaks upward through the flat top.", build: function () {
      var h = through([[4, 5], [7, 9], [11, 3.5], [14, 9], [17, 5.5], [20, 9], [23, 7], [26, 8.6]], 3); return { h: h, lv: [{ y: 9.2, t: "Flat top", c: "#ff6bd6" }] }; } },
    { name: "Descending Triangle", kind: "Chart pattern", bias: -1, why: "A flat floor with lower and lower highs: sellers keep pressing. Often breaks downward through the flat bottom.", build: function () {
      var h = through([[4, 5], [7, 1], [11, 6.5], [14, 1], [17, 4.5], [20, 1], [23, 3], [26, 1.4]], 7); return { h: h, lv: [{ y: .8, t: "Flat bottom", c: "#4de1ff" }] }; } },
    { name: "No clear pattern", kind: "Market noise", bias: 0, why: "Not every chart has a setup. Here the candles are just noise, so the honest answer is a coin flip. Good traders often skip charts like this.", build: function () {
      var h = walk(8, 8 + rnd(-3, 3), 26, 8); return { h: h }; } }
  ];
  function genRound() {
    var P = Math.random() < .12 ? PATTERNS[PATTERNS.length - 1] : pick(PATTERNS.slice(0, -1)), b = P.build(), hist = b.h, dir;
    if (P.bias) dir = Math.random() < .7 ? P.bias : -P.bias; else dir = Math.random() < .5 ? 1 : -1;
    var ai = 0, i; for (i = Math.max(0, hist.length - 14); i < hist.length; i++) ai += hist[i][1] - hist[i][2]; var atr = ai / Math.min(14, hist.length);
    var fut = [], p = last(hist)[3], drift = rnd(.42, .7) * atr * .9 * dir;
    for (i = 0; i < 10; i++) { var c = p + drift + gauss() * atr * .35; fut.push(mk(p, c, rnd(.1, .45) * atr, rnd(.1, .45) * atr)); p = c; }
    return { P: P, hist: hist, fut: fut, atr: atr, lv: b.lv || [], dir: dir };
  }
  function fmtP(x) { return (PM_BASE + x * PM_SCALE).toFixed(2); }
  function pmChart(cs, o) {
    o = o || {};
    var W = 360, H = 250, padR = 54, lo = Infinity, hi = -Infinity, i;
    cs.forEach(function (k) { lo = Math.min(lo, k[2]); hi = Math.max(hi, k[1]); });
    (o.lines || []).forEach(function (l) { lo = Math.min(lo, l.y); hi = Math.max(hi, l.y); });
    var pad = (hi - lo) * .08 + .3; lo -= pad; hi += pad;
    var Y = function (v) { return 8 + (hi - v) / (hi - lo) * (H - 16); };
    var n = Math.max(cs.length, o.slots || cs.length), step = (W - padR - 8) / n, bw = Math.max(3, step * .62);
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Price chart"><rect width="' + W + '" height="' + H + '" fill="#070b1c"/>';
    for (i = 1; i < 5; i++) s += '<line x1="0" x2="' + W + '" y1="' + (H * i / 5) + '" y2="' + (H * i / 5) + '" stroke="rgba(255,255,255,.06)"/>';
    (o.lines || []).forEach(function (l) {
      var y = Y(l.y);
      s += (l.zone ? '<rect x="0" y="' + (y - 5) + '" width="' + (W - padR) + '" height="10" fill="' + l.c + '" opacity=".16"/>' : "") + '<line x1="0" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '" stroke="' + l.c + '" stroke-width="1.6" stroke-dasharray="' + (l.zone ? "6 4" : "4 3") + '"/>' +
        '<text x="5" y="' + (y - 4) + '" fill="' + l.c + '" font-size="10" font-weight="800">' + l.t + "</text>";
    });
    cs.forEach(function (k, idx) {
      var x = 6 + step * idx + step / 2, up = k[3] >= k[0], col = up ? "#2ee59d" : "#ff5d73";
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + Y(k[1]) + '" y2="' + Y(k[2]) + '" stroke="' + col + '" stroke-width="1.5"/><rect x="' + (x - bw / 2) + '" y="' + Y(Math.max(k[0], k[3])) + '" width="' + bw + '" height="' + Math.max(1.6, Math.abs(Y(k[0]) - Y(k[3]))) + '" fill="' + col + '"/>';
    });
    var lc = last(cs)[3], ly = Y(lc);
    s += '<line x1="0" x2="' + (W - padR + 4) + '" y1="' + ly + '" y2="' + ly + '" stroke="#ffd166" stroke-width=".8" stroke-dasharray="2 3"/><rect x="' + (W - padR + 4) + '" y="' + (ly - 8) + '" width="' + (padR - 4) + '" height="16" rx="3" fill="#ffd166"/><text x="' + (W - 4) + '" y="' + (ly + 3.5) + '" text-anchor="end" font-size="9.5" font-weight="800" fill="#241a00">' + fmtP(lc) + "</text>";
    return s + "</svg>";
  }
  function pmBest(v) {
    try { if (v != null) { var b = +localStorage.getItem(PM_KEY) || 0; if (v > b) localStorage.setItem(PM_KEY, Math.round(v)); } return +localStorage.getItem(PM_KEY) || 0; } catch (e) { return 0; }
  }
  function money(v) { return (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US"); }
  function pmStop() { pm.timers.forEach(clearTimeout); pm.timers = []; }
  function pmShow() {
    pmStop(); var host = $("#pm"); if (!host) return;
    var demo = genRound();
    host.innerHTML = '<div class="qz-intro"><div class="qz-hero pm-hero" aria-hidden="true">' + pmChart(demo.hist) + '</div><h2>Predict the Market</h2>' +
      '<p class="pdf-sub">Paper trading with a virtual ' + money(PM_START) + '. A random chart appears every round. Read the candles and patterns, then press <b style="color:#2ee59d">Buy</b> if you think price goes up or <b style="color:#ff8a9a">Sell</b> if you think it goes down. ' + PM_ROUNDS + ' rounds.</p>' +
      (pmBest() ? '<p class="qz-best">Your best balance: <b>' + money(pmBest()) + "</b></p>" : "") +
      '<button type="button" class="qz-btn" id="pmGo">Start trading</button><p class="cx-note">Practice money only. Charts are randomly generated for teaching and are not real market data. Patterns tilt the odds but never guarantee a move. Education only, not advice.</p></div>';
    $("#pmGo").addEventListener("click", function () { pm.r = 0; pm.bal = PM_START; pm.wins = 0; pm.log = []; pmRound(); });
  }
  function pmHead() { return '<div class="qz-top"><span>Round ' + (pm.r + 1) + " of " + PM_ROUNDS + '</span><span>Balance <b class="pm-bal">' + money(pm.bal) + "</b></span></div>" + '<div class="lr-bar"><i style="width:' + (100 * pm.r / PM_ROUNDS).toFixed(0) + '%"></i></div>'; }
  function pmRound() {
    pmStop(); var R = genRound(); pm.round = R; var host = $("#pm"), v = $("#lp-predict"); if (v) v.scrollTop = 0;
    host.innerHTML = pmHead() + '<div class="qz-card glass"><div class="pm-sym"><b>XAU/USD</b><span>Practice chart</span></div><div class="pm-chart" id="pmChart">' + pmChart(R.hist, { slots: R.hist.length + 10 }) + '</div>' +
      '<h3 class="qz-q">Which way will price go next?</h3><div class="pm-tix">Risk <b>' + money(PM_RISK) + '</b> · Stop loss 2× ATR · Take profit 4× ATR (1:2)</div>' +
      '<div class="pm-btns"><button type="button" class="pm-buy" data-side="1">Buy ▲</button><button type="button" class="pm-sell" data-side="-1">Sell ▼</button></div><div class="qz-fb" id="pmFb" aria-live="polite"></div></div>';
    host.querySelector(".pm-btns").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) pmTrade(+b.dataset.side); });
  }
  function pmTrade(side) {
    var R = pm.round, entry = last(R.hist)[3], sl = side * -1 * 2 * R.atr + entry, tp = side * 4 * R.atr + entry, slD = Math.abs(entry - sl), seen = R.hist.slice(), i = 0, res = null, $c = $("#pmChart");
    Array.prototype.forEach.call(document.querySelectorAll(".pm-btns button"), function (b) { b.disabled = true; });
    var lines = [{ y: entry, t: (side > 0 ? "BUY " : "SELL ") + "entry", c: "#ffd166" }, { y: tp, t: "Take profit", c: "#2ee59d" }, { y: sl, t: "Stop loss", c: "#ff5d73" }];
    function draw() { $c.innerHTML = pmChart(seen, { lines: lines, slots: R.hist.length + 10 }); }
    function finish() {
      var pnl, reason;
      if (res === "tp") { pnl = PM_RISK * 2; reason = "Take profit hit"; }
      else if (res === "sl") { pnl = -PM_RISK; reason = "Stop loss hit"; }
      else { var mv = side * (last(seen)[3] - entry); pnl = Math.max(-PM_RISK, Math.min(PM_RISK * 2, PM_RISK * mv / slD)); reason = "Closed after 10 candles"; }
      pm.bal += pnl; if (pnl > 0) pm.wins++; pm.log.push({ n: R.P.name, w: pnl > 0 });
      var right = R.dir === side, lv = R.lv.map(function (l) { return { y: l.y, t: l.t, c: l.c, zone: true }; });
      $c.innerHTML = pmChart(seen, { lines: lv.concat(lines), slots: R.hist.length + 10 });
      var lastR = pm.r === PM_ROUNDS - 1;
      $("#pmFb").innerHTML = '<p class="qz-verdict ' + (pnl > 0 ? "ok" : "no") + '">' + (pnl > 0 ? "Profit " : "Loss ") + money(pnl) + " · " + reason + "</p>" +
        '<p>Chart type: <b>' + esc(R.P.name) + "</b> (" + esc(R.P.kind) + "). " + esc(R.P.why) + '</p><p>' + (R.P.bias ? "This time the market went " + (R.dir > 0 ? "UP" : "DOWN") + (R.dir === R.P.bias ? ", the way this pattern usually points." : ", against what this pattern usually points. Patterns fail about 3 times in 10, which is why we use a stop loss.") : "Price went " + (R.dir > 0 ? "up" : "down") + " this time, but with no setup it was a guess.") + '</p>' +
        '<button type="button" class="qz-btn" id="pmNext">' + (lastR ? "See my results" : "Next round") + "</button>";
      var bal = document.querySelector(".pm-bal"); if (bal) bal.textContent = money(pm.bal);
      var nb = $("#pmNext"); nb.addEventListener("click", function () { if (lastR) pmEnd(); else { pm.r++; pmRound(); } }); nb.focus();
    }
    function tick() {
      if (i >= R.fut.length) { finish(); return; }
      var k = R.fut[i++]; seen.push(k); draw();
      var hitSL = side > 0 ? k[2] <= sl : k[1] >= sl, hitTP = side > 0 ? k[1] >= tp : k[2] <= tp;
      if (hitSL) { res = "sl"; finish(); return; }
      if (hitTP) { res = "tp"; finish(); return; }
      pm.timers.push(setTimeout(tick, 420));
    }
    draw(); pm.timers.push(setTimeout(tick, 500));
    $("#pmFb").innerHTML = '<button type="button" class="qz-btn alt" id="pmSkip">Skip animation</button>';
    $("#pmSkip").addEventListener("click", function () { pmStop(); while (!res && i < R.fut.length) { var k = R.fut[i++]; seen.push(k); if (side > 0 ? k[2] <= sl : k[1] >= sl) res = "sl"; else if (side > 0 ? k[1] >= tp : k[2] <= tp) res = "tp"; } finish(); });
  }
  function pmEnd() {
    pmStop(); var ret = (pm.bal - PM_START) / PM_START * 100, prev = pmBest(), isBest = pm.bal > prev && pm.bal > PM_START; pmBest(pm.bal);
    var msg = pm.bal >= PM_START * 1.1 ? "Excellent. Disciplined risk and good reading." : pm.bal > PM_START ? "In profit. Nice work." : pm.bal === PM_START ? "Break-even. Try again." : "A losing run. That is normal in trading. Review the guides and try again.";
    $("#pm").innerHTML = '<div class="qz-end"><h2>Your results</h2><div class="qz-score pm-final"><b style="color:' + (pm.bal >= PM_START ? "#2ee59d" : "#ff8a9a") + '">' + money(pm.bal) + '</b></div><p class="qz-msg">' + (ret >= 0 ? "+" : "") + ret.toFixed(1) + "% · " + pm.wins + " of " + PM_ROUNDS + " trades won</p><p class=\"qz-msg\">" + msg + "</p>" + (isBest ? '<p class="qz-best">New best balance!</p>' : "") +
      '<div class="pm-log">' + pm.log.map(function (l, i) { return '<span class="' + (l.w ? "ok" : "no") + '">' + (i + 1) + ". " + esc(l.n) + "</span>"; }).join("") + "</div>" +
      '<div class="qz-actions"><button type="button" class="qz-btn" id="pmAgain">Trade again</button><button type="button" class="qz-btn alt" id="pmQuiz">Play the Candle Quiz</button><button type="button" class="qz-btn alt" id="pmHome">More tools</button></div><p class="cx-note">Practice money only. Not financial advice.</p></div>';
    $("#pmAgain").addEventListener("click", pmShow); $("#pmQuiz").addEventListener("click", function () { openView("quiz"); }); $("#pmHome").addEventListener("click", function () { openView("home"); });
  }

  buildRoute(); buildExplorer(); buildCompare(); wireWindow();
})();
