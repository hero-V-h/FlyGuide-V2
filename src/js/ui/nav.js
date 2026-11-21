// Panel routing (#name) and navigation.

function go(id, opts){
  opts = opts || {};
  if (PANELS.indexOf(id) === -1) id = 'explore';
  currentPanel = id;
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + id); });
  var navId = MORE_PANELS.indexOf(id) > -1 ? null : id;
  document.querySelectorAll('[data-go]').forEach(function(b){ var on = b.getAttribute('data-go') === id; if (on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  document.querySelectorAll('[data-more]').forEach(function(b){ if (!navId && !(b.classList.contains('desk-link') && id === 'log')) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if (id === 'flybox') buildFlybox();
  if (id === 'log'){ setDefaultDate(); renderLog(); }
  if (id === 'stats') renderStats();
  if (id === 'hatch') buildHatch();
  if (id === 'knowledge') buildKnowledge();
  if (id === 'chat') initChat();
  applyPaywalls();
  closeSheets();
  if (!opts.keepScroll){
    window.scrollTo(0, 0);
    // screen readers: announce the new view by moving focus to its heading
    var h = document.querySelector('#panel-' + id + ' h1');
    if (h && !document.querySelector('.sheet.open')){ h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch(e) {} }
  }
  try { history.replaceState(null, '', '#' + id); } catch(e) {}
}

function moreGo(id){ go(id); }

function switchTabById(id){ go(id); }

function bnavGo(id){ go(id); }
