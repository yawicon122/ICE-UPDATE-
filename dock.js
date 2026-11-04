/* =====================================================================
   ICE UPDATE — floating broker icon.
   A small Alchemy Markets bubble that stays on screen on every part of the site.
   • Drag it anywhere; it snaps to the left or right edge when you let go.
   • Tap it: all the broker logos pop out in a bar. Tap a logo to open that broker.
   • When it sits idle it does a little 3D flip + glow to catch the eye.
   Brokers come from config.js, so adding a broker there adds it here.
   ===================================================================== */
(function () {
  "use strict";
  var S = window.SITE || {};
  var brokers = (S.brokers || []).filter(function (b) { return b && b.url && !/^\s*(javascript|vbscript|data):/i.test(b.url); });
  if (!brokers.length) return;
  var main = brokers.filter(function (b) { return /alchemy/i.test(b.name || ""); })[0] || brokers[0];
  var SIZE = 56, MARGIN = 8, KEY = "iu_dock_v1", IDLE_MS = 3500;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function logo(b) { return b.logo ? '<img src="' + esc(b.logo) + '" alt="" draggable="false">' : '<span class="nl">' + esc((b.name || "?").slice(0, 2)) + "</span>"; }

  var dock = document.createElement("div");
  dock.id = "iu-dock"; dock.className = "iu-dock"; dock.setAttribute("data-dir", "right");
  dock.innerHTML =
    '<div class="iu-pill" role="menu" aria-label="Broker shortcuts">' +
      brokers.map(function (b, i) {
        return '<a class="iu-b" role="menuitem" style="--i:' + i + '" href="' + esc(b.url) + '" target="_blank" rel="noopener sponsored" title="' + esc(b.name) + '" aria-label="Open ' + esc(b.name) + '" data-track="dock-' + esc(b.name) + '">' + logo(b) + "</a>";
      }).join("") +
      '<button type="button" class="iu-x" aria-label="Close broker shortcuts">&#10005;</button>' +
    "</div>" +
    '<button type="button" class="iu-bubble" aria-label="Open broker shortcuts" aria-expanded="false" aria-haspopup="true">' +
      '<i class="ring r1"></i><i class="ring r2"></i><span class="coin">' + logo(main) + "</span>" +
    "</button>";
  document.body.appendChild(dock);

  var bubble = dock.querySelector(".iu-bubble"), pill = dock.querySelector(".iu-pill");
  var vw = 0, vh = 0, x = 0, y = 0, side = "left", yFrac = 0.55, isOpen = false, idleTimer = 0, dragging = false, justTapped = false;

  function bounds() {
    vw = window.innerWidth; vh = window.innerHeight;
    return { minX: MARGIN, maxX: vw - SIZE - MARGIN, minY: MARGIN + 4, maxY: vh - SIZE - MARGIN - 4 };
  }
  function place(nx, ny, snap) {
    x = nx; y = ny;
    dock.classList.toggle("snap", !!snap);
    dock.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px,0)";
  }
  function restore() {
    var b = bounds();
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && (o.side === "left" || o.side === "right") && typeof o.y === "number") { side = o.side; yFrac = clamp(o.y, 0, 1); } } catch (e) {}
    place(side === "left" ? b.minX : b.maxX, clamp(yFrac * vh - SIZE / 2, b.minY, b.maxY), false);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ side: side, y: +yFrac.toFixed(4) })); } catch (e) {} }

  function setDir() {                                    // open the bar toward the side that has room
    var room = side === "left" ? "right" : "left";
    dock.setAttribute("data-dir", room);
  }
  function open() {
    if (isOpen) return; isOpen = true; setDir();
    var b = bounds(); place(x, clamp(y, b.minY, b.maxY), true);
    dock.classList.add("open"); dock.classList.remove("idle");
    bubble.setAttribute("aria-expanded", "true"); bubble.setAttribute("aria-label", "Close broker shortcuts");
  }
  function close() {
    if (!isOpen) return; isOpen = false;
    dock.classList.remove("open");
    bubble.setAttribute("aria-expanded", "false"); bubble.setAttribute("aria-label", "Open broker shortcuts");
    armIdle();
  }
  function toggle() { isOpen ? close() : open(); }

  function armIdle() { clearTimeout(idleTimer); dock.classList.remove("idle"); if (isOpen || dragging) return; idleTimer = setTimeout(function () { if (!isOpen && !dragging) dock.classList.add("idle"); }, IDLE_MS); }

  /* ---------- drag ---------- */
  var sx = 0, sy = 0, ox = 0, oy = 0, pid = null, moved = false;
  bubble.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; ox = x; oy = y; moved = false;
    try { bubble.setPointerCapture(pid); } catch (err) {}
    dock.classList.remove("idle"); clearTimeout(idleTimer);
  });
  bubble.addEventListener("pointermove", function (e) {
    if (e.pointerId !== pid) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; dragging = true; if (isOpen) close(); dock.classList.add("drag"); dock.classList.remove("snap"); }
    if (!moved) return;
    var b = bounds(); place(clamp(ox + dx, b.minX, b.maxX), clamp(oy + dy, b.minY, b.maxY), false);
  });
  function end(e) {
    if (e.pointerId !== pid) return; pid = null;
    try { bubble.releasePointerCapture(e.pointerId); } catch (err) {}
    if (moved) {                                          // let go: glide to the nearest edge
      dragging = false; dock.classList.remove("drag");
      var b = bounds(); side = (x + SIZE / 2 < vw / 2) ? "left" : "right"; yFrac = (y + SIZE / 2) / vh;
      place(side === "left" ? b.minX : b.maxX, clamp(y, b.minY, b.maxY), true); save(); armIdle();
    } else if (e.type === "pointerup") {                  // a tap
      justTapped = true; setTimeout(function () { justTapped = false; }, 350); toggle();
    } else armIdle();
  }
  bubble.addEventListener("pointerup", end); bubble.addEventListener("pointercancel", end);
  bubble.addEventListener("click", function (e) { if (justTapped || moved) { e.preventDefault(); return; } toggle(); });   // keyboard Enter / Space
  bubble.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  dock.querySelector(".iu-x").addEventListener("click", close);
  document.addEventListener("pointerdown", function (e) { if (isOpen && !dock.contains(e.target)) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) { close(); bubble.focus(); } });
  window.addEventListener("resize", function () {
    var b = bounds(); place(side === "left" ? b.minX : b.maxX, clamp(yFrac * vh - SIZE / 2, b.minY, b.maxY), false);
  });
  Array.prototype.forEach.call(dock.querySelectorAll("img"), function (im) { im.onerror = function () { var s = document.createElement("span"); s.className = "nl"; s.textContent = "•"; im.replaceWith(s); }; });

  restore(); armIdle();
  requestAnimationFrame(function () { dock.classList.add("ready"); });       // fade in after the first position is set (no jump)
})();
