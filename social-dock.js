/* =====================================================================
   ICE UPDATE — tiny social icon in the bottom-right corner.
   • Stays fixed in the corner no matter where the visitor scrolls or goes.
   • Every few seconds it plays the pop-out animation: dots with spinning rings
     turn into the social icons one by one, each with its name beside it.
   • Tap the tiny circle any time to open / close the icons yourself.
   Which icons show, and their order (top → bottom), is set in config.js → dockSocials.
   The links come from config.js → socials (an icon with no link is skipped).
   ===================================================================== */
(function () {
  "use strict";
  var S = window.SITE || {}, I = window.IU_SOCIAL;
  if (!I) return;
  var order = (S.dockSocials && S.dockSocials.length) ? S.dockSocials : ["tiktok", "instagram", "youtube", "facebook", "x"];
  var byPlat = {};
  (S.socials || []).forEach(function (s) { if (s && s.platform) byPlat[String(s.platform).toLowerCase()] = s; });
  var items = order.map(function (k) { return byPlat[String(k).toLowerCase()]; })
    .filter(function (s) { return s && s.url && !/^\s*(javascript|vbscript|data):/i.test(s.url); });
  if (!items.length) return;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* the tiny circle shows the social icons one after another: Facebook, Instagram, TikTok ... */
  var faceOrder = ["facebook", "instagram", "tiktok", "youtube", "x"];
  var faces = faceOrder.filter(function (k) { return items.some(function (s) { return String(s.platform).toLowerCase() === k; }); });
  if (!faces.length) faces = [String(items[0].platform).toLowerCase()];

  var el = document.createElement("div");
  el.id = "iu-social"; el.className = "sd";
  el.innerHTML =
    '<div class="sd-list" role="group" aria-label="Follow Ice Update on social media">' +
      items.map(function (s, i) {
        var key = String(s.platform).toLowerCase(), meta = I.icons[key] || {};
        var nm = s.name || I.name(key);
        return '<a class="sd-i" style="--i:' + i + ";--n:" + (items.length - 1 - i) + ";--c:" + esc(meta.color || "#4de1ff") + '" href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(nm) + '" data-track="dock-social-' + esc(key) + '" tabindex="-1">' +
          '<span class="sd-name">' + esc(nm) + "</span>" +
          '<span class="sd-ico">' + I.icon(key) + '<u class="sd-dot"></u></span><i class="sd-arc"></i>' +
        "</a>";
      }).join("") +
    "</div>" +
    '<button type="button" class="sd-btn" aria-expanded="false" aria-label="Show social media links">' +
      '<i class="sd-spin"></i>' + faces.map(function (k, n) { return '<span class="sd-face' + (n ? "" : " on") + '">' + I.icon(k) + "</span>"; }).join("") +
    "</button>";
  document.body.appendChild(el);

  var btn = el.querySelector(".sd-btn"), links = el.querySelectorAll(".sd-i");
  var isOpen = false, closeTimer = 0, autoTimer = 0, outTimer = 0, touched = false;

  function setTab(on) { Array.prototype.forEach.call(links, function (a) { a.tabIndex = on ? 0 : -1; }); }
  function open(manual) {
    clearTimeout(closeTimer); clearTimeout(outTimer);
    if (isOpen) return; isOpen = true;
    el.classList.remove("closing"); void el.offsetWidth; el.classList.add("open");
    btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Hide social media links"); setTab(true);
  }
  function close() {
    clearTimeout(closeTimer);
    if (!isOpen) return; isOpen = false;
    el.classList.remove("open"); el.classList.add("closing");
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Show social media links"); setTab(false);
    outTimer = setTimeout(function () { el.classList.remove("closing"); }, 1150);
  }
  function pulse(holdMs) {            // the video loop: pop out, hold, tuck away
    if (touched || document.hidden || document.documentElement.classList.contains("iu-intro-hold") || document.documentElement.classList.contains("iu-pdfopen")) return;
    open(); closeTimer = setTimeout(close, holdMs);
  }
  function schedule() {
    clearTimeout(autoTimer);
    if (reduce) return;
    autoTimer = setTimeout(function () { pulse(4800); schedule(); }, 26000);
  }

  btn.addEventListener("click", function () { touched = true; clearTimeout(autoTimer); isOpen ? close() : open(true); });
  document.addEventListener("pointerdown", function (e) { if (isOpen && !el.contains(e.target)) { touched = true; close(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) { close(); btn.focus(); } });
  el.addEventListener("pointerenter", function () { clearTimeout(closeTimer); });
  el.addEventListener("pointerleave", function () { if (isOpen && !touched) closeTimer = setTimeout(close, 1800); });

  var fEls = el.querySelectorAll(".sd-face"), fi = 0;
  if (fEls.length > 1 && !reduce) setInterval(function () {
    if (document.hidden) return;
    fEls[fi].classList.remove("on"); fi = (fi + 1) % fEls.length; fEls[fi].classList.add("on");
  }, 1500);

  /* first pop-out: wait until the opening intro (if any) is finished */
  var waited = 0, boot = setInterval(function () {
    waited += 250;
    var holding = document.documentElement.classList.contains("iu-intro-hold") || document.documentElement.classList.contains("iu-intro-on");
    if (!holding || waited > 20000) { clearInterval(boot); el.classList.add("ready"); if (!reduce) setTimeout(function () { pulse(5200); schedule(); }, 1400); }
  }, 250);
})();
