// Accessibility layer (UI/UX Pro Max pass).
// Keeps ARIA state in step with the visual state classes the v19 logic already
// toggles, traps focus inside open dialogs, adds the password show/hide toggle,
// and gives v19's Learn content a contrast and minimum-size safety net
// without changing its wording.

// ── ARIA state from visual state ──────────────────────────────
// selector → [attribute, class that means "on"]
var ARIA_STATE = [
  ['.press-btn[role="radio"]', 'aria-checked', 'active'],
  ['#flybox-filter .press-btn', 'aria-pressed', 'active'],
  ['.auth-tab', 'aria-selected', 'active'],
  ['.plan-toggle-btn', 'aria-pressed', 'active'],
  ['.plan-card', 'aria-pressed', 'selected'],
  ['.know-nav-btn', 'aria-pressed', 'active']
];
function syncAria(el){
  if (!el || el.nodeType !== 1) return;
  for (var i = 0; i < ARIA_STATE.length; i++){
    var r = ARIA_STATE[i];
    if (el.matches(r[0])){ var v = el.classList.contains(r[2]) ? 'true' : 'false'; if (el.getAttribute(r[1]) !== v) el.setAttribute(r[1], v); }
  }
  if (el.classList.contains('star')) syncStars();
}
function syncStars(){
  var stars = document.querySelectorAll('#star-row .star'), lit = 0;
  stars.forEach(function(s){ if (s.classList.contains('lit')) lit++; });
  stars.forEach(function(s, i){ var v = (i + 1 === lit) ? 'true' : 'false'; if (s.getAttribute('aria-checked') !== v) s.setAttribute('aria-checked', v); s.tabIndex = (lit ? i + 1 === lit : i === 0) ? 0 : -1; });
}
function syncAllAria(root){
  ARIA_STATE.forEach(function(r){ (root || document).querySelectorAll(r[0]).forEach(syncAria); });
  syncStars();
}
function watchAriaState(){
  syncAllAria();
  if (!('MutationObserver' in window)) return;
  new MutationObserver(function(list){
    for (var i = 0; i < list.length; i++){
      var m = list[i];
      if (m.type === 'attributes') syncAria(m.target);
      else m.addedNodes.forEach(function(n){ if (n.nodeType === 1){ syncAria(n); if (n.querySelectorAll) syncAllAria(n); } });
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
}

// Arrow keys move between rating stars, like a radio group
function starKeys(e){
  var stars = [].slice.call(document.querySelectorAll('#star-row .star')), i = stars.indexOf(document.activeElement);
  if (i < 0) return;
  var n = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? Math.min(5, i + 2) : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? Math.max(1, i) : 0;
  if (!n) return;
  e.preventDefault(); setStars(n); stars[n - 1].focus();
}

// ── Focus trap for open dialogs ───────────────────────────────
function openDialog(){
  var order = ['#auth-overlay', '#plan-screen', '#legal-overlay'];
  for (var i = order.length - 1; i >= 0; i--){ var d = document.querySelector(order[i]); if (d && d.style.display === 'block') return d; }
  return document.querySelector('.sheet.open');
}
document.addEventListener('keydown', function(e){
  if (e.key !== 'Tab') return;
  var d = openDialog(); if (!d) return;
  var f = [].slice.call(d.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function(el){ return !el.disabled && el.offsetParent !== null; });
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (!d.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});

// ── Password show/hide ────────────────────────────────────────
function togglePassword(id, btn){
  var input = document.getElementById(id), show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? 'Hide' : 'Show';
  btn.setAttribute('aria-pressed', show ? 'true' : 'false');
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}

// ── Contrast and size safety net for authored content ─────────
function parseRgb(c){ var m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
function relLum(c){ function f(v){ v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
function mixRgb(a, b, t){ return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1 }; }
function ratio(a, b){ var x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function ensureReadable(root){
  var INK = { r: 22, g: 26, b: 21, a: 1 };
  root.querySelectorAll('*').forEach(function(el){
    var own = false;
    for (var i = 0; i < el.childNodes.length; i++){ var n = el.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()){ own = true; break; } }
    if (!own) return;
    var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    if (fs === 0 || el.closest('[aria-hidden="true"]')) return;   // text hidden on purpose
    if (el.closest('svg')) return;   // SVG text is coloured by fill and drawn on its own plate
    if (fs < 12) el.style.fontSize = '12px';
    // nearest solid background (stop at the first opaque one)
    var holder = el, bg = null;
    while (holder && holder !== root.parentElement){ var c = parseRgb(getComputedStyle(holder).backgroundColor); if (c && c.a >= 1){ bg = c; break; } holder = holder.parentElement; }
    if (!bg || holder === document.body) return;
    var fg = parseRgb(cs.color); if (!fg) return;
    var light = relLum({ r: fg.r, g: fg.g, b: fg.b }) > 0.5;
    var solid = fg.a < 1 ? mixRgb(bg, fg, fg.a) : fg;
    if (ratio(solid, bg) >= 4.5) return;
    if (light && fg.a < 1){ el.style.color = 'rgb(255 255 255 / .94)'; solid = mixRgb(bg, { r: 255, g: 255, b: 255 }, 0.94); }
    if (ratio(solid, bg) >= 4.5) return;
    if (light){
      // darken the coloured band behind light text until it passes
      var t = 0, nb = bg;
      while (ratio(solid, nb) < 4.6 && t < 0.9){ t += 0.05; nb = mixRgb(bg, INK, t); }
      holder.style.backgroundColor = 'rgb(' + Math.round(nb.r) + ' ' + Math.round(nb.g) + ' ' + Math.round(nb.b) + ')';
    } else {
      el.style.color = 'var(--ink-2)';
    }
  });
}
