import {describePosition} from './viewer-display.mjs';
// Viewer must explicitly request each refresh; no background polling.
// Firebase credentials are passed for one request and never persisted.
export function createViewerController({api}) {
 if(typeof api?.viewPosition!=='function')throw new TypeError('Viewer API required');
 let busy=false;
 async function refresh(shareId,idToken,now=Math.floor(Date.now()/1000)){
  if(busy)throw new Error('Location refresh already in progress');
  if(typeof idToken!=='string'||!idToken)throw new Error('Viewer sign-in required');
  busy=true;
  try{
   const response=await api.viewPosition(shareId,idToken);
   return describePosition(response,now);
  }finally{busy=false;}
 }
 return Object.freeze({refresh});
}
