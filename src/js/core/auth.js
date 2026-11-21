// Accounts, plans and paywall. Local demo auth (see REPORT.md, known limitations).

function loadUser() {
 // Try localStorage first (remembered sessions)
 try { var u = localStorage.getItem('fg_user'); if (u) currentUser = JSON.parse(u); } catch(e) { currentUser = null; }
 // Fall back to sessionStorage (non-remembered, active tab only)
 if (!currentUser) {
   try { var s = sessionStorage.getItem('fg_session'); if (s) currentUser = JSON.parse(s); } catch(e) {}
 }
 // Always enforce owner plan on load
 if (currentUser && currentUser.email === OWNER_EMAIL && currentUser.plan !== 'owner') {
   currentUser.plan = 'owner';
   saveUser();
   try {
     var stored = JSON.parse(localStorage.getItem('fg_users') || '{}');
     if (stored[OWNER_EMAIL]) { stored[OWNER_EMAIL].plan = 'owner'; localStorage.setItem('fg_users', JSON.stringify(stored)); }
   } catch(ex) {}
 }
}

function saveUser() {
 try { localStorage.setItem('fg_user', JSON.stringify(currentUser)); } catch(e) {}
}

function isProUser() {
  if (!currentUser) return false;
  // Owner always has full access — change email to yours
  if (currentUser.email === OWNER_EMAIL) return true;
  if (currentUser.plan === 'owner') return true;
  if (currentUser.plan === 'pro_m' || currentUser.plan === 'pro_y') return true;
  if (currentUser.plan === 'trial') {
    var days = (new Date() - new Date(currentUser.trialStart)) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }
  return false;
}

function trialDaysLeft() {
 if (!currentUser || currentUser.plan !== 'trial') return 0;
 return Math.max(0, Math.ceil(7 - (new Date() - new Date(currentUser.trialStart)) / (1000 * 60 * 60 * 24)));
}

function canUseRegion(k){ return isProUser() || PREMIUM_REGIONS.indexOf(k) === -1; }

function switchAuthTab(tab, el) {
 document.getElementById('auth-form-login').style.display = tab === 'login' ? 'block' : 'none';
 document.getElementById('auth-form-signup').style.display = tab === 'signup' ? 'block' : 'none';
 var tabs = document.querySelectorAll('.auth-tab');
 for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
 el.classList.add('active');
 document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
 var el = document.getElementById('auth-error');
 el.textContent = msg; el.style.display = msg ? 'block' : 'none';
}

function handleLogin() {
 var email = document.getElementById('login-email').value.trim();
 var pw = document.getElementById('login-password').value;
 var remEl = document.getElementById('remember-me');
 var remember = remEl ? remEl.checked : true;
 if (!email || !pw) { showAuthError('Please enter your email and password.'); return; }
 // REPLACE with Supabase: supabase.auth.signInWithPassword({email, password})
 var stored = {};
 try { stored = JSON.parse(localStorage.getItem('fg_users') || '{}'); } catch(e) {}
 if (!stored[email]) { showAuthError('No account found with that email. Please create an account.'); return; }
 if (stored[email].password !== btoa(pw)) { showAuthError('Incorrect password. Please try again.'); return; }
 currentUser = stored[email];
 // Always enforce owner plan regardless of what was previously stored
 if (currentUser.email === OWNER_EMAIL) {
   currentUser.plan = 'owner';
   stored[email].plan = 'owner';
   try { localStorage.setItem('fg_users', JSON.stringify(stored)); } catch(e) {}
 }
 // Save last-used email for pre-filling next time
 try { localStorage.setItem('fg_last_email', email); } catch(e) {}
 if (remember) {
   // Persist session across browser restarts
   saveUser();
 } else {
   // Session only — clears when browser closes
   try { sessionStorage.setItem('fg_session', JSON.stringify(currentUser)); localStorage.removeItem('fg_user'); } catch(e) { saveUser(); }
 }
 afterAuth();
}

function handleSignup() {
 var name = document.getElementById('signup-name').value.trim();
 var email = document.getElementById('signup-email').value.trim();
 var pw = document.getElementById('signup-password').value;
 if (!name || !email || !pw) { showAuthError('Please fill in all fields.'); return; }
 if (pw.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
 if (email.indexOf('@') === -1) { showAuthError('Please enter a valid email address.'); return; }
 // REPLACE with Supabase: supabase.auth.signUp({email, password, options:{data:{name}}})
 var stored = {};
 try { stored = JSON.parse(localStorage.getItem('fg_users') || '{}'); } catch(e) {}
 if (stored[email]) { showAuthError('An account with this email already exists. Please sign in.'); return; }
 // Detect owner email and assign permanent full access
 var plan = (email === OWNER_EMAIL) ? 'owner' : 'trial';
 var newUser = { name:name, email:email, password:btoa(pw), plan:plan, trialStart:new Date().toISOString(), joined:new Date().toISOString() };
 stored[email] = newUser;
 try { localStorage.setItem('fg_users', JSON.stringify(stored)); } catch(e) {}
 currentUser = newUser; saveUser();
 try { localStorage.setItem('fg_last_email', email); } catch(e) {}
 afterAuth();
}

function continueAsGuest() {
 currentUser = { name:'Guest', email:'', plan:'free', guest:true };
 saveUser();
 document.getElementById('auth-overlay').style.display = 'none';
 updateAppForUser();
 showToast('Continuing as guest — limited access');
}

function forgotPassword() {
 var email = document.getElementById('login-email').value.trim();
 if (!email) { showAuthError('Enter your email address above first.'); return; }
 // REPLACE with Supabase: supabase.auth.resetPasswordForEmail(email) 
 showAuthError('');
 showToast('Password reset link sent to ' + email);
}

function persistUserRecord(){
  if (!currentUser || !currentUser.email) return;
  try { var st = JSON.parse(localStorage.getItem('fg_users') || '{}'); if (st[currentUser.email]){ st[currentUser.email].plan = currentUser.plan; st[currentUser.email].planChosen = !!currentUser.planChosen; st[currentUser.email].trialStart = currentUser.trialStart; localStorage.setItem('fg_users', JSON.stringify(st)); } } catch(e) {}
}

function afterAuth(){
  document.getElementById('auth-overlay').style.display = 'none';
  if (!currentUser){ updateAppForUser(); return; }
  if (currentUser.email === OWNER_EMAIL){ currentUser.plan = 'owner'; saveUser(); updateAppForUser(); return; }
  if (currentUser.plan === 'trial' && !currentUser.planChosen){ selectPlan('pro'); showPlanScreen(); }
  updateAppForUser();
}

function showPlanScreen() {
 document.getElementById('plan-screen').style.display = 'block';
 document.getElementById('plan-screen').scrollTop = 0;
 try { setTimeout(function(){ var b = document.getElementById('billing-monthly'); if (b) b.focus({preventScroll:true}); }, 30); } catch(e) {}
}

function closePlanScreen(){ document.getElementById('plan-screen').style.display = 'none'; if (currentUser && !currentUser.guest){ currentUser.planChosen = true; saveUser(); persistUserRecord(); } updateAppForUser(); }

function selectPlan(plan){
  selectedPlan = plan;
  document.getElementById('plan-free').classList.toggle('selected', plan === 'free');
  document.getElementById('plan-pro').classList.toggle('selected', plan === 'pro');
  var btn = document.getElementById('plan-confirm-btn');
  btn.textContent = plan === 'free' ? 'Continue with the free plan' : 'Start 7 day free trial';
  btn.className = 'btn btn-block plan-confirm ' + (plan === 'free' ? 'btn-secondary' : 'btn-primary');
}

function setBilling(cycle, el){
  billingCycle = cycle;
  document.querySelectorAll('.plan-toggle-btn').forEach(function(b){ b.classList.toggle('active', b === el); });
  document.getElementById('pro-price').innerHTML = cycle === 'annual' ? 'R749 <span>/ year</span>' : 'R89 <span>/ month</span>';
  document.getElementById('plan-saving').style.display = cycle === 'annual' ? 'block' : 'none';
}

function confirmPlan(){
  if (currentUser){ currentUser.planChosen = true; }
  if (selectedPlan === 'free'){
    if (currentUser){ currentUser.plan = 'free'; saveUser(); persistUserRecord(); }
    document.getElementById('plan-screen').style.display = 'none';
    updateAppForUser(); showToast('Continuing with the free plan');
    return;
  }
  simulateStripePayment();
  persistUserRecord();
}

function simulateStripePayment() {
 if (currentUser) {
   currentUser.plan = 'trial';
   currentUser.trialStart = new Date().toISOString();
   currentUser.pendingPlan = billingCycle === 'annual' ? 'pro_y' : 'pro_m';
   saveUser();
 }
 // If real Stripe links are configured, redirect to Stripe checkout
 if (STRIPE_MONTHLY_LINK !== 'https://buy.stripe.com/YOUR_MONTHLY_LINK') {
   var link = (billingCycle === 'annual') ? STRIPE_ANNUAL_LINK : STRIPE_MONTHLY_LINK;
   window.location.href = link;
   return;
 }
 // Demo mode — simulate locally until Stripe is set up
 document.getElementById('plan-screen').style.display = 'none';
 window.scrollTo(0, 0);
 updateAppForUser();
 showToast('7-day free trial started — enjoy FlyGuide Pro!');
}

function checkStripeReturn() {
 try {
   var search = window.location.search;
   if (search.indexOf('payment=success') !== -1 || search.indexOf('session_id=') !== -1) {
     loadUser();
     if (currentUser && currentUser.pendingPlan) {
       currentUser.plan = currentUser.pendingPlan;
       currentUser.trialStart = new Date().toISOString();
       delete currentUser.pendingPlan;
       saveUser();
       var stored = {};
       try { stored = JSON.parse(localStorage.getItem('fg_users') || '{}'); } catch(e) {}
       if (currentUser.email && stored[currentUser.email]) {
         stored[currentUser.email].plan = currentUser.plan;
         try { localStorage.setItem('fg_users', JSON.stringify(stored)); } catch(e) {}
       }
       setTimeout(function() { showToast('Payment confirmed — welcome to FlyGuide Pro!'); }, 1000);
     }
     if (window.history && window.history.replaceState) {
       window.history.replaceState({}, '', window.location.pathname);
     }
   }
 } catch(e) {}
}

function initAuth() {
 checkStripeReturn();
 loadUser();
 // Always enforce owner plan on app start
 if (currentUser && currentUser.email === OWNER_EMAIL) {
   currentUser.plan = 'owner';
   saveUser();
 }
 if (currentUser) {
   document.getElementById('auth-overlay').style.display = 'none';
   updateAppForUser();
 } else {
   document.getElementById('auth-overlay').style.display = 'block';
   document.getElementById('auth-overlay').scrollTop = 0;
   // Pre-fill last used email
   try {
     var last = localStorage.getItem('fg_last_email');
     if (last) { var eEl = document.getElementById('login-email'); if (eEl) eEl.value = last; }
   } catch(e) {}
   applyPaywalls();
 }
}

function accountButton(){
  if (!currentUser || currentUser.guest){ var o = document.getElementById('auth-overlay'); o.style.display = 'block'; o.scrollTop = 0; switchAuthTab('login', document.getElementById('auth-tab-login')); return; }
  showAccountMenu();
}

function showAccountMenu(){
  if (!currentUser) return;
  var isPro = isProUser(), planLabel = 'Free plan';
  if (currentUser.plan === 'owner') planLabel = 'Owner · full access';
  else if (currentUser.plan === 'trial'){ var dl = trialDaysLeft(); planLabel = dl > 0 ? 'Pro trial · ' + dl + ' day' + (dl===1?'':'s') + ' left' : 'Trial expired'; }
  else if (currentUser.plan === 'pro_m') planLabel = 'FlyGuide Pro · Monthly';
  else if (currentUser.plan === 'pro_y') planLabel = 'FlyGuide Pro · Annual';
  var h = '<div class="acct-avatar-lg">' + (currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?') + '</div>';
  h += '<div class="acct-name-lg">' + (currentUser.name || 'Angler') + '</div><div class="acct-email-lg">' + (currentUser.email || '') + '</div><div class="acct-plan-pill">' + planLabel + '</div>';
  if (!isPro && currentUser.plan !== 'owner') h += '<button class="acct-action-btn primary" onclick="closeSheets();showPlanScreen();">Upgrade to FlyGuide Pro</button>';
  h += '<button class="acct-action-btn" onclick="closeSheets();handleLogout();">Sign out</button><button class="acct-action-btn ghost" onclick="closeSheets()">Close</button>';
  document.getElementById('acct-sheet-body').innerHTML = h;
  openSheet('acct-sheet-overlay');
}

function handleLogout(){ confirmSheet('Sign out?', 'You can sign back in anytime.', 'Sign out', doLogout); }

function doLogout(){
  currentUser = null;
  document.getElementById('plan-screen').style.display = 'none';
  closeSheets(true);
  try { localStorage.removeItem('fg_user'); sessionStorage.removeItem('fg_session'); } catch(e) {}
  var o = document.getElementById('auth-overlay'); o.style.display = 'block'; o.scrollTop = 0;
  switchAuthTab('login', document.getElementById('auth-tab-login'));
  ['login-password','signup-password'].forEach(function(id){ document.getElementById(id).value = ''; });
  try { var last = localStorage.getItem('fg_last_email'); if (last) document.getElementById('login-email').value = last; } catch(e) {}
  updateAppForUser();
}

function updateAppForUser(){
  var av = document.getElementById('account-avatar'), chip = document.getElementById('trial-chip');
  if (!currentUser || currentUser.guest){ av.textContent = '?'; av.setAttribute('aria-label','Sign in'); av.title = 'Sign in'; chip.style.visibility = 'hidden'; }
  else {
    av.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'; av.setAttribute('aria-label','Account: ' + (currentUser.name || currentUser.email)); av.title = currentUser.name || '';
    chip.style.visibility = 'visible';
    if (currentUser.plan === 'owner' || currentUser.email === OWNER_EMAIL){ chip.textContent = 'Owner'; chip.style.background = 'var(--forest-tint)'; chip.style.color = 'var(--forest)'; }
    else if (currentUser.plan === 'trial'){ var dl = trialDaysLeft(); chip.textContent = dl > 0 ? 'Pro trial · ' + dl + ' day' + (dl===1?'':'s') + ' left' : 'Trial expired'; chip.style.background = dl > 0 ? 'var(--amber-tint)' : 'var(--rust-tint)'; chip.style.color = dl > 0 ? 'var(--amber)' : 'var(--rust)'; }
    else if (currentUser.plan === 'pro_m' || currentUser.plan === 'pro_y'){ chip.textContent = 'Pro'; chip.style.background = 'var(--forest-tint)'; chip.style.color = 'var(--forest)'; }
    else { chip.textContent = 'Free plan'; chip.style.background = 'var(--surface-3)'; chip.style.color = 'var(--ink-3)'; }
  }
  applyPaywalls();
  if (!canUseRegion(currentRegion)) setRegion('dullstroom', {silent:true});
}

function applyPaywalls(){
  var isPro = isProUser();
  document.querySelectorAll('.pw').forEach(function(b){ b.style.display = isPro ? 'none' : 'flex'; });
  document.querySelectorAll('.pw-content').forEach(function(c){ c.classList.toggle('locked-content', !isPro); });
  ['paywall-log','paywall-stats','paywall-chat'].forEach(function(id){ document.getElementById(id).style.display = isPro ? 'none' : 'flex'; });
  document.getElementById('log-content').classList.toggle('locked-content', !isPro);
  document.getElementById('stats-charts').classList.toggle('locked-content', !isPro);
  document.getElementById('chat-container').style.display = isPro ? 'block' : 'none';
  ['more-pro-log','more-pro-rig','more-pro-tippet','more-pro-stats','more-pro-chat'].forEach(function(id){ var b = document.getElementById(id); if (b) b.style.display = isPro ? 'none' : 'block'; });
  if (MAP.markers.length) renderMapSide(true);
}
