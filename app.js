(() => {
const S = window.SITE || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const safeUrl = u => (!u || /^\s*(javascript|vbscript|data):/i.test(u)) ? "#" : u;

const VIDEO_URL = "ICE_UPDATES_ad_v2.mp4";
const SKIP_AFTER = 5;

const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
const r = document.documentElement.style, T = S.theme || {};
if (T.accent1) r.setProperty("--a1", T.accent1);
if (T.accent2) r.setProperty("--a2", T.accent2);
if (T.accent3) r.setProperty("--a3", T.accent3);
if (T.wallpaper) {
  const w = $("#wallpaper");
  const first = (innerWidth < 700 && T.wallpaperMobile) ? T.wallpaperMobile : T.wallpaper;
  const apply = url => { w.classList.add("img"); w.style.backgroundImage = `url("${url}")`; };
  const loadImg = (p, ok, fail) => {
    const arr = [p, T.wallpaper, T.wallpaperMobile].filter(Boolean);
    const seen = new Set();
    const next = i => {
      if (i >= arr.length) return fail && fail();
      const u = arr[i]; if (seen.has(u)) return next(i + 1); seen.add(u);
      const img = new Image(); img.onload = () => ok(u); img.onerror = () => next(i + 1); img.src = u;
    };
    next(0);
  };
  loadImg(first, apply, () => console.warn("Wallpaper not found:", first));
}

function track(name) {
  try {
    if (window.gtag && S.analytics && S.analytics.ga4) window.gtag("event", "click", { event_label: name });
  } catch (e) {}
}
document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-track]"); if (t) track(t.dataset.track); });

$("#brandName").textContent = S.brand || "Ice Update";
$("#heroBadge").textContent = S.hero?.badge || "";
$("#heroTitle").textContent = S.hero?.title || "";
$("#heroSub").textContent = S.hero?.subtitle || "";
$("#fBrand").textContent = S.brand || "";
$("#fNote").textContent = S.footerNote || "";
$("#yr").textContent = new Date().getFullYear();
for (const id of ["ctaWa","joinWa"]) $("#" + id).href = safeUrl(S.links?.whatsapp);
for (const id of ["ctaTg","joinTg"]) $("#" + id).href = safeUrl(S.links?.telegram);
$("#stVideos").textContent = (S.videos || []).length;
$("#stPdfs").textContent = (S.pdfs || []).length;
$("#stBrokers").textContent = (S.brokers || []).length;

const mc = $("#miniChart");
let p = 50;
for (let i = 0; i < 16; i++) {
  const n = (i * 37 % 11 - 4) * 3 + 6, up = n >= 0; p = Math.max(22, Math.min(88, p + n));
  const el = document.createElement("i"); el.style.height = (p) + "%"; el.style.animationDelay = i * .06 + "s";
  el.style.background = up ? "linear-gradient(#3ee6b0,#0a9a78)" : "linear-gradient(#ff6a7d,#d12a47)"; mc.appendChild(el);
}

function renderBrokers() {
  const bg = $("#brokerGrid");
  (S.brokers || []).forEach((b, i) => {
    const a = document.createElement("a"); a.className = "broker reveal"; a.href = safeUrl(b.url); a.target = "_blank"; a.rel = "noopener sponsored"; a.style.setProperty("--d", (i * -1.1) + "s");
    a.innerHTML = `<div class="tile glass tilt"><img alt="${esc(b.name)}" style="display:none"><div class="fallback">${esc((b.name || "?").slice(0, 2))}</div></div><span>${esc(b.name)}</span><small>${esc(b.note || "Broker")}</small>`;
    const im = a.querySelector("img"), fb = a.querySelector(".fallback");
    const img = new Image(); img.onload = () => { im.src = img.src; im.style.display = "block"; fb.style.display = "none"; }; img.onerror = () => {};
    img.src = b.logo ? b.logo : "";
    bg.appendChild(a);
  });
}
renderBrokers();

document.querySelectorAll(".join-card img").forEach(i => i.onerror = () => { i.style.display = "none"; });

(function () {
  const $ = function (id) { return document.getElementById(id); };
  console.log("ice popup script loaded");

  function findCard(t) {
    var el = t.closest && t.closest("#forex-card");
    if (el) return el;
    el = t;
    for (var i = 0; i < 6 && el && el !== document.body; i++, el = el.parentElement) {
      var txt = (el.textContent || "").trim();
      if (/^Forex Signals/i.test(txt) && txt.length < 200) return el;
    }
    return null;
  }

  function openPopup() {
    var popup = $("ice-popup"), video = $("ice-video");
    if (!popup || !video) { console.error("ice popup: #ice-popup or #ice-video not found in the page"); return; }
    $("ice-cta").hidden = true;
    $("ice-skip").hidden = true;
    if (!video.getAttribute("src")) video.src = VIDEO_URL;
    video.currentTime = 0;
    popup.classList.add("open");
    popup.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    video.play().catch(function (err) { console.warn("ice popup: play blocked", err); });
  }

  function closePopup() {
    var popup = $("ice-popup"), video = $("ice-video");
    if (!popup || !video) { console.error("ice popup: #ice-popup or #ice-video not found in the page"); return; }
    video.pause();
    video.currentTime = 0;
    popup.classList.remove("open");
    popup.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showButton() {
    $("ice-video").pause();
    $("ice-skip").hidden = true;
    $("ice-cta").hidden = false;
  }

  document.addEventListener("click", function (e) {
    if (findCard(e.target)) { e.preventDefault(); e.stopPropagation(); openPopup(); return; }
    if (e.target.closest && e.target.closest("#ice-close")) closePopup();
    else if (e.target.closest && e.target.closest("#ice-skip")) showButton();
    else if (e.target.closest && e.target.closest("#ice-broker")) {
      e.preventDefault();
      closePopup();
      setTimeout(function () {
        var s = document.getElementById("brokers");
        if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
    else if (e.target.id === "ice-video" && $("ice-cta").hidden) {
      var v = $("ice-video"); v.paused ? v.play() : v.pause();
    }
  }, true);

  document.addEventListener("keydown", function (e) {
    var popup = $("ice-popup");
    if (e.key === "Escape" && popup && popup.classList.contains("open")) closePopup();
  });

  function wireVideo() {
    var video = $("ice-video");
    if (!video || video.dataset.wired) return;
    video.dataset.wired = "1";
    video.addEventListener("timeupdate", function () {
      if (video.currentTime >= SKIP_AFTER && $("ice-cta").hidden) $("ice-skip").hidden = false;
    });
    video.addEventListener("ended", showButton);
    video.addEventListener("error", function () {
      console.error("ice popup: video failed to load. Check the path:", VIDEO_URL);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireVideo);
  else wireVideo();
})();
})();
