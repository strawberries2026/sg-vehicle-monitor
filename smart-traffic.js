// Local-only nearby incident advisory. No automatic navigation or location uploads.
(()=>{'use strict';const $=id=>document.getElementById(id),list=$('smart-alert-list'),status=$('smart-alert-status');if(!list||!status)return;let pos=null,incidents=[],stamp=null;const rad=Math.PI/180;function distance(a,b,c,d){const x=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;return 12742*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}function quality(){const e=$('smart-gps-quality');if(!pos){e.textContent='GPS quality: unavailable';return}const age=Math.round((Date.now()-pos.at)/1000),accuracy=pos.accuracy;e.textContent='GPS quality: '+(age>120?'⚠️ Stale':accuracy<=30?'Good':accuracy<=100?'Moderate':'Poor')+' · ±'+Math.round(accuracy)+' m · '+age+' sec old';}function check(){list.replaceChildren();quality();if(!pos||Date.now()-pos.at>120000){status.textContent='Location unavailable or stale. Use Locate me or Start GPS first.';return}if(!stamp||Date.now()-Date.parse(stamp)>45*60000){status.textContent='Traffic incident feed is missing or older than 45 minutes. Cannot provide a current advisory.';return}const radius=Number($('traffic-radius').value),near=incidents.map(i=>({...i,km:distance(pos.lat,pos.lng,Number(i.Latitude),Number(i.Longitude))})).filter(i=>Number.isFinite(i.km)&&i.km<=radius).sort((a,b)=>a.km-b.km).slice(0,12);status.textContent=near.length?near.length+' reported incident(s) within '+radius+' km of phone location. Not necessarily ahead or on your route.':'No reported incidents within '+radius+' km in the current snapshot. This does not guarantee a clear road.';for(const i of near){const p=document.createElement('p');p.className='incident-item';p.textContent=(i.Type||'Incident')+' · '+i.km.toFixed(1)+' km away · '+(i.Message||'No details');list.append(p)}}window.addEventListener('sg-gps-update',e=>{pos=e.detail;quality()});window.addEventListener('sg-incidents-update',e=>{incidents=e.detail.items||[];stamp=e.detail.updated_at});$('traffic-check').addEventListener('click',check);$('route-open').addEventListener('click',()=>{const destination=$('route-destination').value.trim();if(!destination){status.textContent='Enter a destination before opening route options.';return}const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('destination',destination);url.searchParams.set('travelmode','driving');if(pos&&Date.now()-pos.at<120000&&pos.accuracy<=100)url.searchParams.set('origin',pos.lat+','+pos.lng);window.open(url.toString(),'_blank','noopener,noreferrer')});setInterval(quality,15000);})();


// Destination shortcuts contain only user-entered text; GPS coordinates are never saved.
(() => {
 'use strict';
 const $ = id => document.getElementById(id), key = 'sg-vehicle-destinations-v1';
 const output = $('destination-list'), status = $('destination-status');
 let destinations = [];
 try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) destinations = saved.filter(item => item && typeof item.label === 'string' && typeof item.destination === 'string' && item.label.trim() && item.destination.trim() && item.label.length <= 32 && item.destination.length <= 150).slice(0, 6);
 } catch {}
 function persist() {
  try { localStorage.setItem(key, JSON.stringify(destinations)); return true; }
  catch { status.textContent = 'Storage unavailable. Changes will last for this page session only.'; return false; }
 }
 function render() {
  output.replaceChildren();
  destinations.forEach((item, index) => {
   const row = document.createElement('div'); row.className = 'controls';
   const label = document.createElement('span'); label.textContent = item.label + ' · ' + item.destination;
   const use = document.createElement('button'); use.type = 'button'; use.className = 'secondary'; use.textContent = 'Use ' + item.label;
   use.addEventListener('click', () => {
    $('route-destination').value = item.destination;
    status.textContent = item.label + ' selected. Tap Open route options in Google Maps to navigate.';
    $('route-open').focus({preventScroll: true});
   });
   const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'secondary'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove shortcut ' + item.label);
   remove.addEventListener('click', () => {
    destinations.splice(index, 1); if (persist()) status.textContent = 'Shortcut removed from this browser.';
    render(); $('destination-save').focus({preventScroll: true});
   });
   row.append(label, use, remove); output.append(row);
  });
 }
 $('destination-save').addEventListener('click', () => {
  const label = $('destination-label').value.trim(), destination = $('route-destination').value.trim();
  if (!label || !destination) { status.textContent = 'Enter a destination above and a shortcut name.'; return; }
  if (label.length > 32 || destination.length > 150) { status.textContent = 'Use a name up to 32 characters and destination up to 150 characters.'; return; }
  const index = destinations.findIndex(item => item.label.toLowerCase() === label.toLowerCase());
  if (index < 0 && destinations.length >= 6) { status.textContent = 'Six shortcuts are saved. Remove one before adding another.'; return; }
  if (index >= 0) destinations[index] = {label, destination}; else destinations.push({label, destination});
  if (persist()) status.textContent = 'Destination saved in this browser. Use the same name to update it.';
  $('destination-label').value = ''; render();
 });
 render();
})();
