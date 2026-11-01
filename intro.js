/* ICE UPDATE — cinematic intro (self-contained). Plays when the site opens.
   Replay any time by adding  ?intro  to the web address.
   Change the words in config.js → intro: { line1, line2, welcome, brand, enabled, once } */
(() => {
const D = Object.assign({ enabled: true, once: true,
  line1: "Welcome to the top 1%", line2: "You are on the right path to becoming rich",
  welcome: "Welcome to", brand: "ICE UPDATE" }, (window.SITE && window.SITE.intro) || {});
const force = /[?&]intro\b/.test(location.search);
try { if (!force && D.once && sessionStorage.getItem("iu_intro_done")) return; } catch (e) {}
if (!D.enabled && !force) return;
if (matchMedia("(prefers-reduced-motion: reduce)").matches && !force) return;

const css = document.createElement("style");
css.textContent = `
#iu-intro{position:fixed;inset:0;z-index:99999;overflow:hidden;font-family:Sora,Inter,system-ui,sans-serif;color:#fff;touch-action:none}
#iu-intro .bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,#0b1a45 0%,#04081c 55%,#010208 100%)}
#iu-intro canvas{position:absolute;inset:0;width:100%;height:100%}
#iu-intro .frost{position:absolute;inset:0;opacity:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 42%,rgba(140,210,255,.22) 75%,rgba(225,247,255,.6) 100%)}
#iu-intro .stage{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:0 5vw}
#iu-intro .t{position:absolute;opacity:0;will-change:transform,opacity,filter;width:90vw;max-width:1100px}
#iu-intro .l1{text-wrap:balance;font-weight:800;text-transform:uppercase;font-size:clamp(1.7rem,6.4vw,4.6rem);line-height:1.1;text-shadow:0 0 30px rgba(255,205,110,.35),0 0 70px rgba(120,190,255,.3)}
#iu-intro .gold{background:linear-gradient(120deg,#fff3c4,#ffc94d 45%,#ff9f1c);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(255,190,70,.55))}
#iu-intro .l2{font-weight:600;font-size:clamp(1.05rem,3.3vw,2.1rem);line-height:1.5;color:#dbe9ff;text-shadow:0 0 24px rgba(100,180,255,.5)}
#iu-intro .l2>span{display:inline-block;opacity:0;margin:0 .18em;will-change:transform,opacity,filter}
#iu-intro .welcome{font-weight:600;letter-spacing:.5em;text-transform:uppercase;font-size:clamp(.85rem,2.6vw,1.5rem);color:#bfe8ff;text-shadow:0 0 20px rgba(80,190,255,.8)}
#iu-intro .brand{font-weight:800;letter-spacing:.02em;white-space:nowrap;font-size:clamp(2.6rem,12.5vw,9.5rem);line-height:1;
  background:linear-gradient(100deg,#ffffff 0%,#bff0ff 22%,#5fc6ff 45%,#ffffff 52%,#7fd3ff 70%,#3d8bff 100%);background-size:220% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px rgba(70,190,255,.85)) drop-shadow(0 0 60px rgba(70,150,255,.55))}
#iu-intro .skip{position:absolute;right:16px;top:14px;z-index:3;font:600 .82rem Inter,system-ui,sans-serif;color:#fff;padding:9px 16px;border-radius:999px;cursor:pointer;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transition:opacity .6s}
#iu-intro .skip.on{opacity:.9}
`;
document.head.appendChild(css);

const el = document.createElement("div"); el.id = "iu-intro";
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
const l1 = esc(D.line1).replace(/(top\s*1%)/i, '<span class="gold">$1</span>');
const l2 = esc(D.line2).split(/\s+/).map(w => /^(rich)$/i.test(w) ? `<span class="gold">${w}</span>` : `<span>${w}</span>`).join(" ");
el.innerHTML = `<div class="bg"></div><canvas></canvas><div class="frost"></div>
<div class="stage"><div class="t l1">${l1}</div><div class="t l2">${l2}</div><div class="t welcome">${esc(D.welcome)}</div><div class="t brand">${esc(D.brand)}</div></div>
<div class="skip">Skip ›</div>`;
// make word spans in l2 animate individually (gold one too)
document.body.prepend(el);
const $ = s => el.querySelector(s), bg = $(".bg"), cv = $("canvas"), ctx = cv.getContext("2d"), frost = $(".frost"), stage = $(".stage");
const tL1 = $(".l1"), tL2 = $(".l2"), tW = $(".welcome"), tB = $(".brand"), skip = $(".skip");
const words = [...tL2.children];
words.forEach(w => { if (w.classList.contains("gold")) { const s = document.createElement("span"); s.innerHTML = w.outerHTML; s.className = ""; w.replaceWith(s); } });
const wordEls = [...tL2.children];
const root = document.documentElement, prevOv = root.style.overflow; root.style.overflow = "hidden";

let W, H, DPR;
function size() { DPR = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
size(); addEventListener("resize", size);

/* soft snow sprite */
const spr = document.createElement("canvas"); spr.width = spr.height = 64;
{ const g = spr.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.35, "rgba(235,248,255,.8)"); gr.addColorStop(1, "rgba(200,235,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
const N = innerWidth < 700 ? 240 : 520, snow = [];
for (let i = 0; i < N; i++) { const z = Math.random(); snow.push({ x: Math.random() * W, y: Math.random() * H, z, r: 1 + z * z * 7, ph: Math.random() * 6.28, a: .35 + .65 * z }); }
const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .3, p: Math.random() * 6.28 }));

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const back = t => { t = clamp(t); const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a));

/* lightning */
const strikes = [6.7, 6.92, 7.12]; let bolts = [];
function bolt(x0, y0, x1, y1, off, out) { if (off < 3) { out.push([x0, y0, x1, y1]); return; } const mx = (x0 + x1) / 2 + (Math.random() - .5) * off, my = (y0 + y1) / 2 + (Math.random() - .5) * off * .4; bolt(x0, y0, mx, my, off / 2, out); bolt(mx, my, x1, y1, off / 2, out); if (Math.random() < .28 && off > 20) bolt(mx, my, mx + (Math.random() - .5) * 260, my + 90 + Math.random() * 200, off / 2.4, out); }
const made = {};
function makeBolt(i) { const out = []; const x = W * (.3 + Math.random() * .4); bolt(x, -10, x + (Math.random() - .5) * 220, H * (.55 + Math.random() * .2), 190, out); made[i] = out; }
/* orbiting sparks */
const sparks = Array.from({ length: 5 }, (_, i) => ({ a: i * 1.26, trail: [] }));

const TOTAL = 12.2; let t0 = performance.now(), skipAt = null, done = false, raf;
function finish() { if (done) return; done = true; cancelAnimationFrame(raf); el.remove(); css.remove(); root.style.overflow = prevOv; try { sessionStorage.setItem("iu_intro_done", "1"); } catch (e) {} }
skip.onclick = () => { if (skipAt === null) skipAt = performance.now(); };
addEventListener("keydown", e => { if (e.key === "Escape" && skipAt === null) skipAt = performance.now(); });
setTimeout(() => skip.classList.add("on"), 900);

let last = t0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  let t = (now - t0) / 1000;
  let kill = 1;                       // overall fade (skip / ending)
  if (skipAt !== null) { kill = 1 - clamp((now - skipAt) / 700); if (kill <= 0) return finish(); }
  const endFade = 1 - easeIO(seg(t, 10.3, 12.0)); // reveal the website
  bg.style.opacity = Math.min(endFade, kill);
  el.style.pointerEvents = "auto";
  if (t > TOTAL) return finish();

  const cx = W / 2, cy = H / 2;
  const storm = (t < 6.7 ? .12 : .12 + .88 * ease(seg(t, 6.7, 8.2))) * (1 - seg(t, 9.8, 12.0)); // snowstorm strength
  ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = Math.min(1, kill);

  /* stars */
  const sa = (1 - seg(t, 6.6, 7.4)) * .8;
  if (sa > 0) for (const s of stars) { ctx.globalAlpha = sa * (.35 + .5 * Math.abs(Math.sin(t * 1.3 + s.p))) * kill; ctx.fillStyle = "#cfe6ff"; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.3); ctx.fill(); }
  ctx.globalAlpha = kill;

  /* soft glow behind text: gold for the "1%" part, ice-blue for the brand */
  ctx.globalCompositeOperation = "lighter";
  const gold = seg(t, .6, 1.8) * (1 - seg(t, 5.8, 6.6)), ice = seg(t, 7.0, 8.0) * (1 - seg(t, 10.3, 12));
  if (gold > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .5); g.addColorStop(0, `rgba(255,190,90,${.2 * gold})`); g.addColorStop(1, "rgba(255,190,90,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (ice > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .6); g.addColorStop(0, `rgba(80,190,255,${.36 * ice})`); g.addColorStop(.5, `rgba(70,120,255,${.14 * ice})`); g.addColorStop(1, "rgba(70,120,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  /* rotating light rays behind the brand */
  if (ice > 0) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .18); const R = Math.hypot(W, H) * .6; for (let i = 0; i < 20; i++) { ctx.rotate(6.2832 / 20); const g = ctx.createLinearGradient(0, 0, 0, -R); g.addColorStop(0, `rgba(150,220,255,${.2 * ice})`); g.addColorStop(1, "rgba(150,220,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-R * .035, -R); ctx.lineTo(R * .035, -R); ctx.fill(); } ctx.restore(); }

  /* anamorphic lens flare lines */
  const flare = (k, col) => { if (k <= 0) return; const w = W * (.2 + .8 * k), g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, col); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - 1.5, w, 3); ctx.globalAlpha = .35 * kill; ctx.fillRect(cx - w / 2, cy - 7, w, 14); ctx.globalAlpha = kill; };
  flare(Math.sin(Math.PI * seg(t, .1, 2.4)), "rgba(255,225,160,.95)");
  flare(Math.sin(Math.PI * seg(t, 3.9, 5.2)) * .7, "rgba(190,225,255,.9)");
  flare(Math.sin(Math.PI * seg(t, 7.1, 9.2)), "rgba(170,235,255,1)");

  /* orbiting light sparks around the brand */
  if (t > 7.7 && t < 11.3) { const rx = Math.min(W * .4, 540), ry = rx * .24; for (const s of sparks) { s.a += dt * 7; const x = cx + Math.cos(s.a) * rx, y = cy + Math.sin(s.a) * ry; s.trail.push([x, y]); if (s.trail.length > 26) s.trail.shift(); for (let i = 1; i < s.trail.length; i++) { ctx.strokeStyle = `rgba(150,225,255,${(i / s.trail.length) * .8 * endFade})`; ctx.lineWidth = 1 + i / 8; ctx.beginPath(); ctx.moveTo(s.trail[i - 1][0], s.trail[i - 1][1]); ctx.lineTo(s.trail[i][0], s.trail[i][1]); ctx.stroke(); } ctx.globalAlpha = endFade * kill; ctx.drawImage(spr, x - 14, y - 14, 28, 28); ctx.globalAlpha = kill; } }

  /* lightning bolts + flash */
  let flash = 0;
  strikes.forEach((ts, i) => {
    if (t >= ts && t < ts + .35) {
      if (!made[i]) makeBolt(i);
      const k = Math.exp(-(t - ts) * 9); flash = Math.max(flash, k);
      ctx.save(); ctx.globalAlpha = k * kill; ctx.strokeStyle = "rgba(215,240,255,1)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.shadowColor = "rgba(90,190,255,1)"; ctx.shadowBlur = 28;
      ctx.beginPath(); for (const s of made[i]) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); } ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.restore();
    }
  });
  if (flash > 0) { ctx.globalAlpha = flash * .75 * kill; ctx.fillStyle = "rgba(205,235,255,1)"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = kill; }

  /* snow & snowstorm */
  ctx.globalCompositeOperation = "source-over";
  const wind = (.25 + 2.4 * storm) * (1 + .35 * Math.sin(t * 1.9));
  for (const s of snow) {
    const sp = (28 + s.z * 70) * (.7 + storm * 3.2);
    s.y += sp * dt; s.x += (wind * (60 + s.z * 160) + Math.sin(t * 1.2 + s.ph) * 22) * dt;
    if (s.y > H + 10) { s.y = -10; s.x = Math.random() * W; } if (s.x > W + 20) s.x = -20; if (s.x < -30) s.x = W + 10;
    const a = s.a * (.45 + .55 * storm) * kill * (t < 6.7 ? .65 : 1);
    if (storm > .4 && s.z > .45) { ctx.globalAlpha = a * .45; ctx.strokeStyle = "rgba(225,245,255,1)"; ctx.lineWidth = s.r * .35; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - wind * 26 * s.z, s.y - sp * .06); ctx.stroke(); }
    ctx.globalAlpha = a; const d = s.r * 3.2; ctx.drawImage(spr, s.x - d / 2, s.y - d / 2, d, d);
  }
  ctx.globalAlpha = 1;

  /* frost creeping in from the edges */
  frost.style.opacity = (.95 * ease(seg(t, 6.9, 8.6)) * (1 - seg(t, 10.2, 12.0)) * kill).toFixed(3);

  /* ---------- text ---------- */
  const shake = flash > .05 ? flash * 7 : 0; stage.style.transform = shake ? `translate(${(Math.random() - .5) * shake}px,${(Math.random() - .5) * shake}px)` : "";
  const set = (e, o, tr, bl) => { e.style.opacity = (o * kill).toFixed(3); e.style.transform = tr; e.style.filter = bl > .05 ? `blur(${bl.toFixed(1)}px)` : ""; };
  { // line 1
    const i = ease(seg(t, .7, 1.9)), o = 1 - easeIO(seg(t, 3.2, 3.9));
    tL1.style.letterSpacing = (.5 - .38 * i).toFixed(3) + "em";
    set(tL1, i * o, `translateY(${(1 - i) * 14}px) scale(${1 + seg(t, 3.2, 3.9) * .08})`, (1 - i) * 14 + seg(t, 3.2, 3.9) * 10);
  }
  { // line 2, word by word
    const o = 1 - easeIO(seg(t, 6.0, 6.6)); tL2.style.opacity = (o * kill).toFixed(3); tL2.style.transform = `scale(${1 + seg(t, 6.0, 6.6) * .06})`;
    wordEls.forEach((w, k) => { const p = ease(seg(t, 4.0 + k * .16, 4.7 + k * .16)); w.style.opacity = p.toFixed(3); w.style.transform = `translateY(${(1 - p) * 16}px)`; w.style.filter = p < .98 ? `blur(${((1 - p) * 8).toFixed(1)}px)` : ""; });
    tL2.style.visibility = (t >= 3.9 && t <= 6.7) ? "visible" : "hidden"; tL2.style.opacity = tL2.style.visibility === "visible" ? tL2.style.opacity : 0;
  }
  { // welcome to
    const i = ease(seg(t, 7.1, 7.9)), o = 1 - seg(t, 9.6, 11.2);
    tW.style.transform = `translateY(${-clamp(Math.min(W, 1200) * .09, 40, 110) - 0}px)`;
    set(tW, i * o, `translateY(-${Math.round(Math.min(Math.max(W * .085, 46), 120))}px) scale(${.9 + .1 * i})`, (1 - i) * 8);
  }
  { // ICE UPDATE — punches in, then keeps growing and fades slowly
    const pin = back(seg(t, 7.2, 8.5)), grow = easeIO(seg(t, 8.4, 11.8)), o = ease(seg(t, 7.2, 7.8)) * (1 - easeIO(seg(t, 9.8, 11.9)));
    const maxG = clamp((W * .8) / (tB.offsetWidth || 1), 1, 1.5), sc = (.35 + .65 * pin) * (1 + (maxG - 1) * grow);
    tB.style.backgroundPosition = (100 - ((t - 7.2) * 38) % 220) + "% 0";
    set(tB, o, `scale(${sc.toFixed(4)})`, (1 - ease(seg(t, 7.2, 7.9))) * 16 + grow * 6);
  }
  raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);
})();
