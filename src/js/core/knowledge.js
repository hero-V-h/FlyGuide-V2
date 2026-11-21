// Learn panel: wraps the v19 knowledge content (data/knowledge.js) with animated accordions.

function buildKnowledge(){
  var el = document.getElementById('knowledge-content');
  if (el.innerHTML.length > 100) return;
  buildKnowledgeBase();
  el.querySelectorAll('.know-card-body').forEach(function(b){
    var kb = document.createElement('div'), kbi = document.createElement('div'); kb.className = 'kb'; kbi.className = 'kbi';
    while (b.firstChild) kbi.appendChild(b.firstChild);
    kb.appendChild(kbi); b.appendChild(kb);
    var head = b.previousElementSibling;
    if (head && head.classList.contains('know-card-header')){
      head.setAttribute('role','button'); head.setAttribute('tabindex','0'); head.setAttribute('aria-expanded', b.classList.contains('open') ? 'true' : 'false');
      head.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleKnow(head); } });
    }
    if (b.classList.contains('open')) b.parentNode.classList.add('is-open');
  });
}

function toggleKnow(head){
  var body = head.nextElementSibling, open = !body.classList.contains('open');
  body.classList.toggle('open', open); head.parentNode.classList.toggle('is-open', open); head.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function showKnowSection(id, btn){
  document.querySelectorAll('.know-section').forEach(function(s){ s.classList.toggle('active', s.id === 'know-' + id); });
  document.querySelectorAll('.know-nav-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
}
