/* =====================================================================
   ICE UPDATE — smoothness helper (loads first, before the opening animation).
   • Picks "light mode" automatically for weaker phones (class "iu-lite" on <html>):
     same pages, same features, same look — only the costliest effects are made cheaper
     (see style.css → "LIGHT MODE"). Strong phones keep every effect untouched.
   • Pauses the slow background motion while the visitor scrolls, so scrolling stays smooth.
   • Test it yourself:  add  ?perf=lite  or  ?perf=full  to the web address.
   ===================================================================== */
(function () {
  "use strict";
  var H = document.documentElement, C = H.classList, nav = navigator, con = nav.connection || {};
  var WEEK = 7 * 864e5, KEY = "iu_perf";

  /* 1) quick guess from the phone's specs (works before anything is drawn) */
  var weak = (nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
             con.saveData === true || /(^|-)2g$|3g/.test(con.effectiveType || "");

  /* 2) what we learned about this phone on an earlier visit (valid for a week) */
  var saved = "", m = /[?&]perf=(lite|full)/.exec(location.search);
  try {
    if (m) { localStorage.setItem(KEY, m[1] + "|" + Date.now()); }
    var raw = (localStorage.getItem(KEY) || "").split("|");
    if (raw[0] && Date.now() - (+raw[1] || 0) < WEEK) saved = raw[0];
  } catch (e) { if (m) saved = m[1]; }

  var lite = saved ? saved === "lite" : !!weak;
  if (lite) C.add("iu-lite");
  window.IU_LITE = function () { return C.contains("iu-lite"); };

  function remember(v) { try { localStorage.setItem(KEY, v + "|" + Date.now()); } catch (e) {} }

  /* 3) measure real smoothness for a few seconds; if the phone struggles, switch to light mode */
  function sample(ms, done) {
    var d = [], last = 0, t0 = 0;
    (function f(t) {
      if (last) { var x = t - last; if (x < 400) d.push(x); }
      last = t; if (!t0) t0 = t;
      if (t - t0 < ms && !document.hidden) requestAnimationFrame(f); else done(d);
    })(performance.now());
  }
  function struggling(d) {
    if (d.length < 25) return false;
    var s = 0, i; for (i = 0; i < d.length; i++) s += d[i];
    var mean = s / d.length; d.sort(function (a, b) { return a - b; });
    return mean > 27 || d[d.length >> 1] > 25;
  }
  function judge(d) { if (!C.contains("iu-lite") && struggling(d)) { C.add("iu-lite"); remember("lite"); } }
  if (!saved) {
    setTimeout(function () { sample(2600, judge); }, 800);                        // during the opening animation
    var once = function () { removeEventListener("scroll", once); setTimeout(function () { sample(1800, judge); }, 150); };
    addEventListener("scroll", once, { passive: true });                         // and while scrolling
  }

  /* 4) while scrolling, freeze the slow background drift (it resumes right after) */
  var st = 0;
  addEventListener("scroll", function () {
    if (!st) C.add("iu-scrolling");
    clearTimeout(st); st = setTimeout(function () { st = 0; C.remove("iu-scrolling"); }, 160);
  }, { passive: true });
})();
