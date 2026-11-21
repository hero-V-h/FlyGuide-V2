// Region switching, hero, season overview and featured waters.

function primeRanges(hatch){
  var on = hatch.map(function(h){ return h.r === 'prime'; }), out = [], i = 0;
  while (i < 12){ if (on[i]){ var j = i; while (j+1 < 12 && on[j+1]) j++; out.push(j > i ? MON3[i] + ' to ' + MON3[j] : MON3[i]); i = j+1; } else i++; }
  return out;
}

function buildHeroMedia(){
  var media = document.getElementById('hero-media'), alts = {dullstroom:'Angler casting across a still dam near Dullstroom', kzn:'Rocky Drakensberg stream below the Amphitheatre in KwaZulu-Natal', ec:'Angler nymphing a grassy Eastern Cape highland stream', cape:'Angler wading a clear mountain river below Western Cape peaks'};
  media.innerHTML = REGION_ORDER.map(function(k){ return '<img data-k="' + k + '" src="' + REGION_HERO_IMAGES[k] + '" alt="' + alts[k] + '" fetchpriority="high" decoding="async"/>'; }).join('');
}

function setHero(k){ document.querySelectorAll('#hero-media img').forEach(function(img){ img.classList.toggle('on', img.getAttribute('data-k') === k); }); }

function setRegion(regionKey, opts){
  opts = opts || {};
  if (!canUseRegion(regionKey)){ showToast(REGIONS[regionKey].name + ' is part of FlyGuide Pro'); showPlanScreen(); return false; }
  currentRegion = regionKey;
  try { localStorage.setItem('fg_region', regionKey); } catch(e) {}
  var R = REGIONS[regionKey];
  setHero(regionKey);
  document.getElementById('hero-tag').textContent = R.tag;
  document.getElementById('plate-name').textContent = R.name;
  document.getElementById('plate-sub').textContent = REGION_META[regionKey].sub;
  document.getElementById('region-pill-label').textContent = REGION_META[regionKey].short;
  ['rec-eyebrow','fb-eyebrow','ha-eyebrow'].forEach(function(id){ document.getElementById(id).textContent = R.name; });
  var pr = primeRanges(R.hatch);
  document.getElementById('hp-flies').textContent = Object.keys(R.flies).length;
  document.getElementById('hp-venues').textContent = R.venueInfo.length;
  document.getElementById('hp-best').textContent = pr[0] || 'Year round';
  var vSel = document.getElementById('venue'); vSel.innerHTML = '';
  for (var v = 0; v < R.venues.length; v++){ var opt = document.createElement('option'); opt.value = R.venueVals[v]; opt.textContent = R.venues[v]; vSel.appendChild(opt); }
  document.getElementById('log-region').value = R.name;
  resetResults();
  buildOverview(); buildVenues(); buildHatch();
  flyboxFilter = 'all';
  document.querySelectorAll('#flybox-filter .press-btn').forEach(function(b, i){ b.classList.toggle('active', i === 0); });
  if (currentPanel === 'flybox') buildFlybox();
  if (MAP.markers.length) renderMapSide();
  if (!opts.silent) showToast('Switched to ' + R.name);
  return true;
}

function buildOverview(){
  var R = REGIONS[currentRegion], now = new Date().getMonth();
  document.getElementById('ov-title').textContent = R.name + ' trout calendar';
  document.getElementById('ov-best').textContent = R.bestMonths;
  document.getElementById('season-bar').innerHTML = R.hatch.map(function(h, i){ return '<div class="m' + (i === now ? ' now' : '') + '" title="' + h.m + ': ' + h.note.replace(/"/g,'&quot;') + '" role="listitem"><i class="' + h.r + '" aria-hidden="true"></i><span aria-hidden="true">' + MON3[i][0] + '</span><span class="sr-only">' + h.m + ': ' + ({prime:'prime',good:'good',tech:'technical',wd:'weather dependent'}[h.r]) + '</span></div>'; }).join('');
  var h = R.hatch[now];
  document.getElementById('tm-title').textContent = h.m + ' in ' + R.name;
  document.getElementById('tm-flies').innerHTML = '<strong>' + ({prime:'Prime',good:'Good',tech:'Technical',wd:'Weather dependent'}[h.r]) + '.</strong> ' + h.flies;
  document.getElementById('tm-note').textContent = h.note;
}

function buildVenues(){
  var R = REGIONS[currentRegion], k = currentRegion;
  document.getElementById('venues-title').textContent = R.name + ' venues';
  var html = '<div class="venue-grid">';
  R.venueInfo.forEach(function(v, i){
    html += '<article class="venue-card"><div class="venue-head"><span class="num">' + (i+1) + '</span><div><div class="venue-name">' + v.name + '</div><div class="venue-type">' + v.type + '</div></div></div>';
    html += '<div class="venue-body"><div class="chips"><span class="chip"><b>Access</b> ' + v.access + '</span><span class="chip"><b>Best</b> ' + v.best + '</span></div><div class="venue-desc">' + v.desc + '</div><div class="venue-flies"><strong>Top flies:</strong> ' + v.flies + '</div>';
    html += '<div class="venue-actions"><button class="btn btn-forest btn-sm" onclick="fishHere(\'' + k + '\',' + i + ')">' + ic('target') + 'Fish here</button><button class="btn btn-secondary btn-sm" onclick="selectVenue(\'' + k + '\',' + i + ',{scroll:true})">' + ic('pin') + 'Show on map</button></div></div></article>';
  });
  document.getElementById('venues-content').innerHTML = html + '</div>';
}

function setRegionIfAllowed(k){ if (!canUseRegion(k)){ showToast(REGIONS[k].name + ' is part of FlyGuide Pro'); showPlanScreen(); return false; } if (k !== currentRegion) setRegion(k); return true; }

function fishHere(k, i){
  if (!setRegionIfAllowed(k)) return;
  var val = REGION_META[k].venues[i].val, sel = document.getElementById('venue');
  for (var j = 0; j < sel.options.length; j++){ if (sel.options[j].value === val){ sel.selectedIndex = j; break; } }
  go('recommend');
  showToast('Venue set to ' + REGION_META[k].venues[i].name);
}
