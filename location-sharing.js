// Location sharing preparation: no GPS transmission or Firestore access.
(()=>{'use strict';const $=id=>document.getElementById(id);const status=$('sharing-status');const invite=$('sharing-invite');const phone=$('sharing-phone');const base=new URL('./',location.href).href;
invite.addEventListener('click',()=>{const digits=phone.value.trim().replace(/[^0-9]/g,'');if(!/^\d{8,15}$/.test(digits)){status.textContent='Enter a valid international phone number including country code (e.g. 65XXXXXXXX).';return}const msg='You are invited to SG Vehicle Monitor Pro. You decide whether to share your own location; signing in does not share GPS. Live sharing is not yet enabled: '+base;window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');status.textContent='WhatsApp invitation prepared. No location data has been transmitted.'});
phone.addEventListener('input',()=>{status.textContent='Phone number stays in this browser and is only used to prepare a WhatsApp message.'});
$('sharing-start').addEventListener('click',()=>{status.textContent='Location sharing remains disabled until approved-viewer consent, secure rules and participant limits are implemented and tested.'});
$('sharing-stop').addEventListener('click',()=>{status.textContent='No remote sharing session is active. Use Stop GPS above to stop local location tracking.'});
})();
