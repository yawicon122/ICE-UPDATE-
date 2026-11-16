/* Red "simulated" pill in the hero card's top-right: open 2s, red dot 10s, repeat */
(function () {
  var top = document.querySelector('#heroVideo .hv-top');
  if (!top) return;
  var css = document.createElement('style');
  css.textContent =
    '.msim{margin-left:auto;display:inline-flex;align-items:center;height:16px;min-width:16px;max-width:16px;padding:0;border-radius:999px;overflow:hidden;white-space:nowrap;' +
    'background:linear-gradient(180deg,#ff5a6e,#d9122f);box-shadow:0 0 0 1px rgba(255,255,255,.25) inset,0 0 10px rgba(255,60,80,.7);' +
    'font:700 9px/16px Inter,system-ui,sans-serif;letter-spacing:.05em;color:#fff;pointer-events:none;' +
    'transition:max-width .45s cubic-bezier(.3,1.4,.5,1),padding .45s ease}' +
    '.msim span{opacity:0;transition:opacity .2s ease}' +
    '.msim.open{max-width:90px;padding:0 9px}' +
    '.msim.open span{opacity:1;transition-delay:.15s}' +
    '.msim:not(.open){animation:msimPulse 1.6s ease-in-out infinite}' +
    '@keyframes msimPulse{50%{box-shadow:0 0 0 1px rgba(255,255,255,.25) inset,0 0 16px rgba(255,60,80,1)}}';
  document.head.appendChild(css);
  var b = document.createElement('div');
  b.className = 'msim';
  b.setAttribute('aria-label', 'simulated');
  b.innerHTML = '<span>simulated</span>';
  top.appendChild(b);
  function cycle() {
    b.classList.add('open');
    setTimeout(function () {
      b.classList.remove('open');
      setTimeout(cycle, 10000);
    }, 2000);
  }
  setTimeout(cycle, 800);
})();
