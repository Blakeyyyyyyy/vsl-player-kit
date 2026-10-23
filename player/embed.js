(function(){'use strict';
if(window.VSLKit)return;
const c=window.VSL_CONFIG||{},q=new URLSearchParams(location.search),session=crypto.randomUUID();
const names={autoplay_start:'VSL_Start',unmute_click:'VSL_Unmute',watched_25:'VSL_25',watched_50:'VSL_50',watched_75:'VSL_75',watched_100:'VSL_100',cta_click:'VSL_CTA',form_submit:'Lead'};
const allowed=new Set(['page_view',...Object.keys(names)]),sent=new Set();
window.VSL_EVENTS=[];
function track(event,value){
 if(!allowed.has(event)||sent.has(event))return;
 sent.add(event);
 const row={session_id:session,page:location.pathname.slice(0,500),event,value:Math.min(100,Math.max(0,Number(value)||0)),referrer:document.referrer.slice(0,1000),user_agent:navigator.userAgent.slice(0,1000)};
 for(const k of ['source','medium','campaign','term','content'])row['utm_'+k]=(q.get('utm_'+k)||'').slice(0,200);
 window.VSL_EVENTS.push(row);
 if(c.mock){window.dispatchEvent(new CustomEvent('vsl:supabase-mock',{detail:row}));}
 else fetch(c.url.replace(/\/$/,'')+'/rest/v1/vsl_events',{method:'POST',headers:{apikey:c.anonKey,Authorization:'Bearer '+c.anonKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row),keepalive:true}).then(r=>{if(!r.ok)document.documentElement.dataset.vslAnalytics='failed';}).catch(()=>{document.documentElement.dataset.vslAnalytics='offline';});
 // Never initialize a second pixel or send another PageView. Honour site consent via pixel config.
 if(c.pixel&&typeof window.fbq==='function'&&names[event]&&!(event==='form_submit'&&c.pageOwnsLead)){
  try{window.fbq(event==='form_submit'?'track':'trackCustom',names[event],{vsl_session:session,value:row.value},{eventID:session+':'+event});}catch(error){document.documentElement.dataset.vslPixel='failed';}
 }
}
window.VSLKit={track,formSubmitted:()=>track('form_submit')};
const frame=document.getElementById('vsl-frame');
window.addEventListener('message',e=>{if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow||!e.data||e.data.type!=='vsl-event')return;if(['autoplay_start','unmute_click','watched_25','watched_50','watched_75','watched_100'].includes(e.data.event))track(e.data.event,e.data.value);});
if(frame){const ready=()=>frame.contentWindow.postMessage({type:'vsl-analytics-ready'},location.origin);frame.addEventListener('load',ready);ready();}
document.addEventListener('click',e=>{if(e.target.closest(c.ctaSelector||'a[href^="/register/"]'))track('cta_click');});
track('page_view');
})();
