/* Ice Update — visual polish: hero crystal cursor tilt, learning-path counts, "Preview" shortcuts.
   Everything here is cosmetic; if this file fails to load the site still works. */
(function () {
  "use strict";
  var S = window.SITE || {}, $ = function (s) { return document.querySelector(s); };

  /* learning path: real numbers from config.js (no invented stats, no fake progress) */
  var vids = (S.videos || []).length, pdfs = S.pdfs || [], pages = 0;
  pdfs.forEach(function (p) { pages += +p.pages || 0; });
  var n1 = $("#pathN1"), n2 = $("#pathN2"), n3 = $("#pathN3");
  if (n1) n1.textContent = "WhatsApp & Telegram";
  if (n2) n2.textContent = pdfs.length ? pdfs.length + " PDF guide" + (pdfs.length > 1 ? "s" : "") + (pages ? " · " + pages + " pages" : "") : "Guides coming soon";
  if (n3) n3.textContent = vids ? vids + " video lesson" + (vids > 1 ? "s" : "") : "Lessons coming soon";
  var open = document.querySelector("[data-open-pdf]");
  if (open) open.addEventListener("click", function (e) {
    var c = document.getElementById("pdf-card"); if (!c) return;
    e.preventDefault(); c.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { c.click(); }, 450);
  });

  /* hero crystal: gentle cursor response (desktop only) + pause when off-screen */
  var hc = $("#heroCrystal"); if (!hc) return;
  var tilt = hc.querySelector(".hc-tilt");
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
    hc.classList.toggle("hc-paused", !en[0].isIntersecting || document.hidden);
  }, { threshold: 0.05 }).observe(hc);
  document.addEventListener("visibilitychange", function () { if (document.hidden) hc.classList.add("hc-paused"); });
  if (!matchMedia("(hover:hover) and (pointer:fine)").matches || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function loop() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    tilt.style.transform = "rotateY(" + cx.toFixed(2) + "deg) rotateX(" + (-cy).toFixed(2) + "deg)";
    raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : 0;
  }
  addEventListener("pointermove", function (e) {
    if (hc.classList.contains("hc-paused")) return;
    tx = (e.clientX / innerWidth - 0.5) * 36; ty = (e.clientY / innerHeight - 0.5) * 26;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
})();
