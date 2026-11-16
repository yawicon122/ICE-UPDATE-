/* Tiny simulated chart in the top-right corner of the hero card */
(function () {
  var top = document.querySelector('#heroVideo .hv-top');
  if (!top) return;
  var css = document.createElement('style');
  css.textContent =
    '.msim{margin-left:auto;width:96px;padding:4px 6px 3px;border-radius:9px;background:rgba(6,10,24,.72);border:1px solid rgba(160,225,255,.35);box-shadow:0 2px 10px rgba(0,0,0,.45);font:700 8px/1.1 Inter,system-ui,sans-serif;color:#cfe6ff;pointer-events:none}' +
    '.msim-h{display:flex;justify-content:space-between;align-items:center;gap:4px}' +
    '.msim-t{opacity:.7;letter-spacing:.06em}' +
    '.msim-p{color:#4ade80}.msim-p.dn{color:#f87171}' +
    '.msim canvas{display:block;width:100%;height:28px;margin-top:2px}' +
    '@media(max-width:520px){.msim{width:78px}.msim canvas{height:22px}}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.className = 'msim';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<div class="msim-h"><span class="msim-t">SIM</span><span class="msim-p">+0.0%</span></div><canvas width="192" height="56"></canvas>';
  top.appendChild(box);

  var cv = box.querySelector('canvas'), x = cv.getContext('2d'), pEl = box.querySelector('.msim-p');
  var price = 100, start = 100, N = 22, k = [];
  function r(a, b) { return a + Math.random() * (b - a); }
  function add() {
    var o = price; price = Math.max(80, price + r(-1.1, 1.2));
    k.push({ o: o, c: price, h: Math.max(o, price) + r(0, .5), l: Math.min(o, price) - r(0, .5) });
    if (k.length > N) k.shift();
  }
  for (var i = 0; i < N; i++) add();
  function draw() {
    var W = cv.width, H = cv.height, mn = Infinity, mx = -Infinity;
    k.forEach(function (c) { mn = Math.min(mn, c.l); mx = Math.max(mx, c.h); });
    var sy = function (v) { return H - 3 - (v - mn) / ((mx - mn) || 1) * (H - 6); }, w = W / N;
    x.clearRect(0, 0, W, H);
    k.forEach(function (c, i) {
      var col = c.c >= c.o ? '#4ade80' : '#f87171', cx = i * w + w / 2;
      x.strokeStyle = x.fillStyle = col; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(cx, sy(c.h)); x.lineTo(cx, sy(c.l)); x.stroke();
      var t = sy(Math.max(c.o, c.c)), b = sy(Math.min(c.o, c.c));
      x.fillRect(cx - w * .3, t, w * .6, Math.max(1.5, b - t));
    });
    var pct = (price - start) / start * 100;
    pEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    pEl.classList.toggle('dn', pct < 0);
  }
  draw();
  var vis = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(box);
  setInterval(function () { if (vis && !document.hidden) { add(); draw(); } }, 1000);
})();
