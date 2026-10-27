const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
class Element {
 constructor(){this.value='';this.textContent='';this.children=[];this.events={};this.attrs={};this.hidden=false;this.disabled=false;this.checked=false;this.classList={toggle(){}};this.style={};}
 addEventListener(event, fn){(this.events[event] ||= []).push(fn);}
 async fire(event){for(const fn of this.events[event] || []) await fn({target:this});}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(key,value){this.attrs[key]=value;}
 getAttribute(key){return this.attrs[key] || null;}
 focus(){}
}
function harness(storageFails=false){
 const elements=new Map(), stored=new Map(), events={};
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const document={getElementById:get,createElement:()=>new Element(),createTextNode:text=>text,hidden:false,addEventListener:(name,fn)=>{events[name]=fn;}};
 const winEvents={};
 const window={addEventListener:(name,fn)=>{(winEvents[name] ||= []).push(fn);},dispatchEvent:event=>{for(const fn of winEvents[event.type] || [])fn(event);},open:()=>{throw Error('Unexpected external navigation');}};
 const context={document,window,localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>{if(storageFails)throw Error('blocked');stored.set(key,value);}},console,Date,URL,Event,CustomEvent:class extends Event{constructor(name,options){super(name);this.detail=options.detail;}},setInterval(){},setTimeout,clearTimeout,AbortController,navigator:{},location:{href:'https://example.test/'},isSecureContext:true};
 vm.createContext(context);
 return {get,stored,context,window,run:name=>vm.runInContext(read(name),context)};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('destinations save, select, update, remove and cap at six without opening Maps',async()=>{
 const h=harness();h.run('smart-traffic.js');
 h.get('route-destination').value='Changi Airport';h.get('destination-label').value='Airport';await h.get('destination-save').fire('click');
 assert.equal(JSON.parse(h.stored.get('sg-vehicle-destinations-v1'))[0].destination,'Changi Airport');
 h.get('route-destination').value='';await h.get('destination-list').children[0].children[1].fire('click');assert.equal(h.get('route-destination').value,'Changi Airport');
 h.get('destination-label').value='Airport';h.get('route-destination').value='Terminal 3';await h.get('destination-save').fire('click');assert.equal(h.get('destination-list').children.length,1);
 for(let i=0;i<6;i++){h.get('destination-label').value='Place '+i;await h.get('destination-save').fire('click');}
 assert.equal(h.get('destination-list').children.length,6);assert.match(h.get('destination-status').textContent,/Six shortcuts/);
 await h.get('destination-list').children[0].children[2].fire('click');assert.equal(JSON.parse(h.stored.get('sg-vehicle-destinations-v1')).length,5);
});
test('storage denial keeps destination controls usable and reports session-only saving',async()=>{
 const h=harness(true);h.run('smart-traffic.js');h.get('destination-label').value='Airport';h.get('route-destination').value='Changi';await h.get('destination-save').fire('click');
 assert.match(h.get('destination-status').textContent,/session only/);assert.equal(h.get('destination-list').children.length,1);
});
function authHarness(){
 const h=harness();const auth={currentUser:null,useDeviceLanguage(){}};let observer,mode='success',resolveRefresh,calls=0;
 Object.assign(h.context,{initializeApp:()=>({}),getAuth:()=>auth,GoogleAuthProvider:class{setCustomParameters(){}},onAuthStateChanged:(_,fn)=>{observer=fn;fn(null);},getRedirectResult:()=>Promise.resolve(null),signInWithPopup:async()=>{},signInWithRedirect:async()=>{},signOut:async()=>{auth.currentUser=null;observer(null);},getIdTokenResult:(user,force)=>{calls++;assert.equal(force,true);if(mode==='pending')return new Promise(resolve=>{resolveRefresh=resolve;});if(mode==='failure')return Promise.reject({code:'auth/network-request-failed'});return Promise.resolve({expirationTime:new Date(Date.now()+3600000).toISOString()});}});
 vm.runInContext(read('firebase-init.js').replace(/^import .*;$/gm,''),h.context);
 return {...h,auth,setMode:value=>{mode=value;},signIn:()=>{auth.currentUser={email:'test@example.test',displayName:'Test'};observer(auth.currentUser);},finish:()=>resolveRefresh({expirationTime:new Date().toISOString()}),calls:()=>calls};
}
test('session check forces a refresh, reports network errors and works after retry',async()=>{
 const h=authHarness();assert.equal(h.get('session-check').disabled,true);h.signIn();await flush();assert.match(h.get('session-health').textContent,/verified at/);assert.equal(h.calls(),1);
 h.setMode('failure');await h.get('session-check').fire('click');assert.match(h.get('session-health').textContent,/not verified.*network-request-failed/);assert.equal(h.get('session-check').disabled,false);
 h.setMode('success');await h.get('session-check').fire('click');assert.match(h.get('session-health').textContent,/verified at/);
});
test('an old refresh cannot overwrite signed-out session state',async()=>{
 const h=authHarness();h.setMode('pending');h.signIn();await h.get('google-logout').fire('click');h.finish();await flush();assert.equal(h.get('session-health').textContent,'Session refresh: sign in to check.');assert.equal(h.get('session-check').disabled,true);
});
test('favourite cameras survive reload and combine with search filters',async()=>{
 const h=harness();h.get('camera-area').value='all';h.get('incident-filter').value='all';
 const layer=()=>new Proxy({onAdd:null},{get:(o,k)=>k in o?o[k]:(()=>layer())});
 h.context.L={map:layer,tileLayer:layer,polyline:layer,layerGroup:layer,control:()=>({onAdd:null,addTo(){}}),marker:layer,circle:layer,circleMarker:layer,DomUtil:{create:()=>new Element()},DomEvent:{disableClickPropagation(){}}};
 h.context.fetch=async url=>({ok:true,json:async()=>String(url).includes('traffic-images')?{items:[{timestamp:new Date().toISOString(),cameras:[{camera_id:'2701',image:'https://example.test/cam.jpg',location:{latitude:1.45,longitude:103.8}},{camera_id:'4703',image:'https://example.test/cam2.jpg',location:{latitude:1.3,longitude:103.7}}]}]}:{updated_at:new Date().toISOString(),items:[]}});
 h.run('app.js');await flush();
 await h.get('camera-grid').children[0].children[4].children[1].fire('click');assert.equal(JSON.parse(h.stored.get('sg-vehicle-favourite-cameras-v1'))[0],'2701');
 h.get('camera-favourites-only').checked=true;await h.get('camera-favourites-only').fire('change');assert.equal(h.get('camera-grid').children.length,1);assert.match(h.get('camera-grid').children[0].children[1].textContent,/2701/);
 h.get('camera-search').value='does-not-exist';await h.get('camera-search').fire('input');assert.match(h.get('camera-grid').children[0].textContent,/No favourite cameras match/);
 const next=harness();for(const [key,value] of h.stored)next.stored.set(key,value);next.get('camera-area').value='all';next.context.L=h.context.L;next.context.fetch=h.context.fetch;next.run('app.js');await flush();assert.match(next.get('camera-grid').children[0].children[4].children[1].textContent,/Saved/);
});
