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
    { id: "candle", title: "Understand a candlestick", desc: "Build a candle with the sliders below and see what its body and wicks are telling you.", cta: "Open the candle explorer", go: "#explorer" },
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
      var pdf = e.target.closest("[data-pdf]");
      if (pdf) { var c = document.getElementById("pdf-card"); if (c) c.click(); return; }
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

  buildRoute(); buildExplorer(); buildCompare();
})();
