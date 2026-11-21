// Shared app state, constants and small helpers. Loaded first in the app script.

function ic(n){ return '<svg aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
var REDUCE = false;
try { REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var PREMIUM_PANELS = ['rig','tippet','log','stats','chat'];
var MORE_PANELS = ['log','hatch','rig','tippet','stats','chat'];
var PANELS = ['explore','recommend','flybox','knowledge','hatch','rig','tippet','log','stats','chat'];

var currentRegion = 'dullstroom';
var currentPanel = 'explore';
var pressureVal = 'rising';
var flyboxFilter = 'all';
var lastRec = null;
var starRating = 0;
var catchEntries = [];
var chartFish = null, chartFlies = null, chartRegions = null;
var lastWeatherData = null;
var currentUser = null;
var billingCycle = 'monthly';
var selectedPlan = 'pro';
var chatHistory = [];
var _imgLoadQueue = [];
var lastFocus = null;
var toastTimer = null;

try { catchEntries = JSON.parse(localStorage.getItem('flyguide_log') || '[]'); } catch(e) { catchEntries = []; }

// cubic-bezier easing for JS driven motion (the map camera)
function bezier(x1,y1,x2,y2){
  function A(a,b){return 1-3*b+3*a;} function B(a,b){return 3*b-6*a;} function C(a){return 3*a;}
  function calc(t,a,b){return ((A(a,b)*t+B(a,b))*t+C(a))*t;}
  function slope(t,a,b){return 3*A(a,b)*t*t+2*B(a,b)*t+C(a);}
  return function(x){ if (x<=0) return 0; if (x>=1) return 1; var t=x; for (var i=0;i<8;i++){ var s=slope(t,x1,x2); if (Math.abs(s)<1e-6) break; t -= (calc(t,x1,x2)-x)/s; } return calc(t,y1,y2); };
}
var EASE_IN_OUT = bezier(0.77,0,0.175,1);
var EASE_OUT = bezier(0.23,1,0.32,1);
