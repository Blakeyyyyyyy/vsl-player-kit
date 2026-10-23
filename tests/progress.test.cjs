const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'../player/player.html'),'utf8');
const fn=html.slice(html.indexOf('function vslProgress('),html.indexOf("(function(){'use strict';const $="));const context={};vm.createContext(context);vm.runInContext(fn,context);const p=context.vslProgress;
const rows=[];function check(duration,time,expected,label){const actual=p(time,duration);assert(Math.abs(actual-expected)<1e-12,`${label}: ${actual} != ${expected}`);rows.push({duration,time,label,expected_percent:expected*100,actual_percent:actual*100,pass:true});}
// Explicit independent expected values, including both sides of the transition.
for(const [t,expected,label] of [[0,0,'start'],[10,0.33580246913580247,'10 seconds'],[45,.85,'transition'],[46,.8503703703703703,'one second after transition'],[247.5,.925,'midpoint of remaining 405 seconds'],[450,1,'end']])check(450,t,expected,label);
for(const [t,expected,label] of [[0,0,'start'],[10,1/3,'10 seconds'],[45,1,'45 seconds, clamped beyond end'],[46,1,'46 seconds, clamped beyond end'],[15,.5,'whole-video midpoint; no remainder exists'],[30,1,'end']])check(30,t,expected,label);
check(45,10,2/9,'45-second boundary remains linear');check(45,45,1,'45-second end');check(46,45,.85,'46-second clip transition');check(46,45.5,.925,'46-second clip remainder midpoint');check(46,46,1,'46-second end');check(450,-1,0,'negative time clamped');check(0,10,0,'duration not ready');check(NaN,10,0,'metadata not ready');check(450,NaN,0,'invalid time');
// Curve is monotonic, bounded and fastest at its start; tail is linear.
assert(p(10,450)>p(20,450)-p(10,450));assert(Math.abs((p(200,450)-p(100,450))-(p(300,450)-p(200,450)))<1e-12);
for(const d of [30,45,46,449.747007,450]){let prev=0;for(let t=0;t<=d;t+=.1){const x=p(t,d);assert(x>=prev-1e-12&&x>=0&&x<=1);prev=x;}assert.equal(p(d,d),1);}
fs.writeFileSync(path.resolve(__dirname,'test-results.json'),JSON.stringify({checks:rows,monotonic_bounded:true,linear_tail:true,real_vsl_duration_checked:449.747007},null,2));console.log(`${rows.length} numeric cases plus curve invariants passed.`);
