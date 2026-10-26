// Firebase Auth v1.5.2. No location uploads: Firestore remains deny-all.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
const firebaseConfig={apiKey:'AIzaSyC1AQ2LvmC7S4mG_tnJt8LRhTo1bjzXitA',authDomain:'sg-vehicle-monitor-pro.firebaseapp.com',projectId:'sg-vehicle-monitor-pro',storageBucket:'sg-vehicle-monitor-pro.firebasestorage.app',messagingSenderId:'254316068234',appId:'1:254316068234:web:4dc2f6968d4a97faafdc73'};
const byId=id=>document.getElementById(id),authStatus=byId('auth-status'),login=byId('google-login'),logout=byId('google-logout');
try{
 const app=initializeApp(firebaseConfig),auth=getAuth(app);auth.useDeviceLanguage();
 window.sgVehicleFirebase={connected:true,projectId:firebaseConfig.projectId,sharingEnabled:false};
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 onAuthStateChanged(auth,user=>{authStatus.textContent=user?'Signed in: '+(user.displayName||user.email||'Google account'):'Not signed in';login.hidden=!!user;logout.hidden=!user;});
 getRedirectResult(auth).catch(e=>{authStatus.textContent='Sign-in could not finish: '+e.code+'. Try Chrome browser.';});
 login.addEventListener('click',async()=>{login.disabled=true;authStatus.textContent='Opening Google sign-in…';try{await signInWithPopup(auth,provider);}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){try{await signInWithRedirect(auth,provider);return}catch(x){authStatus.textContent='Sign-in failed: '+x.code;}}else{authStatus.textContent='Sign-in failed: '+e.code+(e.code==='auth/unauthorized-domain'?' — check authorised domains.':'');}}finally{login.disabled=false;}});
 logout.addEventListener('click',async()=>{try{await signOut(auth)}catch(e){authStatus.textContent='Sign-out failed: '+e.code}});
 const el=byId('sharing-status');if(el)el.textContent='Google sign-in available. Live location sharing is still disabled until secure consent and database rules are implemented.';
}catch(e){console.error('Firebase auth setup failed',e);authStatus.textContent='Firebase unavailable. Please reload online.';}
