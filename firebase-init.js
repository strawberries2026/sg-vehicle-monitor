// Firebase Auth v1.5.2. No location uploads: Firestore remains deny-all.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut,getIdTokenResult} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
const firebaseConfig={apiKey:'AIzaSyC1AQ2LvmC7S4mG_tnJt8LRhTo1bjzXitA',authDomain:'sg-vehicle-monitor-pro.firebaseapp.com',projectId:'sg-vehicle-monitor-pro',storageBucket:'sg-vehicle-monitor-pro.firebasestorage.app',messagingSenderId:'254316068234',appId:'1:254316068234:web:4dc2f6968d4a97faafdc73'};
const byId = id => document.getElementById(id);
const authStatus = byId('auth-status'), login = byId('google-login'), logout = byId('google-logout');
const check = byId('session-check'), health = byId('session-health');
try {
 const app = initializeApp(firebaseConfig), auth = getAuth(app);
 auth.useDeviceLanguage();
 window.sgVehicleFirebase = {connected: true, projectId: firebaseConfig.projectId, sharingEnabled: false};
 const provider = new GoogleAuthProvider();
 provider.setCustomParameters({prompt: 'select_account'});
 let generation = 0, checking = false, lastCheck = 0;
 function controls() {
  login.hidden = !!auth.currentUser;
  logout.hidden = !auth.currentUser;
  check.disabled = !auth.currentUser || checking;
 }
 async function checkSession() {
  const user = auth.currentUser;
  if (!user || checking) return;
  const run = generation;
  checking = true;
  controls();
  health.textContent = 'Session refresh: checking Firebase…';
  let timer;
  try {
   // Force a network refresh; do not display, log or persist the returned token.
   const result = await Promise.race([
    getIdTokenResult(user, true),
    new Promise((_, reject) => { timer = setTimeout(() => reject({code: 'auth/network-timeout'}), 15000); })
   ]);
   if (generation !== run || auth.currentUser !== user) return;
   lastCheck = Date.now();
   const expires = new Date(result.expirationTime);
   health.textContent = 'Session refresh verified at ' + new Date(lastCheck).toLocaleTimeString('en-SG', {timeZone: 'Asia/Singapore'}) +
    (Number.isFinite(expires.getTime()) ? ' · Token expires ' + expires.toLocaleTimeString('en-SG', {timeZone: 'Asia/Singapore'}) : '') + '.';
  } catch (error) {
   if (generation !== run || auth.currentUser !== user) return;
   lastCheck = Date.now();
   const code = typeof error?.code === 'string' ? error.code : 'auth/check-failed';
   health.textContent = 'Session refresh not verified: ' + code + '. ' +
    (code.includes('network') ? 'Check your connection and retry.' : 'Try signing out and signing in again.');
  } finally {
   clearTimeout(timer);
   if (generation === run) { checking = false; controls(); }
  }
 }
 onAuthStateChanged(auth, user => {
  generation++;
  checking = false;
  lastCheck = 0;
  window.sgVehicleFirebase.currentUserEmail = user?.email || null;
  window.dispatchEvent(new Event('sg-auth-changed'));
  authStatus.textContent = user ? 'Signed in: ' + (user.displayName || user.email || 'Google account') : 'Not signed in';
  health.textContent = user ? 'Session refresh: not checked.' : 'Session refresh: sign in to check.';
  login.disabled = false;
  controls();
  if (user) void checkSession();
 });
 check.addEventListener('click', checkSession);
 document.addEventListener('visibilitychange', () => {
  if (!document.hidden && auth.currentUser && Date.now() - lastCheck > 5 * 60000) void checkSession();
 });
 getRedirectResult(auth).catch(error => {
  authStatus.textContent = 'Sign-in could not finish: ' + error.code + '. Try Chrome browser.';
 });
 login.addEventListener('click', async () => {
  login.disabled = true;
  authStatus.textContent = 'Opening Google sign-in…';
  try { await signInWithPopup(auth, provider); }
  catch (error) {
   if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
    try { await signInWithRedirect(auth, provider); return; }
    catch (redirectError) { authStatus.textContent = 'Sign-in failed: ' + redirectError.code; }
   } else {
    authStatus.textContent = 'Sign-in failed: ' + error.code + (error.code === 'auth/unauthorized-domain' ? ' — check authorised domains.' : '');
   }
  } finally { login.disabled = false; }
 });
 logout.addEventListener('click', async () => {
  logout.disabled = true;
  try { await signOut(auth); }
  catch (error) { authStatus.textContent = 'Sign-out failed: ' + error.code; }
  finally { logout.disabled = false; }
 });
 const status = byId('sharing-status');
 if (status) status.textContent = 'Google sign-in available. Live location sharing is disabled.';
} catch {
 authStatus.textContent = 'Google sign-in unavailable. Reload online; public traffic features remain available.';
 health.textContent = 'Session refresh unavailable.';
 login.disabled = true;
 check.disabled = true;
}
