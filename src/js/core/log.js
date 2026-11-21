// Catch log and stats.

function setDefaultDate() { var d = new Date(); document.getElementById('log-date').value = d.toISOString().split('T')[0]; }

function setStars(n) {
 starRating = n;
 var lbl = ['Tap to rate','Poor','Fair','Good','Great','Outstanding'];
 var stars = document.querySelectorAll('.star');
 for (var i = 0; i < stars.length; i++) { if (i < n) stars[i].classList.add('lit'); else stars[i].classList.remove('lit'); }
 document.getElementById('star-label').textContent = lbl[n];
}

function saveEntry() {
 var date = document.getElementById('log-date').value;
 var flies = document.getElementById('log-flies').value.trim();
 if (!date || !flies) { showToast('Please fill in date and flies that worked'); return; }
 var entry = {
 id: Date.now(),
 date: date,
 region: document.getElementById('log-region').value,
 venue: document.getElementById('log-venue-text').value.trim(),
 fish: parseInt(document.getElementById('log-fish').value) || 0,
 temp: document.getElementById('log-temp').value,
 weather: document.getElementById('log-weather').value,
 flies: flies,
 failed: document.getElementById('log-failed').value.trim(),
 notes: document.getElementById('log-notes').value.trim(),
 stars: starRating,
 };
 catchEntries.unshift(entry);
 try { localStorage.setItem('flyguide_log', JSON.stringify(catchEntries)); } catch(e) {}
 document.getElementById('log-flies').value = '';
 document.getElementById('log-failed').value = '';
 document.getElementById('log-notes').value = '';
 document.getElementById('log-fish').value = '0';
 starRating = 0;
 var stars = document.querySelectorAll('.star');
 for (var i = 0; i < stars.length; i++) { stars[i].classList.remove('lit'); }
 document.getElementById('star-label').textContent = 'Tap to rate';
 renderLog();
 showToast('Session saved!');
}

function deleteEntry(id){
  confirmSheet('Delete this session?', 'This removes it from your catch log on this device.', 'Delete session', function(){
    catchEntries = catchEntries.filter(function(e){ return e.id !== id; });
    try { localStorage.setItem('flyguide_log', JSON.stringify(catchEntries)); } catch(e) {}
    renderLog(); showToast('Session deleted');
  });
}

function starsHtml(n) {
 var s = '';
 for (var i = 0; i < 5; i++) { s += '<span style="color:' + (i < n ? 'var(--copper)' : 'var(--border-2)') + '">\u2605</span>'; }
 return s;
}

function renderLog() {
 var total = 0;
 for (var i = 0; i < catchEntries.length; i++) { total += (catchEntries[i].fish || 0); }
 var avg = catchEntries.length ? Math.round(total / catchEntries.length) : 0;
 var ss = document.getElementById('stat-sessions'); if (ss) ss.textContent = catchEntries.length;
 var sf = document.getElementById('stat-fish'); if (sf) sf.textContent = total;
 var sa = document.getElementById('stat-avg'); if (sa) sa.textContent = avg;
 var allFlies = [];
 for (var i = 0; i < catchEntries.length; i++) {
 var parts = catchEntries[i].flies.split(',');
 for (var j = 0; j < parts.length; j++) {
 var name = parts[j].trim().replace(/#[0-9\u2013-]+/g,'').trim().toLowerCase();
 if (name) allFlies.push(name);
 }
 }
 var flyCounts = {};
 for (var i = 0; i < allFlies.length; i++) { flyCounts[allFlies[i]] = (flyCounts[allFlies[i]] || 0) + 1; }
 var flyArr = [];
 for (var k in flyCounts) { flyArr.push([k, flyCounts[k]]); }
 flyArr.sort(function(a,b){return b[1]-a[1];});
 var top8 = flyArr.slice(0, 8);
 if (top8.length > 0) {
 var maxC = top8[0][1];
 document.getElementById('top-flies-section').style.display = 'block';
 var flyHtml = '';
 for (var i = 0; i < top8.length; i++) {
 var fn = top8[i][0]; var fc = top8[i][1];
 flyHtml += '<div class="top-fly-row"><span class="top-fly-rank">' + (i+1) + '</span><span class="top-fly-name">' + fn.charAt(0).toUpperCase() + fn.slice(1) + '</span><span class="top-fly-count">' + fc + ' session' + (fc===1?'':'s') + '</span></div>';
 }
 document.getElementById('top-flies-list').innerHTML = flyHtml;
 }
 var el = document.getElementById('entries-list');
 if (!catchEntries.length) { el.innerHTML = '<div class="empty-log">No sessions yet. Record your first trip above.</div>'; return; }
 var mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 var cardsHtml = '';
 for (var i = 0; i < catchEntries.length; i++) {
 var e = catchEntries[i];
 var d = new Date(e.date + 'T12:00:00');
 var ds = d.getDate() + ' ' + mn[d.getMonth()] + ' ' + d.getFullYear();
 cardsHtml += '<div class="log-entry">';
 cardsHtml += '<div class="log-entry-top"><div>';
 if (e.region) cardsHtml += '<span class="log-entry-region">' + e.region + '</span><br/>';
 cardsHtml += '<span class="log-entry-venue">' + (e.venue || e.region || 'Session') + '</span>';
 cardsHtml += '<div class="log-entry-date">' + ds + '</div></div>';
 cardsHtml += '<div class="log-entry-fish"><div class="log-entry-fish-num">' + e.fish + '</div><div class="log-entry-fish-lbl">' + (e.fish === 1 ? 'fish' : 'fish') + '</div></div>';
 cardsHtml += '</div>';
 cardsHtml += '<div class="log-entry-meta"><span><strong>' + e.weather + '</strong></span><span><strong>' + e.temp + '°C</strong></span>';
 if (e.stars) cardsHtml += '<span class="log-entry-stars">' + starsHtml(e.stars) + '</span>';
 cardsHtml += '</div>';
 cardsHtml += '<div class="log-entry-flies"><strong>Worked:</strong> ' + e.flies + '</div>';
 if (e.failed) cardsHtml += '<div class="log-entry-flies failed"><strong>Failed:</strong> ' + e.failed + '</div>';
 if (e.notes) cardsHtml += '<div class="log-entry-notes">' + e.notes + '</div>';
 cardsHtml += '<button class="log-entry-del" onclick="deleteEntry(' + e.id + ')">Delete session</button>';
 cardsHtml += '</div>';
 }
 el.innerHTML = cardsHtml;
}

function exportCSV() {
 if (!catchEntries.length) { showToast('No sessions to export'); return; }
 var hdr = 'Date,Region,Venue,Temp,Weather,Fish,Stars,Flies That Worked,Flies That Failed,Notes';
 var rows = [];
 for (var i = 0; i < catchEntries.length; i++) {
 var e = catchEntries[i];
 rows.push([e.date, e.region||'', e.venue||'', e.temp, e.weather, e.fish, e.stars||0, '"'+e.flies+'"', '"'+(e.failed||'')+'"', '"'+((e.notes||'').replace(/"/g,"'"))+'"'].join(','));
 }
 var csv = hdr + '\n' + rows.join('\n');
 var blob = new Blob([csv], {type:'text/csv'});
 var url = URL.createObjectURL(blob);
 var a = document.createElement('a'); a.href = url; a.download = 'flyguide_log.csv'; a.click();
 URL.revokeObjectURL(url);
 showToast('CSV exported!');
}

function showCompare() {
 var sec = document.getElementById('compare-section');
 if (!catchEntries.length) { showToast('Log some sessions first'); return; }
 sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
 if (sec.style.display === 'none') return;
 var sorted = catchEntries.slice().sort(function(a,b){return (b.fish||0)-(a.fish||0);});
 var best = sorted[0]; var worst = sorted[sorted.length-1];
 var mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 function cHtml(e, label, cls) {
 var d = new Date(e.date+'T12:00:00');
 var h = '<div class="compare-card ' + cls + '">';
 h += '<div class="compare-label">' + label + '</div>';
 h += '<div class="compare-value">' + e.fish + ' fish</div>';
 h += '<div class="compare-detail">' + d.getDate()+' '+mn[d.getMonth()]+' '+d.getFullYear() + '</div>';
 h += '<div class="compare-detail">' + (e.venue || e.region || '–') + '</div>';
 h += '<div class="compare-detail" style="margin-top:6px;color:var(--river);">' + e.flies + '</div>';
 h += '</div>';
 return h;
 }
 document.getElementById('compare-cards').innerHTML = cHtml(best, 'Best session', 'best') + cHtml(worst, 'Toughest session', 'worst');
}

function renderStatsBase() {
 var sEl = document.getElementById('stats-empty');
 var totalF = 0;
 for (var i = 0; i < catchEntries.length; i++) { totalF += (catchEntries[i].fish || 0); }
 var ssEl = document.getElementById('s-sessions'); if (ssEl) ssEl.textContent = catchEntries.length;
 var sfEl = document.getElementById('s-fish'); if (sfEl) sfEl.textContent = totalF;
 if (!catchEntries.length) { if (sEl) sEl.style.display='flex'; return; }
 if (sEl) sEl.style.display = 'none';
 // Best region
 var regionFish = {};
 for (var i = 0; i < catchEntries.length; i++) { var rn = catchEntries[i].region||'Unknown'; regionFish[rn] = (regionFish[rn]||0) + (catchEntries[i].fish||0); }
 var rArr = []; for (var k in regionFish) { rArr.push([k, regionFish[k]]); }
 rArr.sort(function(a,b){return b[1]-a[1];});
 var bvEl = document.getElementById('s-best'); if (bvEl && rArr.length) bvEl.textContent = rArr[0][0].split(' ')[0];
 var palette = ['--olive','--gold','--slate','--rust','--season-good','--gold-ink','--ink-3','--border-strong'].map(cssVar);
 var sortedE = catchEntries.slice().reverse().slice(0,20);
 var fishLabels=[], fishData=[];
 for (var i=0;i<sortedE.length;i++){fishLabels.push(sortedE[i].date.slice(5));fishData.push(sortedE[i].fish||0);}
 if (chartFish) chartFish.destroy();
 var c1 = document.getElementById('chart-fish');
 if (c1) { chartFish = new Chart(c1.getContext('2d'),{type:'bar',data:{labels:fishLabels,datasets:[{data:fishData,backgroundColor:cssVar('--olive'),borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:cssVar('--ink-3'),font:{family:'Archivo',size:12}},grid:{color:cssVar('--border')}},x:{ticks:{color:cssVar('--ink-3'),font:{family:'Archivo',size:11}},grid:{display:false}}}}}); }
 var allF=[];
 for (var i=0;i<catchEntries.length;i++){var pts=catchEntries[i].flies.split(',');for(var j=0;j<pts.length;j++){var fn=pts[j].trim().replace(/#[0-9\u2013-]+/g,'').trim().toLowerCase();if(fn)allF.push(fn);}}
 var fCounts={}; for(var i=0;i<allF.length;i++){fCounts[allF[i]]=(fCounts[allF[i]]||0)+1;}
 var fArr=[]; for(var k in fCounts){fArr.push([k,fCounts[k]]);} fArr.sort(function(a,b){return b[1]-a[1];}); var top8=fArr.slice(0,8);
 var flyLabels=[],flyCData=[]; for(var i=0;i<top8.length;i++){flyLabels.push(top8[i][0].split(' ').slice(0,2).join(' '));flyCData.push(top8[i][1]);}
 if (chartFlies) chartFlies.destroy();
 var c2 = document.getElementById('chart-flies');
 if (c2) { chartFlies = new Chart(c2.getContext('2d'),{type:'bar',data:{labels:flyLabels,datasets:[{data:flyCData,backgroundColor:palette,borderRadius:4}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{color:cssVar('--ink-3'),font:{family:'Archivo',size:12}},grid:{color:cssVar('--border')}},y:{ticks:{color:cssVar('--ink-3'),font:{family:'Archivo',size:12}},grid:{display:false}}}}}); }
 var rCounts = {Dullstroom:0,'KwaZulu-Natal':0,'Eastern Cape':0,'Cape Streams':0};
 for (var i=0;i<catchEntries.length;i++){var rn=catchEntries[i].region||'Unknown';if(rCounts[rn]!==undefined)rCounts[rn]++;}
 if (chartRegions) chartRegions.destroy();
 var c3 = document.getElementById('chart-regions');
 if (c3) { chartRegions = new Chart(c3.getContext('2d'),{type:'doughnut',data:{labels:Object.keys(rCounts),datasets:[{data:Object.values(rCounts),backgroundColor:palette.slice(0,4),borderWidth:0}]},options:{plugins:{legend:{position:'bottom',labels:{color:cssVar('--ink-2'),font:{family:'Archivo',size:13},padding:14}}}}}); }
}

function renderStats(){
  var empty = !catchEntries.length;
  document.getElementById('stats-charts').style.display = empty ? 'none' : 'block';
  if (typeof Chart !== 'undefined'){ Chart.defaults.font.family = 'Archivo, system-ui, sans-serif'; }
  try { renderStatsBase(); } catch(e) {}
  if (!empty){
    var fish = catchEntries.map(function(e){ return e.fish || 0; }), best = Math.max.apply(null, fish);
    var label = function(id, t){ var c = document.getElementById(id); if (c){ c.setAttribute('role', 'img'); c.setAttribute('aria-label', t); } };
    label('chart-fish', 'Fish per session for your last ' + Math.min(20, fish.length) + ' sessions. Best session: ' + best + ' fish.');
    var top = (document.querySelector('#top-flies-list .top-fly-name') || {}).textContent;
    label('chart-flies', top ? 'Top performing flies. Most used: ' + top + '.' : 'Top performing flies.');
    label('chart-regions', 'Sessions by region. Best region: ' + document.getElementById('s-best').textContent + '.');
  }
}
