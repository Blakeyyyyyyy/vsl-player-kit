const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
const source=fs.readFileSync(__dirname+'/../player/embed.js','utf8');
for(const [pixel,owns,hasPixel] of [[true,false,true],[true,true,true],[false,false,true],[true,false,false]]){
 const calls=[],posts=[],listeners={};const w={VSL_CONFIG:{mock:false,url:'https://example.invalid',anonKey:'public-anon',pixel,pageOwnsLead:owns},addEventListener:(e,f)=>listeners[e]=f};if(hasPixel)w.fbq=(...x)=>calls.push(x);
 const context={window:w,location:{search:'?utm_source=test',pathname:'/go/',origin:'https://demo.invalid'},document:{referrer:'',documentElement:{dataset:{}},getElementById:()=>null,addEventListener:()=>{}},navigator:{userAgent:'test'},crypto:webcrypto,URLSearchParams,Set,fetch:(url,opts)=>{posts.push({url,body:JSON.parse(opts.body)});return Promise.resolve({ok:true})}};
 vm.runInNewContext(source,context);for(const e of ['autoplay_start','unmute_click','watched_25','watched_50','watched_75','watched_100','cta_click','form_submit']){w.VSLKit.track(e);w.VSLKit.track(e)}
 assert.equal(posts.length,9);assert.equal(new Set(posts.map(p=>p.body.event)).size,9);assert(posts.every(p=>!('email'in p.body)&&!('name'in p.body)));
 assert.equal(calls.length,pixel&&hasPixel?(owns?7:8):0);assert(!calls.some(x=>x[1]==='PageView'));assert.equal(calls.filter(x=>x[1]==='Lead').length,pixel&&hasPixel&&!owns?1:0);
 vm.runInNewContext(source,context);assert.equal(posts.length,9,'second script inclusion is ignored');
}
console.log('PASS: nine unique POST payloads, Pixel on/off/missing, Lead ownership, no duplicate script initialization or PageView, no form PII');
