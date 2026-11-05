(() => {
const S = window.SITE || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
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

/* ---------- videos ---------- */
function ytId(u){ const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m && m[1]; }
function vimeoId(u){ const m = u.match(/vimeo\.com\/(\d+)/); return m && m[1]; }
function embedOf(u){
  const y = ytId(u); if (y) return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${y}?autoplay=1&rel=0`, thumb: `https://img.youtube.com/vi/${y}/hqdefault.jpg` };
  const v = vimeoId(u); if (v) return { type: "iframe", src: `https://player.vimeo.com/video/${v}?autoplay=1` };
  const tt = u.match(/tiktok\.com\/.*\/video\/(\d+)/); if (tt) return { type: "iframe", src: `https://www.tiktok.com/embed/v2/${tt[1]}`, vertical: true, platform: "tiktok" };
  const ig = u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/); if (ig) return { type: "iframe", src: `https://www.instagram.com/${ig[1] === "reels" ? "reel" : ig[1]}/${ig[2]}/embed`, vertical: true, platform: "instagram" };
  if (/facebook\.com|fb\.watch/i.test(u)) return { type: "iframe", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false&autoplay=true`, vertical: /\/reel\//.test(u), platform: "facebook" };
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
    c.innerHTML = `<div class="thumb">${th ? `<img loading="lazy" src="${esc(safeUrl(th))}" alt="">` : (e.type === "video" ? `<video preload="metadata" muted src="${esc(safeUrl(e.src))}#t=0.5"></video>` : (e.platform ? `<img class="pi" src="https://cdn.simpleicons.org/${e.platform}/white" alt="" onerror="this.remove()">` : ""))}
      ${v.category ? `<span class="tag">${esc(v.category)}</span>` : ""}<div class="play">▶</div></div>
      <h3>${esc(v.title)}</h3><p>${esc(v.desc)}</p>`;
    c.onclick = () => openVideo(v, e); vGrid.appendChild(c);
  });
  hookFx(vGrid);
}
if (vids.length) {
  const cats = ["All", ...new Set(vids.map(v => v.category).filter(Boolean))];
  if (cats.length > 2) cats.forEach((c, i) => { const b = document.createElement("button"); b.textContent = c; if (!i) b.className = "on"; b.onclick = () => { vF.querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on"); drawVideos(c); }; vF.appendChild(b); });
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
(S.pdfs || []).forEach((f, i) => {
  /* tap a card = read the PDF inside the website; the arrow button = download it */
  const a = document.createElement("article"); a.className = "pcard glass"; a.tabIndex = 0; a.setAttribute("role", "button"); a.setAttribute("aria-label", "View " + (f.title || "PDF"));
  a.dataset.i = i; a.style.setProperty("--i", i); a.dataset.track = "pdf-" + (f.title || "");
  const meta = [f.pages ? esc(f.pages) + " pages" : "", f.size ? esc(f.size) : ""].filter(Boolean).join(" · ");
  a.innerHTML = `<div class="pthumb"><div class="pico">PDF</div>${f.thumb ? `<img alt="First page of ${esc(f.title)}" loading="lazy">` : ""}</div><div class="pinfo"><h3>${esc(f.title)}</h3><p>${esc(f.desc)}</p>${meta ? `<small class="pmeta">${meta}</small>` : ""}<div class="dl"><span class="pv-pill">Preview</span></div></div><a class="pdl" href="${esc(safeUrl(f.file))}" download aria-label="Download ${esc(f.title)}" title="Download" data-track="pdf-download-${esc(f.title || "")}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Download Free</span></a>`;
  const im = a.querySelector(".pthumb img");
  if (im) { im.onload = () => im.classList.add("ok"); im.onerror = () => im.remove(); im.src = safeUrl(f.thumb); }
  pg.appendChild(a);
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
  a.innerHTML = `<div class="tile glass tilt"><img alt="${esc(b.name)}" style="display:none"><div class="fallback">${esc((b.name || "?").slice(0, 2))}</div></div><span>${esc(b.name)}</span><small>${esc(b.note || "")}</small>`;
  const im = $("img", a), fb = $(".fallback", a);
  loadImg(b.logo, url => { im.src = url; im.style.display = "block"; fb.style.display = "none"; });
  bg.appendChild(a);
});

/* ---------- socials: a neat row of round icons with their names (bottom of the page) ---------- */
const sg = $("#socialGrid");
(S.socials || []).filter(s => s && safeUrl(s.url) !== "#").forEach((s, i) => {
  const key = String(s.platform || "").toLowerCase(), meta = (window.IU_SOCIAL && window.IU_SOCIAL.icons[key]) || {};
  const a = document.createElement("a"); a.className = "sr"; a.href = safeUrl(s.url); a.target = "_blank"; a.rel = "noopener"; a.dataset.track = "social-" + key;
  a.style.setProperty("--i", i); a.style.setProperty("--c", meta.color || "#4de1ff");
  a.title = (s.name || key) + (s.handle ? " — " + s.handle : ""); a.setAttribute("aria-label", "Open " + (s.name || key));
  a.innerHTML = `<span class="sr-ico">${window.IU_SOCIAL ? window.IU_SOCIAL.icon(key) : ""}</span><span class="sr-name">${esc(s.name || key)}</span>`;
  sg.appendChild(a);
});
document.querySelectorAll(".join-card img").forEach(i => i.onerror = () => { i.style.display = "none"; });

/* ---------- effects: glass light + 3D tilt + reveal ---------- */
function hookFx(root = document) {
  root.querySelectorAll(".glass").forEach(el => {
    if (el._fx) return; el._fx = 1;
    el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - b.left) + "px"); el.style.setProperty("--my", (e.clientY - b.top) + "px"); });
  });
  if (fine) root.querySelectorAll(".tilt").forEach(el => {
    if (el._tilt) return; el._tilt = 1;
    el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0) scale(1.02)`; });
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
function size(){ W = cv.width = innerWidth; H = cv.height = innerHeight; pts = Array.from({ length: Math.min(110, W / 12) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, s: Math.random() * .25 + .05, a: Math.random() })); }
size(); addEventListener("resize", size);
if (!matchMedia("(prefers-reduced-motion:reduce)").matches) (function loop(t){
  requestAnimationFrame(loop);
  /* 30 fps is plenty for tiny stars; paused when the tab is hidden or a full-screen animation / window is open */
  const rc = document.documentElement.classList;
  if (document.hidden || rc.contains("iu-intro-on") || rc.contains("iu-pdfopen") || t - (loop.last || 0) < 30) return; loop.last = t;
  cx.clearRect(0, 0, W, H);
  for (const q of pts) { q.y -= q.s * 2; if (q.y < -5) { q.y = H + 5; q.x = Math.random() * W; } cx.globalAlpha = .35 + .5 * Math.abs(Math.sin(t / 1400 + q.a * 6)); cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(q.x, q.y, q.r, 0, 6.3); cx.fill(); }
})(0);

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

/* ---------- PDF Guides window: 3D logo animation -> PDF list -> read the PDF inside the website ---------- */
(function () {
  var $id = function (id) { return document.getElementById(id); };
  var modal = $id("pdf-modal"), animBox = $id("pdf-anim"), stageEl = $id("pdfAnimStage"), list = $id("pdf-list"), view = $id("pdf-view");
  if (!modal || !animBox || !list || !view) return;
  var pvBody = $id("pv-body"), pvTitle = $id("pv-title"), pvDl = $id("pv-dl"), pvStatus = $id("pv-status");
  var ANIM_MS = 4500, scene = null, timer = 0, lastFocus = null;
  var token = 0, curDoc = null, libP = null, io = null, queue = [], busy = false;

  function setState(s) {
    modal.classList.remove("is-anim", "is-list", "is-view"); modal.classList.add("is-" + s);
    animBox.hidden = s !== "anim"; list.hidden = s !== "list"; view.hidden = s !== "view";
  }
  function stopScene() { if (scene) { scene.stop(); scene = null; } }

  /* ----- the PDF reader (pdf.js is only downloaded the first time someone opens a PDF) ----- */
  function lib() {
    if (libP) return libP;
    libP = new Function("u", "return import(u)")(new URL("pdfjs.min.js", document.baseURI).href).then(function (m) {
      m.GlobalWorkerOptions.workerSrc = new URL("pdfjs.worker.min.js", document.baseURI).href; return m;
    });
    libP.catch(function () { libP = null; });
    return libP;
  }
  function resetViewer() {
    token++; queue = []; busy = false;
    if (io) { io.disconnect(); io = null; }
    if (curDoc) { try { curDoc.destroy(); } catch (e) {} curDoc = null; }
    pvBody.innerHTML = ""; pvBody.onscroll = null;
  }
  function fallback(url, title) {
    resetViewer(); pvStatus.hidden = true;
    var box = document.createElement("div"); box.className = "pv-fallback";
    var fr = document.createElement("iframe"); fr.src = url; fr.title = title || "PDF"; box.appendChild(fr);
    var p = document.createElement("p"); p.innerHTML = 'If the PDF does not show here, <a target="_blank" rel="noopener"></a> or download it with the button above.';
    p.querySelector("a").href = url; p.querySelector("a").textContent = "open it in a new tab"; box.appendChild(p);
    pvBody.appendChild(box);
  }
  function pump() {
    if (busy) return; var el = queue.shift(); if (!el) return; busy = true;
    var my = token, doc = curDoc;
    doc.getPage(+el.dataset.p).then(function (page) {
      if (my !== token) return;
      var base = page.getViewport({ scale: 1 }), cssW = Math.min(el.clientWidth || pvBody.clientWidth - 20, 860), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var vp = page.getViewport({ scale: cssW / base.width * dpr }), c = document.createElement("canvas");
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(function () {
        if (my !== token) return;
        el.innerHTML = ""; el.style.aspectRatio = c.width + " / " + c.height; el.appendChild(c); el.classList.remove("wait"); el._done = 1;
      });
    }).catch(function () {}).then(function () { busy = false; pump(); });
  }
  function enqueue(el) { if (el._q || el._done) return; el._q = 1; queue.push(el); pump(); }
  function updatePage(n) {
    var top = pvBody.scrollTop + pvBody.clientHeight * 0.35, cur = 1, ch = pvBody.children;
    for (var i = 0; i < ch.length; i++) { if (ch[i].offsetTop <= top) cur = i + 1; else break; }
    pvStatus.textContent = "Page " + cur + " / " + n;
  }
  function openViewer(i) {
    var f = (window.SITE && window.SITE.pdfs || [])[i]; if (!f) return;
    var url = f.file; if (!url || /^\s*(javascript|vbscript|data):/i.test(url)) return;
    stopScene(); clearTimeout(timer); resetViewer(); setState("view");
    pvTitle.textContent = f.title || "PDF"; pvDl.href = url; pvDl.setAttribute("download", String(url).split("/").pop() || "document.pdf");
    pvStatus.hidden = false; pvStatus.textContent = "Loading PDF…";
    var my = token;
    lib().then(function (L) { return L.getDocument({ url: url, isEvalSupported: false }).promise; }).then(function (doc) {
      if (my !== token) { doc.destroy(); return; }
      curDoc = doc; var n = doc.numPages;
      return doc.getPage(1).then(function (p1) {
        if (my !== token) return;
        var v = p1.getViewport({ scale: 1 }), ratio = v.width + " / " + v.height;
        for (var p = 1; p <= n; p++) { var d = document.createElement("div"); d.className = "pv-page wait"; d.dataset.p = p; d.style.aspectRatio = ratio; pvBody.appendChild(d); }
        pvStatus.textContent = "Page 1 / " + n;
        if ("IntersectionObserver" in window) {
          io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) enqueue(e.target); }); }, { root: pvBody, rootMargin: "900px 0px" });
          Array.prototype.forEach.call(pvBody.children, function (c) { io.observe(c); });
        } else Array.prototype.forEach.call(pvBody.children, enqueue);
        var tick = 0; pvBody.onscroll = function () { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; updatePage(n); }); };
      });
    }).catch(function (err) { if (my === token) { console.warn("PDF viewer fallback:", err); fallback(url, f.title); } });
  }

  /* ----- the window ----- */
  function showAnim() {
    resetViewer(); setState("anim"); stopScene();
    if (window.IUScene) scene = window.IUScene.mount(stageEl, { duration: ANIM_MS / 1000 });
    clearTimeout(timer); timer = setTimeout(showList, ANIM_MS);
  }
  function showList() {
    clearTimeout(timer); if (!modal.classList.contains("open")) return;
    stopScene(); resetViewer(); setState("list"); list.scrollTop = 0;
  }
  function openModal() {
    if (modal.classList.contains("open")) return;
    lastFocus = document.activeElement;
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; document.documentElement.classList.add("iu-pdfopen");
    showAnim(); $id("pdf-close").focus();
  }
  function closeModal() {
    clearTimeout(timer); stopScene(); resetViewer();
    modal.classList.remove("open", "is-anim", "is-list", "is-view"); modal.setAttribute("aria-hidden", "true");
    animBox.hidden = list.hidden = view.hidden = true; document.body.style.overflow = ""; document.documentElement.classList.remove("iu-pdfopen");
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest("#pdf-close")) { closeModal(); return; }
    if (t === modal) { closeModal(); return; }
    if (t.closest("#pdf-skip")) { showList(); return; }
    if (t.closest("#pv-back")) { showList(); return; }
    if (t.closest("#pdf-card") || t.closest("#navPdfs")) { e.preventDefault(); openModal(); return; }
    var card = t.closest(".pcard");
    if (card && !t.closest(".pdl") && modal.contains(card)) { e.preventDefault(); openViewer(+card.dataset.i); }
  });
  document.addEventListener("keydown", function (e) {
    var a = document.activeElement;
    if (e.key === "Escape" && modal.classList.contains("open")) { if (modal.classList.contains("is-view")) showList(); else closeModal(); return; }
    if ((e.key === "Enter" || e.key === " ") && a) {
      if (a.id === "pdf-card") { e.preventDefault(); openModal(); }
      else if (a.classList && a.classList.contains("pcard") && modal.contains(a)) { e.preventDefault(); openViewer(+a.dataset.i); }
    }
  });
  if (/^#(pdfs|downloads)$/.test(location.hash)) setTimeout(openModal, 600);
})();

/* ---------- "Scroll down to know more" hint: hides while the visitor is scrolling, comes back 1.6 s after they stop; never shown at the very bottom ---------- */
(function () {
  var hint = document.getElementById("scrollHint"), timer = 0, BACK_AFTER = 1600;   // milliseconds
  if (!hint) return;
  function atBottom() {
    var doc = document.documentElement, y = window.pageYOffset || doc.scrollTop;
    return y + window.innerHeight >= Math.max(doc.scrollHeight, document.body.scrollHeight) - 40;
  }
  function settle() { hint.classList.toggle("gone", atBottom()); }          // after scrolling stops
  function onScroll() {
    hint.classList.add("gone");                                              // moving -> hide
    clearTimeout(timer); timer = setTimeout(settle, BACK_AFTER);             // stopped -> show again after 1.6 s
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchmove", onScroll, { passive: true });   // fingers moving = hide straight away
  window.addEventListener("wheel", onScroll, { passive: true });
  window.addEventListener("resize", settle);
  window.addEventListener("load", settle);
  hint.addEventListener("click", function (e) {              // tap = scroll down one screen
    e.preventDefault();
    window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: "smooth" });
  });
  settle();
})();
})();
