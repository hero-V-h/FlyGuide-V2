// Fly box, hatch calendar, rig builder and tippet calculator.

function buildFlybox(){
  var R = REGIONS[currentRegion], flies = R.flies, labels = {dry:'Dry flies',emerger:'Emergers',nymph:'Nymphs',streamer:'Streamers',wet:'Wet flies'}, html = '';
  ['dry','emerger','nymph','streamer','wet'].forEach(function(type){
    if (flyboxFilter !== 'all' && flyboxFilter !== type) return;
    var g = Object.keys(flies).filter(function(k){ return flies[k].type === type; }); if (!g.length) return;
    html += '<div class="flybox-group"><div class="sec-head"><span class="sec-label">' + labels[type] + ' · ' + g.length + '</span></div><div class="flybox-grid">';
    g.forEach(function(k, i){ html += flyCard(k, flies[k], i, null, false); });
    html += '</div></div>';
  });
  document.getElementById('flybox-list').innerHTML = html;
}

function filterFlybox(type, el){ flyboxFilter = type; document.querySelectorAll('#flybox-filter .press-btn').forEach(function(b){ b.classList.toggle('active', b === el); }); buildFlybox(); }

function buildHatch(){
  var R = REGIONS[currentRegion], now = new Date().getMonth(), pm = {prime:'pill-prime',good:'pill-good',tech:'pill-tech',wd:'pill-wd'}, pl = {prime:'Prime',good:'Good',tech:'Technical',wd:'Weather dep.'};
  var h = '<div class="note">' + ic('calendar') + '<div><strong>' + R.name + ' trout calendar.</strong> ' + R.bestMonths + '</div></div><div class="table-wrap"><table class="hatch-table"><tr><th>Month</th><th>Rating</th><th>Primary flies</th><th>Notes</th></tr>';
  R.hatch.forEach(function(x, i){ h += '<tr' + (i === now ? ' class="now"' : '') + '><td class="month">' + x.m + (i === now ? ' <span class="caption-3" style="color:var(--copper)">Now</span>' : '') + '</td><td><span class="pill ' + (pm[x.r]||'pill-wd') + '">' + (pl[x.r]||x.r) + '</span></td><td>' + x.flies + '</td><td>' + x.note + '</td></tr>'; });
  document.getElementById('hatch-content').innerHTML = h + '</table></div><p class="source-note">Based on local guide knowledge, FOSAF reports and field experience.</p>';
}

function buildRig(){
  var season = document.getElementById('rig-season').value, surface = document.getElementById('rig-surface').value, venue = document.getElementById('rig-venue').value;
  var surfKey = surface === 'sipping' ? 'sipping' : (surface === 'active' || surface === 'slashing') ? 'occasional' : 'none', r = null;
  if (currentRegion === 'cape') r = surface === 'sipping' ? RIGS.cape_sipping : RIGS.cape_river;
  else if (currentRegion === 'kzn') r = venue === 'still' ? (RIGS[season+'_still_'+surfKey] || RIGS[season+'_still_none']) : RIGS.kzn_river;
  else if (currentRegion === 'ec'){ r = RIGS.ec_river; if (venue === 'still') r = RIGS[season+'_still_'+surfKey] || RIGS[season+'_still_none']; }
  else r = RIGS[season+'_'+venue+'_'+surfKey] || RIGS[season+'_'+venue+'_none'] || RIGS[season+'_still_none'];
  if (!r) r = RIGS.spring_river_all;
  var moon = getMoonPhase(new Date());
  var h = '<div class="rig-card"><div class="rig-header">' + REGIONS[currentRegion].name + ' · ' + season + ' · ' + (venue === 'still' ? 'stillwater' : 'river') + '</div><div class="rig-body"><div class="rig-diagram">';
  h += '<div class="rig-step"><div class="rail"><i></i><s></s></div><div class="rt"><span>Leader and tippet</span><b>5X to 6X, 9 to 12 ft</b></div></div>';
  h += '<div class="rig-step is-fly"><div class="rail"><i></i><s></s></div><div class="rt"><span>Point fly (anchor)</span><b>' + r.anchor + '</b></div></div>';
  h += '<div class="rig-step"><div class="rail"><i></i><s></s></div><div class="rt"><span>Dropper length</span><b class="mono">' + r.len + '</b></div></div>';
  h += '<div class="rig-step is-fly"><div class="rail"><i></i><s></s></div><div class="rt"><span>Dropper fly · depth ' + r.depth + '</span><b>' + r.dropper + '</b></div></div>';
  h += '</div><div class="rig-tip">' + r.tip + '</div><p class="caption-5 muted" style="margin-top:var(--s-100)">' + moon.phase + ' · ' + moon.note.replace(/!$/,'') + '</p></div></div>';
  document.getElementById('rig-result').innerHTML = h;
}

function calcTippet(){
  var sz = document.getElementById('tip-size').value, clarity = document.getElementById('tip-clarity').value, type = document.getElementById('tip-type').value;
  var rec = (TIPPET_DATA[sz] && TIPPET_DATA[sz][type]) || '5X', order = ['0X','1X','2X','3X','4X','5X','6X','7X'], idx = order.indexOf(rec);
  if (currentRegion === 'cape' && idx < order.length - 1) rec = order[idx+1];
  else if (clarity === 'crystal' && idx < order.length - 1) rec = order[idx+1];
  else if (clarity === 'murky' && idx > 0) rec = order[idx-1];
  var info = TIPPET_INFO[rec] || {dia:'0.15mm',str:'1.8kg',ldr:'9–12ft'};
  var note = (clarity === 'crystal' ? 'Crystal clear water, so go finer for stealth. ' : '') + (clarity === 'murky' ? 'Off colour water, so fish are less leader shy and heavier tippet is fine. ' : '') + (currentRegion === 'cape' ? 'Cape streams: always one size finer than standard, because wild fish spook easily.' : '');
  var h = '<div class="rig-card"><div class="rig-header">' + rec + ' tippet for a size ' + sz + ' ' + type + '</div><div class="rig-body"><div class="stat-row">';
  [[rec,'X rating'],[info.dia,'Diameter'],[info.str,'Strength'],[info.ldr,'Leader']].forEach(function(x){ h += '<div class="stat-card"><span class="stat-num">' + x[0] + '</span><span class="stat-lbl">' + x[1] + '</span></div>'; });
  h += '</div>' + (note ? '<div class="rig-tip">' + note + '</div>' : '') + '</div></div>';
  document.getElementById('tippet-result').innerHTML = h;
  document.querySelectorAll('.tippet-table tr').forEach(function(tr){ tr.classList.toggle('highlight', !!(tr.cells[0] && tr.cells[0].textContent === rec)); });
}
