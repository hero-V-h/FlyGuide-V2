// Start up. Runs last, once every function above is defined.
(function init(){
  // Enter submits, without relying on <form> submission (blocked in sandboxed frames)
  document.querySelectorAll('[data-enter]').forEach(function(box){ box.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); var fn = window[box.getAttribute('data-enter')]; if (typeof fn === 'function') fn(); } }); });
  document.querySelectorAll('[data-go]').forEach(function(b){ b.addEventListener('click', function(){ go(b.getAttribute('data-go')); }); });
  document.querySelectorAll('[data-more]').forEach(function(b){ b.addEventListener('click', openMoreSheet); });
  document.querySelectorAll('.press-btn[role="radio"]').forEach(function(b){ b.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); b.click(); } }); });
  document.querySelectorAll('.plan-card').forEach(function(c){ c.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); c.click(); } }); });
  watchAriaState();
  syncThemeButton();
  buildHeroMedia();
  var m = new Date().getMonth() + 1;
  document.getElementById('month').value = m;
  document.getElementById('season').value = getTempSeason(m);
  document.getElementById('tod').value = getTimeOfDay();
  setDefaultDate();
  initAuth();
  var saved = null; try { saved = localStorage.getItem('fg_region'); } catch(e) {}
  setRegion(saved && REGIONS[saved] && canUseRegion(saved) ? saved : 'dullstroom', {silent:true});
  buildMap();
  renderLog();
  var start = (location.hash || '').replace('#','');
  go(PANELS.indexOf(start) > -1 ? start : 'explore', {keepScroll:true});
  setTimeout(function(){ try { if (!localStorage.getItem('fg_notif_seen')) document.getElementById('notif-dot').style.display = 'block'; } catch(e) {} }, 2500);
})();

// Offline cache on real hosts. Sandboxed previews block service workers, so every step is guarded.
try {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    var sw = 'const CACHE="flyguide-v20";const ASSETS=[location.href];self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match(e.request)))));';
    var swUrl = URL.createObjectURL(new Blob([sw], {type:'application/javascript'}));
    navigator.serviceWorker.register(swUrl).catch(function(){});
  }
} catch(e) {}
