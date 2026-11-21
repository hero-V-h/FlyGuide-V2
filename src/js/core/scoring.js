// Recommendation: conditions form, scoring, results and print card. Scoring rules live in data/regions.js.

function getCtx() {
 return {
 season: document.getElementById('season').value,
 month: parseInt(document.getElementById('month').value),
 tod: document.getElementById('tod').value,
 weather: document.getElementById('weather').value,
 clarity: document.getElementById('clarity').value,
 level: document.getElementById('level').value,
 temp: document.getElementById('temp').value,
 pressure: pressureVal,
 surface: document.getElementById('surface').value,
 species: document.getElementById('species').value,
 venue: document.getElementById('venue').value,
 wind: document.getElementById('wind').value,
 };
}

function setPress(v, el) {
 pressureVal = v;
 var pBtns = document.querySelectorAll('#pressureRow .press-btn');
 for (var i = 0; i < pBtns.length; i++) { pBtns[i].classList.remove('active'); }
 el.classList.add('active');
}

function getMoonPhase(date) {
 var d = date || new Date();
 var known = new Date(2000, 0, 6);
 var diff = (d - known) / (1000 * 60 * 60 * 24);
 var cycle = ((diff % 29.53) + 29.53) % 29.53;
 var phases = ['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
 var notes = ['Fish deep','Activity building','Good surface feeding','Excellent window','Peak feeding!','Good window','Slowing','Fish early/late'];
 var idx = Math.floor((cycle / 29.53) * 8) % 8;
 return { phase: phases[idx], note: notes[idx] };
}

function resetResults(){
  document.getElementById('results').innerHTML = '<div class="placeholder">' + ic('target') + '<b>Your top four flies appear here</b>Set the conditions and tap Get recommendation. Live weather can fill most of the form for you.</div>';
  var pa = document.getElementById('print-card-area'); pa.style.display = 'none'; pa.innerHTML = '';
  lastRec = null;
}

function flyCard(key, f, i, item, isRec){
  var h = '<article class="fly' + (isRec ? ' enter' : '') + (isRec && i === 0 ? ' lead' : '') + '"' + (isRec ? ' style="--d:' + [0,60,110,150][i] + 'ms"' : '') + '>';
  h += '<div class="fly-header"><div style="flex:1;min-width:0">' + (isRec ? '<span class="fly-rank">' + ['Primary pick','Second choice','Third choice','Fourth choice'][i] + '</span>' : '') + '<div class="fly-name">' + f.name + '</div></div><span class="badge ' + f.type + '">' + f.type + '</span></div>';
  h += makeFlyImg(key, f.name, f.type, isRec ? 140 : 110);
  h += '<div class="fly-meta"><span>Hook size <b>#' + f.sz + '</b></span>' + (isRec ? '<span class="mono">' + item.score + ' pts</span>' : '') + '</div>';
  if (isRec){ var pct = Math.min(100, Math.round(item.score * 1.4)); h += '<div class="score-wrap"><div class="score-track"><div class="score-fill" data-p="' + (pct/100) + '"></div></div></div>'; }
  h += '<div class="fly-why">' + f.why + '</div>';
  if (isRec) h += '<div class="fly-tip"><strong>Guide tip:</strong> ' + f.tip + '</div>';
  h += '<div class="fly-when">' + f.when + '</div></article>';
  return h;
}

function recommend(){
  var R = REGIONS[currentRegion], ctx = getCtx(), flies = R.flies, all = [];
  for (var k in flies) all.push({key:k, score:R.scoreRules(k, ctx)});
  all.sort(function(a,b){ return b.score - a.score; });
  var top = all.slice(0,4), also = all.slice(4,10).filter(function(s){ return s.score > 10; });
  var moon = getMoonPhase(new Date()), ts = top.length ? top[0].score : 0;
  var conf = ts >= 60 ? {lv:5,txt:'Very high confidence'} : ts >= 40 ? {lv:4,txt:'High confidence'} : ts >= 25 ? {lv:3,txt:'Moderate confidence'} : {lv:2,txt:'Mixed conditions'};
  var sL = {summer:'Summer',autumn:'Autumn',winter:'Winter',spring:'Spring'}, wL = {sunny:'Sunny',overcast:'Overcast',rain:'Light rain',windy:'Windy',coldfront:'Cold front',stormgap:'Storm gap'}, cL = {crystal:'Crystal clear',clear:'Clear',offcolour:'Off colour',murky:'Murky'};
  var vs = document.getElementById('venue'), venueName = vs.options[vs.selectedIndex].text;
  var h = '<div class="conditions-bar"><span class="chip">' + ic('pin').replace('<svg','<svg style="width:14px;height:14px"') + venueName + '</span><span class="chip">' + sL[ctx.season] + '</span><span class="chip">' + wL[ctx.weather] + '</span><span class="chip">' + cL[ctx.clarity] + '</span><span class="chip mono">' + ctx.temp + '°C</span></div>';
  var dots = ''; for (var d = 0; d < 5; d++) dots += '<span class="dot' + (d < conf.lv ? ' filled' : '') + '"></span>';
  h += '<div class="confidence-bar"><span class="conf-label">Confidence</span><span class="conf-dots">' + dots + '</span><span class="conf-text">' + conf.txt + '</span><span class="moon-badge">' + ic('moon') + moon.phase + ' <small>' + moon.note.replace(/!$/,'') + '</small></span></div>';
  h += '<div class="fly-list">';
  top.forEach(function(item, i){ var f = flies[item.key]; if (f) h += flyCard(item.key, f, i, item, true); });
  h += '</div>';
  if (also.length) h += '<div class="also"><strong>Also worth trying:</strong> ' + also.map(function(s){ return flies[s.key] ? flies[s.key].name : ''; }).filter(Boolean).join(', ') + '</div>';
  var res = document.getElementById('results'); res.innerHTML = h;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ res.querySelectorAll('.score-fill').forEach(function(el){ el.style.setProperty('--p', el.getAttribute('data-p')); }); }); });
  document.getElementById('print-card-area').style.display = 'none';
  lastRec = {top:top, ctx:ctx};
  if (window.innerWidth < 960) res.scrollIntoView({behavior: REDUCE ? 'auto' : 'smooth', block:'start'});
}

function printCard(){
  if (!lastRec){ showToast('Get a recommendation first'); return; }
  var R = REGIONS[currentRegion], flies = R.flies, vs = document.getElementById('venue');
  var h = '<div class="print-card"><div class="title-2">' + R.name + ' fly card</div><div class="caption-5 muted">' + vs.options[vs.selectedIndex].text + ' · ' + lastRec.ctx.season + ' · ' + lastRec.ctx.temp + '°C · ' + new Date().toLocaleDateString('en-ZA') + '</div>';
  lastRec.top.forEach(function(item, i){ var f = flies[item.key]; if (f) h += '<div class="top-fly-row"><span class="top-fly-rank">' + (i+1) + '</span><span class="top-fly-name">' + f.name + '</span><span class="top-fly-count">#' + f.sz + '</span><span class="badge ' + f.type + '">' + f.type + '</span></div>'; });
  h += '<div class="caption-5 muted">Weather ' + lastRec.ctx.weather + ' · Wind ' + lastRec.ctx.wind + ' · Pressure ' + pressureVal + ' · Moon ' + getMoonPhase(new Date()).phase + '</div></div>';
  var pa = document.getElementById('print-card-area'); pa.innerHTML = h; pa.style.display = 'block';
  setTimeout(function(){ try { window.print(); } catch(e) {} }, 300);
}
