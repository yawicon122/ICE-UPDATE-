/* =====================================================================
   ICE UPDATE — Gold / USD market chart.
   Shows the free TradingView "Advanced Chart" widget with real XAUUSD data.
   No simulated candles. Loads only when the section is near the screen,
   so it never slows down the rest of the page.
   Settings live in config.js -> goldChart.
   ===================================================================== */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = window.SITE || {};
  var C = {};
  var base = { symbol: "OANDA:XAUUSD", source: "OANDA", feed: "live", interval: "15" }, user = S.goldChart || {};
  Object.keys(base).forEach(function (k) { C[k] = user[k] || base[k]; });
  if (!/^[A-Z0-9_]+:[A-Z0-9._-]+$/i.test(C.symbol)) C.symbol = base.symbol;
  var TF = { "5": 1, "15": 1, "60": 1, "240": 1, "D": 1 };
  if (!TF[C.interval]) C.interval = base.interval;

  var frame = $("goldFrame"), host = $("goldWidget"), loading = $("goldLoading"), err = $("goldError"),
      statusEl = $("goldStatus"), guard = $("goldGuard"), lock = $("goldLock");
  if (!frame || !host) return;

  var current = C.interval, started = false, broken = false, timer = 0, token = 0;
  var coarse = window.matchMedia && matchMedia("(pointer:coarse)").matches;

  $("goldSrc").textContent = "Data: " + C.source + " via TradingView";
  var sym = C.symbol.split(":")[1] || "XAUUSD";
  $("goldOpen").href = "https://www.tradingview.com/symbols/" + encodeURIComponent(sym) + "/";

  /* ---------- market status: only honest labels ---------- */
  function ny() {                                   // current New York weekday + hour (forex week runs Sun 5pm -> Fri 5pm NY time)
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date()), o = {};
      p.forEach(function (x) { o[x.type] = x.value; });
      return { d: o.weekday, h: parseInt(o.hour, 10) };
    } catch (e) { return null; }
  }
  function marketOpen() {
    var t = ny(); if (!t) return null;
    if (t.d === "Sat") return false;
    if (t.d === "Fri" && t.h >= 17) return false;
    if (t.d === "Sun" && t.h < 17) return false;
    return true;
  }
  function setStatus(kind, text) { statusEl.className = "gold-status " + kind; statusEl.innerHTML = "<i></i><span></span>"; statusEl.lastChild.textContent = text; }
  function refreshStatus() {
    if (broken) { setStatus("err", "Chart unavailable"); return; }
    var open = marketOpen();
    if (open === false) setStatus("closed", "Market closed · showing the last session · reopens Sunday 5 pm New York time");
    else if (C.feed === "delayed") setStatus("delayed", "Delayed data · prices are not real-time");
    else if (open === true) setStatus("live", "Live · real-time " + C.source + " feed");
    else setStatus("", "Gold / USD");
  }

  /* ---------- the widget ---------- */
  function showError() {
    broken = true; clearTimeout(timer);
    host.innerHTML = ""; loading.hidden = true; err.hidden = false; frame.setAttribute("aria-busy", "false");
    if (guard) guard.hidden = true; if (lock) lock.hidden = true;
    refreshStatus();
  }
  function build(tf) {
    var my = ++token; broken = false; clearTimeout(timer);
    current = tf; err.hidden = true; loading.hidden = false; frame.setAttribute("aria-busy", "true");
    host.innerHTML = ""; refreshStatus();
    if (navigator.onLine === false) { showError(); return; }
    var inner = document.createElement("div"); inner.className = "tradingview-widget-container__widget"; host.appendChild(inner);
    var cfg = {
      autosize: true, symbol: C.symbol, interval: tf, timezone: "Etc/UTC", theme: "dark", style: "1", locale: "en",
      backgroundColor: "#0a1030", gridColor: "rgba(255,255,255,0.06)",
      allow_symbol_change: false, hide_top_toolbar: true, hide_side_toolbar: true, hide_legend: false,
      withdateranges: false, save_image: false, calendar: false, details: false, hotlist: false, studies: [],
      support_host: "https://www.tradingview.com"
    };
    var sc = document.createElement("script");
    sc.async = true; sc.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    sc.text = JSON.stringify(cfg);
    sc.onerror = function () { if (my === token) showError(); };
    host.appendChild(sc);
    /* hide the loading cover once the chart frame has loaded; if it never does, say so */
    var mo = new MutationObserver(function () {
      var f = host.querySelector("iframe");
      if (!f || my !== token) return;
      mo.disconnect();
      var done = function () { if (my !== token) return; clearTimeout(timer); loading.hidden = true; frame.setAttribute("aria-busy", "false"); if (coarse) lock_on(); };
      f.addEventListener("load", function () { setTimeout(done, 400); }, { once: true });
    });
    mo.observe(host, { childList: true, subtree: true });
    timer = setTimeout(function () { if (my === token && !loading.hidden) { mo.disconnect(); showError(); } }, 20000);
  }

  /* ---------- phones: the chart must not trap page scrolling ---------- */
  function lock_on() { if (!coarse || broken) return; guard.hidden = false; lock.hidden = true; }
  if (coarse) {
    guard.addEventListener("click", function () { guard.hidden = true; lock.hidden = false; });
    lock.addEventListener("click", function () { lock.hidden = true; guard.hidden = false; });
  }

  /* ---------- timeframe buttons ---------- */
  var btns = Array.prototype.slice.call(document.querySelectorAll(".gold-tf button"));
  function markBtns() { btns.forEach(function (b) { var on = b.getAttribute("data-tf") === current; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      var tf = b.getAttribute("data-tf"); if (!TF[tf] || (tf === current && !broken)) return;
      current = tf; markBtns(); if (started) build(tf);
    });
  });
  $("goldRetry").addEventListener("click", function () { build(current); });
  window.addEventListener("online", function () { if (broken && started) build(current); });
  markBtns(); refreshStatus(); setInterval(refreshStatus, 60000);

  /* ---------- start only when the section is close to the screen ---------- */
  function start() { if (started) return; started = true; build(current); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: "500px 0px" });
    io.observe(frame);
  } else { window.addEventListener("load", function () { setTimeout(start, 600); }); }
})();
