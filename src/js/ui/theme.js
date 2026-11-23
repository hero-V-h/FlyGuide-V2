// Light / dark switch in the top bar. An explicit choice is saved as fg_theme and
// set as data-theme on <html>; with no choice the page follows the system setting.

function systemDark(){ try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(e) { return false; } }
function currentTheme(){
  var t = document.documentElement.getAttribute('data-theme');
  return t === 'light' || t === 'dark' ? t : (systemDark() ? 'dark' : 'light');
}
function syncThemeButton(){
  var b = document.getElementById('theme-btn'); if (!b) return;
  var dark = currentTheme() === 'dark', label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  b.setAttribute('aria-label', label); b.title = label;
  b.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="#i-' + (dark ? 'sun' : 'moon') + '"/></svg>';
  // browser chrome colour follows the page
  document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){ m.setAttribute('content', dark ? '#121310' : '#EAE5DA'); m.removeAttribute('media'); });
}
function toggleTheme(){
  var next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('fg_theme', next); } catch(e) {}
  syncThemeButton();
  // charts read their colours from the theme when drawn
  if (currentPanel === 'stats') renderStats();
  showToast(next === 'dark' ? 'Dark mode on' : 'Light mode on');
}
(function(){
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ if (!document.documentElement.getAttribute('data-theme')) syncThemeButton(); }); } catch(e) {}
})();
