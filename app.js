(() => {
const S = window.SITE || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const safeUrl = u => (!u || /^\s*(javascript|vbscript|data):/i.test(u)) ? "#" : u;
/* Image finder: if a picture is not at the exact path written in config.js,
   look for the same file name in the usual folders (forgives upload mistakes). */
const FOLDERS = ["", "assets/images/", "assets/brokers/", "assets/avatars/", "assets/", "images/", "img/"];
function candidates(p) {
  if (!p) return [];
  if (/^(https?:)?\/\//i.test(p)) return [p];
  const clean = String(p).replace(/\\/g, "/").replace(/^\.?\//, ""), base = clean.split("/").pop(), out = [clean];
  for (const f of FOLDERS) { const c = f + base; if (!out.includes(c)) out.push(c); }
  return out;
}
const enc = u => /%[0-9a-f]{2}/i.test(u) ? u : encodeURI(u);
function loadImg(p, ok, fail) {
  const c = candidates(p);
  (function next(i) {
    if (i >= c.length) return fail && fail();
    const im = new Image(); im.onload = () => ok(enc(c[i])); im.onerror = () => next(i + 1); im.src = enc(c[i]);
  })(0);
}

const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
/* ---------- theme ---------- */
const r = document.documentElement.style, T = S.theme || {};
if (T.accent1) r.setProperty("--a1", T.accent1);
if (T.accent2) r.setProperty("--a2", T.accent2);
if (T.accent3) r.setProperty("--a3", T.accent3);
if (T.wallpaper) {
  const w = $("#wallpaper"), first = (innerWidth < 700 && T.wallpaperMobile) ? T.wallpaperMobile : T.wallpaper;
  const apply = url => { w.classList.add("img"); w.style.backgroundImage = `url("${url}")`; };
  loadImg(first, apply, () => loadImg(T.wallpaper, apply, () => loadImg(T.wallpaperMobile, apply, () => console.warn("Wallpaper not found:", first))));
}

/* ---------- analytics (GoatCounter + Google Analytics 4) ---------- */
const A = S.analytics || {};
if (A.goatcounter) {
  const s = document.createElement("script"); s.async = true;
  s.dataset.goatcounter = `https://${A.goatcounter}.goatcounter.com/count`;
  s.src = "https://gc.zgo.at/count.js"; document.head.appendChild(s);
}
if (A.ga4) {
  const s = document.createElement("script"); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${A.ga4}`; document.head.appendChild(s);
  window.dataLayer = window.dataLayer || []; window.gtag = function(){ dataLayer.push(arguments); };
  gtag("js", new Date()); gtag("config", A.ga4);
}
function track(name) {
  try {
    if (window.gtag && A.ga4) gtag("event", "click", { event_label: name });
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "event/" + name, title: name, event: true });
  } catch (e) {}
}
document.addEventListener("click", e => { const t = e.target.closest("[data-track]"); if (t) track(t.dataset.track); });

/* ---------- text ---------- */
$("#brandName").textContent = S.brand || "Ice Update";
$("#heroBadge").textContent = S.hero?.badge || "";
$("#heroTitle").textContent = S.hero?.title || "";
$("#heroSub").textContent = S.hero?.subtitle || "";
$("#fBrand").textContent = S.brand || "";
$("#fNote").textContent = S.footerNote || "";
$("#yr").textContent = new Date().getFullYear();
for (const id of ["ctaWa","joinWa"]) $("#"+id).href = safeUrl(S.links?.whatsapp);
for (const id of ["ctaTg","joinTg"]) $("#"+id).href = safeUrl(S.links?.telegram);
$("#stVideos").textContent = (S.videos || []).length;
$("#stPdfs").textContent = (S.pdfs || []).length;
$("#stBrokers").textContent = (S.brokers || []).length;

/* ---------- hero demo chart ---------- */
const mc = $("#miniChart"); let p = 50;
for (let i = 0; i < 16; i++) {
  const n = (i * 37 % 11 - 4) * 3 + 6, up = n >= 0; p = Math.max(22, Math.min(88, p + n));
  const el = document.createElement("i"); el.style.height = (p) + "%"; el.style.animationDelay = i * .06 + "s";
  el.style.background = up ? "linear-gradient(#3ee6b0,#0a9a78)" : "linear-gradient(#ff6a7d,#d12a47)"; mc.appendChild(el);
}

/* ---------- videos ---------- */
function ytId(u){ const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m && m[1]; }
function vimeoId(u){ const m = u.match(/vimeo\.com\/(\d+)/); return m && m[1]; }
function embedOf(u){
  const y = ytId(u); if (y) return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${y}?autoplay=1&rel=0`, thumb: `https://img.youtube.com/vi/${y}/hqdefault.jpg` };
  const v = vimeoId(u); if (v) return { type: "iframe", src: `https://player.vimeo.com/video/${v}?autoplay=1` };
  const tt = u.match(/tiktok\.com\/.*\/video\/(\d+)/); if (tt) return { type: "iframe", src: `https://www.tiktok.com/embed/v2/${tt[1]}`, vertical: true, platform: "tiktok" };
  const ig = u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/); if (ig) return { type: "iframe", src: `https://www.instagram.com/${ig[1] === "reels" ? "reel" : ig[1]}/${ig[2]}/embed`, vertical: /reel|tv/.test(ig[1]) };
  if (/facebook\.com|fb\.watch/i.test(u)) return { type: "iframe", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false&autoplay=true`, vertical: /\/reel|\/videos\//i.test(u) };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { type: "video", src: u };
  return { type: "link", src: u };
}
const vids = S.videos || [], vGrid = $("#videoGrid"), vF = $("#vidFilters");
function drawVideos(cat = "All") {
  vGrid.innerHTML = "";
  const list = vids.filter(v => cat === "All" || v.category === cat);
  if (!list.length) { vGrid.innerHTML = `<div class="glass empty">🎬 Lessons are coming soon. Join the channels to be first to know.</div>`; return; }
  list.forEach(v => {
    const e = embedOf(v.url || ""), th = v.thumb || e.thumb;
    const c = document.createElement("article"); c.className = "vcard glass tilt reveal";
    c.innerHTML = `<div class="thumb">${th ? `<img loading="lazy" src="${esc(safeUrl(th))}" alt="">` : (e.type === "video" ? `<video preload="metadata" muted src="${esc(safeUrl(e.src))}#t=0.5"></video>` : `<div class="play">▶</div>`) }${v.category ? `<span class="tag">${esc(v.category)}</span>` : ""}<div class="play">▶</div></div><h3>${esc(v.title)}</h3><p>${esc(v.desc)}</p>`;
    c.onclick = () => openVideo(v, e); vGrid.appendChild(c);
  });
  hookFx(vGrid);
}
if (vids.length) {
  const cats = ["All", ...new Set(vids.map(v => v.category).filter(Boolean))];
  if (cats.length > 2) cats.forEach((c, i) => { const b = document.createElement("button"); b.textContent = c; if (!i) b.className = "on"; b.onclick = () => { vF.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); drawVideos(c); }; vF.appendChild(b); });
}
drawVideos();
const modal = $("#modal");
function openVideo(v, e) {
  track("video-" + (v.title || "")); 
  if (e.type === "link") { window.open(safeUrl(e.src), "_blank", "noopener"); return; }
  $("#modalBody").innerHTML = e.type === "iframe"
    ? `<iframe src="${esc(e.src)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
    : `<video src="${esc(safeUrl(e.src))}" controls autoplay playsinline></video>`;
  $("#modalBody").classList.toggle("tall", !!e.vertical);
  $("#modalTitle").textContent = v.title || ""; $("#modalDesc").textContent = v.desc || ""; modal.hidden = false; document.body.style.overflow = "hidden";
}
function closeModal(){ modal.hidden = true; $("#modalBody").innerHTML = ""; document.body.style.overflow = ""; }
$("#modalX").onclick = closeModal; modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

/* ---------- pdfs ---------- */
const pg = $("#pdfGrid");
if (!(S.pdfs || []).length) pg.innerHTML = `<div class="glass empty">📄 PDF guides are coming soon.</div>`;
(S.pdfs || []).forEach(f => {
  const a = document.createElement("a"); a.className = "pcard glass tilt reveal"; a.href = safeUrl(f.file); a.setAttribute("download", ""); a.target = "_blank"; a.rel = "noopener"; a.dataset.track = "pdf-" + (f.title || "");
  a.innerHTML = `<div class="pico">PDF</div><div><h3>${esc(f.title)}</h3><p>${esc(f.desc)}</p><div class="dl">⬇ Download ${f.size ? "· " + esc(f.size) : ""}</div></div>`; pg.appendChild(a);
});

/* ---------- gallery ---------- */
const gg = $("#galGrid"), lb = $("#lightbox");
if (!(S.gallery || []).length) gg.innerHTML = `<div class="glass empty" style="column-span:all">🖼️ Chart pictures are coming soon.</div>`;
(S.gallery || []).forEach(g => {
  const d = document.createElement("figure"); d.className = "gitem glass tilt reveal";
  d.innerHTML = `<img loading="lazy" src="${esc(safeUrl(g.src))}" alt="${esc(g.caption)}">${g.caption ? `<p>${esc(g.caption)}</p>` : ""}`;
  d.onclick = () => { $("img", lb).src = safeUrl(g.src); $("p", lb).textContent = g.caption || ""; lb.hidden = false; track("gallery-" + (g.caption || "")); }; gg.appendChild(d);
});
lb.onclick = () => lb.hidden = true;

/* ---------- brokers ---------- */
const bg = $("#brokerGrid");
(S.brokers || []).forEach((b, i) => {
  const a = document.createElement("a"); a.className = "broker reveal"; a.href = safeUrl(b.url); a.target = "_blank"; a.rel = "noopener sponsored"; a.style.setProperty("--d", (i * -1.1) + "s"); a.dataset.track = "broker-" + (b.name || "");
  a.innerHTML = `<div class="tile glass tilt"><img alt="${esc(b.name)}" style="display:none"><div class="fallback">${esc((b.name || "?").slice(0, 2))}</div></div><span>${esc(b.name)}</span><small>${esc(b.region || "")}</small>`;
  const im = $("img", a), fb = $(".fallback", a);
  loadImg(b.logo, url => { im.src = url; im.style.display = "block"; fb.style.display = "none"; });
  bg.appendChild(a);
});

/* ---------- socials ---------- */
const sg = $("#socialGrid");
(S.socials || []).forEach(s => {
  const a = document.createElement("a"); a.className = "scard glass tilt reveal"; a.href = safeUrl(s.url); a.target = "_blank"; a.rel = "noopener"; a.dataset.track = "social-" + s.platform;
  a.innerHTML = `<div class="av"><div>${s.avatar ? `<img class="pic" src="${esc(safeUrl(s.avatar))}" alt="">` : `<img class="ph" src="https://cdn.simpleicons.org/${esc(s.platform)}/white" alt="">`}</div></div><div><h3>${esc(s.name)}</h3><p>${esc(s.handle)}${s.followers ? " · " + esc(s.followers) : ""}</p></div><span class="follow">Follow</span>`;
  const pic = a.querySelector("img.pic"); if (pic) { const orig = s.avatar; pic.removeAttribute("src"); loadImg(orig, u => pic.src = u, () => { pic.style.display = "none"; }); }
  const ph = a.querySelector("img.ph");
  if (ph) ph.onerror = () => { ph.replaceWith(Object.assign(document.createElement("b"), { textContent: (s.name || "?").slice(0, 1), style: "font:800 1.5rem Sora" })); };
  sg.appendChild(a);
});
document.querySelectorAll(".join-card img").forEach(i => i.onerror = () => { i.style.display = "none"; });

/* ---------- effects: glass light + 3D tilt + reveal ---------- */
function hookFx(root = document) {
  root.querySelectorAll(".glass").forEach(el => {
    if (el._fx) return; el._fx = 1;
    el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - b.left) + "px"); el.style.setProperty("--my", (e.clientY - b.top) + "px"); });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--mx", "30%"); el.style.setProperty("--my", "0%"); });
  });
  if (fine) root.querySelectorAll(".tilt").forEach(el => {
    if (el._tilt) return; el._tilt = 1;
    el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; el.style.transform = `perspective(1000px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) translateY(-2px)`; });
    el.addEventListener("pointerleave", () => el.style.transform = "");
  });
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: .08 });
  root.querySelectorAll(".reveal:not(.in)").forEach(el => io.observe(el));
}
document.querySelectorAll("h2,.join-card,.hero-text").forEach(el => el.classList.add("reveal"));
hookFx();
addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); lb.hidden = true; } });

/* ---------- starfield ---------- */
const cv = $("#stars"), cx = cv.getContext("2d"); let W, H, pts = [];
function size(){ W = cv.width = innerWidth; H = cv.height = innerHeight; pts = Array.from({ length: Math.min(110, W / 12) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + 1, a: Math.random() * Math.PI * 2, s: (Math.random() * 1.2 + .4) })); }
size(); addEventListener("resize", size);
if (!matchMedia("(prefers-reduced-motion:reduce)").matches) (function loop(t){
  cx.clearRect(0, 0, W, H);
  for (const q of pts) { q.y -= q.s; if (q.y < -5) { q.y = H + 5; q.x = Math.random() * W; } cx.globalAlpha = .35 + .5 * Math.abs(Math.sin(t / 1400 + q.a * 6)); cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(q.x, q.y, q.r, 0, Math.PI * 2); cx.fill(); }
  requestAnimationFrame(loop);
})(0);
})();

/* ---------- Forex Signals video popup ---------- */
(function () {
  var VIDEO_URL = "ICE_UPDATES_ad_v2.mp4";   // video in the repository root
  var SKIP_AFTER = 5;                        // seconds before "Skip" appears
  var $id = function (id) { return document.getElementById(id); };

  function openPopup() {
    var popup = $id("ice-popup"), video = $id("ice-video");
    if (!popup || !video) { console.error("ice popup: #ice-popup or #ice-video not found"); return; }
    $id("ice-cta").hidden = true;
    $id("ice-skip").hidden = true;
    if (!video.getAttribute("src")) video.src = VIDEO_URL;
    video.currentTime = 0;
    popup.classList.add("open");
    popup.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var pr = video.play(); if (pr && pr.catch) pr.catch(function (err) { console.warn("ice popup: play blocked", err); });
  }

  function closePopup() {
    var popup = $id("ice-popup"), video = $id("ice-video");
    if (!popup || !video) return;
    video.pause();
    video.currentTime = 0;
    popup.classList.remove("open");
    popup.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showButton() {
    $id("ice-video").pause();
    $id("ice-skip").hidden = true;
    $id("ice-cta").hidden = false;
  }

  /* "Register for a Broker" -> close the popup and scroll to the broker list on this page */
  function goToBrokers() {
    closePopup();
    setTimeout(function () {
      var s = $id("brokers");
      if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest("#ice-broker")) { e.preventDefault(); goToBrokers(); return; }
    if (t.closest("#ice-close")) { closePopup(); return; }
    if (t.closest("#ice-skip")) { showButton(); return; }
    if (t.closest("#forex-card")) { e.preventDefault(); openPopup(); return; }
    if (t.id === "ice-video" && $id("ice-cta").hidden) {
      var v = $id("ice-video"); if (v.paused) v.play(); else v.pause();
    }
  });

  document.addEventListener("keydown", function (e) {
    var popup = $id("ice-popup");
    if (e.key === "Escape" && popup && popup.classList.contains("open")) { closePopup(); return; }
    if ((e.key === "Enter" || e.key === " ") && document.activeElement && document.activeElement.id === "forex-card") {
      e.preventDefault(); openPopup();
    }
  });

  var video = $id("ice-video");
  if (video) {
    video.addEventListener("timeupdate", function () {
      if (video.currentTime >= SKIP_AFTER && $id("ice-cta").hidden) $id("ice-skip").hidden = false;
    });
    video.addEventListener("ended", showButton);
    video.addEventListener("error", function () {
      console.error("ice popup: video failed to load. Check the path:", VIDEO_URL);
    });
  }
})();

