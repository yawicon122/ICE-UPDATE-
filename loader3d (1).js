/* =====================================================================
   ICE UPDATE — 3D logo loader ("jump and slide").
   The broker logos + MetaTrader 5 + TradingView hop over each other and slide
   along a row in 3D, with the Alchemy Markets logo as the bigger, shining star.
   Used only when "PDF Guides" is opened (4.5 seconds, then the PDF list appears).
   Everything comes from config.js (brokers, platforms, loader), so adding a broker
   there adds its logo here automatically. Only transforms are animated, and the
   motion is a pure function of time, so it loops with no jumps or glitches.
   ===================================================================== */
(function () {
  "use strict";
  var S = window.SITE || {};
  var DEF_PLATFORMS = [{ name: "MetaTrader 5", logo: "mt5-logo.png" }, { name: "TradingView", logo: "tradingview-logo.png" }];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(u) { return (typeof u === "string" && u && !/^\s*(javascript|vbscript|data):/i.test(u)) ? u : ""; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeIO(t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function tileList() {
    var L = [];
    (S.brokers || []).forEach(function (b) { L.push({ name: b.name || "", logo: safe(b.logo), plat: false }); });
    (S.platforms || DEF_PLATFORMS).forEach(function (p) { L.push({ name: p.name || "", logo: safe(p.logo), plat: true }); });
    var ai = -1; L.forEach(function (t, i) { if (ai < 0 && /alchemy/i.test(t.name)) ai = i; });
    if (ai > 0) L.unshift(L.splice(ai, 1)[0]);
    if (ai >= 0) L[0].hero = true;
    return L;
  }

  /* ---------- the scene ---------- */
  function mount(host, opts) {
    host.innerHTML = "";
    var list = tileList(), n = list.length, STEP = (opts && opts.duration && n) ? clamp(opts.duration / (2 * n), 0.26, 0.6) : 0.5;
    if (!n) return { stop: function () {} };
    var stage = document.createElement("div"); stage.className = "iu3d";
    var cam = document.createElement("div"); cam.className = "iu3d-cam"; stage.appendChild(cam);
    var glow = document.createElement("div"); glow.className = "iu3d-floor"; cam.appendChild(glow);
    var parts = list.map(function (t) {
      var sh = document.createElement("i"); sh.className = "iu3d-sh"; cam.appendChild(sh);
      var el = document.createElement("div"); el.className = "iu3d-t" + (t.hero ? " star" : "") + (t.plat ? " plat" : "");
      var box = document.createElement("div"); box.className = "iu3d-box";
      var html = "";
      for (var k = 0; k < 5; k++) html += '<i class="e" style="--k:' + k + '"></i>';
      html += '<div class="f back"></div><div class="f front"></div>';
      box.innerHTML = html; el.appendChild(box); cam.appendChild(el);
      var front = box.querySelector(".front");
      if (t.logo) {
        var im = new Image(); im.alt = ""; im.decoding = "async"; im.draggable = false;
        im.onerror = function () { im.remove(); front.classList.add("nologo"); front.textContent = (t.name || "?").slice(0, 2); };
        im.src = t.logo; front.appendChild(im);
      } else { front.classList.add("nologo"); front.textContent = (t.name || "?").slice(0, 2); }
      return { el: el, sh: sh, hero: !!t.hero };
    });
    host.appendChild(stage);

    var W = 0, H = 0, u = 60, spacing = 70, baseY = 0, cx0 = 0, jump = 0;
    function layout() {
      W = host.clientWidth || 320;
      u = clamp(Math.floor(W * 0.9 / (n * 1.16 + 0.35)), 34, 78);          // tile size in px
      spacing = u * 1.16;
      H = Math.round(u * 4.9);
      stage.style.height = H + "px";
      baseY = Math.round(H * 0.6);
      cx0 = W / 2 - ((n - 1) * spacing) / 2;
      jump = u * 1.5;
      parts.forEach(function (p) {
        var s = p.hero ? u * 1.22 : u; p.size = s;
        p.el.style.width = p.el.style.height = s + "px";
        p.el.style.setProperty("--s", s + "px"); p.el.style.setProperty("--t", Math.round(s * 0.16) + "px");
        p.shw = Math.round(s * 1.05); p.shh = Math.round(s * 0.2);
        p.sh.style.width = p.shw + "px"; p.sh.style.height = p.shh + "px";
      });
      glow.style.width = Math.round(W * 0.96) + "px"; glow.style.top = (baseY - 6) + "px";
    }
    function X(slot) { return cx0 + slot * spacing; }

    function draw(t) {
      var p = t / STEP, k = Math.floor(p), f = p - k;
      for (var i = 0; i < n; i++) {
        var part = parts[i], slot = (((i - k) % n) + n) % n, s = part.size;
        var x, y = 0, z = 0, rx = 0, ry = 0, sc = 1, hgt = 0;
        if (slot === 0) {                                              // the jumper: leaps over the whole row
          var e = easeIO(f), arc = Math.sin(Math.PI * f);
          x = X(0) + (X(n - 1) - X(0)) * e;
          y = -jump * arc * (part.hero ? 1.2 : 1); z = u * 0.7 * arc; hgt = arc;
          rx = -360 * e; if (part.hero) ry = 360 * e;
          sc = 1 + 0.14 * arc;
        } else {                                                       // everyone else slides one place to the left
          var g = easeIO(clamp((f - 0.06) / 0.88, 0, 1)), bump = Math.sin(Math.PI * g);
          x = X(slot) + (X(slot - 1) - X(slot)) * g;
          ry = 14 * bump; y = -u * 0.06 * bump; hgt = 0;
        }
        part.el.style.transform = "translate3d(" + (x - s / 2).toFixed(2) + "px," + (baseY - s + y).toFixed(2) + "px," + z.toFixed(2) + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";
        var shw = 1 - 0.45 * hgt;
        part.sh.style.transform = "translate3d(" + (x - part.shw / 2).toFixed(2) + "px," + (baseY - part.shh / 2 + 2) + "px,0) scale(" + shw.toFixed(3) + ")";
        part.sh.style.opacity = (0.5 - 0.3 * hgt).toFixed(3);
      }
      cam.style.transform = "rotateX(13deg) rotateY(" + (Math.sin(t * 0.8) * 9).toFixed(2) + "deg)";
    }

    layout();
    var raf = 0, t0 = performance.now(), stopped = false;
    function loop(now) { if (stopped) return; draw((now - t0) / 1000); raf = requestAnimationFrame(loop); }
    if (reduce) draw(0.18); else raf = requestAnimationFrame(loop);
    function onResize() { layout(); }
    window.addEventListener("resize", onResize);
    return { stop: function () { stopped = true; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); host.innerHTML = ""; } };
  }
  window.IUScene = { mount: mount };

  /* The 3D animation is shown only when someone opens PDF Guides (see app.js). */
})();
