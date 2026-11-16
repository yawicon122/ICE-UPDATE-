/* Tiny "simulated" label in the top-right corner of the hero card */
(function () {
  var top = document.querySelector('#heroVideo .hv-top');
  if (!top) return;
  var css = document.createElement('style');
  css.textContent = '.msim{margin-left:auto;font:600 9px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;color:rgba(207,230,255,.7);pointer-events:none}';
  document.head.appendChild(css);
  var s = document.createElement('span');
  s.className = 'msim';
  s.textContent = 'simulated';
  top.appendChild(s);
})();
