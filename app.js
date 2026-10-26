const map=L.map('map').setView([1.3521,103.8198],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);let marker,circle,watchId=null,points=[],meters=0;const line=L.polyline([],{color:'#10bfa8',weight:4}).addTo(map),el=id=>document.getElementById(id);function msg(s){el('status').textContent=s}function hav(a,b){const r=Math.PI/180,dlat=(b[0]-a[0])*r,dlon=(b[1]-a[1])*r,x=Math.sin(dlat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dlon/2)**2;return 12742000*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}function update(p){const {latitude:lat,longitude:lng,accuracy}=p.coords;if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const ll=[lat,lng];if(!marker)marker=L.marker(ll).addTo(map).bindPopup('Your device position');else marker.setLatLng(ll);if(!circle)circle=L.circle(ll,{radius:accuracy,color:'#10bfa8',fillOpacity:.08}).addTo(map);else circle.setLatLng(ll).setRadius(accuracy);if(accuracy<=100&&points.length){const delta=hav(points[points.length-1],ll);if(delta>8&&delta<1000)meters+=delta}points.push(ll);if(points.length>1000)points.shift();line.setLatLngs(points);map.setView(ll,Math.max(map.getZoom(),15));el('gps').textContent='Active';el('pos').textContent=lat.toFixed(4)+', '+lng.toFixed(4);el('accuracy').textContent='±'+Math.round(accuracy)+' m';el('distance').textContent=(meters/1000).toFixed(2)+' km';msg('Updated '+new Date().toLocaleTimeString()+' · '+points.length+' points (distance approximate)')}function fail(e){msg('GPS unavailable: '+e.message);el('gps').textContent='Unavailable'}function supported(){if(!navigator.geolocation){msg('GPS not supported');return false}if(!isSecureContext){msg('GPS requires HTTPS');return false}return true}el('locate').onclick=()=>{if(supported())navigator.geolocation.getCurrentPosition(update,fail,{enableHighAccuracy:true,timeout:15000,maximumAge:0})};el('watch').onclick=()=>{if(!supported()||watchId!==null)return;watchId=navigator.geolocation.watchPosition(update,fail,{enableHighAccuracy:true,maximumAge:5000,timeout:20000});msg('GPS requested. Keep this page open.')};el('stop').onclick=()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;el('gps').textContent='Stopped';msg('GPS tracking stopped')};el('clear').onclick=()=>{points=[];meters=0;line.setLatLngs([]);if(marker){map.removeLayer(marker);marker=null}if(circle){map.removeLayer(circle);circle=null}el('pos').textContent='—';el('accuracy').textContent='—';el('distance').textContent='0.00 km';msg('Session journey cleared')};
const camLayer=L.layerGroup().addTo(map);let loading=false;
async function loadCameras(){
 if(loading)return;
 loading=true;
 const status=el('camera-status');
 status.textContent='Connecting to official camera feed…';
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('https://api.data.gov.sg/v1/transport/traffic-images',{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  const cameras=Array.isArray(json.items)?json.items.flatMap(item=>item.cameras||[]):[];
  if(!cameras.length)throw Error('No cameras returned by the API');
  const grid=el('camera-grid');grid.replaceChildren();camLayer.clearLayers();
  let placed=0;
  for(const cam of cameras){
   if(typeof cam.image!=='string'||!cam.image.startsWith('https://'))continue;
   const card=document.createElement('article');card.className='camera';
   const img=document.createElement('img');img.src=cam.image;img.loading='lazy';img.alt='Traffic camera '+cam.camera_id;
   const caption=document.createElement('p');caption.textContent='Camera '+cam.camera_id;
   card.append(img,caption);grid.append(card);
   const loc=cam.location;
   if(loc&&Number.isFinite(+loc.latitude)&&Number.isFinite(+loc.longitude)){
    const popup=document.createElement('div');popup.textContent='Camera '+cam.camera_id;
    const pi=document.createElement('img');pi.src=cam.image;pi.alt='Camera '+cam.camera_id;pi.style.width='200px';popup.append(document.createElement('br'),pi);
    L.marker([+loc.latitude,+loc.longitude]).addTo(camLayer).bindPopup(popup);placed++;
   }
  }
  if(!grid.children.length)throw Error('No usable camera images');
  status.textContent=grid.children.length+' camera images available · '+placed+' map markers · Refreshed '+new Date().toLocaleTimeString();
 }catch(error){
  status.textContent='Camera feed unavailable: '+(error.name==='AbortError'?'Request timed out':error.message)+'. Please retry.';
 }finally{clearTimeout(timeout);loading=false}
}
el('refresh-cameras').addEventListener('click',loadCameras);
loadCameras();
setInterval(()=>{if(!document.hidden)loadCameras()},60000);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});