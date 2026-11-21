
// Storage fallback: if the browser blocks localStorage/sessionStorage (private
// mode, sandboxed previews), keep data in memory for this visit instead of failing.
(function(){
  function mem(){ var d = {}; return { getItem:function(k){ return Object.prototype.hasOwnProperty.call(d,k) ? d[k] : null; }, setItem:function(k,v){ d[k] = String(v); }, removeItem:function(k){ delete d[k]; }, clear:function(){ d = {}; }, key:function(i){ return Object.keys(d)[i] || null; }, get length(){ return Object.keys(d).length; } }; }
  ['localStorage','sessionStorage'].forEach(function(n){
    var ok = false;
    try { var s = window[n]; s.setItem('__fg_t','1'); s.removeItem('__fg_t'); ok = true; } catch(e) {}
    if (!ok) { try { Object.defineProperty(window, n, { value: mem(), configurable: true }); } catch(e) {} }
  });
})();
