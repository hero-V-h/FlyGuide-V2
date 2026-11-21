// Sheets, modals, toast and confirm.

function openSheet(id){
  closeSheets(true);
  lastFocus = document.activeElement;
  document.getElementById('scrim').classList.add('open');
  var s = document.getElementById(id); s.classList.add('open');
  setTimeout(function(){ var f = s.querySelector('button,[href],input'); if (f) f.focus({preventScroll:true}); }, 60);
}

function closeSheets(silent){
  document.getElementById('scrim').classList.remove('open');
  document.querySelectorAll('.sheet.open').forEach(function(s){ s.classList.remove('open'); });
  if (!silent && lastFocus && lastFocus.focus) { try { lastFocus.focus({preventScroll:true}); } catch(e) {} lastFocus = null; }
}

function openMoreSheet(){ openSheet('more-sheet'); }

function closeMoreSheet(){ closeSheets(); }

function closeAcctSheet(){ closeSheets(); }

function closeNotifications(){ closeSheets(); }

function showNotifications(){
  var icons = {hatch:'fly', tip:'info', alert:'bolt', reg:'scroll'};
  document.getElementById('notif-list').innerHTML = NOTIFICATIONS.map(function(n){
    return '<div class="notif-item"><div class="notif-icon ' + n.type + '">' + ic(icons[n.type] || 'info') + '</div><div><div class="notif-title">' + n.title + '</div><div class="notif-text">' + n.text + '</div><div class="notif-time">' + n.time + '</div></div></div>';
  }).join('');
  document.getElementById('notif-dot').style.display = 'none';
  try { localStorage.setItem('fg_notif_seen','1'); } catch(e) {}
  openSheet('notif-overlay');
}

function showLegal(type){
  var doc = LEGAL_CONTENT[type]; if (!doc) return;
  document.getElementById('legal-title').textContent = doc.title;
  document.getElementById('legal-content').innerHTML = doc.body.map(function(s){ return '<section class="legal-sec"><h3>' + s.h + '</h3><div>' + s.t + '</div></section>'; }).join('');
  var o = document.getElementById('legal-overlay'); o.style.display = 'block'; o.scrollTop = 0;
  legalFocus = document.activeElement;
  setTimeout(function(){ var b = o.querySelector('.modal-close'); if (b) b.focus({preventScroll:true}); }, 30);
}

var legalFocus = null;
function closeLegal() {
 document.getElementById('legal-overlay').style.display = 'none';
 if (legalFocus && legalFocus.focus) { try { legalFocus.focus({preventScroll:true}); } catch(e) {} legalFocus = null; }
}

function confirmSheet(title, text, okLabel, onOk){
  document.getElementById('confirm-body').innerHTML = '<div class="acct-name-lg">' + title + '</div><div class="acct-email-lg">' + text + '</div><button class="acct-action-btn primary" id="confirm-ok">' + okLabel + '</button><button class="acct-action-btn ghost" onclick="closeSheets()">Cancel</button>';
  document.getElementById('confirm-ok').onclick = function(){ closeSheets(); onOk(); };
  openSheet('confirm-sheet');
}

function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg.replace(/!+$/,'').replace(/^\s+/,'');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 4000);
}

// Escape closes the top sheet or modal; with none open it leaves the map's region view
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape') return;
  if (document.querySelector('.sheet.open')) closeSheets();
  else if (document.getElementById('legal-overlay').style.display === 'block') closeLegal();
  else if (typeof MAP !== 'undefined' && MAP.mode !== 'country' && currentPanel === 'explore'){
    var inMap = document.getElementById('map-card').contains(document.activeElement);
    mapHome();
    if (inMap || document.activeElement === document.body) document.getElementById('crumb-home').focus({ preventScroll: true });
  }
});
