// ==UserScript==
// @id             player-tracker-chatgpt@local
// @name           EchoTrace by khresist
// @namespace      iitc.plugin.playerTrackerChatGPT
// @version        0.1.1.7
// @updateURL      https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.meta.js
// @downloadURL    https://raw.githubusercontent.com/sirius826chen/echotrace-beta/main/stable/echotrace.user.js
// @description    Standalone public COMM activity tracker with player views, paths, storage and CSV.
// @author         khresist; reference authors credited in SOURCE-PROVENANCE.md
// @category       Layer
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// @run-at         document-end
// @license        MIT (khresist code only; third-party notices and capture-source rights retained)
// ==/UserScript==
// Feature references: Nanoeskadu names 2 2.1; nhz 0.11.2.20181030.ja.nhz.0001;
// DanielOnDiordna add-on 1.3.1 / 2.0.0; BlancLapin Advanced Tracker Player 0.0.1.
// This is new code, not an add-on, GPS trace, or guaranteed server history archive.
/*
MIT License

Copyright (c) 2026 Player Tracker ChatGPT edition contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Test-only vendor files retain their own licenses; see tests/vendor/.

*/

(() => {
function playerTrackerWrapper(info) {
  'use strict';
/* Retrospective display products. MIT khresist. Policy is experimental, not a physical law. */
function createTrackerHistory(model){
 'use strict';model=model||(typeof createPositionInference==='function'?createPositionInference:require('./inference.js'))();
 const VERSION='historical-witness-1',POLICY=Object.freeze({version:VERSION,inactivityMs:360000,maxReferenceKmh:18,maxAnchorDistanceM:300,maxAnchorGapMs:60000,maxReferenceAgeMs:120000,maxRegionDiameterM:120,maxReferenceRatio:2,maxReferenceDifferenceKmh:6,denseMinTimes:3,denseMaxDurationMs:30000,denseMaxSpanM:80});
 const geometry=model.geometry,distance=model.geoDistance,kernel=(typeof createTrackerMinimum==='function'?createTrackerMinimum:require('./minimum.js'))(geometry);
 const RESOURCES=Object.freeze({referenceIterations:8000,referenceSliceMs:1200,feasibilityToleranceM:.0005,innerBudgetMarginM:.01,tau:10,sigma:.02});
 const circle=(c,r)=>[Array.from({length:65},(_,i)=>[c[0]+r/Math.cos(Math.PI/64)*Math.cos(i*Math.PI/32),c[1]+r/Math.cos(Math.PI/64)*Math.sin(i*Math.PI/32)])];
 function incompatible(a,b){return Math.max(a,b)-Math.min(a,b)>POLICY.maxReferenceDifferenceKmh+1e-9&&Math.max(a,b)/Math.max(.01,Math.min(a,b))>POLICY.maxReferenceRatio+1e-9;}
 function weighted(refs){const valid=refs.filter(r=>r?.state==='valid'&&Number.isFinite(r.mps)&&r.toTime>r.fromTime);if(!valid.length)return {state:'unavailable',reason:'missing-reference'};if(valid.length>1&&incompatible(valid[0].mps*3.6,valid[1].mps*3.6))return {state:'unavailable',reason:'incompatible-references',refs:valid};const seconds=valid.reduce((n,r)=>n+(r.toTime-r.fromTime)/1000,0),meters=valid.reduce((n,r)=>n+r.mps*(r.toTime-r.fromTime)/1000,0);return {state:'valid',mps:meters/seconds,kmh:3.6*meters/seconds,distanceM:meters,durationSeconds:seconds,refs:valid,method:'time-weighted-local-displacement-reference',assumption:'conditional average, not an observed velocity or physical ceiling'};}
 function referenceAt(observations,t){if(observations.length<2)return {state:'unavailable',reason:'missing-reference'};let index=observations.findIndex(g=>g.time>t)-1;if(index<0)index=t<observations[0].time?0:observations.length-2;index=Math.min(index,observations.length-2);const rates=observations.slice(1).map((g,i)=>model.endpointReference(observations[i],g)),bracket=rates[index];if(observations[index+1].time-observations[index].time>POLICY.maxAnchorGapMs)return {state:'unavailable',reason:'sparse-support'};if(bracket?.state==='valid'&&bracket.kmh>POLICY.maxReferenceKmh)return {state:'unavailable',reason:'high-speed',refs:[bracket]};const adjacent=[rates[index-1],rates[index+1]].filter(r=>r&&Math.max(Math.abs(t-r.fromTime),Math.abs(t-r.toTime))<=POLICY.maxReferenceAgeMs);if(adjacent.some(r=>r.state==='valid'&&r.kmh>POLICY.maxReferenceKmh))return {state:'unavailable',reason:'high-speed-reference',refs:adjacent};const refs=adjacent.filter(r=>r.state==='valid');const r=weighted(refs.length?refs:[bracket]);if(r.state==='valid'&&r.refs.some(x=>Math.max(Math.abs(t-x.fromTime),Math.abs(t-x.toTime))>POLICY.maxReferenceAgeMs))return {...r,state:'unavailable',reason:'stale-reference'};return r;}
 function hull(points){const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];for(const q of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),q)<=1e-9)lower.pop();lower.push(q);}for(const q of p.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),q)<=1e-9)upper.pop();upper.push(q);}const r=lower.slice(0,-1).concat(upper.slice(0,-1));return r.length>=3?[r.concat([r[0]])]:[];}
 function interpolateRegion(a,b,f,P){const pointsA=a.components[0].polygon[0].slice(0,-1).map(P.project),pointsB=b.components[0].polygon[0].slice(0,-1).map(P.project);return [hull(pointsA.flatMap(p=>pointsB.map(q=>[p[0]*(1-f)+q[0]*f,p[1]*(1-f)+q[1]*f])))];}
 function diameter(set){const points=set.flat(2);let d=0;for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)d=Math.max(d,Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1]));return d;}
 function activityParts(events,player){const groups=[];const rows=[...new Map(events.filter(e=>String(e.player).toLowerCase()===String(player).toLowerCase()&&e.actorKind!=='system'&&!['__ada__','__jarvis__'].includes(String(e.player).toLowerCase())&&e.quality!=='ambiguous-actor').map(e=>[e.guid,e])).values()].sort((a,b)=>a.time-b.time||a.guid.localeCompare(b.guid));for(const e of rows){if(!groups.length||e.time-groups.at(-1).at(-1).time>=POLICY.inactivityMs)groups.push([]);groups.at(-1).push(e);}return groups;}
 function rawConnectionAllowed(events,player,s){const part=activityParts(events,player).find(p=>p.some(e=>s.fromIds.includes(e.guid)));return !!part&&part.some(e=>s.toIds.includes(e.guid));}
 function referenceSequence(sets,budgets,initial,prior,deadline){if(sets.some(p=>!kernel.convex(p)))return {state:'unavailable',reason:'nonconvex-reference'};let state=prior||{x:initial.map((p,i)=>kernel.project(p,sets[i])),dual:sets.slice(1).map(()=>[0,0]),iterations:0};if(!state.bar)state.bar=state.x.map(p=>p.slice());const norm=p=>Math.hypot(...p),valid=()=>state.x.slice(1).every((p,i)=>norm([p[0]-state.x[i][0],p[1]-state.x[i][1]])<=budgets[i]+RESOURCES.feasibilityToleranceM);
  if(valid())return {...state,state:'complete',method:'joint convex reference-budget feasibility',resourceParameters:RESOURCES};
  while(state.iterations<RESOURCES.referenceIterations){if(state.iterations%20===0&&Date.now()>deadline)return {...state,state:'pending',reason:'reference-budget'};const p=state.dual.map((v,i)=>{const q=v.map((n,k)=>n+RESOURCES.sigma*(state.bar[i+1][k]-state.bar[i][k])),length=norm(q),factor=Math.max(0,1-RESOURCES.sigma*budgets[i]/(length||1));return q.map(n=>n*factor);}),d=Array.from({length:sets.length},(_,i)=>[0,1].map(k=>(i?p[i-1][k]:0)-(i<sets.length-1?p[i][k]:0))),x=state.x.map((v,i)=>kernel.project(v.map((n,k)=>n-RESOURCES.tau*d[i][k]),sets[i]));state.bar=x.map((v,i)=>v.map((n,k)=>2*n-state.x[i][k]));state.x=x;state.dual=p;state.iterations++;if(state.iterations%10===0&&valid())return {...state,state:'complete',method:'joint convex reference-budget feasibility',resourceParameters:RESOURCES};}
  return {...state,state:'unavailable',reason:'reference-feasibility-limit'};
 }
 function evaluate(events,options,minimum,minimumXMP){
  const cutoff=options.T,t=options.historicalTime??Math.max(-Infinity,...events.filter(e=>e.time<=cutoff).map(e=>e.time)),plans={interaction:model.plan(events,options,false),XMP:model.plan(events,options,true)},variants=[],unavailable=[],limits=[],referenceCache=new Map((options._referenceCache||[]).map(r=>[r.key,r.state])),cacheEntries=[],deadline=Date.now()+(options.referenceBudgetMs??RESOURCES.referenceSliceMs);let referencePending=0;
  for(const [scenario,result]of [['interaction',minimum],['XMP',minimumXMP]]){
   const plan=plans[scenario],partIndex=plan.parts.findIndex(p=>t>=p.groups[0]?.time&&t<=p.groups.at(-1)?.time),part=plan.parts[partIndex];
   const fail=(reason,kind='unavailable')=>{for(const type of ['minimum-movement','local-average'])unavailable.push({model:type,scenario,time:t,state:kind,reason,segmentId:partIndex});};
   if(!Number.isSafeInteger(t)||t>cutoff||t<cutoff-(options.hours??3)*3600000||!part){fail('outside-supported-time');continue;}
   if(part.groups.some(g=>g.events.some(e=>(options.sourceConflicts||[]).some(c=>c.guid===e.guid)))){fail('source-conflict');continue;}
   const proof=result?.proofs?.find(p=>p.segmentId===partIndex&&p.state==='complete');if(!proof){fail(result?.progress?.pending?'pending':result?.proofs?.find(p=>p.segmentId===partIndex)?.reason||'insufficient-context',result?.progress?.pending?'pending':'unavailable');continue;}
   const observations=part.groups.filter(g=>g.anchors.length).map(g=>({time:g.time,anchors:model.collapse(g.anchors)}));
   const stateEntry=result.cacheEntries?.find(e=>{try{return JSON.parse(e.key)[3]===partIndex;}catch(_){return false;}}),allBranches=stateEntry?.solved?.branches?.filter(b=>b.stage==='complete').map(b=>({id:b.id,sourceBranches:b.sourceBranches,witness:b.witness.map((position,i)=>({position,time:proof.branches[0].witness[i].time})),minimumEligible:proof.branches.some(p=>p.id===b.id)}))||proof.branches.map(b=>({...b,minimumEligible:true}));
   for(const branch of allBranches){
    const witness=branch.witness,exact=witness.findIndex(p=>p.time===t);let from=exact>=0?exact:witness.findIndex(p=>p.time>t)-1,to=exact>=0?exact:from+1;if(from<0||to>=witness.length){limits.push({scenario,branch:branch.id,reason:'unsupported-intermediate'});continue;}
    const allSources=branch.sourceBranches.flat(),P=model.projection(proof.approximation?[{position:witness[from].position,radius:0}]:allSources),groupSources=branch.sourceBranches;
    const common=proof.approximation?[]:geometry.intersect(groupSources.map(anchors=>geometry.intersect(anchors.map(a=>[circle(P.project(a.position),Math.max(.001,a.radius/P.k-.003))]))));
    const dense=observations.length>=POLICY.denseMinTimes&&observations.at(-1).time-observations[0].time<=POLICY.denseMaxDurationMs&&Math.max(0,...observations.flatMap(a=>a.anchors).flatMap(a=>observations.flatMap(b=>b.anchors).map(b=>distance(a.position,b.position))))<=POLICY.denseMaxSpanM&&common.length>0&&proof.upperM===0;
    const edgeChecks=witness.slice(1).map((p,i)=>{const mid=(p.time+witness[i].time)/2,ref=referenceAt(observations,mid),directA=observations.filter(g=>g.time<=mid).at(-1),directB=observations.find(g=>g.time>=mid);let reason=ref.state!=='valid'?ref.reason:null;if(dense&&['missing-reference','overlapping-interaction-sets'].includes(reason))reason=null;if(p.time-witness[i].time>POLICY.maxAnchorGapMs)reason='sparse-support';if(directA&&directB&&Math.max(...directA.anchors.flatMap(a=>directB.anchors.map(b=>distance(a.position,b.position))))>POLICY.maxAnchorDistanceM)reason='distant-support';if(ref.state==='valid'&&ref.kmh>POLICY.maxReferenceKmh)reason='high-speed';return {ref,reason,fromTime:witness[i].time,toTime:p.time,dtSeconds:(p.time-witness[i].time)/1000,distanceM:distance(witness[i].position,p.position)};});
    const relevant=exact>=0?[edgeChecks[exact-1],edgeChecks[exact]].filter(Boolean):[edgeChecks[from]];let reason=!relevant.length&&!dense?'weak-support':relevant.find(e=>e.reason)?.reason;if(reason)limits.push({scenario,model:'local-average',branch:branch.id,time:t,reason});
    let left=0,right=witness.length-1;
    const ratio=from===to?0:(t-witness[from].time)/(witness[to].time-witness[from].time),A=P.project(witness[from].position),B=P.project(witness[to].position),position=P.unproject(A.map((n,k)=>n*(1-ratio)+B[k]*ratio)),localEdges=edgeChecks.slice(left,right);
    const identity={player:options.player||plan.view.player,segment:partIndex,time:t,scenario,branch:branch.id,cutoff,lookbackHours:options.hours,dataGeneration:options.dataGeneration??0};
    for(const type of ['minimum-movement','local-average']){
     if(type==='minimum-movement'&&!branch.minimumEligible)continue;if(type==='local-average'&&reason){limits.push({...identity,model:type,reason});continue;}let selectedPosition=position,selectedRoute=witness.slice(left,right+1),referenceWitness=null,set,reference=exact>=0?referenceAt(observations,t):edgeChecks[from]?.ref,assumption,why=null;
     if(type==='minimum-movement'){
      const a=result.regions.find(g=>g.segmentId===partIndex&&g.branchId===branch.id&&g.time===witness[from].time),b=result.regions.find(g=>g.segmentId===partIndex&&g.branchId===branch.id&&g.time===witness[to].time);if(!a||!b){limits.push({...identity,model:type,reason:'missing-certificate'});continue;}set=from===to?a.components.map(c=>c.polygon.map(r=>r.map(P.project))):interpolateRegion(a,b,ratio,P);assumption='joint minimum-distance witness; uniform straight edge interpolation; cost-sublevel outer enclosure';
     }else{
      if(!dense&&reference?.state!=='valid'){limits.push({...identity,model:type,reason:reference?.reason||'missing-reference'});continue;}
      if(dense){set=common;reference={state:'dense-common',mps:0,kmh:0,method:'verified dense common intersection, not observed stationary'};assumption='one feasible common position completes the dense events';}
      else{
       const budgets=localEdges.map(e=>e.ref.mps*e.dtSeconds);if(localEdges.some(e=>e.ref.state!=='valid')){limits.push({...identity,model:type,reason:'missing-reference'});continue;}
       const key=JSON.stringify([VERSION,'reference-feasible',RESOURCES,options.dataGeneration??0,scenario,branch.id,groupSources.slice(left,right+1),witness.slice(left,right+1).map(p=>p.time),budgets]),cached=referenceCache.get(key);let solved=cached;
       if(!solved||solved.state==='pending'){const inner=groupSources.slice(left,right+1).map(anchors=>geometry.intersect(anchors.map(a=>[circle(P.project(a.position),Math.max(.001,a.radius/P.k-.003)*Math.cos(Math.PI/64))])));if(inner.some(g=>g.length!==1)){limits.push({...identity,model:type,reason:'reference-spatial-witness-unavailable'});continue;}solved=referenceSequence(inner.map(g=>g[0]),budgets.map(b=>Math.max(0,b/P.k-RESOURCES.innerBudgetMarginM)),witness.slice(left,right+1).map(p=>P.project(p.position)),cached,deadline);}
       cacheEntries.push({key,state:solved});if(solved.state==='pending'){referencePending++;limits.push({...identity,model:type,reason:'pending-reference-witness'});continue;}if(solved.state!=='complete'){limits.push({...identity,model:type,reason:solved.reason});continue;}
       selectedRoute=solved.x.map((p,i)=>({time:witness[left+i].time,position:P.unproject(p)}));if(!selectedRoute.every((p,i)=>groupSources[left+i].every(a=>distance(p.position,a.position)<=a.radius+1e-6))||!selectedRoute.slice(1).every((p,i)=>distance(p.position,selectedRoute[i].position)<=budgets[i]+1e-6)){limits.push({...identity,model:type,reason:'reference-geographic-witness-unavailable'});continue;}
       const a=solved.x[from-left],b=solved.x[to-left];selectedPosition=P.unproject(a.map((n,k)=>n*(1-ratio)+b[k]*ratio));referenceWitness={method:solved.method,iterations:solved.iterations,geographicConstraintsVerified:true,edgeBudgetsM:budgets,minimumClaim:false,resources:RESOURCES};
       const cumulative=[0];for(const b of budgets)cumulative.push(cumulative.at(-1)+b);const qDistance=cumulative[from-left]+(from===to?0:ratio*budgets[from-left]),sets=[];
       for(let i=left;i<=right;i++){const allowance=Math.abs(cumulative[i-left]-qDistance);sets.push(geometry.intersect(groupSources[i].map(a=>[circle(P.project(a.position),(a.radius+allowance)*P.k+.003)])));}
       set=geometry.intersect(sets);assumption='time-weighted local reference budgets; joint feasible witness verified against every conditional edge budget (not a minimum claim); uniform straight interpolation';
      }
     }
     if(!set?.length||!set[0]?.length){limits.push({...identity,model:type,reason:'empty-conditional-region'});continue;}const size=diameter(set)*P.k;if(size>POLICY.maxRegionDiameterM)why='broad-region';if(!geometry.inside(P.project(selectedPosition),set[0]))why='witness-outside-region';
     const components=set.map((poly,id)=>({id,polygon:poly.map(r=>r.map(P.unproject))})),route=selectedRoute,key=JSON.stringify({...identity,model:type}),distances=route.slice(1).map((p,i)=>distance(p.position,route[i].position)),durationMs=(route.at(-1)?.time??t)-(route[0]?.time??t);
     variants.push({identity:{...identity,model:type},key,model:type,scenario,branch:branch.id,time:t,state:why==='broad-region'?'coarse':why?'not-useful':'useful',reason:why,position:why&&why!=='broad-region'?null:selectedPosition,components:why?[]:components,computedComponents:components,diameterM:size,route,edgeDistancesM:distances,edgeAverageKmh:distances.map((d,i)=>d*3600/(route[i+1].time-route[i].time)),distanceM:distances.reduce((a,b)=>a+b,0),durationMs,averageKmh:durationMs>0?distances.reduce((a,b)=>a+b,0)*3600/durationMs:null,wholeProof:proof,referenceWitness,reference,rawIds:proof.rawIds,assumption,interpolation:from===to?'event-time witness':'uniform straight simulated edge',regionMethod:type==='minimum-movement'?'minimum cost-sublevel endpoint interpolation outer enclosure':'conditional local reference-budget intersection',terrain:'unknown; straight edges are not verified walkable routes',nonUnique:true,policy:POLICY,geographicApproximationGapM:proof.gapM});
    }
   }
  }
  return {version:VERSION,time:t,cutoff,policy:POLICY,variants,unavailable,limits,cacheEntries,progress:{pending:referencePending},calculation:{state:referencePending||unavailable.some(r=>r.state==='pending')?'pending':'complete'},minimumBoundsMeaning:'lower/upper bounds bracket the minimum-distance objective, not shortest/longest possible journeys'};
 }
 function select(result,modelName,scenario='interaction',branch=null){if(!result)return {state:'pending',reason:'pending'};const matching=result.variants.filter(v=>v.model===modelName&&v.scenario===scenario),exact=matching.find(v=>v.branch===Number(branch));if(branch!==null&&!exact&&matching.length)return {state:'unavailable',reason:'selected-branch-unavailable',time:result.time,model:modelName,scenario,branch};return exact||(branch===null?matching[0]:null)||result.unavailable.find(v=>v.model===modelName&&v.scenario===scenario)||{state:'unavailable',reason:result.limits.find(v=>v.model===modelName&&v.scenario===scenario)?.reason||result.limits.find(v=>v.scenario===scenario)?.reason||'insufficient-context',time:result.time,model:modelName,scenario};}

 return {VERSION,POLICY,RESOURCES,referenceSequence,weighted,referenceAt,incompatible,evaluate,select,rawConnectionAllowed,activityParts};
}

/* Joint convex minimum-movement simulation. MIT khresist; no greedy global-minimum claims. */
function createTrackerMinimum(geometry){
 'use strict';geometry=geometry||(typeof createTrackerRegion==='function'?createTrackerRegion:require('./region.js'))();
 const VERSION='minimum-movement-1',PARAMETERS={toleranceM:.05,relativeTolerance:1e-6,maxStates:64,maxBranches:16,maxIterations:16000,boundIterations:500,directions:8,tau:10,sigma:.02};
 const norm=p=>Math.hypot(...p),dot=(a,b)=>a[0]*b[0]+a[1]*b[1],objective=x=>x.slice(1).reduce((s,p,i)=>s+norm([p[0]-x[i][0],p[1]-x[i][1]]),0);
 function convex(p){if(p.length!==1)return false;const r=p[0];let sign=0;for(let i=0;i<r.length-1;i++){const a=r[i],b=r[(i+1)%(r.length-1)],c=r[(i+2)%(r.length-1)],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)<1e-7)continue;if(sign&&sign!==Math.sign(cross))return false;sign=Math.sign(cross);}return !!sign;}
 function project(p,poly){if(geometry.inside(p,poly))return p.slice();let best=null,d=Infinity;const ring=poly[0];for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],v=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,dot([p[0]-a[0],p[1]-a[1]],v)/(dot(v,v)||1))),q=[a[0]+t*v[0],a[1]+t*v[1]],cost=norm([p[0]-q[0],p[1]-q[1]]);if(cost<d){d=cost;best=q;}}return best;}
 function divergence(p,n){return Array.from({length:n},(_,i)=>[0,1].map(k=>(i?p[i-1][k]:0)-(i<n-1?p[i][k]:0)));}
 function supportMin(poly,d){return Math.min(...poly[0].slice(0,-1).map(p=>dot(p,d)));}
 function clip(poly,d,b){const out=[];const r=poly[0];for(let i=0;i<r.length-1;i++){const a=r[i],q=r[i+1],u=dot(a,d)-b,v=dot(q,d)-b;if(u<=1e-8)out.push(a);if((u<=0)!==(v<=0)){const t=u/(u-v);out.push([a[0]+t*(q[0]-a[0]),a[1]+t*(q[1]-a[1])]);}}return out.length>=3?[out.concat([out[0]])]:[];}
 function l12(v,radius){const lengths=v.map(norm),sorted=lengths.slice().sort((a,b)=>b-a);if(lengths.reduce((a,b)=>a+b,0)<=radius)return v.map(p=>p.slice());let sum=0,threshold=0;for(let i=0;i<sorted.length;i++){sum+=sorted[i];const t=(sum-radius)/(i+1);if(i===sorted.length-1||t>=sorted[i+1]){threshold=t;break;}}return v.map((p,i)=>p.map(x=>x*Math.max(0,1-threshold/(lengths[i]||1))));}
 function optimizer(sets,deadline,prior){let s=prior||{x:sets.map(p=>geometry.representative(p).point),dual:sets.slice(1).map(()=>[0,0]),iterations:0,lower:0,upper:Infinity};if(!s.bar)s.bar=s.x.map(p=>p.slice());const eps=()=>PARAMETERS.toleranceM+PARAMETERS.relativeTolerance*s.upper;
  while(s.iterations<PARAMETERS.maxIterations){if(s.iterations%20===0&&Date.now()>deadline)return {...s,state:'pending',reason:'budget'};const p=s.dual.map((v,i)=>{const q=v.map((n,k)=>n+PARAMETERS.sigma*(s.bar[i+1][k]-s.bar[i][k])),length=norm(q);return q.map(n=>n/Math.max(1,length));}),d=divergence(p,sets.length),x=s.x.map((v,i)=>project(v.map((n,k)=>n-PARAMETERS.tau*d[i][k]),sets[i]));s.bar=x.map((v,i)=>v.map((n,k)=>2*n-s.x[i][k]));s.x=x;s.dual=p;s.iterations++;
   if(s.iterations%10===0){const upper=objective(x),lower=d.reduce((n,v,i)=>n+supportMin(sets[i],v),0);if(upper<s.upper){s.upper=upper;s.witness=x.map(p=>p.slice());}s.lower=Math.max(s.lower,lower,0);if(s.upper-s.lower<=eps())return {...s,state:'complete',gapM:Math.max(0,s.upper-s.lower)};}
  }return {...s,state:'limited',reason:'optimization-limit',gapM:Math.max(0,s.upper-s.lower)};
 }
 function extremum(sets,index,direction,budget,witness,deadline,prior){let s=prior||{x:witness.map(p=>p.slice()),bar:witness.map(p=>p.slice()),dual:sets.slice(1).map(()=>[0,0]),iterations:0,bound:Math.max(...sets[index][0].map(p=>dot(p,direction)))};
  while(s.iterations<PARAMETERS.boundIterations){if(s.iterations%20===0&&Date.now()>deadline)return {...s,state:'pending'};const v=s.dual.map((p,i)=>p.map((n,k)=>n+PARAMETERS.sigma*(s.bar[i+1][k]-s.bar[i][k]))),proj=l12(v.map(p=>p.map(n=>n/PARAMETERS.sigma)),budget),p=v.map((q,i)=>q.map((n,k)=>n-PARAMETERS.sigma*proj[i][k])),d=divergence(p,sets.length).map((q,i)=>q.map((n,k)=>n-(i===index?direction[k]:0))),x=s.x.map((q,i)=>project(q.map((n,k)=>n-PARAMETERS.tau*d[i][k]),sets[i]));s.bar=x.map((q,i)=>q.map((n,k)=>2*n-s.x[i][k]));s.x=x;s.dual=p;s.iterations++;
   if(s.iterations%10===0){const lower=d.reduce((n,v,i)=>n+supportMin(sets[i],v),0)-budget*Math.max(0,...p.map(norm));s.bound=Math.min(s.bound,-lower+1e-7);}
  }return {...s,state:'complete'};
 }
 function optimizeSequence(sets,options={}){if(sets.some(p=>!convex(p)))return {state:'unavailable',reason:'nonconvex-branch'};const deadline=Date.now()+(options.budgetMs??1200),common=geometry.intersect(sets.map(p=>[p]));if(common.length&&!(options.regionBudgetM>0)){const point=geometry.representative(common[0]).point;return {state:'complete',lower:0,upper:0,gapM:0,witness:sets.map(()=>point.slice()),regions:sets.map(()=>common),common:true};}
  const solved=options.prior?.gapM!==undefined&&options.prior.upper-options.prior.lower<=PARAMETERS.toleranceM+PARAMETERS.relativeTolerance*options.prior.upper?options.prior:optimizer(sets,deadline,options.prior);if(solved.state!=='complete'||options.objectiveOnly)return solved;let shapes=sets.map(p=>p.map(r=>r.map(q=>q.slice()))),cursor=options.cursor||0,pending=options.extremumState||null;const budget=options.regionBudgetM??(solved.upper+PARAMETERS.toleranceM+solved.gapM);
  if(options.shapes)shapes=options.shapes;
  for(;cursor<sets.length*PARAMETERS.directions;cursor++){const index=Math.floor(cursor/PARAMETERS.directions),angle=2*Math.PI*(cursor%PARAMETERS.directions)/PARAMETERS.directions,d=[Math.cos(angle),Math.sin(angle)],bound=extremum(sets,index,d,budget,solved.witness,deadline,pending);pending=null;if(bound.state==='pending')return {...solved,state:'pending',reason:'region-budget',cursor,shapes,extremumState:bound};shapes[index]=clip(shapes[index],d,bound.bound);if(!shapes[index].length)return {...solved,state:'unavailable',reason:'numeric-enclosure'};}
  return {...solved,state:'complete',regions:shapes.map(p=>[p]),regionCostToleranceM:budget-solved.upper,common:false};
 }
 function boundedLong(groups,ctx,options,cached){
  const deadline=Date.now()+(options.budgetMs??1200),prefix=JSON.stringify([VERSION,'bounded-feasible-prefix',options.dataGeneration??0]);
  let old=[...cached.values()].filter(s=>s?.longPrefix===prefix&&s.groups?.length<=groups.length&&s.groups.every((g,i)=>JSON.stringify(g)===JSON.stringify(groups[i]))).sort((a,b)=>b.groups.length-a.groups.length)[0];
  const state=old?JSON.parse(JSON.stringify(old)):{longPrefix:prefix,groups:[],witness:[],sources:[],shapes:[],reusedStates:0};state.reusedStates=state.groups.length;
  for(let i=state.groups.length;i<groups.length;i++){
   if(Date.now()>deadline)return {...state,pending:true};const g=groups[i];let choices=[g.anchors];for(const targets of g.attacks){if(choices.length*targets.length>PARAMETERS.maxBranches)return {...state,error:'alternative-limit'};choices=choices.flatMap(a=>targets.map(b=>a.concat(b)));}
   let best=null;for(const anchors of choices){try{const P=ctx.projection(anchors),set=geometry.intersect(anchors.map(a=>ctx.circle(P.project(a.position),(a.radius/P.k-ctx.numericM)*Math.cos(Math.PI/ctx.sides))));if(set.length!==1||!convex(set[0]))continue;const prev=state.witness.at(-1)?.position,point=prev?project(P.project(prev),set[0]):geometry.representative(set[0]).point,position=P.unproject(point);if(!anchors.every(a=>ctx.geoDistance(position,a.position)<=a.radius+1e-6))continue;const cost=prev?ctx.geoDistance(prev,position):0,outer=geometry.intersect(anchors.map(a=>ctx.circle(P.project(a.position),a.radius*P.k+ctx.numericM)));if(!best||cost<best.cost)best={position,cost,sources:anchors.map(a=>({rawIds:a.rawIds,position:a.position,radius:a.radius,assumptions:a.assumptions||null})),components:outer.map((poly,id)=>({id,polygon:poly.map(r=>r.map(P.unproject))}))};}catch(_){}}
   if(!best)return {...state,error:'conflicting-or-unrepresentable-local-constraints'};
   state.groups.push(g);state.witness.push({time:g.time,position:best.position});state.sources.push(best.sources);state.shapes.push(best.components);
  }return {...state,pending:false};
 }

 function solve(plan,options,xmp,ctx){const cached=new Map((options._cache||[]).map(e=>[e.key,e.solved])),deadline=Date.now()+(options.budgetMs??1200),scenario=xmp?'minimum-XMP':'minimum-interaction',windows=[],regions=[],points=[],cacheEntries=[],proofs=[];let pending=0,limited=0,computed=0;
  const attacks=new Map();for(const choices of plan.attack.constraints){const time=choices[0].time;if(!attacks.has(time))attacks.set(time,[]);attacks.get(time).push(choices);}
  for(const [segmentId,part] of plan.parts.entries()){
   const groups=part.groups.map(g=>({time:g.time,rawIds:g.events.map(e=>e.guid),anchors:ctx.collapse(g.anchors),attacks:xmp?attacks.get(g.time)||[]:[]})).filter(g=>g.anchors.length||g.attacks.length),rawIds=[...new Set(part.groups.flatMap(g=>g.events.map(e=>e.guid)).concat(groups.flatMap(g=>g.anchors.concat(g.attacks.flat()).flatMap(a=>a.rawIds||[]))))],key=JSON.stringify([VERSION,PARAMETERS,scenario,segmentId,options.dataGeneration??0,part.closed,groups,options.sourceConflicts||[]]);let state=cached.get(key);
   if((options.sourceConflicts||[]).some(c=>rawIds.includes(c.guid))){limited++;proofs.push({segmentId,state:'conflict',reason:'source-conflict',rawIds,sourceConflicts:options.sourceConflicts});continue;}
   if(!groups.length)continue;
   if(groups.length>PARAMETERS.maxStates){
    const long=boundedLong(groups,ctx,options,cached);cacheEntries.push({key,solved:long});computed+=long.groups.length-long.reusedStates;
    if(long.error){limited++;proofs.push({segmentId,state:'limited',reason:long.error,rawIds});continue;}if(long.pending){pending++;continue;}
    const witness=long.witness,upperM=witness.slice(1).reduce((n,p,i)=>n+ctx.geoDistance(p.position,witness[i].position),0),durationMs=witness.at(-1).time-witness[0].time,proof={version:VERSION,state:'complete',segmentId,scenario,rawIds:[...new Set(rawIds.concat(long.sources.flatMap(a=>a.flatMap(s=>s.rawIds))))],lowerM:0,upperM,distanceM:upperM,gapM:upperM,durationMs,wholeDurationMs:durationMs,wholeAverageKmh:upperM*3600/durationMs,approximation:true,optimality:'bounded sequential feasible approximation; global minimum NOT established',geographicWitnessVerified:true,sharedBoundaryVerified:true,reusedStates:long.reusedStates,branches:[{id:0,sourceBranches:long.sources,witness,lowerM:0,upperM}]};proofs.push(proof);
    for(let i=0;i<witness.length;i++)regions.push({segmentId,branchId:0,time:witness[i].time,components:long.shapes[i],diameterM:Math.max(...groups[i].anchors.concat(groups[i].attacks.flat()).map(a=>a.radius*2)),certificate:{method:'local conditional disks; sequential feasible witness, not minimum cost-sublevel'}});
    continue;
   }
   if(!state){if(options._onlyCache){pending++;cacheEntries.push({key,solved:null});continue;}try{
    let choices=[[]];for(const g of groups){let at=[g.anchors];for(const targets of g.attacks){if(at.length*targets.length>PARAMETERS.maxBranches)throw Error('alternative-limit');at=at.flatMap(a=>targets.map(b=>a.concat(b)));}if(choices.length*at.length>PARAMETERS.maxBranches)throw Error('alternative-limit');choices=choices.flatMap(a=>at.map(b=>a.concat([ctx.collapse(b)])));}
    const P=ctx.projection(choices.flat(2)),branches=[];for(const [id,list] of choices.entries()){const outer=list.map(a=>geometry.intersect(a.map(q=>ctx.circle(P.project(q.position),q.radius*P.k+ctx.numericM)))),inner=list.map(a=>geometry.intersect(a.map(q=>ctx.circle(P.project(q.position),(q.radius/P.k-ctx.numericM)*Math.cos(Math.PI/ctx.sides)))));
     if(outer.some(g=>!g.length))continue;if(outer.some(g=>g.length!==1||!convex(g[0]))||inner.some(g=>g.length!==1||!convex(g[0])))throw Error('spatial-witness-unavailable');branches.push({id,anchors:list,outer:outer.map(g=>g[0]),inner:inner.map(g=>g[0]),stage:'inner',sourceBranches:list.map(a=>a.map(q=>({rawIds:q.rawIds,position:q.position,radius:q.radius,assumptions:q.assumptions||null})))});}
    if(!branches.length)throw Error('conflicting-local-constraints');state={P:{origin:P.origin,k:P.k,extentM:P.extentM},branches,stage:'working'};
   }catch(e){limited++;proofs.push({segmentId,state:e.message==='conflicting-local-constraints'?'conflict':'unavailable',reason:e.message,rawIds});continue;}}
   const P=ctx.projection([{position:state.P.origin,radius:0},...state.branches[0].anchors.flat()],state.P.extentM);P.k=state.P.k;
   let unresolved=false;for(const branch of state.branches){if(branch.stage==='complete'||branch.stage==='limited')continue;if(options._onlyCache||computed>=(options.sliceWindows??Infinity)||Date.now()>deadline){unresolved=true;continue;}computed++;
    if(branch.stage==='inner'){const r=optimizeSequence(branch.inner,{budgetMs:Math.max(0,deadline-Date.now()),prior:branch.innerState,objectiveOnly:true});branch.innerState=r;
     if(r.state==='pending'){unresolved=true;continue;}if(r.state!=='complete'){branch.stage='limited';branch.reason=r.reason;continue;}
     const witness=r.witness.map(P.unproject);if(!witness.every((p,i)=>branch.anchors[i].every(a=>ctx.geoDistance(p,a.position)<=a.radius+1e-6))){branch.stage='limited';branch.reason='geographic-witness-unavailable';continue;}
     branch.witness=witness;branch.upperM=witness.slice(1).reduce((n,p,i)=>n+ctx.geoDistance(p,witness[i]),0);branch.stage='outer';
    }
    if(branch.stage==='outer'){const prior=branch.outerState,r=optimizeSequence(branch.outer,{budgetMs:Math.max(0,deadline-Date.now()),prior,cursor:prior?.cursor,shapes:prior?.shapes,extremumState:prior?.extremumState,regionBudgetM:branch.upperM===0?0:branch.upperM*P.k+PARAMETERS.toleranceM});branch.outerState=r;if(r.state==='pending'){unresolved=true;continue;}if(r.state!=='complete'){branch.stage='limited';branch.reason=r.reason;continue;}branch.lowerM=branch.upperM===0?0:r.lower/P.k;branch.stage='complete';}
   }
   cacheEntries.push({key,solved:state});if(unresolved||state.branches.some(b=>!['complete','limited'].includes(b.stage))){pending++;continue;}if(state.branches.some(b=>b.stage==='limited')){limited++;proofs.push({segmentId,state:'limited',reason:'joint-optimization-incomplete',rawIds,branches:state.branches.map(b=>({id:b.id,stage:b.stage,reason:b.reason}))});continue;}
   const upperM=Math.min(...state.branches.map(b=>b.upperM)),lowerM=Math.min(...state.branches.map(b=>b.lowerM)),eligible=state.branches.filter(b=>b.lowerM<=upperM+PARAMETERS.toleranceM),durationMs=groups.at(-1).time-groups[0].time,wholeDurationMs=part.groups.at(-1).time-part.groups[0].time,proof={version:VERSION,state:'complete',objective:'min sum of joint eligible displacement distances',distanceM:upperM,lowerM,upperM,gapM:Math.max(0,upperM-lowerM),units:'m',durationMs,wholeDurationMs,averageLowerKmh:durationMs>0?lowerM*3600/durationMs:null,averageKmh:durationMs>0?upperM*3600/durationMs:null,wholeAverageKmh:wholeDurationMs>0?upperM*3600/wholeDurationMs:null,optimality:upperM===0?'exact zero with verified common witness':'bounded approximation; not an exact geodesic optimum',geographicApproximationGapM:Math.max(0,upperM-lowerM),optimizationToleranceM:PARAMETERS.toleranceM,metricScale:P.k,polygonSides:ctx.sides,geographicWitnessVerified:true,regionMethod:'joint cost-sublevel outer enclosure; retains alternative minimizers',rawIds,scenario,segmentId,closed:part.closed,unconstrainedEventTimes:part.groups.filter(g=>!groups.some(s=>s.time===g.time)).map(g=>g.time),interpolation:'none displayed; no position outside eligible event times',branches:eligible.map(b=>({id:b.id,lowerM:b.lowerM,upperM:b.upperM,optimizerGapM:b.outerState.gapM,sourceBranches:b.sourceBranches,witness:b.witness.map((position,i)=>({time:groups[i].time,position})),edgeDistancesM:b.witness.slice(1).map((p,i)=>ctx.geoDistance(p,b.witness[i])),edgeAverageKmh:b.witness.slice(1).map((p,i)=>ctx.geoDistance(p,b.witness[i])*3600/(groups[i+1].time-groups[i].time))}))};proofs.push(proof);
   for(const b of eligible)for(const [index,g] of groups.entries()){const id=key+'|'+b.id+'|'+g.time,movement={state:'minimum-simulation',assumption:'smallest jointly necessary simulated movement',proof,branchId:b.id},region=ctx.summarize(b.outerState.regions[index],P,g.time,'minimum-movement',true,movement,rawIds);region.scenario=scenario;region.branchId=b.id;region.segmentId=segmentId;region.certificateId=id;region.certificate={...region.certificate,modelVersion:VERSION,method:'joint-primal-dual-cost-sublevel-enclosure',minimumProof:proof,optimizerStatus:'complete',routeCertified:false};regions.push(region);const supported=region.components.map(c=>({...c,time:g.time,scenario,branchId:b.id,segmentId,componentId:c.id,support:'minimum-movement',conditional:true,diameterM:region.diameterM,certificateId:id,rawIds,movement}));points.push(...supported);windows.push({key:id,targetTime:g.time,startTime:groups[0].time,endTime:groups.at(-1).time,segmentId,rawIds,calculation:{state:'complete',reason:null},precision:'possible',regions:[region],supportedPoints:supported,movement});}
  }
  const unavailable=proofs.filter(p=>p.state==='unavailable').length,conflicting=proofs.filter(p=>p.state==='conflict').length;const lastTime=plan.view.events.at(-1)?.time??null,lastPoints=points.filter(p=>p.time===lastTime),last=lastPoints[0],latest={time:lastTime,state:pending?'pending':last?'possible':conflicting?'conflict':unavailable?'unavailable':limited?'limited':'insufficient-context',point:last||null,points:lastPoints,diameterM:last?.diameterM??null,support:last?'minimum-movement':null,movement:last?.movement,closed:!!plan.parts.at(-1)?.closed};return {status:last?'possible':points.length?'historical':'unknown',latest,targetTime:lastTime,activityClosed:latest.closed,supportedPoints:points,regions,windows,pathSegments:[],proofs,audit:plan.audit,conflicts:plan.conflicts,segments:plan.parts.map((p,id)=>({id,reason:p.reason,closed:p.closed,times:p.groups.map(g=>g.time)})),calculation:{state:pending||limited?'partial':'complete',pending,limited,unavailable,conflicting,completed:proofs.filter(p=>p.state==='complete').length,total:plan.parts.length},progress:{pending,computed,total:plan.parts.length,completed:proofs.filter(p=>p.state==='complete').length},cacheEntries,provenance:{model:VERSION,parameters:PARAMETERS,scenario,objective:'whole-sequence joint minimum displacement',observedSpeed:false,minimumRouteNotUnique:true,geographicBounds:'controlled planar enclosure/metric approximation; not formal global geodesic proof'},history:{state:points.length?'partial':'none',supportedTimes:new Set(points.map(p=>p.time)).size}};
 }
 return {VERSION,PARAMETERS,objective,project,convex,l12,optimizer,extremum,optimizeSequence,solve};
}

/* EchoTrace artwork adapter: geometry MIT; third-party phone/faction marks retain original terms. */
function createTrackerArtwork(){
 const emblems={"ENL": ["M66.7025 74.5732C66.7025 74.5732 51.3684 90.3761 34.6866 74.5732C27.1346 78.8257 24.8583 80.7466 24.8583 80.7466C24.8583 80.7466 50.4233 98.1996 78.0921 79.8354L66.7025 74.565V74.5732ZM63.9249 66.4871C72.3973 68.3342 89.4899 77.2413 90.4843 77.2495C94.8314 75.2874 97.5268 72.447 97.5268 72.447L92.8674 72.3978C92.8674 72.3978 75.6186 61.66 66.2094 58.3763C60.1448 56.2583 43.3891 54.4112 34.0374 57.9823C24.6611 61.5369 10.6747 69.7133 10.6747 69.7133L6.67271 71.6672L0 71.938C0 71.938 8.58742 77.6928 12.5894 78.0704C18.276 75.1315 25.261 68.7528 35.3522 66.3065C43.7342 64.2706 56.4304 64.8534 63.9331 66.4871M116 55.9464L91.7333 35.3082L81.1244 51.8171C81.1244 51.8171 96.8118 62.2265 98.7758 64.2542C108.44 60.1085 115.992 55.9546 115.992 55.9546M93.6563 41.4569L109.434 54.5836L99.3675 59.2465L87.452 50.0767L93.6563 41.4487V41.4569ZM80.1794 92.1329L91.8073 119.142L108.086 91.6568L91.5115 84.7692C87.2712 88.4716 84.5018 89.9328 80.1794 92.1329ZM94.1575 90.6553L102.926 94.8092L94.1247 109.299L87.8218 95.7861C91.4704 93.4875 94.1658 90.6553 94.1658 90.6553M70.6798 45.6437C66.875 43.1891 58.8464 39.5688 58.8464 39.5688L59.1258 14.5961C62.2074 17.7485 73.4738 25.7444 73.4738 25.7444L71.9124 33.8798L74.1723 35.653L78.7002 22.7562L51.5409 0L51.0725 43.4846C54.1788 43.5175 66.8422 47.5729 69.6772 48.5005L70.688 45.6355L70.6798 45.6437ZM72.1425 120.595L77.4182 145.641L60.4899 172.444L61.2049 106.491C61.2049 106.491 67.9844 106.056 71.8385 103.478L70.0224 96.295C62.5772 98.6511 56.2743 99.2668 52.9626 99.4228L51.8943 198L83.0555 148.063L75.7336 118.936L72.1507 120.595H72.1425Z"], "RES": ["M68.05 0.18L76.5 7.51L115.07 7.61L114.76 129.31L60.7 182.6L6.91 129.03L7.22 7.33L45.87 7.43L54.38 0.14L0.34 0L0 132.22L60.67 192.48L121.67 132.53L122 0.31L68.06 0.17L68.05 0.18ZM73.45 70.83V67.01L106.31 40.75L106.37 18.04L72.11 17.95L61.2 8.87L50.25 17.88L15.88 17.79L15.82 40.92L48.63 67.32V70.76L54.66 70.77V76.35L48.6 76.34L48.58 83.65H54.62L54.51 126.69L38.41 126.65L38.43 119.34L47.05 119.36L47.08 108.81L27.53 108.76L27.46 133.53L47.74 154.68L47.77 144.91L54.47 144.95L54.43 160.11L60.74 166.82L67.09 160.24L67.29 83.69L73.33 83.71V76.4L67.31 76.39V70.8L73.46 70.82L73.45 70.83ZM61.15 18.53L66.66 23.33L61.12 29.47L55.51 23.3L61.15 18.53ZM60.98 52.39L49.72 55.97L25.02 36.1L25.04 27.56L50.09 27.63L61.11 39.96L72.2 27.69L97.14 27.75L97.12 35.89L72.61 55.47L60.97 52.39H60.98Z"]};
 const colors={RES:'#75C8FF',ENL:'#80EF98',MACHINA:'#fb4a4a',NIA:'#ffd45a',OTHER:'#eee'};
 function canonicalCount(names){return new Set(names.map(n=>String(n).trim().toLowerCase()).filter(Boolean)).size;}
 const outline='M14 41C11 31 1 22 1 14a13 13 0 0 1 26 0c0 8-10 17-13 27Z';
 function originalPin(roles,count=1,inferred=false){const set=new Set(roles),mixed=set.has('RES')&&set.has('ENL'),color=mixed?colors.RES:set.size===1?colors[[...set][0]]||colors.OTHER:colors.OTHER,number=String(count),size=number.length>2?9:number.length>1?11:13;
  return '<svg class="ptcg-location-pin '+(inferred?'ptcg-hollow-pin':'ptcg-solid-pin')+'" viewBox="0 0 28 42" width="28" height="42" aria-hidden="true" data-count="'+number+'" data-mixed="'+mixed+'"><path d="'+outline+'" fill="'+(inferred?'none':color)+'" stroke="#08131c" stroke-width="4"'+(inferred?' stroke-dasharray="3 2"':'')+'/>'+(mixed&&!inferred?'<svg x="14" y="0" width="14" height="42" viewBox="14 0 14 42"><path d="'+outline+'" fill="'+colors.ENL+'"/></svg>':'')+'<path d="'+outline+'" fill="none" stroke="'+(inferred?color:'#eefbff')+'" stroke-width="1.5"'+(inferred?' stroke-dasharray="3 2"':'')+'/>'+(inferred?'':'<circle cx="14" cy="14" r="9" fill="#10212b"/><text x="14" y="14" dominant-baseline="central" text-anchor="middle" font-size="'+size+'" font-family="Arial,sans-serif" fill="#f7fcff"'+(number.length>2?' textLength="20" lengthAdjust="spacingAndGlyphs"':'')+'>'+number+'</text>')+'</svg>';
 }
 function observedGeometry(angle=0,gap=2){
  angle=Number.isFinite(angle)&&angle>=-180&&angle<=180?angle:0;gap=Number.isFinite(gap)&&gap>=0&&gap<=20?gap:2;
  const radians=angle*Math.PI/180,cx=44+27*Math.sin(radians),cy=44-27*Math.cos(radians);
  // The original outline fits the convex hull of its 13px circular head and
  // its tip. Include the 2px outline stroke; padding has no pointer target.
  return {angle,size:[88,88],anchor:[44,44],center:[cx,cy],labelLeft:cx,labelTop:Math.max(46,cy+15)+gap};
 }
 function pin(roles,count=1,inferred=false,angle=0){
  if(inferred)return originalPin(roles,count,true); // exact previous inferred artwork
  const base=originalPin(roles,count,false),circle=base.indexOf('<circle'),shape=base.slice(base.indexOf('>')+1,circle),numbers=base.slice(circle,base.lastIndexOf('</svg>')),g=observedGeometry(angle),cx=g.center[0],cy=g.center[1];
  const upright=numbers.replace('cx="14" cy="14"','cx="'+cx+'" cy="'+cy+'"').replace('x="14" y="14"','x="'+cx+'" y="'+cy+'"');
  return base.slice(0,base.indexOf('>')+1).replace('0 0 28 42','0 0 88 88').replace('width="28" height="42"','width="88" height="88"').replace('aria-hidden="true"','aria-hidden="true" data-angle="'+g.angle+'"')+'<g class="ptcg-observed-shape" transform="translate(44 44) rotate('+g.angle+') translate(-14 -41)">'+shape+'</g><g class="ptcg-pin-count">'+upright+'</g></svg>';
 }
 function emblem(role){if(!emblems[role])return '';const box=role==='RES'?'0 0 122 193':'0 0 116 198';return '<svg class="ptcg-faction-emblem" viewBox="'+box+'" width="18" height="28" role="img" aria-label="'+(role==='RES'?'Resistance':'Enlightened')+'" data-faction="'+role+'" fill="'+colors[role]+'">'+emblems[role].map(d=>'<path d="'+d+'"/>').join('')+'</svg>';}
 return {canonicalCount,pin,emblem,colors,observedGeometry,observedSize:[88,88],observedAnchor:[44,44],inferredSize:[28,42],inferredAnchor:[14,41]};
}

/* Region Boolean geometry and area representatives. Original adapters, MIT. */
function createTrackerRegion(){
 const clipping=(()=>{const module={exports:{}},exports=module.exports;
/* The MIT License (MIT)

Copyright (c) 2018 Mike Fogel <mike@fogel.ca> - covers everything not specially attributed to others below.

Copyright (c) 2016 Alexander Milevski <info@w8r.name> - covers all portions originally part of github:w8r/martinez, from which this project was forked on Febuary 2, 2018.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).polygonClipping=e()}(this,(function(){"use strict";
/**
     * splaytree v3.1.2
     * Fast Splay tree for Node and browser
     *
     * @author Alexander Milevski <info@w8r.name>
     * @license MIT
     * @preserve
     */
/*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */function t(t,e){var n,r,i,o,s={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return o={next:l(0),throw:l(1),return:l(2)},"function"==typeof Symbol&&(o[Symbol.iterator]=function(){return this}),o;function l(o){return function(l){return function(o){if(n)throw new TypeError("Generator is already executing.");for(;s;)try{if(n=1,r&&(i=2&o[0]?r.return:o[0]?r.throw||((i=r.return)&&i.call(r),0):r.next)&&!(i=i.call(r,o[1])).done)return i;switch(r=0,i&&(o=[2&o[0],i.value]),o[0]){case 0:case 1:i=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,r=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(i=s.trys,(i=i.length>0&&i[i.length-1])||6!==o[0]&&2!==o[0])){s=0;continue}if(3===o[0]&&(!i||o[1]>i[0]&&o[1]<i[3])){s.label=o[1];break}if(6===o[0]&&s.label<i[1]){s.label=i[1],i=o;break}if(i&&s.label<i[2]){s.label=i[2],s.ops.push(o);break}i[2]&&s.ops.pop(),s.trys.pop();continue}o=e.call(t,s)}catch(t){o=[6,t],r=0}finally{n=i=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,l])}}}var e=function(t,e){this.next=null,this.key=t,this.data=e,this.left=null,this.right=null};function n(t,e){return t>e?1:t<e?-1:0}function r(t,n,r){for(var i=new e(null,null),o=i,s=i;;){var l=r(t,n.key);if(l<0){if(null===n.left)break;if(r(t,n.left.key)<0){var h=n.left;if(n.left=h.right,h.right=n,null===(n=h).left)break}s.left=n,s=n,n=n.left}else{if(!(l>0))break;if(null===n.right)break;if(r(t,n.right.key)>0){h=n.right;if(n.right=h.left,h.left=n,null===(n=h).right)break}o.right=n,o=n,n=n.right}}return o.right=n.left,s.left=n.right,n.left=i.right,n.right=i.left,n}function i(t,n,i,o){var s=new e(t,n);if(null===i)return s.left=s.right=null,s;var l=o(t,(i=r(t,i,o)).key);return l<0?(s.left=i.left,s.right=i,i.left=null):l>=0&&(s.right=i.right,s.left=i,i.right=null),s}function o(t,e,n){var i=null,o=null;if(e){var s=n((e=r(t,e,n)).key,t);0===s?(i=e.left,o=e.right):s<0?(o=e.right,e.right=null,i=e):(i=e.left,e.left=null,o=e)}return{left:i,right:o}}function s(t,e,n,r,i){if(t){r(e+(n?"└── ":"├── ")+i(t)+"\n");var o=e+(n?"    ":"│   ");t.left&&s(t.left,o,!1,r,i),t.right&&s(t.right,o,!0,r,i)}}var l=function(){function l(t){void 0===t&&(t=n),this._root=null,this._size=0,this._comparator=t}return l.prototype.insert=function(t,e){return this._size++,this._root=i(t,e,this._root,this._comparator)},l.prototype.add=function(t,n){var i=new e(t,n);null===this._root&&(i.left=i.right=null,this._size++,this._root=i);var o=this._comparator,s=r(t,this._root,o),l=o(t,s.key);return 0===l?this._root=s:(l<0?(i.left=s.left,i.right=s,s.left=null):l>0&&(i.right=s.right,i.left=s,s.right=null),this._size++,this._root=i),this._root},l.prototype.remove=function(t){this._root=this._remove(t,this._root,this._comparator)},l.prototype._remove=function(t,e,n){var i;return null===e?null:0===n(t,(e=r(t,e,n)).key)?(null===e.left?i=e.right:(i=r(t,e.left,n)).right=e.right,this._size--,i):e},l.prototype.pop=function(){var t=this._root;if(t){for(;t.left;)t=t.left;return this._root=r(t.key,this._root,this._comparator),this._root=this._remove(t.key,this._root,this._comparator),{key:t.key,data:t.data}}return null},l.prototype.findStatic=function(t){for(var e=this._root,n=this._comparator;e;){var r=n(t,e.key);if(0===r)return e;e=r<0?e.left:e.right}return null},l.prototype.find=function(t){return this._root&&(this._root=r(t,this._root,this._comparator),0!==this._comparator(t,this._root.key))?null:this._root},l.prototype.contains=function(t){for(var e=this._root,n=this._comparator;e;){var r=n(t,e.key);if(0===r)return!0;e=r<0?e.left:e.right}return!1},l.prototype.forEach=function(t,e){for(var n=this._root,r=[],i=!1;!i;)null!==n?(r.push(n),n=n.left):0!==r.length?(n=r.pop(),t.call(e,n),n=n.right):i=!0;return this},l.prototype.range=function(t,e,n,r){for(var i=[],o=this._comparator,s=this._root;0!==i.length||s;)if(s)i.push(s),s=s.left;else{if(o((s=i.pop()).key,e)>0)break;if(o(s.key,t)>=0&&n.call(r,s))return this;s=s.right}return this},l.prototype.keys=function(){var t=[];return this.forEach((function(e){var n=e.key;return t.push(n)})),t},l.prototype.values=function(){var t=[];return this.forEach((function(e){var n=e.data;return t.push(n)})),t},l.prototype.min=function(){return this._root?this.minNode(this._root).key:null},l.prototype.max=function(){return this._root?this.maxNode(this._root).key:null},l.prototype.minNode=function(t){if(void 0===t&&(t=this._root),t)for(;t.left;)t=t.left;return t},l.prototype.maxNode=function(t){if(void 0===t&&(t=this._root),t)for(;t.right;)t=t.right;return t},l.prototype.at=function(t){for(var e=this._root,n=!1,r=0,i=[];!n;)if(e)i.push(e),e=e.left;else if(i.length>0){if(e=i.pop(),r===t)return e;r++,e=e.right}else n=!0;return null},l.prototype.next=function(t){var e=this._root,n=null;if(t.right){for(n=t.right;n.left;)n=n.left;return n}for(var r=this._comparator;e;){var i=r(t.key,e.key);if(0===i)break;i<0?(n=e,e=e.left):e=e.right}return n},l.prototype.prev=function(t){var e=this._root,n=null;if(null!==t.left){for(n=t.left;n.right;)n=n.right;return n}for(var r=this._comparator;e;){var i=r(t.key,e.key);if(0===i)break;i<0?e=e.left:(n=e,e=e.right)}return n},l.prototype.clear=function(){return this._root=null,this._size=0,this},l.prototype.toList=function(){return function(t){var n=t,r=[],i=!1,o=new e(null,null),s=o;for(;!i;)n?(r.push(n),n=n.left):r.length>0?n=(n=s=s.next=r.pop()).right:i=!0;return s.next=null,o.next}(this._root)},l.prototype.load=function(t,n,r){void 0===n&&(n=[]),void 0===r&&(r=!1);var i=t.length,o=this._comparator;if(r&&f(t,n,0,i-1,o),null===this._root)this._root=h(t,n,0,i),this._size=i;else{var s=function(t,n,r){var i=new e(null,null),o=i,s=t,l=n;for(;null!==s&&null!==l;)r(s.key,l.key)<0?(o.next=s,s=s.next):(o.next=l,l=l.next),o=o.next;null!==s?o.next=s:null!==l&&(o.next=l);return i.next}(this.toList(),function(t,n){for(var r=new e(null,null),i=r,o=0;o<t.length;o++)i=i.next=new e(t[o],n[o]);return i.next=null,r.next}(t,n),o);i=this._size+i,this._root=u({head:s},0,i)}return this},l.prototype.isEmpty=function(){return null===this._root},Object.defineProperty(l.prototype,"size",{get:function(){return this._size},enumerable:!0,configurable:!0}),Object.defineProperty(l.prototype,"root",{get:function(){return this._root},enumerable:!0,configurable:!0}),l.prototype.toString=function(t){void 0===t&&(t=function(t){return String(t.key)});var e=[];return s(this._root,"",!0,(function(t){return e.push(t)}),t),e.join("")},l.prototype.update=function(t,e,n){var s=this._comparator,l=o(t,this._root,s),h=l.left,u=l.right;s(t,e)<0?u=i(e,n,u,s):h=i(e,n,h,s),this._root=function(t,e,n){return null===e?t:(null===t||((e=r(t.key,e,n)).left=t),e)}(h,u,s)},l.prototype.split=function(t){return o(t,this._root,this._comparator)},l.prototype[Symbol.iterator]=function(){var e,n,r;return t(this,(function(t){switch(t.label){case 0:e=this._root,n=[],r=!1,t.label=1;case 1:return r?[3,6]:null===e?[3,2]:(n.push(e),e=e.left,[3,5]);case 2:return 0===n.length?[3,4]:[4,e=n.pop()];case 3:return t.sent(),e=e.right,[3,5];case 4:r=!0,t.label=5;case 5:return[3,1];case 6:return[2]}}))},l}();function h(t,n,r,i){var o=i-r;if(o>0){var s=r+Math.floor(o/2),l=t[s],u=n[s],f=new e(l,u);return f.left=h(t,n,r,s),f.right=h(t,n,s+1,i),f}return null}function u(t,e,n){var r=n-e;if(r>0){var i=e+Math.floor(r/2),o=u(t,e,i),s=t.head;return s.left=o,t.head=t.head.next,s.right=u(t,i+1,n),s}return null}function f(t,e,n,r,i){if(!(n>=r)){for(var o=t[n+r>>1],s=n-1,l=r+1;;){do{s++}while(i(t[s],o)<0);do{l--}while(i(t[l],o)>0);if(s>=l)break;var h=t[s];t[s]=t[l],t[l]=h,h=e[s],e[s]=e[l],e[l]=h}f(t,e,n,l,i),f(t,e,l+1,r,i)}}const c=(t,e)=>t.ll.x<=e.x&&e.x<=t.ur.x&&t.ll.y<=e.y&&e.y<=t.ur.y,p=(t,e)=>{if(e.ur.x<t.ll.x||t.ur.x<e.ll.x||e.ur.y<t.ll.y||t.ur.y<e.ll.y)return null;const n=t.ll.x<e.ll.x?e.ll.x:t.ll.x,r=t.ur.x<e.ur.x?t.ur.x:e.ur.x;return{ll:{x:n,y:t.ll.y<e.ll.y?e.ll.y:t.ll.y},ur:{x:r,y:t.ur.y<e.ur.y?t.ur.y:e.ur.y}}};let g=Number.EPSILON;void 0===g&&(g=Math.pow(2,-52));const a=g*g,y=(t,e)=>{if(-g<t&&t<g&&-g<e&&e<g)return 0;const n=t-e;return n*n<a*t*e?0:t<e?-1:1};class x{constructor(){this.tree=new l,this.round(0)}round(t){const e=this.tree.add(t),n=this.tree.prev(e);if(null!==n&&0===y(e.key,n.key))return this.tree.remove(t),n.key;const r=this.tree.next(e);return null!==r&&0===y(e.key,r.key)?(this.tree.remove(t),r.key):t}}const b=new class{constructor(){this.reset()}reset(){this.xRounder=new x,this.yRounder=new x}round(t,e){return{x:this.xRounder.round(t),y:this.yRounder.round(e)}}},v=11102230246251565e-32,d=134217729,m=(3+8*v)*v;function E(t,e,n,r,i){let o,s,l,h,u=e[0],f=r[0],c=0,p=0;f>u==f>-u?(o=u,u=e[++c]):(o=f,f=r[++p]);let g=0;if(c<t&&p<n)for(f>u==f>-u?(s=u+o,l=o-(s-u),u=e[++c]):(s=f+o,l=o-(s-f),f=r[++p]),o=s,0!==l&&(i[g++]=l);c<t&&p<n;)f>u==f>-u?(s=o+u,h=s-o,l=o-(s-h)+(u-h),u=e[++c]):(s=o+f,h=s-o,l=o-(s-h)+(f-h),f=r[++p]),o=s,0!==l&&(i[g++]=l);for(;c<t;)s=o+u,h=s-o,l=o-(s-h)+(u-h),u=e[++c],o=s,0!==l&&(i[g++]=l);for(;p<n;)s=o+f,h=s-o,l=o-(s-h)+(f-h),f=r[++p],o=s,0!==l&&(i[g++]=l);return 0===o&&0!==g||(i[g++]=o),g}function S(t){return new Float64Array(t)}const _=22204460492503146e-32,w=11093356479670487e-47,k=S(4),R=S(8),I=S(12),P=S(16),N=S(4);function A(t,e,n,r,i,o){const s=(e-o)*(n-i),l=(t-i)*(r-o),h=s-l,u=Math.abs(s+l);return Math.abs(h)>=33306690738754716e-32*u?h:-function(t,e,n,r,i,o,s){let l,h,u,f,c,p,g,a,y,x,b,v,S,A,O,L,$,M;const z=t-i,B=n-i,G=e-o,T=r-o;A=z*T,p=d*z,g=p-(p-z),a=z-g,p=d*T,y=p-(p-T),x=T-y,O=a*x-(A-g*y-a*y-g*x),L=G*B,p=d*G,g=p-(p-G),a=G-g,p=d*B,y=p-(p-B),x=B-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,k[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,k[1]=S-(b+c)+(c-L),M=v+b,c=M-v,k[2]=v-(M-c)+(b-c),k[3]=M;let q=function(t,e){let n=e[0];for(let r=1;r<t;r++)n+=e[r];return n}(4,k),C=_*s;if(q>=C||-q>=C)return q;if(c=t-z,l=t-(z+c)+(c-i),c=n-B,u=n-(B+c)+(c-i),c=e-G,h=e-(G+c)+(c-o),c=r-T,f=r-(T+c)+(c-o),0===l&&0===h&&0===u&&0===f)return q;if(C=w*s+m*Math.abs(q),q+=z*f+T*l-(G*u+B*h),q>=C||-q>=C)return q;A=l*T,p=d*l,g=p-(p-l),a=l-g,p=d*T,y=p-(p-T),x=T-y,O=a*x-(A-g*y-a*y-g*x),L=h*B,p=d*h,g=p-(p-h),a=h-g,p=d*B,y=p-(p-B),x=B-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,N[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,N[1]=S-(b+c)+(c-L),M=v+b,c=M-v,N[2]=v-(M-c)+(b-c),N[3]=M;const F=E(4,k,4,N,R);A=z*f,p=d*z,g=p-(p-z),a=z-g,p=d*f,y=p-(p-f),x=f-y,O=a*x-(A-g*y-a*y-g*x),L=G*u,p=d*G,g=p-(p-G),a=G-g,p=d*u,y=p-(p-u),x=u-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,N[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,N[1]=S-(b+c)+(c-L),M=v+b,c=M-v,N[2]=v-(M-c)+(b-c),N[3]=M;const j=E(F,R,4,N,I);A=l*f,p=d*l,g=p-(p-l),a=l-g,p=d*f,y=p-(p-f),x=f-y,O=a*x-(A-g*y-a*y-g*x),L=h*u,p=d*h,g=p-(p-h),a=h-g,p=d*u,y=p-(p-u),x=u-y,$=a*x-(L-g*y-a*y-g*x),b=O-$,c=O-b,N[0]=O-(b+c)+(c-$),v=A+b,c=v-A,S=A-(v-c)+(b-c),b=S-L,c=S-b,N[1]=S-(b+c)+(c-L),M=v+b,c=M-v,N[2]=v-(M-c)+(b-c),N[3]=M;const U=E(j,I,4,N,P);return P[U-1]}(t,e,n,r,i,o,u)}const O=(t,e)=>t.x*e.y-t.y*e.x,L=(t,e)=>t.x*e.x+t.y*e.y,$=(t,e,n)=>{const r=A(t.x,t.y,e.x,e.y,n.x,n.y);return r>0?-1:r<0?1:0},M=t=>Math.sqrt(L(t,t)),z=(t,e,n)=>{const r={x:e.x-t.x,y:e.y-t.y},i={x:n.x-t.x,y:n.y-t.y};return O(i,r)/M(i)/M(r)},B=(t,e,n)=>{const r={x:e.x-t.x,y:e.y-t.y},i={x:n.x-t.x,y:n.y-t.y};return L(i,r)/M(i)/M(r)},G=(t,e,n)=>0===e.y?null:{x:t.x+e.x/e.y*(n-t.y),y:n},T=(t,e,n)=>0===e.x?null:{x:n,y:t.y+e.y/e.x*(n-t.x)};class q{static compare(t,e){const n=q.comparePoints(t.point,e.point);return 0!==n?n:(t.point!==e.point&&t.link(e),t.isLeft!==e.isLeft?t.isLeft?1:-1:F.compare(t.segment,e.segment))}static comparePoints(t,e){return t.x<e.x?-1:t.x>e.x?1:t.y<e.y?-1:t.y>e.y?1:0}constructor(t,e){void 0===t.events?t.events=[this]:t.events.push(this),this.point=t,this.isLeft=e}link(t){if(t.point===this.point)throw new Error("Tried to link already linked events");const e=t.point.events;for(let t=0,n=e.length;t<n;t++){const n=e[t];this.point.events.push(n),n.point=this.point}this.checkForConsuming()}checkForConsuming(){const t=this.point.events.length;for(let e=0;e<t;e++){const n=this.point.events[e];if(void 0===n.segment.consumedBy)for(let r=e+1;r<t;r++){const t=this.point.events[r];void 0===t.consumedBy&&(n.otherSE.point.events===t.otherSE.point.events&&n.segment.consume(t.segment))}}}getAvailableLinkedEvents(){const t=[];for(let e=0,n=this.point.events.length;e<n;e++){const n=this.point.events[e];n!==this&&!n.segment.ringOut&&n.segment.isInResult()&&t.push(n)}return t}getLeftmostComparator(t){const e=new Map,n=n=>{const r=n.otherSE;e.set(n,{sine:z(this.point,t.point,r.point),cosine:B(this.point,t.point,r.point)})};return(t,r)=>{e.has(t)||n(t),e.has(r)||n(r);const{sine:i,cosine:o}=e.get(t),{sine:s,cosine:l}=e.get(r);return i>=0&&s>=0?o<l?1:o>l?-1:0:i<0&&s<0?o<l?-1:o>l?1:0:s<i?-1:s>i?1:0}}}let C=0;class F{static compare(t,e){const n=t.leftSE.point.x,r=e.leftSE.point.x,i=t.rightSE.point.x,o=e.rightSE.point.x;if(o<n)return 1;if(i<r)return-1;const s=t.leftSE.point.y,l=e.leftSE.point.y,h=t.rightSE.point.y,u=e.rightSE.point.y;if(n<r){if(l<s&&l<h)return 1;if(l>s&&l>h)return-1;const n=t.comparePoint(e.leftSE.point);if(n<0)return 1;if(n>0)return-1;const r=e.comparePoint(t.rightSE.point);return 0!==r?r:-1}if(n>r){if(s<l&&s<u)return-1;if(s>l&&s>u)return 1;const n=e.comparePoint(t.leftSE.point);if(0!==n)return n;const r=t.comparePoint(e.rightSE.point);return r<0?1:r>0?-1:1}if(s<l)return-1;if(s>l)return 1;if(i<o){const n=e.comparePoint(t.rightSE.point);if(0!==n)return n}if(i>o){const n=t.comparePoint(e.rightSE.point);if(n<0)return 1;if(n>0)return-1}if(i!==o){const t=h-s,e=i-n,f=u-l,c=o-r;if(t>e&&f<c)return 1;if(t<e&&f>c)return-1}return i>o?1:i<o||h<u?-1:h>u?1:t.id<e.id?-1:t.id>e.id?1:0}constructor(t,e,n,r){this.id=++C,this.leftSE=t,t.segment=this,t.otherSE=e,this.rightSE=e,e.segment=this,e.otherSE=t,this.rings=n,this.windings=r}static fromRing(t,e,n){let r,i,o;const s=q.comparePoints(t,e);if(s<0)r=t,i=e,o=1;else{if(!(s>0))throw new Error(`Tried to create degenerate segment at [${t.x}, ${t.y}]`);r=e,i=t,o=-1}const l=new q(r,!0),h=new q(i,!1);return new F(l,h,[n],[o])}replaceRightSE(t){this.rightSE=t,this.rightSE.segment=this,this.rightSE.otherSE=this.leftSE,this.leftSE.otherSE=this.rightSE}bbox(){const t=this.leftSE.point.y,e=this.rightSE.point.y;return{ll:{x:this.leftSE.point.x,y:t<e?t:e},ur:{x:this.rightSE.point.x,y:t>e?t:e}}}vector(){return{x:this.rightSE.point.x-this.leftSE.point.x,y:this.rightSE.point.y-this.leftSE.point.y}}isAnEndpoint(t){return t.x===this.leftSE.point.x&&t.y===this.leftSE.point.y||t.x===this.rightSE.point.x&&t.y===this.rightSE.point.y}comparePoint(t){if(this.isAnEndpoint(t))return 0;const e=this.leftSE.point,n=this.rightSE.point,r=this.vector();if(e.x===n.x)return t.x===e.x?0:t.x<e.x?1:-1;const i=(t.y-e.y)/r.y,o=e.x+i*r.x;if(t.x===o)return 0;const s=(t.x-e.x)/r.x,l=e.y+s*r.y;return t.y===l?0:t.y<l?-1:1}getIntersection(t){const e=this.bbox(),n=t.bbox(),r=p(e,n);if(null===r)return null;const i=this.leftSE.point,o=this.rightSE.point,s=t.leftSE.point,l=t.rightSE.point,h=c(e,s)&&0===this.comparePoint(s),u=c(n,i)&&0===t.comparePoint(i),f=c(e,l)&&0===this.comparePoint(l),g=c(n,o)&&0===t.comparePoint(o);if(u&&h)return g&&!f?o:!g&&f?l:null;if(u)return f&&i.x===l.x&&i.y===l.y?null:i;if(h)return g&&o.x===s.x&&o.y===s.y?null:s;if(g&&f)return null;if(g)return o;if(f)return l;const a=((t,e,n,r)=>{if(0===e.x)return T(n,r,t.x);if(0===r.x)return T(t,e,n.x);if(0===e.y)return G(n,r,t.y);if(0===r.y)return G(t,e,n.y);const i=O(e,r);if(0==i)return null;const o={x:n.x-t.x,y:n.y-t.y},s=O(o,e)/i,l=O(o,r)/i;return{x:(t.x+l*e.x+(n.x+s*r.x))/2,y:(t.y+l*e.y+(n.y+s*r.y))/2}})(i,this.vector(),s,t.vector());return null===a?null:c(r,a)?b.round(a.x,a.y):null}split(t){const e=[],n=void 0!==t.events,r=new q(t,!0),i=new q(t,!1),o=this.rightSE;this.replaceRightSE(i),e.push(i),e.push(r);const s=new F(r,o,this.rings.slice(),this.windings.slice());return q.comparePoints(s.leftSE.point,s.rightSE.point)>0&&s.swapEvents(),q.comparePoints(this.leftSE.point,this.rightSE.point)>0&&this.swapEvents(),n&&(r.checkForConsuming(),i.checkForConsuming()),e}swapEvents(){const t=this.rightSE;this.rightSE=this.leftSE,this.leftSE=t,this.leftSE.isLeft=!0,this.rightSE.isLeft=!1;for(let t=0,e=this.windings.length;t<e;t++)this.windings[t]*=-1}consume(t){let e=this,n=t;for(;e.consumedBy;)e=e.consumedBy;for(;n.consumedBy;)n=n.consumedBy;const r=F.compare(e,n);if(0!==r){if(r>0){const t=e;e=n,n=t}if(e.prev===n){const t=e;e=n,n=t}for(let t=0,r=n.rings.length;t<r;t++){const r=n.rings[t],i=n.windings[t],o=e.rings.indexOf(r);-1===o?(e.rings.push(r),e.windings.push(i)):e.windings[o]+=i}n.rings=null,n.windings=null,n.consumedBy=e,n.leftSE.consumedBy=e.leftSE,n.rightSE.consumedBy=e.rightSE}}prevInResult(){return void 0!==this._prevInResult||(this.prev?this.prev.isInResult()?this._prevInResult=this.prev:this._prevInResult=this.prev.prevInResult():this._prevInResult=null),this._prevInResult}beforeState(){if(void 0!==this._beforeState)return this._beforeState;if(this.prev){const t=this.prev.consumedBy||this.prev;this._beforeState=t.afterState()}else this._beforeState={rings:[],windings:[],multiPolys:[]};return this._beforeState}afterState(){if(void 0!==this._afterState)return this._afterState;const t=this.beforeState();this._afterState={rings:t.rings.slice(0),windings:t.windings.slice(0),multiPolys:[]};const e=this._afterState.rings,n=this._afterState.windings,r=this._afterState.multiPolys;for(let t=0,r=this.rings.length;t<r;t++){const r=this.rings[t],i=this.windings[t],o=e.indexOf(r);-1===o?(e.push(r),n.push(i)):n[o]+=i}const i=[],o=[];for(let t=0,r=e.length;t<r;t++){if(0===n[t])continue;const r=e[t],s=r.poly;if(-1===o.indexOf(s))if(r.isExterior)i.push(s);else{-1===o.indexOf(s)&&o.push(s);const t=i.indexOf(r.poly);-1!==t&&i.splice(t,1)}}for(let t=0,e=i.length;t<e;t++){const e=i[t].multiPoly;-1===r.indexOf(e)&&r.push(e)}return this._afterState}isInResult(){if(this.consumedBy)return!1;if(void 0!==this._isInResult)return this._isInResult;const t=this.beforeState().multiPolys,e=this.afterState().multiPolys;switch(H.type){case"union":{const n=0===t.length,r=0===e.length;this._isInResult=n!==r;break}case"intersection":{let n,r;t.length<e.length?(n=t.length,r=e.length):(n=e.length,r=t.length),this._isInResult=r===H.numMultiPolys&&n<r;break}case"xor":{const n=Math.abs(t.length-e.length);this._isInResult=n%2==1;break}case"difference":{const n=t=>1===t.length&&t[0].isSubject;this._isInResult=n(t)!==n(e);break}default:throw new Error(`Unrecognized operation type found ${H.type}`)}return this._isInResult}}class j{constructor(t,e,n){if(!Array.isArray(t)||0===t.length)throw new Error("Input geometry is not a valid Polygon or MultiPolygon");if(this.poly=e,this.isExterior=n,this.segments=[],"number"!=typeof t[0][0]||"number"!=typeof t[0][1])throw new Error("Input geometry is not a valid Polygon or MultiPolygon");const r=b.round(t[0][0],t[0][1]);this.bbox={ll:{x:r.x,y:r.y},ur:{x:r.x,y:r.y}};let i=r;for(let e=1,n=t.length;e<n;e++){if("number"!=typeof t[e][0]||"number"!=typeof t[e][1])throw new Error("Input geometry is not a valid Polygon or MultiPolygon");let n=b.round(t[e][0],t[e][1]);n.x===i.x&&n.y===i.y||(this.segments.push(F.fromRing(i,n,this)),n.x<this.bbox.ll.x&&(this.bbox.ll.x=n.x),n.y<this.bbox.ll.y&&(this.bbox.ll.y=n.y),n.x>this.bbox.ur.x&&(this.bbox.ur.x=n.x),n.y>this.bbox.ur.y&&(this.bbox.ur.y=n.y),i=n)}r.x===i.x&&r.y===i.y||this.segments.push(F.fromRing(i,r,this))}getSweepEvents(){const t=[];for(let e=0,n=this.segments.length;e<n;e++){const n=this.segments[e];t.push(n.leftSE),t.push(n.rightSE)}return t}}class U{constructor(t,e){if(!Array.isArray(t))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");this.exteriorRing=new j(t[0],this,!0),this.bbox={ll:{x:this.exteriorRing.bbox.ll.x,y:this.exteriorRing.bbox.ll.y},ur:{x:this.exteriorRing.bbox.ur.x,y:this.exteriorRing.bbox.ur.y}},this.interiorRings=[];for(let e=1,n=t.length;e<n;e++){const n=new j(t[e],this,!1);n.bbox.ll.x<this.bbox.ll.x&&(this.bbox.ll.x=n.bbox.ll.x),n.bbox.ll.y<this.bbox.ll.y&&(this.bbox.ll.y=n.bbox.ll.y),n.bbox.ur.x>this.bbox.ur.x&&(this.bbox.ur.x=n.bbox.ur.x),n.bbox.ur.y>this.bbox.ur.y&&(this.bbox.ur.y=n.bbox.ur.y),this.interiorRings.push(n)}this.multiPoly=e}getSweepEvents(){const t=this.exteriorRing.getSweepEvents();for(let e=0,n=this.interiorRings.length;e<n;e++){const n=this.interiorRings[e].getSweepEvents();for(let e=0,r=n.length;e<r;e++)t.push(n[e])}return t}}class Y{constructor(t,e){if(!Array.isArray(t))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");try{"number"==typeof t[0][0][0]&&(t=[t])}catch(t){}this.polys=[],this.bbox={ll:{x:Number.POSITIVE_INFINITY,y:Number.POSITIVE_INFINITY},ur:{x:Number.NEGATIVE_INFINITY,y:Number.NEGATIVE_INFINITY}};for(let e=0,n=t.length;e<n;e++){const n=new U(t[e],this);n.bbox.ll.x<this.bbox.ll.x&&(this.bbox.ll.x=n.bbox.ll.x),n.bbox.ll.y<this.bbox.ll.y&&(this.bbox.ll.y=n.bbox.ll.y),n.bbox.ur.x>this.bbox.ur.x&&(this.bbox.ur.x=n.bbox.ur.x),n.bbox.ur.y>this.bbox.ur.y&&(this.bbox.ur.y=n.bbox.ur.y),this.polys.push(n)}this.isSubject=e}getSweepEvents(){const t=[];for(let e=0,n=this.polys.length;e<n;e++){const n=this.polys[e].getSweepEvents();for(let e=0,r=n.length;e<r;e++)t.push(n[e])}return t}}class V{static factory(t){const e=[];for(let n=0,r=t.length;n<r;n++){const r=t[n];if(!r.isInResult()||r.ringOut)continue;let i=null,o=r.leftSE,s=r.rightSE;const l=[o],h=o.point,u=[];for(;i=o,o=s,l.push(o),o.point!==h;)for(;;){const t=o.getAvailableLinkedEvents();if(0===t.length){const t=l[0].point,e=l[l.length-1].point;throw new Error(`Unable to complete output ring starting at [${t.x}, ${t.y}]. Last matching segment found ends at [${e.x}, ${e.y}].`)}if(1===t.length){s=t[0].otherSE;break}let n=null;for(let t=0,e=u.length;t<e;t++)if(u[t].point===o.point){n=t;break}if(null!==n){const t=u.splice(n)[0],r=l.splice(t.index);r.unshift(r[0].otherSE),e.push(new V(r.reverse()));continue}u.push({index:l.length,point:o.point});const r=o.getLeftmostComparator(i);s=t.sort(r)[0].otherSE;break}e.push(new V(l))}return e}constructor(t){this.events=t;for(let e=0,n=t.length;e<n;e++)t[e].segment.ringOut=this;this.poly=null}getGeom(){let t=this.events[0].point;const e=[t];for(let n=1,r=this.events.length-1;n<r;n++){const r=this.events[n].point,i=this.events[n+1].point;0!==$(r,t,i)&&(e.push(r),t=r)}if(1===e.length)return null;const n=e[0],r=e[1];0===$(n,t,r)&&e.shift(),e.push(e[0]);const i=this.isExteriorRing()?1:-1,o=this.isExteriorRing()?0:e.length-1,s=this.isExteriorRing()?e.length:-1,l=[];for(let t=o;t!=s;t+=i)l.push([e[t].x,e[t].y]);return l}isExteriorRing(){if(void 0===this._isExteriorRing){const t=this.enclosingRing();this._isExteriorRing=!t||!t.isExteriorRing()}return this._isExteriorRing}enclosingRing(){return void 0===this._enclosingRing&&(this._enclosingRing=this._calcEnclosingRing()),this._enclosingRing}_calcEnclosingRing(){let t=this.events[0];for(let e=1,n=this.events.length;e<n;e++){const n=this.events[e];q.compare(t,n)>0&&(t=n)}let e=t.segment.prevInResult(),n=e?e.prevInResult():null;for(;;){if(!e)return null;if(!n)return e.ringOut;if(n.ringOut!==e.ringOut)return n.ringOut.enclosingRing()!==e.ringOut?e.ringOut:e.ringOut.enclosingRing();e=n.prevInResult(),n=e?e.prevInResult():null}}}class X{constructor(t){this.exteriorRing=t,t.poly=this,this.interiorRings=[]}addInterior(t){this.interiorRings.push(t),t.poly=this}getGeom(){const t=[this.exteriorRing.getGeom()];if(null===t[0])return null;for(let e=0,n=this.interiorRings.length;e<n;e++){const n=this.interiorRings[e].getGeom();null!==n&&t.push(n)}return t}}class Q{constructor(t){this.rings=t,this.polys=this._composePolys(t)}getGeom(){const t=[];for(let e=0,n=this.polys.length;e<n;e++){const n=this.polys[e].getGeom();null!==n&&t.push(n)}return t}_composePolys(t){const e=[];for(let n=0,r=t.length;n<r;n++){const r=t[n];if(!r.poly)if(r.isExteriorRing())e.push(new X(r));else{const t=r.enclosingRing();t.poly||e.push(new X(t)),t.poly.addInterior(r)}}return e}}class W{constructor(t){let e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:F.compare;this.queue=t,this.tree=new l(e),this.segments=[]}process(t){const e=t.segment,n=[];if(t.consumedBy)return t.isLeft?this.queue.remove(t.otherSE):this.tree.remove(e),n;const r=t.isLeft?this.tree.add(e):this.tree.find(e);if(!r)throw new Error(`Unable to find segment #${e.id} [${e.leftSE.point.x}, ${e.leftSE.point.y}] -> [${e.rightSE.point.x}, ${e.rightSE.point.y}] in SweepLine tree.`);let i,o,s=r,l=r;for(;void 0===i;)s=this.tree.prev(s),null===s?i=null:void 0===s.key.consumedBy&&(i=s.key);for(;void 0===o;)l=this.tree.next(l),null===l?o=null:void 0===l.key.consumedBy&&(o=l.key);if(t.isLeft){let r=null;if(i){const t=i.getIntersection(e);if(null!==t&&(e.isAnEndpoint(t)||(r=t),!i.isAnEndpoint(t))){const e=this._splitSafely(i,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}}let s=null;if(o){const t=o.getIntersection(e);if(null!==t&&(e.isAnEndpoint(t)||(s=t),!o.isAnEndpoint(t))){const e=this._splitSafely(o,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}}if(null!==r||null!==s){let t=null;if(null===r)t=s;else if(null===s)t=r;else{t=q.comparePoints(r,s)<=0?r:s}this.queue.remove(e.rightSE),n.push(e.rightSE);const i=e.split(t);for(let t=0,e=i.length;t<e;t++)n.push(i[t])}n.length>0?(this.tree.remove(e),n.push(t)):(this.segments.push(e),e.prev=i)}else{if(i&&o){const t=i.getIntersection(o);if(null!==t){if(!i.isAnEndpoint(t)){const e=this._splitSafely(i,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}if(!o.isAnEndpoint(t)){const e=this._splitSafely(o,t);for(let t=0,r=e.length;t<r;t++)n.push(e[t])}}}this.tree.remove(e)}return n}_splitSafely(t,e){this.tree.remove(t);const n=t.rightSE;this.queue.remove(n);const r=t.split(e);return r.push(n),void 0===t.consumedBy&&this.tree.add(t),r}}const Z="undefined"!=typeof process&&process.env.POLYGON_CLIPPING_MAX_QUEUE_SIZE||1e6,D="undefined"!=typeof process&&process.env.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS||1e6;const H=new class{run(t,e,n){H.type=t,b.reset();const r=[new Y(e,!0)];for(let t=0,e=n.length;t<e;t++)r.push(new Y(n[t],!1));if(H.numMultiPolys=r.length,"difference"===H.type){const t=r[0];let e=1;for(;e<r.length;)null!==p(r[e].bbox,t.bbox)?e++:r.splice(e,1)}if("intersection"===H.type)for(let t=0,e=r.length;t<e;t++){const e=r[t];for(let n=t+1,i=r.length;n<i;n++)if(null===p(e.bbox,r[n].bbox))return[]}const i=new l(q.compare);for(let t=0,e=r.length;t<e;t++){const e=r[t].getSweepEvents();for(let t=0,n=e.length;t<n;t++)if(i.insert(e[t]),i.size>Z)throw new Error("Infinite loop when putting segment endpoints in a priority queue (queue size too big).")}const o=new W(i);let s=i.size,h=i.pop();for(;h;){const t=h.key;if(i.size===s){const e=t.segment;throw new Error(`Unable to pop() ${t.isLeft?"left":"right"} SweepEvent [${t.point.x}, ${t.point.y}] from segment #${e.id} [${e.leftSE.point.x}, ${e.leftSE.point.y}] -> [${e.rightSE.point.x}, ${e.rightSE.point.y}] from queue.`)}if(i.size>Z)throw new Error("Infinite loop when passing sweep line over endpoints (queue size too big).");if(o.segments.length>D)throw new Error("Infinite loop when passing sweep line over endpoints (too many sweep line segments).");const e=o.process(t);for(let t=0,n=e.length;t<n;t++){const n=e[t];void 0===n.consumedBy&&i.insert(n)}s=i.size,h=i.pop()}b.reset();const u=V.factory(o.segments);return new Q(u).getGeom()}};var J={union:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("union",t,n)},intersection:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("intersection",t,n)},xor:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("xor",t,n)},difference:function(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];return H.run("difference",t,n)}};return J}));

 return module.exports;})();
 const EPS=1e-8;
 function union(polygons){return polygons.length?clipping.union(...polygons):[];}
 function intersect(polygons){return polygons.length?clipping.intersection(...polygons):[];}
 function insideRing(p,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i],cross=(p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]);if(Math.abs(cross)<EPS&&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
 function inside(p,polygon){return insideRing(p,polygon[0])&&!polygon.slice(1).some(r=>insideRing(p,r));}
 function centroid(polygon){let area2=0,mx=0,my=0;for(const ring of polygon)for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],v=a[0]*b[1]-b[0]*a[1];area2+=v;mx+=(a[0]+b[0])*v;my+=(a[1]+b[1])*v;}if(Math.abs(area2)<1e-6)throw Error('degenerate-region');return {areaM2:Math.abs(area2)/2,centroid:[mx/(3*area2),my/(3*area2)]};}
 function representative(polygon){const c=centroid(polygon);if(inside(c.centroid,polygon))return {...c,point:c.centroid,method:'area-centroid'};
  // Vertical arrangement cells. Choose the interior point nearest the area
  // centroid; deterministic geometry operation, never a solver witness/Portal.
  const xs=[...new Set(polygon.flat().map(p=>p[0]))].sort((a,b)=>a-b),cuts=[c.centroid[0],...xs.slice(1).map((x,i)=>(x+xs[i])/2)],points=[];
  for(const x of cuts){const ys=[];for(const ring of polygon)for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1];if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))ys.push(a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]));}ys.sort((a,b)=>a-b);for(let i=0;i+1<ys.length;i+=2){const lo=ys[i],hi=ys[i+1];if(hi-lo<=EPS)continue;const pad=Math.min(.001,(hi-lo)/4),p=[x,Math.max(lo+pad,Math.min(hi-pad,c.centroid[1]))];if(inside(p,polygon))points.push(p);}}
  points.sort((a,b)=>Math.hypot(a[0]-c.centroid[0],a[1]-c.centroid[1])-Math.hypot(b[0]-c.centroid[0],b[1]-c.centroid[1])||a[0]-b[0]||a[1]-b[1]);if(!points.length)throw Error('interior-unresolved');return {...c,point:points[0],method:'interior-central-representative'};
 }
 return {union,intersect,inside,centroid,representative};
}

/* Activity camera controller. No inference, extrapolation or global acquisition. */
function createTrackerActivity(core, env) {
  const state={target:'',paused:true,signature:'',fits:0,programmatic:false,status:'stopped',locationKind:null,eventId:null,time:null,manual:false};
  let seen=new Set(),watermark=-Infinity;
  function location(e){
    if(!e||core.isSystem(e)||e.quality==='ambiguous-actor')return null;
    const a=core.interactionEvidence(e);
    if(a&&!a.reason)return {points:[a.position],kind:'activity-location'};
    if(['destroyedResonator','destroyedLink','destroyedField','fielded','neutralized'].includes(e.action)){
      const points=[...new Map((e.portals||[]).filter(p=>Array.isArray(p.position)&&p.position.length===2&&p.position.every(Number.isFinite)&&Math.abs(p.position[0])<=90&&Math.abs(p.position[1])<=180).map(p=>[p.position.join(','),p.position])).values()];
      if(points.length)return {points,kind:'event-geometry'};
    }return null;
  }
  function update(force=false){
    if(state.paused||!state.target){env.change?.({...state});return;}
    const context=env.context(),events=env.events(state.target).filter(e=>!core.isSystem(e)&&e.time>=context.lower&&e.time<=context.T).sort((a,b)=>b.time-a.time||a.guid.localeCompare(b.guid));
    if(!context.visible){state.status='display-off';env.change?.({...state});return;}
    const novel=events.filter(e=>!seen.has(e.guid)&&e.time>=watermark),candidate=force?events.find(e=>location(e)):novel[0];
    for(const e of events)seen.add(e.guid);
    if(novel.length)watermark=Math.max(watermark,...novel.map(e=>e.time));
    if(!events.length)state.status='outside-coverage';
    else if(candidate&&!location(candidate))state.status='waiting';
    else if(candidate){
      const loc=location(candidate);state.locationKind=loc.kind;state.eventId=candidate.guid;state.time=candidate.time;state.signature=candidate.guid+'|'+candidate.time;
      state.programmatic=true;try{env.center(loc);state.fits++;state.manual=false;}finally{state.programmatic=false;}
      state.status=context.live?'following':'historical';
    }else if(!context.live)state.status='historical';
    else if(state.eventId&&state.status!=='waiting')state.status='following';else state.status='waiting';
    env.change?.({...state});
  }
  function start(name){if(core.isSystem({player:name}))return false;state.target=name;state.paused=false;state.signature='';state.eventId=null;state.time=null;state.locationKind=null;seen=new Set();watermark=-Infinity;update(true);return true;}
  function stop(reason='stopped'){state.paused=true;state.status=reason;state.signature='';state.eventId=null;state.time=null;state.locationKind=null;seen.clear();watermark=-Infinity;env.change?.({...state});}
  function manual(){if(!state.programmatic&&!state.paused){state.manual=true;env.change?.({...state});}}
  return {state,location,start,stop,manual,update};
}

/* UI-only keyed catalog. No DOM text scanning and no raw-record mutation. */
function createTrackerI18n(preference,navigator={}) {
  const catalog={
  "backtrack_archive_capacity": {
    "en": "Saving limit reached. Raw page remains in this page; export it before closing.",
    "zh-TW": "保存容量已達上限；原始頁面仍留本頁，關閉前請匯出。",
    "zh-CN": "保存容量已达上限；原始页面仍留本页，关闭前请导出。",
    "ja": "保存上限です。元のページはこのページ内に保持されています。閉じる前にエクスポートしてください。"
  },
  "backtrack_archive_failed": {
    "en": "Historical raw saving/export failed",
    "zh-TW": "歷史原始頁面保存／匯出失敗",
    "zh-CN": "历史原始页面保存／导出失败",
    "ja": "過去ログの保存／エクスポート失敗"
  },
  "backtrack_archive_cancelled": {
    "en": "Saving cancelled",
    "zh-TW": "已取消保存",
    "zh-CN": "已取消保存",
    "ja": "保存が取り消されました"
  },
  "backtrack_download_raw": {
    "en": "Download original historical pages",
    "zh-TW": "下載歷史原始頁面",
    "zh-CN": "下载历史原始页面",
    "ja": "元の過去ログページをダウンロード"
  },
  "observed_speed": {
    "en": "Observed interaction speed",
    "zh-TW": "互動記錄速度",
    "zh-CN": "互动记录速度",
    "ja": "相互作用記録の速度"
  },
  "route_useful": {
    "en": "Conditional simulation available",
    "zh-TW": "可顯示條件模擬",
    "zh-CN": "可显示条件模拟",
    "ja": "条件付き推定を表示可能"
  },
  "route_coarse": {
    "en": "Coarse feasible route; location not tightened",
    "zh-TW": "可行粗略軌跡；位置尚未收斂",
    "zh-CN": "可行粗略轨迹；位置尚未收敛",
    "ja": "粗い実行可能な軌跡。位置は未絞込み"
  },
  "route_pending": {
    "en": "Computing simulation",
    "zh-TW": "正在計算模擬",
    "zh-CN": "正在计算模拟",
    "ja": "推定を計算中"
  },
  "route_unavailable": {
    "en": "Simulation unavailable",
    "zh-TW": "目前無法推論",
    "zh-CN": "当前无法推论",
    "ja": "推定を利用できません"
  },
  "route_not-useful": {
    "en": "Location estimate not displayable",
    "zh-TW": "位置估計暫不適合顯示",
    "zh-CN": "位置估计暂不适合显示",
    "ja": "位置推定は表示対象外"
  },
  "backtrack_reason_retry": {
    "en": "Retry scheduled; waiting for shared backoff.",
    "zh-TW": "已排定重試，等待共用退避結束。",
    "zh-CN": "已安排重试，等待共享退避结束。",
    "ja": "再試行を予約しました。共有の待機時間が終了するまで待ちます。"
  },
  "manual_flip": {
    "en": "Manual ADA/JARVIS flip",
    "zh-TW": "手動 ADA/JARVIS 翻轉",
    "zh-CN": "手动 ADA/JARVIS 翻转",
    "ja": "ADA/JARVIS の手動反転"
  },
  "backtrack_title": {
    "en": "Historical Log backtracking",
    "zh-TW": "歷史 Log 回溯",
    "zh-CN": "历史 Log 回溯",
    "ja": "過去ログの遡及取得"
  },
  "backtrack_start_time": {
    "en": "Starting T → earlier",
    "zh-TW": "起始 T → 往更早",
    "zh-CN": "起始 T → 往更早",
    "ja": "開始時刻 T → 過去へ"
  },
  "backtrack_upper_help": {
    "en": "T is the first page query upper bound.",
    "zh-TW": "T 是第一頁查詢上界。",
    "zh-CN": "T 是第一页查询上界。",
    "ja": "T は最初のページの取得上限時刻です。"
  },
  "backtrack_set_scope": {
    "en": "Set T / use current map area",
    "zh-TW": "設定 T／使用目前地圖範圍",
    "zh-CN": "设置 T／使用当前地图范围",
    "ja": "T を設定／現在の地図範囲を使用"
  },
  "backtrack_one_page": {
    "en": "Read one page / resume",
    "zh-TW": "讀取一頁／繼續",
    "zh-CN": "读取一页／继续",
    "ja": "1 ページ取得／再開"
  },
  "backtrack_start_auto": {
    "en": "Start / resume automatic",
    "zh-TW": "開始／繼續自動回溯",
    "zh-CN": "开始／继续自动回溯",
    "ja": "自動取得を開始／再開"
  },
  "backtrack_stop": {
    "en": "Stop (keep progress)",
    "zh-TW": "停止（保留進度）",
    "zh-CN": "停止（保留进度）",
    "ja": "停止（進捗を保持）"
  },
  "backtrack_automatic": {
    "en": "Automatic backtracking",
    "zh-TW": "自動回溯",
    "zh-CN": "自动回溯",
    "ja": "自動遡及取得"
  },
  "backtrack_invalid_time": {
    "en": "Choose a valid past T.",
    "zh-TW": "請設定有效的過去時間 T。",
    "zh-CN": "请设置有效的过去时间 T。",
    "ja": "有効な過去の時刻 T を指定してください。"
  },
  "backtrack_help": {
    "en": "Independent of live refresh and view filters. Server availability is unknown. Set T/area explicitly to change the session. Reload pauses until you resume.",
    "zh-TW": "與即時刷新、檢視篩選各自獨立。伺服器資料範圍未知。變更時間／範圍請按設定；重新載入後按繼續。",
    "zh-CN": "与即时刷新、查看筛选各自独立。服务器资料范围未知。变更时间／范围请按设置；重新加载后按继续。",
    "ja": "ライブ更新と表示フィルターから独立しています。サーバーの保存範囲は不明です。時刻・範囲の変更には設定を押してください。再読込後は再開が必要です。"
  },
  "backtrack_diagnostics": {
    "en": "Query details",
    "zh-TW": "查詢詳細資料",
    "zh-CN": "查询详细资料",
    "ja": "取得の詳細"
  },
  "backtrack_progress": {
    "en": "{pages} pages · {returned} returned · {added} new · {duplicates} duplicate · {unparsed} unreadable/conflicting",
    "zh-TW": "{pages} 批次 · 收到 {returned} · 新增 {added} · 重複 {duplicates} · 無法解析／衝突 {unparsed}",
    "zh-CN": "{pages} 批次 · 收到 {returned} · 新增 {added} · 重复 {duplicates} · 无法解析／冲突 {unparsed}",
    "ja": "{pages} ページ · 受信 {returned} · 新規 {added} · 重複 {duplicates} · 解析不可／競合 {unparsed}"
  },
  "backtrack_times": {
    "en": "Start {T} → earliest {earliest} · active time {elapsed}",
    "zh-TW": "起始 {T} → 最早 {earliest} · 擷取耗時 {elapsed}",
    "zh-CN": "起始 {T} → 最早 {earliest} · 获取耗时 {elapsed}",
    "ja": "開始 {T} → 最古 {earliest} · 取得時間 {elapsed}"
  },
  "backtrack_scope": {
    "en": "Fixed map area captured at session setup; panning and following do not change it.",
    "zh-TW": "使用設定時擷取的固定地圖範圍；移動地圖或跟隨玩家不會更改本次範圍。",
    "zh-CN": "使用设置时获取的固定地图范围；移动地图或跟随玩家不会更改本次范围。",
    "ja": "設定時の地図範囲に固定されます。地図移動・追従では変更されません。"
  },
  "backtrack_counts": {
    "en": "Currently: {memory} in this page · {saved} saved · {visible} visible under current filters. These differ from cumulative fetched counts.",
    "zh-TW": "目前：本頁 {memory} 筆 · 已保存 {saved} 筆 · 篩選後可見 {visible} 筆。這些與累計擷取數不同。",
    "zh-CN": "当前：本页 {memory} 条 · 已保存 {saved} 条 · 筛选后可见 {visible} 条。这些与累计获取数不同。",
    "ja": "現在：このページ {memory} 件 · 保存済み {saved} 件 · フィルター内 {visible} 件。累計取得数とは異なります。"
  },
  "backtrack_not_persistent": {
    "en": "Activity saving is off. Reload restarts from T.",
    "zh-TW": "活動保存未啟用；重新載入後會從 T 重新讀取。",
    "zh-CN": "活动保存未启用；重新加载后从 T 重新读取。",
    "ja": "保存は無効です。再読込後は T から再取得します。"
  },
  "backtrack_persistent": {
    "en": "Activity saving is enabled. Saved counts update after storage completes.",
    "zh-TW": "已啟用活動保存；保存筆數於寫入完成後更新。",
    "zh-CN": "已启用活动保存；保存条数于写入完成后更新。",
    "ja": "保存は有効です。保存件数は書込完了後に更新されます。"
  },
  "backtrack_view_retention": {
    "en": "View: {hours} h. Configured pruning: {days} days (0: unlimited). Capacity limits can prevent saving; see Storage.",
    "zh-TW": "顯示範圍：{hours} 小時。設定保留：{days} 天（0：不限）。容量限制可能使資料無法保存，請查看「儲存」。",
    "zh-CN": "显示范围：{hours} 小时。设置保留：{days} 天（0：不限）。容量限制可能使资料无法保存，请查看「存储」。",
    "ja": "表示：{hours} 時間。保持設定：{days} 日（0：無制限）。容量制限で保存できない場合はストレージを確認してください。"
  },
  "backtrack_retry": {
    "en": "Retry/wait {n} s",
    "zh-TW": "重試／等待 {n} 秒",
    "zh-CN": "重试／等待 {n} 秒",
    "ja": "再試行／待機 {n} 秒"
  },
  "backtrack_legend": {
    "en": "Thick long-short dashes: conditional attack simulation; thick regular dashes: interaction records; thin dashes: simulated positions.",
    "zh-TW": "粗長短虛線：攻擊支持條件模擬；粗等距虛線：互動記錄；細虛線：推論位置連線。",
    "zh-CN": "粗长短虚线：攻击支持条件模拟；粗等距虚线：互动记录；细虚线：推论位置连线。",
    "ja": "太い長短破線：攻撃に基づく条件付き推定、太い等間隔破線：相互作用記録、細い破線：推定位置。"
  },
  "backtrack_approximation": {
    "en": "Bounded feasible approximation; global minimum unproven.",
    "zh-TW": "有限處理的可行近似；未證明全域最短。",
    "zh-CN": "有限处理的可行近似；未证明全局最短。",
    "ja": "有界処理による実行可能な近似。大域最小は未証明です。"
  },
  "backtrack_quick": {
    "en": "Minimum + XMP simulation",
    "zh-TW": "最小移動＋XMP 模擬",
    "zh-CN": "最小移动＋XMP 模拟",
    "ja": "最小移動＋XMP 推定"
  },
  "backtrack_state_off": {
    "en": "Off",
    "zh-TW": "未啟動",
    "zh-CN": "未启动",
    "ja": "停止中"
  },
  "backtrack_state_queued": {
    "en": "Queued",
    "zh-TW": "已排隊",
    "zh-CN": "已排队",
    "ja": "待機列"
  },
  "backtrack_state_waiting": {
    "en": "Waiting",
    "zh-TW": "等待中",
    "zh-CN": "等待中",
    "ja": "待機中"
  },
  "backtrack_state_fetching": {
    "en": "Fetching",
    "zh-TW": "擷取中",
    "zh-CN": "获取中",
    "ja": "取得中"
  },
  "backtrack_state_paused": {
    "en": "Paused",
    "zh-TW": "已暫停",
    "zh-CN": "已暂停",
    "ja": "一時停止"
  },
  "backtrack_state_backoff": {
    "en": "Retry wait",
    "zh-TW": "退避等待",
    "zh-CN": "退避等待",
    "ja": "再試行待機"
  },
  "backtrack_state_ended": {
    "en": "Ended",
    "zh-TW": "已結束",
    "zh-CN": "已结束",
    "ja": "終了"
  },
  "backtrack_state_error": {
    "en": "Error",
    "zh-TW": "錯誤",
    "zh-CN": "错误",
    "ja": "エラー"
  },
  "backtrack_reason_unconfigured": {
    "en": "Choose a starting T.",
    "zh-TW": "請設定起始時間 T。",
    "zh-CN": "请设置起始时间 T。",
    "ja": "開始時刻 T を設定してください。"
  },
  "backtrack_reason_configured": {
    "en": "Ready: T → earlier.",
    "zh-TW": "已設定：從 T 往更早讀取。",
    "zh-CN": "已设置：从 T 往更早读取。",
    "ja": "設定済み：T から過去へ取得します。"
  },
  "backtrack_reason_paused": {
    "en": "Stopped by user; progress retained.",
    "zh-TW": "已手動停止，保留進度。",
    "zh-CN": "已手动停止，保留进度。",
    "ja": "手動停止。進捗を保持しています。"
  },
  "backtrack_reason_auto_off": {
    "en": "Automatic backtracking off; cursor retained.",
    "zh-TW": "自動回溯已關閉，游標保留。",
    "zh-CN": "自动回溯已关闭，游标保留。",
    "ja": "自動取得は無効です。継続位置を保持しています。"
  },
  "backtrack_reason_empty": {
    "en": "Empty page; earlier availability and completeness unknown.",
    "zh-TW": "回傳空頁；更早資料與完整性未知。",
    "zh-CN": "返回空页；更早资料与完整性未知。",
    "ja": "空のページです。過去のデータと完全性は不明です。"
  },
  "backtrack_reason_repeated": {
    "en": "Repeated cursor; stopped with completeness unknown.",
    "zh-TW": "游標重複，停止擷取；完整性未知。",
    "zh-CN": "游标重复，停止获取；完整性未知。",
    "ja": "継続位置が重複したため停止。完全性は不明です。"
  },
  "backtrack_reason_invalid": {
    "en": "Invalid response/cursor; inspect the retained raw page.",
    "zh-TW": "回應或游標無效，請檢查保留的原始頁面。",
    "zh-CN": "响应或游标无效，请检查保留的原始页面。",
    "ja": "応答または継続位置が無効です。保持した元のページを確認してください。"
  },
  "backtrack_reason_complete": {
    "en": "One page finished; resume to continue.",
    "zh-TW": "單頁完成；可按繼續。",
    "zh-CN": "单页完成；可按继续。",
    "ja": "1 ページ完了。再開で続行します。"
  },
  "backtrack_reason_next": {
    "en": "Waiting for the next page.",
    "zh-TW": "等待讀取下一頁。",
    "zh-CN": "等待读取下一页。",
    "ja": "次のページを待機中です。"
  },
  "backtrack_reason_queue": {
    "en": "Waiting for the shared request scheduler.",
    "zh-TW": "等待共用請求排程。",
    "zh-CN": "等待共享请求排程。",
    "ja": "共有取得スケジューラーを待機中です。"
  },
  "backtrack_reason_fetching": {
    "en": "Reading a historical page.",
    "zh-TW": "正在讀取歷史頁面。",
    "zh-CN": "正在读取历史页面。",
    "ja": "過去のページを取得中です。"
  },
  "backtrack_reason_failed": {
    "en": "Request failed; resume after shared backoff.",
    "zh-TW": "擷取失敗；共用退避後可繼續。",
    "zh-CN": "获取失败；共享退避后可继续。",
    "ja": "取得失敗。共有の再試行待機後に再開してください。"
  },
  "backtrack_reason_limit": {
    "en": "1000-page resource limit reached; partial data retained.",
    "zh-TW": "已達 1000 頁資源上限，保留部分資料。",
    "zh-CN": "已达 1000 页资源上限，保留部分资料。",
    "ja": "1000 ページの上限です。部分データを保持しています。"
  },
  "backtrack_reason_reload": {
    "en": "Reloaded; press Resume.",
    "zh-TW": "已重新載入，請按繼續。",
    "zh-CN": "已重新加载，请按继续。",
    "ja": "再読込しました。再開を押してください。"
  },
  "backtrack_reason_cleared": {
    "en": "Activity cleared; restart from T.",
    "zh-TW": "活動已清除，可從 T 重新讀取。",
    "zh-CN": "活动已清除，可从 T 重新读取。",
    "ja": "活動を消去しました。T から再取得できます。"
  },
  "backtrack_reason_loading": {
    "en": "Loading saved activity.",
    "zh-TW": "正在載入活動資料。",
    "zh-CN": "正在加载活动资料。",
    "ja": "保存した活動を読込中です。"
  },
  "backtrack_reason_hidden": {
    "en": "Page hidden; waiting.",
    "zh-TW": "頁面隱藏，等待中。",
    "zh-CN": "页面隐藏，等待中。",
    "ja": "ページ非表示のため待機中です。"
  },
  "backtrack_reason_layer": {
    "en": "EchoTrace is off; waiting.",
    "zh-TW": "EchoTrace 總開關已關閉，等待中。",
    "zh-CN": "EchoTrace 总开关已关闭，等待中。",
    "ja": "EchoTrace が無効のため待機中です。"
  },
  "backtrack_reason_zoom": {
    "en": "Zoom to level 7 or higher.",
    "zh-TW": "請放大至 7 級以上。",
    "zh-CN": "请放大至 7 级以上。",
    "ja": "ズームレベル 7 以上にしてください。"
  },
  "backtrack_reason_idle": {
    "en": "Page idle; waiting.",
    "zh-TW": "頁面閒置，等待中。",
    "zh-CN": "页面闲置，等待中。",
    "ja": "アイドル状態のため待機中です。"
  },
  "faction_pin_controls": {
    "en": "Faction marker orientation and label",
    "zh-TW": "陣營標記方向與標籤",
    "zh-CN": "阵营标记方向与标签",
    "ja": "陣営マーカーの向きとラベル"
  },
  "faction_original": {
    "en": "Original 0°",
    "zh-TW": "原方向 0°",
    "zh-CN": "原方向 0°",
    "ja": "元の向き 0°"
  },
  "faction_ccw120": {
    "en": "CCW 120°",
    "zh-TW": "逆時針 120°",
    "zh-CN": "逆时针 120°",
    "ja": "反時計回り 120°"
  },
  "faction_ccw135": {
    "en": "CCW 135°",
    "zh-TW": "逆時針 135°",
    "zh-CN": "逆时针 135°",
    "ja": "反時計回り 135°"
  },
  "faction_cw120": {
    "en": "CW 120°",
    "zh-TW": "順時針 120°",
    "zh-CN": "顺时针 120°",
    "ja": "時計回り 120°"
  },
  "faction_cw135": {
    "en": "CW 135°",
    "zh-TW": "順時針 135°",
    "zh-CN": "顺时针 135°",
    "ja": "時計回り 135°"
  },
  "faction_angle": {
    "en": "Angle (°)",
    "zh-TW": "旋轉角度 (°)",
    "zh-CN": "旋转角度 (°)",
    "ja": "回転角度 (°)"
  },
  "faction_gap": {
    "en": "Label gap (px)",
    "zh-TW": "標籤間距 (px)",
    "zh-CN": "标签间距 (px)",
    "ja": "ラベル間隔 (px)"
  },
  "faction_slider": {
    "en": "slider",
    "zh-TW": "滑桿",
    "zh-CN": "滑块",
    "ja": "スライダー"
  },
  "faction_orientation_help": {
    "en": "Negative = counterclockwise; positive = clockwise. Angle −180…180°; label gap 0…20 px. Faction markers only; events and inferred pins unchanged.",
    "zh-TW": "負值＝逆時針，正值＝順時針。角度 −180…180°；標籤間距 0…20 px。只調整陣營標記，事件及推論圖釘保持原樣。",
    "zh-CN": "负值＝逆时针，正值＝顺时针。角度 −180…180°；标签间距 0…20 px。只调整阵营标记，事件及推论图钉保持原样。",
    "ja": "負の値＝反時計回り、正の値＝時計回り。角度 −180…180°、ラベル間隔 0…20 px。陣営マーカーのみ。イベントと推論ピンは変更しません。"
  },
  "direct_spatial_bound": {
    "en": "Direct event region",
    "zh-TW": "直接活動範圍",
    "zh-CN": "直接活动范围",
    "ja": "イベントの直接範囲"
  },
  "local_average_region": {
    "en": "Local-average estimated region",
    "zh-TW": "局部平均推估範圍",
    "zh-CN": "局部平均推估范围",
    "ja": "局所平均による推定範囲"
  },
  "local_average_reference": {
    "en": "Average reference ≈{n} km/h",
    "zh-TW": "平均位移參考約 {n} km/h",
    "zh-CN": "平均位移参考约 {n} km/h",
    "ja": "平均移動参照約 {n} km/h"
  },
  "insufficient_narrowing_evidence": {
    "en": "Insufficient evidence to narrow the region",
    "zh-TW": "不足以收緊範圍",
    "zh-CN": "不足以收紧范围",
    "ja": "範囲を絞る証拠不足"
  },
  "conflicting_local_constraints": {
    "en": "Conflicting local constraints",
    "zh-TW": "局部約束衝突",
    "zh-CN": "局部约束冲突",
    "ja": "局所制約が矛盾"
  },
  "one_sided_context": {
    "en": "One-sided context",
    "zh-TW": "僅單側佐證",
    "zh-CN": "仅单侧佐证",
    "ja": "片側の根拠のみ"
  },
  "stale_spatial_speed_context": {
    "en": "Spatial/speed reference expired",
    "zh-TW": "位置／速度參考已過期",
    "zh-CN": "位置／速度参考已过期",
    "ja": "位置・速度参照が期限切れ"
  },
  "conditional_direct_bound": {
    "en": "Conditional direct-event region",
    "zh-TW": "條件式直接範圍",
    "zh-CN": "条件式直接范围",
    "ja": "条件付き直接範囲"
  },
  "motion_boundary": {
    "en": "Motion hypothesis boundary",
    "zh-TW": "移動假設切段",
    "zh-CN": "移动假设切段",
    "ja": "移動仮説の区切り"
  },
  "motion_context_unavailable": {
    "en": "Spatial bounds only; motion context unavailable",
    "zh-TW": "僅有位置範圍，移動關係未解",
    "zh-CN": "仅有位置范围，移动关系未解",
    "ja": "位置範囲のみ。移動関係は不明"
  },
  "possible_position_region": {
    "en": "Possible position region",
    "zh-TW": "可能位置區域",
    "zh-CN": "可能位置区域",
    "ja": "位置候補の範囲"
  },
  "historical_possible_regions": {
    "en": "Historical possible region",
    "zh-TW": "歷史可能區域",
    "zh-CN": "历史可能区域",
    "ja": "過去の候補範囲"
  },
  "conditional_possible_region": {
    "en": "Conditional region",
    "zh-TW": "條件式區域",
    "zh-CN": "条件式区域",
    "ja": "条件付きの範囲"
  },
  "region_diameter": {
    "en": "Diameter ≈{n} m",
    "zh-TW": "直徑約 {n} m",
    "zh-CN": "直径约 {n} m",
    "ja": "直径約 {n} m"
  },
  "region_marker_explanation": {
    "en": "Region center; not a measured player position",
    "zh-TW": "區域中心，非實測玩家位置",
    "zh-CN": "区域中心，非实测玩家位置",
    "ja": "範囲の中心。実測位置ではありません"
  },
  "activity_gap_closed": {
    "en": "Activity gap ≥6 min; segment closed",
    "zh-TW": "活動空檔至少六分鐘，分段已結束",
    "zh-CN": "活动空档至少六分钟，分段已结束",
    "ja": "活動の間隔が6分以上。区間終了"
  },
  "motion_conflict_uncertain": {
    "en": "Motion assumptions conflict; source remains uncertain",
    "zh-TW": "移動假設衝突，來源仍不確定",
    "zh-CN": "移动假设冲突，来源仍不确定",
    "ja": "移動仮定が矛盾。観測は不確定"
  },
  "opening_activity_storage": {
    "en": "Opening activity storage",
    "zh-TW": "正在開啟保存空間",
    "ja": "保存領域を開いています",
    "zh-CN": "正在开启保存空间"
  },
  "observed_portal_activity": {
    "en": "Observed Portal activity",
    "zh-TW": "公開 Portal 活動點",
    "ja": "公開 Portal 活動点",
    "zh-CN": "公开 Portal 活动点"
  },
  "link_origin_interaction": {
    "en": "Link origin interaction",
    "zh-TW": "Link 起點活動",
    "ja": "Link 起点での活動",
    "zh-CN": "Link 起点活动"
  },
  "position_unknown_event_object_endpoint": {
    "en": "Position unknown (event-object endpoint)",
    "zh-TW": "位置不能確認（結構端點）",
    "ja": "位置不明（構造物の端点）",
    "zh-CN": "位置不能确认（结构端点）"
  },
  "position_unknown_unrecognized_action": {
    "en": "Position unknown (unrecognized action)",
    "zh-TW": "位置不能確認（未識別行為）",
    "ja": "位置不明（未識別の行動）",
    "zh-CN": "位置不能确认（未识别行为）"
  },
  "position_unknown_missing_coordinates": {
    "en": "Position unknown (missing coordinates)",
    "zh-TW": "位置不能確認（缺少座標）",
    "ja": "位置不明（座標なし）",
    "zh-CN": "位置不能确认（缺少座标）"
  },
  "position_unknown_multiple_portals": {
    "en": "Position unknown (multiple Portals)",
    "zh-TW": "位置不能確認（多 Portal）",
    "ja": "位置不明（複数 Portal）",
    "zh-CN": "位置不能确认（多 Portal）"
  },
  "position_unknown_multiple_players": {
    "en": "Position unknown (multiple players)",
    "zh-TW": "位置不能確認（多玩家）",
    "ja": "位置不明（複数プレイヤー）",
    "zh-CN": "位置不能确认（多玩家）"
  },
  "settings_could_not_be_saved": {
    "en": "Settings could not be saved: ",
    "zh-TW": "設定保存失敗：",
    "ja": "設定の保存に失敗：",
    "zh-CN": "设置保存失败："
  },
  "settings_could_not_be_loaded_using_defaults": {
    "en": "Settings could not be loaded; using defaults: ",
    "zh-TW": "設定讀取失敗，這次採預設值：",
    "ja": "設定を読み込めないため既定値を使用：",
    "zh-CN": "设置读取失败，这次采预设值："
  },
  "older_comm_entries_lack_structured_source_data_awaiting_native_pu": {
    "en": " older COMM entries lack structured source data; awaiting native public COMM.",
    "zh-TW": " 筆舊 COMM 快取缺少結構化來源；等待原生公開 COMM 更新。",
    "ja": " 件の旧 COMM に構造化データがありません。公開 COMM の更新待ち。",
    "zh-CN": " 笔旧 COMM 快取缺少结构化来源；等待原生公开 COMM 更新。"
  },
  "background_comm_interface_unavailable_native_public_comm_updates_": {
    "en": "Background COMM interface unavailable; native public COMM updates remain active.",
    "zh-TW": "未找到背景 COMM 接口；仍接收原生公開 COMM hook。",
    "ja": "バックグラウンド COMM は利用不可。公開 COMM の更新は受信します。",
    "zh-CN": "未找到背景 COMM 接口；仍接收原生公开 COMM hook。"
  },
  "unknown_other": {
    "en": "Unknown / other",
    "zh-TW": "未知／其他",
    "ja": "不明／その他",
    "zh-CN": "未知／其他"
  },
  "capture": {
    "en": "Capture",
    "zh-TW": "佔領",
    "ja": "キャプチャ",
    "zh-CN": "占领"
  },
  "deploy": {
    "en": "Deploy",
    "zh-TW": "部署",
    "ja": "設置",
    "zh-CN": "部署"
  },
  "destroy_resonator": {
    "en": "Destroy Resonator",
    "zh-TW": "破壞 Resonator",
    "ja": "Resonator 破壊",
    "zh-CN": "破坏 Resonator"
  },
  "destroy_link": {
    "en": "Destroy Link",
    "zh-TW": "破壞 Link",
    "ja": "Link 破壊",
    "zh-CN": "破坏 Link"
  },
  "destroy_cf": {
    "en": "Destroy CF",
    "zh-TW": "破壞 CF",
    "ja": "CF 破壊",
    "zh-CN": "破坏 CF"
  },
  "link": {
    "en": "Link",
    "zh-TW": "連線",
    "ja": "Link",
    "zh-CN": "连线"
  },
  "create_cf": {
    "en": "Create CF",
    "zh-TW": "建立 CF",
    "ja": "CF 作成",
    "zh-CN": "建立 CF"
  },
  "upgrade": {
    "en": "Upgrade",
    "zh-TW": "升級",
    "ja": "アップグレード",
    "zh-CN": "升级"
  },
  "battle_beacon_result": {
    "en": "Battle Beacon result",
    "zh-TW": "Battle Beacon 結果",
    "ja": "Battle Beacon 結果",
    "zh-CN": "Battle Beacon 结果"
  },
  "battle_beacon_forecast": {
    "en": "Battle Beacon forecast",
    "zh-TW": "Battle Beacon 預告",
    "ja": "Battle Beacon 予告",
    "zh-CN": "Battle Beacon 预告"
  },
  "other": {
    "en": "Other",
    "zh-TW": "其他",
    "ja": "その他",
    "zh-CN": "其他"
  },
  "players": {
    "en": "Players",
    "zh-TW": "一般玩家",
    "ja": "一般プレイヤー",
    "zh-CN": "一般玩家"
  },
  "all_accounts": {
    "en": "All accounts",
    "zh-TW": "全部帳號",
    "ja": "全アカウント",
    "zh-CN": "全部账号"
  },
  "30_minutes": {
    "en": "30 minutes",
    "zh-TW": "30 分鐘",
    "ja": "30 分",
    "zh-CN": "30 分钟"
  },
  "1_hour": {
    "en": "1 hour",
    "zh-TW": "1 小時",
    "ja": "1 時間",
    "zh-CN": "1 小时"
  },
  "2_hours": {
    "en": "2 hours",
    "zh-TW": "2 小時",
    "ja": "2 時間",
    "zh-CN": "2 小时"
  },
  "3_hours": {
    "en": "3 hours",
    "zh-TW": "3 小時",
    "ja": "3 時間",
    "zh-CN": "3 小时"
  },
  "6_hours": {
    "en": "6 hours",
    "zh-TW": "6 小時",
    "ja": "6 時間",
    "zh-CN": "6 小时"
  },
  "12_hours": {
    "en": "12 hours",
    "zh-TW": "12 小時",
    "ja": "12 時間",
    "zh-CN": "12 小时"
  },
  "24_hours": {
    "en": "24 hours",
    "zh-TW": "24 小時",
    "ja": "24 時間",
    "zh-CN": "24 小时"
  },
  "1_week": {
    "en": "1 week",
    "zh-TW": "1 週",
    "ja": "1 週間",
    "zh-CN": "1 周"
  },
  "cannot_calculate_insufficient_unresolved_interactions": {
    "en": "Cannot calculate · insufficient / unresolved interactions",
    "zh-TW": "無法計算 · 資料不足／互動未解",
    "ja": "計算不可 · データ不足／未解決の相互作用",
    "zh-CN": "无法计算 · 数据不足／互动未解"
  },
  "no_displacement_between_portals_observed": {
    "en": "No displacement between Portals observed",
    "zh-TW": "未觀察到跨 Portal 位移",
    "ja": "Portal 間の移動は未観測",
    "zh-CN": "未观察到跨 Portal 位移"
  },
  "interaction_areas_overlap_speed_unresolved": {
    "en": "Interaction areas overlap · speed unresolved",
    "zh-TW": "互動範圍重疊・速度未定",
    "ja": "相互作用範囲が重複 · 速度不明",
    "zh-CN": "互动范围重叠?速度未定"
  },
  "shared_interaction_region_speed_unresolved": {
    "en": "Shared interaction region · speed unresolved",
    "zh-TW": "共同互動區域・速度未定",
    "ja": "共通の相互作用領域 · 速度不明",
    "zh-CN": "共同互动区域?速度未定"
  },
  "speed_estimate": {
    "en": "Speed estimate ≥",
    "zh-TW": "速度估算 ≥",
    "ja": "速度推定 ≥",
    "zh-CN": "速度估算 ≥"
  },
  "km_h_speed_class_at_least": {
    "en": " km/h · Speed class: at least ",
    "zh-TW": " km/h · 速度等級：至少",
    "ja": " km/h · 速度等級：少なくとも",
    "zh-CN": " km/h · 速度等级：至少"
  },
  "ghost_candidate": {
    "en": " · Ghost (candidate)",
    "zh-TW": " · 鬼（候選）",
    "ja": " · 鬼（候補）",
    "zh-CN": " · 鬼（候选）"
  },
  "long_interval_intermediate_route_unknown": {
    "en": " · Long interval; intermediate route unknown",
    "zh-TW": " · 長間隔，途中未知",
    "ja": " · 長い間隔、途中は不明",
    "zh-CN": " · 长间隔，途中未知"
  },
  "earlier_valid_estimate_latest_interval_unresolved": {
    "en": " · Earlier valid estimate; latest interval unresolved",
    "zh-TW": " · 較早有效估算，最新間隔未解",
    "ja": " · 以前の有効な推定、最新区間は未解決",
    "zh-CN": " · 较早有效估算，最新间隔未解"
  },
  "zoom_to_level_7": {
    "en": "Zoom to level 7",
    "zh-TW": "放大至 7 級",
    "ja": "ズーム 7 以上に拡大",
    "zh-CN": "放大至 7 级"
  },
  "storage_failed": {
    "en": "Storage failed",
    "zh-TW": "保存失敗",
    "ja": "保存失敗",
    "zh-CN": "保存失败"
  },
  "new_activity_stays_in_this_page": {
    "en": "New activity stays in this page",
    "zh-TW": "新活動僅留本頁",
    "ja": "新しい活動はこのページ内のみ",
    "zh-CN": "新活动仅留本页"
  },
  "settings_save_failed": {
    "en": "Settings save failed",
    "zh-TW": "設定保存失敗",
    "ja": "設定の保存失敗",
    "zh-CN": "设置保存失败"
  },
  "source_conflicts": {
    "en": "Source conflicts: ",
    "zh-TW": "來源衝突 ",
    "ja": "ソースの競合：",
    "zh-CN": "来源冲突 "
  },
  "awaiting_comm_update": {
    "en": "Awaiting COMM update",
    "zh-TW": "等待 COMM 更新",
    "ja": "COMM 更新待ち",
    "zh-CN": "等待 COMM 更新"
  },
  "public_comm_interface_unavailable": {
    "en": "Public COMM interface unavailable",
    "zh-TW": "公開 COMM 接口不可用",
    "ja": "公開 COMM インターフェース利用不可",
    "zh-CN": "公开 COMM 接口不可用"
  },
  "no_update_received": {
    "en": "No update received",
    "zh-TW": "未取得更新",
    "ja": "更新なし",
    "zh-CN": "未取得更新"
  },
  "no_new_activity_for_this_player": {
    "en": " · No new activity for this player",
    "zh-TW": " · 此玩家無新活動",
    "ja": " · このプレイヤーの新しい活動なし",
    "zh-CN": " · 此玩家无新活动"
  },
  "echotrace_display_is_off": {
    "en": "EchoTrace display is off",
    "zh-TW": "總開關已關閉",
    "ja": "EchoTrace 表示はオフ",
    "zh-CN": "总开关已关闭"
  },
  "page_hidden": {
    "en": "Page hidden",
    "zh-TW": "頁面隱藏",
    "ja": "ページ非表示",
    "zh-CN": "页面隐藏"
  },
  "page_idle": {
    "en": "Page idle",
    "zh-TW": "頁面閒置",
    "ja": "ページはアイドル状態",
    "zh-CN": "页面闲置"
  },
  "zoom_to_level_7_or_above": {
    "en": "Zoom to level 7 or above",
    "zh-TW": "請放大至 7 級",
    "ja": "ズーム 7 以上にしてください",
    "zh-CN": "请放大至 7 级"
  },
  "refresh": {
    "en": "Acquire latest Log",
    "zh-TW": "擷取最新 Log",
    "zh-CN": "获取最新 Log",
    "ja": "最新ログを取得"
  },
  "auto_refresh": {
    "en": "Automatic live acquisition",
    "zh-TW": "即時自動擷取",
    "zh-CN": "即时自动获取",
    "ja": "ライブ自動取得"
  },
  "initial_interval": {
    "en": "Initial interval",
    "zh-TW": "起始檔位",
    "ja": "開始間隔",
    "zh-CN": "起始档位"
  },
  "resume_acquisition": {
    "en": "Resume acquisition",
    "zh-TW": "恢復擷取",
    "ja": "取得を再開",
    "zh-CN": "恢复撷取"
  },
  "could_not_resume": {
    "en": "Could not resume: ",
    "zh-TW": "恢復失敗：",
    "ja": "再開失敗：",
    "zh-CN": "恢复失败："
  },
  "use_after_restoring_sign_in_existing_backoff_remains_auto_refresh": {
    "en": "Use after restoring sign-in; existing backoff remains. Auto refresh resets off on reload.",
    "zh-TW": "恢復正常登入後使用；既有退避仍適用。重新載入自動關閉。",
    "ja": "ログイン復旧後に使用。待機時間は継続します。再読み込みで自動更新はオフ。",
    "zh-CN": "恢复正常登入後使用；既有退避仍适用。重新载入自动关闭。"
  },
  "enable_request_budget": {
    "en": "Enable request budget",
    "zh-TW": "啟用負載預算",
    "ja": "リクエスト予算を有効化",
    "zh-CN": "启用负载预算"
  },
  "fast_request_duration_ms": {
    "en": "Fast-request duration (ms)",
    "zh-TW": "快速連續時間（ms）",
    "ja": "高速リクエスト継続時間（ms）",
    "zh-CN": "快速连续时间（ms）"
  },
  "fast_request_pages": {
    "en": "Fast-request pages",
    "zh-TW": "快速連續頁數",
    "ja": "高速リクエストのページ数",
    "zh-CN": "快速连续页数"
  },
  "rolling_window_ms": {
    "en": "Rolling window (ms)",
    "zh-TW": "累計期間（ms）",
    "ja": "集計期間（ms）",
    "zh-CN": "累计期间（ms）"
  },
  "requests_per_window": {
    "en": "Requests per window",
    "zh-TW": "期間請求上限",
    "ja": "期間内リクエスト上限",
    "zh-CN": "期间请求上限"
  },
  "budget_cooldown_ms": {
    "en": "Budget cooldown (ms)",
    "zh-TW": "預算冷卻（ms）",
    "ja": "予算待機時間（ms）",
    "zh-CN": "预算冷却（ms）"
  },
  "budget_defaults_off_enabling_it_delays_catch_up_and_retains_curso": {
    "en": "Budget defaults off. Enabling it delays catch-up and retains cursors. Selected interval is not actual traffic while waiting.",
    "zh-TW": "預算預設關閉；範例為工程設定，啟用會延遲追趕，游標保留。檔位不等於等待中的實際流量。",
    "ja": "予算は既定でオフ。有効化すると追跡取得が遅れますがカーソルは保持。間隔設定は待機中の実際の通信量を示しません。",
    "zh-CN": "预算预设关闭；范例为工程设置，启用会延迟追赶，游标保留。档位不等於等待中的实际流量。"
  },
  "batch_rows": {
    "en": "Batch rows: ",
    "zh-TW": "原始批次 ",
    "ja": "受信件数：",
    "zh-CN": "原始批次 "
  },
  "newly_accepted": {
    "en": " · Newly accepted: ",
    "zh-TW": " · 新接受 ",
    "ja": " · 新規受理：",
    "zh-CN": " · 新接受 "
  },
  "current_request": {
    "en": "Current request: ",
    "zh-TW": "本次請求 ",
    "ja": "今回のリクエスト：",
    "zh-CN": "本次请求 "
  },
  "last_completion": {
    "en": "Last completion: ",
    "zh-TW": "上次完成 ",
    "ja": "前回の完了：",
    "zh-CN": "上次完成 "
  },
  "next": {
    "en": "Next: ",
    "zh-TW": "下次 ",
    "ja": "次回：",
    "zh-CN": "下次 "
  },
  "progress": {
    "en": "Progress: ",
    "zh-TW": "進度 ",
    "ja": "進行状況：",
    "zh-CN": "进度 "
  },
  "unconfirmed": {
    "en": "Unconfirmed",
    "zh-TW": "尚未確認",
    "ja": "未確認",
    "zh-CN": "尚未确认"
  },
  "shared_across_same_origin_tabs": {
    "en": "Shared across same-origin tabs",
    "zh-TW": "同來源分頁共用",
    "ja": "同一オリジンのタブ間で共有",
    "zh-CN": "同来源分页共用"
  },
  "single_tab_acquisition_other_pages_must_wait": {
    "en": "Single-tab acquisition: other pages must wait",
    "zh-TW": "單分頁擷取模式：其他頁面需等待",
    "ja": "単一タブ取得：他のページは待機",
    "zh-CN": "单分页撷取模式：其他页面需等待"
  },
  "latest_event": {
    "en": "Latest event: ",
    "zh-TW": "最新事件 ",
    "ja": "最新イベント：",
    "zh-CN": "最新事件 "
  },
  "time_zone": {
    "en": "Time zone: ",
    "zh-TW": "時區 ",
    "ja": "タイムゾーン：",
    "zh-CN": "时区 "
  },
  "hours": {
    "en": " hours",
    "zh-TW": " 小時",
    "ja": " 時間",
    "zh-CN": " 小时"
  },
  "overview": {
    "en": "Overview",
    "zh-TW": "總覽",
    "ja": "概要",
    "zh-CN": "总览"
  },
  "display_settings": {
    "en": "Display settings",
    "zh-TW": "顯示設定",
    "ja": "表示設定",
    "zh-CN": "显示设置"
  },
  "storage": {
    "en": "Storage",
    "zh-TW": "資料保存",
    "ja": "データ保存",
    "zh-CN": "数据保存"
  },
  "csv_export": {
    "en": "CSV export",
    "zh-TW": "CSV 匯出",
    "ja": "CSV 出力",
    "zh-CN": "CSV 汇出"
  },
  "about": {
    "en": "About",
    "zh-TW": "關於",
    "ja": "このプラグインについて",
    "zh-CN": "关於"
  },
  "search_players": {
    "en": "Search players",
    "zh-TW": "搜尋玩家",
    "ja": "プレイヤーを検索",
    "zh-CN": "搜寻玩家"
  },
  "select_all": {
    "en": "Select all",
    "zh-TW": "全選",
    "ja": "すべて選択",
    "zh-CN": "全选"
  },
  "clear_selection": {
    "en": "Clear selection",
    "zh-TW": "清除選取",
    "ja": "選択解除",
    "zh-CN": "清除选取"
  },
  "lookback": {
    "en": "Lookback",
    "zh-TW": "回看",
    "ja": "遡る期間",
    "zh-CN": "回看"
  },
  "account_category": {
    "en": "Account category",
    "zh-TW": "帳號分類",
    "ja": "アカウント分類",
    "zh-CN": "账号分类"
  },
  "source_faction": {
    "en": "Source faction",
    "zh-TW": "來源陣營",
    "ja": "ソース陣営",
    "zh-CN": "来源阵营"
  },
  "all": {
    "en": "All",
    "zh-TW": "全部",
    "ja": "すべて",
    "zh-CN": "全部"
  },
  "players_93": {
    "en": "Players: ",
    "zh-TW": "一般玩家 ",
    "ja": "一般プレイヤー：",
    "zh-CN": "一般玩家 "
  },
  "other_94": {
    "en": " · Other: ",
    "zh-TW": " · 其他 ",
    "ja": " · その他：",
    "zh-CN": " · 其他 "
  },
  "events_latest": {
    "en": " events · Latest: ",
    "zh-TW": " 筆 · 最新 ",
    "ja": " 件 · 最新：",
    "zh-CN": " 笔 · 最新 "
  },
  "selected": {
    "en": "Selected: ",
    "zh-TW": "已選 ",
    "ja": "選択：",
    "zh-CN": "已选 "
  },
  "players_97": {
    "en": " players",
    "zh-TW": " 位玩家",
    "ja": " 人",
    "zh-CN": " 位玩家"
  },
  "showing_all_players": {
    "en": "Showing all players",
    "zh-TW": "顯示全部玩家",
    "ja": "全プレイヤーを表示",
    "zh-CN": "显示全部玩家"
  },
  "unusual_speed_candidate": {
    "en": "Unusual speed candidate · ",
    "zh-TW": "異常速度候選 · ",
    "ja": "異常速度の候補 · ",
    "zh-CN": "异常速度候选 · "
  },
  "accounts": {
    "en": " accounts",
    "zh-TW": " 個帳號",
    "ja": " アカウント",
    "zh-CN": " 个账号"
  },
  "select": {
    "en": "Select ",
    "zh-TW": "選取 ",
    "ja": "選択：",
    "zh-CN": "选取 "
  },
  "activity": {
    "en": "Activity",
    "zh-TW": "活動",
    "ja": "活動",
    "zh-CN": "活动"
  },
  "event_counts": {
    "en": "Event counts · ",
    "zh-TW": "事件數 · ",
    "ja": "イベント数 · ",
    "zh-CN": "事件数 · "
  },
  "multiple_simultaneous_positions": {
    "en": "Multiple simultaneous positions",
    "zh-TW": "同時多點",
    "ja": "同時に複数の位置",
    "zh-CN": "同时多点"
  },
  "position_unknown": {
    "en": "Position unknown",
    "zh-TW": "位置未知",
    "ja": "位置不明",
    "zh-CN": "位置未知"
  },
  "unusual_speed_candidate_106": {
    "en": "Unusual speed candidate",
    "zh-TW": "異常速度候選",
    "ja": "異常速度の候補",
    "zh-CN": "异常速度候选"
  },
  "no_data_yet": {
    "en": "No data yet",
    "zh-TW": "尚無資料",
    "ja": "データなし",
    "zh-CN": "尚无数据"
  },
  "more_players": {
    "en": "More players",
    "zh-TW": "更多玩家",
    "ja": "さらにプレイヤーを表示",
    "zh-CN": "更多玩家"
  },
  "unusual_speed_candidate_109": {
    "en": " · Unusual speed candidate",
    "zh-TW": " · 異常速度候選",
    "ja": " · 異常速度の候補",
    "zh-CN": " · 异常速度候选"
  },
  "details": {
    "en": " · Details",
    "zh-TW": " · 詳細",
    "ja": " · 詳細",
    "zh-CN": " · 详细"
  },
  "cannot_calculate": {
    "en": "Cannot calculate · ",
    "zh-TW": "無法計算 · ",
    "ja": "計算不可 · ",
    "zh-CN": "无法计算 · "
  },
  "insufficient_data": {
    "en": "Insufficient data",
    "zh-TW": "資料不足",
    "ja": "データ不足",
    "zh-CN": "数据不足"
  },
  "details_113": {
    "en": "Details",
    "zh-TW": "詳細",
    "ja": "詳細",
    "zh-CN": "详细"
  },
  "back_to_summary": {
    "en": "Back to summary",
    "zh-TW": "回到摘要",
    "ja": "概要に戻る",
    "zh-CN": "回到摘要"
  },
  "activity_association_breaks": {
    "en": "Activity association breaks: ",
    "zh-TW": "活動連線中斷 ",
    "ja": "活動の関連線の中断：",
    "zh-CN": "活动连线中断 "
  },
  "unresolved_interaction_positions": {
    "en": " (unresolved interaction positions)",
    "zh-TW": " 處（互動位置未解）",
    "ja": " 箇所（相互作用の位置が未解決）",
    "zh-CN": " 处（互动位置未解）"
  },
  "source_details": {
    "en": "Source details",
    "zh-TW": "來源詳情",
    "ja": "ソースの詳細",
    "zh-CN": "来源详情"
  },
  "origin": {
    "en": "Origin: ",
    "zh-TW": "起點 ",
    "ja": "起点：",
    "zh-CN": "起点 "
  },
  "destination": {
    "en": "Destination: ",
    "zh-TW": "終點 ",
    "ja": "終点：",
    "zh-CN": "终点 "
  },
  "source_faction_120": {
    "en": "Source faction: ",
    "zh-TW": "來源陣營 ",
    "ja": "ソース陣営：",
    "zh-CN": "来源阵营 "
  },
  "activity_association_interval": {
    "en": "Activity association · Interval: ",
    "zh-TW": "活動關聯 · 相隔 ",
    "ja": "活動の関連 · 間隔：",
    "zh-CN": "活动关联 · 相隔 "
  },
  "seconds": {
    "en": " seconds",
    "zh-TW": " 秒",
    "ja": " 秒",
    "zh-CN": " 秒"
  },
  "intervening": {
    "en": " · Intervening: ",
    "zh-TW": " · 中間 ",
    "ja": " · 間に",
    "zh-CN": " · 中间 "
  },
  "other_events": {
    "en": " other events",
    "zh-TW": " 筆其他活動",
    "ja": " 件のその他イベント",
    "zh-CN": " 笔其他活动"
  },
  "intermediate_route_unverified": {
    "en": "; intermediate route unverified",
    "zh-TW": "；未確認途中路線",
    "ja": "；途中の経路は未確認",
    "zh-CN": "；未确认途中路线"
  },
  "association_break_simultaneous_interaction_positions": {
    "en": "Association break · simultaneous interaction positions",
    "zh-TW": "活動連線中斷 · 同時多處互動",
    "ja": "関連線の中断 · 同時に複数位置の相互作用",
    "zh-CN": "活动连线中断 · 同时多处互动"
  },
  "association_break_unresolved_interaction_position": {
    "en": "Association break · unresolved interaction position",
    "zh-TW": "活動連線中斷 · 互動位置未解",
    "ja": "関連線の中断 · 相互作用の位置が未解決",
    "zh-CN": "活动连线中断 · 互动位置未解"
  },
  "previous_interaction": {
    "en": "Previous interaction: ",
    "zh-TW": "前次互動 ",
    "ja": "前回の相互作用：",
    "zh-CN": "前次互动 "
  },
  "current_interaction": {
    "en": "Current interaction: ",
    "zh-TW": "本次互動 ",
    "ja": "今回の相互作用：",
    "zh-CN": "本次互动 "
  },
  "interval": {
    "en": "Interval: ",
    "zh-TW": "相隔 ",
    "ja": "間隔：",
    "zh-CN": "相隔 "
  },
  "seconds_131": {
    "en": " seconds · ",
    "zh-TW": " 秒 · ",
    "ja": " 秒 · ",
    "zh-CN": " 秒 · "
  },
  "portal_center_distance": {
    "en": "Portal-center distance",
    "zh-TW": "Portal 中心距離",
    "ja": "Portal 中心間の距離",
    "zh-CN": "Portal 中心距离"
  },
  "validated_shared_region_witness_distance": {
    "en": "Validated shared-region witness distance",
    "zh-TW": "已核對共同區域代表距離",
    "ja": "検証済みの共通領域代表点間の距離",
    "zh-CN": "已核对共同区域代表距离"
  },
  "40_m_at_each_endpoint_minimum_required_displacement": {
    "en": "40 m at each endpoint · Minimum required displacement ≥",
    "zh-TW": "兩端各 40 m · 所需最短位移 ≥",
    "ja": "両端各 40 m · 必要な最短変位 ≥",
    "zh-CN": "两端各 40 m · 所需最短位移 ≥"
  },
  "center_reference": {
    "en": "Center reference: ",
    "zh-TW": "中心參考 ",
    "ja": "中心基準：",
    "zh-CN": "中心参考 "
  },
  "same_portal_activity_does_not_verify_stationary_presence": {
    "en": "Same-Portal activity does not verify stationary presence",
    "zh-TW": "同 Portal 活動不代表已驗證靜止",
    "ja": "同じ Portal の活動は静止を証明しません",
    "zh-CN": "同 Portal 活动不代表已验证静止"
  },
  "endpoint_assumption_upper_bound": {
    "en": "Endpoint assumption upper bound: ",
    "zh-TW": "端點假設上界 ",
    "ja": "端点仮定の上限：",
    "zh-CN": "端点假设上界 "
  },
  "km_h_region_detail_only_not_used_for_speed_class_or_ghost": {
    "en": " km/h; region detail only, not used for speed class or Ghost",
    "zh-TW": " km/h；僅為範圍細節，不作速度等級或鬼判斷",
    "ja": " km/h；領域の参考値のみ。速度等級や鬼の判定には不使用",
    "zh-CN": " km/h；仅为范围细节，不作速度等级或鬼判断"
  },
  "straight_line_displacement_lower_bound_route_and_transport_unknow": {
    "en": "Straight-line displacement lower bound; route and transport unknown",
    "zh-TW": "直線位移下界；實際路線與交通方式未知",
    "ja": "直線変位の下限。実際の経路と交通手段は不明",
    "zh-CN": "直线位移下界；实际路线与交通方式未知"
  },
  "source_timestamp_precision": {
    "en": "Source timestamp precision: ",
    "zh-TW": "來源時間精度：",
    "ja": "ソース時刻の精度：",
    "zh-CN": "来源时间精度："
  },
  "unspecified_original_milliseconds_retained": {
    "en": "Unspecified; original milliseconds retained",
    "zh-TW": "未宣告；保留原始毫秒",
    "ja": "未指定、元のミリ秒を保持",
    "zh-CN": "未宣告；保留原始毫秒"
  },
  "more_records": {
    "en": "Show more records",
    "zh-TW": "顯示更多紀錄",
    "zh-CN": "显示更多记录",
    "ja": "記録をさらに表示"
  },
  "player_names": {
    "en": "Player names",
    "zh-TW": "玩家姓名",
    "ja": "プレイヤー名",
    "zh-CN": "玩家姓名"
  },
  "faction_markers": {
    "en": "Faction markers",
    "zh-TW": "陣營標記",
    "ja": "陣営マーカー",
    "zh-CN": "阵营标记"
  },
  "activity_times": {
    "en": "Activity times",
    "zh-TW": "活動時間",
    "ja": "活動時刻",
    "zh-CN": "活动时间"
  },
  "raw_activity_associations": {
    "en": "Raw activity associations",
    "zh-TW": "原始活動連線",
    "ja": "元の活動の関連線",
    "zh-CN": "原始活动连线"
  },
  "activity_events": {
    "en": "Activity events",
    "zh-TW": "活動事件",
    "ja": "活動イベント",
    "zh-CN": "活动事件"
  },
  "fade_older_activity": {
    "en": "Fade older activity",
    "zh-TW": "淡化舊活動",
    "ja": "古い活動を薄く表示",
    "zh-CN": "淡化旧活动"
  },
  "faction_colors": {
    "en": "Faction colors",
    "zh-TW": "陣營配色",
    "ja": "陣営の配色",
    "zh-CN": "阵营配色"
  },
  "speed_estimates": {
    "en": "Speed estimates",
    "zh-TW": "速度推估",
    "ja": "速度推定",
    "zh-CN": "速度推估"
  },
  "time_format": {
    "en": "Time format",
    "zh-TW": "時間格式",
    "ja": "時刻形式",
    "zh-CN": "时间格式"
  },
  "relative_time": {
    "en": "Relative time",
    "zh-TW": "相對時間",
    "ja": "相対時刻",
    "zh-CN": "相对时间"
  },
  "absolute_time": {
    "en": "Absolute time",
    "zh-TW": "絕對時間",
    "ja": "絶対時刻",
    "zh-CN": "绝对时间"
  },
  "detail_rows": {
    "en": "Detail rows",
    "zh-TW": "詳細列表",
    "ja": "詳細の表示件数",
    "zh-CN": "详细列表"
  },
  "10_records": {
    "en": "10 records",
    "zh-TW": "10 筆",
    "ja": "10 件",
    "zh-CN": "10 笔"
  },
  "20_records": {
    "en": "20 records",
    "zh-TW": "20 筆",
    "ja": "20 件",
    "zh-CN": "20 笔"
  },
  "40_records": {
    "en": "40 records",
    "zh-TW": "40 筆",
    "ja": "40 件",
    "zh-CN": "40 笔"
  },
  "live_observation": {
    "en": "Live observation",
    "zh-TW": "即時觀察",
    "ja": "現在時刻で観測",
    "zh-CN": "即时观察"
  },
  "player_color": {
    "en": "Player color",
    "zh-TW": "玩家顏色",
    "ja": "プレイヤーの色",
    "zh-CN": "玩家颜色"
  },
  "player_name": {
    "en": "Player name",
    "zh-TW": "玩家名",
    "ja": "プレイヤー名",
    "zh-CN": "玩家名"
  },
  "saving": {
    "en": "Saving",
    "zh-TW": "正在保存",
    "ja": "保存中",
    "zh-CN": "正在保存"
  },
  "automatically_save_activity": {
    "en": "Automatically save activity",
    "zh-TW": "自動保存活動",
    "ja": "活動を自動保存",
    "zh-CN": "自动保存活动"
  },
  "enable_storage_limits": {
    "en": "Enable storage limits",
    "zh-TW": "啟用保存限制",
    "ja": "保存制限を有効化",
    "zh-CN": "启用保存限制"
  },
  "retention_days_0_unlimited": {
    "en": "Retention days (0 = unlimited)",
    "zh-TW": "保留天數（0＝不限）",
    "ja": "保存日数（0＝無制限）",
    "zh-CN": "保留天数（0＝不限）"
  },
  "record_limit_0_unlimited": {
    "en": "Record limit (0 = unlimited)",
    "zh-TW": "保存筆數上限（0＝不限）",
    "ja": "記録数の上限（0＝無制限）",
    "zh-CN": "保存笔数上限（0＝不限）"
  },
  "capacity_mib_0_unlimited": {
    "en": "Capacity MiB (0 = unlimited)",
    "zh-TW": "容量 MiB（0＝不限）",
    "ja": "容量 MiB（0＝無制限）",
    "zh-CN": "容量 MiB（0＝不限）"
  },
  "review_and_prune_old_activity": {
    "en": "Review and prune old activity…",
    "zh-TW": "檢視並修剪舊活動…",
    "ja": "古い活動を確認して削除…",
    "zh-CN": "检视并修剪旧活动…"
  },
  "clear_activity_data": {
    "en": "Clear activity data…",
    "zh-TW": "清除活動資料…",
    "ja": "活動データを消去…",
    "zh-CN": "清除活动数据…"
  },
  "import_raw_activity_json": {
    "en": "Import raw activity JSON",
    "zh-TW": "匯入原始活動 JSON",
    "ja": "元の活動 JSON をインポート",
    "zh-CN": "汇入原始活动 JSON"
  },
  "data_cleared_import_cancelled": {
    "en": "Data cleared; import cancelled",
    "zh-TW": "資料已清除；匯入已取消",
    "ja": "データ消去済み、インポート中止",
    "zh-CN": "数据已清除；汇入已取消"
  },
  "imported": {
    "en": "Imported: ",
    "zh-TW": "已匯入 ",
    "ja": "インポート済み：",
    "zh-CN": "已汇入 "
  },
  "records_conflicts": {
    "en": " records · Conflicts: ",
    "zh-TW": " 筆 · 衝突 ",
    "ja": " 件 · 競合：",
    "zh-CN": " 笔 · 冲突 "
  },
  "invalid_import_format_existing_data_retained": {
    "en": "Invalid import format; existing data retained",
    "zh-TW": "匯入格式無效；既有資料保留",
    "ja": "無効な形式。既存データは保持",
    "zh-CN": "汇入格式无效；既有数据保留"
  },
  "import_raw_json_retain_existing_activity": {
    "en": "Import raw JSON (retain existing activity)",
    "zh-TW": "原始 JSON 匯入（保留既有活動）",
    "ja": "元の JSON をインポート（既存活動を保持）",
    "zh-CN": "原始 JSON 汇入（保留既有活动）"
  },
  "complete_raw_backup_all_activity": {
    "en": "Complete raw backup (all activity)",
    "zh-TW": "完整原始備份（全部活動）",
    "ja": "全活動の元データをバックアップ",
    "zh-CN": "完整原始备份（全部活动）"
  },
  "backup_contains_sign_in_session_fields_raw_data_retained_no_expor": {
    "en": "Backup contains sign-in/session fields; raw data retained, no export",
    "zh-TW": "備份含登入／工作階段欄位；原始資料保留，未匯出",
    "ja": "バックアップにログイン／セッション情報あり。元データを保持、出力中止",
    "zh-CN": "备份含登入／工作阶段栏位；原始数据保留，未汇出"
  },
  "backup_contains_sign_in_session_fields_import_rejected": {
    "en": "Backup contains sign-in/session fields; import rejected",
    "zh-TW": "備份含登入／工作階段欄位；未匯入",
    "ja": "ログイン／セッション情報を含むためインポート拒否",
    "zh-CN": "备份含登入／工作阶段栏位；未汇入"
  },
  "clearing_data_import_cancelled": {
    "en": "Clearing data; import cancelled",
    "zh-TW": "正在清除；匯入已取消",
    "ja": "消去中、インポート中止",
    "zh-CN": "正在清除；汇入已取消"
  },
  "saved": {
    "en": "Saved: ",
    "zh-TW": "已保存 ",
    "ja": "保存済み：",
    "zh-CN": "已保存 "
  },
  "unsaved": {
    "en": " · Unsaved: ",
    "zh-TW": " · 未保存 ",
    "ja": " · 未保存：",
    "zh-CN": " · 未保存 "
  },
  "limits_default_off_lookback_is_not_retention_at_capacity_data_sta": {
    "en": "Limits default off. Lookback is not retention. At capacity, data stays in this page; export first.",
    "zh-TW": "限制預設關閉；回看不是保存期限。達上限仍保留本頁資料，請先匯出。",
    "ja": "制限は既定でオフ。表示期間と保存期限は別。上限時もページ内データは保持、先に出力してください。",
    "zh-CN": "限制预设关闭；回看不是保存期限。达上限仍保留本页数据，请先汇出。"
  },
  "selected_player": {
    "en": "Selected player",
    "zh-TW": "選定玩家",
    "ja": "選択したプレイヤー",
    "zh-CN": "选定玩家"
  },
  "scope": {
    "en": "Scope",
    "zh-TW": "範圍",
    "ja": "範囲",
    "zh-CN": "范围"
  },
  "export_csv": {
    "en": "Export CSV",
    "zh-TW": "匯出 CSV",
    "ja": "CSV を出力",
    "zh-CN": "汇出 CSV"
  },
  "export_filtered_raw_json": {
    "en": "Export filtered raw JSON",
    "zh-TW": "匯出篩選原始 JSON",
    "ja": "絞り込んだ元の JSON を出力",
    "zh-CN": "汇出筛选原始 JSON"
  },
  "lookback_188": {
    "en": "Lookback: ",
    "zh-TW": "回看 ",
    "ja": "遡る期間：",
    "zh-CN": "回看 "
  },
  "hours_189": {
    "en": " hours · ",
    "zh-TW": " 小時 · ",
    "ja": " 時間 · ",
    "zh-CN": " 小时 · "
  },
  "no_player_selected": {
    "en": "No player selected",
    "zh-TW": "尚未選定玩家",
    "ja": "プレイヤー未選択",
    "zh-CN": "尚未选定玩家"
  },
  "records": {
    "en": " records",
    "zh-TW": " 筆",
    "ja": " 件",
    "zh-CN": " 笔"
  },
  "enable_storage_limits_and_retention_days_first_0_is_unlimited": {
    "en": "Enable storage limits and retention days first; 0 is unlimited",
    "zh-TW": "請先啟用保存限制與保留天數；0為不限",
    "ja": "保存制限と保存日数を先に指定。0 は無制限",
    "zh-CN": "请先启用保存限制与保留天数；0为不限"
  },
  "no_activity_needs_pruning": {
    "en": "No activity needs pruning",
    "zh-TW": "沒有需修剪的活動",
    "ja": "削除対象の活動なし",
    "zh-CN": "没有需修剪的活动"
  },
  "prune": {
    "en": "Prune ",
    "zh-TW": "修剪 ",
    "ja": "削除：",
    "zh-CN": "修剪 "
  },
  "activity_records": {
    "en": " activity records (",
    "zh-TW": " 筆活動（",
    "ja": " 件の活動（",
    "zh-CN": " 笔活动（"
  },
  "and_related_scopes_conflicts_unexported_data_will_be_removed_othe": {
    "en": ") and related scopes/conflicts? Unexported data will be removed; other activity and preferences stay.",
    "zh-TW": "）及相關範圍／衝突？尚未匯出的資料會移除；其他活動與偏好保留。",
    "ja": "）と関連する範囲／競合を削除しますか？未出力データは削除、他の活動と設定は保持。",
    "zh-CN": "）及相关范围／冲突？尚未汇出的数据会移除；其他活动与偏好保留。"
  },
  "generated": {
    "en": "Generated: ",
    "zh-TW": "已產生 ",
    "ja": "作成済み：",
    "zh-CN": "已产生 "
  },
  "export_failed": {
    "en": "Export failed",
    "zh-TW": "匯出失敗",
    "ja": "出力失敗",
    "zh-CN": "汇出失败"
  },
  "feature_references_nanoeskadu_names_2_2_1_nhz_0_11_2_danielondior": {
    "en": "Feature references: Nanoeskadu names 2 2.1; nhz 0.11.2; DanielOnDiordna add-on 1.3.1 / 2.0.0; BlancLapin Advanced Tracker Player 0.0.1.",
    "zh-TW": "功能參考來源：Nanoeskadu names 2 2.1；nhz 0.11.2；DanielOnDiordna add-on 1.3.1／2.0.0；BlancLapin Advanced Tracker Player 0.0.1。",
    "ja": "機能参考：Nanoeskadu names 2 2.1、nhz 0.11.2、DanielOnDiordna add-on 1.3.1／2.0.0、BlancLapin Advanced Tracker Player 0.0.1。",
    "zh-CN": "功能参考来源：Nanoeskadu names 2 2.1；nhz 0.11.2；DanielOnDiordna add-on 1.3.1／2.0.0；BlancLapin Advanced Tracker Player 0.0.1。"
  },
  "players_200": {
    "en": " players · ",
    "zh-TW": " 位玩家 · ",
    "ja": " 人 · ",
    "zh-CN": " 位玩家 · "
  },
  "activity_events_201": {
    "en": " activity events",
    "zh-TW": " 筆活動",
    "ja": " 件の活動",
    "zh-CN": " 笔活动"
  },
  "unnamed_portal": {
    "en": "Unnamed Portal",
    "zh-TW": "未命名 Portal",
    "ja": "名称なし Portal",
    "zh-CN": "未命名 Portal"
  },
  "also": {
    "en": "Also ",
    "zh-TW": "另有 ",
    "ja": "ほかに",
    "zh-CN": "另有 "
  },
  "records_click_to_view": {
    "en": " records; click to view",
    "zh-TW": " 筆；點擊查看",
    "ja": " 件、クリックして表示",
    "zh-CN": " 笔；点击查看"
  },
  "players_205": {
    "en": " players",
    "zh-TW": "位玩家",
    "ja": " 人",
    "zh-CN": "位玩家"
  },
  "unusual_speed_candidate_206": {
    "en": " · Unusual speed candidate",
    "zh-TW": " · 異常候選",
    "ja": " · 異常速度の候補",
    "zh-CN": " · 异常候选"
  },
  "active_players": {
    "en": "Active players",
    "zh-TW": "活動玩家",
    "ja": "活動プレイヤー",
    "zh-CN": "活动玩家"
  },
  "observed_activity": {
    "en": "Observed activity",
    "zh-TW": "公開活動",
    "ja": "公開活動",
    "zh-CN": "公开活动"
  },
  "overlapping_players": {
    "en": "Overlapping players",
    "zh-TW": "重疊玩家",
    "ja": "重なったプレイヤー",
    "zh-CN": "重叠玩家"
  },
  "hidden_by_current_filters_layers": {
    "en": "Hidden by current filters / layers",
    "zh-TW": "目前篩選／圖層未顯示",
    "ja": "現在のフィルター／レイヤーで非表示",
    "zh-CN": "目前筛选／图层未显示"
  },
  "no_activity_within_lookback": {
    "en": "No activity within lookback",
    "zh-TW": "回看內尚無活動",
    "ja": "表示期間内の活動なし",
    "zh-CN": "回看内尚无活动"
  },
  "players_currently_visible": {
    "en": " players · Currently visible: ",
    "zh-TW": " 位 · 目前可顯示 ",
    "ja": " 人 · 現在表示可能：",
    "zh-CN": " 位 · 目前可显示 "
  },
  "players_213": {
    "en": " players",
    "zh-TW": " 位",
    "ja": " 人",
    "zh-CN": " 位"
  },
  "no_eligible_activity_group_selection_retained": {
    "en": "No eligible activity; group selection retained",
    "zh-TW": "目前範圍尚無活動；保留群組選取",
    "ja": "対象活動なし。グループ選択は保持",
    "zh-CN": "目前范围尚无活动；保留群组选取"
  },
  "cannot_calculate_computation_unavailable": {
    "en": "Cannot calculate · computation unavailable",
    "zh-TW": "無法計算 · 計算不可用",
    "ja": "計算不可 · 計算機能利用不可",
    "zh-CN": "无法计算 · 计算不可用"
  },
  "inferred_position": {
    "en": "Inferred position",
    "zh-TW": "推論位置",
    "ja": "推論位置",
    "zh-CN": "推论位置"
  },
  "inferring": {
    "en": " · Inferring",
    "zh-TW": " · 正在推論",
    "ja": " · 推論中",
    "zh-CN": " · 正在推论"
  },
  "partial_results_computation_limited": {
    "en": " · Partial results / computation limited",
    "zh-TW": " · 部分結果／計算受限",
    "ja": " · 部分結果／計算制限",
    "zh-CN": " · 部分结果／计算受限"
  },
  "partial_results_computation_unavailable": {
    "en": " · Partial results / computation unavailable",
    "zh-TW": " · 部分結果／計算不可用",
    "ja": " · 部分結果／計算利用不可",
    "zh-CN": " · 部分结果／计算不可用"
  },
  "partial_paths": {
    "en": " · Partial paths",
    "zh-TW": " · 部分路徑",
    "ja": " · 部分経路",
    "zh-CN": " · 部分路径"
  },
  "inferring_221": {
    "en": "Inferring",
    "zh-TW": "正在推論",
    "ja": "推論中",
    "zh-CN": "正在推论"
  },
  "cannot_calculate_region_too_broad": {
    "en": "Cannot calculate · region too broad",
    "zh-TW": "無法計算 · 範圍過大",
    "ja": "計算不可 · 領域が広すぎます",
    "zh-CN": "无法计算 · 范围过大"
  },
  "cannot_calculate_computation_limited": {
    "en": "Cannot calculate · computation limited",
    "zh-TW": "無法計算 · 計算受限",
    "ja": "計算不可 · 計算制限",
    "zh-CN": "无法计算 · 计算受限"
  },
  "cannot_calculate_insufficient_data": {
    "en": "Cannot calculate · insufficient data",
    "zh-TW": "無法計算 · 資料不足",
    "ja": "計算不可 · データ不足",
    "zh-CN": "无法计算 · 数据不足"
  },
  "computation_unavailable": {
    "en": "Computation unavailable",
    "zh-TW": "計算不可用",
    "ja": "計算利用不可",
    "zh-CN": "计算不可用"
  },
  "no_destruction_input": {
    "en": "No destruction input",
    "zh-TW": "無破壞輸入",
    "ja": "破壊イベント入力なし",
    "zh-CN": "无破坏输入"
  },
  "evidence_excluded": {
    "en": "Evidence excluded",
    "zh-TW": "證據已排除",
    "ja": "証拠を除外済み",
    "zh-CN": "证据已排除"
  },
  "computation_limited": {
    "en": "Computation limited",
    "zh-TW": "計算受限",
    "ja": "計算制限",
    "zh-CN": "计算受限"
  },
  "supported": {
    "en": "Supported",
    "zh-TW": "已支持",
    "ja": "裏付けあり",
    "zh-CN": "已支持"
  },
  "partially_supported": {
    "en": "Partially supported",
    "zh-TW": "部分支持",
    "ja": "部分的な裏付け",
    "zh-CN": "部分支持"
  },
  "calculated_region_too_broad": {
    "en": "Calculated · region too broad",
    "zh-TW": "已計算 · 範圍過大",
    "ja": "計算済み · 領域が広すぎます",
    "zh-CN": "已计算 · 范围过大"
  },
  "position_prediction_is_off": {
    "en": "Position prediction is off",
    "zh-TW": "位置預測已關閉",
    "ja": "位置予測はオフ",
    "zh-CN": "位置预测已关闭"
  },
  "interaction_baseline_used": {
    "en": " (interaction baseline used)",
    "zh-TW": "（採互動基準）",
    "ja": "（相互作用の基準を使用）",
    "zh-CN": "（采互动基准）"
  },
  "interaction_evidence": {
    "en": "Interaction evidence",
    "zh-TW": "互動證據",
    "ja": "相互作用の証拠",
    "zh-CN": "互动证据"
  },
  "conditional_xmp_scenario": {
    "en": "Conditional XMP scenario",
    "zh-TW": "XMP 條件情境",
    "ja": "条件付き XMP シナリオ",
    "zh-CN": "XMP 条件情境"
  },
  "legacy_assumption_weapon_level_unknown": {
    "en": " · Legacy assumption; weapon level unknown",
    "zh-TW": " · 舊版條件，非已知武器等級",
    "ja": " · 旧条件、武器レベルは不明",
    "zh-CN": " · 旧版条件，非已知武器等级"
  },
  "inferred": {
    "en": "Inferred",
    "zh-TW": "推論",
    "ja": "推論",
    "zh-CN": "推论"
  },
  "historical_inference": {
    "en": "Historical inference",
    "zh-TW": "歷史推論",
    "ja": "過去の推論",
    "zh-CN": "历史推论"
  },
  "xmp_assumption": {
    "en": " · XMP assumption",
    "zh-TW": " · XMP 假設",
    "ja": " · XMP 仮定",
    "zh-CN": " · XMP 假设"
  },
  "portal_activity": {
    "en": "Portal activity",
    "zh-TW": "Portal 活動",
    "ja": "Portal 活動",
    "zh-CN": "Portal 活动"
  },
  "activity_events_241": {
    "en": " activity events · ",
    "zh-TW": " 筆活動 · ",
    "ja": " 件の活動 · ",
    "zh-CN": " 笔活动 · "
  },
  "center_on_screen": {
    "en": "Center on screen",
    "zh-TW": "螢幕置中",
    "ja": "画面中央に移動",
    "zh-CN": "萤幕置中"
  },
  "more": {
    "en": "More",
    "zh-TW": "更多",
    "ja": "さらに表示",
    "zh-CN": "更多"
  },
  "all_shown": {
    "en": "All shown",
    "zh-TW": "已顯示全部",
    "ja": "すべて表示済み",
    "zh-CN": "已显示全部"
  },
  "portal_activity_records": {
    "en": "Portal activity records",
    "zh-TW": "Portal 活動紀錄",
    "ja": "Portal 活動記録",
    "zh-CN": "Portal 活动纪录"
  },
  "portal_activity_246": {
    "en": "Portal activity · ",
    "zh-TW": "Portal 活動 · ",
    "ja": "Portal 活動 · ",
    "zh-CN": "Portal 活动 · "
  },
  "coordinates_unavailable": {
    "en": "Coordinates unavailable",
    "zh-TW": "座標不可用",
    "ja": "座標利用不可",
    "zh-CN": "座标不可用"
  },
  "no_activity_under_current_filters": {
    "en": " · No activity under current filters",
    "zh-TW": " · 目前篩選無活動",
    "ja": " · 現在のフィルターで活動なし",
    "zh-CN": " · 目前筛选无活动"
  },
  "coordinates_unavailable_249": {
    "en": " · Coordinates unavailable",
    "zh-TW": " · 座標不可用",
    "ja": " · 座標利用不可",
    "zh-CN": " · 座标不可用"
  },
  "capture_resonator": {
    "en": "Capture / Resonator",
    "zh-TW": "攻佔／Resonator",
    "ja": "キャプチャ／Resonator",
    "zh-CN": "攻占／Resonator"
  },
  "destruction": {
    "en": "Destruction",
    "zh-TW": "破壞",
    "ja": "破壊",
    "zh-CN": "破坏"
  },
  "other_cf": {
    "en": "Other / CF",
    "zh-TW": "其他／CF",
    "ja": "その他／CF",
    "zh-CN": "其他／CF"
  },
  "no_activity_in_current_scope": {
    "en": "No activity in current scope",
    "zh-TW": "目前範圍尚無活動",
    "ja": "現在の範囲に活動なし",
    "zh-CN": "目前范围尚无活动"
  },
  "event_distribution": {
    "en": "Event distribution: ",
    "zh-TW": "事件分布：",
    "ja": "イベント分布：",
    "zh-CN": "事件分布："
  },
  "event_distribution_255": {
    "en": "Event distribution: ",
    "zh-TW": "事件分布 ",
    "ja": "イベント分布：",
    "zh-CN": "事件分布 "
  },
  "faction_event_counts": {
    "en": "; faction event counts: ",
    "zh-TW": "；陣營事件數 ",
    "ja": "；陣営別イベント数：",
    "zh-CN": "；阵营事件数 "
  },
  "legend": {
    "en": "Legend",
    "zh-TW": "圖例",
    "ja": "凡例",
    "zh-CN": "图例"
  },
  "short_dashes_activity_associations_long_dashes_candidate_inferenc": {
    "en": "Short dashes: activity associations · Long dashes: possible-region evolution, not a confirmed route · Dashed pins: region representatives · Solid lines: Link events",
    "zh-TW": "短虛線：活動關聯 · 長虛線：可能區域變化，非確認路線 · 虛線pin：區域代表 · 實線：Link事件",
    "zh-CN": "短虚线：活动关联 · 长虚线：可能区域变化，非确认路线 · 虚线pin：区域代表 · 实线：Link事件",
    "ja": "短い破線：活動の関連 · 長い破線：候補範囲の変化。確定経路ではない · 破線pin：範囲の代表 · 実線：Linkイベント"
  },
  "stop_following": {
    "en": "Stop following",
    "zh-TW": "停止跟隨",
    "ja": "追従を停止",
    "zh-CN": "停止跟随"
  },
  "follow_this_player": {
    "en": "Follow this player",
    "zh-TW": "跟隨此玩家",
    "ja": "このプレイヤーに追従",
    "zh-CN": "跟随此玩家"
  },
  "following": {
    "en": "Following: ",
    "zh-TW": "目前跟隨 ",
    "ja": "追従中：",
    "zh-CN": "目前跟随 "
  },
  "native_portal_selection_unavailable": {
    "en": " · Native Portal selection unavailable",
    "zh-TW": " · 原生 Portal 選取接口不可用",
    "ja": " · 標準 Portal 選択機能は利用不可",
    "zh-CN": " · 原生 Portal 选取接口不可用"
  },
  "history_interface_unavailable": {
    "en": "History interface unavailable",
    "zh-TW": "歷史接口不可用",
    "ja": "履歴インターフェース利用不可",
    "zh-CN": "历史接口不可用"
  },
  "expanded_by_one_hour_loading": {
    "en": "Expanded by one hour; loading",
    "zh-TW": "已擴展一小時；正在讀取",
    "ja": "1 時間拡張、読み込み中",
    "zh-CN": "已扩展一小时；正在读取"
  },
  "partial_history_received": {
    "en": "Partial history received",
    "zh-TW": "已取得部分歷史",
    "ja": "履歴の一部を受信",
    "zh-CN": "已取得部分历史"
  },
  "activity_rows": {
    "en": "Activity rows",
    "zh-TW": "活動筆數",
    "ja": "活動の表示件数",
    "zh-CN": "活动笔数"
  },
  "previous_page": {
    "en": "Previous page",
    "zh-TW": "上一頁",
    "ja": "前のページ",
    "zh-CN": "上一页"
  },
  "next_page": {
    "en": "Next page",
    "zh-TW": "下一頁",
    "ja": "次のページ",
    "zh-CN": "下一页"
  },
  "legacy_2024_community_scenario_portal_bound_adds_40_m_resonator_o": {
    "en": "Legacy 2024 community scenario; Portal bound adds 40 m Resonator offset. Not current weapon range.",
    "zh-TW": "2024 社群舊版情境；Portal 外界另加 Resonator 偏移 40 m，不代表目前武器距離",
    "ja": "2024 年の旧コミュニティ条件。Portal の境界には Resonator の偏位 40 m を追加。現在の武器射程ではありません。",
    "zh-CN": "2024 社群旧版情境；Portal 外界另加 Resonator 偏移 40 m，不代表目前武器距离"
  },
  "xmp_assumption_legacy_2024_scenario_excluded_from_speed_evidence": {
    "en": "XMP assumption · Legacy 2024 scenario; excluded from speed evidence",
    "zh-TW": "XMP 假設 · 2024 舊版情境；不作速度證據",
    "ja": "XMP 仮定 · 2024 年の旧条件。速度の証拠には不使用",
    "zh-CN": "XMP 假设 · 2024 旧版情境；不作速度证据"
  },
  "no_coordinates": {
    "en": " (no coordinates)",
    "zh-TW": "（無座標）",
    "ja": "（座標なし）",
    "zh-CN": "（无座标）"
  },
  "clear_activity_conflicts_and_scope_records_across_all_tabs_unexpo": {
    "en": "Clear activity, conflicts and scope records across all tabs? Unexported data will be removed. Player/display preferences and exported files are retained.",
    "zh-TW": "清除所有分頁的活動、衝突與範圍紀錄？尚未匯出的資料會移除；玩家／顯示偏好保留。已匯出檔案不受影響。",
    "ja": "全タブの活動、競合、範囲記録を消去しますか？未出力データは削除。プレイヤー／表示設定と出力済みファイルは保持。",
    "zh-CN": "清除所有分页的活动、冲突与范围纪录？尚未汇出的数据会移除；玩家／显示偏好保留。已汇出档案不受影响。"
  },
  "activity_pruning_synchronized": {
    "en": "Activity pruning synchronized",
    "zh-TW": "已同步修剪活動",
    "ja": "活動削除を同期済み",
    "zh-CN": "已同步修剪活动"
  },
  "other_tab_s_clear_synchronized": {
    "en": "Other tab's clear synchronized",
    "zh-TW": "已同步其他分頁清除",
    "ja": "別タブの消去を同期済み",
    "zh-CN": "已同步其他分页清除"
  },
  "clearing_activity": {
    "en": "Clearing activity",
    "zh-TW": "正在清除活動",
    "ja": "活動を消去中",
    "zh-CN": "正在清除活动"
  },
  "selected_activity_pruned_other_data_retained": {
    "en": "Selected activity pruned; other data retained",
    "zh-TW": "已修剪指定活動；其他資料保留",
    "ja": "指定活動を削除、他のデータは保持",
    "zh-CN": "已修剪指定活动；其他数据保留"
  },
  "activity_cleared_exported_files_unaffected": {
    "en": "Activity cleared; exported files unaffected",
    "zh-TW": "已清除活動資料；匯出檔案不受影響",
    "ja": "活動データを消去、出力済みファイルは保持",
    "zh-CN": "已清除活动数据；汇出档案不受影响"
  },
  "clear_failed": {
    "en": "Clear failed: ",
    "zh-TW": "清除失敗：",
    "ja": "消去失敗：",
    "zh-CN": "清除失败："
  },
  "storage_transaction_completed": {
    "en": "Storage transaction completed",
    "zh-TW": "保存交易已完成",
    "ja": "保存トランザクション完了",
    "zh-CN": "保存交易已完成"
  },
  "save_incomplete_data_remains_in_this_page": {
    "en": "Save incomplete; data remains in this page",
    "zh-TW": "保存未完成；資料仍留本頁",
    "ja": "保存未完了、データはこのページ内に保持",
    "zh-CN": "保存未完成；数据仍留本页"
  },
  "tab_clear_status_unconfirmed": {
    "en": "Tab clear status unconfirmed: ",
    "zh-TW": "分頁清除狀態未確認：",
    "ja": "タブの消去状態は未確認：",
    "zh-CN": "分页清除状态未确认："
  },
  "settings": {
    "en": "Settings",
    "zh-TW": "設定",
    "ja": "設定",
    "zh-CN": "设置"
  },
  "newer_position_unknown": {
    "en": " · Newer position unknown",
    "zh-TW": "・較新位置未知",
    "ja": " · 新しい位置は不明",
    "zh-CN": "?较新位置未知"
  },
  "multiple_simultaneous_positions_285": {
    "en": " · Multiple simultaneous positions",
    "zh-TW": "・同時多位置",
    "ja": " · 同時に複数の位置",
    "zh-CN": "?同时多位置"
  },
  "saved_data_restored": {
    "en": "Saved data restored",
    "zh-TW": "已讀回保存資料",
    "ja": "保存データを復元済み",
    "zh-CN": "已读回保存数据"
  },
  "storage_unavailable_data_stays_in_this_page": {
    "en": "Storage unavailable; data stays in this page: ",
    "zh-TW": "保存空間不可用，資料僅在本頁：",
    "ja": "保存領域利用不可、データはページ内のみ：",
    "zh-CN": "保存空间不可用，数据仅在本页："
  },
  "cleared_cache_is_not_replayed_awaiting_new_comm": {
    "en": "Cleared cache is not replayed; awaiting new COMM",
    "zh-TW": "已清除的舊快取不重播；等待新 COMM",
    "ja": "消去済みキャッシュは再利用せず、新しい COMM 待ち",
    "zh-CN": "已清除的旧快取不重播；等待新 COMM"
  },
  "public_comm_player_activity_tracker_standalone_plugin": {
    "en": "Public COMM player activity tracker · standalone plugin",
    "zh-TW": "公開 COMM 玩家活動追蹤・獨立插件",
    "ja": "公開 COMM プレイヤー活動追跡 · 独立プラグイン",
    "zh-CN": "公开 COMM 玩家活动追踪?独立插件"
  },
  "player_events": {
    "en": "Player events",
    "zh-TW": "玩家事件",
    "ja": "プレイヤーのイベント",
    "zh-CN": "玩家事件"
  },
  "overview_settings": {
    "en": "Overview / Settings",
    "zh-TW": "總覽／設定",
    "ja": "概要／設定",
    "zh-CN": "总览／设置"
  },
  "tabs": {
    "en": " tabs",
    "zh-TW": "分頁",
    "ja": " タブ",
    "zh-CN": "分页"
  },
  "minimize": {
    "en": "Minimize",
    "zh-TW": "最小化",
    "ja": "最小化",
    "zh-CN": "最小化"
  },
  "maximize_restore": {
    "en": "Maximize / restore",
    "zh-TW": "最大化／還原",
    "ja": "最大化／元に戻す",
    "zh-CN": "最大化／还原"
  },
  "close_portal_activity": {
    "en": "Close Portal activity",
    "zh-TW": "關閉 Portal 活動",
    "ja": "Portal 活動を閉じる",
    "zh-CN": "关闭 Portal 活动"
  },
  "close_workspace": {
    "en": "Close workspace",
    "zh-TW": "關閉工作區",
    "ja": "ワークスペースを閉じる",
    "zh-CN": "关闭工作区"
  },
  "resize_workspace": {
    "en": "Resize workspace",
    "zh-TW": "調整工作區大小",
    "ja": "ワークスペースのサイズ変更",
    "zh-CN": "调整工作区大小"
  },
  "close": {
    "en": "Close ",
    "zh-TW": "關閉 ",
    "ja": "閉じる：",
    "zh-CN": "关闭 "
  },
  "tab": {
    "en": " tab",
    "zh-TW": " 分頁",
    "ja": " タブ",
    "zh-CN": " 分页"
  },
  "from_now": {
    "en": " from now",
    "zh-TW": "後",
    "ja": "後",
    "zh-CN": "後"
  },
  "ago": {
    "en": " ago",
    "zh-TW": "前",
    "ja": "前",
    "zh-CN": "前"
  },
  "s": {
    "en": "s",
    "zh-TW": "秒",
    "ja": "秒",
    "zh-CN": "秒"
  },
  "m": {
    "en": "m",
    "zh-TW": "分",
    "ja": "分",
    "zh-CN": "分"
  },
  "h": {
    "en": "h",
    "zh-TW": "時",
    "ja": "時間",
    "zh-CN": "时"
  },
  "auto_refresh_is_off": {
    "en": "Auto refresh is off",
    "zh-TW": "自動刷新已關閉",
    "ja": "自動更新はオフ",
    "zh-CN": "自动刷新已关闭"
  },
  "scope_changed_queued_refresh_cancelled": {
    "en": "Scope changed; queued refresh cancelled",
    "zh-TW": "範圍已變更；排隊刷新已取消",
    "ja": "範囲変更、待機中の更新は中止",
    "zh-CN": "范围已变更；排队刷新已取消"
  },
  "backoff_active": {
    "en": "Backoff active",
    "zh-TW": "退避中",
    "ja": "再試行待機中",
    "zh-CN": "退避中"
  },
  "no_new_events_slowing_down": {
    "en": "No new events · slowing down",
    "zh-TW": "已無新事件・降檔等待",
    "ja": "新イベントなし · 間隔を延長して待機",
    "zh-CN": "已无新事件?降档等待"
  },
  "waiting_for_next_refresh": {
    "en": "Waiting for next refresh",
    "zh-TW": "等待下一次刷新",
    "ja": "次の更新待ち",
    "zh-CN": "等待下一次刷新"
  },
  "restore_sign_in_then_use_resume_acquisition": {
    "en": "Restore sign-in, then use Resume acquisition",
    "zh-TW": "請恢復登入後按「恢復擷取」",
    "ja": "ログイン復旧後に「取得を再開」を使用",
    "zh-CN": "请恢复登入後按「恢复撷取」"
  },
  "too_many_failures_acquisition_paused": {
    "en": "Too many failures; acquisition paused",
    "zh-TW": "失敗過多；暫停擷取",
    "ja": "失敗が多いため取得を一時停止",
    "zh-CN": "失败过多；暂停撷取"
  },
  "backoff_active_manual_refresh_must_wait": {
    "en": "Backoff active; manual refresh must wait",
    "zh-TW": "退避中；手動刷新仍須等待",
    "ja": "再試行待機中、手動更新も待機が必要",
    "zh-CN": "退避中；手动刷新仍须等待"
  },
  "history_query_reused_outside_scope_unknown": {
    "en": "History query reused; outside scope unknown",
    "zh-TW": "已共用本次歷史查詢；範圍外未知",
    "ja": "履歴クエリを再利用、範囲外は不明",
    "zh-CN": "已共用本次历史查询；范围外未知"
  },
  "existing_partial_history_reused_completeness_unknown": {
    "en": "Existing partial history reused; completeness unknown",
    "zh-TW": "已使用既有部分歷史；完整性未知",
    "ja": "既存の部分履歴を再利用、完全性は不明",
    "zh-CN": "已使用既有部分历史；完整性未知"
  },
  "compatible_history_coverage_reused_server_completeness_unverified": {
    "en": "Compatible history coverage reused; server completeness unverified",
    "zh-TW": "已共用相容歷史游標覆蓋；伺服器完整性未確認",
    "ja": "対応する履歴範囲を再利用、サーバーの完全性は未確認",
    "zh-CN": "已共用相容历史游标覆盖；伺服器完整性未确认"
  },
  "latest_refresh_running_expand_history_later": {
    "en": "Latest refresh running; expand history later",
    "zh-TW": "最新刷新進行中；請稍後擴展歷史",
    "ja": "最新の更新中、履歴拡張は後で実行",
    "zh-CN": "最新刷新进行中；请稍後扩展历史"
  },
  "latest_refresh_queued_history_cursor_retained": {
    "en": "Latest refresh queued; history cursor retained",
    "zh-TW": "最新刷新已排隊；保留歷史游標",
    "ja": "最新更新は待機中、履歴カーソルは保持",
    "zh-CN": "最新刷新已排队；保留历史游标"
  },
  "sign_in_permission_unavailable_history_cursor_retained": {
    "en": "Sign-in / permission unavailable; history cursor retained",
    "zh-TW": "登入／權限不可用；歷史游標已保留",
    "ja": "ログイン／権限利用不可、履歴カーソルは保持",
    "zh-CN": "登入／权限不可用；历史游标已保留"
  },
  "scope_changed_received_data_retained": {
    "en": "Scope changed; received data retained",
    "zh-TW": "範圍已變更；已取得資料保留",
    "ja": "範囲変更、取得済みデータは保持",
    "zh-CN": "范围已变更；已取得数据保留"
  },
  "sharing_compatible_public_comm_request": {
    "en": "Sharing compatible public COMM request",
    "zh-TW": "共用相容的公開 COMM 請求",
    "ja": "対応する公開 COMM リクエストを共有",
    "zh-CN": "共用相容的公开 COMM 请求"
  },
  "waiting_for_native_public_comm": {
    "en": "Waiting for native public COMM",
    "zh-TW": "等待原生公開 COMM",
    "ja": "標準の公開 COMM 待ち",
    "zh-CN": "等待原生公开 COMM"
  },
  "page_limit_reached_partial_data_retained": {
    "en": "Page limit reached; partial data retained",
    "zh-TW": "翻頁達上限；已取得部分資料",
    "ja": "ページ上限、部分データは保持",
    "zh-CN": "翻页达上限；已取得部分数据"
  },
  "loading_historical_activity": {
    "en": "Loading historical activity",
    "zh-TW": "正在讀取歷史活動",
    "ja": "過去の活動を読み込み中",
    "zh-CN": "正在读取历史活动"
  },
  "catching_up_on_new_events": {
    "en": "Catching up on new events",
    "zh-TW": "追趕未接收的新事件",
    "ja": "未受信の新イベントを取得中",
    "zh-CN": "追赶未接收的新事件"
  },
  "refreshing_latest_activity": {
    "en": "Refreshing latest activity",
    "zh-TW": "正在刷新最新活動",
    "ja": "最新活動を更新中",
    "zh-CN": "正在刷新最新活动"
  },
  "updating_observation_time_data": {
    "en": "Updating observation-time data",
    "zh-TW": "更新觀測時間資料",
    "ja": "観測時刻のデータを更新中",
    "zh-CN": "更新观测时间数据"
  },
  "scope_changed_existing_data_retained": {
    "en": "Scope changed; existing data retained",
    "zh-TW": "範圍已變更；舊資料保留",
    "ja": "範囲変更、既存データは保持",
    "zh-CN": "范围已变更；旧数据保留"
  },
  "invalid_time_cursor_format_received_data_retained": {
    "en": "Invalid time / cursor format; received data retained",
    "zh-TW": "時間／游標格式異常；已取得資料保留",
    "ja": "時刻／カーソル形式異常、取得済みデータは保持",
    "zh-CN": "时间／游标格式异常；已取得数据保留"
  },
  "public_comm_returned_over_50_rows_response_contract_unverified": {
    "en": "Public COMM returned over 50 rows; response contract unverified",
    "zh-TW": "公開 COMM 回應超過 50 筆；契約待核對",
    "ja": "公開 COMM 応答が 50 件超、応答仕様は未確認",
    "zh-CN": "公开 COMM 回应超过 50 笔；契约待核对"
  },
  "response_violates_fixed_time_order_received_data_retained": {
    "en": "Response violates fixed time / order; received data retained",
    "zh-TW": "回應不符合固定時間／排序；已取得資料保留",
    "ja": "応答の時刻／順序不一致、取得済みデータは保持",
    "zh-CN": "回应不符合固定时间／排序；已取得数据保留"
  },
  "cursor_page_did_not_advance_partial_data_retained": {
    "en": "Cursor / page did not advance; partial data retained",
    "zh-TW": "游標／頁面未前進；已取得部分資料",
    "ja": "カーソル／ページ未進行、部分データは保持",
    "zh-CN": "游标／页面未前进；已取得部分数据"
  },
  "repeated_cursor_partial_data_retained": {
    "en": "Repeated cursor; partial data retained",
    "zh-TW": "游標重複；保留部分資料",
    "ja": "カーソル重複、部分データは保持",
    "zh-CN": "游标重复；保留部分数据"
  },
  "latest_page_updated_earlier_history_unconfirmed": {
    "en": "Latest page updated; earlier history unconfirmed",
    "zh-TW": "最新頁已更新；較早歷史尚未確認",
    "ja": "最新ページ更新済み、以前の履歴は未確認",
    "zh-CN": "最新页已更新；较早历史尚未确认"
  },
  "history_query_completed_server_completeness_unverified": {
    "en": "History query completed; server completeness unverified",
    "zh-TW": "本次歷史查詢完成；伺服器完整性未確認",
    "ja": "履歴クエリ完了、サーバーの完全性は未確認",
    "zh-CN": "本次历史查询完成；伺服器完整性未确认"
  },
  "latest_refresh_completed_outside_scope_unconfirmed": {
    "en": "Latest refresh completed; outside scope unconfirmed",
    "zh-TW": "最新刷新完成；範圍外未確認",
    "ja": "最新更新完了、範囲外は未確認",
    "zh-CN": "最新刷新完成；范围外未确认"
  },
  "history_segment_reused_server_completeness_unverified": {
    "en": "History segment reused; server completeness unverified",
    "zh-TW": "已共用歷史區段；伺服器完整性未確認",
    "ja": "履歴区間を再利用、サーバーの完全性は未確認",
    "zh-CN": "已共用历史区段；伺服器完整性未确认"
  },
  "loading_history_cursor_advancing": {
    "en": "Loading history · cursor advancing",
    "zh-TW": "正在讀取歷史・游標前進",
    "ja": "履歴読み込み中 · カーソル進行",
    "zh-CN": "正在读取历史?游标前进"
  },
  "catching_up_cursor_advancing": {
    "en": "Catching up · cursor advancing",
    "zh-TW": "正在追趕・游標前進",
    "ja": "追跡取得中 · カーソル進行",
    "zh-CN": "正在追赶?游标前进"
  },
  "sign_in_authentication_blocked_restore_sign_in_then_resume_acquis": {
    "en": "Sign-in / authentication blocked; restore sign-in, then Resume acquisition",
    "zh-TW": "登入／驗證受阻；恢復登入後按「恢復擷取」",
    "ja": "ログイン／認証の問題。復旧後に「取得を再開」",
    "zh-CN": "登入／验证受阻；恢复登入後按「恢复撷取」"
  },
  "refresh_timed_out_retry_later": {
    "en": "Refresh timed out; retry later",
    "zh-TW": "刷新逾時；稍後重試",
    "ja": "更新タイムアウト、後で再試行",
    "zh-CN": "刷新逾时；稍後重试"
  },
  "refresh_failed_retry_later": {
    "en": "Refresh failed; retry later",
    "zh-TW": "刷新失敗；稍後重試",
    "ja": "更新失敗、後で再試行",
    "zh-CN": "刷新失败；稍後重试"
  },
  "task_stopped_coverage_unknown": {
    "en": "Task stopped; coverage unknown",
    "zh-TW": "工作已停止；覆蓋未知",
    "ja": "タスク停止、取得範囲は不明",
    "zh-CN": "工作已停止；覆盖未知"
  },
  "old_scope_request_failed_received_data_retained": {
    "en": "Old-scope request failed; received data retained",
    "zh-TW": "舊範圍請求失敗；已取得資料保留",
    "ja": "旧範囲の取得失敗、取得済みデータは保持",
    "zh-CN": "旧范围请求失败；已取得数据保留"
  },
  "stopped": {
    "en": "Stopped",
    "zh-TW": "已停止",
    "ja": "停止済み",
    "zh-CN": "已停止"
  },
  "single_tab_acquisition_waiting_for_other_page_to_release": {
    "en": "Single-tab acquisition; waiting for other page to release",
    "zh-TW": "單分頁擷取模式；等待其他頁面釋放",
    "ja": "単一タブ取得、他のページの解放待ち",
    "zh-CN": "单分页撷取模式；等待其他页面释放"
  },
  "shared_scheduling": {
    "en": "Shared scheduling",
    "zh-TW": "共用排程",
    "ja": "共有スケジュール",
    "zh-CN": "共用排程"
  },
  "sign_in_authentication_blocked_explicit_resume_required": {
    "en": "Sign-in / authentication blocked; explicit resume required",
    "zh-TW": "登入／驗證受阻；需明確恢復",
    "ja": "ログイン／認証の問題、明示的な再開が必要",
    "zh-CN": "登入／验证受阻；需明确恢复"
  },
  "shared_error_backoff": {
    "en": "Shared error backoff",
    "zh-TW": "共用錯誤退避",
    "ja": "共有のエラー待機",
    "zh-CN": "共用错误退避"
  },
  "page_paused_request_not_sent": {
    "en": "Page paused; request not sent",
    "zh-TW": "頁面暫停；尚未發送",
    "ja": "ページ一時停止、リクエスト未送信",
    "zh-CN": "页面暂停；尚未发送"
  },
  "previous_request_unconfirmed_waiting_to_take_over": {
    "en": "Previous request unconfirmed; waiting to take over",
    "zh-TW": "前次請求狀態未確認；等待接管",
    "ja": "前回リクエスト未確認、引き継ぎ待ち",
    "zh-CN": "前次请求状态未确认；等待接管"
  },
  "shared_request_budget_wait": {
    "en": "Shared request-budget wait",
    "zh-TW": "共用負載預算等待",
    "ja": "共有リクエスト予算の待機",
    "zh-CN": "共用负载预算等待"
  },
  "waiting_for_native_comm": {
    "en": "Waiting for native COMM",
    "zh-TW": "等待原生 COMM",
    "ja": "標準 COMM 待ち",
    "zh-CN": "等待原生 COMM"
  },
  "shared_refresh_interval": {
    "en": "Shared refresh interval",
    "zh-TW": "共用檔位間隔",
    "ja": "共有の更新間隔",
    "zh-CN": "共用档位间隔"
  },
  "account_data_generation_changed": {
    "en": "Account / data generation changed",
    "zh-TW": "帳號／資料世代已變更",
    "ja": "アカウント／データ世代変更",
    "zh-CN": "账号／数据世代已变更"
  },
  "shared_request_running": {
    "en": "Shared request running",
    "zh-TW": "共用請求進行中",
    "ja": "共有リクエスト実行中",
    "zh-CN": "共用请求进行中"
  },
  "signed_in_account_changed_explicitly_resume_acquisition": {
    "en": "Signed-in account changed; explicitly resume acquisition",
    "zh-TW": "登入帳號已變更；請明確恢復擷取",
    "ja": "ログインアカウント変更、取得を明示的に再開してください",
    "zh-CN": "登入账号已变更；请明确恢复撷取"
  },
  "previous_request_unconfirmed_waiting_for_safe_takeover": {
    "en": "Previous request unconfirmed; waiting for safe takeover",
    "zh-TW": "前次請求狀態未確認；等待安全接管",
    "ja": "前回リクエスト未確認、安全な引き継ぎ待ち",
    "zh-CN": "前次请求状态未确认；等待安全接管"
  },
  "shared_request_completed": {
    "en": "Shared request completed",
    "zh-TW": "共用請求已完成",
    "ja": "共有リクエスト完了",
    "zh-CN": "共用请求已完成"
  },
  "signed_in_account_unknown_acquisition_paused": {
    "en": "Signed-in account unknown; acquisition paused",
    "zh-TW": "登入帳號未知；擷取暫停",
    "ja": "ログインアカウント不明、取得は一時停止",
    "zh-CN": "登入账号未知；撷取暂停"
  },
  "explicitly_resumed_existing_waits_remain": {
    "en": "Explicitly resumed; existing waits remain",
    "zh-TW": "已明確恢復；既有等待仍適用",
    "ja": "明示的に再開、既存の待機は継続",
    "zh-CN": "已明确恢复；既有等待仍适用"
  },
  "signed_in_account_changed_explicit_resume_required": {
    "en": "Signed-in account changed; explicit resume required",
    "zh-TW": "登入帳號已變更；需明確恢復擷取",
    "ja": "ログインアカウント変更、明示的な取得再開が必要",
    "zh-CN": "登入账号已变更；需明确恢复撷取"
  },
  "storage_open_timed_out_close_old_tabs_and_retry": {
    "en": "Storage open timed out; close old tabs and retry",
    "zh-TW": "保存空間開啟逾時；請關閉舊分頁後重試",
    "ja": "保存領域の開始タイムアウト。古いタブを閉じて再試行",
    "zh-CN": "保存空间开启逾时；请关闭旧分页後重试"
  },
  "storage_blocked_by_an_old_tab": {
    "en": "Storage blocked by an old tab",
    "zh-TW": "保存空間被舊分頁阻擋",
    "ja": "古いタブが保存領域をブロック",
    "zh-CN": "保存空间被旧分页阻挡"
  },
  "storage_version_changed_reload_this_page": {
    "en": "Storage version changed; reload this page",
    "zh-TW": "保存空間版本已變更，請重整",
    "ja": "保存領域のバージョン変更、再読み込みしてください",
    "zh-CN": "保存空间版本已变更，请重整"
  },
  "indexeddb_unavailable": {
    "en": "IndexedDB unavailable",
    "zh-TW": "IndexedDB 不可用",
    "ja": "IndexedDB 利用不可",
    "zh-CN": "IndexedDB 不可用"
  },
  "transaction_cancelled": {
    "en": "Transaction cancelled",
    "zh-TW": "交易已取消",
    "ja": "トランザクション中止",
    "zh-CN": "交易已取消"
  },
  "data_generation_changed": {
    "en": "Data generation changed",
    "zh-TW": "資料世代已變更",
    "ja": "データ世代変更",
    "zh-CN": "数据世代已变更"
  },
  "storage_capacity_reached_page_data_retained_export_or_clear": {
    "en": "Storage capacity reached; page data retained, export or clear",
    "zh-TW": "保存容量已達上限；資料仍留本頁，請匯出或清除",
    "ja": "保存容量上限、ページ内データは保持。出力または消去してください",
    "zh-CN": "保存容量已达上限；数据仍留本页，请汇出或清除"
  },
  "activity_saving_is_off": {
    "en": "Activity saving is off",
    "zh-TW": "保存已關閉",
    "ja": "活動保存はオフ",
    "zh-CN": "保存已关闭"
  },
  "data_generation_out_of_range": {
    "en": "Data generation out of range",
    "zh-TW": "資料世代超出範圍",
    "ja": "データ世代が範囲外",
    "zh-CN": "数据世代超出范围"
  },
  "interaction_coordinates_missing": {
    "en": "Interaction coordinates missing",
    "zh-TW": "互動缺少座標",
    "ja": "相互作用の座標なし",
    "zh-CN": "互动缺少座标"
  },
  "simultaneous_interaction_positions_unresolved": {
    "en": "Simultaneous interaction positions unresolved",
    "zh-TW": "同時互動位置未解",
    "ja": "同時の相互作用位置が未解決",
    "zh-CN": "同时互动位置未解"
  },
  "earlier_valid_estimate_latest_interval_unresolved_373": {
    "en": "Earlier valid estimate; latest interval unresolved",
    "zh-TW": "較早有效估算；最新間隔未解",
    "ja": "以前の有効な推定、最新区間は未解決",
    "zh-CN": "较早有效估算；最新间隔未解"
  },
  "calculated": {
    "en": "Calculated",
    "zh-TW": "已計算",
    "ja": "計算済み",
    "zh-CN": "已计算"
  },
  "neutral_unconfirmed": {
    "en": "Neutral / unconfirmed",
    "zh-TW": "中立／未確認",
    "ja": "中立／未確認",
    "zh-CN": "中立／未确认"
  },
  "unknown_faction": {
    "en": "Unknown faction",
    "zh-TW": "未知陣營",
    "ja": "不明な陣営",
    "zh-CN": "未知阵营"
  },
  "walking": {
    "en": "Walking",
    "zh-TW": "走路",
    "ja": "徒歩",
    "zh-CN": "走路"
  },
  "running": {
    "en": "Running",
    "zh-TW": "跑步",
    "ja": "ランニング",
    "zh-CN": "跑步"
  },
  "bicycle": {
    "en": "Bicycle",
    "zh-TW": "自行車",
    "ja": "自転車",
    "zh-CN": "自行车"
  },
  "motorcycle": {
    "en": "Motorcycle",
    "zh-TW": "機車",
    "ja": "オートバイ",
    "zh-CN": "机车"
  },
  "car": {
    "en": "Car",
    "zh-TW": "汽車",
    "ja": "自動車",
    "zh-CN": "汽车"
  },
  "train_tram": {
    "en": "Train / tram",
    "zh-TW": "火車／電車",
    "ja": "電車／列車",
    "zh-CN": "火车／电车"
  },
  "high_speed_rail": {
    "en": "High-speed rail",
    "zh-TW": "高鐵",
    "ja": "高速鉄道",
    "zh-CN": "高铁"
  },
  "aircraft": {
    "en": "Aircraft",
    "zh-TW": "飛機",
    "ja": "航空機",
    "zh-CN": "飞机"
  },
  "ghost": {
    "en": "Ghost",
    "zh-TW": "鬼",
    "ja": "鬼",
    "zh-CN": "鬼"
  },
  "language": {
    "en": "Language",
    "zh-TW": "語言",
    "ja": "言語",
    "zh-CN": "语言"
  },
  "visible_factions_accounts": {
    "en": "Visible factions / accounts",
    "zh-TW": "顯示陣營／帳號",
    "ja": "表示する陣営／アカウント",
    "zh-CN": "显示阵营／账号"
  },
  "khresist_is_an_ingress_player_from_kaohsiung_taiwan": {
    "en": "khresist is an Ingress player from Kaohsiung, Taiwan.",
    "zh-TW": "khresist 是來自臺灣高雄的 Ingress 玩家。",
    "ja": "khresist は台湾・高雄の Ingress プレイヤーです。",
    "zh-CN": "khresist 是来自台湾高雄的 Ingress 玩家。"
  },
  "original_implementation_under_mit_reference_authors_and_source_no": {
    "en": "Original implementation under MIT; reference authors and source notices retained.",
    "zh-TW": "原創實作採 MIT 授權；參考作者與來源標示保留。",
    "ja": "独自実装は MIT ライセンス。参考著者とソース表記を保持。",
    "zh-CN": "原创实作采 MIT 授权；参考作者与来源标示保留。"
  },
  "invalid_raw_backup": {
    "en": "Invalid raw backup",
    "zh-TW": "無效的原始備份",
    "ja": "無効な元データのバックアップ",
    "zh-CN": "无效的原始备份"
  },
  "group_selection_released_activate_this_tab_to_select_again": {
    "en": "Group selection released; activate this tab to select again",
    "zh-TW": "群組選取已釋放；點選分頁可重新選取",
    "ja": "グループ選択解除済み。タブを選ぶと再選択",
    "zh-CN": "群组选取已释放；点选分页可重新选取"
  },
  "selected_selected_group_members_visible_visible": {
    "en": "Selected: {selected} · Group: {members} · Visible: {visible}",
    "zh-TW": "已選 {selected} 位 · 群組 {members} 位 · 目前可顯示 {visible} 位",
    "ja": "選択：{selected} 人 · グループ：{members} 人 · 表示可能：{visible} 人",
    "zh-CN": "已选 {selected} 位 · 群组 {members} 位 · 目前可显示 {visible} 位"
  },
  "s_ms_s_suffix": {
    "en": "{s}.{ms}s{suffix}",
    "zh-TW": "{s}.{ms}秒{suffix}",
    "ja": "{s}.{ms}秒{suffix}",
    "zh-CN": "{s}.{ms}秒{suffix}"
  },
  "m_m_sec_s_suffix": {
    "en": "{m}m {sec}s{suffix}",
    "zh-TW": "{m}分{sec}秒{suffix}",
    "ja": "{m}分{sec}秒{suffix}",
    "zh-CN": "{m}分{sec}秒{suffix}"
  },
  "h_h_m_m_sec_s_suffix": {
    "en": "{h}h {m}m {sec}s{suffix}",
    "zh-TW": "{h}時{m}分{sec}秒{suffix}",
    "ja": "{h}時間{m}分{sec}秒{suffix}",
    "zh-CN": "{h}时{m}分{sec}秒{suffix}"
  },
  "detach_tab": {
    "en": "Detach tab",
    "zh-TW": "分離分頁",
    "zh-CN": "分离分页",
    "ja": "タブを分離"
  },
  "redock_tab": {
    "en": "Redock tab",
    "zh-TW": "放回工作區",
    "zh-CN": "放回工作区",
    "ja": "タブを戻す"
  },
  "move_tab": {
    "en": "Move tab (drag or Alt+arrow)",
    "zh-TW": "移動分頁（拖曳或 Alt＋方向鍵）",
    "zh-CN": "移动分页（拖动或 Alt＋方向键）",
    "ja": "タブ移動（ドラッグまたは Alt＋矢印）"
  },
  "nearby_local_activity": {
    "en": "Nearby local interaction",
    "zh-TW": "附近互動情境",
    "zh-CN": "附近交互情境",
    "ja": "近隣の操作仮説"
  },
  "historical_positions": {
    "en": "Historical inference: possible positions (experimental)",
    "zh-TW": "歷史推論:位置(實驗)",
    "zh-CN": "历史推论:可能位置(实验)",
    "ja": "履歴推論:位置候補(実験)"
  },
  "historical_regions": {
    "en": "Historical inference: possible regions (experimental)",
    "zh-TW": "歷史推論:區域(實驗)",
    "zh-CN": "历史推论:可能区域(实验)",
    "ja": "履歴推論:候補領域(実験)"
  },
  "inference_reference": {
    "en": "Simulation reference",
    "zh-TW": "推論參考",
    "zh-CN": "推论参考",
    "ja": "推論の参照"
  },
  "local_average_choice": {
    "en": "Local average displacement",
    "zh-TW": "局部平均位移",
    "zh-CN": "局部平均位移",
    "ja": "局所平均移動"
  },
  "minimum_movement_choice": {
    "en": "Minimum-movement simulation",
    "zh-TW": "最少移動模擬",
    "zh-CN": "最少移动模拟",
    "ja": "最小移動シミュレーション"
  },
  "both_references": {
    "en": "Both references",
    "zh-TW": "兩種參考",
    "zh-CN": "两种参考",
    "ja": "両方の参照"
  },
  "simulated_average": {
    "en": "Simulated average",
    "zh-TW": "模擬均速",
    "zh-CN": "模拟均速",
    "ja": "模擬平均速度"
  },
  "simulation_not_observed": {
    "en": "Simulation, not measured travel",
    "zh-TW": "模擬值，非實際移動量測",
    "zh-CN": "模拟值，非实际移动测量",
    "ja": "実測移動ではなくシミュレーション"
  },
  "historical_inference_off": {
    "en": "Historical inference display is off",
    "zh-TW": "歷史推論顯示未啟用",
    "zh-CN": "历史推论显示未启用",
    "ja": "過去位置推定の表示は無効です"
  },
  "attack_range_simulation": {
    "en": "Attack range simulation",
    "zh-TW": "攻擊範圍模擬",
    "zh-CN": "攻击范围模拟",
    "ja": "攻撃範囲シミュレーション"
  },
  "attack_range_help": {
    "en": "Hypothetical range; Portal-only targets include a40m offset. Not a measured weapon level.",
    "zh-TW": "假設攻擊半徑；僅知Portal時另含40m偏移，非實測武器等級。",
    "zh-CN": "假设攻击半径；仅知Portal时另含40m偏移，非实测武器等级。",
    "ja": "仮定の攻撃半径。Portalのみの対象には40mの補正を加算。実測武器レベルではありません。"
  },
  "history_controls_help": {
    "en": "Lookback sets the visible/query interval. Refresh updates the newest page; Fetch this range again reads history. Storage retention is separate.",
    "zh-TW": "回看設定顯示／查詢區間；刷新讀最新頁，重新擷取此區間讀歷史。保存期限另行設定。",
    "zh-CN": "回看设定显示／查询区间；刷新读最新页，重新获取此区间读历史。保存期限另行设定。",
    "ja": "表示期間は照会範囲を設定。更新は最新ページ、期間の再取得は履歴。保存期限は別設定。"
  },
  "history_countdown": {
    "en": "Next eligible send in{n}s",
    "zh-TW": "距可發送約{n}秒",
    "zh-CN": "距可发送约{n}秒",
    "ja": "送信可能まで約{n}秒"
  },
  "history_progress_counts": {
    "en": "Read{pages}pages · returned{read} · new{records} · filtered view{visible}",
    "zh-TW": "已讀{pages}頁 · 返回{read}筆 · 新增{records}筆 · 目前篩選{visible}筆",
    "zh-CN": "已读{pages}页 · 返回{read}条 · 新增{records}条 · 当前筛选{visible}条",
    "ja": "{pages}ページ受信 · 応答{read}件 · 新規{records}件 · フィルター内{visible}件"
  },
  "history_earliest": {
    "en": "Earliest returned:",
    "zh-TW": "最早返回：",
    "zh-CN": "最早返回：",
    "ja": "最古の応答："
  },
  "history_phase_idle": {
    "en": "History not requested",
    "zh-TW": "尚未讀取歷史",
    "zh-CN": "尚未读取历史",
    "ja": "履歴未照会"
  },
  "history_phase_queued": {
    "en": "History queued",
    "zh-TW": "歷史已排隊",
    "zh-CN": "历史已排队",
    "ja": "履歴待機"
  },
  "history_phase_waiting": {
    "en": "History waiting",
    "zh-TW": "歷史等待中",
    "zh-CN": "历史等待中",
    "ja": "履歴待機中"
  },
  "history_phase_waiting-native-unknown": {
    "en": "Waiting to confirm native request",
    "zh-TW": "等待確認原生請求",
    "zh-CN": "等待确认原生请求",
    "ja": "標準リクエストの確認待ち"
  },
  "history_phase_fetching": {
    "en": "Reading history",
    "zh-TW": "正在讀取歷史",
    "zh-CN": "正在读取历史",
    "ja": "履歴取得中"
  },
  "history_phase_partial": {
    "en": "Partial history; completeness unknown",
    "zh-TW": "部分歷史，完整性未確認",
    "zh-CN": "部分历史，完整性未确认",
    "ja": "一部履歴、完全性未確認"
  },
  "history_phase_query-boundary": {
    "en": "Selected query boundary reached",
    "zh-TW": "已到查詢區間邊界",
    "zh-CN": "已到查询区间边界",
    "ja": "照会範囲の境界に到達"
  },
  "history_phase_cancelled": {
    "en": "History cancelled",
    "zh-TW": "歷史已取消",
    "zh-CN": "历史已取消",
    "ja": "履歴取得中止"
  },
  "history_phase_failed": {
    "en": "History failed",
    "zh-TW": "歷史擷取失敗",
    "zh-CN": "历史获取失败",
    "ja": "履歴取得失敗"
  },
  "history_phase_cleared": {
    "en": "Activity cleared; history can be fetched again",
    "zh-TW": "活動已清除，可重抓歷史",
    "zh-CN": "活动已清除，可重新获取历史",
    "ja": "活動削除済み、履歴を再取得可能"
  },
  "history_phase_stalled": {
    "en": "Pagination stopped; partial data retained",
    "zh-TW": "翻頁停止，保留部分資料",
    "zh-CN": "翻页停止，保留部分资料",
    "ja": "ページ取得停止、一部データ保持"
  },
  "history_runtime_status_0": {
    "en": "History queued",
    "zh-TW": "歷史擷取已排隊",
    "zh-CN": "历史获取已排队",
    "ja": "履歴待機"
  },
  "history_runtime_status_1": {
    "en": "Native request state unknown; wait for reconciliation or recover",
    "zh-TW": "原生請求狀態未明；等待確認或按恢復擷取",
    "zh-CN": "原生请求状态未明；等待确认或恢复获取",
    "ja": "標準リクエストの状態不明。確認を待つか復旧してください"
  },
  "history_runtime_status_2": {
    "en": "Waiting for native public COMM completion",
    "zh-TW": "等待原生公開 COMM 完成",
    "zh-CN": "等待原生公开 COMM 完成",
    "ja": "標準公開COMMの完了待ち"
  },
  "history_runtime_status_3": {
    "en": "Error backoff; history cursor retained",
    "zh-TW": "錯誤退避中；歷史游標已保留",
    "zh-CN": "错误退避中；历史游标已保留",
    "ja": "エラー待機。履歴カーソル保持"
  },
  "history_runtime_status_4": {
    "en": "Waiting for safe dispatch time",
    "zh-TW": "等待安全發送時間",
    "zh-CN": "等待安全发送时间",
    "ja": "安全な送信時刻を待機"
  },
  "history_runtime_status_5": {
    "en": "No more rows returned this time; server history completeness unknown",
    "zh-TW": "伺服器本次未返回更多資料；歷史完整性未確認",
    "zh-CN": "服务器本次未返回更多数据；历史完整性未确认",
    "ja": "今回は追加データなし。サーバー履歴の完全性は不明"
  },
  "history_runtime_status_6": {
    "en": "Latest page read; resuming history before older head catch-up",
    "zh-TW": "最新頁已讀取；先續接歷史，較早最新資料仍待追趕",
    "zh-CN": "最新页已读取；先续接历史，较早最新数据仍待追赶",
    "ja": "最新ページ取得済み。履歴を再開し、残りの追跡は後で継続"
  },
  "history_runtime_status_7": {
    "en": "Activity cleared; this range can be fetched again",
    "zh-TW": "活動已清除；可重新擷取此區間",
    "zh-CN": "活动已清除；可重新获取此区间",
    "ja": "活動削除済み。この期間を再取得可能"
  },
  "history_phase_waiting-head": {
    "en": "Waiting for latest page handoff",
    "zh-TW": "等待最新頁交接",
    "zh-CN": "等待最新页交接",
    "ja": "最新ページからの引継ぎ待ち"
  },
  "history_runtime_head_handoff": {
    "en": "Resuming history after latest page; cursor retained",
    "zh-TW": "讀取最新頁後續接歷史；游標已保留",
    "zh-CN": "读取最新页后续接历史；游标已保留",
    "ja": "最新ページ後に履歴再開。カーソル保持"
  },
  "nav_overview": {
    "en": "Player overview",
    "zh-TW": "玩家總覽",
    "zh-CN": "玩家总览",
    "ja": "プレイヤー一覧"
  },
  "nav_acquisition": {
    "en": "Record acquisition",
    "zh-TW": "紀錄擷取",
    "zh-CN": "记录获取",
    "ja": "記録取得"
  },
  "nav_map": {
    "en": "Map display",
    "zh-TW": "地圖顯示",
    "zh-CN": "地图显示",
    "ja": "地図表示"
  },
  "nav_data": {
    "en": "Data management",
    "zh-TW": "資料管理",
    "zh-CN": "数据管理",
    "ja": "データ管理"
  },
  "nav_settings": {
    "en": "Settings",
    "zh-TW": "設定",
    "zh-CN": "设置",
    "ja": "設定"
  },
  "nav_live": {
    "en": "Live acquisition",
    "zh-TW": "即時擷取",
    "zh-CN": "即时获取",
    "ja": "ライブ取得"
  },
  "nav_history": {
    "en": "Historical backtracking",
    "zh-TW": "歷史回溯",
    "zh-CN": "历史回溯",
    "ja": "過去ログ取得"
  },
  "nav_storage": {
    "en": "Saving and cleanup",
    "zh-TW": "保存與清理",
    "zh-CN": "保存与清理",
    "ja": "保存と整理"
  },
  "nav_export": {
    "en": "Export and backup",
    "zh-TW": "匯出與備份",
    "zh-CN": "导出与备份",
    "ja": "エクスポートとバックアップ"
  },
  "nav_preferences": {
    "en": "Preferences",
    "zh-TW": "一般設定",
    "zh-CN": "一般设置",
    "ja": "基本設定"
  },
  "nav_shared_inference": {
    "en": "Shared inference (experimental)",
    "zh-TW": "共用推論設定（實驗）",
    "zh-CN": "共用推论设置（实验）",
    "ja": "共通推定設定（実験）"
  },
  "overview_details": {
    "en": "Charts and legend",
    "zh-TW": "完整統計與圖例",
    "zh-CN": "完整统计与图例",
    "ja": "統計と凡例"
  },
  "advanced_requests": {
    "en": "Advanced request settings and diagnostics",
    "zh-TW": "進階請求設定與診斷",
    "zh-CN": "高级请求设置与诊断",
    "ja": "高度な取得設定と診断"
  },
  "global_time_scope": {
    "en": "Global lookback and observation cutoff; distinct from history T and retention.",
    "zh-TW": "共用回看與觀測截止時間；不同於歷史起始 T 及保存期限。",
    "zh-CN": "共用回看与观测截止时间；不同于历史起始 T 及保存期限。",
    "ja": "共通の表示期間と観測上限です。取得開始 T や保存期間とは異なります。"
  },
  "shared_inference_scope": {
    "en": "Shared model settings affect ALL players. Inspection time and branch are player-specific.",
    "zh-TW": "共用模型設定影響所有玩家；推論顯示時刻與分支屬當前玩家。",
    "zh-CN": "共用模型设置影响所有玩家；推论显示时刻与分支属于当前玩家。",
    "ja": "モデル設定は全プレイヤー共通です。表示時刻と分岐はプレイヤー固有です。"
  },
  "adjust_shared_inference": {
    "en": "Adjust shared inference settings",
    "zh-TW": "調整共用推論設定",
    "zh-CN": "调整共用推论设置",
    "ja": "共通推定設定を開く"
  },
  "apply_shared_xmp": {
    "en": "Apply minimum + XMP to ALL players",
    "zh-TW": "套用共用最小移動＋XMP（所有玩家）",
    "zh-CN": "应用共用最小移动＋XMP（所有玩家）",
    "ja": "全プレイヤーに最小移動＋XMP を適用"
  },
  "lookback_more_global": {
    "en": "Query 1 hour earlier (global lookback)",
    "zh-TW": "再往前查 1 小時（共用回看）",
    "zh-CN": "再往前查 1 小时（共用回看）",
    "ja": "さらに1時間前を取得（共通期間）"
  },
  "more_portal_events": {
    "en": "Show more events",
    "zh-TW": "顯示更多事件",
    "zh-CN": "显示更多事件",
    "ja": "イベントをさらに表示"
  },
  "destroyed_links": {
    "en": "Destroyed Links",
    "zh-TW": "被破壞 Link",
    "zh-CN": "被破坏 Link",
    "ja": "破壊された Link"
  },
  "link_distance_unknown": {
    "en": "Distance unavailable",
    "zh-TW": "距離不明",
    "zh-CN": "距离不明",
    "ja": "距離不明"
  },
  "flip_summary": {
    "en": "Flip",
    "zh-TW": "翻轉",
    "zh-CN": "翻转",
    "ja": "反転"
  },
  "raw_display_count": {
    "en": "{raw} raw records · {display} displayed rows",
    "zh-TW": "原始 {raw} 筆 · 顯示 {display} 列",
    "zh-CN": "原始 {raw} 条 · 显示 {display} 行",
    "ja": "元記録 {raw} 件 · 表示 {display} 行"
  },
  "other_count": {
    "en": "Other {n}",
    "zh-TW": "其他 {n}",
    "zh-CN": "其他 {n}",
    "ja": "その他 {n}"
  },
  "nav_open_page": {
    "en": "Reopen a function page",
    "zh-TW": "開啟已關閉的功能",
    "zh-CN": "打开已关闭的功能",
    "ja": "閉じた機能ページを開く"
  },
  "live_diagnostics": {
    "en": "Request details",
    "zh-TW": "請求詳細資料",
    "zh-CN": "请求详细资料",
    "ja": "取得の詳細"
  },
  "group_members": {
    "en": "Opened group membership",
    "zh-TW": "開啟時的群組成員",
    "zh-CN": "打开时的群组成员",
    "ja": "開いたグループのメンバー"
  },
  "visible_members": {
    "en": "Currently visible members",
    "zh-TW": "目前可見成員",
    "zh-CN": "当前可见成员",
    "ja": "現在表示中のメンバー"
  },
  "flip_system_evidence": {
    "en": "Confirmed same-time system cascade: distinct Links and CF at the same Portal. Human operator and manual/autonomous mechanism are unknown.",
    "zh-TW": "已確認同時、同系統來源、同 Portal 的不同 Link 與 CF 連鎖；人類操作者及手動／自主機制仍未確認。",
    "zh-CN": "已确认同时、同系统来源、同 Portal 的不同 Link 与 CF 连锁；人类操作者及手动／自主机制仍未确认。",
    "ja": "同じ時刻・システム・Portal の異なる Link と CF の連鎖を確認しました。人間の操作者と手動／自動の区別は不明です。"
  },
  "flip_manual_evidence": {
    "en": "Explicit human item-use record; expand for every corroborating source.",
    "zh-TW": "有明確人類道具使用紀錄；可展開核對所有佐證來源。",
    "zh-CN": "有明确人类道具使用记录；可展开核对所有佐证来源。",
    "ja": "人間によるアイテム使用記録があります。展開して全ての根拠を確認できます。"
  },
  "historical_inference_group": {
    "en": "Historical inference (experimental)",
    "zh-TW": "歷史推論（實驗）",
    "zh-CN": "历史推论（实验）",
    "ja": "過去位置推定（実験）"
  },
  "inferred_connections": {
    "en": "Historical inference: connections (experimental)",
    "zh-TW": "歷史推論:連線(實驗)",
    "zh-CN": "历史推论:连线(实验)",
    "ja": "過去位置推定：接続（実験）"
  },
  "player_speed_title": {
    "en": "Interaction displacement speed estimate",
    "zh-TW": "互動位移速度估算",
    "zh-CN": "互动位移速度估算",
    "ja": "相互作用間の移動速度推定"
  },
  "required_speed": {
    "en": "Required-displacement lower bound ≥{speed} km/h · minimum required distance {distance} m",
    "zh-TW": "必要位移速度下限 ≥{speed} km/h · 所需最短位移 {distance} m",
    "zh-CN": "必要位移速度下限 ≥{speed} km/h · 所需最短位移 {distance} m",
    "ja": "必要移動速度の下限 ≥{speed} km/h · 最低必要距離 {distance} m"
  },
  "center_speed": {
    "en": "Portal-center reference {speed} km/h · center distance {distance} m",
    "zh-TW": "Portal 中心參考速度 {speed} km/h · 中心距離 {distance} m",
    "zh-CN": "Portal 中心参考速度 {speed} km/h · 中心距离 {distance} m",
    "ja": "Portal 中心の参考速度 {speed} km/h · 中心間距離 {distance} m"
  },
  "witness_speed": {
    "en": "Validated-region representative reference {speed} km/h · reference distance {distance} m",
    "zh-TW": "已驗證互動區域代表點參考 {speed} km/h · 參考距離 {distance} m",
    "zh-CN": "已验证互动区域代表点参考 {speed} km/h · 参考距离 {distance} m",
    "ja": "検証済み領域の代表点参考値 {speed} km/h · 参考距離 {distance} m"
  },
  "speed_category": {
    "en": "Existing speed category: ",
    "zh-TW": "既有速度分類：",
    "zh-CN": "既有速度分类：",
    "ja": "既存の速度分類："
  },
  "speed_insufficient": {
    "en": "Insufficient/unresolved interaction data; speed unavailable",
    "zh-TW": "互動資料不足／未解，無法估算速度",
    "zh-CN": "互动资料不足／未解，无法估算速度",
    "ja": "相互作用データ不足／未解決のため速度を推定できません"
  },
  "speed_zero_warning": {
    "en": "Same-Portal/overlapping areas do not verify stationary presence or zero actual speed.",
    "zh-TW": "同 Portal／互動區域重疊不代表已證實靜止或實際速度為零。",
    "zh-CN": "同 Portal／互动区域重叠不代表已证实静止或实际速度为零。",
    "ja": "同じ Portal や領域の重複は静止や実速度ゼロの証明ではありません。"
  },
  "speed_summary_help": {
    "en": "Interval averages from existing40m endpoint assumptions; not instantaneous speed, GPS or verified travel mode.",
    "zh-TW": "以上為原40m端點假設的區間位移參考，不是瞬時速度、GPS或已確認的交通方式。",
    "zh-CN": "以上为原40m端点假设的区间位移参考，不是瞬时速度、GPS或已确认的交通方式。",
    "ja": "既存の40m端点仮定による区間参考値です。瞬間速度・GPS・確認済み移動手段ではありません。"
  },
  "portal_totals": {
    "en": "{players} unique RES/ENL players · {raw} raw events · {display} folded rows · {system} system records",
    "zh-TW": "{players} 位不同一般玩家 · 原始事件 {raw} · 合併後 {display} 列 · 系統紀錄 {system}",
    "zh-CN": "{players} 位不同一般玩家 · 原始事件 {raw} · 合并后 {display} 行 · 系统记录 {system}",
    "ja": "RES/ENL の個別プレイヤー {players} 人 · 元イベント {raw} 件 · 集約後 {display} 行 · システム記録 {system} 件"
  },
  "portal_loaded_scope": {
    "en": "Loaded records only; active player/faction scope, systems separate; lookback {hours} h. Not complete server history.",
    "zh-TW": "僅已載入資料；目前玩家／陣營篩選，系統另列；回看 {hours} 小時，非完整伺服器歷史。",
    "zh-CN": "仅已加载资料；当前玩家／阵营筛选，系统另列；回看 {hours} 小时，非完整服务器历史。",
    "ja": "読込済み・現在のプレイヤー／陣営範囲のみ（システム別）。過去 {hours} 時間。サーバー全履歴ではありません。"
  },
  "portal_link_roles": {
    "en": "Created Link roles: outgoing {outgoing} · incoming {incoming} · unresolved {undirected}",
    "zh-TW": "建立 Link 關聯：發起 {outgoing} · 接收 {incoming} · 方向未定 {undirected}",
    "zh-CN": "建立 Link 关联：发起 {outgoing} · 接收 {incoming} · 方向未定 {undirected}",
    "ja": "作成 Link の関係：発信 {outgoing} · 受信 {incoming} · 方向不明 {undirected}"
  },
  "portal_stat_details": {
    "en": "Distinct accounts and record counts",
    "zh-TW": "不同帳號與紀錄筆數",
    "zh-CN": "不同帐号与记录条数",
    "ja": "個別アカウントと記録件数"
  },
  "portal_relation_incoming": {
    "en": "Incoming destination association; not a direct interaction at this Portal.",
    "zh-TW": "接收端關聯；不代表玩家在此 Portal 直接互動。",
    "zh-CN": "接收端关联；不代表玩家在此 Portal 直接互动。",
    "ja": "受信先としての関係です。この Portal での直接操作を示しません。"
  },
  "portal_relation_outgoing": {
    "en": "Created Link origin interaction",
    "zh-TW": "建立 Link 的發起端互動",
    "zh-CN": "建立 Link 的发起端互动",
    "ja": "作成 Link の発信元操作"
  },
  "portal_relation_undirected": {
    "en": "Related Link; origin unresolved",
    "zh-TW": "相關 Link，發起端未確定",
    "zh-CN": "相关 Link，发起端未确定",
    "ja": "関連 Link（発信元未確定）"
  },
  "portal_raw_categories": {
    "en": "Raw event categories: ",
    "zh-TW": "原始事件分類：",
    "zh-CN": "原始事件分类：",
    "ja": "元イベント分類："
  }
};
  Object.assign(catalog,{progress_quiet:{en:'No new events','zh-TW':'無新事件','zh-CN':'无新事件',ja:'新イベントなし'},progress_advancing:{en:'Cursor advancing','zh-TW':'游標前進','zh-CN':'游标前进',ja:'カーソル進行'},progress_short:{en:'Short page received','zh-TW':'已取得短頁','zh-CN':'已取得短页',ja:'少件数のページ受信'},progress_complete:{en:'Catch-up completed','zh-TW':'追趕完成','zh-CN':'追赶完成',ja:'追跡取得完了'}});
  Object.assign(catalog,{
  "fetch_range_again": {
    "en": "Fetch this range again",
    "zh-TW": "重新擷取此區間",
    "zh-CN": "重新获取此区间",
    "ja": "この期間を再取得"
  },
  "live_fixed_hint": {
    "en": "Live follows the current time. Disable Live to edit a fixed time.",
    "zh-TW": "即時時間自動同步；取消即時後可編輯固定時間。",
    "zh-CN": "实时时间自动同步；取消实时后可编辑固定时间。",
    "ja": "ライブ時刻は自動同期。解除後に固定時刻を編集できます。"
  },
  "history_queued": {
    "en": "History queued; latest refresh takes priority",
    "zh-TW": "歷史已排隊；最新刷新優先",
    "zh-CN": "历史已排队；最新刷新优先",
    "ja": "履歴を待機中。最新更新を優先"
  },
  "history_superseded": {
    "en": "Range changed; obsolete request cancelled",
    "zh-TW": "區間已變更；舊請求已取消",
    "zh-CN": "区间已变更；旧请求已取消",
    "ja": "期間変更により旧リクエストを取消"
  },
  "history_unavailable": {
    "en": "History unavailable; retry after recovery",
    "zh-TW": "歷史不可用；恢復後重試",
    "zh-CN": "历史不可用；恢复后重试",
    "ja": "履歴取得不可。復旧後に再試行"
  },
  "history_paused": {
    "en": "History waiting for acquisition to resume",
    "zh-TW": "歷史等待恢復擷取",
    "zh-CN": "历史等待恢复获取",
    "ja": "取得再開まで履歴を待機"
  },
  "history_backoff": {
    "en": "History waiting for cooldown; retry later",
    "zh-TW": "歷史退避等待；稍後重試",
    "zh-CN": "历史退避等待；稍后重试",
    "ja": "履歴は待機中。後で再試行"
  },
  "history_circuit": {
    "en": "History paused after failures; recover then retry",
    "zh-TW": "失敗過多；恢復擷取後重試歷史",
    "zh-CN": "失败过多；恢复获取后重试历史",
    "ja": "失敗により履歴停止。復旧後に再試行"
  },
  "history_cleared": {
    "en": "Activity cleared; fetch this range again",
    "zh-TW": "資料已清除；可重新擷取此區間",
    "zh-CN": "数据已清除；可重新获取此区间",
    "ja": "消去済み。この期間を再取得できます"
  },
  "follow_stopped": {
    "en": "Stopped",
    "zh-TW": "已停止",
    "zh-CN": "已停止",
    "ja": "停止"
  },
  "follow_cleared": {
    "en": "Follow stopped: activity cleared",
    "zh-TW": "跟隨已停止：活動已清除",
    "zh-CN": "跟随已停止：活动已清除",
    "ja": "活動消去により追従停止"
  },
  "follow_following": {
    "en": "Following activity",
    "zh-TW": "跟隨活動中",
    "zh-CN": "跟随活动中",
    "ja": "活動を追従中"
  },
  "follow_historical": {
    "en": "Historical view",
    "zh-TW": "歷史觀察",
    "zh-CN": "历史观察",
    "ja": "履歴表示"
  },
  "follow_waiting": {
    "en": "Waiting for locatable activity",
    "zh-TW": "等待有座標的活動",
    "zh-CN": "等待有坐标的活动",
    "ja": "位置付き活動を待機"
  },
  "follow_outside-coverage": {
    "en": "No activity in this acquired interval; coverage is limited",
    "zh-TW": "目前擷取區間沒有活動；涵蓋範圍有限",
    "zh-CN": "当前获取区间没有活动；覆盖范围有限",
    "ja": "取得期間に活動なし。取得範囲は限定"
  },
  "follow_display-off": {
    "en": "Display off; no camera updates",
    "zh-TW": "顯示已關閉；不更新鏡頭",
    "zh-CN": "显示已关闭；不更新镜头",
    "ja": "表示オフ。カメラ更新なし"
  },
  "event_location": {
    "en": "Event location",
    "zh-TW": "事件位置",
    "zh-CN": "事件位置",
    "ja": "イベント位置"
  },
  "recenter_on_next_event": {
    "en": "Recenter on next new event",
    "zh-TW": "下一筆新事件再置中",
    "zh-CN": "下一条新事件再居中",
    "ja": "次の新イベントで中央に移動"
  },
  "portal_neutralized": {
    "en": "Portal neutralized",
    "zh-TW": "Portal 中立化",
    "zh-CN": "Portal 中立化",
    "ja": "ポータル中立化"
  },
  "system_batch": {
    "en": "{name}: {n} system events",
    "zh-TW": "{name}：{n} 筆系統事件",
    "zh-CN": "{name}：{n} 条系统事件",
    "ja": "{name}：システムイベント {n}件"
  },
  "system_event_count": {
    "en": "System events {n}",
    "zh-TW": "系統事件 {n}",
    "zh-CN": "系统事件 {n}",
    "ja": "システムイベント {n}"
  },
  "displayed_count": {
    "en": "Displayed rows {n}",
    "zh-TW": "顯示列 {n}",
    "zh-CN": "显示行 {n}",
    "ja": "表示行 {n}"
  }
});
  Object.assign(catalog,{
  "historical_positions": {
    "en": "Historical inference: Position (experimental)",
    "zh-TW": "歷史推論:位置(實驗)",
    "zh-CN": "历史推论:位置(实验)",
    "ja": "履歴推論:位置(実験)"
  },
  "historical_regions": {
    "en": "Historical inference: Region (experimental)",
    "zh-TW": "歷史推論:區域(實驗)",
    "zh-CN": "历史推论:区域(实验)",
    "ja": "履歴推論:領域(実験)"
  },
  "interaction_connections": {
    "en": "Interaction location connections",
    "zh-TW": "互動位置連線",
    "zh-CN": "互动位置连线",
    "ja": "操作地点の接続"
  },
  "inferred_connections": {"en": "Historical inference: connections (experimental)", "zh-TW": "歷史推論:連線(實驗)", "zh-CN": "历史推论:连线(实验)", "ja": "過去位置推定：接続（実験）"},
  "inference_tab": {
    "en": "Inference",
    "zh-TW": "推論",
    "zh-CN": "推论",
    "ja": "推論"
  },
  "historical_time": {
    "en": "Historical display time",
    "zh-TW": "歷史顯示時刻",
    "zh-CN": "历史显示时刻",
    "ja": "履歴表示時刻"
  },
  "observation_cutoff": {
    "en": "Observation cutoff",
    "zh-TW": "資料觀測截止",
    "zh-CN": "数据观察截止",
    "ja": "観測データ期限"
  },
  "primary_map_result": {
    "en": "Primary map model",
    "zh-TW": "地圖主模型",
    "zh-CN": "地图主模型",
    "ja": "地図の主モデル"
  },
  "attack_assumption": {
    "en": "Attack assumption",
    "zh-TW": "攻擊假設",
    "zh-CN": "攻击假设",
    "ja": "攻撃仮定"
  },
  "interaction_baseline": {
    "en": "Interaction baseline",
    "zh-TW": "互動基線",
    "zh-CN": "互动基线",
    "ja": "操作基準"
  },
  "selected_branch": {
    "en": "Selected alternative",
    "zh-TW": "選定分支",
    "zh-CN": "选定分支",
    "ja": "選択した分岐"
  },
  "branch_number": {
    "en": "Alternative {n}",
    "zh-TW": "分支 {n}",
    "zh-CN": "分支 {n}",
    "ja": "分岐 {n}"
  },
  "multiple_minimizers": {
    "en": "One selected feasible alternative; uniqueness not established",
    "zh-TW": "顯示一個可行分支，不代表唯一解",
    "zh-CN": "显示一个可行分支，不代表唯一解",
    "ja": "実行可能な一分岐を表示。唯一解ではありません"
  },
  "simulation_available": {
    "en": "Supported local simulation",
    "zh-TW": "有局部支持的模擬",
    "zh-CN": "有局部支持的模拟",
    "ja": "局所的に裏付けられたシミュレーション"
  },
  "simulation_point_help": {
    "en": "Simulated historical point, not a measured player location",
    "zh-TW": "歷史模擬點，非玩家實測位置",
    "zh-CN": "历史模拟点，非玩家实测位置",
    "ja": "履歴の模擬点。実測位置ではありません"
  },
  "simulation_distance_average": {
    "en": "Selected simulated connection: {d} m · average {v} km/h",
    "zh-TW": "選定模擬連線：{d} m · 平均 {v} km/h",
    "zh-CN": "选定模拟连线：{d} m · 平均 {v} km/h",
    "ja": "選択した模擬接続: {d} m · 平均 {v} km/h"
  },
  "whole_simulation": {
    "en": "Whole activity simulation: {d} m · average {v} km/h",
    "zh-TW": "整段活動模擬：{d} m · 平均 {v} km/h",
    "zh-CN": "整段活动模拟：{d} m · 平均 {v} km/h",
    "ja": "活動全体の模擬: {d} m · 平均 {v} km/h"
  },
  "simulation_bounds": {
    "en": "Minimum objective bounds {lo}–{hi} m; approximate, not shortest/longest journeys",
    "zh-TW": "最小距離數值界 {lo}–{hi} m；近似，非最短／最長旅程",
    "zh-CN": "最小距离数值界 {lo}–{hi} m；近似，非最短／最长旅程",
    "ja": "最小距離の数値境界 {lo}–{hi} m。近似であり最短／最長旅程ではありません"
  },
  "weighted_reference": {
    "en": "Local time-weighted reference {v} km/h (assumption)",
    "zh-TW": "局部時間加權參考 {v} km/h（假設）",
    "zh-CN": "局部时间加权参考 {v} km/h（假设）",
    "ja": "局所時間加重参照 {v} km/h（仮定）"
  },
  "assumptions_details": {
    "en": "Assumptions and details",
    "zh-TW": "假設與詳細",
    "zh-CN": "假设与详细",
    "ja": "仮定と詳細"
  },
  "terrain_unknown": {
    "en": "Terrain/passability unknown; no road or barrier routing",
    "zh-TW": "地形與通行性未知，未使用道路／障礙路由",
    "zh-CN": "地形与通行性未知，未使用道路／障碍路由",
    "ja": "地形・通行性は不明。道路／障害物ルーティングなし"
  },
  "uniform_interpolation_help": {
    "en": "Uniform straight-edge interpolation is a simulation, not an observed route",
    "zh-TW": "直線等速插值僅為模擬，非觀測路線",
    "zh-CN": "直线等速插值仅为模拟，非观察路线",
    "ja": "直線等速補間は模擬であり観測経路ではありません"
  },
  "source_records": {
    "en": "Source records {n}",
    "zh-TW": "來源紀錄 {n} 筆",
    "zh-CN": "来源记录 {n} 条",
    "ja": "元記録 {n}件"
  },
  "comparison_not_accuracy": {
    "en": "Models stay separate; smaller areas do not prove better accuracy",
    "zh-TW": "模型分開比較，範圍較小不代表較準確",
    "zh-CN": "模型分开比较，范围较小不代表较准确",
    "ja": "モデルを分離比較。小さい領域が高精度を意味しません"
  },
  "insufficient_narrowing_evidence": {
    "en": "Insufficient support to narrow the region",
    "zh-TW": "不足以收緊範圍",
    "zh-CN": "不足以收紧范围",
    "ja": "領域を絞る裏付けが不足"
  },
  "connection_legend": {
    "en": "Thick dashed: interaction locations · thin dashed: coherent simulated positions",
    "zh-TW": "粗虛線：互動位置 · 細虛線：一致模擬位置",
    "zh-CN": "粗虚线：互动位置 · 细虚线：一致模拟位置",
    "ja": "太い破線: 操作地点 · 細い破線: 一貫した模擬位置"
  },
  "shared_history": {
    "en": "Shared area/time history",
    "zh-TW": "共用區域歷史",
    "zh-CN": "共用区域历史",
    "ja": "共用の領域履歴"
  },
  "history_retry_wait": {
    "en": "Waiting to retry",
    "zh-TW": "等待重試",
    "zh-CN": "等待重试",
    "ja": "再試行待ち"
  },
  "history_retry_after": {
    "en": "Retry eligible in about {n}s",
    "zh-TW": "約 {n} 秒後可重試",
    "zh-CN": "约 {n} 秒后可重试",
    "ja": "約 {n} 秒後に再試行可能"
  },
  "history_pages": {
    "en": "Read {n} pages",
    "zh-TW": "已讀 {n} 頁",
    "zh-CN": "已读 {n} 页",
    "ja": "{n} ページ読込済み"
  },
  "shared_history_detail": {
    "en": "Returned {returned} · new {accepted} · visible {visible}",
    "zh-TW": "返回 {returned} 筆 · 新增 {accepted} 筆 · 可見 {visible} 筆",
    "zh-CN": "返回 {returned} 条 · 新增 {accepted} 条 · 可见 {visible} 条",
    "ja": "受信 {returned} · 新規 {accepted} · 表示 {visible}"
  },
  "this_player_visible": {
    "en": "Visible for this player",
    "zh-TW": "此玩家可見筆數",
    "zh-CN": "此玩家可见条数",
    "ja": "このプレイヤーの表示件数"
  },
  "current_filter_visible": {
    "en": "Current filtered count",
    "zh-TW": "目前篩選可見筆數",
    "zh-CN": "目前筛选可见条数",
    "ja": "現在のフィルター表示件数"
  },
  "history_no_wait_reason": {
    "en": "No wait reason recorded",
    "zh-TW": "未記錄等待原因",
    "zh-CN": "未记录等待原因",
    "ja": "待機理由の記録なし"
  },
  "last_failure": {
    "en": "Last failure",
    "zh-TW": "上次失敗",
    "zh-CN": "上次失败",
    "ja": "直近の失敗"
  },
  "http_status_unavailable": {
    "en": "HTTP status unavailable",
    "zh-TW": "HTTP 狀態不可用",
    "zh-CN": "HTTP 状态不可用",
    "ja": "HTTP状態不明"
  },
  "next_eligible_retry": {
    "en": "Next eligible retry",
    "zh-TW": "下次可重試",
    "zh-CN": "下次可重试",
    "ja": "次の再試行可能時刻"
  },
  "history_cursor": {
    "en": "History cursor",
    "zh-TW": "歷史游標",
    "zh-CN": "历史游标",
    "ja": "履歴カーソル"
  },
  "zero_pages_not_no_events": {
    "en": "Zero pages does not prove an empty server history",
    "zh-TW": "0 頁不代表伺服器沒有歷史活動",
    "zh-CN": "0 页不代表服务器没有历史活动",
    "ja": "0ページはサーバー履歴が空である証拠ではありません"
  },
  "historical_reason_useful": {
    "en": "Supported local constraints",
    "zh-TW": "局部限制有足夠支持",
    "zh-CN": "局部限制有足够支持",
    "ja": "局所制約に十分な裏付け"
  },
  "historical_reason_missing-reference": {
    "en": "Missing local references",
    "zh-TW": "缺少局部參考",
    "zh-CN": "缺少局部参考",
    "ja": "局所参照不足"
  },
  "historical_reason_incompatible-references": {
    "en": "Local references disagree",
    "zh-TW": "局部參考不相容",
    "zh-CN": "局部参考不相容",
    "ja": "局所参照が不整合"
  },
  "historical_reason_high-speed": {
    "en": "High local reference speed",
    "zh-TW": "局部參考速度過高",
    "zh-CN": "局部参考速度过高",
    "ja": "局所参照速度が高すぎる"
  },
  "historical_reason_high-speed-reference": {
    "en": "Nearby reference is too fast",
    "zh-TW": "附近參考速度過高",
    "zh-CN": "附近参考速度过高",
    "ja": "近傍参照速度が高すぎる"
  },
  "historical_reason_sparse-support": {
    "en": "Events too widely spaced in time",
    "zh-TW": "事件時間間隔過疏",
    "zh-CN": "事件时间间隔过疏",
    "ja": "イベント間隔が広すぎる"
  },
  "historical_reason_distant-support": {
    "en": "Interaction locations too distant",
    "zh-TW": "互動位置距離過遠",
    "zh-CN": "互动位置距离过远",
    "ja": "操作地点が遠すぎる"
  },
  "historical_reason_broad-region": {
    "en": "Result region is too broad",
    "zh-TW": "結果區域過大",
    "zh-CN": "结果区域过大",
    "ja": "結果領域が広すぎる"
  },
  "historical_reason_weak-support": {
    "en": "Weak historical support",
    "zh-TW": "歷史支持不足",
    "zh-CN": "历史支持不足",
    "ja": "履歴の裏付けが不足"
  },
  "historical_reason_outside-supported-time": {
    "en": "Outside supported historical time",
    "zh-TW": "超出支持的歷史時段",
    "zh-CN": "超出支持的历史时段",
    "ja": "裏付け時刻範囲外"
  },
  "historical_reason_insufficient-context": {
    "en": "Insufficient context",
    "zh-TW": "上下文不足",
    "zh-CN": "上下文不足",
    "ja": "文脈不足"
  },
  "historical_reason_source-conflict": {
    "en": "Conflicting raw source records",
    "zh-TW": "原始來源矛盾",
    "zh-CN": "原始来源矛盾",
    "ja": "元記録の矛盾"
  },
  "historical_reason_pending": {
    "en": "Calculation pending",
    "zh-TW": "計算等待中",
    "zh-CN": "计算等待中",
    "ja": "計算待ち"
  },
  "historical_reason_worker-error": {
    "en": "Calculation failed",
    "zh-TW": "計算失敗",
    "zh-CN": "计算失败",
    "ja": "計算失敗"
  },
  "historical_reason_witness-reference-budget-unverified": {
    "en": "Witness not validated under reference budget",
    "zh-TW": "此見證未通過參考預算核對",
    "zh-CN": "此见证未通过参考预算核对",
    "ja": "参照予算で経路未検証"
  },
  "historical_reason_empty-conditional-region": {
    "en": "Conditional constraints do not overlap",
    "zh-TW": "條件限制無交集",
    "zh-CN": "条件限制无交集",
    "ja": "条件制約の共通部分なし"
  },
  "historical_reason_unsupported-intermediate": {
    "en": "Intermediate time unsupported",
    "zh-TW": "中間時刻缺少支持",
    "zh-CN": "中间时刻缺少支持",
    "ja": "中間時刻の裏付けなし"
  },
  "historical_reason_stale-reference": {
    "en": "Local reference expired",
    "zh-TW": "局部參考過期",
    "zh-CN": "局部参考过期",
    "ja": "局所参照期限切れ"
  },
  "historical_reason_state-limit": {
    "en": "Calculation state budget reached",
    "zh-TW": "計算狀態數量達上限",
    "zh-CN": "计算状态数量达上限",
    "ja": "計算状態数上限"
  },
  "historical_reason_joint-optimization-incomplete": {
    "en": "Joint optimization incomplete",
    "zh-TW": "聯合求解未完成",
    "zh-CN": "联合求解未完成",
    "ja": "同時最適化未完了"
  },
  "failure_reason_transport-error": {
    "en": "Transport error",
    "zh-TW": "傳輸錯誤",
    "zh-CN": "传输错误",
    "ja": "通信エラー"
  },
  "failure_reason_timeout": {
    "en": "Request timeout",
    "zh-TW": "請求逾時",
    "zh-CN": "请求超时",
    "ja": "要求タイムアウト"
  },
  "failure_reason_native-complete": {
    "en": "Native request failed",
    "zh-TW": "原生請求失敗",
    "zh-CN": "原生请求失败",
    "ja": "ネイティブ要求失敗"
  },
  "failure_reason_malformed": {
    "en": "Invalid response",
    "zh-TW": "回應格式異常",
    "zh-CN": "响应格式异常",
    "ja": "応答形式異常"
  }
});
  Object.assign(catalog,{"failure_reason_unknown": {"en": "Failure reason unavailable", "zh-TW": "失敗原因不可用", "zh-CN": "失败原因不可用", "ja": "失敗理由不明"}, "historical_reason_selected-branch-unavailable": {"en": "Selected branch unavailable; selection retained", "zh-TW": "選定分支無可用結果，保留選擇", "zh-CN": "选定分支无可用结果，保留选择", "ja": "選択分岐は利用不可。選択を保持"}});
  Object.assign(catalog,{"historical_reason_worker-unavailable": {"en": "Worker unavailable; no position fallback", "zh-TW": "運算不可用，不回退為 Portal 位置", "zh-CN": "运算不可用，不回退为 Portal 位置", "ja": "計算不可。ポータル位置への代替なし"}, "historical_reason_no-input": {"en": "No eligible source records", "zh-TW": "沒有合格來源紀錄", "zh-CN": "没有合格来源记录", "ja": "有効な元記録なし"}, "scenario_availability": {"en": "Interaction baseline: {base} · attack assumption: {xmp}", "zh-TW": "互動基線：{base} · 攻擊假設：{xmp}", "zh-CN": "互动基线：{base} · 攻击假设：{xmp}", "ja": "操作基準: {base} · 攻撃仮定: {xmp}"}});
  Object.assign(catalog,{"historical_inspection_help": {"en": "Choose a time in the player Inference tab; overview/activity stay compact", "zh-TW": "在玩家「推論」頁選擇時刻；總覽與活動頁保持精簡", "zh-CN": "在玩家「推论」页选择时刻；总览与活动页保持精简", "ja": "プレイヤーの推論タブで時刻を選択。概要／活動は簡潔に表示"}, "region_extent": {"en": "Region diameter about {d}m · {n} components", "zh-TW": "區域直徑約 {d} m · {n} 個部分", "zh-CN": "区域直径约 {d} m · {n} 个部分", "ja": "領域直径 約 {d} m · {n} 成分"}});
  Object.assign(catalog,{"reference_witness_help": {"en": "A jointly feasible reference-budget witness; no minimum-distance claim", "zh-TW": "符合局部參考預算的聯合可行見證，不宣稱最小距離", "zh-CN": "符合局部参考预算的联合可行见证，不宣称最小距离", "ja": "局所参照予算で同時に実行可能な経路。最小距離の主張なし"}, "historical_reason_pending-reference-witness": {"en": "Reference witness calculation pending", "zh-TW": "參考見證計算中", "zh-CN": "参考见证计算中", "ja": "参照経路を計算中"}, "historical_reason_reference-feasibility-limit": {"en": "Reference feasibility budget exhausted", "zh-TW": "參考可行性計算達限", "zh-CN": "参考可行性计算达限", "ja": "参照実行可能性の計算上限"}, "historical_reason_reference-geographic-witness-unavailable": {"en": "Geographic reference witness not verified", "zh-TW": "地理參考見證未通過核對", "zh-CN": "地理参考见证未通过核对", "ja": "地理参照経路が未検証"}});
  Object.assign(catalog,{"nav_acquisition": {"en": "Activity records", "zh-TW": "活動紀錄", "zh-CN": "活动记录", "ja": "活動記録"}, "nav_download": {"en": "Record download", "zh-TW": "紀錄下載", "zh-CN": "记录下载", "ja": "記録ダウンロード"}, "nav_live": {"en": "Live acquisition", "zh-TW": "即時擷取", "zh-CN": "即时获取", "ja": "リアルタイム取得"}, "nav_history": {"en": "Historical backtracking", "zh-TW": "歷史回溯", "zh-CN": "历史回溯", "ja": "履歴の遡及"}, "link_object_endpoints": {"en": "Object endpoints; no player direction", "zh-TW": "物件兩端；非玩家互動方向", "zh-CN": "物件两端；非玩家互动方向", "ja": "オブジェクト両端。プレイヤーの操作方向ではありません"}, "link_direction_unknown": {"en": "Direction unknown", "zh-TW": "方向不明", "zh-CN": "方向不明", "ja": "方向不明"}, "focus_master_off": {"en": "EchoTrace is off; Link focus unavailable", "zh-TW": "EchoTrace 總開關關閉，無法高亮 Link", "zh-CN": "EchoTrace 总开关关闭，无法高亮 Link", "ja": "EchoTrace がオフのため強調不可"}, "focus_geometry_unknown": {"en": "Link geometry unavailable; no guessed endpoints", "zh-TW": "Link 幾何不可用，不猜端點", "zh-CN": "Link 几何不可用，不猜端点", "ja": "Link の形状不明。端点を推測しません"}, "map_interval": {"en": "Current map time interval", "zh-TW": "目前地圖時間範圍", "zh-CN": "目前地图时间范围", "ja": "現在の地図の時間範囲"}, "map_interval_empty": {"en": "No acquired records in the current interval", "zh-TW": "目前範圍尚無已取得紀錄", "zh-CN": "目前范围尚无已取得记录", "ja": "現在の範囲に取得済み記録はありません"}, "map_history_help": {"en": "Read earlier records in the current area. Request bounds are separate from loaded evidence; map interval is at most 24 hours.", "zh-TW": "讀取目前區域較早紀錄；請求邊界不等於已取得證據。地圖區間最多 24 小時。", "zh-CN": "读取目前区域较早记录；请求边界不等于已取得证据。地图区间最多 24 小时。", "ja": "現在の領域の過去の記録を取得。要求境界と取得済み証拠は別です。地図範囲は最大24時間。"}, "map_24h_limit": {"en": "Map interval limit: 24 hours", "zh-TW": "地圖回看上限：24 小時", "zh-CN": "地图回看上限：24 小时", "ja": "地図の範囲上限：24時間"}, "map_hours_migrated": {"en": "Saved lookback exceeded 24 hours and was reduced to 24; stored RAW was retained.", "zh-TW": "原回看設定超過 24 小時，已調整為 24 小時；較早 RAW 仍保留。", "zh-CN": "原回看设定超过 24 小时，已调整为 24 小时；较早 RAW 仍保留。", "ja": "保存された範囲を24時間に調整しました。古いRAWは保持されています。"}, "history_live_paused": {"en": "Historical backtracking: live acquisition paused, upper observation endpoint frozen. Live choice is restored on exit.", "zh-TW": "歷史回溯中：即時擷取已暫停，觀測右端固定；結束後恢復原選擇。", "zh-CN": "历史回溯中：即时获取已暂停，观测右端固定；结束后恢复原选择。", "ja": "履歴取得中：ライブ取得を停止し右端を固定。終了後に元の設定へ復帰。"}, "history_reload_restored": {"en": "Reload: history task paused; previous live choice restored. Resume manually.", "zh-TW": "已重整：歷史任務暫停，原即時選擇已恢復；請手動繼續。", "zh-CN": "已重整：历史任务暂停，原即时选择已恢复；请手动继续。", "ja": "再読込：履歴タスクは停止、ライブ設定は復元。手動で再開してください。"}, "history_elapsed": {"en": "Elapsed {elapsed}", "zh-TW": "已執行 {elapsed}", "zh-CN": "已执行 {elapsed}", "ja": "経過 {elapsed}"}, "backtrack_reason_24h": {"en": "24-hour map boundary reached; older RAW retained", "zh-TW": "已達地圖 24 小時邊界，較早 RAW 仍保留", "zh-CN": "已达地图 24 小时边界，较早 RAW 仍保留", "ja": "地図の24時間境界に到達。古いRAWは保持"}, "backtrack_reason_area": {"en": "Area changed; task paused", "zh-TW": "區域已變更，任務暫停", "zh-CN": "区域已变更，任务暂停", "ja": "領域変更により停止"}, "backtrack_reason_task": {"en": "Switched to archive download", "zh-TW": "已切換至封存下載", "zh-CN": "已切换至封存下载", "ja": "アーカイブ取得へ切替"}, "capture_scope_help": {"en": "Download period · Public all only. A separate archival task with frozen map bounds. Periods over 24 hours do not expand the map or automatically insert downloaded records.", "zh-TW": "下載期間 · 僅公開 all。此為獨立封存任務，範圍於啟動時固定；超過 24 小時不會擴大地圖或自動插入下載紀錄。", "zh-CN": "下载期间 · 仅公开 all。此为独立封存任务，范围于启动时固定；超过 24 小时不会扩大地图或自动插入下载记录。", "ja": "ダウンロード期間 · 公開allのみ。固定領域の独立アーカイブ。24時間超でも地図範囲を拡大せず自動挿入しません。"}, "capture_start": {"en": "Download period: start", "zh-TW": "下載期間：開始", "zh-CN": "下载期间：开始", "ja": "ダウンロード開始"}, "capture_end": {"en": "Download period: end", "zh-TW": "下載期間：結束", "zh-CN": "下载期间：结束", "ja": "ダウンロード終了"}, "capture_delay": {"en": "Request delay (ms, minimum 800)", "zh-TW": "請求間隔（ms，最少 800）", "zh-CN": "请求间隔（ms，最少 800）", "ja": "要求間隔（ms、最小800）"}, "capture_limit": {"en": "Maximum pages (1–500)", "zh-TW": "頁數上限（1–500）", "zh-CN": "页数上限（1–500）", "ja": "最大ページ数（1–500）"}, "capture_start_button": {"en": "Start archive capture", "zh-TW": "開始封存擷取", "zh-CN": "开始封存获取", "ja": "アーカイブ取得開始"}, "capture_cancel": {"en": "Cancel capture", "zh-TW": "取消擷取", "zh-CN": "取消获取", "ja": "取得を中止"}, "capture_download": {"en": "Download RAW log", "zh-TW": "下載 RAW log", "zh-CN": "下载 RAW log", "ja": "RAW logをダウンロード"}, "capture_invalid": {"en": "Invalid download period/options; delay >=800ms, pages 1–500.", "zh-TW": "下載期間或選項無效；間隔至少 800ms，頁數 1–500。", "zh-CN": "下载期间或选项无效；间隔至少 800ms，页数 1–500。", "ja": "期間または設定が無効。間隔800ms以上、1–500ページ。"}, "capture_pages": {"en": "Pages/attempts: {n}", "zh-TW": "頁面／嘗試：{n}", "zh-CN": "页面／尝试：{n}", "ja": "ページ／試行：{n}"}, "capture_duplicates": {"en": "Duplicate occurrences: {n}", "zh-TW": "重複筆數：{n}", "zh-CN": "重复笔数：{n}", "ja": "重複件数：{n}"}, "capture_provenance": {"en": "Adapted from COMM Capture 0.1.0-dev.2 preview. Full responses, duplicates and unknown fields remain in RAW. Cancelled/partial output is downloadable; completion describes the request, not complete server history. Uses shared pacing/backoff.", "zh-TW": "移植自 COMM Capture 0.1.0-dev.2 開發預覽。RAW 保留完整回應、重複及未知欄位；取消／部分結果仍可下載。完成僅指請求條件，不保證伺服器歷史完整；沿用共用排程與退避。", "zh-CN": "移植自 COMM Capture 0.1.0-dev.2 开发预览。RAW 保留完整响应、重复及未知字段；取消／部分结果仍可下载。完成仅指请求条件，不保证服务器历史完整；沿用共用排程与退避。", "ja": "COMM Capture開発版から移植。完全な応答、重複、未知フィールドを保持。中止／部分結果も保存可能。完了はサーバー履歴の完全性を保証しません。共通調整とバックオフを使用。"}, "capture_state_idle": {"en": "Ready", "zh-TW": "待命", "zh-CN": "待命", "ja": "準備完了"}, "capture_state_running": {"en": "Capturing", "zh-TW": "擷取中", "zh-CN": "获取中", "ja": "取得中"}, "capture_state_complete": {"en": "Requested boundary reached", "zh-TW": "已達請求邊界", "zh-CN": "已达请求边界", "ja": "要求境界に到達"}, "capture_state_partial": {"en": "Partial", "zh-TW": "部分完成", "zh-CN": "部分完成", "ja": "部分完了"}, "capture_state_cancelled": {"en": "Cancelled; partial output retained", "zh-TW": "已取消，保留部分結果", "zh-CN": "已取消，保留部分结果", "ja": "中止。部分結果を保持"}, "capture_state_failed": {"en": "Failed; available RAW retained", "zh-TW": "失敗，保留已取得 RAW", "zh-CN": "失败，保留已取得 RAW", "ja": "失敗。取得済みRAWを保持"}});
  Object.assign(catalog,{"capture_reason_reached-start-time": {"en": "Requested start reached", "zh-TW": "已讀至下載期間起點", "zh-CN": "已读至下载期间起点", "ja": "指定開始時刻に到達"}, "capture_reason_empty-result": {"en": "Server returned no earlier rows", "zh-TW": "伺服器未回傳更早紀錄", "zh-CN": "服务器未返回更早记录", "ja": "以前の記録が返されませんでした"}, "capture_reason_retry": {"en": "Retrying under shared backoff", "zh-TW": "依共用退避重試", "zh-CN": "依共用退避重试", "ja": "共通バックオフで再試行"}, "capture_reason_request-error": {"en": "Request failed", "zh-TW": "請求失敗", "zh-CN": "请求失败", "ja": "要求失敗"}, "capture_reason_invalid-response": {"en": "Unrecognized response; RAW retained", "zh-TW": "回應格式無法辨識，RAW 保留", "zh-CN": "响应格式无法识别，RAW 保留", "ja": "応答形式を認識不可。RAWを保持"}, "capture_reason_invalid-page-cursor": {"en": "Invalid continuation; stopped safely", "zh-TW": "續讀游標無效，已安全停止", "zh-CN": "续读游标无效，已安全停止", "ja": "継続情報が無効。安全に停止"}, "capture_reason_repeated-page-cursor": {"en": "Repeated continuation; stopped", "zh-TW": "續讀游標重複，已停止", "zh-CN": "续读游标重复，已停止", "ja": "継続情報の重複により停止"}, "capture_reason_max-pages-reached": {"en": "Page limit reached", "zh-TW": "已達頁數上限", "zh-CN": "已达页数上限", "ja": "ページ上限に到達"}, "capture_reason_user-cancelled": {"en": "Cancelled by user", "zh-TW": "使用者取消", "zh-CN": "用户取消", "ja": "ユーザーが中止"}, "capture_reason_task-switch": {"en": "Switched task", "zh-TW": "已切換任務", "zh-CN": "已切换任务", "ja": "タスク切替"}, "capture_reason_cleared": {"en": "Data cleared", "zh-TW": "資料已清除", "zh-CN": "数据已清除", "ja": "データを消去"}, "capture_reason_master-off": {"en": "EchoTrace turned off", "zh-TW": "EchoTrace 已關閉", "zh-CN": "EchoTrace 已关闭", "ja": "EchoTraceをオフ"}, "capture_reason_disposed": {"en": "Page closed", "zh-TW": "頁面已關閉", "zh-CN": "页面已关闭", "ja": "ページ終了"}, "capture_reason_unexpected-error": {"en": "Unexpected failure; partial RAW retained", "zh-TW": "發生錯誤，保留部分 RAW", "zh-CN": "发生错误，保留部分 RAW", "ja": "エラー。部分RAWを保持"}});
  const locales=['en','zh-TW','zh-CN','ja'];
  function resolve(tags=navigator.languages?.length?navigator.languages:[navigator.language]){
    for(const raw of tags||[]){const tag=String(raw||'').replaceAll('_','-').toLowerCase();
      if(/^zh(?:-|$)/.test(tag)){if(/(?:^|-)hant(?:-|$)/.test(tag))return 'zh-TW';if(/(?:^|-)hans(?:-|$)/.test(tag))return 'zh-CN';if(/(?:^|-)(tw|hk|mo)(?:-|$)/.test(tag))return 'zh-TW';return 'zh-CN';}
      if(/^ja(?:-|$)/.test(tag))return 'ja';if(/^en(?:-|$)/.test(tag))return 'en';
    }return 'en';
  }
  function locale(){const p=preference();return p==='auto'?resolve():locales.includes(p)?p:'en';}
  function t(key,args={}){const row=catalog[key],text=row?.[locale()]??row?.en??key;return text.replace(/\{([a-zA-Z0-9_]+)\}/g,(_,name)=>Object.hasOwn(args,name)?String(args[name]):'{'+name+'}');}
  const engineKeys=new Map(Object.entries(catalog).map(([key,row])=>[row['zh-TW'],key]));
  function status(value){if(value===undefined||value===null)return '';const text=String(value),key=engineKeys.get(text);return key?t(key):text;}
  return {t,status,locale,resolve,catalog};
}

/* Same-origin cooperative plugin transport. No credentials; payloads are transient.
   Web Locks serialize ownership; an uncertainty fence survives owner loss. MIT. */
function createTrackerCoordination(env={}) {
  const win=env.window||window, now=env.now||(()=>Date.now()), sleep=ms=>new Promise(r=>win.setTimeout(r,ms));
  const id=env.id||win.crypto?.randomUUID?.()||Math.random().toString(36).slice(2), jobs=new Map(), running=new Map(), peers=new Map();
  const identity=()=>String(env.identity?.()||'').trim().toLowerCase(), hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16)+'-'+s.length;};
  const channel=typeof win.BroadcastChannel==='function'?new win.BroadcastChannel('iitc-player-tracker-coordination-v114'):null;
  const mode=win.navigator?.locks?.request&&channel?'web-locks':'single-tab';let disposed=false, sequence=0, lastIdentity=identity(), guardView={}, leaseDB=null, nativeErrors=new Map(),peerBudgets=new Map(),lastAnnounce=0;
  const LIMIT=2*1024*1024, UNCERTAINTY=35000, FAILURE_WINDOW=600000, CONSECUTIVE=6, ACCUMULATED=12;
  const allowed=['minLatE6','minLngE6','maxLatE6','maxLngE6','tab','minTimestampMs','maxTimestampMs','plextContinuationGuid','ascendingTimestampOrder'];
  function params(p){if(!p||p.tab!=='all'||Object.keys(p).some(k=>!allowed.includes(k)))return null;const q={};for(const k of allowed)if(k in p)q[k]=p[k];for(const k of ['minLatE6','minLngE6','maxLatE6','maxLngE6','minTimestampMs','maxTimestampMs'])if(!Number.isSafeInteger(q[k]))return null;if(Math.abs(q.minLatE6)>90000000||Math.abs(q.maxLatE6)>90000000||Math.abs(q.minLngE6)>180000000||Math.abs(q.maxLngE6)>180000000)return null;if(q.plextContinuationGuid!==undefined&&(typeof q.plextContinuationGuid!=='string'||q.plextContinuationGuid.length>2048))return null;return q;}
  const cleanBudget=b=>({enabled:b?.enabled===true,burstMs:Math.max(500,Math.min(3600000,Number(b?.burstMs)||30000)),burstPages:Math.max(1,Math.min(10000,Number(b?.burstPages)||30)),windowMs:Math.max(1000,Math.min(86400000,Number(b?.windowMs)||60000)),requests:Math.max(1,Math.min(10000,Number(b?.requests)||60)),cooldownMs:Math.max(500,Math.min(86400000,Number(b?.cooldownMs)||30000))});
  function validMessage(m){try{return m&&m.v===114&&typeof m.type==='string'&&typeof m.sender==='string'&&m.sender.length<=128&&JSON.stringify(m).length<=LIMIT;}catch(_){return false;}}
  function post(type,data={}){if(!disposed)channel?.postMessage({v:114,type,sender:id,...data});}
  function key(j){const p={...j.params};if(j.liveHead)delete p.maxTimestampMs;return JSON.stringify([j.account,j.generation,j.purpose,!!j.liveHead,Object.keys(p).sort().map(k=>[k,p[k]])]);}
  function matches(j,m){return j.key===m.key&&j.account===m.account&&j.generation===m.generation&&(!j.liveHead||m.params?.maxTimestampMs>=j.boundary);}
  function update(g,reason){guardView={...g,mode,reason};env.change?.(snapshot());}
  function snapshot(){return {mode,waiting:jobs.size,owner:[...running.keys()],uncertainUntil:guardView.until||0,cooldown:guardView.cooldown||0,auth:!!guardView.auth,circuitUntil:guardView.circuitUntil||0,nextAttempt:Math.max(guardView.until||0,guardView.cooldown||0,guardView.circuitUntil||0,guardView.budgetUntil||0,guardView.nextAttempt||0),reason:guardView.reason||'',limits:{consecutive:CONSECUTIVE,accumulated:ACCUMULATED,windowMs:FAILURE_WINDOW}};}
  const guardKey=account=>'iitc-player-tracker-coordination-control-'+hash(account);
  function cleanGuard(raw){const g={};if(!raw||typeof raw!=='object')return g;for(const k of ['until','cooldown','circuitUntil','budgetUntil','lastStart','fastStart','fastPages','consecutive','nextAttempt'])if(Number.isFinite(raw[k])&&raw[k]>=0)g[k]=raw[k];g.auth=raw.auth===true;g.reason=typeof raw.reason==='string'?raw.reason.slice(0,200):'';for(const k of ['failureTimes','starts'])g[k]=Array.isArray(raw[k])?raw[k].filter(t=>Number.isFinite(t)&&t>=0).slice(k==='starts'?-10000:-128):[];g.errorIds=Array.isArray(raw.errorIds)?raw.errorIds.filter(x=>typeof x==='string'&&x.length<=128).slice(-128):[];g.budgets={};for(const [key,b]of Object.entries(raw.budgets||{}).slice(0,100))if(key.length<=128&&Number.isFinite(b?.expires))g.budgets[key]={...cleanBudget(b),expires:b.expires};return g;}
  function read(account){try{return cleanGuard(JSON.parse(win.localStorage.getItem(guardKey(account))||'{}'));}catch(_){return {};}}
  function write(account,g){win.localStorage.setItem(guardKey(account),JSON.stringify(g));update(g,g.reason);post('control',{account,guard:g});}
  async function lease(){if(leaseDB)return leaseDB;leaseDB=await new Promise((resolve,reject)=>{const q=win.indexedDB.open('iitc-player-tracker-coordination-v114',1);q.onupgradeneeded=()=>q.result.createObjectStore('leases');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});return leaseDB;}
  async function fallbackClaim(account,deadline){const db=await lease();return new Promise((resolve,reject)=>{let granted=false;const tx=db.transaction(['leases'],'readwrite'),s=tx.objectStore('leases'),q=s.get(hash(account));q.onsuccess=()=>{const old=q.result;if(!old||old.id===id||old.until<=now()){s.put({id,until:deadline},hash(account));granted=true;}};tx.oncomplete=()=>resolve(granted);tx.onabort=()=>reject(tx.error);});}
  async function atomic(j,fn){if(mode==='web-locks')return win.navigator.locks.request('iitc-player-tracker-network-'+hash(j.account),{signal:j.controller.signal},fn);if(!await fallbackClaim(j.account,now()+UNCERTAINTY)){if(j.id)settle(j,null,{kind:'single-tab',retryAfterMs:UNCERTAINTY,text:'單分頁擷取模式；等待其他頁面釋放'});else throw Error('單分頁擷取模式；等待其他頁面釋放');return;}return fn();}
  function settle(j,data,error){if(j.done)return;j.done=true;j.controller.abort();jobs.delete(j.id);if(j.cancelled)return;if(error)j.fail(error);else j.ok(data);}
  if(channel)channel.onmessage=ev=>{const m=ev.data;if(!validMessage(m)||m.sender===id)return;
    if(m.type==='epoch'&&Number.isSafeInteger(m.generation)&&m.generation>=0){env.epoch?.(m.generation);return;}
    if(m.account!==identity())return;
    if(m.type==='hello'){announce(false);return;}
    if(m.type==='budget'&&Number.isFinite(m.expires)&&m.expires<=now()+125000){peerBudgets.set(m.sender,{...cleanBudget(m.budget),expires:m.expires});return;}
    if(m.type==='control'&&m.guard&&typeof m.guard==='object'){update(cleanGuard(m.guard),m.guard.reason||'共用排程');return;}
    if(m.type==='native'&&Number.isFinite(m.until)&&m.until<=now()+UNCERTAINTY+5000){if(m.until>now())peers.set(m.sender,m.until);else peers.delete(m.sender);return;}
    if(m.type==='native-failure'&&typeof m.requestId==='string'&&m.requestId.length<=128&&Number.isSafeInteger(m.error?.status)&&Number.isFinite(m.error?.retryAfterMs)){nativeErrors.set(m.requestId,m.error);return;}
    if((m.type==='result'||m.type==='native-result')&&typeof m.key==='string'&&m.key.length<20000&&params(m.params)&&Number.isSafeInteger(m.generation)){
      if(m.data&&(!Array.isArray(m.data.result)||m.data.result.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||r[0].length>2048||!Number.isSafeInteger(r[1]))))return;
      for(const j of jobs.values())if(matches(j,m)&&!running.has(j.id)){j.onDispatch?.(m.params);settle(j,m.data,m.error);}
    }
  };
  function failureGuard(account,g,e){g.failureTimes=(g.failureTimes||[]).filter(t=>Number.isFinite(t)&&t>now()-FAILURE_WINDOW);g.failureTimes.push(now());g.failureTimes=g.failureTimes.slice(-128);g.consecutive=(g.consecutive||0)+1;const retry=Number.isFinite(e.retryAfterMs)&&e.retryAfterMs>=0&&e.retryAfterMs<8640000000000000-now()?e.retryAfterMs:0;g.cooldown=Math.max(g.cooldown||0,now()+Math.max(retry,Math.min(600000,5000*2**Math.min(g.consecutive-1,7))));if(e.status===401||e.status===403||e.kind==='authentication')g.auth=true;if(g.consecutive>=CONSECUTIVE||g.failureTimes.length>=ACCUMULATED)g.circuitUntil=Math.max(g.circuitUntil||0,now()+FAILURE_WINDOW);g.reason=g.auth?'登入／驗證受阻；需明確恢復':g.circuitUntil>now()?'失敗過多；暫停擷取':'共用錯誤退避';write(account,g);}
  function budgetWait(g,b,tier){g.budgets=g.budgets||{};for(const [key,value]of peerBudgets){if(value.expires<=now()){peerBudgets.delete(key);delete g.budgets[key];}else if(value.enabled)g.budgets[key]=value;else delete g.budgets[key];}if(b.enabled)g.budgets[id]={...b,expires:now()+120000};else delete g.budgets[id];for(const key of Object.keys(g.budgets))if(g.budgets[key].expires<=now())delete g.budgets[key];const options=Object.values(g.budgets);if(!options.length){g.budget=null;g.budgetUntil=0;g.starts=[];g.fastStart=0;g.fastPages=0;return 0;}g.budget=options.reduce((a,b)=>({enabled:true,burstMs:Math.min(a.burstMs,b.burstMs),burstPages:Math.min(a.burstPages,b.burstPages),windowMs:Math.max(a.windowMs,b.windowMs),requests:Math.min(a.requests,b.requests),cooldownMs:Math.max(a.cooldownMs,b.cooldownMs)}));b=g.budget;if(tier>1000){g.fastStart=0;g.fastPages=0;}g.starts=(g.starts||[]).filter(t=>t>now()-b.windowMs).slice(-10000);if(g.budgetUntil>0&&g.budgetUntil<=now()){g.budgetUntil=0;g.fastStart=0;g.fastPages=0;}if(g.starts.length>=b.requests&&!g.budgetUntil)g.budgetUntil=Math.max(g.starts[g.starts.length-b.requests]+b.windowMs,now()+b.cooldownMs);if(!g.budgetUntil&&g.fastStart&&(now()-g.fastStart>=b.burstMs||g.fastPages>=b.burstPages))g.budgetUntil=Math.max(g.budgetUntil||0,now()+b.cooldownMs);return g.budgetUntil||0;}
  function applyNativeErrors(account,g){for(const [key,e]of nativeErrors){if(!(g.errorIds||[]).includes(key)){g.errorIds=(g.errorIds||[]).concat(key).slice(-128);failureGuard(account,g,e);}nativeErrors.delete(key);}}
  function nativeResult(p,data,error,meta={}){const account=identity(),q=params(p);if(!q||meta.generation!==env.generation?.()||meta.account!==account)return;const requestId=id+':native:'+ (++sequence);if(data?.error)error={status:/auth|login|captcha|challenge|permission/i.test(JSON.stringify(data.error))?403:0,kind:'native-response'};if(error){const e={status:Number.isSafeInteger(error.status)?error.status:0,retryAfterMs:Math.max(0,Number(error.retryAfterMs)||0),kind:error.kind||'native'};nativeErrors.set(requestId,e);post('native-failure',{account,requestId,error:e});atomic({account,controller:new AbortController()},()=>{const g=read(account);applyNativeErrors(account,g);}).catch(()=>{});return;}
    if(!Array.isArray(data?.result)||data.result.length>50||data.result.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!Number.isSafeInteger(r[1]))||JSON.stringify(data).length>LIMIT){nativeResult(p,null,{status:0,kind:'malformed'},meta);return;}
    const live=q.maxTimestampMs===-1;if(live)q.maxTimestampMs=meta.startedAt;const descriptor={params:q,account,generation:meta.generation,purpose:q.plextContinuationGuid?'history':'head',liveHead:live};const m={account,params:q,generation:meta.generation,key:key(descriptor),data,requestId};for(const j of jobs.values())if(matches(j,m)&&!running.has(j.id)){j.onDispatch?.(q);settle(j,data,null);}post('native-result',m);
  }
  async function own(j){await sleep(25);if(j.done||j.cancelled||disposed)return;
    await atomic(j,async()=>{if(j.done||j.cancelled||disposed)return;await sleep(25);if(j.done||j.cancelled||disposed)return;
      if(env.paused?.()){settle(j,null,{kind:'paused',text:'頁面暫停；尚未發送'});return;}let g=read(j.account);
      if(g.auth){settle(j,null,{status:403,kind:'authentication',text:'登入／驗證受阻；需明確恢復'});return;}
      if(g.circuitUntil&&g.circuitUntil<=now()){g.consecutive=0;g.circuitUntil=0;}
      while(!j.done&&!j.cancelled&&!disposed){
        if(env.paused?.()){settle(j,null,{kind:'paused',text:'頁面暫停；尚未發送'});return;}applyNativeErrors(j.account,g);if(g.auth){settle(j,null,{status:403,kind:'authentication'});return;}const b=cleanBudget(env.budget?.()),nativeUntil=Math.max(0,...[...peers.values()].filter(t=>t>now()));const due=Math.max(g.until||0,g.cooldown||0,g.circuitUntil||0,budgetWait(g,b,j.tier),nativeUntil,(g.lastStart||0)+(Number(j.tier)||0));
        if(due<=now())break;g.nextAttempt=due;g.reason=g.until>now()?'前次請求狀態未確認；等待接管':g.circuitUntil>now()?'失敗過多；暫停擷取':g.cooldown>now()?'共用錯誤退避':g.budgetUntil>now()?'共用負載預算等待':nativeUntil>now()?'等待原生 COMM':'共用檔位間隔';write(j.account,g);update({...g,nextAttempt:due},g.reason);await sleep(Math.min(1000,due-now()));g=read(j.account);if(g.auth){settle(j,null,{status:403,kind:'authentication'});return;}
      }
      if(j.done||j.cancelled||disposed)return;if(env.paused?.()){settle(j,null,{kind:'paused',text:'頁面暫停；尚未發送'});return;}if(j.account!==identity()||j.generation!==env.generation?.()){settle(j,null,{kind:'superseded',text:'帳號／資料世代已變更'});return;}
      if(j.liveHead)j.params.maxTimestampMs=now();j.onDispatch?.(j.params);g.until=now()+UNCERTAINTY;g.lastStart=now();g.reason='共用請求進行中';const b=cleanBudget(env.budget?.());if(b.enabled||g.budget?.enabled){g.starts=(g.starts||[]).concat(now()).slice(-10000);if(j.tier<=1000){g.fastStart=g.fastStart||now();g.fastPages=(g.fastPages||0)+1;}}write(j.account,g);post('start',{account:j.account,key:j.key,params:j.params,generation:j.generation,until:g.until});running.set(j.id,j);j.idle=new Promise(resolve=>j.idleResolve=resolve);try{
      let finish;const completed=new Promise(r=>finish=r);let finished=false,deadline;
      const done=(data,error)=>{if(finished)return;finished=true;win.clearTimeout(deadline);finish({data,error});};j.finish=done;
      deadline=win.setTimeout(()=>{try{j.handle?.abort?.();}catch(_){}if(!finished)done(null,{kind:'timeout',status:0,uncertain:true});},30000);
      try{j.handle=env.transport(j.params,data=>{j.onRawResponse?.(data);if(data?.error){done(null,{status:/auth|login|captcha|challenge|permission/i.test(JSON.stringify(data.error))?403:0,kind:'response'});return;}if(!Array.isArray(data?.result)||(j.purpose!=='backtrack'&&(data.result.length>50||data.result.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!r[0]||r[0].length>2048||!Number.isSafeInteger(r[1]))))||JSON.stringify(data).length>LIMIT){const auth=/auth|login|captcha|challenge|permission/i.test(String(typeof data==='string'?data:data?.error||data?.message||''));done(null,{status:auth?403:0,kind:auth?'authentication':'malformed'});}else done(data,null);},error=>done(null,error||{status:0}));}catch(e){done(null,{status:0,kind:'dispatch',message:e.message});}
      const result=await completed;if(j.account!==identity()){settle(j,null,{status:403,kind:'authentication',text:'登入帳號已變更；請明確恢復擷取'});j.cancelled=true;}
      if(result.error?.uncertain){j.uncertainUntil=g.until;g.reason='前次請求狀態未確認；等待安全接管';write(j.account,g);while(g.until>now())await sleep(Math.min(1000,g.until-now()));}
      g=read(j.account);g.until=0;g.nextAttempt=0;if(result.error&&!j.cancelled)failureGuard(j.account,g,result.error);else{if(!j.cancelled)g.consecutive=0;g.reason='共用請求已完成';write(j.account,g);}
      if(!j.cancelled&&!disposed){post('result',{account:j.account,key:j.key,params:j.params,generation:j.generation,data:result.data,error:result.error,requestId:j.id});settle(j,result.data,result.error);}
      }finally{while(j.uncertainUntil>now())await sleep(Math.min(1000,j.uncertainUntil-now()));running.delete(j.id);j.idleResolve?.();update(g,g.reason);}
    });
  }
  function submit(p,ok,fail,meta={}){announce();const account=identity();if(!account){fail({kind:'identity',text:'登入帳號未知；擷取暫停'});return {abort(){return true;}};}if(lastIdentity!==account){stop();lastIdentity=account;}
    const q=params(p);if(!q){fail({kind:'malformed'});return {abort(){return true;}};}
    const j={id:id+':'+(++sequence),params:q,account,purpose:meta.purpose||'head',liveHead:!!meta.liveHead,boundary:meta.boundary||q.maxTimestampMs,generation:meta.generation??env.generation?.()??0,tier:meta.tier||500,ok,fail,onDispatch:meta.onDispatch,onRawResponse:meta.onRawResponse,controller:new AbortController(),done:false,cancelled:false};j.key=key(j);jobs.set(j.id,j);own(j).catch(e=>{if(e.name!=='AbortError')settle(j,null,{status:0,kind:'coordination',message:e.message});});
    return {abort(){if(j.done)return true;j.cancelled=true;j.controller.abort();jobs.delete(j.id);if(!running.has(j.id))return true;try{const confirmed=j.handle?.abort?.();if(confirmed===true){j.finish(null,{kind:'cancelled',status:0});return true;}}catch(_){}return false;}};
  }
  function announce(hello=true){lastAnnounce=now();if(hello)post('hello',{account:identity()});post('budget',{account:identity(),budget:cleanBudget(env.budget?.()),expires:now()+120000});}
  function stop(reason){for(const j of jobs.values()){j.cancelled=true;j.controller.abort();if(reason&&!j.done){j.done=true;j.fail(reason);}if(running.has(j.id)){try{if(j.handle?.abort?.()===true)j.finish(null,{kind:'cancelled'});}catch(_){}}}jobs.clear();}
  async function recover(){const account=identity();const j={account,controller:new AbortController()};await atomic(j,()=>{const g=read(account);g.auth=false;g.circuitUntil=0;g.consecutive=0;g.failureTimes=[];g.reason='已明確恢復；既有等待仍適用';write(account,g);});}
  announce();return {submit,snapshot,stop,recover,nativeResult,announce,whenTransportIdle:()=>Promise.all([...running.values()].map(j=>j.idle)),checkIdentity(){if(now()-lastAnnounce>=30000)announce();const current=identity();if(current!==lastIdentity){stop({status:403,kind:'authentication',text:'登入帳號已變更；需明確恢復擷取'});lastIdentity=current;}},native:(active)=>{if(active)peers.set(id,now()+UNCERTAINTY);else peers.delete(id);post('native',{account:identity(),until:active?now()+UNCERTAINTY:0});},epoch:g=>post('epoch',{generation:g}),dispose(){stop();disposed=true;channel?.close();leaseDB?.close();}};
}

/* Transactional activity/scope policy and generation fencing. Same database identity.
   UI preferences and minimal coordination counters are outside activity storage. MIT. */
function createTrackerStorage(env){
 const win=env.window||window, core=env.core, name=env.name||'iitc-player-tracker-chatgpt-v1';let db=null,generation=0,policy=0,serial=Promise.resolve(),ready=null;const active=new Set();
 const scopes=new Map(), savedScopes=new Set();
 function cleanScope(s){if(!s||typeof s!=='object')return null;const n={};if(s.bounds&&['minLatE6','minLngE6','maxLatE6','maxLngE6'].every(k=>Number.isSafeInteger(s.bounds[k])))n.bounds=Object.fromEntries(['minLatE6','minLngE6','maxLatE6','maxLngE6'].map(k=>[k,s.bounds[k]]));for(const k of ['upper','lower','generation','dataGeneration','receivedAt','historyRetryAt'])if(Number.isSafeInteger(s[k]))n[k]=s[k];for(const k of ['intent','source','state','requestId'])if(typeof s[k]==='string')n[k]=s[k].slice(0,200);n.live=s.live===true;n.stale=s.stale===true;n.complete=s.complete===true;n.coverage=s.coverage==='query-boundary'?'query-boundary':'unknown';n.ids=Array.isArray(s.ids)?[...new Set(s.ids.filter(x=>typeof x==='string'&&x.length<=2048))]:[];if(s.cursor&&Number.isSafeInteger(s.cursor.time)&&typeof s.cursor.guid==='string')n.cursor={time:s.cursor.time,guid:s.cursor.guid.slice(0,2048)};if(s.checkpoint&&Number.isSafeInteger(s.checkpoint.time)&&Array.isArray(s.checkpoint.ids))n.checkpoint={time:s.checkpoint.time,ids:s.checkpoint.ids.filter(x=>typeof x==='string'&&x.length<=2048),upper:Number.isSafeInteger(s.checkpoint.upper)?s.checkpoint.upper:n.upper};if(s.query&&typeof s.query==='object'){n.query={};for(const k of ['minTimestampMs','maxTimestampMs'])if(Number.isSafeInteger(s.query[k]))n.query[k]=s.query[k];if(typeof s.query.plextContinuationGuid==='string')n.query.plextContinuationGuid=s.query.plextContinuationGuid.slice(0,2048);if(typeof s.query.ascendingTimestampOrder==='boolean')n.query.ascendingTimestampOrder=s.query.ascendingTimestampOrder;}n.gaps=Array.isArray(s.gaps)?s.gaps.slice(-200).filter(g=>g&&typeof g.state==='string').map(g=>({state:g.state.slice(0,200),kind:typeof g.kind==='string'?g.kind.slice(0,100):'unknown',upper:Number.isSafeInteger(g.upper)?g.upper:null,boundary:Number.isSafeInteger(g.boundary)?g.boundary:null,pages:Number.isSafeInteger(g.pages)?g.pages:0,...(g.cursor&&Number.isSafeInteger(g.cursor.time)&&typeof g.cursor.guid==='string'?{cursor:{time:g.cursor.time,guid:g.cursor.guid.slice(0,2048)}}:{})})):[];n.filtered=s.filtered===true;if(s.observations&&Array.isArray(s.observations))n.observations=s.observations.slice(-200).map(o=>({upper:Number.isSafeInteger(o.upper)?o.upper:null,lower:Number.isSafeInteger(o.lower)?o.lower:null,count:Number.isSafeInteger(o.count)?o.count:0,state:typeof o.state==='string'?o.state.slice(0,100):'unknown'}));n.observationsTruncated=s.observationsTruncated===true;n.requestCount=Number.isSafeInteger(s.requestCount)?s.requestCount:1;n.key=core.stable([n.bounds||null,n.live?'live':n.upper,n.live&&n.intent!=='history'?n.upper-n.lower:n.lower??null,n.intent||'unknown',n.source||'unknown']);return n;}
 function mergeScope(old,n){if(!old)return n;const same=old.upper===n.upper&&old.lower===n.lower;n.ids=[...new Set([...old.ids,...n.ids])];const a=old.observations||[{upper:old.upper,lower:old.lower,count:old.ids.length,state:old.state||'unknown'}],b=n.observations||[{upper:n.upper,lower:n.lower,count:n.ids.length,state:n.state||'unknown'}];n.observations=a.concat(b).slice(-200);n.observationsTruncated=old.observationsTruncated||a.length+b.length>200;n.requestCount=Math.max(old.requestCount||1,n.requestCount||1);n.gaps=[...new Map((old.gaps||[]).concat(n.gaps||[]).map(g=>[core.stable(g),g])).values()].slice(-200);if(old.coverage==='query-boundary'&&same&&!n.historyRetryAt)n.coverage='query-boundary';return n;}
 function addScope(s,saved=false){const n=cleanScope(s);if(!n)return null;const old=scopes.get(n.key),merged=mergeScope(old,n);scopes.set(n.key,merged);if(saved)savedScopes.add(n.key);else savedScopes.delete(n.key);return merged;}
 const allScopes=()=>[...scopes.values()].map(s=>({...s,previouslySaved:savedScopes.has(s.key)}));
 async function open(){if(ready)return ready;ready=new Promise((resolve,reject)=>{const q=win.indexedDB.open(name,2),timer=win.setTimeout(()=>reject(Error('保存空間開啟逾時；請關閉舊分頁後重試')),8000);q.onupgradeneeded=()=>{const d=q.result;for(const [n,k]of [['events','guid'],['conflicts','id'],['scopes','key'],['meta','key']])if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:k});};q.onblocked=()=>env.error?.('保存空間被舊分頁阻擋');q.onerror=()=>{win.clearTimeout(timer);reject(q.error);};q.onsuccess=()=>{win.clearTimeout(timer);db=q.result;db.onversionchange=()=>{db.close();db=null;env.error?.('保存空間版本已變更，請重整');};resolve(db);};});await ready;const data=await read();generation=data.generation;return db;}
 function transaction(stores,fn){return new Promise((resolve,reject)=>{if(!db)return reject(Error('IndexedDB 不可用'));let value;const tx=db.transaction(stores,'readwrite');active.add(tx);tx.oncomplete=()=>{active.delete(tx);resolve(value);};tx.onabort=()=>{active.delete(tx);reject(tx._reason||tx.error||Error('交易已取消'));};tx.onerror=()=>{};try{fn(tx,v=>value=v);}catch(e){tx._reason=e;tx.abort();}});}
 function read(){return new Promise((resolve,reject)=>{if(!db)return reject(Error('IndexedDB 不可用'));const data={records:[],conflicts:[],observationScopes:[],generation:0,change:null};const tx=db.transaction(['events','conflicts','scopes','meta'],'readonly');for(const [name,key]of [['events','records'],['conflicts','conflicts'],['scopes','observationScopes']]){const q=tx.objectStore(name).openCursor();q.onsuccess=()=>{const c=q.result;if(c){data[key].push(c.value);c.continue();}};}const q=tx.objectStore('meta').get('generation');q.onsuccess=()=>{data.generation=q.result?.value||0;data.change=q.result?.change||null;};tx.oncomplete=()=>resolve(data);tx.onabort=()=>reject(tx.error);});}
 function validPolicy(epoch,token){return env.persist()&&epoch===generation&&token===policy;}
 function enqueue(events=[],conflicts=[],scopeEntries=[]){const epoch=generation,token=policy;if(!env.persist()||!events.length&&!conflicts.length&&!scopeEntries.length)return serial;serial=serial.catch(()=>{}).then(async()=>{await open();if(!validPolicy(epoch,token))return;const committed=[],committedConflicts=[],cross=[];await transaction(['events','conflicts','scopes','meta'],tx=>{const meta=tx.objectStore('meta').get('generation');meta.onsuccess=()=>{
   const actual=meta.result?.value||0;if(actual!==epoch){tx._reason=Error('資料世代已變更');tx.abort();generation=actual;env.epoch?.(actual,meta.result?.change);return;}if(!validPolicy(epoch,token)){tx.abort();return;}
   const cap=env.capacity?.()||{},store=tx.objectStore('events');let count=0,bytes=0;
   const apply=()=>{if(!validPolicy(epoch,token)){tx.abort();return;}let additions=0;const old=new Map(),gets=events.map(e=>new Promise(resolve=>{const q=store.get(e.guid);q.onsuccess=()=>{old.set(e.guid,q.result);if(!q.result)additions++;resolve();};q.onerror=()=>resolve();}));Promise.all(gets).then(()=>{
     if(!validPolicy(epoch,token)){tx.abort();return;}const incomingBytes=events.reduce((s,e)=>s+JSON.stringify(e).length*2,0)+conflicts.reduce((s,c)=>s+JSON.stringify(c).length*2,0)+scopeEntries.reduce((s,c)=>s+JSON.stringify(c).length*2,0);
     if(cap.enabled&&((cap.maxRecords>0&&count+additions>cap.maxRecords)||(cap.maxBytes>0&&bytes+incomingBytes+(cap.extraBytes||0)>cap.maxBytes))){tx._reason=Error('保存容量已達上限；資料仍留本頁，請匯出或清除');tx.abort();return;}
     for(const e of events){const previous=old.get(e.guid);if(previous&&(previous.identity!==e.identity||(previous.raw&&e.raw&&core.stable(previous.raw)!==core.stable(e.raw)))){const c={id:e.guid+':'+(e.raw?core.stable(e.raw):e.identity),guid:e.guid,receivedAt:e.receivedAt,original:previous,incoming:e};tx.objectStore('conflicts').put(c);cross.push(c);committedConflicts.push(c.id);}else{if(!previous||!previous.raw&&e.raw)store.put(e);committed.push(e.guid);}}
     for(const c of conflicts){tx.objectStore('conflicts').put(c);committedConflicts.push(c.id);}for(const s of scopeEntries){const cleaned=cleanScope(s);if(cleaned){const st=tx.objectStore('scopes'),q=st.get(cleaned.key);q.onsuccess=()=>{if(validPolicy(epoch,token))st.put(mergeScope(cleanScope(q.result),cleaned));else tx.abort();};}}
   }).catch(e=>{tx._reason=e;try{tx.abort();}catch(_){}});};
   if(cap.enabled){let pending=3;for(const n of ['events','conflicts','scopes']){const q=tx.objectStore(n).openCursor();q.onsuccess=()=>{const c=q.result;if(c){if(n==='events')count++;bytes+=JSON.stringify(c.value).length*2;c.continue();}else if(--pending===0)apply();};}}else apply();
 }});if(validPolicy(epoch,token)){for(const s of scopeEntries)if(s.key)savedScopes.add(s.key);env.saved?.(committed,committedConflicts,cross);} }).catch(e=>{if(token===policy&&epoch===generation)env.error?.(e.message);});return serial;}
 function persistenceChanged(){policy++;if(!env.persist())for(const tx of active){try{tx._reason=Error('保存已關閉');tx.abort();}catch(_){}}}
 async function clear(ids=null){policy++;for(const tx of active){try{tx.abort();}catch(_){}}await serial.catch(()=>{});await open();let result;await transaction(['events','conflicts','scopes','meta'],(tx,set)=>{const q=tx.objectStore('meta').get('generation');q.onsuccess=()=>{const next=(q.result?.value||0)+1;if(!Number.isSafeInteger(next)){tx._reason=Error('資料世代超出範圍');tx.abort();return;}const change=ids?{kind:'prune',ids:[...new Set(ids)],at:Date.now()}:{kind:'clear',at:Date.now()};tx.objectStore('meta').put({key:'generation',value:next,change});if(!ids){for(const n of ['events','conflicts','scopes'])tx.objectStore(n).clear();}else{const removed=new Set(ids);for(const id of removed)tx.objectStore('events').delete(id);for(const n of ['conflicts','scopes']){const c=tx.objectStore(n).openCursor();c.onsuccess=()=>{const v=c.result;if(!v)return;if(n==='conflicts'){if(removed.has(v.value.guid))v.delete();}else{const s=cleanScope(v.value);s.ids=s.ids.filter(id=>!removed.has(id));delete s.checkpoint;delete s.cursor;delete s.gaps;if(s.query)delete s.query.plextContinuationGuid;if(s.ids.length)v.update({...s,complete:false,coverage:'unknown',state:'pruned-partial'});else v.delete();}v.continue();};}}result={generation:next,change};set(result);};});generation=result.generation;resetScopes(result.change);return result;}
 function resetScopes(change){if(change?.kind==='prune'){const ids=new Set(change.ids||[]);for(const [key,s]of scopes){s.ids=s.ids.filter(id=>!ids.has(id));delete s.checkpoint;delete s.cursor;delete s.gaps;if(s.query)delete s.query.plextContinuationGuid;if(!s.ids.length){scopes.delete(key);savedScopes.delete(key);}else{ s.complete=false;s.coverage='unknown';s.state='pruned-partial';}}}else{scopes.clear();savedScopes.clear();}}
 function invalidateHistory(t){const changed=[];for(const [key,s]of scopes)if(s.intent==='history'&&core.stable(s.bounds)===core.stable(t.bounds)&&s.lower<=t.upper&&s.upper>=t.lower){const n={...s,complete:false,coverage:'unknown',state:'retry-requested',historyRetryAt:Date.now()};delete n.cursor;delete n.checkpoint;scopes.set(key,n);savedScopes.delete(key);changed.push(n);}return changed;}
 function adopt(g,change){if(g<=generation)return false;generation=g;policy++;for(const tx of active){try{tx.abort();}catch(_){}}resetScopes(change);return true;}
 function filterScopes(entries,ids,filtered){return entries.map(raw=>{const s=cleanScope(raw);if(!s)return null;s.ids=s.ids.filter(id=>ids.has(id));if(s.checkpoint){s.checkpoint.ids=s.checkpoint.ids.filter(id=>ids.has(id));if(!s.checkpoint.ids.length)delete s.checkpoint;}if(s.cursor&&!ids.has(s.cursor.guid))delete s.cursor;if(filtered){s.filtered=true;s.complete=false;s.coverage='unknown';s.state='filtered-observations';delete s.observations;delete s.gaps;if(s.query?.plextContinuationGuid&&!ids.has(s.query.plextContinuationGuid))delete s.query.plextContinuationGuid;}return s;}).filter(s=>s&&s.ids.length);}
 return {open,read,enqueue,clear,adopt,persistenceChanged,addScope,allScopes,invalidateHistory,cleanScope,filterScopes,generation:()=>generation,resetScopes,whenIdle:()=>serial,dispose:()=>{policy++;for(const tx of active){try{tx.abort();}catch(_){}}db?.close();db=null;}};
}

/* One public-COMM transport. Head checkpoints and history coverage are separate. */
function createTrackerAcquisition(env) {
  const TIERS=[500,800,1000,3000,5000,10000,30000,60000,180000,300000];
  const clock=env.clock||{now:()=>Date.now(),set:(f,t)=>setTimeout(f,t),clear:id=>clearTimeout(id)};
  let tier=TIERS.indexOf(env.startTier||30000),enabled=false,disposed=false,timer=null,deadline=null,active=null,cycle=null,suspended=null,queued=null,historyQueued=null,generation=0,serial=0,failures=0,cooldown=0,blocked=false,pause='',stalled=false,releasing=false;
  const native=new Map(),checkpoints=new Map(),historyTasks=new Map(),gaps=[],audit=[],failureTimes=[];let circuitUntil=0,headHandoff=false;let history={phase:'idle',waitReason:null,pages:0,accepted:0,acquired:0,earliestTime:null,nextEligibleAt:null,target:null};
  const stats={lastFailure:null,state:'off',lastStart:null,lastSuccess:null,nextAttempt:null,latestEvent:null,rawCount:null,newAccepted:null,progress:null,text:'自動刷新已關閉'};
  const taskKey=t=>JSON.stringify([t.bounds,t.lower,t.upper]);
  const scopeKey=t=>JSON.stringify(t.bounds)+'|'+(t.live?'live':'fixed:'+t.upper);
  function snapshot(){return {...stats,history:{...history,lastFailure:stats.lastFailure,nextEligibleAt:history.phase.startsWith('waiting')&&history.phase!=='waiting-native-unknown'?Math.max(stats.nextAttempt||0,cooldown,circuitUntil,history.nextEligibleAt||0)||null:history.nextEligibleAt},enabled,tier:TIERS[tier],startTier:env.startTier||30000,generation,failures,cooldown,blocked,circuitUntil,failureWindow:failureTimes.slice(),historyTasks:[...historyTasks.entries()].map(([k,v])=>[k,{...v,seen:undefined}]),paused:pause,busy:!!active||!!cycle,historyQueued:historyQueued?{target:historyQueued.target,force:historyQueued.force}:null,headBusy:!!queued||!!cycle&&cycle.kind!=='history',intent:cycle?.kind||null,queuedHead:!!queued,suspendedHistory:suspended?{cursor:suspended.cursor,upper:suspended.target.upper,boundary:suspended.boundary,pages:suspended.pages}:null,pluginInFlight:!!active,pluginDispatched:!!active?.dispatched,nativeUnknown:[...native.values()].some(n=>n.uncertain),nativeBusy:native.size,pages:cycle?.pages||0,checkpoints:[...checkpoints.entries()],gaps:gaps.slice(),audit:audit.slice(-200)};}
  const notify=()=>env.change?.(snapshot());
  function stopTimer(){if(timer!==null)clock.clear(timer);timer=null;stats.nextAttempt=null;}
  function later(fn,at){stopTimer();if(disposed)return;stats.nextAttempt=at;timer=clock.set(()=>{timer=null;stats.nextAttempt=null;fn();},Math.max(0,at-clock.now()));notify();}
  function status(state,text){stats.state=state;stats.text=text;if(cycle?.kind==='history'){history={...history,phase:state==='fetching'||state==='catching-up'?'fetching':state==='native-unknown'?'waiting-native-unknown':state==='waiting'||state==='backoff'||state==='paused'?'waiting':state,waitReason:state==='fetching'||state==='catching-up'?null:text,pages:cycle.receivedPages||0,accepted:cycle.accepted,returned:cycle.returned||0,acquired:cycle.seen.size,nextEligibleAt:stats.nextAttempt,target:{bounds:{...cycle.target.bounds},upper:cycle.target.upper,lower:cycle.target.lower}};}notify();}
  function normalize(t){const bounds={...t.bounds};return {...t,bounds,key:scopeKey({...t,bounds}),upper:Math.min(t.upper,clock.now())};}
  function target(){return normalize(env.target());}
  function saveGap(c,state){gaps.push({scope:c.target.key,kind:c.kind,upper:c.target.upper,boundary:c.boundary,cursor:c.cursor,state,pages:c.pages});}
  function after(){if(disposed)return;if(suspended&&!headHandoff){cycle=suspended;suspended=null;pump();return;}if(queued){headHandoff=false;const q=queued;queued=null;if(q.generation!==generation){q.resolve({state:'superseded',text:'範圍已變更；排隊刷新已取消'});after();return;}begin(q.kind,q.target).then(q.resolve);if(!cycle)after();return;}if(suspended){headHandoff=false;cycle=suspended;suspended=null;pump();return;}if(historyQueued){const q=historyQueued;historyQueued=null;if(q.generation!==generation){q.resolve({state:'superseded'});after();return;}begin('history',q.target).then(q.resolve);return;}if(enabled&&!pause&&!blocked)scheduleAuto();}
  function end(state,text,complete=false){const c=cycle;if(c){
    if(complete&&c.head&&c.kind!=='history'){const prior=checkpoints.get(c.target.key);if(!prior||c.head.time>=prior.time)checkpoints.set(c.target.key,{time:c.head.time,ids:[...new Set([...(prior?.time===c.head.time?prior.ids:[]),...c.head.ids])],upper:c.target.upper});}
    if(c.kind==='history'){history={...history,phase:c.crossed?'query-boundary':state==='caught-up'?'partial':state==='superseded'||state==='cleared'||state==='off'?'cancelled':state==='backoff'||state==='unavailable'||state==='circuit'?'failed':state,waitReason:text,pages:c.receivedPages||0,accepted:c.accepted,returned:c.returned||0,acquired:c.seen.size,nextEligibleAt:null,target:{bounds:{...c.target.bounds},upper:c.target.upper,lower:c.target.lower}};}
    if(c.kind==='history')historyTasks.set(taskKey(c.target),{target:{...c.target},cursor:c.cursor,state,complete,transportCovered:complete&&c.crossed===true,seen:[...c.seen],pages:c.pages});
    if(!complete)saveGap(c,state);
    c.state=state;env.complete?.(c,complete);audit.push({kind:'cycle',intent:c.kind,state,pages:c.pages,scope:c.target.key,upper:c.target.upper,boundary:c.boundary});cycle=null;c.resolve({state,text,complete,pages:c.pages,newAccepted:c.accepted});
  }if(state==='stalled')stalled=true;status(state,text);after();}
  function scheduleAuto(){if(!enabled||disposed||pause||blocked||stalled||cycle||active)return;const at=Math.max(clock.now(),cooldown,circuitUntil,stats.lastStart===null?0:stats.lastStart+TIERS[tier]);status(cooldown>clock.now()?'backoff':'waiting',cooldown>clock.now()?'退避中':stats.progress==='quiet'?'已無新事件・降檔等待':'等待下一次刷新');later(()=>begin('auto'),at);}
  function begin(kind,explicit){if(disposed)return Promise.resolve({state:'unavailable'});if(env.available&&!env.available()){status('unavailable','公開 COMM 接口不可用');return Promise.resolve({state:'unavailable',text:stats.text});}if(cycle)return cycle.promise;if(blocked)return Promise.resolve({state:'unavailable',text:'請恢復登入後按「恢復擷取」'});if(circuitUntil>clock.now()){status('circuit','失敗過多；暫停擷取');stats.nextAttempt=circuitUntil;return Promise.resolve({state:'circuit',text:stats.text});}if(circuitUntil){circuitUntil=0;failures=0;}if(pause)return Promise.resolve({state:'paused',text:pause});if(cooldown>clock.now()){status('backoff','退避中；手動刷新仍須等待');return Promise.resolve({state:'backoff',text:stats.text});}
    stalled=false;stopTimer();const t=explicit?normalize(explicit):target(),previous=kind==='history'&&!t.force?historyTasks.get(taskKey(t)):null;if(previous?.complete){status('cached',previous.transportCovered?'已共用本次歷史查詢；範圍外未知':'已使用既有部分歷史；完整性未知');return Promise.resolve({state:'cached',complete:previous.transportCovered,text:stats.text});}const coverages=kind==='history'&&!t.force?[...historyTasks.values()].filter(x=>x.transportCovered&&x.cursor&&JSON.stringify(x.target.bounds)===JSON.stringify(t.bounds)):[],contained=coverages.find(x=>x.target.upper>=t.upper&&x.target.lower<=t.lower);if(contained){status('cached','已共用相容歷史游標覆蓋；伺服器完整性未確認');return Promise.resolve({state:'cached',complete:true,text:stats.text});}const reuse=coverages.find(x=>x.target.upper>=t.upper&&x.target.lower<=t.upper&&x.target.lower>t.lower);let resolve;const promise=new Promise(r=>resolve=r);cycle={kind,target:t,checkpoint:kind==='history'?null:checkpoints.get(t.key),boundary:kind==='history'?t.lower:checkpoints.get(t.key)?.time??t.lower,cursor:null,pages:0,seen:new Set(),pageIdentities:new Set(),head:null,generation,resolve,promise,accepted:0,receivedPages:0,yieldAllowed:true,dispatched:false,coverages};if(kind==='history'&&(previous?.cursor||reuse?.cursor)){cycle.cursor=previous?.cursor||reuse.cursor;cycle.seen=new Set(previous?.seen||reuse.seen||[]);cycle.reused=previous?.target||reuse.target;}if(kind==='history'){history={phase:'queued',waitReason:null,pages:0,accepted:0,acquired:0,earliestTime:null,nextEligibleAt:null,target:{bounds:{...t.bounds},upper:t.upper,lower:t.lower}};status('queued','歷史擷取已排隊');}pump();return promise;
  }
  function request(kind='manual',explicit){if(cycle){const t=explicit?normalize(explicit):target();if(cycle.generation===generation&&cycle.kind!=='history'&&kind!=='history'&&cycle.target.key===t.key&&(!t.live||!active?.dispatched||cycle.target.upper>=clock.now()))return cycle.promise;if(kind==='history')return queueHistory(t);if(queued&&queued.target.key===t.key){queued.target=t;return queued.promise;}
    if(queued)queued.resolve({state:'superseded'});let resolve;const promise=new Promise(r=>resolve=r);queued={kind,target:t,resolve,promise,generation};status('queued','最新刷新已排隊；保留歷史游標');if(!active&&!native.size)yieldHistory();return promise;
  }return begin(kind,explicit);}
  function queueHistory(t){
    if(cycle?.kind==='history'&&cycle.generation===generation&&taskKey(cycle.target)===taskKey(t)&&!t.force)return cycle.promise;
    if(historyQueued&&taskKey(historyQueued.target)===taskKey(t)&&historyQueued.force===!!t.force)return historyQueued.promise;
    if(historyQueued)historyQueued.resolve({state:'superseded'});
    let resolve;const promise=new Promise(r=>resolve=r);historyQueued={target:t,force:!!t.force,generation,resolve,promise};notify();return promise;
  }
  function requestHistory(explicit,force=false){
    const span=explicit.upper-explicit.lower,upper=explicit.live?clock.now():explicit.upper,t=normalize({...explicit,upper,lower:explicit.live?upper-span:explicit.lower,force});const same=c=>c?.generation===generation&&JSON.stringify(c.target.bounds)===JSON.stringify(t.bounds)&&c.target.upper-c.target.lower===t.upper-t.lower&&c.target.live===t.live&&(t.live||c.target.upper===t.upper);if(cycle?.kind==='history'&&same(cycle))return cycle.promise;if(suspended&&same(suspended))return suspended.promise;if(historyQueued&&same(historyQueued))return historyQueued.promise;
    if(force)for(const [k,v]of historyTasks)if(JSON.stringify(v.target.bounds)===JSON.stringify(t.bounds)&&v.target.lower<=t.upper&&v.target.upper>=t.lower)historyTasks.delete(k);
    history={phase:blocked?'failed':pause?'waiting':cooldown>clock.now()||circuitUntil>clock.now()?'waiting':'queued',waitReason:blocked?'登入／驗證受阻；恢復登入後按「恢復擷取」':pause||((cooldown>clock.now()||circuitUntil>clock.now())?'錯誤退避中；歷史游標已保留':null),pages:0,accepted:0,acquired:0,earliestTime:null,nextEligibleAt:blocked||pause?null:Math.max(cooldown,circuitUntil)||null,target:{bounds:{...t.bounds},upper:t.upper,lower:t.lower}};notify();
    return request('history',t);
  }
  function yieldHistory(){if(cycle?.kind!=='history'||!queued||!cycle.yieldAllowed)return false;cycle.yieldAllowed=false;headHandoff=true;history.phase='waiting-head';history.waitReason='讀取最新頁後續接歷史；游標已保留';history.nextEligibleAt=null;saveGap(cycle,'history-suspended-for-head');suspended=cycle;cycle=null;stopTimer();after();return true;}
  function dispatchTarget(c){if(c.dispatched)return;c.dispatched=true;if(c.target.live&&c.kind!=='history'){const span=c.target.upper-c.target.lower;c.target.upper=clock.now();c.target.lower=c.target.upper-span;if(!c.checkpoint)c.boundary=c.target.lower;}}
  function payload(c){return {...c.target.bounds,tab:'all',minTimestampMs:-1,maxTimestampMs:c.cursor?.time??c.target.upper,...(c.cursor?{plextContinuationGuid:c.cursor.guid}:{})};}
  function compatible(p,c){const expected=payload(c);return Object.keys(expected).every(k=>k==='maxTimestampMs'&&c.target.live&&c.kind!=='history'&&!c.cursor?p?.[k]>=clock.now():p?.[k]===expected[k])&&!p.ascendingTimestampOrder;}
  function pump(){if(!cycle||disposed||active||releasing)return;if(blocked){end('unavailable','登入／權限不可用；歷史游標已保留');return;}if(yieldHistory())return;if(pause){status('paused',pause);return;}if(cycle.kind==='auto'&&!enabled){end('off','自動刷新已關閉');return;}if(cycle.obsolete||cycle.generation!==generation){end('superseded','範圍已變更；已取得資料保留');return;}
    if(native.size){stopTimer();const probe=cycle.target.live&&cycle.kind!=='history'&&!cycle.dispatched?{...cycle,target:{...cycle.target,upper:clock.now()}}:cycle;const matching=[...native.values()].find(n=>n.generation===generation&&compatible(n.payload,probe));if(matching){dispatchTarget(cycle);matching.joined=cycle;status('fetching','共用相容的公開 COMM 請求');}else status([...native.values()].some(n=>n.uncertain)?'native-unknown':'waiting',[...native.values()].some(n=>n.uncertain)?'原生請求狀態未明；等待確認或按恢復擷取':'等待原生公開 COMM 完成');return;}
    if(env.nativeWaiting?.()){env.yieldNative?.();later(pump,clock.now()+25);return;}
    const interval=cycle.kind==='history'&&cycle.target.force&&cycle.pages===0?TIERS[0]:TIERS[tier],at=Math.max(cooldown,circuitUntil,stats.lastStart===null?0:stats.lastStart+interval);if(clock.now()<at){status('waiting',cooldown>clock.now()?'錯誤退避中；歷史游標已保留':'等待安全發送時間');later(pump,at);return;}
    if(cycle.pages>=100){end('stalled','翻頁達上限；已取得部分資料');return;}
    const c=cycle;dispatchTarget(c);const id=++serial,p=payload(c);c.requestId=id;c.requestQuery=p;c.pages++;if(!env.deferredDispatch)stats.lastStart=clock.now();active={id,c,p,handle:null,dispatched:!env.deferredDispatch};status(c.cursor?'catching-up':'fetching',c.kind==='history'?'正在讀取歷史活動':c.cursor?'追趕未接收的新事件':c.target.live?'正在刷新最新活動':'更新觀測時間資料');if(!env.deferredDispatch)deadline=clock.set(()=>failure(id,{status:0,kind:'timeout'}),30000);
    try{const h=env.send(p,data=>success(id,data),error=>failure(id,error||{}),{purpose:c.kind==='history'?'history':'head',liveHead:c.target.live&&c.kind!=='history'&&!c.cursor,boundary:clock.now(),generation:env.dataGeneration?.()??0,tier:interval,onDispatch:q=>{if(active?.id!==id)return;active.dispatched=true;c.requestQuery={...q};const span=c.target.upper-c.target.lower;if(c.target.live&&c.kind!=='history'&&!c.cursor){c.target.upper=q.maxTimestampMs;c.target.lower=c.target.upper-span;if(!c.checkpoint)c.boundary=c.target.lower;}stats.lastStart=clock.now();notify();}});if(active?.id===id)active.handle=h;}catch(e){failure(id,{status:0,kind:'dispatch',message:e.message});}
  }
  function release(id,abort=false){if(active?.id!==id)return null;const a=active;active=null;clock.clear(deadline);deadline=null;if(abort){releasing=true;try{a.handle?.abort?.();}catch(_){}finally{releasing=false;}}return a;}
  function success(id,data){const a=release(id);if(a)process(a.c,data);}
  function process(c,data){
    if(!Array.isArray(data?.result)){if(c===cycle)failCycle({status:0,kind:'malformed'});return;}
    c.receivedPages=(c.receivedPages||0)+1;c.returned=(c.returned||0)+data.result.length;c.yieldAllowed=true;const rows=data.result,newAccepted=env.ingest(data,{bounds:c.target.bounds,upper:c.target.upper,lower:c.target.lower,live:c.target.live,cursor:c.cursor,query:c.requestQuery,requestId:String(c.requestId),generation:c.generation,dataGeneration:env.dataGeneration?.()??0,stale:c.generation!==generation,intent:c.kind})||0;c.accepted+=newAccepted;if(c.kind==='history'){const times=data.result.filter(r=>Number.isSafeInteger(r?.[1])).map(r=>r[1]);if(times.length)history.earliestTime=Math.min(history.earliestTime??Infinity,...times);}
    audit.push({kind:'page',intent:c.kind,raw:rows.length,newAccepted,scope:c.target.key,generation:c.generation,cursor:c.cursor});
    if(c.obsolete||c!==cycle||c.generation!==generation){if(c===cycle)end('superseded','範圍已變更；舊資料保留');else pump();return;}
    stats.rawCount=rows.length;stats.newAccepted=newAccepted;
    if(rows.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!r[0]||!Number.isSafeInteger(r[1]))){end('stalled','時間／游標格式異常；已取得資料保留');return;}
    if(rows.length>50){end('stalled','公開 COMM 回應超過 50 筆；契約待核對');return;}
    if(rows.some((r,i)=>r[1]>(c.cursor?.time??c.target.upper)||(i&&r[1]>rows[i-1][1]))){end('stalled','回應不符合固定時間／排序；已取得資料保留');return;}
    const identity=JSON.stringify(rows.map(r=>[r[0],r[1]])),novel=rows.filter(r=>!c.seen.has(r[0]+'|'+r[1]));
    if(rows.length&&(!novel.length||c.pageIdentities.has(identity))){end('stalled','游標／頁面未前進；已取得部分資料');return;}
    const last=rows.at(-1),next=last?{time:last[1],guid:last[0]}:null;
    if(next&&c.cursor&&next.time===c.cursor.time&&next.guid===c.cursor.guid){end('stalled','游標重複；保留部分資料');return;}
    c.pageIdentities.add(identity);for(const r of rows)c.seen.add(r[0]+'|'+r[1]);
    if(rows.length&&!c.head)c.head={time:rows[0][1],ids:new Set()};
    if(c.head)for(const r of rows)if(r[1]===c.head.time)c.head.ids.add(r[0]);
    // History can extend a known same-ms cohort; it never replaces a live head.
    if(c.kind==='history'){const cp=checkpoints.get(c.target.key);if(cp)cp.ids=[...new Set([...cp.ids,...rows.filter(r=>r[1]===cp.time).map(r=>r[0])])];}
    if(rows.length)stats.latestEvent=Math.max(stats.latestEvent??-Infinity,rows[0][1]);
    const crossed=!!last&&last[1]<c.boundary,known=!!c.checkpoint&&!!last&&last[1]===c.boundary&&c.checkpoint.ids.every(id=>c.seen.has(id+'|'+c.boundary));
    c.crossed=crossed;
    const cold=c.kind!=='history'&&!c.checkpoint,complete=cold||crossed||known||!rows.length;
    c.advanced=!!c.advanced||!!c.checkpoint&&rows.some(r=>r[1]>c.checkpoint.time||r[1]===c.checkpoint.time&&!c.checkpoint.ids.includes(r[0]));const newHead=c.advanced;
    const quiet=c.kind!=='history'&&!!c.checkpoint&&complete&&!newHead;
    const fast=rows.length===50&&!quiet&&(newHead||!complete||cold&&rows.length>0);
    stats.progress=quiet?'quiet':fast?'advancing':rows.length<50?'short':'complete';
    tier=Math.max(0,Math.min(TIERS.length-1,tier+(fast?-1:1)));stats.lastSuccess=clock.now();failures=0;cooldown=Math.max(0,cooldown);for(let i=failureTimes.length-1;i>=0;i--)if(failureTimes[i]<=clock.now()-600000)failureTimes.splice(i,1);
    audit.push({kind:'adapt',intent:c.kind,raw:rows.length,newAccepted,complete,newHead,quiet,tier:TIERS[tier],reason:stats.progress});
    if(cold){saveGap(c,'older-history-not-requested');end('caught-up','最新頁已更新；較早歷史尚未確認',true);return;}
    if(complete){if(c.kind==='history'&&!rows.length){saveGap(c,'server-response-end-unverified');end('partial','伺服器本次未返回更多資料；歷史完整性未確認',false);return;}if(next)c.cursor=next;if(!rows.length)saveGap(c,'server-response-end-unverified');end('caught-up',quiet?'已無新事件・降檔等待':c.kind==='history'?'本次歷史查詢完成；伺服器完整性未確認':'最新刷新完成；範圍外未確認',true);return;}
    c.cursor=next;if(c.kind!=='history'&&suspended){saveGap(c,'head-yielded-for-history');end('partial','最新頁已讀取；先續接歷史，較早最新資料仍待追趕',false);return;}if(c.kind==='history'){const covered=c.coverages?.filter(x=>next.time<=x.target.upper&&next.time>=x.target.lower&&x.cursor.time<next.time).sort((a,b)=>a.cursor.time-b.cursor.time)[0];if(covered){c.cursor={...covered.cursor};for(const id of covered.seen||[])c.seen.add(id);audit.push({kind:'coverage-reuse',scope:c.target.key,from:next,to:c.cursor,covered:{upper:covered.target.upper,lower:covered.target.lower}});if(c.cursor.time<c.boundary){c.crossed=true;end('caught-up','已共用歷史區段；伺服器完整性未確認',true);return;}}}status('catching-up',c.kind==='history'?'正在讀取歷史・游標前進':'正在追趕・游標前進');if(!yieldHistory())pump();
  }
  function retryDelay(e){const ra=Number(e.retryAfterMs);return Math.max(Number.isFinite(ra)&&ra>0?ra:0,Math.min(600000,5000*2**Math.min(failures-1,7)));}
  function failCycle(e){stats.lastFailure={status:Number.isSafeInteger(e.status)&&e.status>0?e.status:null,reason:e.kind||'transport-error',at:clock.now(),retryAfterMs:Number(e.retryAfterMs)||null};failures++;failureTimes.push(clock.now());while(failureTimes[0]<=clock.now()-600000)failureTimes.shift();if(failures>=6||failureTimes.length>=12)circuitUntil=Math.max(circuitUntil,clock.now()+600000);cooldown=clock.now()+retryDelay(e);if(e.status===401||e.status===403){blocked=true;enabled=false;end('unavailable','登入／驗證受阻；恢復登入後按「恢復擷取」');return;}end(circuitUntil>clock.now()?'circuit':'backoff',circuitUntil>clock.now()?'失敗過多；暫停擷取':e.kind==='timeout'?'刷新逾時；稍後重試':'刷新失敗；稍後重試');stats.nextAttempt=Math.max(cooldown,circuitUntil);notify();}
  function failure(id,e){const a=release(id,true);if(!a)return;if(e.kind==='stopped'||e.kind==='superseded'||e.kind==='single-tab'||e.kind==='identity'||e.kind==='paused'){if(e.retryAfterMs)cooldown=Math.max(cooldown,clock.now()+e.retryAfterMs);end('paused',e.text||'工作已停止；覆蓋未知');return;}if(a.c!==cycle||a.c.generation!==generation){if(a.c===cycle)end('superseded','舊範圍請求失敗；已取得資料保留');else pump();return;}failCycle(e);}
  function enable(on){enabled=!!on;stalled=false;stopTimer();if(!enabled&&cycle?.kind==='auto'){if(active)release(active.id,true);end('off','自動刷新已關閉');}else if(cycle)pump();else if(enabled)scheduleAuto();else status('off','自動刷新已關閉');notify();}
  function setTier(ms){const i=TIERS.indexOf(ms);if(i<0)return false;env.startTier=ms;tier=i;if(enabled&&!cycle)scheduleAuto();notify();return true;}
  function setPause(reason){reason=reason||'';if(reason===pause)return;pause=reason;stopTimer();if(pause)status('paused',pause);else if(cycle)pump();else if(suspended)after();else if(enabled)scheduleAuto();else status('off','自動刷新已關閉');}
  function cancelHistory(){if(historyQueued){historyQueued.resolve({state:'superseded'});historyQueued=null;}if(suspended){suspended.resolve({state:'superseded'});suspended=null;}if(cycle?.kind==='history'){cycle.obsolete=true;if(!active)end('superseded','範圍已變更；已取得資料保留');}notify();}
  function scopeChanged(){generation++;if(historyQueued){historyQueued.resolve({state:'superseded'});historyQueued=null;}if(suspended){suspended.resolve({state:'superseded'});suspended=null;}stalled=false;stopTimer();if(cycle&&!active)end('superseded','範圍已變更；已取得資料保留');else if(!cycle&&enabled)scheduleAuto();notify();}
  function reconcileNative(id){const n=native.get(id);if(!n)return;if(n.timer)clock.clear(n.timer);let state;try{state=env.nativeState?.(id)||{state:'unknown'};}catch(_){state={state:'unknown'};}if(state.state==='complete'){env.retireNative?.(id,state);nativeEnd(id,state.data,state.error);return;}n.uncertain=true;env.nativeUncertain?.(id);status('native-unknown','原生請求狀態未明；等待確認或按恢復擷取');n.timer=clock.set(()=>reconcileNative(id),30000);}
  function nativeStart(id,p){const old=native.get(id);if(old?.timer)clock.clear(old.timer);const n={payload:{...p},joined:null,generation,startedAt:clock.now(),uncertain:false};native.set(id,n);stats.nativeLastStart=clock.now();n.timer=clock.set(()=>reconcileNative(id),30000);if(cycle)pump();}
  function nativeEnd(id,data,error){const n=native.get(id);if(n?.timer)clock.clear(n.timer);native.delete(id);if(!n)return;if(error&&error.kind!=='stopped'){failCycle(error);return;}if(n.joined&&n.joined===cycle&&n.generation===generation){cycle.pages++;if(error?.kind==='stopped')pump();else process(n.joined,data);}else if(cycle)pump();else if(enabled)scheduleAuto();}
  function resetActivity(){if(historyQueued){historyQueued.resolve({state:'cleared'});historyQueued=null;}const choice=enabled;stopTimer();if(active)release(active.id,true);for(const c of [cycle,suspended])c?.resolve({state:'cleared'});cycle=null;suspended=null;if(queued)queued.resolve({state:'cleared'});queued=null;for(const n of native.values())n.joined=null;checkpoints.clear();historyTasks.clear();gaps.length=0;audit.length=0;generation++;stats.latestEvent=null;stats.rawCount=null;stats.newAccepted=null;stats.progress=null;stats.state='cleared';stats.text='活動已清除；可重新擷取此區間';history={phase:'cleared',waitReason:null,pages:0,accepted:0,acquired:0,earliestTime:null,nextEligibleAt:null,target:null};headHandoff=false;enabled=choice;notify();}
  function recover(){for(const id of native.keys())reconcileNative(id);blocked=false;failures=0;failureTimes.length=0;circuitUntil=0;if(enabled)scheduleAuto();notify();}
  function restoreState(s){if(!s||typeof s!=='object')return;for(const [key,cp]of s.checkpoints||[])if(typeof key==='string'&&Number.isSafeInteger(cp?.time)&&Array.isArray(cp.ids))checkpoints.set(key,cp);for(const [key,v]of s.historyTasks||[])if(typeof key==='string'&&v?.target?.bounds)historyTasks.set(key,v);for(const g of s.gaps||[])if(g&&typeof g.state==='string')gaps.push(g);}
  function dispose(){if(historyQueued){historyQueued.resolve({state:'off'});historyQueued=null;}disposed=true;enabled=false;stopTimer();if(active)release(active.id,true);for(const c of [cycle,suspended])c?.resolve({state:'off'});cycle=null;suspended=null;if(queued){queued.resolve({state:'off'});queued=null;}for(const n of native.values())if(n.timer)clock.clear(n.timer);native.clear();status('off','已停止');}
  return {TIERS,snapshot,request,requestHistory,cancelHistory,enable,setTier,setPause,scopeChanged,nativeStart,nativeEnd,reconcileNative,resetActivity,recover,restoreState,dispose};
}

/* Independent endpoint-displacement estimator; no solver, trajectory or XMP input. */
function createTrackerSpeed(core) {
  const R=40,EARTH=6371008.8;
  function distance(a,b){const k=Math.PI/180,h=Math.sin((b[0]-a[0])*k/2)**2+Math.cos(a[0]*k)*Math.cos(b[0]*k)*Math.sin((b[1]-a[1])*k/2)**2;return EARTH*2*Math.asin(Math.sqrt(Math.min(1,h)));}
  function region(points){
    if(points.length===1)return {state:'valid',constraints:points,witness:points[0]};
    if(points.some(a=>points.some(b=>distance(a,b)>2*R+.000001)))return {state:'ambiguous',reason:'incompatible-interactions',constraints:points};
    // Candidates only certify existence after checking EVERY original geodesic disk.
    // Failure to find a witness is unresolved, never an invented average position.
    const o=points[0],k=Math.PI/180,c=Math.cos(o[0]*k);if(Math.abs(o[0])>80)return {state:'ambiguous',reason:'region-unresolved',constraints:points};
    const xy=points.map(p=>[EARTH*c*((p[1]-o[1]+540)%360-180)*k,EARTH*(p[0]-o[0])*k]);
    const candidates=[...xy,xy.reduce((a,p)=>[a[0]+p[0]/xy.length,a[1]+p[1]/xy.length],[0,0])];
    for(let i=0;i<xy.length;i++)for(let j=0;j<i;j++){const a=xy[i],b=xy[j],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!d||d>80)continue;const h=Math.sqrt(Math.max(0,R*R-d*d/4)),m=[(a[0]+b[0])/2,(a[1]+b[1])/2];candidates.push(m,[m[0]+h*(a[1]-b[1])/d,m[1]+h*(b[0]-a[0])/d],[m[0]-h*(a[1]-b[1])/d,m[1]-h*(b[0]-a[0])/d]);}
    const witness=candidates.map(p=>[o[0]+p[1]/EARTH/k,((o[1]+p[0]/(EARTH*c)/k+540)%360)-180]).find(p=>points.every(q=>distance(p,q)<=R+1e-7));
    return witness?{state:'valid',constraints:points,witness}:{state:'ambiguous',reason:'region-unresolved',constraints:points};
  }
  function estimate(events){
    const slices=[],excluded=[],ordered=[...events].sort((a,b)=>a.time-b.time||a.guid.localeCompare(b.guid));
    for(const [index,e] of ordered.entries()){if(!['RES','ENL'].includes(core.role(e))){excluded.push(e.guid);continue;}const a=core.interactionEvidence(e);if(!a){excluded.push(e.guid);continue;}let s=slices.at(-1);if(!s||s.time!==e.time)slices.push(s={time:e.time,ids:[],points:new Map(),portals:new Map(),actors:new Set(),reasons:[],startIndex:index});s.endIndex=index;s.ids.push(e.guid);s.actors.add(e.player);if(a.reason)s.reasons.push(a.reason);else {s.points.set(a.position.join(','),a.position);const p=a.portal;if(p)s.portals.set(p.guid||p.portalGuid||'coordinate:'+p.position.join(','),p);}}
    for(const s of slices)s.region=s.reasons.length?{state:'ambiguous',reason:s.reasons[0]}:region([...s.points.values()]);
    const pairs=[],byGuid=new Map();
    for(let i=1;i<slices.length;i++){const a=slices[i-1],b=slices[i],dt=(b.time-a.time)/1000;if(a.region.state!=='valid'||b.region.state!=='valid'||!(dt>0)){for(const id of b.ids)byGuid.set(id,{state:'unavailable',reason:'ambiguous-interaction'});continue;}
      const distances=a.region.constraints.flatMap(p=>b.region.constraints.map(q=>distance(p,q))),lowerM=Math.max(0,...distances.map(d=>d-80)),upperM=Math.min(...distances.map(d=>d+80)),minimum={lowerKmh:3.6*lowerM/dt,upperKmh:3.6*upperM/dt};
      // Triangle-inequality bounds contain displacement of all feasible endpoints.
      const centerDistanceM=distance(a.region.witness,b.region.witness),centerKmh=3.6*centerDistanceM/dt;
      const single=a.points.size===1&&b.points.size===1,samePortal=single&&a.portals.size===1&&b.portals.size===1&&[...a.portals.keys()][0]===[...b.portals.keys()][0];
      const state=samePortal?'same-portal':minimum.lowerKmh===0?(single?'overlap':'unresolved-region-rate'):'computed';
      const p={state,fromTime:a.time,time:b.time,dt,fromIds:a.ids,toIds:b.ids,actors:[...new Set([...a.actors,...b.actors])],fromPortals:[...a.portals.values()],toPortals:[...b.portals.values()],interveningIds:ordered.slice(a.endIndex+1,b.startIndex).map(e=>e.guid),centerDistanceM,requiredDistanceM:lowerM,endpointRadiiM:[R,R],centerKmh,minimum,level:state==='computed'?core.speedLevel(minimum.lowerKmh):null,ghost:state==='computed'&&minimum.lowerKmh>1000,ghostCandidate:false,longGap:dt>60,kind:single?'portal-centers':'validated-region-witness',uncertainty:'straight-endpoint-displacement'};pairs.push(p);for(const id of b.ids)byGuid.set(id,p);
    }
    const last=slices.at(-1),candidate=pairs.at(-1),latest=last?.region.state==='valid'&&candidate?{...candidate,olderThanLatestSlice:candidate.time!==last.time}:null;
    return {slices,pairs,excluded,byGuid,latest,ghost:!!latest?.ghost&&!latest.olderThanLatestSlice,ghostCandidate:!!latest?.ghostCandidate&&!latest.olderThanLatestSlice,status:last?.region.state==='ambiguous'?(last.region.reason==='no-coordinate'?'互動缺少座標':'同時互動位置未解'):latest?.olderThanLatestSlice?'較早有效估算；最新間隔未解':latest?'已計算':'資料不足',result:latest};
  }
  return {estimate,distance,region,radius:R};
}

/* Presentation only: calculations and exports keep original epoch milliseconds. */
function createTrackerTime(zone=Intl.DateTimeFormat().resolvedOptions().timeZone,translate=null) {
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const pad=(n,k=2)=>String(n).padStart(k,'0');
  function absolute(t){if(!Number.isFinite(t))return '—';const p=Object.fromEntries(formatter.formatToParts(new Date(t)).map(x=>[x.type,x.value]));return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}.${pad(((t%1000)+1000)%1000,3)}`;}
  function relative(t,T){if(!Number.isFinite(t)||!Number.isFinite(T))return '—';const diff=T-t,ms=Math.abs(diff),s=Math.floor(ms/1000),suffix=diff<0?'後':'前',sec=pad(s%60)+'.'+pad(ms%1000,3);
    if(translate){const args={s,ms:pad(ms%1000,3),suffix:translate(diff<0?'from_now':'ago'),m:s<3600?Math.floor(s/60):pad(Math.floor(s/60)%60),sec,h:Math.floor(s/3600)};return translate(s<60?'s_ms_s_suffix':s<3600?'m_m_sec_s_suffix':'h_h_m_m_sec_s_suffix',args);}
    if(s<60)return s+'.'+pad(ms%1000,3)+'秒'+suffix;if(s<3600)return Math.floor(s/60)+'分'+sec+'秒'+suffix;return Math.floor(s/3600)+'時'+pad(Math.floor(s/60)%60)+'分'+sec+'秒'+suffix;
  }
  return {zone,absolute,relative};
}

/* Independent historical cursor; transport is the shared coordination queue. */
function createTrackerBacktrack(env){
 'use strict';
 const clock=env.clock||{now:()=>Date.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)};
 let session=null,automatic=false,active=false,handle=null,timer=null,token=0;
 const validCursor=c=>c&&Number.isSafeInteger(c.time)&&typeof c.guid==='string'&&c.guid.length>0;
 function snapshot(){if(!session)return {automatic,active,inFlight:!!handle,state:'off',reason:'backtrack_reason_unconfigured'};const {rawPages,...progress}=session;return {...progress,bounds:{...session.bounds},elapsedMs:session.elapsedMs+(session.startedAt===null?0:clock.now()-session.startedAt),automatic,active,inFlight:!!handle};}
 function changed(){const progress=snapshot();delete progress.elapsedMs;env.save?.({automatic,session:session?{...progress,elapsedMs:session.elapsedMs,startedAt:null}:null});env.change?.(snapshot());}
 function cancel(){token++;if(timer!==null)clock.clear(timer);timer=null;handle?.abort?.();handle=null;}
 function pause(reason='backtrack_reason_paused'){active=false;cancel();if(session){if(session.startedAt!==null){session.elapsedMs+=clock.now()-session.startedAt;session.startedAt=null;}session.state='paused';session.reason=reason;session.nextAt=null;}changed();}
 function configure(T,bounds,limits={}){if(!Number.isSafeInteger(T)||T>clock.now()||!bounds||Object.values(bounds).length!==4||!Object.values(bounds).every(Number.isSafeInteger))throw Error('Invalid T/bounds');
  if(session?.T===T&&JSON.stringify(session.bounds)===JSON.stringify(bounds))return false;
  const right=Number.isSafeInteger(limits.right)?limits.right:T,lower=Number.isSafeInteger(limits.lower)?limits.lower:right-86400000;if(T>right||T<lower||right-lower>86400000||lower>=right)throw Error('Invalid bounded map interval');pause();session={right,lower,id:String(clock.now())+'-'+token,T,bounds:{...bounds},cursor:null,earliest:null,pages:0,returned:0,added:0,duplicates:0,unparsed:0,seenCursors:[],state:'off',reason:'backtrack_reason_configured',elapsedMs:0,startedAt:null,nextAt:null,rawPages:[],archiveCount:0};changed();return true;
 }
 function finish(state,reason){active=false;handle=null;if(session.startedAt!==null){session.elapsedMs+=clock.now()-session.startedAt;session.startedAt=null;}session.state=state;session.reason=reason;session.nextAt=null;changed();}
 function dispatch(){if(!active||!session||handle)return;const wait=env.wait?.();if(wait){session.state='waiting';session.reason=wait;session.nextAt=clock.now()+1000;changed();timer=clock.set(dispatch,1000);return;}
  if(session.cursor?.time<=session.lower){finish('ended','backtrack_reason_24h');return;}if(session.pages>=1000){finish('ended','backtrack_reason_limit');return;}
  const s=session,epoch=token,p={...s.bounds,tab:'all',minTimestampMs:s.lower,maxTimestampMs:s.cursor?.time??s.T,plextContinuationGuid:s.cursor?.guid||''};s.state='queued';s.reason='backtrack_reason_queue';s.nextAt=null;changed();
  // Sentinel handles also permit transports that call back synchronously in fixtures.
  const pending={abort(){}};handle=pending;
  const valid=()=>active&&epoch===token&&session===s;let captured=null;const capture=data=>{if(!valid()||captured===data)return;captured=data;const rawPage={query:p,response:data,at:clock.now()};s.rawPages.push(rawPage);env.archive?.(s.id,s.archiveCount=(s.archiveCount||0)+1,rawPage);};
  const h=env.send(p,data=>{if(!valid())return;handle=null;capture(data);const rows=data?.result;
   if(!Array.isArray(rows)||data.error){finish('error','backtrack_reason_invalid');return;}
   s.failures=0;s.pages++;s.returned+=rows.length;
   const counts=env.ingest(data,{bounds:s.bounds,upper:s.T,lower:s.lower,live:false,intent:'backtrack',source:'historical-backtrack',coverage:'unknown'})||{};s.added+=counts.added||0;s.duplicates+=counts.duplicates||0;s.unparsed+=counts.unparsed||0;
   const times=rows.filter(r=>Number.isSafeInteger(r?.[1])).map(r=>r[1]);if(times.length)s.earliest=Math.min(s.earliest??Infinity,...times);
   if(!rows.length){finish('ended','backtrack_reason_empty');return;}
   const last=rows.at(-1),c={time:last?.[1],guid:last?.[0]},key=JSON.stringify(c);
   if(!validCursor(c)||c.time>(s.cursor?.time??s.T)||rows.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!r[0]||r[0].length>2048||!Number.isSafeInteger(r[1])||r[1]>(s.cursor?.time??s.T))){finish('error','backtrack_reason_invalid');return;}
   if(s.seenCursors.includes(key)){finish('ended','backtrack_reason_repeated');return;}
   s.cursor=c;s.seenCursors.push(key);
   if(c.time<=s.lower){finish('ended','backtrack_reason_24h');return;}if(automatic){s.state='waiting';s.reason='backtrack_reason_next';s.nextAt=clock.now()+1200;changed();timer=clock.set(dispatch,1200);}else finish('paused','backtrack_reason_complete');
  },error=>{if(!valid())return;handle=null;const errorPage={query:p,error,at:clock.now()};s.rawPages.push(errorPage);env.archive?.(s.id,s.archiveCount=(s.archiveCount||0)+1,errorPage);if(error?.kind==='paused'){s.state='waiting';s.reason=error.text||'backtrack_reason_paused';s.nextAt=clock.now()+1000;changed();timer=clock.set(dispatch,1000);return;}if(automatic&&(error?.status===429||error?.status>=500||!error?.status&&!['authentication','malformed','identity','stopped'].includes(error?.kind))&&(s.failures=(s.failures||0)+1)<6){s.state='backoff';s.reason='backtrack_reason_retry';s.nextAt=clock.now()+Math.max(1200,Number(error?.retryAfterMs)||5000);changed();timer=clock.set(dispatch,s.nextAt-clock.now());return;}finish(error?.status===429?'backoff':'error',(error?.text||'backtrack_reason_failed')+(error?.status?' HTTP '+error.status:''));},{purpose:'backtrack',onRawResponse:capture,generation:env.generation?.(),tier:1200,onDispatch(){if(valid()){s.state='fetching';s.reason='backtrack_reason_fetching';changed();}}});
  if(handle===pending)handle=h;
 }
 function start(){if(!session)throw Error('Configure T first');if(active)return;active=true;token++;session.failures=0;session.startedAt??=clock.now();dispatch();}
 function setAutomatic(on){automatic=!!on;if(!automatic&&active)pause('backtrack_reason_auto_off');changed();}
 function clear(){const config=session?{T:session.T,bounds:session.bounds,right:session.right,lower:session.lower}:null;pause('backtrack_reason_cleared');session=null;if(config)configure(config.T,config.bounds,{right:config.right,lower:config.lower});changed();}
 function restore(saved){if(!saved?.session)return;try{const s=saved.session;if(!Number.isSafeInteger(s.T)||!s.bounds||s.right-s.lower>86400000||!Number.isSafeInteger(s.lower)||!Number.isSafeInteger(s.right)||s.T>s.right||s.T<s.lower||s.cursor&&!validCursor(s.cursor))return;automatic=saved.automatic===true;session={...s,rawPages:[],state:'paused',reason:'backtrack_reason_reload',startedAt:null,nextAt:null};changed();}catch(_){}}
 function dispose(){pause();}
 return {snapshot,configure,start,step:start,pause,setAutomatic,clear,restore,dispose,rawPages:()=>session?.rawPages||[]};
}

/* Derived event interpretation. Never mutates raw records or invents an operator. */
function createTrackerEvidence(){
 const POLICY=Object.freeze({version:'event-evidence-1',endpointWindowMs:6000,resonatorWindowMs:2000,flipWindowMs:2000,maxNearbyRows:2048});
 const canonical=n=>String(n||'').trim().toLowerCase(),system=e=>e.actorKind==='system'||['__ada__','__jarvis__'].includes(canonical(e.player)),valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;
 const portalKey=p=>valid(p?.position)?p.position.join(','):p?.guid||p?.portalGuid||null;
 function fullText(e){const original=e.raw?.[2]?.plext?.text;if(typeof original==='string'&&original.length)return original;return (e.markup||[]).map(m=>String(m?.[1]?.plain??'')).join('');}
 function manual(e){return !system(e)&&e.portals?.length===1&&valid(e.portals[0].position)&&/^(?:agent\s+)?used\s+(?:an?\s+|the\s+)?(?:ADA\s+Refactor|JARVIS\s+Virus)\s+(?:on|at)$/i.test(String(e.text||'').replace(/\s+/g,' ').trim())&&(e.markup||[]).filter(m=>m[0]==='PLAYER').length===1;}
 function direct(e){return !system(e)&&['captured','deployed','upgraded','linked','beacon','battleBeacon','rbb','vrbb','fracker','flip'].includes(e.action)&&!!e.position;}
 function resolve(input){const events=[...new Map(input.map(e=>[e.guid,e])).values()].sort((a,b)=>a.time-b.time||a.guid.localeCompare(b.guid)),actors=new Map(),atPortal=new Map(),linkGroups=new Map(),byGuid=new Map(),flips=[];
  for(const e of events){const actor=canonical(e.player);if(!actors.has(actor))actors.set(actor,[]);actors.get(actor).push(e);for(const p of e.portals||[]){const k=portalKey(p);if(!k)continue;if(!atPortal.has(k))atPortal.set(k,[]);atPortal.get(k).push(e);}if(!system(e)&&e.action==='destroyedLink'){const k=actor+'|'+e.time;if(!linkGroups.has(k))linkGroups.set(k,[]);linkGroups.get(k).push(e);}}
  function near(rows,t,window){let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>1;if(rows[m].time<t-window)lo=m+1;else hi=m;}const out=[];while(lo<rows.length&&rows[lo].time<=t+window&&out.length<POLICY.maxNearbyRows+1)out.push(rows[lo++]);return out;}
  const provenance=rows=>rows.map(e=>({guid:e.guid,time:e.time,action:e.action}));
  for(const e of events){
   const info={guid:e.guid,actor:e.player,actorTeam:e.team,objectFactions:(e.markup||[]).filter(m=>m[0]==='FACTION').map(m=>String(m[1]?.plain||'')),fullText:fullText(e),linkEndpoints:e.portals?.length===2&&['linked','destroyedLink'].includes(e.action)?e.portals:null};
   if(e.action==='destroyedLink'&&!system(e)&&e.portals?.length===2){const nearby=near(actors.get(canonical(e.player))||[],e.time,POLICY.endpointWindowMs),sameTime=linkGroups.get(canonical(e.player)+'|'+e.time)||[],common=sameTime.length>1?e.portals.filter(p=>sameTime.every(row=>row.portals?.some(q=>portalKey(q)===portalKey(p)))):[];
    const candidates=e.portals.map(p=>{const k=portalKey(p),res=nearby.filter(row=>row.guid!==e.guid&&row.action==='destroyedResonator'&&Math.abs(row.time-e.time)<=POLICY.resonatorWindowMs&&row.portals?.length===1&&portalKey(row.portals[0])===k),interactions=nearby.filter(row=>row.guid!==e.guid&&direct(row)&&portalKey(row.portals?.[0])===k),fields=nearby.filter(row=>row.action==='destroyedField'&&row.time===e.time&&row.portals?.length===1&&portalKey(row.portals[0])===k),shared=common.some(q=>portalKey(q)===k)?sameTime.filter(row=>row.guid!==e.guid):[];return {portal:p,supported:res.length>0||interactions.length>0||shared.length>0,sources:provenance([...new Map(res.concat(interactions,fields,shared).map(row=>[row.guid,row])).values()]),rules:[res.length?'same-actor-nearby-resonator':null,interactions.length?'same-actor-nearby-interaction':null,shared.length?'same-actor-same-time-common-endpoint':null,fields.length?'same-time-field-corroboration':null].filter(Boolean)};});
    const supported=candidates.filter(c=>c.supported);info.attack={state:nearby.length>POLICY.maxNearbyRows?'limited':supported.length===1?'supported':supported.length>1?'ambiguous':'unresolved',reason:nearby.length>POLICY.maxNearbyRows?'association-resource-limit':supported.length>1?'conflicting-endpoint-support':supported.length?'corroborated-target-inference':'missing-corroboration',candidates,portal:nearby.length<=POLICY.maxNearbyRows&&supported.length===1?supported[0].portal:null,sourceGuids:[e.guid,...(supported.length===1?supported[0].sources.map(s=>s.guid):[])],windowMs:POLICY.endpointWindowMs,observedActorPosition:false};
   }
   byGuid.set(e.guid,info);
  }
  const systemGroups=new Map();for(const e of events.filter(system)){if(!['neutralized','destroyedLink','destroyedField','destroyedResonator','captured'].includes(e.action))continue;const k=canonical(e.player)+'|'+e.time;if(!systemGroups.has(k))systemGroups.set(k,[]);systemGroups.get(k).push(e);}
  for(const [id,rows]of systemGroups){const all=[...new Map(rows.flatMap(e=>e.portals||[]).map(p=>[portalKey(p),p])).values()].filter(p=>portalKey(p)),common=all.filter(p=>rows.every(e=>e.portals?.some(q=>portalKey(q)===portalKey(p)))),portal=common.length===1?common[0]:null,nearby=portal?near(atPortal.get(portalKey(portal))||[],rows[0].time,POLICY.flipWindowMs):[],manualRows=nearby.filter(manual),names=[...new Set(manualRows.map(e=>canonical(e.player)))],sameTimeHumans=nearby.filter(e=>!system(e)&&e.time===rows[0].time&&direct(e)),device=portal?(atPortal.get(portalKey(portal))||[]).filter(e=>e.action==='vrbb'&&e.time<rows[0].time):[];
   const flip={id:'system-change:'+id,time:rows[0].time,portal,state:portal&&names.length===1?'supported-manual':'unassigned',mechanism:portal&&names.length===1?'explicit-human-item-use':device.length?'autonomous-or-unknown':'manual-or-autonomous-unknown',operator:portal&&names.length===1?manualRows[0].player:null,operatorAttribution:portal&&names.length===1?'inferred-unique-explicit-item-corroboration':'unresolved',sourceGuids:rows.map(e=>e.guid),operatorEvidence:provenance(manualRows),sameTimeHumanCandidates:provenance(sameTimeHumans),deviceEvidence:provenance(device),reason:!portal?'unresolved-portal':names.length>1?'conflicting-operator-evidence':names.length===0?'system-record-has-no-human-operator':'supported',rawRowsRetained:true};flips.push(flip);for(const e of rows)byGuid.get(e.guid).flip=flip;
  }
  const playerCache=new Map();function forPlayer(name){const key=canonical(name);if(playerCache.has(key))return playerCache.get(key);const result=events.filter(e=>!system(e)&&canonical(e.player)===canonical(name)).map(e=>{const info=byGuid.get(e.guid),flip=manual(e)?flips.find(f=>f.state==='supported-manual'&&canonical(f.operator)===canonical(name)&&f.operatorEvidence.some(s=>s.guid===e.guid)):null;return {...e,attackAssociation:info?.attack||null,...(manual(e)?{analysisConstraint:{kind:'manual-flip',radius:40,portal:e.portals[0],rawIds:[...new Set([e.guid,...(flip?.sourceGuids||[])])],attribution:'explicit-human-item-record',time:e.time,mechanism:'manual-item',occurrence:flip?.id||e.guid}}:{})};});playerCache.set(key,result);return result;}
  return {byGuid,flips,forPlayer,policy:POLICY};
 }
 return {POLICY,resolve,portalKey,fullText,manual};
}

/* Presentation-only evidence. Never mutates source records or inference constraints. */
function createTrackerPresentation(distance){
 const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;
 const key=p=>valid(p?.position)?p.position.join(','):null,canonical=n=>String(n||'').trim().toLowerCase();
 function role(value){const v=String(value||'').trim().toUpperCase();return ['RES','RESISTANCE'].includes(v)?'RES':['ENL','ENLIGHTENED'].includes(v)?'ENL':v==='MACHINA'?'MACHINA':v==='NIA'?'NIA':'OTHER';}
 function faction(e){const rows=(e.markup||[]).filter(m=>m[0]==='FACTION'),known=new Set(rows.map(m=>role(m[1]?.team||m[1]?.plain)));return known.size===1?[...known][0]:'OTHER';}
 function length(e){if(!['linked','destroyedLink'].includes(e.action))return null;if(e.portals?.length!==2||!e.portals.every(p=>valid(p.position)))return {state:'unknown'};const m=distance(e.portals[0].position,e.portals[1].position);return Number.isFinite(m)?{state:'known',meters:m,text:m<1000?m.toFixed(1)+' m':(m/1000).toFixed(3)+' km'}:{state:'unknown'};}
 function counts(views){const members=new Map();for(const v of views){const n=canonical(v.name||v.player);if(n&&!['__ada__','__jarvis__'].includes(n)&&!members.has(n))members.set(n,v);}const result={total:members.size,RES:0,ENL:0,MACHINA:0,NIA:0,OTHER:0};for(const v of members.values())result[['RES','ENL','MACHINA','NIA','OTHER'].includes(v.role)?v.role:role(v.team)]++;return result;}
 function eventAction(e){if(e.action!=='unknown'||!['__ada__','__jarvis__'].includes(canonical(e.player)))return e.action;const shape=(e.markup||[]).map(m=>m[0]==='PLAYER'?' @ ':m[0]==='PORTAL'?' # ':m[0]==='FACTION'?'':m[0]==='TEXT'?m[1]?.plain||'':' ? ').join('').replace(/\s+/g,' ').trim();return /^(?:Agent )?@ destroyed (?:the |a |an )?Control Field @ # -[0-9,.]+ MUs?$/i.test(shape)?'destroyedField':e.action;}
 function flips(events,evidence,conflicts=[]){const blocked=new Set(conflicts.map(c=>c.guid)),rows=new Map(events.map(e=>[e.guid,e])),candidates=[];
  // Explicit human item use is positive evidence. Nearby human activity alone is not.
  for(const e of events)if(evidence.manual(e)&&!blocked.has(e.guid)){const supported=evidence.resolveResult?.flips?.find(f=>f.state==='supported-manual'&&f.operatorEvidence.some(s=>s.guid===e.guid));const ids=[...new Set([e.guid,...(supported?.sourceGuids||[])])];if(ids.some(id=>blocked.has(id)))continue;candidates.push({id:'manual:'+e.guid,time:e.time,portal:e.portals[0],operator:e.player,mechanism:'explicit-human-item-use',rule:'explicit-item-use',sourceGuids:ids,representative:e.guid});}
  const groups=new Map();for(const e of events)if(['__ada__','__jarvis__'].includes(canonical(e.player))){const id=canonical(e.player)+'|'+e.time;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e);}
  for(const [id,group]of groups){const fields=group.filter(e=>eventAction(e)==='destroyedField'&&e.portals?.length===1&&key(e.portals[0])),targets=new Map(fields.map(e=>[key(e.portals[0]),e.portals[0]]));
   for(const [target,portal]of targets){const cf=fields.filter(e=>key(e.portals[0])===target),links=group.filter(e=>e.action==='destroyedLink'&&e.portals?.length===2&&e.portals.every(p=>valid(p.position))&&e.portals.some(p=>key(p)===target));if(new Set(links.map(e=>e.portals.map(key).sort().join('|'))).size<2)continue;const sources=links.concat(cf),factions=new Set(sources.map(faction));if(factions.size!==1||factions.has('OTHER')||sources.some(e=>blocked.has(e.guid)))continue;
    // Distinct Portal cascades at the same millisecond must not share a raw Link.
    if(links.some(e=>e.portals.filter(p=>targets.has(key(p))).length>1))continue;
    const ancillary=group.filter(e=>['neutralized','destroyedResonator','captured'].includes(e.action)&&e.portals?.length===1&&key(e.portals[0])===target&&!blocked.has(e.guid));const ids=sources.concat(ancillary).map(e=>e.guid).sort();const manual=candidates.filter(c=>c.operator&&key(c.portal)===target&&Math.abs(c.time-group[0].time)<=2000);if(manual.length>1)continue;if(manual.length===1){manual[0].sourceGuids=[...new Set(manual[0].sourceGuids.concat(ids))];manual[0].rule+=' + corroborated-system-cascade';continue;}if(candidates.some(c=>c.sourceGuids.some(i=>ids.includes(i))))continue;
    candidates.push({id:'system:'+id+'|'+target,time:group[0].time,portal,operator:null,mechanism:'unknown',systemActor:group[0].player,rule:'system-two-links-and-field-common-target-consistent-object-faction',objectFaction:[...factions][0],sourceGuids:ids,representative:cf.map(e=>e.guid).sort()[0]});
   }
  }const byGuid=new Map();for(const c of candidates)for(const id of c.sourceGuids)byGuid.set(id,c);return {occurrences:candidates,byGuid,rows};
 }
 function fold(items,resolution,options={}){const result=[],added=new Set(),itemMap=new Map(items.map(i=>[i.event.guid,i]));for(const item of items){const f=resolution.byGuid.get(item.event.guid);if(!f){result.push(item);continue;}if(added.has(f.id))continue;added.add(f.id);const available=new Map(f.sourceGuids.filter(id=>itemMap.has(id)).map(id=>[id,itemMap.get(id)]));if(options.player&&canonical(f.operator)===canonical(options.player))for(const id of f.sourceGuids){const e=resolution.rows.get(id);if(e&&(!options.accept||options.accept(e)))available.set(id,{event:e,portal:f.portal});}const children=[...available.values()].sort((a,b)=>a.event.time-b.event.time||a.event.guid.localeCompare(b.event.guid));result.push({...item,event:resolution.rows.get(f.representative)||item.event,portal:f.portal,flip:f,batch:children});}return result;}
 function age(time,T,hours,enabled,floor=.30){return enabled?Math.max(floor,Math.min(1,1-(T-time)/(hours*3600000))):1;}
 return {valid,key,role,faction,length,counts,flips,fold,age,eventAction};
}

/* Display-only colors and per-Portal counts. No estimator or raw-record mutation. */
function createTrackerDisplay(core){
 const palettes=Object.freeze({RES:Object.freeze(['#d45cff']),ENL:Object.freeze(['#ffed32'])});
 const canonical=n=>String(n||'').trim().toLowerCase();
 function playerColor(name,role,fallback){return role==='RES'?'#d45cff':role==='ENL'?'#ffed32':fallback;}
 function relation(e,target,key,parseLink){if(e.action!=='linked')return null;const link=parseLink(e);if(!link?.directed)return 'undirected';return key(link.origin)===target?'outgoing':key(link.destination)===target?'incoming':'unrelated';}
 function portalStats(events,target,key,parseLink,eventAction=e=>e.action,displayCount=events.length){const rows=[...new Map(events.map(e=>[e.guid,e])).values()].sort((a,b)=>a.time-b.time||String(a.guid).localeCompare(String(b.guid))),actors=new Map(),categories={},relations={incoming:0,outgoing:0,undirected:0};let systemCount=0;for(const e of rows){const action=eventAction(e);categories[action]=(categories[action]||0)+1;const r=relation(e,target,key,parseLink);if(r in relations)relations[r]++;if(core.isSystem(e)){systemCount++;continue;}const id=canonical(e.player),previous=actors.get(id);actors.set(id,{name:e.player,role:core.role(e),count:(previous?.count||0)+1,lastTime:e.time});}const attributes={RES:0,ENL:0,MACHINA:0,NIA:0,OTHER:0};for(const a of actors.values())attributes[a.role]++;return {rawCount:rows.length,displayCount,systemCount,uniqueAccounts:actors.size,uniquePlayers:attributes.RES+attributes.ENL,attributes,categories,relations,actors:[...actors.values()]};}
 return {palettes,playerColor,relation,portalStats};
}

/* Owns the temporary live pause for all map-history operations. */
function createTrackerHistorySession(env){
 let saved=null,leases=new Set(),serial=0;
 function persist(){env.save?.(saved?{...saved}:null);}
 function acquire(){if(!saved){saved={auto:env.live(),observation:env.observation()};env.setLive(false);env.freeze();persist();}const id=++serial;leases.add(id);env.change?.();return id;}
 function release(id){if(!leases.delete(id)||leases.size)return;const s=saved;saved=null;persist();env.setLive(s.auto);env.restore(s.observation,s.auto);env.change?.();}
 function choice(on){if(saved){saved.auto=!!on;persist();env.setLive(false);}else env.setLive(!!on);env.change?.();}
 function reset(){if(saved){const s=saved;leases.clear();saved=null;persist();env.setLive(s.auto);env.restore(s.observation,s.auto);env.change?.();}}
 function recover(s){if(!s||typeof s.auto!=='boolean'||typeof s.observation?.live!=='boolean')return false;env.setLive(s.auto);env.restore(s.observation,s.auto);env.save?.(null);env.recovered?.();return true;}
 return {acquire,release,choice,reset,recover,snapshot:()=>({active:!!saved,leases:leases.size,restoreAuto:saved?.auto??null})};
}

/* Adapted internally from COMM Capture 0.1.0-dev.2 IITC preview.
 * See third-party/comm-capture-dev2 and CAPTURE-ATTRIBUTION.md. Upstream
 * notices/rights are retained; this port does not grant an upstream MIT license.
 */
function createTrackerCapture(env){
 'use strict';
 const clone=v=>v==null?v:JSON.parse(JSON.stringify(v)),now=()=>env.now?.()??Date.now(),iso=()=>new Date(now()).toISOString();
 let bundle=null,running=false,cancelled=false,handle=null,wake=null,cancelRequest=null;
 const plugin={VERSION:env.version,SCHEMA_VERSION:'1.0.0',FORMAT_CAPTURE:'ingress-comm-capture',cloneJson:clone,makeCaptureId:()=>env.id?.()||'echotrace-capture-'+now()};
 function changed(){env.change?.(snapshot());}
 function snapshot(){return {range:bundle?{...bundle.capture.requestedTimeRange}:null,running,cancelRequested:cancelled,state:bundle?.completion.state||'idle',pages:bundle?.pages.length||0,reason:bundle?.completion.reason||null,summary:bundle?.summary||null};}
 function sleep(ms){return new Promise(resolve=>{const id=setTimeout(()=>{wake=null;resolve();},ms);wake=()=>{clearTimeout(id);wake=null;resolve();};});}
 // The upstream summary is inserted below; raw page responses remain authoritative.
   plugin.extractResult = function (response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.result)) return response.result;
    return [];
  };
  plugin.rowInRange = function (row, startMs, endMs) {
    const timestamp = Array.isArray(row) ? row[1] : null;
    return Number.isFinite(timestamp) && timestamp >= startMs && timestamp <= endMs;
  };
  plugin.buildSummary = function (bundle) {
    const range = bundle.capture.requestedTimeRange;
    const guids = new Map();
    const summary = {
      rawRecords: 0, inRangeRecords: 0, uniqueInRangeGuids: 0,
      duplicateInRangeOccurrences: 0, conflictingGuids: 0,
      plextTypes: {}, categories: {}, markupTypes: {}, perTab: {},
    };
    const increment = (object, key) => {
      const normalized = String(key == null ? '<missing>' : key);
      Object.defineProperty(object,normalized,{value:(Object.hasOwn(object,normalized)?object[normalized]:0)+1,writable:true,enumerable:true,configurable:true});
    };

    for (const page of bundle.pages) {
      const rows = plugin.extractResult(page.response);
      summary.rawRecords += rows.length;
      if (!summary.perTab[page.tab]) summary.perTab[page.tab] = { rawRecords: 0, inRangeRecords: 0, uniqueGuids: 0 };
      summary.perTab[page.tab].rawRecords += rows.length;
      rows.forEach((row) => {
        if (!plugin.rowInRange(row, range.startMs, range.endMs)) return;
        summary.inRangeRecords += 1;
        summary.perTab[page.tab].inRangeRecords += 1;
        if (!guids.has(row[0])) guids.set(row[0], new Set());
        guids.get(row[0]).add(JSON.stringify(row));
        const plext = row[2] && row[2].plext ? row[2].plext : {};
        increment(summary.plextTypes, plext.plextType);
        increment(summary.categories, plext.categories);
        for (const markup of Array.isArray(plext.markup) ? plext.markup : []) {
          increment(summary.markupTypes, Array.isArray(markup) ? markup[0] : '<invalid>');
        }
      });
    }

    for (const tab of Object.keys(summary.perTab)) {
      const tabGuids = new Set();
      for (const page of bundle.pages.filter((item) => item.tab === tab)) {
        for (const row of plugin.extractResult(page.response)) if (plugin.rowInRange(row, range.startMs, range.endMs)) tabGuids.add(row[0]);
      }
      summary.perTab[tab].uniqueGuids = tabGuids.size;
    }
    summary.uniqueInRangeGuids = guids.size;
    summary.duplicateInRangeOccurrences = summary.inRangeRecords - guids.size;
    summary.conflictingGuids = Array.from(guids.values()).filter((variants) => variants.size > 1).length;
    return summary;
  };
 function finish(state,reason){bundle.capture.completedAt=iso();bundle.completion.state=state;bundle.completion.reason=reason;const s=bundle.completion.tabs.all;s.state=state;s.reason=reason;bundle.summary=plugin.buildSummary(bundle);running=false;handle=null;cancelRequest=null;changed();return clone(bundle);}
 function cancel(reason='user-cancelled'){if(!running)return false;cancelled=true;bundle.completion.reason=reason;wake?.();cancelRequest?.();changed();return true;}
 async function request(query,page,delayMs){return new Promise(resolve=>{let done=false;const settle=(data,error)=>{if(done)return;done=true;cancelRequest=null;handle=null;page.respondedAt=iso();if(data!==undefined&&data!==null)page.response=clone(data);if(error)page.error={kind:String(error.kind||'transport'),status:Number.isFinite(error.status)?error.status:null,retryAfterMs:Math.max(0,Number(error.retryAfterMs)||0)};resolve({data,error});};cancelRequest=()=>{handle?.abort?.();settle(null,{kind:'user-cancelled'});};const h=env.send(query,d=>settle(d,null),e=>settle(null,e),{purpose:'capture',generation:env.generation?.(),tier:delayMs,onRawResponse:d=>{if(!done)page.response=clone(d);}});if(!done)handle=h;});}
 async function start(options){if(running)throw Error('capture-running');const {startMs,endMs}=options,bounds=clone(options.bounds),delayMs=options.delayMs??1200,maxPagesPerTab=options.maxPagesPerTab??100,maxRetries=options.maxRetries??2;
  if(!Number.isSafeInteger(startMs)||!Number.isSafeInteger(endMs)||startMs>=endMs||endMs>now()||!Number.isInteger(delayMs)||delayMs<800||delayMs>3600000||!Number.isInteger(maxPagesPerTab)||maxPagesPerTab<1||maxPagesPerTab>500||!Number.isInteger(maxRetries)||maxRetries<0||maxRetries>2||options.tabs&&JSON.stringify(options.tabs)!=='["all"]'||!bounds||Object.keys(bounds).sort().join(',')!=='maxLatE6,maxLngE6,minLatE6,minLngE6'||!Object.values(bounds).every(Number.isSafeInteger))throw Error('invalid-capture-options');
  bundle={format:plugin.FORMAT_CAPTURE,schemaVersion:plugin.SCHEMA_VERSION,generator:{id:'iitc.plugin.playerTrackerChatGPT',name:'EchoTrace by khresist / adapted COMM Capture dev.2',version:env.version},capture:{id:plugin.makeCaptureId(),source:env.source||'https://intel.ingress.com/intel',startedAt:iso(),completedAt:null,timezoneOffsetMinutes:-new Date(now()).getTimezoneOffset(),requestedTimeRange:{startMs,endMs,startIso:new Date(startMs).toISOString(),endIso:new Date(endMs).toISOString()},mapBoundsE6:clone(bounds),options:{tabs:['all'],requestDelayMs:delayMs,maxPagesPerTab,maxRetries,requestMode:'sequential',transport:'iitc-postAjax'}},completion:{state:'running',reason:null,warnings:[],tabs:{all:{state:'running',reason:null,pages:0,rawRecords:0,inRangeRecords:0,firstTimestampMs:null,lastTimestampMs:null}}},pages:[],summary:null};running=true;cancelled=false;changed();let cursor={time:endMs,guid:''},seen=new Set(),retries=0,successful=0;
  try{while(running){if(cancelled)return finish('cancelled',bundle.completion.reason||'user-cancelled');const query={...bounds,minTimestampMs:-1,maxTimestampMs:cursor.time,tab:'all',plextContinuationGuid:cursor.guid},page={tab:'all',pageIndex:bundle.pages.length+1,requestedAt:iso(),respondedAt:null,request:clone(query),response:null,error:null};bundle.pages.push(page);changed();const {data,error}=await request(query,page,delayMs);
    if(cancelled)return finish('cancelled',bundle.completion.reason||'user-cancelled');
    if(error){const retryable=!['authentication','identity','malformed','superseded','stopped'].includes(error.kind)&&(!error.status||error.status===429||error.status>=500);if(retryable&&retries<maxRetries){retries++;bundle.completion.reason='retry';changed();await sleep(Math.max(delayMs,[2000,5000][retries-1],Number(error.retryAfterMs)||0));continue;}return finish('failed','request-error');}
    if(!data||!Array.isArray(data.result)||data.error){page.error={kind:'invalid-response'};return finish('failed','invalid-response');}
    retries=0;successful++;const rows=data.result,status=bundle.completion.tabs.all;status.pages++;status.rawRecords+=rows.length;status.inRangeRecords+=rows.filter(r=>plugin.rowInRange(r,startMs,endMs)).length;for(const r of rows)if(Number.isSafeInteger(r?.[1])){status.firstTimestampMs=Math.max(status.firstTimestampMs??-Infinity,r[1]);status.lastTimestampMs=Math.min(status.lastTimestampMs??Infinity,r[1]);}changed();
    if(!rows.length)return finish('complete','empty-result');const last=rows.at(-1),key=JSON.stringify([last?.[0],last?.[1]]);
    if(rows.some(r=>!Array.isArray(r)||typeof r[0]!=='string'||!r[0]||r[0].length>2048||!Number.isSafeInteger(r[1]))||last[1]>cursor.time)return finish('partial','invalid-page-cursor');
    if(seen.has(key))return finish('partial','repeated-page-cursor');seen.add(key);cursor={time:last[1],guid:last[0]};
    if(cursor.time<startMs)return finish('complete','reached-start-time');if(successful>=maxPagesPerTab)return finish('partial','max-pages-reached');await sleep(delayMs);
  }}catch(_){return finish(cancelled?'cancelled':'failed',cancelled?'user-cancelled':'unexpected-error');}
 }
 return {start,cancel,snapshot,bundle:()=>clone(bundle),dispose:()=>cancel('disposed')};
}

/* Shared structured COMM semantics. Pure; raw markup is never rewritten. */
function parseTrackerLink(e) {
  const m=e.markup||[], actors=m.filter(x=>x[0]==='PLAYER');
  if(actors.length!==1||actors[0][1]?.plain!==e.player||!['linked','destroyedLink'].includes(e.action)||e.portals?.length!==2||!e.portals.every(p=>p.position?.every(Number.isFinite)))return null;
  const shape=m.map(x=>x[0]==='PLAYER'?' @ ':x[0]==='PORTAL'?' # ':x[0]==='TEXT'?x[1]?.plain||'':x[0]==='FACTION'?'':' ? ').join('').replace(/\s+/g,' ').trim();
  if(e.action==='destroyedLink'&&/^(?:agent )?@ destroyed (?:a |the |an )?Link (?:from |between )?# (?:to|and) #$/i.test(shape))return {directed:false,destroyed:true,endpoints:e.portals};
  if(/^(?:agent )?@ linked(?: from)? # to #$/i.test(shape))return {directed:true,origin:e.portals[0],destination:e.portals[1],endpoints:e.portals};
  if(/^(?:agent )?@ linked (?:between )?# (?:and|with) #$/i.test(shape))return {directed:false,endpoints:e.portals};
  return null;
}
// Shared actor-location evidence. Object geometry never implies actor travel.
function parseTrackerInteraction(e, linkParser=parseTrackerLink) {
  if(parseTrackerSystem(e))return null;
  const text=String(e.text||'').replace(/\s+/g,' ').trim();let rule,portal;
  if(e.action==='linked'){rule='directed-link-origin';const link=linkParser(e);portal=link?.directed?link.origin:null;}
  else if(e.action==='flip'&&/^(?:agent )?used (?:an? |the )?(?:ADA Refactor|JARVIS Virus) (?:on|at)$/i.test(text))rule='manual-item-interaction';
  else if(e.action==='captured'&&/^(?:agent )?captured$/i.test(text))rule='capture-portal';
  else if(e.action==='deployed'&&/^(?:agent )?deployed (?:a |the )?Resonator on$/i.test(text))rule='deploy-resonator-portal';
  else if(e.action==='upgraded'&&/^(?:agent )?upgraded (?:a |the )?Resonator on$/i.test(text))rule='upgrade-resonator-portal';
  else if(['beacon','battleBeacon','rbb','vrbb','fracker'].includes(e.action)){
    const shape=(e.markup||[]).map(x=>x[0]==='PLAYER'?' @ ':x[0]==='PORTAL'?' # ':x[0]==='TEXT'?x[1]?.plain||'':' ? ').join('').replace(/\s+/g,' ').trim();
    const names={beacon:'Beacon',battleBeacon:'Battle Beacon',rbb:'Rare Battle Beacon',vrbb:'Very Rare Battle Beacon',fracker:'Portal Fracker'};
    if(shape.toLowerCase()!=='@ deployed a '+names[e.action].toLowerCase()+' on #')return null;
    rule='device-placement-portal';
  } else return null;
  const actors=(e.markup||[]).filter(m=>m?.[0]==='PLAYER');
  if(actors.length!==1||actors[0][1]?.plain!==e.player)return {rule,reason:'ambiguous-actor'};
  if(!['linked','destroyedLink'].includes(e.action))portal=e.portals?.length===1?e.portals[0]:null;
  if(!portal)return {rule,reason:e.action==='linked'?'unresolved-link-origin':'ambiguous-portals'};
  const p=portal.position;
  if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>90||Math.abs(p[1])>180)return {rule,reason:'no-coordinate'};
  return {rule,position:p.slice(),portal,reason:null};
}
function parseTrackerDevice(markup){
  const actors=markup.filter(x=>x?.[0]==='PLAYER'),portals=markup.filter(x=>x?.[0]==='PORTAL');
  const shape=markup.map(x=>x[0]==='PLAYER'?' @ ':x[0]==='PORTAL'?' # ':x[0]==='FACTION'?' $ ':x[0]==='TEXT'?x[1]?.plain||'':' ? ').join('').replace(/\s+/g,' ').trim();
  if(actors.length===1&&portals.length===1){const match=/^@ deployed (?:a )?(Very Rare Battle Beacon|Rare Battle Beacon|Battle Beacon|Beacon|Portal Fracker|Fireworks) on #$/i.exec(shape);if(match)return {action:({'very rare battle beacon':'vrbb','rare battle beacon':'rbb','battle beacon':'battleBeacon',beacon:'beacon','portal fracker':'fracker',fireworks:'fireworks'})[match[1].toLowerCase()],subtype:match[1]};}
  if(!actors.length&&portals.length===1){if(/^\$ won (?:a )?CAT-[IVX]+ Rare Battle Beacon on #$/i.test(shape))return {action:'beaconWinner',system:true};if(/^Rare Battle Beacon will be deployed at the end of the Septicycle.*#$/i.test(shape))return {action:'beaconForecast',system:true};}
  return null;
}

// Exact identities; unsupported templates remain system/unknown, never a human anchor.
function parseTrackerSystem(e){
  const name=String(e?.player||'').trim().toLowerCase();
  if(!['__jarvis__','__ada__'].includes(name))return e?.actorKind==='system'?{identity:'announcement',supported:true,action:e.action}:null;
  const shape=(e.markup||[]).map(x=>x[0]==='PLAYER'?' @ ':x[0]==='PORTAL'?' # ':x[0]==='TEXT'?x[1]?.plain||'':x[0]==='FACTION'?'':' ? ').join('').replace(/\s+/g,' ').trim();
  let action=null;
  if(/^(?:agent )?@ neutralized #$/i.test(shape))action='neutralized';
  else if(/^(?:agent )?@ destroyed (?:a |the )?Resonator on #$/i.test(shape))action='destroyedResonator';
  else if(/^(?:agent )?@ destroyed (?:the |a |an )?Link (?:from |between )?# (?:to|and) #$/i.test(shape))action='destroyedLink';
  else if(/^(?:agent )?@ destroyed (?:the |a |an )?(?:Control )?Field (?:@|at |on |from )?#(?: (?:to|and|,)? #)*(?: ?- ?[0-9,.]+ MUs?)?$/i.test(shape))action='destroyedField';
  else if(/^(?:agent )?@ destroyed (?:the |a |an )?(?:Control )?Field (?:at |on |from )?#(?: (?:to|and|,)? #){0,2}$/i.test(shape))action='destroyedField';
  return {identity:name,supported:!!action,action:action||'unknown'};
}
function parseTrackerNeutralized(markup){
 const shape=markup.map(x=>x[0]==='PLAYER'?' @ ':x[0]==='PORTAL'?' # ':x[0]==='TEXT'?x[1]?.plain||'':' ? ').join('').replace(/\s+/g,' ').trim();
 return /^@ neutralized #$/i.test(shape)?'neutralized':null;
}

/* Local average-displacement assumption. Regions are estimates, not speed bounds or exact positions. MIT. */
function createPositionInference(linkParser,interactionParser){
 'use strict';
 const parseLink=linkParser||(typeof require==='function'?require('./semantics.js'):null),parseInteraction=interactionParser||(typeof require==='function'?require('./semantics.js').interaction:null);
 const eventEvidence=(typeof createTrackerEvidence==='function'?createTrackerEvidence:require('./evidence.js'))();
 const geometry=(typeof createTrackerRegion==='function'?createTrackerRegion:require('./region.js'))();
 const VERSION='local-average-regions-3',DATE='2026-10-16',RADIUS=40,N=64,EARTH=6371008.8;
 const PARAMETERS=Object.freeze({version:VERSION,inactivityMs:360000,referenceMaxAgeMs:360000,referenceMaxSpanMs:360000,localEpisodeGapMs:3000,maxReferenceKmh:1000,metricScale:1.006,sides:N,numericM:.003,maxEffectiveConstraints:128,maxBranches:16,maxProjectionM:25000,maxLatitude:70,windowsPerSlice:4,geometryVertices:20000,maxConsistencyEdges:2048,maximumCandidateKmh:1000,speedToleranceMps:.3,transitionToleranceMps:.5,accelerationMps2:15,curvatureAccelerationMps2:.5});
 // Last five fields preserve existing observed motion/conflict boundaries only.
 // They never generate region radii or a speed/acceleration state envelope.
 function geoDistance(a,b){const r=Math.PI/180,h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return EARTH*2*Math.asin(Math.sqrt(Math.min(1,h)));}
 function isSystem(e){return e.actorKind==='system'||['__ada__','__jarvis__'].includes(String(e.player||'').trim().toLowerCase());}
 function eligibility(e){if(isSystem(e)||!['RES','ENL'].includes(e.role))return {reason:'account-role'};const a=parseInteraction?.(e,parseLink);return a||{reason:['destroyedResonator','destroyedLink','destroyedField','fielded'].includes(e.action)?'event-object-only':'unsupported-action'};}
 function anchor(e){const a=eligibility(e);return a.reason?null:{id:e.guid,rawIds:e.analysisConstraint?.rawIds||[e.guid],actor:e.player,time:e.time,portal:a.portal,position:a.position,radius:RADIUS,source:e.source,rule:VERSION,date:DATE,evidenceRule:a.rule,assumptions:e.analysisConstraint?{kind:'manual-flip',radiusM:40,attribution:e.analysisConstraint.attribution,mechanism:e.analysisConstraint.mechanism,occurrence:e.analysisConstraint.occurrence}:null};}
 function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
 function geometryKey(a){return stable([a.actor,a.time,a.position,a.radius,a.rule,a.assumptions||null]);}
 function collapse(anchors){const m=new Map();for(const a of anchors){const key=geometryKey(a),old=m.get(key);if(old)old.rawIds.push(...(a.rawIds||[a.id]));else m.set(key,{...a,rawIds:[...(a.rawIds||[a.id])]});}return [...m.values()].map(a=>({...a,rawIds:[...new Set(a.rawIds)].sort()})).sort((a,b)=>a.time-b.time||geometryKey(a).localeCompare(geometryKey(b)));}
 function clip(poly,n,b){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],q=poly[(i+1)%poly.length],u=a[0]*n[0]+a[1]*n[1]-b,v=q[0]*n[0]+q[1]*n[1]-b;if(u<=0)out.push(a);if((u<=0)!==(v<=0)){const t=u/(u-v);out.push([a[0]+t*(q[0]-a[0]),a[1]+t*(q[1]-a[1])]);}}return out;}
 function projection(anchors,extentM=Math.max(...anchors.map(a=>a.radius))){const origin=anchors[0].position;if(!Number.isFinite(extentM)||extentM>PARAMETERS.maxProjectionM||anchors.some(a=>Math.abs(a.position[0])>PARAMETERS.maxLatitude||Math.abs(a.position[1]-origin[1])>180||geoDistance(origin,a.position)+a.radius>PARAMETERS.maxProjectionM))throw Error('projection-limit');const lat=origin[0]*Math.PI/180,pad=extentM*1.1*PARAMETERS.metricScale/EARTH*180/Math.PI+.0001,maxLat=Math.max(...anchors.map(a=>Math.abs(a.position[0])))+pad,minLat=Math.max(0,Math.min(...anchors.map(a=>Math.abs(a.position[0])))-pad),k=Math.max(1,Math.cos(lat)/Math.cos(maxLat*Math.PI/180),Math.cos(minLat*Math.PI/180)/Math.cos(lat))*PARAMETERS.metricScale*(1+1e-8);return {origin,k,extentM,project:p=>[EARTH*Math.cos(lat)*(p[1]-origin[1])*Math.PI/180,EARTH*(p[0]-origin[0])*Math.PI/180],unproject:p=>[origin[0]+p[1]/EARTH*180/Math.PI,origin[1]+p[0]/(EARTH*Math.cos(lat))*180/Math.PI]};}
 function activitySegments(events,T=Infinity){const groups=[];for(const e of [...events].sort((a,b)=>a.time-b.time||a.guid.localeCompare(b.guid))){let g=groups.at(-1);if(!g||g.time!==e.time)groups.push(g={time:e.time,events:[],anchors:[]});g.events.push(e);const a=anchor(e);if(a)g.anchors.push(a);}const parts=[];for(const g of groups){if(!parts.length||g.time-parts.at(-1).groups.at(-1).time>=PARAMETERS.inactivityMs)parts.push({reason:parts.length?'activity-gap':null,groups:[]});parts.at(-1).groups.push(g);}for(const p of parts)p.closed=T-p.groups.at(-1).time>=PARAMETERS.inactivityMs;return parts;}
 function transition(a,b,c){const ga=collapse(a.anchors),gb=collapse(b.anchors),gc=c?collapse(c.anchors):[];if(ga.length!==1||gb.length!==1||c&&gc.length!==1)return null;const aa=ga[0],bb=gb[0],cc=gc[0]||null,dt=(b.time-a.time)/1000;if(!aa||!bb||!(dt>0))return null;const lower=Math.max(0,geoDistance(aa.position,bb.position)/PARAMETERS.metricScale-aa.radius-bb.radius)/dt;
  if(lower>PARAMETERS.maximumCandidateKmh/3.6+PARAMETERS.speedToleranceMps)return {reason:'speed-envelope-conflict',lowerMps:lower,shared:false,sourceConflict:true};if(!cc)return null;
  let p;try{p=projection([aa,bb,cc]);}catch(_){return null;}const x=p.project(aa.position),y=p.project(bb.position),z=p.project(cc.position),dt2=(c.time-b.time)/1000;
  const change=Math.hypot((z[0]-y[0])/dt2-(y[0]-x[0])/dt,(z[1]-y[1])/dt2-(y[1]-x[1])/dt),uncertainty=p.k*((aa.radius+bb.radius)/dt+(bb.radius+cc.radius)/dt2),allowed=(p.k*PARAMETERS.accelerationMps2+PARAMETERS.curvatureAccelerationMps2)*(dt+dt2)/2+PARAMETERS.transitionToleranceMps;
  return change-uncertainty>allowed+PARAMETERS.numericM?{reason:'physical-transition',lowerVelocityChangeMps:change-uncertainty,allowedMps:allowed,shared:true,sourceConflict:true}:null;
 }
 function splitMotion(parts){const out=[],conflicts=[];for(const original of parts){let current={...original,groups:[]},trusted=[];out.push(current);for(const g of original.groups){if(g.anchors.length){const prev=trusted.at(-1),before=trusted.at(-2),pair=prev?transition(prev,g):null,triple=before?transition(before,prev,g):null,change=pair||triple;if(change){const boundary=change.shared?prev.time:g.time;conflicts.push({...change,time:boundary,rawIds:[...new Set([...(prev?.events||[]),...g.events].map(e=>e.guid))]});if(change.shared){const index=current.groups.findIndex(q=>q.time===prev.time),tail=current.groups.slice(index);current.groups=current.groups.slice(0,index+1);current.closed=true;current={...original,reason:change.reason,conflict:change,sharedBoundary:boundary,groups:tail};trusted=[prev];}else{current.closed=true;current={...original,reason:change.reason,conflict:change,groups:[]};trusted=[];}out.push(current);}trusted.push(g);}current.groups.push(g);}current.closed=original.closed;}return {parts:out,conflicts};}
  function attackConstraints(events,options={}){
    const R=options.xmpRadius??168,S=40,excluded=[],unique=new Map(),conflicts=new Set();
    for(const e of events){const prior=unique.get(e.guid);if(prior&&stable(prior.raw||prior.identity)!==stable(e.raw||e.identity))conflicts.add(e.guid);else if(!prior)unique.set(e.guid,e);}
    const rows=[...unique.values()],resolved=eventEvidence.resolve(rows),eligible=rows.filter(e=>['destroyedResonator','destroyedLink'].includes(e.action)),byGeometry=new Map();
    if(!Number.isFinite(R)||R<=0||R>2000)return {constraints:[],excluded,reason:'invalid-radius',received:eligible.length};
    for(const e of eligible){const actors=(e.markup||[]).filter(m=>m[0]==='PLAYER'),info=e.attackAssociation||resolved.byGuid.get(e.guid)?.attack;
      let reason=conflicts.has(e.guid)?'duplicate-guid-conflict':isSystem(e)||!['RES','ENL'].includes(e.role)?'account-role':actors.length!==1||actors[0][1]?.plain!==e.player?'ambiguous-actor':null;
      if(e.action==='destroyedResonator'&&!/^(?:agent\s+)?destroyed\s+(?:a|the)?\s*Resonator\s+on$/i.test(String(e.text).trim()))reason=reason||'unsupported-destruction';
      let targets=e.action==='destroyedLink'?(info?.state==='supported'?[info.portal]:(e.portals||[])):e.portals;
      if(!targets?.length||targets.some(p=>!validPosition(p?.position))||e.action==='destroyedResonator'&&targets.length!==1||e.action==='destroyedLink'&&targets.length>2)reason=reason||'ambiguous-portals';
      if(reason){excluded.push({guid:e.guid,reason});continue;}
      const proof=e.raw?.[2]?.eventTimeTargetEvidence,known=proof?.time===e.time&&proof?.targetIdentity&&typeof proof.source==='string'&&Array.isArray(proof.positions)&&proof.positions.length&&proof.positions.every(validPosition);
      const exactMechanism=proof?.time===e.time?String(proof.mechanism||''):'';
      if(/ADA|Jarvis|VRBB|flip|refactor|ultra\s*strike/i.test(exactMechanism)){excluded.push({guid:e.guid,reason:'explicit-non-xmp-mechanism'});continue;}
      if(known)targets=proof.positions.map(position=>({position}));
      const ids=[...new Set([e.guid,...(info?.state==='supported'?info.sourceGuids||[]:[])])],choices=collapse(targets.map((portal,index)=>({id:e.guid,rawIds:ids,actor:e.player,time:e.time,portal,position:portal.position.slice(),radius:R+(known?0:S),source:e.source,rule:VERSION,date:DATE,alternative:index,assumptions:{kind:'attack',scenario:'XMP hypothesis',mechanism:exactMechanism==='XMP'?'event-time XMP evidence':'unverified XMP assumption',attackRadiusM:R,resonatorOffsetM:known?0:S,targetAssociation:info?.state||'reported-resonator-target',alternatives:targets.length>1,profile:'legacy-community-2024-06-06',profileDate:'2024-06-06',targetIdentity:known?proof.targetIdentity:null}})));
      const key=stable(choices.map(a=>[a.actor,a.time,a.position,a.radius,a.assumptions]));const prior=byGeometry.get(key);if(prior)for(let i=0;i<prior.length;i++)prior[i].rawIds=[...new Set(prior[i].rawIds.concat(choices[i].rawIds))].sort();else byGeometry.set(key,choices);
    }
    return {constraints:[...byGeometry.values()],excluded,received:eligible.length,rawEligibleIds:eligible.filter(e=>!excluded.some(x=>x.guid===e.guid)).map(e=>e.guid)};
  }
 function validPosition(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;}

 function spatialValidity(anchors,P,deadline){for(const time of [...new Set(anchors.map(a=>a.time))]){const disks=anchors.filter(a=>a.time===time).map(a=>({...a,c:P.project(a.position),r:a.radius/P.k-PARAMETERS.numericM}));if(disks.some(a=>a.r<=0))return {state:'unresolved'};const candidates=disks.map(a=>a.c);
  for(let i=0;i<disks.length;i++)for(let j=0;j<i;j++){if(Date.now()>deadline)throw Error('budget');const a=disks[i],b=disks[j],geodesic=geoDistance(a.position,b.position)/PARAMETERS.metricScale;if(geodesic>a.radius+b.radius+.00001)return {state:'conflict',certificate:{method:'geodesic-disjoint-disks',distanceM:geodesic,radiusSumM:a.radius+b.radius}};if(geodesic>=a.radius+b.radius-2*PARAMETERS.numericM)return {state:'unresolved'};const d=Math.hypot(b.c[0]-a.c[0],b.c[1]-a.c[1]);if(d>0&&d<=a.r+b.r&&d>=Math.abs(a.r-b.r)){const x=(a.r*a.r-b.r*b.r+d*d)/(2*d),h=Math.sqrt(Math.max(0,a.r*a.r-x*x)),v=[(b.c[0]-a.c[0])/d,(b.c[1]-a.c[1])/d],m=[a.c[0]+v[0]*x,a.c[1]+v[1]*x];candidates.push([m[0]-v[1]*h,m[1]+v[0]*h],[m[0]+v[1]*h,m[1]-v[0]*h]);}}
  if(!candidates.some(q=>{const point=P.unproject(q);return disks.every(a=>geoDistance(point,a.position)<=a.radius+1e-7);}))return {state:'unresolved'};
 }return {state:'possible'};}

 function failure(reason){return {state:['budget','constraint-limit','alternative-limit','geometry-limit','consistency-limit'].includes(reason)?'limited':['numeric','projection-limit','degenerate-region','interior-unresolved','worker-error','worker-unavailable'].includes(reason)?'unavailable':reason==='conflicting-local-constraints'?'conflict':'unresolved',reason};}
 function rateFormula(distanceM,dtMs){if(!Number.isFinite(distanceM)||distanceM<0||!Number.isFinite(dtMs)||dtMs<=0)return {state:'unavailable',reason:'invalid-interval'};const dtSeconds=dtMs/1000,mps=distanceM/dtSeconds;if(!Number.isFinite(mps))return {state:'unavailable',reason:'numeric'};return {state:'valid',distanceM,dtMs,dtSeconds,mps,kmh:3.6*mps};}
 function travelAllowance(vMps,dtMs,radiusM=0){if(!Number.isFinite(vMps)||vMps<0||!Number.isFinite(dtMs)||dtMs<0||!Number.isFinite(radiusM)||radiusM<0)return {state:'unavailable',reason:'invalid-interval'};const distanceM=vMps*dtMs/1000;return {state:'valid',distanceM,radiusM:radiusM+distanceM,dtMs};}
 function vectorBC(a,b,c){if(!(c.time>b.time)||!(b.time>=a.time))return {state:'unavailable',reason:'invalid-interval'};try{const P=projection([a,b,c].map(x=>({...x,radius:40}))),A=P.project(a.position),B=P.project(b.position),C=P.project(c.position),AB=B.map((x,i)=>x-A[i]),AC=C.map((x,i)=>x-A[i]),BC=AC.map((x,i)=>x-AB[i]);return {...rateFormula(Math.hypot(...BC),c.time-b.time),vectorBC:BC,method:'coordinate-vector-subtraction',netAC:rateFormula(Math.hypot(...AC),c.time-a.time),AB:rateFormula(Math.hypot(...AB),b.time-a.time)};}catch(e){return {state:'unavailable',reason:e.message};}}
 function scalarBC(vAC,dtACms,vAB,dtABms,assumption){if(assumption?.sameLineSameDirection!==true)return {state:'unavailable',reason:'scalar-assumption-required'};if(![vAC,vAB,dtACms,dtABms].every(Number.isFinite)||vAC<0||vAB<0||dtACms<=dtABms||dtABms<0)return {state:'unavailable',reason:'invalid-interval'};const displacement=vAC*dtACms/1000-vAB*dtABms/1000;if(displacement<0)return {state:'unavailable',reason:'inconsistent-additive-distance'};return {...rateFormula(displacement,dtACms-dtABms),method:'explicit-same-line-same-direction'};}
 function hull(points){const p=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(p.length<3)throw Error('degenerate-region');const lower=[],upper=[];for(const x of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),x)<=0)lower.pop();lower.push(x);}for(const x of p.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),x)<=0)upper.pop();upper.push(x);}const ring=lower.slice(0,-1).concat(upper.slice(0,-1));return ring.concat([ring[0]]);}
 function circle(center,radius){if(!(radius>0)||!Number.isFinite(radius))throw Error('degenerate-region');return [Array.from({length:N+1},(_,i)=>{const angle=2*Math.PI*((i%N)+.5)/N,r=radius/Math.cos(Math.PI/N);return [center[0]+r*Math.cos(angle),center[1]+r*Math.sin(angle)];})];}
 function convex(ring){let sign=0;for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[(i+1)%(ring.length-1)],c=ring[(i+2)%(ring.length-1)],v=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(v)<1e-8)continue;if(sign&&Math.sign(v)!==sign)return false;sign=Math.sign(v);}return true;}
 function expandSet(set,distanceM,deadline=Infinity){if(!Number.isFinite(distanceM)||distanceM<0)throw Error('numeric');if(distanceM===0)return {set,approximationM:0};const disk=circle([0,0],distanceM)[0].slice(0,-1),pieces=[];
  for(const polygon of set){if(Date.now()>deadline)throw Error('budget');if(polygon.length===1&&convex(polygon[0])){pieces.push([hull(polygon[0].slice(0,-1).flatMap(p=>disk.map(q=>[p[0]+q[0],p[1]+q[1]])))]);continue;}pieces.push(polygon);for(const ring of polygon)for(let i=0;i<ring.length-1;i++){if(Date.now()>deadline)throw Error('budget');pieces.push([hull([ring[i],ring[i+1]].flatMap(p=>disk.map(q=>[p[0]+q[0],p[1]+q[1]])))]);}}
  const result=geometry.union(pieces);if(result.flat(2).length>PARAMETERS.geometryVertices)throw Error('geometry-limit');return {set:result,approximationM:distanceM*(1/Math.cos(Math.PI/N)-1)};
 }
 function eventInterval(events,options){const T=options.T??Date.now(),cutoff=T-(options.hours??3)*3600000,player=options.player||events.find(e=>!isSystem(e)&&['RES','ENL'].includes(e.role))?.player;return {T,cutoff,player,events:[...new Map(events.filter(e=>e.player===player&&!isSystem(e)&&['RES','ENL'].includes(e.role)&&Number.isFinite(e.time)&&e.time<=T&&e.time>=cutoff).map(e=>[e.guid,e])).values()].sort((a,b)=>a.time-b.time||a.guid.localeCompare(b.guid))};}
 function spatialSet(anchors,P,deadline){if(!anchors.length)return null;if(anchors.length>PARAMETERS.maxEffectiveConstraints)throw Error('constraint-limit');const validity=spatialValidity(anchors,P,deadline);if(validity.state==='conflict')throw Error('conflicting-local-constraints');if(validity.state!=='possible')throw Error('degenerate-region');const set=geometry.intersect(anchors.map(a=>circle(P.project(a.position),a.radius*P.k+PARAMETERS.numericM)));if(!set.length)throw Error('conflicting-local-constraints');return set;}
 function pointSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],u=dx*dx+dy*dy?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))):0;return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dy);}
 function distanceBounds(A,B){if(!A.length||!B.length)throw Error('degenerate-region');const pointsA=A.flat(2),pointsB=B.flat(2);let lower=geometry.intersect([A,B]).length?0:Infinity,upper=0;for(const a of pointsA)for(const b of pointsB)upper=Math.max(upper,Math.hypot(a[0]-b[0],a[1]-b[1]));if(lower!==0){for(const p of pointsA)for(const poly of B)for(const r of poly)for(let i=1;i<r.length;i++)lower=Math.min(lower,pointSegment(p,r[i-1],r[i]));for(const p of pointsB)for(const poly of A)for(const r of poly)for(let i=1;i<r.length;i++)lower=Math.min(lower,pointSegment(p,r[i-1],r[i]));}return {lowerM:lower,upperM:upper};}
 function endpointReference(a,b){const dtMs=b.time-a.time,aa=collapse(a.spatialAnchors||a.anchors),bb=collapse(b.spatialAnchors||b.anchors),ids=[...new Set(aa.concat(bb).flatMap(a=>a.rawIds))];if(!(dtMs>0)||dtMs>=PARAMETERS.referenceMaxSpanMs)return {state:'unavailable',reason:dtMs>0?'stale-reference':'invalid-interval',fromTime:a.time,toTime:b.time,rawIds:ids};
  try{const P=projection(aa.concat(bb));
   if(aa.length===1&&bb.length===1){const ap=aa[0].portal,bp=bb[0].portal,same=(ap?.guid||ap?.portalGuid)&&(ap?.guid||ap?.portalGuid)===(bp?.guid||bp?.portalGuid),D=geoDistance(aa[0].position,bb[0].position),rate=rateFormula(D,dtMs),interval={lowerMps:Math.max(0,D-aa[0].radius-bb[0].radius)/rate.dtSeconds,upperMps:(D+aa[0].radius+bb[0].radius)/rate.dtSeconds};const common={...rate,fromTime:a.time,toTime:b.time,rawIds:ids,kind:'source-center-average-displacement',uncertainty:interval,instantaneous:false};if(same||D<=PARAMETERS.numericM)return {...common,state:'unavailable',reason:'repeated-local-interaction'};if(D<=aa[0].radius+bb[0].radius+PARAMETERS.numericM)return {...common,state:'unavailable',reason:'overlapping-interaction-sets',mps:undefined,kmh:undefined,centerChangeMps:rate.mps,centerChangeKmh:rate.kmh};if(rate.kmh>PARAMETERS.maxReferenceKmh)return {...common,state:'unavailable',reason:'anomalous-reference'};return common;
   }
   const A=spatialSet(aa,P,Infinity),B=spatialSet(bb,P,Infinity);if(!A||!B)return {state:'unavailable',reason:'missing-spatial-context'};const d=distanceBounds(A,B),lowerMps=d.lowerM/P.k/(dtMs/1000),upperMps=d.upperM*P.k/(dtMs/1000),common={fromTime:a.time,toTime:b.time,dtMs,dtSeconds:dtMs/1000,rawIds:ids,kind:'feasible-endpoint-set-interval',fromLocalEpisode:a.localEpisode||null,toLocalEpisode:b.localEpisode||null,uncertainty:{lowerMps,upperMps},instantaneous:false};if(lowerMps<=PARAMETERS.numericM)return {...common,state:'unavailable',reason:'overlapping-interaction-sets'};if(!Number.isFinite(upperMps)||upperMps*3.6>PARAMETERS.maxReferenceKmh)return {...common,state:'unavailable',reason:'anomalous-reference'};return {...common,state:'valid',mps:upperMps,kmh:upperMps*3.6,referenceAssumption:'bounded local endpoint-rate interval; upper endpoint, not a universal speed bound'};
  }catch(e){return {state:'unavailable',reason:e.message,fromTime:a.time,toTime:b.time,rawIds:ids};}}
 function applicable(ref,t){if(!ref)return null;const ageMs=Math.max(Math.abs(t-ref.fromTime),Math.abs(t-ref.toTime)),r={...ref,ageMs};return ageMs>=PARAMETERS.referenceMaxAgeMs?{...r,state:'unavailable',reason:'stale-reference'}:r;}
 function selectReference(before,after,bracket,t){const pre=applicable(before,t),post=applicable(after,t),valid=[pre,post].filter(r=>r?.state==='valid');if(valid.length===2)return {state:'two-sided',mps:Math.max(pre.mps,post.mps),kmh:3.6*Math.max(pre.mps,post.mps),forward:true,backward:true,refs:[pre,post],excluded:[]};if(valid.length===1){const forward=pre?.state==='valid';return {state:'one-sided',side:forward?'forward':'backward',mps:valid[0].mps,kmh:valid[0].kmh,forward,backward:!forward,refs:valid,excluded:[pre,post].filter(r=>r&&r.state!=='valid')};}
  const direct=applicable(bracket,t),excluded=[pre,post].filter(Boolean);if(direct?.state==='valid'&&!excluded.some(r=>r.reason==='anomalous-reference'||r.reason==='conflicting-local-constraints'))return {state:'bracket-average',mps:direct.mps,kmh:direct.kmh,forward:true,backward:true,refs:[direct],excluded};return {state:'insufficient-context',reason:[pre,post,direct].some(r=>r?.reason==='stale-reference')?'stale-reference':'insufficient-context',refs:[],excluded:excluded.concat(direct?[direct]:[])};
 }
 function localEpisodes(observations){const episodes=[];let current=[];
  const common=groups=>{const time=groups.at(-1).time,anchors=collapse(groups.flatMap(g=>g.anchors.map(a=>({...a,time,sourceTime:a.time}))));try{const P=projection(anchors),set=spatialSet(anchors,P,Infinity);return {anchors,geometry:set.map(poly=>poly.map(r=>r.map(P.unproject)))};}catch(_){return null;}};
  const finish=()=>{if(current.length>=2){const joint=common(current);if(joint){const rawIds=[...new Set(current.flatMap(g=>g.anchors.flatMap(a=>a.rawIds)))],id=stable([VERSION,'local-episode',current.map(g=>g.time),rawIds]);episodes.push({id,startTime:current[0].time,endTime:current.at(-1).time,times:current.map(g=>g.time),rawIds,geometry:joint.geometry,assumption:'nearby local interaction, not proven stationary',jointIntersection:true});for(const g of current){g.localEpisode=id;g.spatialAnchors=joint.anchors.map(a=>({...a,time:g.time,localEpisode:id}));}}}current=[];};
  for(const g of observations){if(!current.length){current=[g];continue;}if(g.time-current.at(-1).time<=PARAMETERS.localEpisodeGapMs&&common(current.concat(g)))current.push(g);else{finish();current=[g];}}finish();return episodes;
 }
 function plan(events,options,xmp){const view=eventInterval(events,options),split={parts:activitySegments(view.events,view.T),conflicts:[]},attack=xmp?attackConstraints(view.events,options):{constraints:[],excluded:[],received:0},attackTimes=new Map(),windows=[],rateReferences=[],episodes=[];for(const choices of attack.constraints){const time=choices[0].time;if(!attackTimes.has(time))attackTimes.set(time,[]);attackTimes.get(time).push(choices);}
  for(const [segmentId,part]of split.parts.entries()){const obs=part.groups.filter(g=>g.anchors.length).map(g=>({...g,anchors:collapse(g.anchors)})),local=localEpisodes(obs),refs=obs.slice(1).map((b,i)=>endpointReference(obs[i],b));episodes.push(...local.map(e=>({...e,segmentId})));rateReferences.push(...refs.map(r=>({...r,segmentId})));let cursor=0;
   for(const group of part.groups){while(cursor<obs.length&&obs[cursor].time<group.time)cursor++;const exact=obs[cursor]?.time===group.time,indices=[];if(exact){if(cursor>0)indices.push(cursor-1);if(cursor+1<obs.length)indices.push(cursor);}else if(cursor>0&&cursor<obs.length)indices.push(cursor-1);else indices.push(cursor===0?-1:obs.length-1);
    const contexts=indices.map(i=>{const B=obs[i]?{...obs[i],anchors:obs[i].spatialAnchors||obs[i].anchors}:null,C=obs[i+1]?{...obs[i+1],anchors:obs[i+1].spatialAnchors||obs[i+1].anchors}:null,episode=local.find(e=>group.time>=e.startTime&&group.time<=e.endTime),priorEpisode=local.filter(e=>e.endTime<=group.time).at(-1),available=r=>r&&priorEpisode&&r.fromTime<priorEpisode.startTime&&r.toTime<=priorEpisode.endTime?{...r,state:'unavailable',reason:'new-local-episode'}:r,pre=available(i>0?refs[i-1]:null),post=available(i+1<refs.length?refs[i+1]:null),bracket=available(B&&C?refs[i]:null);const reference=episode?{state:'nearby-local-activity',reason:'overlapping-interaction-sets',refs:[],excluded:[pre,post,bracket].filter(Boolean),localEpisode:episode.id}:selectReference(pre,post,bracket,group.time);return {B,C,reference,contextId:stable([VERSION,segmentId,B?.time??null,C?.time??null,reference.state,reference.mps??null,reference.forward??false,reference.backward??false,reference.refs.map(r=>[r.fromTime,r.toTime,r.kind])])};});
    // Prefix/suffix use their adjacent post/pre reference, not a missing gap.
    if(!obs.length)contexts.length=0;
    const own=exact?obs[cursor].anchors:[],attacks=attackTimes.get(group.time)||[],needed=collapse(own.concat(contexts.flatMap(c=>[...(c.B?.anchors||[]),...(c.C?.anchors||[])]))),key=stable([VERSION,xmp,PARAMETERS,group.time,group.events.map(e=>[e.guid,e.identity]),own.map(geometryKey),attacks.map(a=>a.map(geometryKey)),contexts.map(c=>[c.contextId,c.reference,c.B?.anchors.map(geometryKey),c.C?.anchors.map(geometryKey)])]);
    windows.push({key,segmentId,closed:part.closed,reason:part.reason,targetTime:group.time,startTime:Math.min(group.time,...needed.map(a=>a.time)),endTime:Math.max(group.time,...needed.map(a=>a.time)),times:[group.time],anchors:own,contextAnchors:needed,attacks,contexts,localEpisode:local.find(e=>group.time>=e.startTime&&group.time<=e.endTime)||null,rawIds:[...new Set(group.events.map(e=>e.guid).concat(needed.flatMap(a=>a.rawIds),contexts.flatMap(c=>c.reference.refs.flatMap(r=>r.rawIds))))],effectiveConstraints:needed.length+attacks.length});
   }
  }return {view,parts:split.parts,conflicts:split.conflicts,attack,windows,base:view.events.map(anchor).filter(Boolean),audit:{received:view.events.length,eligibleAnchors:view.events.filter(anchor).length,equivalentConstraints:collapse(view.events.map(anchor).filter(Boolean)).length,excluded:view.events.filter(e=>!anchor(e)).map(e=>({guid:e.guid,reason:eligibility(e).reason})),rateReferences,xmp:{received:attack.received,eligible:attack.constraints.length,excluded:attack.excluded,reason:attack.reason||null},localEpisodes:episodes}};
 }
 function summarize(set,P,time,support,conditional,movement,rawIds){if(!set.length)throw Error('conflicting-local-constraints');if(set.flat(2).length>PARAMETERS.geometryVertices)throw Error('geometry-limit');const components=set.map((polygon,id)=>{const c=geometry.representative(polygon);return {id,polygon:polygon.map(r=>r.map(P.unproject)),position:P.unproject(c.point),areaCentroid:P.unproject(c.centroid),areaM2:c.areaM2,representativeMethod:c.method};});let diameterM=0;const pts=set.flat(2);for(let i=0;i<pts.length;i++)for(let j=0;j<i;j++)diameterM=Math.max(diameterM,Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1])*P.k+2*PARAMETERS.numericM);return {time,components,polygon:components[0].polygon[0],polygons:components.map(c=>c.polygon),diameterM,areaM2:components.reduce((s,c)=>s+c.areaM2,0),support,conditional,movement,rawIds,certificate:{state:'complete',method:support==='direct'?'direct-event-spatial-union':'local-average-expanded-set-intersection',modelVersion:VERSION,routeCertified:false,sides:N,numericM:PARAMETERS.numericM,metricScale:P.k,approximationM:movement.approximationM||0,localAssumption:support!=='direct'}};}
 function compute(w,xmp,deadline,allowDirectFallback=true){if(w.effectiveConstraints>PARAMETERS.maxEffectiveConstraints){if(allowDirectFallback&&w.anchors.length){const own=compute({...w,contexts:[],contextAnchors:w.anchors,effectiveConstraints:w.anchors.length+w.attacks.length},xmp,deadline,false);if(own.regions)return {...own,precision:'direct-only',contextUnavailable:'constraint-limit',movement:{...own.movement,state:'limited',reason:'constraint-limit'},calculation:{state:'complete',reason:'constraint-limit'}};}return {calculation:failure('constraint-limit'),precision:'limited'};}
  const hasDirect=w.anchors.length||xmp&&w.attacks.length;if(xmp&&!w.attacks.length&&!w.contexts.some(c=>c.reference.mps!==undefined))return {calculation:{state:'complete',reason:'no-destruction-input'},precision:'insufficient-context'};
  let branches=[w.anchors];if(xmp)for(const choices of w.attacks){if(branches.length*choices.length>PARAMETERS.maxBranches)return {calculation:failure('alternative-limit'),precision:'limited'};branches=branches.flatMap(b=>choices.map(a=>b.concat(a)));}
  if(xmp&&!w.attacks.length)return {calculation:{state:'complete',reason:'no-destruction-input'},precision:'insufficient-context'};
  const validContexts=w.contexts.filter(c=>c.reference.mps!==undefined),anchors=collapse((validContexts.length?w.contextAnchors:[]).concat(branches.flat()));if(!hasDirect&&!validContexts.length)return {calculation:{state:'complete',reason:w.contexts.some(c=>c.reference.reason==='stale-reference')?'stale-reference':'insufficient-context'},precision:'insufficient-context',movement:{state:'insufficient-context',references:w.contexts.map(c=>c.reference)}};
  let P,direct=null;try{if(!anchors.length)return {calculation:{state:'complete',reason:'insufficient-context'},precision:'insufficient-context'};const extent=Math.max(...anchors.map(a=>a.radius),...validContexts.map(c=>c.reference.mps*Math.max(Math.abs(w.targetTime-(c.B?.time??w.targetTime)),Math.abs((c.C?.time??w.targetTime)-w.targetTime))/1000+40));P=projection(anchors,extent);
   if(hasDirect){const sets=[];let unresolved=null;for(const b of branches){if(Date.now()>deadline)throw Error('budget');try{if(b.length)sets.push(spatialSet(collapse(b),P,deadline));}catch(e){if(e.message==='conflicting-local-constraints')continue;unresolved=e.message;break;}}if(unresolved)throw Error(unresolved);direct=geometry.union(sets.filter(Boolean));if(!direct.length)throw Error('conflicting-local-constraints');}
   let estimated=direct,contextInfo=[],approximationM=0,conflict=null;
   for(const c of validContexts){if(Date.now()>deadline)throw Error('budget');const ref=c.reference,sets=[],B=c.B?spatialSet(c.B.anchors,P,deadline):null,C=c.C?spatialSet(c.C.anchors,P,deadline):null;
    // All available endpoints must remain compatible with this same local rate,
    // including one-sided contexts. Never increase rate to hide an endpoint.
    if(B&&C){const d=distanceBounds(B,C);if(d.lowerM/P.k>ref.mps*(c.C.time-c.B.time)/1000+PARAMETERS.numericM){conflict='conflicting-local-constraints';break;}}
    const info={contextId:c.contextId,reference:ref,forward:null,backward:null};
    if(ref.forward&&B){const allowance=travelAllowance(ref.mps,w.targetTime-c.B.time,40);const expanded=expandSet(B,allowance.distanceM*P.k,deadline);sets.push(expanded.set);approximationM+=expanded.approximationM;info.forward={...allowance,sourceTime:c.B.time,sourceAgeMs:w.targetTime-c.B.time};}
    if(ref.backward&&C){const allowance=travelAllowance(ref.mps,c.C.time-w.targetTime,40);const expanded=expandSet(C,allowance.distanceM*P.k,deadline);sets.push(expanded.set);approximationM+=expanded.approximationM;info.backward={...allowance,sourceTime:c.C.time,sourceAgeMs:c.C.time-w.targetTime};}
    if(sets.length){const region=geometry.intersect(sets);estimated=estimated?geometry.intersect([estimated,region]):region;if(!estimated.length){conflict='conflicting-local-constraints';break;}}contextInfo.push(info);
   }
   const movement={state:conflict?'conflict':validContexts.length?'estimated':'insufficient-context',contexts:contextInfo,references:w.contexts.map(c=>c.reference),approximationM,assumption:'local-average-displacement',instantaneous:false};
   if(conflict)return {regions:direct?[summarize(direct,P,w.targetTime,'direct',xmp,movement,w.rawIds)]:[],calculation:{state:'complete',reason:conflict},precision:'conflict',movement};
   if(!estimated?.length)return {calculation:{state:'complete',reason:'insufficient-context'},precision:'insufficient-context',movement};
   const support=validContexts.length?'local-average':'direct',region=summarize(estimated,P,w.targetTime,support,xmp,movement,w.rawIds);return {regions:[region],calculation:{state:'complete',reason:validContexts.length?null:'insufficient-context'},precision:validContexts.length?'possible':'direct-only',movement,directRegions:direct?[summarize(direct,P,w.targetTime,'direct',xmp,{state:'insufficient-context',contexts:[],references:[],assumption:'direct-event-only'},w.rawIds)]:[]};
  }catch(e){if(allowDirectFallback&&direct?.length&&P&&['budget','geometry-limit','projection-limit'].includes(e.message))return {regions:[summarize(direct,P,w.targetTime,'direct',xmp,{state:'limited',contexts:[],references:[],reason:e.message},w.rawIds)],precision:'direct-only',contextUnavailable:e.message,movement:{state:'limited',contexts:[],reason:e.message},calculation:{state:'complete',reason:e.message}};if(allowDirectFallback&&hasDirect&&['projection-limit','budget'].includes(e.message)&&Date.now()<deadline){const own=compute({...w,contexts:[],contextAnchors:w.anchors,effectiveConstraints:w.anchors.length+w.attacks.length},xmp,deadline,false);if(own.regions)return {...own,precision:'direct-only',contextUnavailable:e.message,movement:{...own.movement,state:'unavailable',reason:e.message},calculation:{state:'complete',reason:e.message}};}return {calculation:failure(e.message),precision:failure(e.message).state,movement:{state:'unavailable',reason:e.message}};}
 }
 function bind(s,w,xmp){if(!s.regions)return {...s};const scenario=xmp?'XMP':'interaction',regions=s.regions.map(g=>({...g,certificateId:w.key,scenario,components:g.components.map(c=>({...c,certificateId:w.key,scenario,time:g.time,rawIds:w.rawIds}))})),points=regions.flatMap(g=>g.components.map(c=>({...c,componentId:c.id,segmentId:w.segmentId,support:g.support,conditional:g.conditional,diameterM:g.diameterM,movement:g.movement})));return {...s,regions,supportedPoints:points,path:points};}
 function checkConsistency(windows,xmp,deadline){const bad=new Set(),limited=new Set();let checked=0;
  for(let i=1;i<windows.length;i++){const a=windows[i-1],b=windows[i];if(a.segmentId!==b.segmentId||a.precision!=='possible'||b.precision!=='possible')continue;const common=a.movement.contexts.find(c=>b.movement.contexts.some(d=>d.contextId===c.contextId));if(!common)continue;
   if(++checked>PARAMETERS.maxConsistencyEdges||Date.now()>deadline){limited.add(common.contextId);continue;}
   try{const points=a.regions[0].components.concat(b.regions[0].components).flatMap(c=>c.polygon.flat().map(position=>({position,radius:0}))),P=projection(points),convert=g=>g.components.map(c=>c.polygon.map(r=>r.map(P.project))),bounds=distanceBounds(convert(a.regions[0]),convert(b.regions[0])),allowance=common.reference.mps*(b.targetTime-a.targetTime)/1000;if(bounds.lowerM/P.k>allowance+PARAMETERS.numericM)bad.add(common.contextId);}catch(_){limited.add(common.contextId);}}
  for(const w of windows){const conflict=w.movement?.contexts?.some(c=>bad.has(c.contextId)),unknown=w.movement?.contexts?.some(c=>limited.has(c.contextId));if(!conflict&&!unknown)continue;const replacement=bind({regions:w.directRegions||[],movement:{...w.movement,state:conflict?'conflict':'limited',consistency:conflict?'conflict':'limited'},calculation:{state:'complete',reason:conflict?'conflicting-local-constraints':'consistency-limit'},precision:conflict?'conflict':'limited'},w,xmp);Object.assign(w,replacement);}
  return {checked,conflictingContexts:[...bad],limitedContexts:[...limited]};
 }
 function evolution(windows){const runs=[];let run=[],context=null;for(const w of windows){const g=w.regions?.[0],p=w.supportedPoints?.[0],valid=w.calculation.state==='complete'&&w.precision==='possible'&&g?.components.length===1&&w.movement?.state==='estimated';if(!valid){if(run.length>1)runs.push(run);run=[];context=null;continue;}const contexts=w.movement.contexts.map(c=>c.contextId),prev=run.at(-1),common=prev?prev.movement.contexts.map(c=>c.contextId).find(id=>contexts.includes(id)):contexts[0];if(prev&&(!common||prev.segmentId!==p.segmentId||prev.scenario!==p.scenario)){if(run.length>1)runs.push(run);run=[];context=null;}if(run.length&&context!==common){if(run.length>1)runs.push(run);run=[{...run.at(-1),pathContextId:common}];}context=common;run.push({...p,pathContextId:context});}if(run.length>1)runs.push(run);return runs;}
 function evaluate(events,options={},xmp=false){const p=plan(events,options,xmp),cached=new Map((options._cache||[]).map(x=>[x.key,x.solved])),deadline=Date.now()+(options.budgetMs??1200),windows=Array(p.windows.length);let computed=0,hits=0;for(let i=p.windows.length-1;i>=0;i--){const w=p.windows[i];let s=cached.get(w.key);if(s)hits++;else if(options._onlyCache||computed>=(options.sliceWindows??Infinity)||Date.now()>deadline)s={calculation:{state:options._onlyCache||Number.isFinite(options.sliceWindows)?'pending':'limited',reason:'budget'},precision:options._onlyCache||Number.isFinite(options.sliceWindows)?'pending':'limited'};else{computed++;s=compute(w,xmp,deadline);}windows[i]={...bind(s,w,xmp),...w};}
  const consistency=checkConsistency(windows,xmp,deadline),points=windows.flatMap(w=>w.supportedPoints||[]),regions=windows.flatMap(w=>w.regions||[]),last=windows.at(-1),g=last?.regions?.[0],latest={time:last?.targetTime??null,state:last?.precision||'insufficient-context',point:last?.supportedPoints?.[0]||null,points:last?.supportedPoints||[],diameterM:g?.diameterM??null,certificateId:last?.key||null,closed:!!p.parts.at(-1)?.closed,support:g?.support||null,localEpisode:last?.localEpisode||null,movement:last?.movement},paths=evolution(windows),pending=windows.filter(w=>w.calculation.state==='pending').length,limited=windows.filter(w=>w.calculation.state==='limited').length,unavailable=windows.filter(w=>w.calculation.state==='unavailable').length,unresolved=windows.filter(w=>w.calculation.state==='unresolved').length;
  return {status:g?'possible':!p.base.length&&!p.attack.constraints.length?'no-anchor':'unknown',reason:last?.calculation.reason||null,latest,activityClosed:latest.closed,calculation:{state:pending||limited||unavailable||unresolved?'partial':'complete',total:windows.length,completed:windows.length-pending-limited-unavailable-unresolved,pending,limited,unavailable,unresolved},progress:{computed,hits,completed:windows.length-pending,total:windows.length,pending},supportedPoints:points,regions,pathSegments:paths,path:last?.path,windows,anchors:p.base,segments:p.parts.map((s,id)=>({id,reason:s.reason,closed:s.closed,sharedBoundary:s.sharedBoundary??null,times:s.groups.map(g=>g.time),rawIds:s.groups.flatMap(g=>g.events.map(e=>e.guid)),conflict:s.conflict})),conflicts:p.conflicts,history:{state:paths.length?'partial':'none',segments:paths.length,supportedTimes:new Set(points.map(p=>p.time)).size},targetTime:latest.time,diameterM:latest.diameterM,audit:{...p.audit,consistency},provenance:{model:VERSION,parameters:PARAMETERS,T:p.view.T,cutoff:p.view.cutoff,motion:'nearby average-displacement assumption, not an instantaneous or universal speed bound',region:'forward/backward set expansion intersected with own-time direct constraints',windowJoints:'common-reference region evolution only; never a verified centroid route',engineeringAssumptions:true},...(xmp?{scenario:'XMP 假設',excluded:p.attack.excluded}:{}),cacheEntries:windows.filter(w=>w.calculation.state!=='pending').map(w=>({key:w.key,solved:w}))};
 }
 function inferMinimum(events,options={},xmp=false){const minimum=(typeof createTrackerMinimum==='function'?createTrackerMinimum:require('./minimum.js'))(geometry);return minimum.solve(plan(events,options,xmp),options,xmp,{projection,circle,collapse,summarize,geoDistance,numericM:PARAMETERS.numericM,sides:N});}
 function infer(events,options={}){return evaluate(events,options,false);}function scenario(events,options={}){return evaluate(events,options,true);}
 return {VERSION,MINIMUM_VERSION:'minimum-movement-1',DATE,RADIUS,N,PARAMETERS,inferMinimum,plan,anchor,eligibility,geoDistance,segments:activitySegments,infer,scenario,attackConstraints,collapse,geometryKey,transition,geometry,projection,rateFormula,travelAllowance,vectorBC,scalarBC,expandSet,distanceBounds,endpointReference,selectReference};
}

/* Two in-page workspaces, one shared model and one owner per tab. MIT. */
function createTrackerWindows(document, viewport, hooks={}) {
  const t=hooks.t||createTrackerI18n(()=> 'zh-TW',viewport.navigator).t;
  const windows=new Map(),containers=new Map(),KEY='iitc-player-tracker-chatgpt-workspaces-v1';let top=10020,serial=0,restoring=false;
  const saved=(()=>{try{return JSON.parse(viewport.localStorage.getItem(KEY)||'{}');}catch(_){return {};}})();
  hooks.migrateSaved?.(saved);
  // Normalize legacy overlap IDs without losing tab ownership/order/geometry.
  const renamed=new Map();for(const row of saved.tabs||[])if(row.kind==='overlap'&&Array.isArray(row.members)){const id='overlap:'+JSON.stringify([...new Set(row.members.map(n=>String(n).toLowerCase()))].sort());renamed.set(row.id,id);row.id=id;}for(const c of saved.containers||[]){c.active=renamed.get(c.active)||c.active;c.order=(c.order||[]).map(id=>renamed.get(id)||id);}
  const category=id=>id.startsWith('player:')?'players':'overview';
  const paths={close:'M5 5l14 14M19 5L5 19',minimize:'M5 18h14',maximize:'M5 5h14v14H5z',restore:'M8 8h11v11H8zM5 14V5h9'};
  function save(){if(restoring)return;try{viewport.localStorage.setItem(KEY,JSON.stringify({version:3,navSchema:3,legacyNavigationLayouts:saved.legacyNavigationLayouts,containers:[...containers.values()].map(c=>({id:c.id,x:c.x,y:c.y,width:c.width,height:c.height,maximized:c.maximized,minimized:c.minimized,hidden:c.node.hidden,active:c.active,order:c.order.slice()})),tabs:[...windows.values()].map(w=>({id:w.id,title:w.title,owner:w.owner,player:w.player,kind:w.kind,viewSection:w.viewSection,subpage:w.subpage,expanded:[...(w.expanded||[])],readingAnchor:w.readingAnchor,historicalTime:w.historicalTime,historicalBranch:w.historicalBranch,members:w.members,page:w.page||0,limit:w.limit,scroll:w.scroll||{},summaryRows:w.summaryRows,groupReleased:w.groupReleased}))}));}catch(_){}}
  function clamp(c){if(c.owner)c=containers.get(c.owner);if(!c)return;const reading=hooks.beforeResize?.(c);const W=viewport.innerWidth,H=viewport.innerHeight,w=Math.max(160,Math.min(c.width,W-12)),h=Math.max(70,Math.min(c.height,H-12));c.x=Math.max(6,Math.min(c.x,W-w-6));c.y=Math.max(6,Math.min(c.y,H-(c.minimized?42:h)-6));Object.assign(c.node.style,{left:(c.maximized?6:c.x)+'px',top:(c.maximized?6:c.y)+'px',width:(c.maximized?W-12:w)+'px',height:c.minimized?'42px':(c.maximized?H-12:h)+'px'});hooks.afterResize?.(reading);}
  function focus(w){const c=w.owner?containers.get(w.owner):w;if(c)c.node.style.zIndex=++top;}
  function icon(kind,label,fn){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.className='ptcg-window-icon';b.dataset.windowAction=kind;b.innerHTML=kind==='resize'?'<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="4" y1="16" x2="16" y2="4"/><line x1="8" y1="16" x2="16" y2="8"/><line x1="12" y1="16" x2="16" y2="12"/></g></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[kind]+'" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';b.addEventListener('click',e=>{e.stopPropagation();fn();});return b;}
  function activate(w,persist=true,notify=true){const c=containers.get(w.owner);c.active=w.id;c.node.hidden=false;c.minimized=false;c.content.hidden=false;c.bar.hidden=!!c.standalone;for(const id of c.order){const t=windows.get(id);t.node.hidden=id!==w.id;t.tab.setAttribute('aria-selected',String(id===w.id));t.tab.tabIndex=id===w.id?0:-1;}clamp(c);focus(c);updateTabTools(w);w.tab.scrollIntoView?.({block:'nearest',inline:'nearest'});if(!restoring&&notify)hooks.onActivate?.(w);w.onActivate?.();const scroll=w.scroll?.[w.kind||w.id];if(Number.isFinite(scroll))w.body.scrollTop=scroll;if(persist)save();}
  function createContainer(id,width=490,height=590,options={}){if(containers.has(id))return containers.get(id);const prior=saved.containers?.find(x=>x.id===id)||(id==='overview'?saved.containers?.find(x=>x.id==='settings'):null),node=document.createElement('section');node.className='ptcg-window ptcg-workspace';node.dataset.workspace=id;const label=options.title||(id==='players'?t("player_events"):t("overview_settings"));node.setAttribute('aria-label',label);
    const header=document.createElement('header'),heading=document.createElement('strong');heading.textContent=label;const controls=document.createElement('div');controls.className='ptcg-window-controls';header.append(heading,controls);
    const bar=document.createElement('div');bar.className='ptcg-tabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label',heading.textContent+t("tabs"));const content=document.createElement('div');content.className='ptcg-workspace-content';
    const c={id,node,header,heading,bar,content,standalone:!!options.standalone,order:[],active:null,x:Math.max(6,viewport.innerWidth-width-20-(id==='players'?60:0)),y:id==='players'?110:65,width,height,maximized:false,minimized:false,...(prior||{})};c.id=id;c.order=[];containers.set(id,c);
    controls.append(icon('minimize',t("minimize"),()=>{c.minimized=!c.minimized;content.hidden=c.minimized;bar.hidden=c.minimized||c.standalone;clamp(c);save();}),icon('maximize',t("maximize_restore"),()=>{c.maximized=!c.maximized;c.minimized=false;content.hidden=false;bar.hidden=c.standalone;clamp(c);save();}),icon('close',options.standalone?t("close_portal_activity"):t("close_workspace"),()=>hide(c)));node.append(header,bar,content);document.body.append(node);bar.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/x-echotrace-tab'))e.preventDefault();});bar.addEventListener('drop',e=>{const w=windows.get(e.dataTransfer.getData('text/x-echotrace-tab'));if(!w)return;e.preventDefault();const before=e.target.closest('[data-tab]')?.dataset.tab,index=before?c.order.indexOf(before):c.order.length;move(w,c.id,index);});node.hidden=options.initialHidden||prior?.hidden||false;bar.hidden=c.minimized||c.standalone;content.hidden=c.minimized;
    for(const event of ['pointerdown','pointermove','pointerup','wheel','dblclick','touchstart','keydown'])node.addEventListener(event,e=>e.stopPropagation());node.addEventListener('pointerdown',()=>focus(c));
    let moving=null;header.addEventListener('pointerdown',e=>{if(e.button||c.maximized||e.target.closest('button'))return;e.preventDefault();moving={x:e.clientX,y:e.clientY,left:c.x,top:c.y};header.setPointerCapture(e.pointerId);});header.addEventListener('pointermove',e=>{if(!moving)return;c.x=moving.left+e.clientX-moving.x;c.y=moving.top+e.clientY-moving.y;clamp(c);});header.addEventListener('pointerup',()=>{moving=null;save();});header.addEventListener('pointercancel',()=>moving=null);
    const grip=icon('resize',t("resize_workspace"),()=>{});grip.className='ptcg-resize';grip.dataset.windowAction='resize';node.append(grip);let sizing=null;grip.addEventListener('pointerdown',e=>{if(c.maximized)return;e.preventDefault();sizing={x:e.clientX,y:e.clientY,w:node.clientWidth,h:node.clientHeight};grip.setPointerCapture(e.pointerId);});grip.addEventListener('pointermove',e=>{if(!sizing)return;c.width=Math.max(220,sizing.w+e.clientX-sizing.x);c.height=Math.max(150,sizing.h+e.clientY-sizing.y);clamp(c);});grip.addEventListener('pointerup',()=>{sizing=null;save();});grip.addEventListener('pointercancel',()=>sizing=null);grip.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();if(c.maximized)return;c.width+=e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0;c.height+=e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0;c.width=Math.max(220,c.width);c.height=Math.max(150,c.height);clamp(c);save();}});clamp(c);return c;
  }
  function close(w){const c=containers.get(w.owner),wasActive=c.active===w.id,index=c.order.indexOf(w.id);c.order=c.order.filter(id=>id!==w.id);w.node.remove();w.tabItem.remove();windows.delete(w.id);let next=null;if(wasActive){next=windows.get(c.order[Math.min(index,c.order.length-1)]);if(next)activate(next,false,false);else{c.active=null;c.node.hidden=true;}}if(!restoring)hooks.onClose?.(w,wasActive,next);save();}
  function hide(w){const c=w.owner?containers.get(w.owner):w;if(!c)return;c.node.hidden=true;if(!restoring)hooks.onHide?.(c);for(const id of c.order)windows.get(id)?.onHide?.();save();}
  function setTitle(w,title){if(w.title===title&&containers.get(w.owner).heading.textContent===title)return;w.title=title;w.tab.textContent=w.tab.title=title;w.tab.setAttribute('aria-label',title);const closeButton=w.tabItem.querySelector('[data-window-action=close-tab]');if(closeButton){closeButton.title=t('close')+title+t('tab');closeButton.setAttribute('aria-label',closeButton.title);}const c=containers.get(w.owner);if(c.standalone){c.heading.textContent=title;c.node.setAttribute('aria-label',title);}save();}
  function open(id,title,build,width=490,height=590,options={}){if(windows.has(id)){const w=windows.get(id);activate(w);updateTabTools(w);return w;}const prior=saved.tabs?.find(t=>t.id===id),cat=options.owner||prior?.owner||category(id),c=createContainer(cat,width,Math.max(420,height),options);
    const node=document.createElement('div');node.className='ptcg-tab-panel';node.dataset.window=id;node.setAttribute('role','tabpanel');node.id='ptcg-panel-'+(++serial);const body=document.createElement('div');body.className='ptcg-body';node.append(body);const tab=document.createElement('button');tab.draggable=true;tab.type='button';tab.textContent=title;tab.title=title;tab.setAttribute('aria-label',title);tab.setAttribute('role','tab');tab.setAttribute('aria-controls',node.id);tab.dataset.tab=id;const tabItem=document.createElement('div');tabItem.className='ptcg-tab-item';tabItem.setAttribute('role','presentation');tabItem.append(tab);
    const w={id,title,node,body,heading:tab,tab,tabItem,owner:cat,minimized:false,scroll:{},...(prior||{})};w.owner=cat;windows.set(id,w);c.order.push(id);c.bar.append(tabItem);c.content.append(node);tab.addEventListener('click',()=>activate(w));const closeButton=icon('close-tab',t("close")+title+t("tab"),()=>close(w));closeButton.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths.close+'" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';tabItem.append(closeButton);const detach=document.createElement('button');detach.type='button';detach.className='ptcg-tab-move';detach.dataset.tabMove=w.id;w.detach=detach;detach.addEventListener('click',e=>{e.stopPropagation();move(w,w.owner.startsWith('detached:')?category(w.id):'detached:'+w.id);});tabItem.insertBefore(detach,closeButton);tab.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/x-echotrace-tab',w.id);e.dataTransfer.effectAllowed='move';});
    node.addEventListener('pointerdown',()=>{if(!restoring)hooks.onFocus?.(w);});
    tab.addEventListener('keydown',e=>{const owner=containers.get(w.owner),i=owner.order.indexOf(w.id);if(e.altKey&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(w,w.owner,Math.max(0,Math.min(owner.order.length-1,i+(e.key==='ArrowRight'?1:-1))));return;}if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?owner.order.length-1:(i+(e.key==='ArrowRight'?1:-1)+owner.order.length)%owner.order.length;const next=windows.get(owner.order[j]);activate(next);next.tab.focus();}if(e.key==='Delete'){e.preventDefault();close(w);}});
    build(w);if(prior){w.kind=w.player?'reader':prior.kind||w.kind;w.page=prior.page||0;w.limit=prior.limit||w.limit;w.summaryRows=prior.summaryRows||w.summaryRows;w.groupReleased=!!prior.groupReleased;}body.addEventListener('scroll',()=>{w.scroll[w.kind||w.id]=body.scrollTop;w.readingAnchor=hooks.captureReading?.(w)||w.readingAnchor;save();},{passive:true});activate(w);updateTabTools(w);return w;
  }
  function restoreTabs(build){restoring=true;for(const t of saved.tabs||[])build(t);for(const c of containers.values()){const state=saved.containers?.find(x=>x.id===c.id);if(state){c.order.sort((a,b)=>{const ai=state.order?.indexOf(a)??-1,bi=state.order?.indexOf(b)??-1;return (ai<0?999:ai)-(bi<0?999:bi);});for(const id of c.order){c.bar.append(windows.get(id).tabItem);c.content.append(windows.get(id).node);}const w=windows.get(state.active);if(w&&w.owner===c.id)activate(w,false);c.node.hidden=!!state.hidden||!c.order.length;c.minimized=!!state.minimized;c.content.hidden=c.minimized;c.bar.hidden=c.minimized||c.standalone;clamp(c);}}restoring=false;save();}
  function updateTabTools(w){if(!w.detach)return;const detached=w.owner.startsWith('detached:');w.detach.textContent=detached?'↙':'↗';w.detach.title=t(detached?'redock_tab':'detach_tab');w.detach.setAttribute('aria-label',w.detach.title);w.tab.title=w.title+' · '+t('move_tab');}
  function move(w,owner,index){const old=containers.get(w.owner),same=old.id===owner;old.order=old.order.filter(id=>id!==w.id);if(old.active===w.id){old.active=null;const next=windows.get(old.order[0]);if(next)activate(next,false,false);}if(!old.order.length)old.node.hidden=true;const target=createContainer(owner,old.width,old.height,{title:owner.startsWith('detached:')?w.title:undefined});w.owner=owner;const i=index===undefined?target.order.length:Math.max(0,Math.min(index,target.order.length));target.order.splice(i,0,w.id);target.bar.insertBefore(w.tabItem,target.bar.children[i]||null);target.content.append(w.node);activate(w,false,false);localize();save();}
  function localize(){for(const w of windows.values())updateTabTools(w);for(const c of containers.values()){const label=c.standalone?(windows.get(c.active)?.title||t('portal_activity')):c.id==='players'?t('player_events'):c.id==='overview'?t('overview_settings'):windows.get(c.active)?.title||t('overview_settings');c.heading.textContent=label;c.node.setAttribute('aria-label',label);c.bar.setAttribute('aria-label',label+t('tabs'));for(const b of c.node.querySelectorAll('[data-window-action]')){const action=b.dataset.windowAction,key=({minimize:'minimize',maximize:'maximize_restore',close:c.standalone?'close_portal_activity':'close_workspace',resize:'resize_workspace'})[action];if(key)b.title=t(key);if(action==='close-tab'){const w=[...windows.values()].find(w=>w.tabItem.contains(b));b.title=t('close')+w.title+t('tab');}if(b.title)b.setAttribute('aria-label',b.title);}}}
  const onResize=()=>{for(const c of containers.values())clamp(c);save();};viewport.addEventListener('resize',onResize);viewport.addEventListener('pagehide',save);
  return {dispose:()=>{viewport.removeEventListener('resize',onResize);viewport.removeEventListener('pagehide',save);for(const c of containers.values())if(c.standalone){for(const id of c.order)windows.delete(id);c.node.remove();containers.delete(c.id);}},open,createContainer,hide,setTitle,localize,move,get:id=>windows.get(id),windows,containers,focus,clamp,activate,close,save,restoreTabs,initialState:saved};
}

/* Original implementation. Feature references are documented in SOURCE-PROVENANCE.md. */
function createTrackerCore() {
  'use strict';
  const parseLink = typeof parseTrackerLink === 'function' ? parseTrackerLink : require('./semantics.js');
  const parseInteraction = typeof parseTrackerInteraction === 'function' ? parseTrackerInteraction : require('./semantics.js').interaction;
  const parseDevice=typeof parseTrackerDevice==='function'?parseTrackerDevice:require('./semantics.js').device;
  const parseSystem=typeof parseTrackerSystem==='function'?parseTrackerSystem:require('./semantics.js').system;
  const parseNeutralized=typeof parseTrackerNeutralized==='function'?parseTrackerNeutralized:require('./semantics.js').neutralized;
  const isSystem=e=>!!parseSystem(e);
  const teams = { RESISTANCE: 'Resistance', ENLIGHTENED: 'Enlightened', MACHINA: 'Machina', NEUTRAL: '中立／未確認', UNKNOWN: '未知陣營' };
  const actions = { flip:'Manual flip・手動翻轉', captured: 'Captured・佔領', deployed: 'Deployed・部署', destroyedResonator: 'Destroyed・摧毀 Resonator', destroyedLink: 'Destroyed・摧毀 Link', destroyedField: 'Destroyed・摧毀 CF', linked: 'Linked・建立 Link', fielded: '建立 CF', upgraded: '升級 Resonator', beacon:'Beacon・部署',battleBeacon:'Battle Beacon・部署',rbb:'Rare Battle Beacon・部署',vrbb:'Very Rare Battle Beacon・部署',fracker:'Portal Fracker・部署',fireworks:'Fireworks・部署',beaconWinner:'Battle Beacon 結果',beaconForecast:'Battle Beacon 預告',neutralized:'Portal 中立化',unknown: '未識別行為' };
  // Exact allowlist, backed by ingress.com/en/news/2025-plusbeta-anomalysites.
  const NIA_ACCOUNTS = ['niasection14'];
  function role(event) {
    if (!event||isSystem(event)) return 'OTHER';
    if (NIA_ACCOUNTS.includes(event.player.toLowerCase())) return 'NIA';
    if (event.team === 'MACHINA') return 'MACHINA';
    return event.team === 'RESISTANCE' ? 'RES' : event.team === 'ENLIGHTENED' ? 'ENL' : 'OTHER';
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function coordinates(p) {
    if (typeof p.latE6 !== 'number' || typeof p.lngE6 !== 'number') return null;
    const lat = p.latE6 / 1e6, lng = p.lngE6 / 1e6;
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
  }
  function classify(text) {
    if(/^\s*(?:agent\s+)?used\s+(?:an?\s+|the\s+)?(?:ADA\s+Refactor|JARVIS\s+Virus)\s+(?:on|at)\s*$/i.test(text))return 'flip';
    if (/destroyed\s+(?:(?:the|a|an)\s+)?(?:control\s+)?field\b/i.test(text)) return 'destroyedField';
    if (/destroyed\s+(?:(?:the|a|an)\s+)?link\b/i.test(text)) return 'destroyedLink';
    if (/\blinked\b/i.test(text)) return 'linked';
    if (/\bcaptured\b/i.test(text)) return 'captured';
    if (/^\s*(?:agent\s+)?deployed\s+(?:(?:a|the)\s+)?Resonator\s+on\s*$/i.test(text)) return 'deployed';
    if (/\bdestroyed\s+(?:(?:the|a|an)\s+)?resonator\b/i.test(text)) return 'destroyedResonator';
    if (/\bupgraded\b.*\bresonator\b/i.test(text)) return 'upgraded';
    if (/\bcreated\s+(?:(?:the|a|an)\s+)?control\s+field\b/i.test(text)) return 'fielded';
    return 'unknown';
  }
  function parse(tuple, source = 'public-hook', receivedAt = Date.now(), cached = null) {
    if (!Array.isArray(tuple) || typeof tuple[0] !== 'string' || !tuple[0] || !Number.isFinite(tuple[1])) return null;
    const plext = tuple[2] && tuple[2].plext;
    if (!plext || !Array.isArray(plext.markup)) return null;
    // Only public automated activity. Narrowcasts and secure/user chat are not player activity.
    if (plext.plextType === 'PLAYER_GENERATED' || plext.plextType === 'SYSTEM_NARROWCAST') return null;
    if (typeof plext.categories === 'number' && (!(plext.categories & 1) || (plext.categories & 2))) return null;
    const markup = JSON.parse(JSON.stringify(plext.markup));
    const actors = markup.filter(m => Array.isArray(m) && m[0] === 'PLAYER' && typeof m[1]?.plain === 'string');
    const actor = actors[0];
    const device=parseDevice(markup);
    if ((!actor || !actor[1].plain.trim())&&!device?.system) return null;
    const player = device?.system?'系統公告':actor[1].plain;
    const actorTeam = device?.system?null:actor[1].team;
    // A cached numeric team is an IITC-derived value, not the original wire team.
    const wireTeam = typeof actorTeam === 'string' ? actorTeam : (typeof plext.team === 'string' ? plext.team : 'UNKNOWN');
    const cleanName = player.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase();
    const team = wireTeam === 'MACHINA' || (wireTeam === 'NEUTRAL' && /^(?:__MACHINA__|UNKNOWN)$/.test(cleanName)) ? 'MACHINA' : (teams[wireTeam] ? wireTeam : 'UNKNOWN');
    const text = markup.filter(m => m?.[0] === 'TEXT').map(m => String(m[1]?.plain || '')).join('');
    const portals = markup.filter(m => m?.[0] === 'PORTAL' && m[1]).map(m => ({ ...m[1], position: coordinates(m[1]) }));
    const system=parseSystem({player,markup,actorKind:device?.system?'system':'player',action:device?.action});
    const action = system?.action || device?.action || parseNeutralized(markup) || classify(text); // Structured device templates precede generic deployed.
    const distinctActors = new Set(actors.map(m => m[1].plain));
    let position = null, quality = 'unknown-action';
    if(system)quality='structure-only';
    else if (distinctActors.size > 1) quality = 'ambiguous-actor';
    else if (action === 'destroyedLink' || action === 'destroyedField') quality = 'structure-only';
    else if (action === 'linked') { const link=parseLink({markup,player,action,portals}); position=link?.directed?link.origin.position:null; quality=position?'link-origin':'ambiguous-portals'; }
    else if (action !== 'unknown' && portals.length === 1) { position = portals[0].position; quality = position ? 'portal-activity' : 'no-coordinate'; }
    else if (action !== 'unknown') quality = portals.length > 1 ? 'ambiguous-portals' : 'no-coordinate';
    const identity = stable({ time: tuple[1], type: plext.plextType || 'SYSTEM_BROADCAST', player, wireTeam, markup });
    return { fullText:typeof plext.text==='string'&&plext.text?plext.text:markup.map(m=>String(m?.[1]?.plain??'')).join(''),actorTeam:wireTeam,objectFactions:markup.filter(m=>m[0]==='FACTION').map(m=>({...m[1]})),actorKind:system?'system':'player',systemIdentity:system?.identity||null,systemTemplateSupported:system?.supported??null,deviceSubtype:device?.subtype||null,timestampPrecision:plext.timestampPrecision||'source-unspecified', guid: tuple[0], time: tuple[1], receivedAt, source, raw: cached ? null : JSON.parse(JSON.stringify(tuple)), cached, markup, player, wireTeam, team, action, text, portals, position, quality, identity };
  }
  function fromCache(guid, row, numericTeam) {
    if (!Array.isArray(row)) return null;
    const d = row[4];
    if (!d?.markup || d.public !== true || d.secure || d.narrowcast || d.auto === false) return null;
    return parse([guid, d.time, { plext: { markup: d.markup, plextType: d.type, categories: 1, team: numericTeam?.(d.team) || 'UNKNOWN' } }], 'iitc-processed-cache', Date.now(), JSON.parse(JSON.stringify(d)));
  }
  // Raw chronological associations use actor interactions, never affected objects.
  // This eligibility is separate from the short-window inference model.
  function interactionEvidence(e) {
    return parseInteraction(e,parseLink);
  }
  const speedLevels = ['走路','跑步','自行車','機車','汽車','火車／電車','高鐵','飛機','鬼'];
  function speedLevel(v) {
    if (!Number.isFinite(v) || v < 0) return null;
    const i = [5,10,30,70,120,150,350,1000].findIndex(limit => v <= limit);
    return speedLevels[i < 0 ? 8 : i];
  }
  // Connected components in screen space; originals are never moved or averaged.
  function clusterPoints(points, threshold=36) {
    const parent=points.map((_,i)=>i),cells=new Map();
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    for(let i=0;i<points.length;i++){
      const p=points[i],cx=Math.floor(p.x/threshold),cy=Math.floor(p.y/threshold);
      for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const j of cells.get(x+','+y)||[]){const q=points[j];if(Math.hypot(p.x-q.x,p.y-q.y)<=threshold)parent[find(i)]=find(j);}
      const key=cx+','+cy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
    }
    const groups=new Map();points.forEach((p,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);});
    return [...groups.values()];
  }
  class Model {
    constructor() { this.revision=0;this.events = new Map(); this.players = new Map(); this.conflicts = new Map(); this.oldest = Infinity; this.newest = -Infinity; }
    add(event) {
      const system=parseSystem(event);if(system)event={...event,actorKind:'system',systemIdentity:system.identity,systemTemplateSupported:system.supported,action:system.action,position:null,quality:'structure-only'};
      const old = this.events.get(event.guid);
      if (old) {
        if (old.identity !== event.identity || (old.raw && event.raw && stable(old.raw) !== stable(event.raw))) {
          const id = event.guid + ':' + (event.raw ? stable(event.raw) : event.identity);
          if (!this.conflicts.has(id)) { const conflict = { id, guid: event.guid, receivedAt: event.receivedAt, original: old, incoming: event }; this.conflicts.set(id, conflict);this.revision++; return { type: 'conflict', conflict }; }
          return { type: 'duplicate-conflict' };
        }
        if (!old.raw && event.raw) {this.revision++; this.events.set(event.guid, event); const list = this.players.get(event.player); list[list.indexOf(old)] = event; return { type: 'upgrade', event }; }
        return { type: 'duplicate' };
      }
      this.revision++;this.events.set(event.guid, event);
      if (!this.players.has(event.player)) this.players.set(event.player, []);
      const list = this.players.get(event.player);
      let lo = 0, hi = list.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (list[mid].time <= event.time) lo = mid + 1; else hi = mid; }
      list.splice(lo, 0, event);
      this.oldest = Math.min(this.oldest, event.time); this.newest = Math.max(this.newest, event.time);
      return { type: 'new', event };
    }
    view(name, hours, now = Date.now()) {
      const all = this.players.get(name) || [];
      const cutoff = now - hours * 3600000;
      let lo = 0, hi = all.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (all[mid].time < cutoff) lo = mid + 1; else hi = mid; }
      const events = all.slice(lo).filter(e => e.time <= now);
      const groups = [];
      for (const e of events) {
        if (!e.position) continue;
        let g = groups[groups.length - 1];
        if (!g || g.time !== e.time) { g = { time: e.time, points: new Map(), events: [] }; groups.push(g); }
        g.points.set(e.position.join(','), e); g.events.push(e);
      }
      const interactionGroups=[],excludedActivityIds=[];
      for(const [index,e] of events.entries()){const evidence=interactionEvidence(e);if(!evidence){excludedActivityIds.push(e.guid);continue;}
        let g=interactionGroups.at(-1);if(!g||g.time!==e.time){g={time:e.time,points:new Map(),events:[],reasons:[],startIndex:index};interactionGroups.push(g);}g.events.push(e);g.endIndex=index;
        if(evidence.reason)g.reasons.push({guid:e.guid,reason:evidence.reason});else g.points.set(evidence.position.join(','),{...e,position:evidence.position,anchorRule:evidence.rule});
      }
      const segments=[],activityBreaks=[];
      for(const g of interactionGroups)if(g.reasons.length||g.points.size!==1)activityBreaks.push({time:g.time,reason:g.points.size>1?'simultaneous-interaction-positions':g.reasons[0]?.reason||'unresolved-interaction',eventIds:g.events.map(e=>e.guid),positions:[...g.points.values()].map(e=>e.position)});
      for (let i = 1; i < interactionGroups.length; i++) {
        const a = interactionGroups[i - 1], b = interactionGroups[i];
        if (a.points.size !== 1 || b.points.size !== 1 || a.reasons.length || b.reasons.length) continue;
        const from = [...a.points.values()][0], to = [...b.points.values()][0];
        if (from.position.join(',') !== to.position.join(',')) segments.push({ from, to, gapMs: b.time - a.time,kind:'observed-activity-association',fromIds:a.events.map(e=>e.guid),toIds:b.events.map(e=>e.guid),interveningEventIds:events.slice(a.endIndex+1,b.startIndex).map(e=>e.guid) });
      }
      const last = events[events.length - 1] || null;
      const lastGroup = groups[groups.length - 1] || null;
      const lastTime = last?.time;
      return { name, events, groups, interactionGroups,segments,activityBreaks,excludedActivityIds,last, latestEvents: events.filter(e => e.time === lastTime), lastGroup, locations: lastGroup ? [...lastGroup.points.values()] : [], role: role(last), team: last?.team || 'UNKNOWN', uncertainLatest: !!last && (!lastGroup || last.time > lastGroup.time || events.some(e => e.time === last.time && !e.position)), ambiguous: !!lastGroup && lastGroup.points.size > 1 };
    }
    clear() { this.revision++;this.events.clear(); this.players.clear(); this.conflicts.clear(); this.oldest = Infinity; this.newest = -Infinity; }
  }
  function csvCell(value) {
    let s = String(value ?? '');
    if (/^[\s\uFEFF]*[=+@-]/u.test(s) || /^[\t\r\n]/u.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csv(events) {
    const rows = [['玩家', '陣營', '來源陣營', '原始時間毫秒', '時間ISO', '行為', '來源行為文字', '相關Portal', '相關Portal座標', '活動緯度', '活動經度', '位置品質', '來源GUID', '來源種類', '帳號分類']];
    for (const e of events) rows.push([e.player, e.team, e.wireTeam, e.time, new Date(e.time).toISOString(), e.action, e.text, e.portals.map(p => p.name || p.plain || '').join('\n'), e.portals.map(p => p.position?.join(',') || '未知').join('\n'), e.position?.[0] ?? '', e.position?.[1] ?? '', e.quality, e.guid, e.source, role(e)]);
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  return { isSystem, parseLink, interactionEvidence,Model, parse, fromCache, stable, csv, csvCell, teams, actions, role, NIA_ACCOUNTS, speedLevel, clusterPoints };
}

  if (typeof window.plugin !== 'function') window.plugin = function () {};
  if (window.plugin.playerTrackerChatGPT) return;
  const api = window.plugin.playerTrackerChatGPT = {};
  const cleanup=[];function listenMap(type,fn){window.map.on(type,fn);cleanup.push(()=>window.map.off(type,fn));}function listenDOM(n,type,fn,opts){n.addEventListener(type,fn,opts);cleanup.push(()=>n.removeEventListener(type,fn,opts));}function hook(type,fn){window.addHook(type,fn);cleanup.push(()=>window.removeHook?.(type,fn));}
  const core = createTrackerCore(); // BUILD inserts core definition inside this wrapper.
  const model = api.model = new core.Model();
  const VERSION = '0.1.1.7', NAME = 'EchoTrace by khresist';
  const BUILD={"channel":"stable","candidate":"official","sourceCommit":"accepted-dev4-sha256:201bd87bf0a4f850f91b0476162b350cb12e3297d41e3999198dce7792ef8260"};
  const KEY = 'iitc-player-tracker-chatgpt-settings-v1', DB = 'iitc-player-tracker-chatgpt-v1', MIN_ZOOM = 7;
  const defaults = { names: true, markers: true, factionPinAngle:-120,factionLabelGap:2, labelTime: true, timeMode: 'relative', paths: true, fade: true, hours: 3, pageSize: 10, mode: 'all', selected: '', faction: 'all', watch: [], persist: false, budgetEnabled:false,burstMs:30000,burstPages:30,budgetWindowMs:60000,budgetRequests:60,budgetCooldownMs:30000,storageLimits:false,retentionDays:0,maxRecords:100000,maxMegabytes:100, speed: true, filterPlayer: '', listCategory: 'ordinary', historicalPositions:false,historicalRegions:false,historicalPaths:false,historicalPrimary:'minimum-movement',historicalScenario:'interaction',inferenceSchema:3,inferenceReference:'local-average',startTier:30000,events: true, destroyedLinks:false,xmpRadius:168, summaryRows:5, overviewSelection:[], language: 'auto', roleVisibility: {}, selectionVersion:0, selectionOwner:null,liveAcquisition:false };
  let settings = { ...defaults, watch: [] },localizing=false;
  const artwork=createTrackerArtwork();
  const i18n=createTrackerI18n(()=>settings.language,window.navigator),t=(key,args)=>i18n.t(key,args);
  const messages=new Proxy({settingsError:'',storageError:'',cacheWarning:'',storageState:()=>t('opening_activity_storage'),exportState:'',refreshText:'',historyText:''},{get:(target,key)=>typeof target[key]==='function'?target[key]():target[key]});
  let activityStore=null,coordinator=null,dataGeneration=0;let db = null, chain = Promise.resolve(), ready = false, clearing = false, buffer = [], persisted = new Set(), savedConflicts = new Set();
  let started = false;
  let playerLimit = 40, searchTerm = ''; 
  const layers = {};
  let dirty = new Set(), fullRedraw = true, pendingRender = null;
  const drawn = new Map();
  const counters = { received: 0, accepted: 0, duplicate: 0, ignored: 0, renderedPlayers: 0, redraws: 0 };
  let qualityText = { 'portal-activity': t("observed_portal_activity"), 'link-origin': t("link_origin_interaction"), 'structure-only': t("position_unknown_event_object_endpoint"), 'unknown-action': t("position_unknown_unrecognized_action"), 'no-coordinate': t("position_unknown_missing_coordinates"), 'ambiguous-portals': t("position_unknown_multiple_portals"), 'ambiguous-actor': t("position_unknown_multiple_players") };
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (text, fn, cls) => { const n = el('button', text, cls); n.type = 'button'; n.addEventListener('click', fn); return n; };
  function refreshLabelCatalog(){qualityText={ 'portal-activity': t("observed_portal_activity"), 'link-origin': t("link_origin_interaction"), 'structure-only': t("position_unknown_event_object_endpoint"), 'unknown-action': t("position_unknown_unrecognized_action"), 'no-coordinate': t("position_unknown_missing_coordinates"), 'ambiguous-portals': t("position_unknown_multiple_portals"), 'ambiguous-actor': t("position_unknown_multiple_players") };roleLabels={RES:'RES',ENL:'ENL',MACHINA:'Machina',NIA:'NIA',OTHER:t("unknown_other")};shortActions={flip:t('manual_flip'),neutralized:t('portal_neutralized'),captured:t("capture"),deployed:t("deploy"),destroyedResonator:t("destroy_resonator"),destroyedLink:t("destroy_link"),destroyedField:t("destroy_cf"),linked:t("link"),fielded:t("create_cf"),upgraded:t("upgrade"),beacon:'Beacon',battleBeacon:'Battle Beacon',rbb:'Rare Battle Beacon',vrbb:'Very Rare Battle Beacon',fracker:'Portal Fracker',fireworks:'Fireworks',beaconWinner:t("battle_beacon_result"),beaconForecast:t("battle_beacon_forecast"),unknown:t("other")};categories=[['ordinary',t("players")],['MACHINA','Machina'],['NIA','NIA'],['OTHER',t("unknown_other")],['all',t("all_accounts")]];hourOptions=[[0.5,t("30_minutes")],[1,t("1_hour")],[2,t("2_hours")],[3,t("3_hours")],[6,t("6_hours")],[12,t("12_hours")],[24,t("24_hours")]];groupNames={capture:t("capture_resonator"),destroy:t("destruction"),link:t("link"),beacon:'Beacon／Battle Beacon',fracker:'Fracker',other:t("other_cf")};}
  function saveSettings() {coordinator?.announce(); try { localStorage.setItem(KEY, JSON.stringify(settings)); messages.settingsError=()=>''; } catch (e) { messages.settingsError=()=>t("settings_could_not_be_saved") + i18n.status(e.message); } }
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const k of ['liveAcquisition','names', 'markers', 'labelTime', 'paths', 'fade', 'persist', 'speed', 'events','destroyedLinks','budgetEnabled','storageLimits']) if (typeof s[k] === 'boolean') settings[k] = s[k];
      for(const key of ['burstMs','burstPages','budgetWindowMs','budgetRequests','budgetCooldownMs','retentionDays','maxRecords','maxMegabytes'])if(Number.isFinite(s[key])&&s[key]>=0)settings[key]=s[key];
      settings.historicalPositions=typeof s.historicalPositions==='boolean'?s.historicalPositions:false;settings.historicalRegions=typeof s.historicalRegions==='boolean'?s.historicalRegions:false;settings.inferenceReference=['local-average','minimum-movement','both'].includes(s.inferenceReference)?s.inferenceReference:'local-average';
      settings.historicalPaths=typeof s.historicalPaths==='boolean'?s.historicalPaths:false;settings.historicalPrimary=['local-average','minimum-movement'].includes(s.historicalPrimary)?s.historicalPrimary:'minimum-movement';settings.historicalScenario=s.historicalScenario==='XMP'?'XMP':'interaction';
      if([500,800,1000,3000,5000,10000,30000,60000,180000,300000].includes(s.startTier))settings.startTier=s.startTier;
      for(const key of ['inference','inferredPaths','xmp','modelCap','modelSpeedCap'])delete s[key];
      if (Number.isFinite(s.hours)&&s.hours>0) settings.hours = Math.min(24,s.hours);if(s.hours>24)settings.mapHoursClamped=true;
      if([3,5,10].includes(s.summaryRows))settings.summaryRows=s.summaryRows;
      if(Number.isFinite(s.xmpRadius)&&s.xmpRadius>0&&s.xmpRadius<=2000)settings.xmpRadius=s.xmpRadius;
      if ([10, 20, 40].includes(s.pageSize)) settings.pageSize = s.pageSize;
      if (['ordinary', 'all', 'MACHINA', 'NIA', 'OTHER'].includes(s.listCategory)) settings.listCategory = s.listCategory;
      if (['all', 'single'].includes(s.mode)) settings.mode = s.mode;
      if (['all', ...Object.keys(core.teams)].includes(s.faction)) settings.faction = s.faction;
      if (['absolute', 'relative'].includes(s.timeMode)) settings.timeMode = s.timeMode;
      if (typeof s.selected === 'string') settings.selected = s.selected;
      settings.filterPlayer = typeof s.filterPlayer === 'string' ? s.filterPlayer : settings.mode === 'single' ? settings.selected : ''; 
      if (Array.isArray(s.watch)) settings.watch = [...new Set(s.watch.filter(n => typeof n === 'string' && n.trim()).map(n => n.trim()))];
      settings.overviewSelection=Array.isArray(s.overviewSelection)?[...new Set(s.overviewSelection.filter(n=>typeof n==='string'&&n.trim()).map(n=>n.trim()))]:(s.mode==='single'&&settings.filterPlayer?[settings.filterPlayer]:[]);
      for(const [key,min,max] of [['factionPinAngle',-180,180],['factionLabelGap',0,20]])if(Number.isFinite(s[key])&&s[key]>=min&&s[key]<=max)settings[key]=s[key];
      settings.language=['auto','en','zh-TW','zh-CN','ja'].includes(s.language)?s.language:'auto';
      settings.roleVisibility=s.roleVisibility&&typeof s.roleVisibility==='object'?Object.fromEntries(Object.entries(s.roleVisibility).filter(([k,v])=>['RES','ENL','MACHINA','NIA','OTHER'].includes(k)&&typeof v==='boolean')):{};
      settings.selectionVersion=Number.isSafeInteger(s.selectionVersion)?s.selectionVersion:0;settings.selectionOwner=s.selectionOwner&&typeof s.selectionOwner.id==='string'?s.selectionOwner:null;
    } catch (e) { messages.settingsError=()=>t("settings_could_not_be_loaded_using_defaults") + i18n.status(e.message); }
  }
  const clockText=createTrackerTime(undefined,t),speedModel=createTrackerSpeed(core);
  function time(t,absolute=false){return absolute||settings.timeMode==='absolute'?clockText.absolute(t):clockText.relative(t,observationT);}
  api.formatTime=(t,absolute=false)=>time(t,absolute);api.timeZone=clockText.zone;
  let liveObservation=true,observationRevision=0;
  api.setObservationTime=t=>{if(historySession?.snapshot().active)return false;observationRevision++;liveObservation=t===null;if(!liveObservation&&!Number.isSafeInteger(t))throw Error('invalid observation time');observationT=liveObservation?Date.now():t;acquisition?.scopeChanged();syncObservationInputs();requestRender(true);};
  api.observationState=()=>({live:liveObservation,T:observationT,zone:clockText.zone});
  let mapScope={kind:'overview',player:''};
  function scopeIncludes(name,scope=mapScope){const ids=scope.kind==='player'?[scope.player]:settings.overviewSelection;return !ids.length||ids.some(id=>id.toLowerCase()===name.toLowerCase());}
  function matches(name,view){return view.events.length>0&&scopeIncludes(name)&&(settings.faction==='all'||view.team===settings.faction);}
  function setMapScope(scope){if(mapScope.kind===scope.kind&&mapScope.player===scope.player)return;mapScope={...scope};requestRender(true);}
  function ownGroup(w){settings.selectionVersion++;settings.selectionOwner={id:w.id,version:settings.selectionVersion};settings.overviewSelection=w.members.slice();w.groupReleased=false;saveSettings();wm.save();}
  function releaseGroup(w){if(!w||settings.selectionOwner?.id!==w.id||settings.selectionOwner.version!==settings.selectionVersion)return false;settings.selectionOwner=null;settings.selectionVersion++;settings.overviewSelection=[];w.groupReleased=true;saveSettings();wm.save();requestRender(true);renderDashboard();return true;}
  function manualSelection(names){settings.selectionVersion++;settings.selectionOwner=null;settings.overviewSelection=names;saveSettings();if(mapScope.kind==='overview')requestRender(true);renderDashboard();}
  function workspaceActivated(w){if(w.player)setMapScope({kind:'player',player:w.player});else if(w.kind==='overlap'){ownGroup(w);setMapScope({kind:'overview',player:''});requestRender(true);renderDashboard();}else if(w.id==='dashboard')setMapScope({kind:'overview',player:''});}
  function workspaceFocused(w){if(w.player)setMapScope({kind:'player',player:w.player});else if(w.id==='dashboard'||w.kind==='overlap'&&!w.groupReleased)setMapScope({kind:'overview',player:''});}
  function playerContexts(){return [...wm.windows.values()].filter(w=>(w.player||w.kind==='overlap')&&!wm.containers.get(w.owner)?.node.hidden);}
  function reconcilePlayerContexts(){const open=playerContexts();if(open.length){if(mapScope.kind==='player'&&!open.some(w=>w.player===mapScope.player)){const other=open.find(w=>w.player);setMapScope(other?{kind:'player',player:other.player}:{kind:'overview',player:''});}return;}settings.selectionOwner=null;settings.selectionVersion++;settings.overviewSelection=[];settings.filterPlayer='';settings.mode='all';for(const w of wm.windows.values())if(w.kind==='overlap')w.groupReleased=true;setMapScope({kind:'overview',player:''});saveSettings();wm.save();requestRender(true);renderDashboard();}
  function workspaceHidden(c){if(c.order.some(id=>{const w=wm.get(id);return w?.player||w?.kind==='overlap';}))reconcilePlayerContexts();}
  function workspaceClosed(w,wasActive,next){if(!w.player&&w.kind!=='overlap')return;const open=playerContexts();if(!open.length){reconcilePlayerContexts();return;}if(settings.selectionOwner?.id===w.id){const group=open.find(x=>x.kind==='overlap');if(group)ownGroup(group);else{settings.selectionOwner=null;saveSettings();}}if(mapScope.kind==='player'&&!open.some(x=>x.player===mapScope.player)){const other=next?.player?next:open.find(x=>x.player);setMapScope(other?{kind:'player',player:other.player}:{kind:'overview',player:''});}}
  function toggleOverview(name){const key=name.toLowerCase(),has=settings.overviewSelection.some(n=>n.toLowerCase()===key);manualSelection(has?settings.overviewSelection.filter(n=>n.toLowerCase()!==key):settings.overviewSelection.concat(name));}

  api.mapScope=()=>({...mapScope,overviewSelection:settings.overviewSelection.slice(),visiblePlayers:[...model.players.keys()].filter(n=>{const v=sharedView(n);return matches(n,v)&&window.map.hasLayer(layers[v.role]);})});
  function color(name, team) { const role=core.role({player:name,team});return displayModel.playerColor(name,role,roleColors[role]); }
  function snapshot() {
    return { version: VERSION, records: model.events.size, players: model.players.size, saved: persisted.size, conflicts: model.conflicts.size, savedConflicts: savedConflicts.size, oldest: Number.isFinite(model.oldest) ? model.oldest : null, newest: Number.isFinite(model.newest) ? model.newest : null, storageState:messages.storageState, storageError:messages.storageError, settingsError:messages.settingsError, cacheWarning:messages.cacheWarning, counters: { ...counters }, accountCounts: accountCounts() };
  }
  api.status = snapshot;
  api.settings = () => JSON.parse(JSON.stringify(settings));
  api.whenIdle = () => chain;
  function enqueue(events=[],conflicts=[],scopes=[]){if(!activityStore)return;chain=activityStore.enqueue(events,conflicts,scopes).then(()=>schedule());return chain;}
  async function openDatabase(){db=await activityStore.open();}
  async function restore(){const data=await activityStore.read();dataGeneration=data.generation;
    const events=data.records.map(row=>row.raw?core.parse(row.raw,row.source,row.receivedAt):row).filter(Boolean);accept(events,{epoch:dataGeneration,saved:true});for(const c of data.conflicts){model.conflicts.set(c.id,c);savedConflicts.add(c.id);}for(const scope of data.observationScopes)activityStore.addScope(scope,true);
    let legacy=[];try{legacy=JSON.parse(localStorage.getItem(KEY+'-acquisition-scopes')||'[]');}catch(_){}if(Array.isArray(legacy))for(const scope of legacy)activityStore.addScope({...scope,source:scope.source||'legacy-scope',coverage:'unknown'},true);
    restoreAcquisitionState();initBacktrack();if(settings.persist&&legacy.length){enqueue([],[],activityStore.allScopes());chain.then(async()=>{const d=await activityStore.read();if(d.observationScopes.length)localStorage.removeItem(KEY+'-acquisition-scopes');}).catch(()=>{});}
  }
  function restoreAcquisitionState(){const state={checkpoints:[],historyTasks:[],gaps:[]};for(const s of activityStore.allScopes()){if(!s.bounds)continue;const scope=JSON.stringify(s.bounds)+'|'+(s.live?'live':'fixed:'+s.upper);if(s.checkpoint)state.checkpoints.push([scope,s.checkpoint]);if(s.gaps)state.gaps.push(...s.gaps);if(s.intent==='history')state.historyTasks.push([JSON.stringify([s.bounds,s.lower,s.upper]),{target:{bounds:s.bounds,upper:s.upper,lower:s.lower,live:s.live,key:scope},cursor:s.cursor,complete:s.complete,transportCovered:s.coverage==='query-boundary',seen:s.ids.map(id=>id+'|'+model.events.get(id)?.time),state:s.state}]);}acquisition?.restoreState(state);}
  function accept(events,meta={}) {
    if((meta.epoch??dataGeneration)!==dataGeneration||clearing)return 0;if(!ready&&!meta.saved){buffer.push({events,meta:{...meta,epoch:meta.epoch??dataGeneration}});return 0;}
    const toSave = [], conflicts = [];
    for (const e of events) {
      const result = model.add(e);
      if (result.type === 'new' || result.type === 'upgrade') { counters.accepted++; dirty.add(e.player); toSave.push(e); }
      else if (result.type === 'conflict') conflicts.push(result.conflict);
      else counters.duplicate++;
    }
    const scopes=meta.scopes||[];if(meta.saved){for(const e of events)persisted.add(e.guid);}else enqueue(toSave,conflicts,scopes);schedule();return toSave.length;
  }
  const processedResponses=new WeakSet(),nativeGenerations=new Map();
  function nativeScope(p){const bounds=Object.fromEntries(['minLatE6','minLngE6','maxLatE6','maxLngE6'].map(k=>[k,p[k]]));return {bounds,upper:p.maxTimestampMs,lower:p.minTimestampMs,live:p.maxTimestampMs===-1,intent:p.plextContinuationGuid?'history':'native',source:'native-observed',query:Object.fromEntries(['minTimestampMs','maxTimestampMs','plextContinuationGuid','ascendingTimestampOrder'].filter(k=>k in p).map(k=>[k,p[k]])),coverage:'unknown'};}
  function handle(data,meta={}) {
    if(disposed)return 0;if (data?.channel && data.channel !== 'all') return;
    const tuples = data?.result || data?.raw?.result;
    if (!Array.isArray(tuples)) return 0;let epoch=meta.epoch??dataGeneration;for(const [xhr,g]of nativeGenerations)if(xhr.responseJSON?.result===tuples){if(g.account!==String(window.PLAYER?.nickname||'').toLowerCase())return 0;epoch=g.epoch;meta={...meta,scope:meta.scope||(g.params?nativeScope(g.params):{source:'startup-observed',coverage:'unknown',state:'unknown-query'}),source:meta.source||'native-observed'};break;}if(epoch!==dataGeneration||clearing)return 0;const scopes=meta.scope?[activityStore.addScope({...meta.scope,ids:tuples.map(r=>r?.[0]),source:meta.source||'plugin',receivedAt:Date.now()})].filter(Boolean):[];if(processedResponses.has(tuples)){enqueue([],[],scopes);return 0;}processedResponses.add(tuples);
    const events = [];
    for (const tuple of tuples) {
      counters.received++;
      try { const e = core.parse(tuple); if (e) events.push(e); else counters.ignored++; } catch (_) { counters.ignored++; }
    }
    return accept(events,{epoch,scopes});
  }
  api.handlePublicData = handle;
  function seedCache() {
    const rows = window.IITC?.comm?._channelsData?.all?.data || window.chat?._public?.data;
    if (!rows) return;
    let unreadable = 0;
    const teamName = id => id === window.TEAM_RES ? 'RESISTANCE' : id === window.TEAM_ENL ? 'ENLIGHTENED' : id === window.TEAM_MAC ? 'MACHINA' : id === window.TEAM_NONE ? 'NEUTRAL' : 'UNKNOWN';
    const events = [];
    for (const [guid, row] of Object.entries(rows)) {
      try { const e = core.fromCache(guid, row, teamName); if (e) events.push(e); else if (row?.[1] && !row?.[4]?.markup) unreadable++; } catch (_) { unreadable++; }
    }
    if (unreadable) messages.cacheWarning=()=>unreadable + t("older_comm_entries_lack_structured_source_data_awaiting_native_pu");
    accept(events,{epoch:dataGeneration});
  }
  function backgroundInterest() {
    const chat = window.IITC?.chat || window.chat;
    if (typeof chat?.backgroundChannelData === 'function') chat.backgroundChannelData('plugin.playerTrackerChatGPT', 'all', window.map.getZoom() >= MIN_ZOOM);
    else messages.cacheWarning=()=>t("background_comm_interface_unavailable_native_public_comm_updates_");
  }
  function requestRender(all=false){if(disposed)return;if(all)fullRedraw=true;if(pendingRender)return;pendingRender=window.setTimeout(()=>{pendingRender=null;render();},50);}
  function schedule(all=false){if(liveObservation)observationT=Date.now();requestRender(all);}
  let roleLabels={RES:'RES',ENL:'ENL',MACHINA:'Machina',NIA:'NIA',OTHER:t("unknown_other")};
  const roleColors={RES:'#75c8ff',ENL:'#80ef98',MACHINA:'#ff8585',NIA:'#dfb2ff',OTHER:'#d7dce4'};
  let shortActions={flip:t('manual_flip'),neutralized:t('portal_neutralized'),captured:t("capture"),deployed:t("deploy"),destroyedResonator:t("destroy_resonator"),destroyedLink:t("destroy_link"),destroyedField:t("destroy_cf"),linked:t("link"),fielded:t("create_cf"),upgraded:t("upgrade"),beacon:'Beacon',battleBeacon:'Battle Beacon',rbb:'Rare Battle Beacon',vrbb:'Very Rare Battle Beacon',fracker:'Portal Fracker',fireworks:'Fireworks',beaconWinner:t("battle_beacon_result"),beaconForecast:t("battle_beacon_forecast"),unknown:t("other")};
  let categories=[['ordinary',t("players")],['MACHINA','Machina'],['NIA','NIA'],['OTHER',t("unknown_other")],['all',t("all_accounts")]];
  let hourOptions=[[0.5,t("30_minutes")],[1,t("1_hour")],[2,t("2_hours")],[3,t("3_hours")],[6,t("6_hours")],[12,t("12_hours")],[24,t("24_hours")]];
  let wm,exportScope='all',exportCategory='ordinary',refreshBusy=false,acquisition=null,displayTimer=null,disposed=false,nativeDeferred=[],nativeFlushTimer=null;
  const nativeAjax=new Set(),ownAjax=new WeakSet();let ownDispatch=false;
  let clusterLayer;const clusterRecords=new Map();
  function categoryMatches(role,category){return category==='all'||(category==='ordinary'?(role==='RES'||role==='ENL'):role===category);}
  function accountCounts(){const c={RES:0,ENL:0,MACHINA:0,NIA:0,OTHER:0};for(const n of model.players.keys()){const v=sharedView(n,settings.hours);if(v.last)c[v.role]++;}return c;}
  const speedCache=new Map();function speeds(v){if(!settings.speed)return null;const key=v.events.length+'|'+v.events[0]?.guid+'|'+v.events.at(-1)?.guid+'|'+counters.accepted,c=speedCache.get(v.name);if(c?.key===key)return c.result;const result=speedModel.estimate(v.events);speedCache.set(v.name,{key,result});return result;}
  api.speedResult=name=>speedModel.estimate(sharedView(canonical(name)).events);
  function speedLabel(s){if(!s?.minimum)return t("cannot_calculate_insufficient_unresolved_interactions");const label=s.state==='same-portal'?t("no_displacement_between_portals_observed"):s.state==='overlap'?t("interaction_areas_overlap_speed_unresolved"):s.state==='unresolved-region-rate'?t("shared_interaction_region_speed_unresolved"):t("speed_estimate")+s.minimum.lowerKmh.toFixed(1)+t("km_h_speed_class_at_least")+i18n.status(s.level)+(s.ghost?t("ghost_candidate"):'');return label+(s.longGap?t("long_interval_intermediate_route_unknown"):'')+(s.olderThanLatestSlice?t("earlier_valid_estimate_latest_interval_unresolved"):'');}
  function factionBadge(role){const n=el('span',undefined,'ptcg-faction-badge');n.innerHTML=artwork.emblem(role);return n;}
  function roleStyle(n,v){n.style.color=roleColors[v.role];if(['RES','ENL'].includes(v.role)&&!n.querySelector('.ptcg-faction-emblem'))n.prepend(factionBadge(v.role));return n;}
  function briefStatus(){const p=[];if(window.map.getZoom()<MIN_ZOOM)p.push(t("zoom_to_level_7"));if(messages.storageError)p.push(t("storage_failed"));else p.push(settings.persist?messages.storageState:t("new_activity_stays_in_this_page"));if(messages.settingsError)p.push(t("settings_save_failed"));if(model.conflicts.size)p.push(t("source_conflicts")+model.conflicts.size);if(messages.cacheWarning)p.push(t("awaiting_comm_update"));return p.join(' · ');}
  function refreshPublic(){if(historySession?.snapshot().active){messages.refreshText=()=>t('history_live_paused');requestRender();return false;}if(!acquisition){messages.refreshText=()=>t("public_comm_interface_unavailable");requestRender();return false;}const player=mapScope.kind==="player"?mapScope.player:null,before=player?sharedView(player).events.map(e=>e.guid):null;acquisition.request('manual').then(r=>{messages.refreshText=()=>(i18n.status(r.text)||t("no_update_received"))+(r.complete&&before&&!sharedView(player).events.some(e=>!before.includes(e.guid))?t("no_new_activity_for_this_player"):'');requestRender();});return true;}
  api.refresh=refreshPublic;
  function acquisitionTarget(){const b=window.map.getBounds(),sw=b.getSouthWest(),ne=b.getNorthEast(),lat=n=>Math.round(Math.max(-90,Math.min(90,n))*1e6),lng=n=>Math.round(Math.max(-180,Math.min(180,n))*1e6);return {bounds:{minLatE6:lat(sw.lat),minLngE6:lng(sw.lng),maxLatE6:lat(ne.lat),maxLngE6:lng(ne.lng)},live:liveObservation,upper:observationT,lower:observationT-settings.hours*3600000};}
  function updateAcquisitionPause(){const reason=!window.map.hasLayer(masterLayer)?'總開關已關閉':document.hidden?'頁面隱藏':window.isIdle?.()?'頁面閒置':window.map.getZoom()<MIN_ZOOM?'請放大至 7 級':'';acquisition?.setPause(reason);}
  function nativeFailure(xhr){const retry=xhr?.getResponseHeader?.('Retry-After'),n=Number(retry);return {status:xhr?.status||0,retryAfterMs:retry?(Number.isFinite(n)?n*1000:Math.max(0,Date.parse(retry)-Date.now())):0,kind:'native-complete'};}
  function initAcquisition(){acquisition=createTrackerAcquisition({startTier:settings.startTier,target:acquisitionTarget,available:()=>ready&&typeof window.postAjax==='function',
    nativeState:id=>{if(typeof id==='string')return {state:window.IITC?.comm?._requestRunning?.all?'unknown':'complete'};const known=id?.readyState===4||['resolved','rejected'].includes(id?.state?.());if(!known)return {state:'unknown'};const g=nativeGenerations.get(id),valid=g?.epoch===dataGeneration&&g?.account===String(window.PLAYER?.nickname||'').toLowerCase()&&!clearing,ok=Array.isArray(id.responseJSON?.result)&&id.status>=200&&id.status<300;return {state:'complete',data:valid&&ok?id.responseJSON:null,error:!ok&&g?.account===String(window.PLAYER?.nickname||'').toLowerCase()?nativeFailure(id):valid?null:{kind:'stopped'},valid,g};},
    nativeUncertain:()=>coordinator.native(true),retireNative:(id,state)=>{nativeAjax.delete(id);coordinator.native(nativeAjax.size>0||!!window.IITC?.comm?._requestRunning?.all);if(state.g?.params&&(state.valid||state.error?.status)){coordinator.nativeResult(state.g.params,state.data,state.error,{generation:state.error?dataGeneration:state.g.epoch,account:state.g.account,startedAt:state.g.startedAt});if(state.data)handle(state.data,{epoch:dataGeneration});}nativeGenerations.delete(id);},
    deferredDispatch:true,dataGeneration:()=>dataGeneration,nativeWaiting:()=>nativeDeferred.length>0,yieldNative:flushNative,
    send:(p,ok,fail,meta)=>coordinator.submit(p,ok,fail,meta),
    ingest:(data,scope)=>{const before=counters.accepted;handle({channel:'all',result:data.result},{epoch:dataGeneration,scope,source:'plugin-acquisition'});return counters.accepted-before;},
    complete:(c,complete)=>{const cp=c.kind==='history'?null:acquisition.snapshot().checkpoints.find(([key])=>key===c.target.key)?.[1],ids=[...c.seen].map(x=>x.slice(0,x.lastIndexOf('|')));const row=activityStore.addScope({bounds:c.target.bounds,upper:c.target.upper,lower:c.target.lower,live:c.target.live,intent:c.kind,source:'plugin-acquisition',state:c.state||'partial-gap',gaps:acquisition.snapshot().gaps.filter(g=>g.scope===c.target.key).slice(-200),complete,query:c.requestQuery,requestId:String(c.requestId),coverage:c.crossed?'query-boundary':'unknown',cursor:c.cursor,ids,checkpoint:cp,receivedAt:Date.now()});if(row)enqueue([],[],[row]);},
    change:s=>{if(!coordinator.snapshot().owner.length)flushNative();refreshBusy=s.headBusy;messages.refreshText=()=>i18n.status(s.text);historyBusy=s.intent==='history'||!!s.suspendedHistory||!!s.historyQueued;if(historyBusy)messages.historyText=()=>s.historyQueued?t('history_queued'):i18n.status(s.text);historyPages=s.history?.pages||0;requestRender();}});
    Object.defineProperty(api,'acquisitionScopes',{get:()=>activityStore.allScopes()});api.acquisitionState=()=>({...acquisition.snapshot(),coordination:coordinator.snapshot()});api.setAutoRefresh=on=>{settings.liveAcquisition=!!on;saveSettings();updateAcquisitionPause();if(historySession)historySession.choice(on);else acquisition.enable(on);};acquisition.enable(settings.liveAcquisition);api.recoverAcquisition=async()=>{await coordinator.recover();acquisition.recover();requestRender();};
    if(typeof window.jQuery==='function'){
      const publicPayload=o=>{try{if(!/\/r\/getPlexts(?:\?|$)/.test(o.url))return null;const p=o.context?.tab?o.context:JSON.parse(o.data||'{}');return p.tab==='all'?p:null;}catch(_){return null;}};
      window.jQuery(document).on('ajaxSend.ptAdvanced',(_event,xhr,o)=>{const p=publicPayload(o);if(p){if(disposed)return;if(ownDispatch){ownAjax.add(xhr);return;}nativeGenerations.set(xhr,{epoch:dataGeneration,account:String(window.PLAYER?.nickname||'').toLowerCase(),params:p,startedAt:Date.now()});nativeAjax.add(xhr);coordinator.native(true);acquisition.nativeStart(xhr,p);}});
      window.jQuery(document).on('ajaxComplete.ptAdvanced',(_event,xhr,o)=>{if(!publicPayload(o)||ownAjax.has(xhr))return;nativeAjax.delete(xhr);coordinator.native(nativeAjax.size>0);const ok=Array.isArray(xhr.responseJSON?.result)&&xhr.status>=200&&xhr.status<300;if(nativeGenerations.get(xhr)?.epoch===dataGeneration&&nativeGenerations.get(xhr)?.account===String(window.PLAYER?.nickname||'').toLowerCase()&&!clearing){const g=nativeGenerations.get(xhr),retry=xhr.getResponseHeader?.('Retry-After'),n=Number(retry),error=ok?null:{status:xhr.status||0,retryAfterMs:retry?(Number.isFinite(n)?n*1000:Math.max(0,Date.parse(retry)-Date.now())):0};coordinator.nativeResult(g.params,xhr.responseJSON,error,{generation:g.epoch,account:g.account,startedAt:g.startedAt});if(ok)handle(xhr.responseJSON,{epoch:dataGeneration});acquisition.nativeEnd(xhr,xhr.responseJSON,error);}else{const g=nativeGenerations.get(xhr),error=!ok&&g?.account===String(window.PLAYER?.nickname||'').toLowerCase()?nativeFailure(xhr):{kind:'stopped'};if(error.status&&g?.params)coordinator.nativeResult(g.params,null,error,{generation:dataGeneration,account:g.account,startedAt:g.startedAt});acquisition.nativeEnd(xhr,null,error);}nativeGenerations.delete(xhr);});
    }
    const comm=window.IITC?.comm,original=comm?.requestChannel;if(typeof original==='function'){const wrapped=function(...args){if(args[0]==='all'&&coordinator.snapshot().owner.length>0){const key=String(!!args[1]),prior=nativeDeferred.findIndex(d=>d.key===key),entry={key,context:this,args,original};if(prior<0)nativeDeferred.push(entry);else nativeDeferred[prior]=entry;return;}return original.apply(this,args);};comm.requestChannel=wrapped;cleanup.push(()=>{if(comm.requestChannel===wrapped)comm.requestChannel=original;clearTimeout(nativeFlushTimer);const pending=nativeDeferred.splice(0);coordinator.whenTransportIdle().then(()=>{for(const d of pending){try{d.original.apply(d.context,d.args);}catch(_){}}});});}
    // Native requests already running when the plugin is installed retain the lock.
    for(const xhr of window.activeRequests||[]){if(!xhr?.always||xhr.readyState===4||nativeAjax.has(xhr))continue;nativeGenerations.set(xhr,{epoch:dataGeneration,account:String(window.PLAYER?.nickname||'').toLowerCase(),params:null});nativeAjax.add(xhr);coordinator.native(true);acquisition.nativeStart(xhr,{});xhr.always(()=>{nativeAjax.delete(xhr);if(!disposed){coordinator.native(nativeAjax.size>0);acquisition.nativeEnd(xhr,null,xhr.status>=400?nativeFailure(xhr):{kind:'stopped'});}nativeGenerations.delete(xhr);});}
    if(window.IITC?.comm?._requestRunning?.all)acquisition.nativeStart('preexisting-native',{});
    api.notifyNativeIdle=()=>{if(!window.IITC?.comm?._requestRunning?.all)acquisition.nativeEnd('preexisting-native',null,{kind:'stopped'});for(const xhr of nativeAjax)if(xhr.readyState===4||['resolved','rejected'].includes(xhr.state?.()))acquisition.reconcileNative(xhr);if(nativeAjax.size||window.IITC?.comm?._requestRunning?.all)coordinator.native(true);};
    listenDOM(document,'visibilitychange',updateAcquisitionPause);
    updateAcquisitionPause();
  }
  function flushNative(){if(disposed||!nativeDeferred.length||nativeFlushTimer!==null||coordinator?.snapshot().owner.length)return;nativeFlushTimer=setTimeout(()=>{nativeFlushTimer=null;if(disposed||coordinator?.snapshot().owner.length||nativeAjax.size||window.IITC?.comm?._requestRunning?.all)return;const d=nativeDeferred.shift();d?.original.apply(d.context,d.args);if(nativeDeferred.length&&!nativeAjax.size)flushNative();},0);}
  function playerRefreshHeader(){for(const c of wm.containers.values())if(c.id==='players'&&!c.header.querySelector('[data-workspace-refresh]')){const b=button(t("refresh"),refreshPublic);b.dataset.workspaceRefresh='1';c.header.querySelector('.ptcg-window-controls').prepend(b);}}
  function numberSetting(title,key,min,max,onChange){const label=el('label',title,'ptcg-field'),input=el('input');input.type='number';input.min=min;input.max=max;input.step=1;input.value=settings[key];input.dataset.setting=key;input.addEventListener('input',()=>{input.dataset.draft='1';});input.addEventListener('change',()=>{if(localizing)return;delete input.dataset.draft;const n=Number(input.value);if(!Number.isFinite(n)||n<min||n>max){input.value=settings[key];return;}settings[key]=n;saveSettings();onChange?.();requestRender();});label.append(input);return label;}
  function buildAuto(w){const toggle=el('label',undefined,'ptcg-check'),on=el('input');on.type='checkbox';on.dataset.autoRefresh='1';on.addEventListener('change',()=>api.setAutoRefresh(on.checked));toggle.append(on,document.createTextNode(t("auto_refresh")));const tier=field(t("initial_interval"),'startTier',[[500,'500ms'],[800,'800ms'],[1000,'1s'],[3000,'3s'],[5000,'5s'],[10000,'10s'],[30000,'30s'],[60000,'1m'],[180000,'3m'],[300000,'5m']],()=>acquisition.setTier(settings.startTier)),summary=el('div');summary.dataset.acquisitionSummary='1';w.body.append(toggle,tier,summary,button(t("resume_acquisition"),()=>api.recoverAcquisition().catch(e=>{messages.refreshText=()=>t("could_not_resume")+i18n.status(e.message);requestRender();})),el('small',t("use_after_restoring_sign_in_existing_backoff_remains_auto_refresh")),checkbox(t("enable_request_budget"),'budgetEnabled'),numberSetting(t("fast_request_duration_ms"),'burstMs',500,3600000),numberSetting(t("fast_request_pages"),'burstPages',1,10000),numberSetting(t("rolling_window_ms"),'budgetWindowMs',1000,86400000),numberSetting(t("requests_per_window"),'budgetRequests',1,10000),numberSetting(t("budget_cooldown_ms"),'budgetCooldownMs',500,86400000),el('small',t("budget_defaults_off_enabling_it_delays_catch_up_and_retains_curso")));
  }
  function renderAuto(){renderMapIntervals();const w=wm.get('auto');if(!w||!acquisition||!w.body.querySelector('[data-auto-refresh]'))return;const s=api.acquisitionState(),shared=s.coordination,primary=w.body.querySelector('[data-live-primary]');if(primary)primary.textContent=i18n.status(s.text)+' · '+t('batch_rows')+(s.rawCount??'—')+' · '+t('newly_accepted')+(s.newAccepted??'—');const on=w.body.querySelector('[data-auto-refresh]');on.checked=historySession?.snapshot().active?historySession.snapshot().restoreAuto:s.enabled;w.body.querySelector('[data-acquisition-summary]').replaceChildren(el('p',i18n.status(s.text)+' · '+s.tier+' ms'),el('p',t("batch_rows")+(s.rawCount??'—')+t("newly_accepted")+(s.newAccepted??'—')),el('p',t("current_request")+time(s.lastStart,true)),el('p',t("last_completion")+time(s.lastSuccess,true)),el('p',t("next")+time(Math.max(s.nextAttempt||0,shared.nextAttempt||0)||null,true)),el('p',t("progress")+(s.progress?t('progress_'+s.progress):t("unconfirmed"))+' · '+i18n.status(shared.reason||s.text)),el('small',shared.mode==='web-locks'?t("shared_across_same_origin_tabs"):t("single_tab_acquisition_other_pages_must_wait")),el('p',t("latest_event")+time(s.latestEvent,true)),el('small',t("time_zone")+clockText.zone));}
  let graphicSignature=null,nextGraphicBoundary=-Infinity;
  function eventAge(at,floor=.30){return presentation.age(at,observationT,settings.hours,settings.fade,floor);}
  function updateAges(){for(const l of clusterLayer.getLayers()){if(Number.isFinite(l.options.ptcgSourceTime))l.setOpacity(eventAge(l.options.ptcgSourceTime));for(const n of l._icon?.querySelectorAll('[data-map-time]')||[])n.textContent=time(Number(n.dataset.mapTime));}for(const l of eventLayer.getLayers()){if(!Number.isFinite(l.options.ptcgSourceTime))continue;const opacity=(l.options.ptcgBaseOpacity??1)*eventAge(l.options.ptcgSourceTime);if(l.setOpacity)l.setOpacity(opacity);else l.setStyle?.({opacity});}for(const g of drawn.values())for(const l of g.getLayers())if(Number.isFinite(l.options.ptcgSourceTime))l.setStyle({opacity:eventAge(l.options.ptcgSourceTime,l.options.ptcgAgeFloor??.28)});for(const n of document.querySelectorAll('.ptcg-hover [data-event-time]'))n.textContent=time(Number(n.dataset.eventTime));}
  function render(){renderHistorySummary();if(!wm)return;
    const signature=JSON.stringify([model.revision,observationRevision,settings,mapScope,window.map.getZoom(),window.map.hasLayer(masterLayer),Object.values(layers).map(l=>window.map.hasLayer(l))]);
    if(!fullRedraw&&signature===graphicSignature&&observationT<nextGraphicBoundary){updateAges();dirty=new Set();}else{
      const names=fullRedraw||signature!==graphicSignature?new Set([...model.players.keys(),...drawn.keys()]):dirty;for(const name of names)drawPlayer(name);dirty=new Set();fullRedraw=false;drawClusters();drawEvents();drawInferences();counters.renderedPlayers=drawn.size;graphicSignature=signature;nextGraphicBoundary=Infinity;for(const e of model.events.values())for(const at of [e.time,e.time+settings.hours*3600000+1,e.time+360000])if(at>observationT)nextGraphicBoundary=Math.min(nextGraphicBoundary,at);
    }updateFollow();
    for(const w of wm.windows.values())if(!w.node.hidden&&!w.minimized){
      if(w.player)renderReader(w);else if(w.id==='dashboard')renderDashboard();else if(w.id==='acquisition'){renderAuto();updateBacktrackUI();}else if(w.id==='data'){updateStorageSummary();updateExportPreview();}else if(w.kind==='overlap')renderOverlap(w);
    }
    playerRefreshHeader();for(const b of document.querySelectorAll('[data-workspace-refresh]')){b.disabled=refreshBusy;b.title=messages.refreshText;}
    for(const n of document.querySelectorAll('.ptcg-window [data-setting]')){if(document.activeElement===n||n.dataset.draft==='1')continue;const k=n.dataset.setting;if(n.type==='checkbox')n.checked=settings[k];else{if(k==='hours'&&![...n.options].some(o=>Number(o.value)===settings.hours)){const o=el('option',settings.hours+t("hours"));o.value=settings.hours;n.append(o);}n.value=settings[k];}}
  }
  function canonical(name){return [...model.players.keys()].find(n=>n.toLowerCase()===String(name).toLowerCase())||String(name);}
  function locate(name){return playerWindow(name,'reader');}
  api.locatePlayer=locate;
  let backtrack=null,backtrackArchive=null,backtrackArchiveChain=Promise.resolve(),backtrackSaveError='',backtrackArchiveBytes=0,backtrackArchiveTx=null,backtrackPolicy=0;
  const BACKTRACK_KEY=KEY+'-backtrack';
  async function archiveDB(){if(backtrackArchive)return backtrackArchive;backtrackArchive=await new Promise((resolve,reject)=>{const q=indexedDB.open(DB+'-backtrack',1);q.onupgradeneeded=()=>q.result.createObjectStore('pages');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});const rows=await new Promise((resolve,reject)=>{const q=backtrackArchive.transaction('pages').objectStore('pages').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});backtrackArchiveBytes=rows.reduce((n,r)=>n+JSON.stringify(r).length*2,0);return backtrackArchive;}
  function archivePage(id,index,page){if(!settings.persist)return;const epoch=dataGeneration,policy=backtrackPolicy;backtrackArchiveChain=backtrackArchiveChain.then(async()=>{await coordinator.whenTransportIdle();await chain;if(epoch!==dataGeneration||policy!==backtrackPolicy||!settings.persist)return;const db=await archiveDB(),entry={session:id,index,page,epoch},bytes=JSON.stringify(entry).length*2;if(settings.storageLimits){const data=await activityStore.read(),activityBytes=[...data.records,...data.conflicts,...data.observationScopes].reduce((n,r)=>n+JSON.stringify(r).length*2,0);if(settings.maxMegabytes>0&&activityBytes+backtrackArchiveBytes+bytes>settings.maxMegabytes*1048576||settings.maxRecords>0&&new Set(data.records.map(e=>e.guid).concat((page.response?.result||[]).filter(r=>typeof r?.[0]==='string').map(r=>r[0]))).size>settings.maxRecords)throw Error(t('backtrack_archive_capacity'));}if(epoch!==dataGeneration||policy!==backtrackPolicy||!settings.persist)return;await new Promise((resolve,reject)=>{const tx=backtrackArchiveTx=db.transaction('pages','readwrite');tx.objectStore('pages').put(entry,id+':'+index);tx.oncomplete=()=>{backtrackArchiveTx=null;backtrackArchiveBytes+=bytes;resolve();};tx.onabort=tx.onerror=()=>{backtrackArchiveTx=null;reject(tx.error||Error(t('backtrack_archive_cancelled')));};});}).catch(e=>{backtrackSaveError=t('backtrack_archive_failed')+': '+e.message;updateBacktrackUI();});}
  async function exportBacktrack(){const epoch=dataGeneration,state=backtrack.snapshot(),memory=backtrack.rawPages().slice();await backtrackArchiveChain;let saved=[];if(settings.persist){const db=await archiveDB();saved=await new Promise((resolve,reject)=>{const q=db.transaction('pages').objectStore('pages').getAll();q.onsuccess=()=>resolve(q.result.filter(r=>r.epoch===epoch&&r.session===state.id).sort((a,b)=>a.index-b.index).map(r=>r.page));q.onerror=()=>reject(q.error);});}if(epoch!==dataGeneration)throw Error(t('backtrack_reason_cleared'));return {format:'echotrace-backtrack-1',version:VERSION,session:state,scope:'raw public COMM responses; server completeness unknown',pages:[...new Map(saved.concat(memory).map(p=>[JSON.stringify([p.query,p.at,p.error||null]),p])).values()]};}
  async function downloadBacktrack(){try{const data=await exportBacktrack(),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=el('a');a.href=url;a.download='echotrace-'+VERSION+'-historical-raw.json';a.click();const timer=setTimeout(()=>URL.revokeObjectURL(url),60000);cleanup.push(()=>{clearTimeout(timer);URL.revokeObjectURL(url);});}catch(e){backtrackSaveError=t('backtrack_archive_failed')+': '+e.message;updateBacktrackUI();}}

  function initBacktrack(){initHistorySession();initCapture();if(settings.persist)archiveDB().catch(e=>{backtrackSaveError=t('backtrack_archive_failed')+': '+e.message;});backtrack=createTrackerBacktrack({generation:()=>dataGeneration,send:(...a)=>coordinator.submit(...a),wait:()=>!ready?'backtrack_reason_loading':clearing?'backtrack_reason_cleared':document.hidden?'backtrack_reason_hidden':!window.map.hasLayer(masterLayer)?'backtrack_reason_layer':window.map.getZoom()<MIN_ZOOM?'backtrack_reason_zoom':window.isIdle?.()?'backtrack_reason_idle':null,
    ingest:(data,scope)=>{const times=data.result.filter(r=>Number.isSafeInteger(r?.[1])&&r[1]<=observationT&&r[1]>=observationT-86400000).map(r=>r[1]);if(times.length){settings.hours=Math.min(24,Math.max(settings.hours,(observationT-Math.min(...times))/3600000));saveSettings();}const parsed=data.result.map(row=>{try{return core.parse(row,'historical-backtrack',Date.now());}catch(_){return null;}}),valid=parsed.filter(Boolean),beforeSize=model.events.size,seen=new Map();let duplicates=0,conflicts=0;for(const e of valid){const prior=seen.get(e.guid)||model.events.get(e.guid);if(prior){if(prior.identity!==e.identity||prior.raw&&e.raw&&core.stable(prior.raw)!==core.stable(e.raw))conflicts++;else duplicates++;}if(!prior)seen.set(e.guid,e);}handle({result:data.result},{epoch:dataGeneration,scope,source:'historical-backtrack'});return {added:model.events.size-beforeSize,duplicates,unparsed:parsed.length-valid.length+conflicts};},archive:archivePage,
    save:progress=>{try{localStorage.setItem(BACKTRACK_KEY,JSON.stringify({generation:dataGeneration,persistentRecords:settings.persist,...progress}));}catch(e){backtrackSaveError='進度保存失敗 / progress save failed: '+e.message;}},change:backtrackChanged});
    try{const saved=JSON.parse(localStorage.getItem(BACKTRACK_KEY)||'null');if(saved?.generation===dataGeneration&&saved.session?.right&&saved.session?.lower===saved.session.right-86400000){if(!saved.persistentRecords&&saved.session){saved.session={...saved.session,cursor:null,earliest:null,pages:0,returned:0,added:0,duplicates:0,unparsed:0,seenCursors:[],elapsedMs:0};}backtrack.restore(saved);if(saved.session)messages.historyRestored=()=>t('history_reload_restored');}}catch(e){backtrackSaveError='進度無法恢復 / restore failed: '+e.message;}
    api.backtrack={state:()=>backtrack.snapshot(),configure:()=>{prepareBacktrack();return backtrack.snapshot();},start:()=>startMapBacktrack(backtrack.snapshot().automatic),step:()=>startMapBacktrack(false),pause:()=>backtrack.pause(),automatic:on=>{backtrack.setAutomatic(on);},clearCursor:()=>backtrack.clear(),rawPages:()=>backtrack.rawPages(),exportRaw:exportBacktrack};
  }
  let historySession=null,backtrackLease=null,capture=null,historyFreezeRight=null;
  const HISTORY_PAUSE_KEY=KEY+'-history-pause';
  function mapRecordInterval(area=false){const b=acquisitionTarget().bounds,rows=[...model.events.values()].filter(e=>e.time<=observationT&&e.time>=observationT-Math.min(24,settings.hours)*3600000&&(!area||e.portals.some(p=>p.position&&p.position[0]*1e6>=b.minLatE6&&p.position[0]*1e6<=b.maxLatE6&&p.position[1]*1e6>=b.minLngE6&&p.position[1]*1e6<=b.maxLngE6)));return {earliest:rows.length?rows.reduce((n,e)=>Math.min(n,e.time),Infinity):null,latest:rows.length?rows.reduce((n,e)=>Math.max(n,e.time),-Infinity):null,count:rows.length};}
  function renderMapIntervals(){const interval=mapRecordInterval(),value=t('map_interval')+' '+(interval.count?clockText.absolute(interval.earliest)+' ~ '+clockText.absolute(interval.latest):t('map_interval_empty'));for(const n of document.querySelectorAll('[data-map-interval]')){if(n.textContent!==value)n.textContent=value;n.dataset.earliest=interval.earliest??'';n.dataset.latest=interval.latest??'';}for(const n of document.querySelectorAll('[data-history-pause]'))n.textContent=historySession?.snapshot().active?t('history_live_paused'):(messages.historyRestored||'');}
  function intervalNode(){const n=el('p',undefined,'ptcg-map-interval');n.dataset.mapInterval='1';return n;}
  function initHistorySession(){if(historySession)return;historySession=createTrackerHistorySession({live:()=>acquisition.snapshot().enabled,setLive:on=>acquisition.enable(on),observation:()=>({live:liveObservation,T:observationT}),freeze:()=>{const latest=historyFreezeRight??mapRecordInterval(true).latest;liveObservation=false;observationT=latest??observationT;observationRevision++;syncObservationInputs();requestRender(true);},restore:(prior,on)=>{historyFreezeRight=null;liveObservation=on&&prior.live;observationT=liveObservation?Date.now():(prior.live?observationT:prior.T);observationRevision++;syncObservationInputs();requestRender(true);},save:s=>{if(s)localStorage.setItem(HISTORY_PAUSE_KEY,JSON.stringify(s));else localStorage.removeItem(HISTORY_PAUSE_KEY);},recovered:()=>{messages.historyRestored=()=>t('history_reload_restored');},change:()=>renderMapIntervals()});try{historySession.recover(JSON.parse(localStorage.getItem(HISTORY_PAUSE_KEY)||'null'));}catch(_){localStorage.removeItem(HISTORY_PAUSE_KEY);}api.mapTimeInterval=()=>({...mapRecordInterval(),cutoff:observationT,lower:observationT-settings.hours*3600000,hours:settings.hours,pause:historySession.snapshot()});}
  function backtrackChanged(state){if(!state.active&&backtrackLease!==null){const lease=backtrackLease;backtrackLease=null;historySession.release(lease);}updateBacktrackUI();renderMapIntervals();}
  function prepareBacktrack(){if(capture?.snapshot().running)capture.cancel('task-switch');cancelHistoryAction();acquisition.cancelHistory();const current=acquisitionTarget(),prior=backtrack.snapshot();const compatible=JSON.stringify(current.bounds)===JSON.stringify(prior.bounds)&&prior.lower===prior.right-86400000&&prior.right<=observationT&&prior.right>=observationT-86400000;if(!compatible){const interval=mapRecordInterval(true),right=interval.latest??observationT,T=interval.earliest??right;backtrack.configure(T,current.bounds,{right,lower:right-86400000});}historyFreezeRight=backtrack.snapshot().right;return true;}
  function startMapBacktrack(automatic){prepareBacktrack();backtrack.setAutomatic(automatic);if(backtrackLease===null)backtrackLease=historySession.acquire();backtrack.start();}
  function buildBacktrack(w){w.body.append(intervalNode(),el('small',t('map_history_help')));const actions=el('div',undefined,'ptcg-actions'),step=button(t('backtrack_one_page'),()=>startMapBacktrack(false)),start=button(t('backtrack_start_auto'),()=>startMapBacktrack(true)),stop=button(t('backtrack_stop'),()=>backtrack.pause());step.dataset.backtrackStep='1';start.dataset.backtrackStart='1';stop.dataset.backtrackStop='1';actions.append(step,start,stop);w.body.append(actions);const pause=el('small');pause.dataset.historyPause='1';w.body.append(pause);for(const key of ['status','progress','times','scope','counts','warning']){const n=el(key==='warning'?'small':'p');n.dataset['backtrack'+key[0].toUpperCase()+key.slice(1)]='1';w.body.append(n);}const details=el('details'),raw=el('pre');raw.dataset.backtrackDiagnostics='1';details.append(el('summary',t('backtrack_diagnostics')),button(t('backtrack_download_raw'),downloadBacktrack),raw);w.body.append(details);updateBacktrackUI();renderMapIntervals();}
  function initCapture(){if(capture)return;capture=createTrackerCapture({version:VERSION,source:location.origin+location.pathname,generation:()=>dataGeneration,send:(...a)=>coordinator.submit(...a),change:updateCaptureUI});api.capture={start:options=>{messages.captureError='';if(backtrack?.snapshot().active)backtrack.pause('backtrack_reason_task');acquisition.cancelHistory();return capture.start({...options,bounds:options.bounds||acquisitionTarget().bounds});},cancel:()=>capture.cancel(),state:()=>capture.snapshot(),bundle:()=>capture.bundle()};}
  function buildCapture(w){const now=Date.now(),fields={};w.body.append(el('p',t('capture_scope_help')));for(const [key,value,label]of [['start',now-3600000,'capture_start'],['end',now,'capture_end']]){const n=el('input'),wrap=el('label',t(label),'ptcg-field');n.type='datetime-local';n.step='.001';n.value=clockText.absolute(value).replaceAll('/','-').replace(' ','T');n.dataset.captureTime=key;wrap.append(n);fields[key]=n;w.body.append(wrap);}for(const [key,value,min,max]of [['delayMs',1200,800,3600000],['maxPagesPerTab',100,1,500]]){const n=el('input'),wrap=el('label',t(key==='delayMs'?'capture_delay':'capture_limit'),'ptcg-field');n.type='number';n.value=value;n.min=min;n.max=max;n.dataset.captureOption=key;fields[key]=n;wrap.append(n);w.body.append(wrap);}const start=button(t('capture_start_button'),()=>{api.capture.start({startMs:Date.parse(fields.start.value),endMs:Date.parse(fields.end.value),delayMs:Number(fields.delayMs.value),maxPagesPerTab:Number(fields.maxPagesPerTab.value)}).catch(e=>{messages.captureError=()=>t('capture_invalid');updateCaptureUI();});}),cancel=button(t('capture_cancel'),()=>capture.cancel()),download=button(t('capture_download'),()=>{const bundle=capture.bundle();if(!bundle)return;const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='comm_capture_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();const timer=setTimeout(()=>URL.revokeObjectURL(url),60000);cleanup.push(()=>{clearTimeout(timer);URL.revokeObjectURL(url);});});start.dataset.captureStart='1';cancel.dataset.captureCancel='1';download.dataset.captureDownload='1';const status=el('p',undefined,'ptcg-capture-status');status.dataset.captureStatus='1';w.body.append(start,cancel,download,status,el('small',t('capture_provenance')));updateCaptureUI();}
  function updateCaptureUI(){if(!wm||!capture)return;const s=capture.snapshot(),range=s.range,w=wm.get('acquisition');if(!w)return;const start=w.body.querySelector('[data-capture-start]'),cancel=w.body.querySelector('[data-capture-cancel]'),download=w.body.querySelector('[data-capture-download]'),status=w.body.querySelector('[data-capture-status]');if(start)start.disabled=s.running;if(cancel)cancel.disabled=!s.running;if(download)download.disabled=s.running||!s.range;for(const n of w.body.querySelectorAll('[data-capture-time],[data-capture-option]'))n.disabled=s.running;if(status)status.textContent=t('capture_state_'+s.state)+' · '+t('capture_pages',{n:s.pages})+(s.reason?' · '+t('capture_reason_'+s.reason):'')+(s.summary?' · RAW '+s.summary.rawRecords+' · '+t('capture_duplicates',{n:s.summary.duplicateInRangeOccurrences}):'')+(range?' · '+clockText.absolute(range.startMs)+' ~ '+clockText.absolute(range.endMs):'')+(messages.captureError?' · '+messages.captureError:'');}
  function updateBacktrackUI(){if(!backtrack||!wm)return;const w=wm.get('backtrack');if(!w)return;const s=backtrack.snapshot(),shared=coordinator?.snapshot(),text=(key,value)=>{const n=w.body.querySelector('[data-backtrack-'+key+']');if(n&&n.textContent!==value)n.textContent=value;},seconds=Math.floor((s.elapsedMs||0)/1000),elapsed=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'),reason=String(s.reason||''),reasonText=reason.startsWith('backtrack_reason_')?t(reason.split(' HTTP ')[0])+(reason.includes(' HTTP ')?' HTTP '+reason.split(' HTTP ')[1]:''):t('backtrack_reason_failed');
    const retry=shared?.nextAttempt&&shared.nextAttempt>Date.now()?' · '+t('backtrack_retry',{n:Math.ceil((shared.nextAttempt-Date.now())/1000)}):'';text('status',t('backtrack_state_'+(s.state||'off'))+' · '+t('backtrack_automatic')+' '+(s.automatic?'ON':'OFF')+' · '+reasonText+retry);text('progress',t('backtrack_progress',{pages:s.pages||0,returned:s.returned||0,added:s.added||0,duplicates:s.duplicates||0,unparsed:s.unparsed||0}));text('times',t('history_elapsed',{elapsed})+' · '+t('map_24h_limit'));renderMapIntervals();text('scope',t('backtrack_scope'));text('counts',t('backtrack_counts',{memory:model.events.size,saved:persisted.size,visible:visibleHistoryCount()}));text('warning',backtrackSaveError+' '+t(settings.persist?'backtrack_persistent':'backtrack_not_persistent')+' '+t('backtrack_view_retention',{hours:settings.hours,days:settings.retentionDays}));text('diagnostics',JSON.stringify({session:s.id,bounds:s.bounds,cursor:s.cursor,sharedWait:shared?.reason},null,2));const auto=w.body.querySelector('[data-backtrack-automatic]');if(auto)auto.checked=s.automatic;const input=w.body.querySelector('[data-backtrack-time]');if(s.T&&input&&!input._dirty&&document.activeElement!==input)input.value=clockText.absolute(s.T).replaceAll('/','-').replace(' ','T');
  }

  const primaryIds=['dashboard','acquisition','map-display','data','settings'];
  const legacyPanels={auto:['acquisition','live'],backtrack:['acquisition','history'],storage:['data','storage'],export:['data','export'],about:['settings','about']};
  const primaryTitles=()=>({dashboard:t('nav_overview'),acquisition:t('nav_acquisition'),'map-display':t('nav_map'),data:t('nav_data'),settings:t('nav_settings')});
  function primaryNavigation(w){w.node.dataset.primaryEntry=w.id;w.tab.dataset.primaryEntry=w.id;w.tabItem.classList.add('ptcg-primary-tab');if(w.id!=='dashboard')return;const menu=el('details');menu.dataset.primaryNavigation='1';menu.append(el('summary',t('nav_open_page')));const nav=el('div',undefined,'ptcg-actions');for(const id of primaryIds){const b=button(primaryTitles()[id],()=>openPanel(id));b.dataset.primaryEntry=id;nav.append(b);}menu.append(nav);w.body.append(menu);}

  function secondaryPages(w,definitions,defaultPage){const nav=el('nav',undefined,'ptcg-actions');nav.dataset.secondaryNavigation='1';w.pages=new Map();w.body.append(nav);for(const [id,title,build]of definitions){const node=el('section');node.dataset.controlPage=id;w.pages.set(id,node);const b=button(title,()=>showControlPage(w,id));b.dataset.controlPageButton=id;nav.append(b);w.body.append(node);build({...w,body:node});}showControlPage(w,w.subpage||defaultPage,false);}
  function showControlPage(w,id,persist=true){if(!w.pages?.has(id))id=w.pages?.keys().next().value;w.subpage=id;for(const [key,n]of w.pages||[])n.hidden=key!==id;for(const b of w.body.querySelectorAll('[data-control-page-button]'))b.setAttribute('aria-pressed',String(b.dataset.controlPageButton===id));if(persist)wm.save();updateBacktrackUI();renderAuto();updateCaptureUI();renderMapIntervals();updateStorageSummary();updateExportPreview();}
  function buildAcquisition(w){primaryNavigation(w);secondaryPages(w,[['live',t('nav_live'),buildLivePage],['history',t('nav_history'),buildBacktrack],['download',t('nav_download'),buildCapture]],'live');}
  function buildLivePage(w){w.body.append(intervalNode());const pause=el('small');pause.dataset.historyPause='1';w.body.append(pause);if(settings.mapHoursClamped)w.body.append(el('p',t('map_hours_migrated'),'ptcg-warning'));const actions=el('div',undefined,'ptcg-actions'),refresh=button(t('refresh'),refreshPublic);refresh.dataset.refresh='1';actions.append(refresh,button(t('fetch_range_again'),()=>fetchHistory(true)));w.body.append(actions,el('small',t('global_time_scope')),field(t('lookback'),'hours',hourOptions));buildObservationControls(w);buildAuto(w);const liveStatus=el('p');liveStatus.dataset.livePrimary='1';w.body.prepend(liveStatus);const diagnostic=el('details');diagnostic.dataset.liveDiagnostics='1';diagnostic.append(el('summary',t('live_diagnostics')),w.body.querySelector('[data-acquisition-summary]'));w.body.append(diagnostic);const advanced=el('details'),summary=el('summary',t('advanced_requests')),controls=[...w.body.children].filter(n=>n.querySelector?.('[data-setting=budgetEnabled], [data-setting=burstMs], [data-setting=burstPages], [data-setting=budgetWindowMs], [data-setting=budgetRequests], [data-setting=budgetCooldownMs]'));advanced.append(summary,...controls,el('small',t('budget_defaults_off_enabling_it_delays_catch_up_and_retains_curso')));w.body.append(advanced,createHistoryStatus());}
  function buildObservationControls(w){const mode=el('label',undefined,'ptcg-check'),live=el('input'),at=el('input');live.type='checkbox';live.checked=liveObservation;live.dataset.liveObservation='1';at.type='datetime-local';at.step='.001';at.dataset.observationTime='1';at.value=clockText.absolute(observationT).replaceAll('/','-').replace(' ','T');live.addEventListener('change',()=>{api.setObservationTime(live.checked?null:Date.now());});at.addEventListener('change',()=>{const n=Date.parse(at.value);if(Number.isSafeInteger(n))api.setObservationTime(n);});mode.append(live,document.createTextNode(t('live_observation')));w.body.append(mode,at,el('small',clockText.zone+' · '+t('live_fixed_hint')));}
  function buildData(w){primaryNavigation(w);secondaryPages(w,[['storage',t('nav_storage'),buildStorage],['export',t('nav_export'),buildExport]],'storage');w.body.append(button(t('backtrack_download_raw'),downloadBacktrack));}
  function buildMapDisplay(w){primaryNavigation(w);const roles=el('fieldset');roles.append(el('legend',t('visible_factions_accounts')));for(const role of ['RES','ENL','MACHINA','NIA','OTHER']){const label=el('label',undefined,'ptcg-check'),input=el('input');input.type='checkbox';input.dataset.roleVisibility=role;input.checked=!!settings.roleVisibility[role];input.addEventListener('change',()=>{settings.roleVisibility[role]=input.checked;saveSettings();if(input.checked)layers[role].addTo(window.map);else window.map.removeLayer(layers[role]);requestRender(true);});label.append(input,factionBadge(role),document.createTextNode(roleLabels[role]));roles.append(label);}w.body.append(roles);const grid=el('div',undefined,'ptcg-grid');for(const [label,key]of [['player_names','names'],['faction_markers','markers'],['activity_times','labelTime'],['activity_events','events'],['destroyed_links','destroyedLinks'],['interaction_connections','paths'],['fade_older_activity','fade']])grid.append(checkbox(t(label),key));const experiment=el('fieldset');experiment.dataset.historicalInferenceGroup='1';experiment.append(el('legend',t('historical_inference_group')));for(const [label,key]of [['historical_positions','historicalPositions'],['historical_regions','historicalRegions'],['inferred_connections','historicalPaths']])experiment.append(checkbox(t(label),key));w.body.append(grid,experiment);buildFactionControls(w);}
  function buildSharedSettings(w){primaryNavigation(w);secondaryPages(w,[['preferences',t('nav_preferences'),buildPreferences],['inference',t('nav_shared_inference'),buildSharedInference],['about',t('about'),buildAbout]],'preferences');}
  function buildPreferences(w){w.body.append(field(t('language'),'language',[['auto','Auto'],['en','English'],['zh-TW','繁體中文'],['zh-CN','简体中文'],['ja','日本語']],refreshLocale),field(t('time_format'),'timeMode',[['relative',t('relative_time')],['absolute',t('absolute_time')]]),field(t('activity_rows'),'summaryRows',[[3,'3'],[5,'5'],[10,'10']]),field(t('detail_rows'),'pageSize',[[10,t('10_records')],[20,t('20_records')],[40,t('40_records')]]),checkbox(t('speed_estimates'),'speed'));}
  function buildSharedInference(w){w.body.append(el('p',t('shared_inference_scope')),field(t('inference_reference'),'inferenceReference',[['local-average',t('local_average_choice')],['minimum-movement',t('minimum_movement_choice')],['both',t('both_references')]]),field(t('primary_map_result'),'historicalPrimary',[['minimum-movement',t('minimum_movement_choice')],['local-average',t('local_average_choice')]]),field(t('attack_assumption'),'historicalScenario',[['interaction',t('interaction_baseline')],['XMP',t('xmp_assumption')]]));buildXMP(w);const quick=button(t('apply_shared_xmp'),()=>{settings.inferenceReference='minimum-movement';settings.historicalScenario='XMP';saveSettings();requestRender(true);});quick.dataset.attackSimulation='1';w.body.append(quick,el('small',t('historical_inspection_help')));}
  function openSharedInference(){const w=openPanel('settings');showControlPage(w,'inference');}
  function migrateNavigation(saved){if(saved.navSchema===3)return;const original=JSON.parse(JSON.stringify(saved));saved.legacyNavigationLayouts=original;const map=id=>id==='settings'?'map-display':legacyPanels[id]?.[0]||id,owners=new Map();
    for(const row of saved.tabs||[]){const id=map(row.id),existing=owners.get(id),active=(saved.containers||[]).some(c=>c.active===row.id);if(!existing||active&&(!existing.active||row.owner?.startsWith('detached:')))owners.set(id,{row,active});}
    saved.tabs=[...owners].map(([id,{row}])=>{const old=row.id,copy={...row,id};if(legacyPanels[old])copy.subpage=legacyPanels[old][1];if(copy.player){copy.kind='reader';copy.expanded=row.expanded||[];copy.limit=row.limit||Math.max(row.summaryRows||settings.summaryRows,((row.page||0)+1)*(row.summaryRows||settings.summaryRows));copy.scroll={...row.scroll,reader:row.scroll?.[row.kind]??row.scroll?.reader??0};}if(copy.owner?.startsWith('detached:'))copy.owner='detached:'+id;return copy;});
    for(const c of saved.containers||[]){if(c.id.startsWith('detached:'))c.id='detached:'+map(c.id.slice(9));c.active=map(c.active);c.order=[...new Set((c.order||[]).map(map))].filter(id=>saved.tabs.find(t=>t.id===id)?.owner===c.id);if(!c.order.includes(c.active))c.active=c.order[0]||null;}saved.containers=[...new Map((saved.containers||[]).map(c=>[c.id,c])).values()];saved.navSchema=3;
  }

  function openPanel(id='dashboard'){
    if(id==='players')id='dashboard';const alias=legacyPanels[id];if(alias)id=alias[0];const titles=primaryTitles(),builders={dashboard:buildDashboard,acquisition:buildAcquisition,'map-display':buildMapDisplay,data:buildData,settings:buildSharedSettings};if(!builders[id])return null;
    const panel=wm.open(id,titles[id],builders[id],id==='dashboard'?490:460,590);if(alias)showControlPage(panel,alias[1]);render();return panel;
  }

  api.open=openPanel;api.windows=()=>wm.windows;api.workspaces=()=>wm;
  function playerWindow(name,kind,preserveFollow=false,forceFollow=false){kind='reader';
    name=canonical(name);const id='player:'+name.toLowerCase(),existing=wm.get(id);
    const w=wm.open(id,name,w=>{w.kind=kind;w.player=name;w.limit=settings.summaryRows;w.summaryRows=settings.summaryRows;},470,550);
    if(!existing)w.kind=kind;w.node.dataset.playerWindow=name;w.node.dataset.kind=w.kind;
    w.onActivate=()=>{if(w.kind==='detail')renderDetail(w);else renderReader(w);};
    if(!preserveFollow)selection(name);render();wm.save();return w;
  }
  function openReader(name){const prior=wm.get('player:'+canonical(name).toLowerCase());if(prior)prior.viewSection='activity';return playerWindow(name,'reader');}
  function openDetail(name){return openReader(name);}

  api.openPlayer=openReader;api.openDetail=openDetail;
  function selection(name){settings.selected=name;saveSettings();}
  function field(title,key,values,change){const label=el('label',title,'ptcg-field'),input=el('select');input.dataset.setting=key;for(const[value,text]of values){const o=el('option',text);o.value=value;input.append(o);}input.value=settings[key];input.addEventListener('change',()=>{if(localizing)return;const previous=settings[key];settings[key]=typeof defaults[key]==='number'?Number(input.value):input.value;saveSettings();change?.();if(key==='hours')lookbackChanged(previous);requestRender(true);});label.append(input);return label;}
  function checkbox(title,key){const label=el('label',undefined,'ptcg-check'),input=el('input');input.type='checkbox';input.checked=settings[key];input.dataset.setting=key;input.addEventListener('change',()=>{if(localizing)return;settings[key]=input.checked;saveSettings();if(key==='persist')persistenceChanged();requestRender(true);});label.append(input,document.createTextNode(title));return label;}
  function buildDashboard(w){
    primaryNavigation(w);
    const stats=el('div');stats.dataset.dashboardStats='1';const ghosts=el('div');ghosts.dataset.ghosts='1';const charts=el('div',undefined,'ptcg-charts');charts.dataset.charts='1';
    const input=el('input');input.type='search';input.placeholder=t("search_players");input.value=searchTerm;input.setAttribute('aria-label',t("search_players"));input.addEventListener('input',()=>{searchTerm=input.value;playerLimit=40;renderDashboard();});
    const picks=el('div',undefined,'ptcg-actions');picks.append(button(t("select_all"),()=>{manualSelection([...model.players.keys()]);}),button(t("clear_selection"),()=>{manualSelection([]);}));const label=el('small');label.dataset.selectionSummary='1';const list=el('div');list.dataset.players='1';
    const detail=el('details');detail.dataset.overviewDetails='1';detail.append(el('summary',t('overview_details')),charts);w.body.append(stats,ghosts,detail,input,picks,label,field(t("account_category"),'listCategory',categories),field(t("source_faction"),'faction',[['all',t("all")],...Object.entries(core.teams).map(([key,value])=>[key,i18n.status(value)])]),list);
  }
  function renderDashboard(){
    const w=wm.get('dashboard');if(!w)return;
    const views=[...model.players.keys()].map(n=>sharedView(n,settings.hours)).filter(v=>v.last),available=views.filter(v=>(settings.faction==='all'||v.team===settings.faction)&&categoryMatches(v.role,settings.listCategory)),found=available.filter(v=>v.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b)=>b.last.time-a.last.time||a.name.localeCompare(b.name));
    const filtered=found.filter(v=>scopeIncludes(v.name,{kind:'overview'})),c={RES:0,ENL:0,MACHINA:0,NIA:0,OTHER:0};for(const v of filtered)c[v.role]++;renderCharts(w.body.querySelector('[data-charts]'),filtered);
    const latest=filtered.reduce((t,v)=>Math.max(t,v.last.time),-Infinity),count=filtered.reduce((n,v)=>n+v.events.length,0);
    w.body.querySelector('[data-dashboard-stats]').replaceChildren(el('p',t("players_93")+(c.RES+c.ENL)+' · RES '+c.RES+' · ENL '+c.ENL),el('small','Machina '+c.MACHINA+' · NIA '+c.NIA+t("other_94")+c.OTHER),el('p',count+t("events_latest")+time(latest)),el('p',briefStatus()),el('p',messages.refreshText),el('p',messages.historyText));const refresh=w.body.querySelector('[data-refresh]');if(refresh)refresh.disabled=refreshBusy;
    w.body.querySelector('[data-selection-summary]').textContent=settings.overviewSelection.length?t("selected")+settings.overviewSelection.length+t("players_97"):t("showing_all_players");const alert=w.body.querySelector('[data-ghosts]');alert.replaceChildren();
    if(settings.speed)for(const v of filtered){const sp=speeds(v);if(sp?.ghost||sp?.ghostCandidate)alert.append(roleStyle(button(t("unusual_speed_candidate")+v.name,()=>openReader(v.name),'ptcg-ghost'),v));}
    const list=w.body.querySelector('[data-players]');updatePlayerRows(w,list,found.slice(0,playerLimit));
    let footer=list.querySelector('[data-player-footer]');if(!footer){footer=el('div');footer.dataset.playerFooter='1';list.append(footer);}footer.replaceChildren(el('small',found.length+t('accounts'),'ptcg-count'));
    if(!found.length)footer.append(el('p',t('no_data_yet')));if(found.length>playerLimit)footer.append(button(t('more_players'),()=>{playerLimit+=40;renderDashboard();}));
  }
  function presentPlayerRow(row,v){
    const selected=settings.overviewSelection.some(n=>n.toLowerCase()===v.name.toLowerCase()),eligible=!!v.last&&matches(v.name,v)&&window.map.hasLayer(masterLayer)&&window.map.hasLayer(layers[v.role]);
    row._view=v;row.dataset.player=v.name;row._pick.textContent=selected?'☑':'☐';row._pick.dataset.selectPlayer=v.name;row._pick.setAttribute('aria-pressed',String(selected));row._pick.setAttribute('aria-label',t('select')+v.name);row._name.textContent=v.name;roleStyle(row._name,v);row._name.style.borderLeftColor=roleColors[v.role];row._activity.textContent=t('activity');
    row._meta.textContent=roleLabels[v.role]+(v.last?' · '+time(v.last.time):'');roleStyle(row._meta,v);row._counts.textContent=t('event_counts')+countText(counts(v.events));row._counts.dataset.counts=JSON.stringify(counts(v.events));row._counts.dataset.total=v.events.length;
    row._state.textContent=!v.last?t('no_activity_within_lookback'):!eligible?t('hidden_by_current_filters_layers'):v.ambiguous?t('multiple_simultaneous_positions'):v.uncertainLatest?t('position_unknown'):'';
    const sp=speeds(v);row._ghost.textContent=sp?.ghost||sp?.ghostCandidate?t('unusual_speed_candidate'):'';row._ghost.hidden=!row._ghost.textContent;row.dataset.eligible=String(eligible);
  }
  function updatePlayerRows(w,list,views){
    w.playerRows ||=new Map();const keep=new Set(views.map(v=>v.name.toLowerCase()));for(const [id,row]of w.playerRows)if(!keep.has(id)){row.remove();w.playerRows.delete(id);}
    let cursor=list.firstChild;for(const v of views){const key=v.name.toLowerCase();let row=w.playerRows.get(key);if(!row||row.parentElement!==list){row=el('div',undefined,'ptcg-player-row');row._pick=button('',()=>toggleOverview(row._view.name),'ptcg-player-pick');row._name=button('',()=>openReader(row._view.name),'ptcg-player-name');row._name.dataset.openPlayer=v.name;row._activity=button('',()=>openReader(row._view.name),'ptcg-player-activity');row._activity.dataset.playerActivity=v.name;row._meta=el('span');row._counts=el('small',undefined,'ptcg-player-counts');row._state=el('small',undefined,'ptcg-player-state');row._ghost=el('strong',undefined,'ptcg-ghost-tag');row.append(row._pick,row._name,row._activity,row._meta,row._counts,row._state,row._ghost);w.playerRows.set(key,row);}presentPlayerRow(row,v);if(row!==cursor)list.insertBefore(row,cursor);cursor=row.nextSibling;}
  }
  function eventControl(text,fn){const n=button(text,e=>{e.preventDefault();e.stopPropagation();fn();});n.className='ptcg-event-action';return n;}
  function eventEndpoints(e,interactive=true){const n=el('span',undefined,'ptcg-compact-portal'),link=core.parseLink(e),portals=link?.endpoints||e.portals;
    if(!portals.length)n.textContent='—';
    for(const [i,p]of portals.entries()){if(i)n.append(document.createTextNode(link?(link.directed?' → ':' ↔ '):' · '));if(interactive){const node=portalLink(p);node.title=p.name||p.plain||t('unnamed_portal');n.append(node);}else n.append(document.createTextNode(p.name||p.plain||t('unnamed_portal')));}
    if(link&&!link.directed)n.append(el('small',t(link.destroyed?'link_object_endpoints':'link_direction_unknown')));return n;
  }
  function compactEvent(e,s,context='player',passive=false){const row=el('div',undefined,'ptcg-compact-event');row.dataset.event=e.guid;const stamp=el('span',undefined,'ptcg-event-time'),age=el('span',time(e.time));age.dataset.eventTime=e.time;stamp.append(age);stamp.title=time(e.time,true)+' · '+e.time;
    const action=el('span',undefined,'ptcg-event-kind'),label=actionText(e)+((s?.ghost||s?.ghostCandidate)?t('unusual_speed_candidate_109'):'');action.append(eventSymbol(e),passive?el('span',label):eventControl(label,()=>focusEvent(e)));
    const contextual=el('span',undefined,'ptcg-event-context');if(context==='portal'){const actor=passive?el('strong',e.player):eventControl(e.player,()=>openReader(e.player));actor.style.color=roleColors[core.role(e)];contextual.append(actor);if(core.parseLink(e))contextual.append(eventEndpoints(e,!passive));}else contextual.append(eventEndpoints(e,!passive));row.append(stamp,action,contextual);if(s?.ghost||s?.ghostCandidate)row.classList.add('ptcg-ghost');return row;
  }
  function playerHeading(w,v){w.heading.textContent=v.name+(w.kind==='detail'?t("details"):'');roleStyle(w.heading,v);w.node.classList.toggle('ptcg-ghost-window',!!(speeds(v)?.ghost||speeds(v)?.ghostCandidate));}
  function addPlayerSections(f,w){const nav=el('nav',undefined,'ptcg-player-sections');for(const [id,key]of [['activity','activity'],['inference','inference_tab']]){const b=button(t(key),()=>{w.viewSection=id;wm.save();requestRender(true);});b.dataset.playerSection=id;b.setAttribute('aria-pressed',String((w.viewSection||'activity')===id));nav.append(b);}f.prepend(nav);}
  function renderHistoricalReader(w){const savedScroll=w.body.scrollTop;const v=sharedView(w.player),base=inferenceFor(v),display=historicalModel.select(base?.historical,primaryModel(),settings.historicalScenario,w.historicalBranch??null),f=document.createDocumentFragment();playerHeading(w,v);const signature=JSON.stringify([i18n.locale(),v.events.map(e=>[e.guid,e.identity]),observationRevision,historicalTime(w.player),primaryModel(),settings.inferenceReference,settings.historicalScenario,w.historicalBranch,display.key,display.state,display.reason,inferencePending.has(v.name),follow.target,follow.paused,follow.manual]);const cutoffNode=w.body.querySelector('[data-historical-cutoff]');if(cutoffNode){const text=t('observation_cutoff')+' '+clockText.absolute(observationT);if(cutoffNode.textContent!==text)cutoffNode.textContent=text;}if(w.historicalRenderSignature===signature&&w.body.querySelector('[data-historical-time]'))return;w.historicalRenderSignature=signature;const actions=el('div',undefined,'ptcg-actions');followControl(actions,w.player);historyButton(actions,w);f.append(actions);addPlayerSections(f,w);
    const label=el('label',t('historical_time'),'ptcg-field'),input=el('input');input.type='datetime-local';input.step='.001';input.dataset.historicalTime='1';input.value=clockText.absolute(historicalTime(w.player)).replaceAll('/','-').replace(' ','T');input.addEventListener('change',()=>{const at=Date.parse(input.value);if(Number.isSafeInteger(at))api.setHistoricalTime(w.player,at);});label.append(input);const cutoffLabel=el('small',t('observation_cutoff')+' '+clockText.absolute(observationT));cutoffLabel.dataset.historicalCutoff='1';f.append(label,cutoffLabel);
    const slider=el('input');slider.type='range';slider.step=1;slider.min=v.events[0]?.time??observationT;slider.max=v.events.at(-1)?.time??observationT;slider.value=historicalTime(w.player);slider.dataset.historicalSlider='1';slider.setAttribute('aria-label',t('historical_time'));slider.addEventListener('change',()=>api.setHistoricalTime(w.player,Number(slider.value)));f.append(slider);
    f.append(el('p',t('shared_inference_scope')),button(t('adjust_shared_inference'),openSharedInference));
    const variants=(base?.historical?.variants||[]).filter(r=>r.model===primaryModel()&&r.scenario===settings.historicalScenario),branches=[...new Set(variants.map(r=>r.branch))];if(branches.length>1){const label=el('label',t('selected_branch'),'ptcg-field'),select=el('select');select.dataset.historicalBranch='1';for(const id of branches){const o=el('option',t('branch_number',{n:id+1}));o.value=id;select.append(o);}select.value=display.branch??branches[0];select.addEventListener('change',()=>{w.historicalBranch=Number(select.value);wm.save();requestRender(true);});label.append(select);f.append(label,el('small',t('multiple_minimizers')));}
    const status=el('p',['useful','coarse'].includes(display.state)?t('simulation_available'):inferencePending.has(v.name)?t('inferring_221'):/^worker-/.test(display.reason||'')?t('cannot_calculate_computation_unavailable'):t('insufficient_narrowing_evidence'),'ptcg-inference-primary');status.dataset.inferenceStatus='1';f.append(status);const availability=scenario=>historicalModel.select(base?.historical,primaryModel(),scenario,w.historicalBranch??null).state==='useful'?t('simulation_available'):t('insufficient_narrowing_evidence');f.append(el('small',t('scenario_availability',{base:availability('interaction'),xmp:availability('XMP')})));
    const models=settings.inferenceReference==='both'?['minimum-movement','local-average']:[primaryModel()];for(const type of models){const result=historicalModel.select(base?.historical,type,settings.historicalScenario,w.historicalBranch??null),card=el('section',undefined,'ptcg-model-card');card.dataset.comparisonModel=type;card.append(el('strong',t(type==='minimum-movement'?'minimum_movement_choice':'local_average_choice')+' · '+clockText.absolute(historicalTime(v.name))));if(['useful','coarse','not-useful'].includes(result.state)){card.append(el('p',t('simulation_distance_average',{d:result.distanceM.toFixed(1),v:result.averageKmh===null?'—':result.averageKmh.toFixed(1)})),el('small',result.model==='minimum-movement'?t('simulation_bounds',{lo:result.wholeProof.lowerM.toFixed(1),hi:result.wholeProof.upperM.toFixed(1)}):t('reference_witness_help')),el('p',t('region_extent',{d:Math.ceil(result.diameterM),n:result.computedComponents?.length||0})));if(result.reference?.state==='valid')card.append(el('p',t('weighted_reference',{v:result.reference.kmh.toFixed(1)})));}const details=el('details'),summary=el('summary',t('assumptions_details'));details.append(summary,el('p',t('historical_reason_'+(result.reason||'useful'))),el('p',t('terrain_unknown')),el('p',t('uniform_interpolation_help')));if(result.wholeProof?.approximation)details.append(el('p',t('backtrack_approximation')));if(result.rawIds)details.append(el('small',t('source_records',{n:result.rawIds.length})));if(result.branch!==undefined)details.append(el('p',t('branch_number',{n:result.branch+1})+' · '+t('multiple_minimizers')));if(result.wholeProof&&result.model==='minimum-movement')details.append(el('p',t('whole_simulation',{d:result.wholeProof.upperM.toFixed(1),v:result.wholeProof.wholeAverageKmh===null?'—':result.wholeProof.wholeAverageKmh.toFixed(1)})));card.append(details);f.append(card);}
    f.append(el('small',t('comparison_not_accuracy')));const scroll=savedScroll,active=document.activeElement,key=active?.dataset?.historicalTime?'historicalTime':active?.dataset?.historicalSlider?'historicalSlider':null;w.body.replaceChildren(f);w.body.scrollTop=scroll;if(key)w.body.querySelector('[data-'+key.replace(/[A-Z]/g,x=>'-'+x.toLowerCase())+']')?.focus({preventScroll:true});
  }
  function playerEventArticle(e,v,s,expanded){
      const estimate=s?.byGuid.get(e.guid),article=el('article',undefined,'ptcg-event');article.dataset.event=e.guid;article.append(compactEvent(e,estimate));if(settings.speed)article.append(el('small',t('observed_speed')+': '+speedLabel(estimate)));
      const details=el('details');details.open=expanded.has(e.guid);details.addEventListener('toggle',()=>{if(!details.isConnected)return;if(details.open)expanded.add(e.guid);else expanded.delete(e.guid);wm.save();});details.append(el('summary',t("source_details")),el('p',e.text||'—'),el('p',time(e.time,true)+' · '+e.time),el('p',qualityText[e.quality]||t("position_unknown")));
      for(const[p,i]of e.portals.map((p,i)=>[p,i])){const line=el('p');if(e.action==='linked')line.append(el('span',i===0?t("origin"):t("destination")));line.append(portalLink(p));details.append(line);}details.append(el('p',t("source_faction_120")+e.wireTeam));
      for(const link of (v.detailSegmentsByGuid?.get(e.guid)||[]))details.append(el('p',t("activity_association_interval")+(link.gapMs/1000).toFixed(3)+t("seconds")+(link.interveningEventIds.length?t("intervening")+link.interveningEventIds.length+t("other_events"):'')+t("intermediate_route_unverified")));
      for(const gap of (v.detailBreaksByGuid?.get(e.guid)||[]))details.append(el('p',gap.reason==='simultaneous-interaction-positions'?t("association_break_simultaneous_interaction_positions"):t("association_break_unresolved_interaction_position")));
      if(estimate?.minimum){const from=el('p',t("previous_interaction")+time(estimate.fromTime,true)+' · '),to=el('p',t("current_interaction")+time(estimate.time,true)+' · ');for(const p of estimate.fromPortals)from.append(portalLink(p),document.createTextNode(' '));for(const p of estimate.toPortals)to.append(portalLink(p),document.createTextNode(' '));details.append(from,to,el('p',t("interval")+estimate.dt.toFixed(3)+t("seconds_131")+(estimate.kind==='portal-centers'?t("portal_center_distance"):t("validated_shared_region_witness_distance"))+' '+estimate.centerDistanceM.toFixed(3)+' m'),el('p',t("40_m_at_each_endpoint_minimum_required_displacement")+estimate.requiredDistanceM.toFixed(3)+' m'),el('p',t("center_reference")+estimate.centerKmh.toFixed(1)+' km/h'),el('small',estimate.state==='same-portal'?t("same_portal_activity_does_not_verify_stationary_presence"):t("endpoint_assumption_upper_bound")+estimate.minimum.upperKmh.toFixed(1)+t("km_h_region_detail_only_not_used_for_speed_class_or_ghost")),el('small',t("straight_line_displacement_lower_bound_route_and_transport_unknow")));}details.append(el('small',t("source_timestamp_precision")+(e.timestampPrecision==='source-unspecified'?t("unspecified_original_milliseconds_retained"):e.timestampPrecision)));
      details.append(eventDetails(e));article.append(details);const compact=article.querySelector('.ptcg-compact-event');details.firstChild.replaceChildren(compact);for(const n of [...article.children])if(n!==details)details.append(n);return article;
  }
  function tooltipIdentity(layer){const o=layer.options,p=layer.getLatLng?.();return JSON.stringify([o.ptcgPortalKey||null,o.ptcgNames?.map(n=>n.toLowerCase()).sort()||null,o.ptcgName||o.ptcgPlayer||null,o.ptcgInferenceTime||null,o.ptcgRadius||null,o.ptcgEvidenceKind||null,p?[p.lat,p.lng]:null]);}
  function refreshLocale(){
    refreshLabelCatalog();if(setup.info?.script)setup.info.script.description=t('public_comm_player_activity_tracker_standalone_plugin');if(!wm)return;localizing=true;try{const openTooltips=new Set([clusterLayer,eventLayer,inferenceLayer].filter(Boolean).flatMap(g=>g.getLayers()).filter(l=>l.getTooltip?.()?.isOpen()).map(tooltipIdentity));const focused=document.activeElement,scrollPositions=new Map([...wm.windows.values()].map(w=>[w.id,w.body.scrollTop]));
    const builders={dashboard:buildDashboard,acquisition:buildAcquisition,'map-display':buildMapDisplay,data:buildData,settings:buildSharedSettings};
    for(const w of wm.windows.values()){
      const build=builders[w.id];if(!build)continue;
      const controls=[...w.body.querySelectorAll('input,select,textarea')].map((n,index)=>({n,index,value:n.value,checked:n.checked,start:n.selectionStart,end:n.selectionEnd,focused:n===focused,draft:n.dataset.draft})),scroll=w.body.scrollTop;
      w.body.replaceChildren();w.playerRows?.clear();build(w);const replacements=[...w.body.querySelectorAll('input,select,textarea')];
      for(const state of controls){const n=replacements[state.index];if(!n)continue;if(n.dataset.setting==='language'){n.value=settings.language;if(state.focused)n.focus({preventScroll:true});continue;}if(state.n.type==='file'){n.replaceWith(state.n);state.n.setAttribute('aria-label',n.getAttribute('aria-label'));continue;}n.value=state.value;if(state.draft)n.dataset.draft=state.draft;if(n.type==='checkbox')n.checked=state.checked;if(state.focused){n.focus({preventScroll:true});if(state.start!==null)try{n.setSelectionRange(state.start,state.end);}catch(_){}}}
      w.body.scrollTop=scroll;
    }
    for(const w of wm.windows.values()){if(w.player)wm.setTitle(w,w.player+(w.kind==='detail'?t('details'):''));else if(w.kind==='overlap')wm.setTitle(w,t('overlapping_players'));else if(builders[w.id])wm.setTitle(w,primaryTitles()[w.id]);}
    if(pinnedPortal){const pin=pinnedPortal;pin.center.textContent=t('center_on_screen');pin.more.textContent=t('more_portal_events');pin.end.textContent=t('all_shown');pin.rows.setAttribute('aria-label',t('portal_activity_records'));}
    wm.localize();renderFollow();for(const b of document.querySelectorAll('[data-workspace-refresh]'))b.textContent=t('refresh');fullRedraw=true;render();renderDashboard();renderAuto();updateStorageSummary();updateExportPreview();for(const w of wm.windows.values()){if(w.player){if(w.kind==='detail')renderDetail(w);else renderReader(w);}else if(w.kind==='overlap')renderOverlap(w);w.body.scrollTop=scrollPositions.get(w.id)||0;}for(const g of [clusterLayer,eventLayer,inferenceLayer])for(const l of g.getLayers())if(openTooltips.has(tooltipIdentity(l)))l.openTooltip?.();wm.save();}finally{localizing=false;}
  }
  api.setLanguage=value=>{if(!['auto','en','zh-TW','zh-CN','ja'].includes(value))throw Error('Unsupported language');if(settings.language===value)return;settings.language=value;saveSettings();refreshLocale();};
  api.language=()=>({preference:settings.language,resolved:i18n.locale()});
  function syncFactionControls(draft=null){for(const w of wm.windows.values()){const box=w.body.querySelector('[data-faction-controls]');if(!box)continue;for(const input of box.querySelectorAll('[data-faction-setting]'))if(input!==draft)input.value=settings[input.dataset.factionSetting];for(const b of box.querySelectorAll('[data-faction-preset]'))b.setAttribute('aria-pressed',String(Number(b.dataset.factionPreset)===settings.factionPinAngle));}}
  function setFactionPresentation(values,draft=null){const next={};for(const [key,min,max]of [['factionPinAngle',-180,180],['factionLabelGap',0,20]])if(Object.hasOwn(values,key)){const n=values[key];if(!Number.isFinite(n)||n<min||n>max)return false;next[key]=n;}const changed=Object.keys(next).some(k=>next[k]!==settings[k]);Object.assign(settings,next);syncFactionControls(draft);if(changed){saveSettings();drawClusters();}return true;}
  api.setFactionPresentation=setFactionPresentation;
  function buildFactionControls(w){const box=el('fieldset',undefined,'ptcg-faction-controls');box.dataset.factionControls='1';box.append(el('legend',t('faction_pin_controls')));const presets=el('div',undefined,'ptcg-faction-presets');for(const [value,key]of [[0,'faction_original'],[-120,'faction_ccw120'],[-135,'faction_ccw135'],[120,'faction_cw120'],[135,'faction_cw135']]){const b=button(t(key),()=>setFactionPresentation({factionPinAngle:value}));b.dataset.factionPreset=String(value);b.setAttribute('aria-pressed',String(value===settings.factionPinAngle));presets.append(b);}box.append(presets);
    for(const [key,title,min,max,type]of [['factionPinAngle','faction_angle',-180,180,'range'],['factionPinAngle','faction_angle',-180,180,'number'],['factionLabelGap','faction_gap',0,20,'number']]){const label=el('label',t(title),'ptcg-field'),input=el('input');input.type=type;input.min=min;input.max=max;input.step='any';input.value=settings[key];input.dataset.factionSetting=key;input.setAttribute('aria-label',t(title)+(type==='range'?' · '+t('faction_slider'):''));input.addEventListener('input',()=>{if(localizing)return;const n=input.value===''?NaN:Number(input.value);if(Number.isFinite(n)&&n>=min&&n<=max)setFactionPresentation({[key]:n},input);});input.addEventListener('change',()=>{if(localizing)return;const n=input.value===''?NaN:Number(input.value);if(!setFactionPresentation({[key]:n}))syncFactionControls();});label.append(input);box.append(label);}box.append(el('small',t('faction_orientation_help')));w.body.append(box);
  }
  function buildSettings(w){buildSharedSettings(w);}

  function persistenceChanged(){backtrackPolicy++;if(!settings.persist)try{backtrackArchiveTx?.abort();}catch(_){}activityStore.persistenceChanged();if(settings.persist){messages.storageState=()=>t("saving");enqueue([...model.events.values()].filter(e=>!persisted.has(e.guid)),[...model.conflicts.values()].filter(c=>!savedConflicts.has(c.id)),activityStore.allScopes());}else messages.storageState=()=>t("new_activity_stays_in_this_page");}
  function buildStorage(w){const summary=el('div');summary.dataset.storage='1';w.body.append(checkbox(t("automatically_save_activity"),'persist'),summary,checkbox(t("enable_storage_limits"),'storageLimits'),numberSetting(t("retention_days_0_unlimited"),'retentionDays',0,36500),numberSetting(t("record_limit_0_unlimited"),'maxRecords',0,10000000),numberSetting(t("capacity_mib_0_unlimited"),'maxMegabytes',0,100000),button(t("review_and_prune_old_activity"),pruneWithConfirmation),button(t("clear_activity_data"),clearWithConfirmation));const file=el('input');file.type='file';file.accept='.json,application/json';file.dataset.rawImport='1';file.setAttribute('aria-label',t("import_raw_activity_json"));file.addEventListener('change',async()=>{if(!file.files[0])return;const epoch=dataGeneration;try{const text=await file.files[0].text();if(epoch!==dataGeneration||clearing)throw Error(t("data_cleared_import_cancelled"));const result=api.importRaw(JSON.parse(text));messages.storageState=()=>t("imported")+result.accepted+t("records_conflicts")+result.conflicts;}catch(_){messages.storageError=()=>t("invalid_import_format_existing_data_retained");}file.value='';requestRender();});w.body.append(el('small',t("import_raw_json_retain_existing_activity")),file,button(t("complete_raw_backup_all_activity"),()=>downloadRaw()));}
  function backupFilter(e,options){return (!options.category||categoryMatches(core.role(e),options.category))&&(options.player===undefined||e.player.toLowerCase()===String(options.player).toLowerCase())&&(!Number.isFinite(options.from)||e.time>=options.from)&&(!Number.isFinite(options.to)||e.time<=options.to);}
  api.exportRaw=(options={})=>{const filtered=options.player!==undefined||!!options.category&&options.category!=='all'||Number.isFinite(options.from)||Number.isFinite(options.to),records=[...model.events.values()].filter(e=>backupFilter(e,options)),conflicts=[...model.conflicts.values()].filter(c=>[c.original,c.incoming].every(e=>e&&backupFilter(e,options))),ids=new Set([...records.map(e=>e.guid),...conflicts.map(c=>c.guid)]);const backup={version:VERSION,records,conflicts,observationScopes:filtered?activityStore.filterScopes(activityStore.allScopes(),ids,true):activityStore.allScopes()};if(filtered)backup.filtered=true;if(containsPrivateFields(backup))throw Error(t("backup_contains_sign_in_session_fields_raw_data_retained_no_expor"));return backup;};
  function containsPrivateFields(data){const stack=[data],seen=new Set();while(stack.length){const value=stack.pop();if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);for(const [key,next]of Object.entries(value)){if(/^(authorization|cookie|cookies|headers|requestHeaders|accessToken|authToken|refreshToken|sessionToken|sessionParameters|csrfToken|password|credentials|loginParameters)$/i.test(key))return true;if(next&&typeof next==='object')stack.push(next);}}return false;}
  api.importRaw=data=>{if(containsPrivateFields(data))throw Error(t("backup_contains_sign_in_session_fields_import_rejected"));if(clearing)throw Error(t("clearing_data_import_cancelled"));const records=Array.isArray(data)?data:data?.records||data?.result;if(!Array.isArray(records)||records.length>1000000)throw Error(t("invalid_raw_backup"));const incoming=[];const parse=row=>{if(Array.isArray(row))return core.parse(row,'raw-import');if(row?.raw)return core.parse(row.raw,typeof row.source==='string'?row.source:'raw-import',row.receivedAt);if(row?.cached&&row.markup)return core.parse([row.guid,row.time,{plext:{markup:row.markup,plextType:row.cached.type,categories:1,team:row.wireTeam}}],typeof row.source==='string'?row.source:'raw-import',row.receivedAt,row.cached);return null;};for(const row of records){const e=parse(row);if(e)incoming.push(e);}if(Array.isArray(data?.conflicts))for(const c of data.conflicts){for(const row of [c.original,c.incoming]){const e=parse(row);if(e)incoming.push(e);}}const before=counters.accepted,conflicts=model.conflicts.size,scopeRows=Array.isArray(data?.observationScopes)?data.observationScopes.map(s=>activityStore.addScope(s)).filter(Boolean):[];accept(incoming,{epoch:dataGeneration,scopes:scopeRows});return {accepted:counters.accepted-before,conflicts:model.conflicts.size-conflicts};};
  function updateStorageSummary(){const n=wm.get('storage')?.body.querySelector('[data-storage]');if(!n)return;n.replaceChildren(el('p',t("saved")+persisted.size+t("unsaved")+Math.max(0,model.events.size-persisted.size)),el('p',time(model.oldest,true)+' ～ '+time(model.newest,true)),el('p',briefStatus()),el('p',messages.storageError,'ptcg-warning'),el('p',messages.settingsError,'ptcg-warning'),el('small',t("limits_default_off_lookback_is_not_retention_at_capacity_data_sta")));}
  function buildExport(w){
    const scope=el('select');scope.dataset.exportScope='1';for(const[id,title]of[['all',t("all_accounts")],['single',t("selected_player")]]){const o=el('option',title);o.value=id;scope.append(o);}scope.value=exportScope;
    const cat=el('select');cat.dataset.exportCategory='1';for(const[id,title]of categories){const o=el('option',title);o.value=id;cat.append(o);}cat.value=exportCategory;scope.addEventListener('change',()=>{exportScope=scope.value;updateExportPreview();});cat.addEventListener('change',()=>{if(localizing)return;exportCategory=cat.value;updateExportPreview();});
    const preview=el('p');preview.dataset.exportPreview='1';const status=el('p');status.dataset.exportStatus='1';w.body.append(el('label',t("scope")),scope,el('label',t("account_category")),cat,preview,button(t("export_csv"),()=>exportCSV(exportScope)),button(t("export_filtered_raw_json"),()=>downloadRaw({player:exportScope==='single'?settings.selected:undefined,category:exportCategory,from:observationT-settings.hours*3600000,to:observationT})),status);
  }
  function exportEvents(scope,category=exportCategory,hours=settings.hours){const now=observationT;if(!['all','single'].includes(scope))return [];return [...model.events.values()].filter(e=>e.time>=now-hours*3600000&&e.time<=now&&categoryMatches(core.role(e),category)&&(scope!=='single'||e.player.toLowerCase()===settings.selected.toLowerCase())).sort((a,b)=>a.time-b.time||a.guid.localeCompare(b.guid));}
  api.csvForScope=(scope,category='all',hours=settings.hours)=>core.csv(exportEvents(scope,category,hours));
  function updateExportPreview(){const w=wm.get('export');if(!w||!w.body.querySelector('[data-export-preview]'))return;w.body.querySelector('[data-export-preview]').textContent=t("lookback_188")+settings.hours+t("hours_189")+(exportScope==='single'?(settings.selected||t("no_player_selected"))+' · ':'')+exportEvents(exportScope).length+t("records");w.body.querySelector('[data-export-status]').textContent=messages.exportState;}
  function downloadRaw(options){let data;try{data=api.exportRaw(options);}catch(e){messages.storageError=()=>i18n.status(e.message);messages.exportState=()=>i18n.status(e.message);requestRender();return;} const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=el('a');a.href=url;a.download='player-tracker-'+VERSION+(data.filtered?'-filtered':'-complete')+'-raw.json';a.click();const timer=setTimeout(()=>URL.revokeObjectURL(url),60000);cleanup.push(()=>{clearTimeout(timer);URL.revokeObjectURL(url);});}
  function pruneWithConfirmation(){if(!settings.storageLimits||!settings.retentionDays){messages.storageState=()=>t("enable_storage_limits_and_retention_days_first_0_is_unlimited");requestRender();return;}const cutoff=Date.now()-settings.retentionDays*86400000,events=[...model.events.values()].filter(e=>e.time<cutoff);if(!events.length){messages.storageState=()=>t("no_activity_needs_pruning");requestRender();return;}const dates=[events.reduce((n,e)=>Math.min(n,e.time),Infinity),events.reduce((n,e)=>Math.max(n,e.time),-Infinity)];if(!window.confirm(t("prune")+events.length+t("activity_records")+time(dates[0],true)+' ～ '+time(dates[1],true)+t("and_related_scopes_conflicts_unexported_data_will_be_removed_othe")))return;return clearData(events.map(e=>e.guid));}
  function exportCSV(scope){const events=exportEvents(scope);if(!events.length){messages.exportState=()=>t("no_data_yet");updateExportPreview();return;}try{const url=URL.createObjectURL(new Blob([core.csv(events)],{type:'text/csv;charset=utf-8'})),a=el('a');a.href=url;a.download='player-tracker-advanced-khresist-'+new Date().toISOString().replace(/[:.]/g,'-')+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);messages.exportState=()=>t("generated")+events.length+t("records");}catch(e){messages.exportState=()=>t("export_failed");}updateExportPreview();}
  function buildAbout(w){w.body.append(el('h3',NAME),el('p',VERSION+' · '+BUILD.channel+' · '+BUILD.candidate),el('small',BUILD.sourceCommit),el('p',t('khresist_is_an_ingress_player_from_kaohsiung_taiwan')),el('p',t("original_implementation_under_mit_reference_authors_and_source_no")), el('p',t("feature_references_nanoeskadu_names_2_2_1_nhz_0_11_2_danielondior")));}
  function drawPlayer(name){
    const old=drawn.get(name);if(old){layers[old.ptcgRole].removeLayer(old);drawn.delete(name);}const v=sharedView(name,settings.hours);
    if(core.isSystem(v.last)||!window.map.hasLayer(masterLayer)||!matches(name,v)||(!v.locations.length&&!v.segments.length)||window.map.getZoom()<MIN_ZOOM||!window.map.hasLayer(layers[v.role]))return;
    const group=L.layerGroup();group.ptcgRole=v.role;group.ptcgView=v;
    if(settings.paths)for(const s of v.segments){const fade=settings.fade?Math.max(.28,1-(observationT-s.to.time)/(settings.hours*3600000)):1;motionLine([s.from.position,s.to.position],v.role,'raw',group,{opacity:fade,smoothFactor:0,ptcgPlayer:name,ptcgFromIds:s.fromIds,ptcgToIds:s.toIds,ptcgInterveningIds:s.interveningEventIds,ptcgGapMs:s.gapMs,ptcgSourceTime:s.to.time,ptcgBaseOpacity:1,ptcgAgeFloor:.28});}
    group.addTo(layers[v.role]);drawn.set(name,group);counters.redraws++;
  }
  const panes={regions:'ptcg-history-regions',evidence:'ptcg-evidence-circles',raw:'ptcg-activity-paths',eventLines:'ptcg-event-lines',inferredPaths:'ptcg-inference-paths',events:'ptcg-event-icons',players:'ptcg-player-icons',inferred:'ptcg-inferred-icons',clusters:'ptcg-player-clusters',tooltip:'ptcg-hover'};
  function registerPanes(){const order={regions:410,evidence:440,raw:420,eventLines:430,inferredPaths:450,events:610,players:620,inferred:630,clusters:660,tooltip:680};for(const[key,z]of Object.entries(order)){const p=window.map.getPane(panes[key])||window.map.createPane(panes[key]);p.style.zIndex=String(z);if(['regions','raw','eventLines','inferredPaths','tooltip'].includes(key))p.style.pointerEvents='none';}}
  function bindHover(marker,items,heading=''){marker.bindTooltip(()=>eventTooltip(items,heading),{pane:panes.tooltip,className:'ptcg-hover',direction:'top',offset:[0,-12],interactive:false,opacity:1});return marker;}
  function derivedEnabled(){return settings.historicalPositions||settings.historicalRegions||settings.historicalPaths;}
  function computationEnabled(name){return (mapScope.kind==='player'&&mapScope.player===name&&(derivedEnabled()||settings.paths&&settings.historicalScenario==='XMP'))||wm?.get('player:'+name.toLowerCase())?.viewSection==='inference'||inferencePending.has(name);}
  function closeOwnedTooltip(layer){const tooltip=layer.getTooltip?.();layer.closeTooltip?.();if(tooltip&&!tooltip.isOpen())tooltip.getElement()?.remove();}
  function clearClusterGraphics(){for(const layer of clusterLayer.getLayers()){closeOwnedTooltip(layer);layer.unbindTooltip?.();}clusterLayer.clearLayers();}
  function clearInferenceGraphics(){for(const layer of inferenceLayer.getLayers()){closeOwnedTooltip(layer);layer.unbindTooltip?.();}inferenceLayer.clearLayers();}
  function observedLabelPlacement(){const g=artwork.observedGeometry(settings.factionPinAngle,settings.factionLabelGap);return 'left:'+g.labelLeft+'px;top:'+g.labelTop+'px;';}
  function drawClusters(){
    clearClusterGraphics();clusterRecords.clear();if(!window.map.hasLayer(masterLayer)||window.map.getZoom()<MIN_ZOOM||(!settings.markers&&!settings.names&&!settings.labelTime))return;const points=[];
    for(const group of drawn.values()){const v=group.ptcgView,interaction=v.interactionGroups.at(-1);for(const e of interaction?[...interaction.points.values()]:[]){const p=window.map.latLngToContainerPoint(e.position);points.push({x:p.x,y:p.y,view:v,event:e});}}
    for(const members of core.clusterPoints(points,36)){
      const unique=new Map();for(const m of members){const k=m.view.name.trim().toLowerCase(),old=unique.get(k);if(!old||(m.view.last?.time??0)>(old.last?.time??0))unique.set(k,m.view);}
      if(unique.size>1){
        const names=[...unique.values()].map(v=>v.name).sort(),id=JSON.stringify(names),anchor=members.slice().sort((a,b)=>a.view.name.localeCompare(b.view.name)||a.event.guid.localeCompare(b.event.guid))[0].event.position;
        clusterRecords.set(id,names);const ghost=[...unique.values()].some(v=>speeds(v)?.ghost||speeds(v)?.ghostCandidate),items=members.map(m=>({event:m.event,portal:m.event.portals[0]}));
        const marker=L.marker(anchor,{pane:panes.clusters,opacity:eventAge(Math.max(...members.map(m=>m.event.time))),ptcgSourceTime:Math.max(...members.map(m=>m.event.time)),ptcgBaseOpacity:1,icon:L.divIcon({className:'ptcg-cluster'+(ghost?' ptcg-ghost':''),html:(settings.markers?artwork.pin([...unique.values()].map(v=>v.role),unique.size,false,settings.factionPinAngle):'')+'<span class="ptcg-label ptcg-group-label ptcg-observed-label" style="'+observedLabelPlacement()+'">'+factionCountsNode([...unique.values()]).outerHTML+(ghost?t("unusual_speed_candidate_206"):'')+'</span>',iconSize:artwork.observedSize,iconAnchor:artwork.observedAnchor}),ptcgNames:names,ptcgContributions:items.map(x=>({player:x.event.player,guid:x.event.guid,time:x.event.time}))});bindHover(marker,items,t("active_players"));marker.on('click',e=>{if(!forwardEvidencePortalClick(e))openOverlap(id,names.slice());});marker.addTo(clusterLayer);
      }else for(const p of members){
        const v=p.view,e=p.event,sp=speeds(v),ghost=!!(sp?.ghost||sp?.ghostCandidate),parts=[];
        if(settings.markers)parts.push(artwork.pin([v.role],1,false,settings.factionPinAngle));
        const label=[settings.names?escape(v.name):'',settings.labelTime?'<span data-map-time="'+e.time+'">'+escape(time(e.time))+'</span>':'',ghost?t("unusual_speed_candidate_106"):'',v.ambiguous?t("multiple_simultaneous_positions"):'',v.uncertainLatest?t("position_unknown"):''].filter(Boolean).join(' · ');
        const placement=observedLabelPlacement();
        if(label)parts.push('<span class="ptcg-label ptcg-observed-label" style="'+placement+'color:'+roleColors[v.role]+';border-color:'+roleColors[v.role]+'">'+label+'</span>');if(!parts.length)continue;
        const marker=L.marker(e.position,{pane:panes.players,icon:L.divIcon({className:'ptcg-pin'+(ghost?' ptcg-ghost-pin':''),html:parts.join(''),iconSize:artwork.observedSize,iconAnchor:artwork.observedAnchor}),opacity:settings.fade?Math.max(.3,1-(observationT-e.time)/(settings.hours*3600000)):1,ptcgName:v.name,ptcgSourceTime:e.time,ptcgBaseOpacity:1,title:v.name});bindHover(marker,[{event:e,portal:e.portals[0]}],t("observed_activity"));marker.on('click',e=>{if(!forwardEvidencePortalClick(e))openReader(v.name);});marker.addTo(clusterLayer);
      }
    }
  }
  function openOverlap(id,members=clusterRecords.get(id)){if(!members?.length)return null;const names=[...new Map(members.map(n=>[n.toLowerCase(),canonical(n)])).values()].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase())),stableId=JSON.stringify(names.map(n=>n.toLowerCase())),w=wm.open('overlap:'+stableId,t('overlapping_players'),w=>{w.kind='overlap';w.members=names.slice();const summary=el('p'),state=el('small'),list=el('div');summary.dataset.overlapSummary='1';state.dataset.overlapState='1';list.dataset.overlapPlayers='1';w.body.append(summary,state,list);},350,420);renderOverlap(w);wm.save();return w;}
  function renderOverlap(w){const names=w.members||[],views=names.map(n=>sharedView(n,settings.hours)),visible=views.filter(v=>v.last&&matches(v.name,v)&&window.map.hasLayer(masterLayer)&&window.map.hasLayer(layers[v.role])).length,selected=names.filter(n=>settings.overviewSelection.some(x=>x.toLowerCase()===n.toLowerCase())).length;
    w.body.querySelector('[data-overlap-summary]').textContent=t('selected_selected_group_members_visible_visible',{selected,members:names.length,visible});const summary=w.body.querySelector('[data-overlap-summary]'),selectionSummary=summary.textContent,visibleViews=views.filter(v=>v.last&&matches(v.name,v)&&window.map.hasLayer(masterLayer)&&window.map.hasLayer(layers[v.role]));summary.replaceChildren(factionCountsNode(visibleViews),el('small',selectionSummary));if(JSON.stringify(presentation.counts(views))!==JSON.stringify(presentation.counts(visibleViews))){const details=el('details');details.append(el('summary',t('group_members')),factionCountsNode(views));summary.append(details);}w.body.querySelector('[data-overlap-state]').textContent=w.groupReleased?t('group_selection_released_activate_this_tab_to_select_again'):!visible?t('no_eligible_activity_group_selection_retained'):'';updatePlayerRows(w,w.body.querySelector('[data-overlap-players]'),views);
  }

  api.clusterNames=()=>[...clusterRecords.values()];

    const displayModel=createTrackerDisplay(core);const presentation=createTrackerPresentation((a,b)=>inferenceModel.geoDistance(a,b));const eventEvidence=createTrackerEvidence();let evidenceRevision=-1,evidenceAt=-Infinity,evidenceNextAt=Infinity,evidenceCache=null;
  function resolvedEvidence(){if(evidenceCache&&evidenceRevision===model.revision&&observationT>=evidenceAt&&observationT<evidenceNextAt)return evidenceCache;const rows=[];evidenceNextAt=Infinity;for(const e of model.events.values())if(e.time<=observationT)rows.push(e);else evidenceNextAt=Math.min(evidenceNextAt,e.time);evidenceRevision=model.revision;evidenceAt=observationT;evidenceCache=eventEvidence.resolve(rows);return evidenceCache;}

  function eventDetails(e){const node=el('div',undefined,'ptcg-event-evidence'),info=resolvedEvidence().byGuid.get(e.guid);node.append(el('p',eventEvidence.fullText(e)),el('p',clockText.absolute(e.time)+' · '+e.time),el('p',e.player+' · actor '+(e.actorTeam||e.wireTeam)+' · object '+(e.objectFactions||[]).map(x=>x.plain||x.team).join(', ')),el('p',actionText(e)+' · '+e.source+' · GUID '+e.guid));for(const p of e.portals||[]){const line=el('p');line.append(portalLink(p));node.append(line);}

    if(info?.attack){const a=info.attack,line=el('p',(i18n.locale()==='en'?'Attacked Portal (inferred)':'受攻擊 Portal（證據推定）')+': '+a.state+' · '+a.reason+' ');if(a.portal)line.append(portalLink(a.portal));node.append(line,el('p','Support: '+a.candidates.flatMap(c=>c.sources).map(s=>s.guid+' @ '+clockText.absolute(s.time)).join('; ')));}
    if(info?.flip)node.append(el('p','Flip: '+info.flip.state+' · operator '+(info.flip.operator||'unassigned')+' · '+info.flip.mechanism+' · '+info.flip.operatorAttribution),el('p','Sources: '+info.flip.sourceGuids.join(', ')));
    const raw=el('details');raw.append(el('summary',i18n.locale()==='en'?'Original structured record':'原始結構資料'),el('pre',JSON.stringify(e.raw||e,null,2)));node.append(raw);return node;
  }
  function readingAnchor(container,selector='[data-event]'){const bounds=container.getBoundingClientRect(),rows=[...container.querySelectorAll(selector)],row=rows.find(r=>r.getBoundingClientRect().bottom>bounds.top);return {id:row?.dataset.event||row?.dataset.portalEvent,offset:row?row.getBoundingClientRect().top-bounds.top:0,scroll:container.scrollTop,ids:rows.map(r=>r.dataset.event||r.dataset.portalEvent),focus:document.activeElement};}
  function restoreAnchor(container,a,selector='[data-event]'){const rows=[...container.querySelectorAll(selector)],id=r=>r.dataset.event||r.dataset.portalEvent;let row=rows.find(r=>id(r)===a.id);if(!row&&a.id){const index=a.ids.indexOf(a.id);row=rows.find(r=>a.ids.indexOf(id(r))>index)||rows.at(-1);}if(row)container.scrollTop+=row.getBoundingClientRect().top-container.getBoundingClientRect().top-a.offset;else container.scrollTop=a.scroll;if(a.focus?.isConnected&&document.activeElement!==a.focus)a.focus.focus({preventScroll:true});}
  function updateEventTimes(body){for(const n of body.querySelectorAll('[data-event-time]')){const text=time(Number(n.dataset.eventTime));if(n.textContent!==text&&!window.getSelection()?.containsNode(n,true))n.textContent=text;}for(const n of body.querySelectorAll('.ptcg-refresh-status'))if(n.textContent!==messages.refreshText)n.textContent=messages.refreshText;}
  function actionText(e){const length=presentation.length(e);const action=presentation.eventAction(e);return (shortActions[action]||action)+(length?' · '+(length.state==='known'?length.text.replace(/ ([mk]?m)$/, '\u00a0$1'):t('link_distance_unknown')):'');}
  let presentationEvidence=null,presentationResolution=null;
  function flipResolution(){const resolved=resolvedEvidence();if(presentationEvidence!==resolved){presentationEvidence=resolved;presentationResolution=presentation.flips([...model.events.values()].filter(e=>e.time<=observationT),{manual:eventEvidence.manual,resolveResult:resolved},[...model.conflicts.values()]);}return presentationResolution;}
  function displayEvents(events,player){return presentation.fold(events.map(event=>({event,portal:event.portals[0]})),flipResolution(),{player,accept:e=>e.time<=observationT&&e.time>=observationT-settings.hours*3600000});}
  function flipEvidenceDetails(flip){const node=el('div');node.append(el('p',t(flip.operator?'flip_manual_evidence':'flip_system_evidence')+(flip.operator?' · '+flip.operator:'')));const detail=el('details');detail.append(el('summary',t('source_details')),el('pre',JSON.stringify(flip,null,2)));node.append(detail);return node;}
  function compactFlip(item){const row=el('div',undefined,'ptcg-compact-event'),stamp=el('span',time(item.flip.time));stamp.dataset.eventTime=item.flip.time;const title=el('span',t('flip_summary')),portal=el('span',undefined,'ptcg-compact-portal');if(item.flip.portal)portal.append(portalLink(item.flip.portal));row.append(stamp,title,portal);return row;}
  function flipArticle(item,v,s,expanded){const article=el('article',undefined,'ptcg-event'),details=el('details'),summary=el('summary');article.dataset.event=item.event.guid;article.dataset.rowKey=item.flip.id;summary.append(compactFlip(item));details.open=expanded.has(item.flip.id);details.addEventListener('toggle',()=>{if(!details.isConnected)return;if(details.open)expanded.add(item.flip.id);else expanded.delete(item.flip.id);wm.save();});details.append(summary,el('p',t('raw_display_count',{raw:item.batch.length,display:1})),flipEvidenceDetails(item.flip));for(const child of item.batch)details.append(playerEventArticle(child.event,v,s,expanded));article.append(details);return article;}
  function playerSpeedSummary(v,s){const node=el('section');node.dataset.playerSpeedSummary='1';if(!settings.speed){node.hidden=true;return node;}const result=s?.latest||s?.result;node.append(el('strong',t('player_speed_title')));
    if(!result){node.append(el('p',t('speed_insufficient')+' · '+(i18n.status(s?.status)||t('insufficient_data'))));return node;}
    if(result.state==='computed')node.append(el('p',t('required_speed',{speed:result.minimum.lowerKmh.toFixed(1),distance:result.requiredDistanceM.toFixed(1)})));
    else node.append(el('p',speedLabel(result)),el('small',t('speed_zero_warning')));
    node.append(el('p',t(result.kind==='portal-centers'?'center_speed':'witness_speed',{speed:result.centerKmh.toFixed(1),distance:result.centerDistanceM.toFixed(1)})),el('p',clockText.absolute(result.fromTime)+' → '+clockText.absolute(result.time)+' · '+result.dt.toFixed(3)+' '+t('seconds')));
    if(result.state==='computed'&&result.level)node.append(el('small',t('speed_category')+i18n.status(result.level)));if(result.longGap)node.append(el('p',t('long_interval_intermediate_route_unknown')));if(result.olderThanLatestSlice||s?.slices?.at(-1)?.time>result.time)node.append(el('p',t('earlier_valid_estimate_latest_interval_unresolved')));
    const source=el('details');source.append(el('summary',t('source_details')),el('small',t('speed_summary_help')));for(const id of [...new Set(result.fromIds.concat(result.toIds))]){const e=model.events.get(id);if(e)source.append(eventDetails(e));}node.append(source);return node;
  }
  function relationLabel(e,p){const r=displayModel.relation(e,portalKey(p),portalKey,core.parseLink);return r&&r!=='unrelated'?t('portal_relation_'+r):'';}
  function updatePortalHeader(pin,all,batches){const stats=displayModel.portalStats(all.map(i=>i.event),pin.key,portalKey,core.parseLink,presentation.eventAction,batches.length),signature=JSON.stringify([stats,i18n.locale(),settings.hours,liveObservation,liveObservation?null:observationT,mapScope,settings.faction,settings.roleVisibility,pin.center.disabled]);if(pin.headerSignature===signature)return;pin.headerSignature=signature;pin.stats.dataset.portalStats=JSON.stringify(stats);const open=pin.stats.querySelector('details')?.open||false,summary=el('div'),detail=el('details');detail.open=open;
    summary.append(el('strong',t('portal_totals',{players:stats.uniquePlayers,raw:stats.rawCount,display:stats.displayCount,system:stats.systemCount})),el('p','RES '+stats.attributes.RES+' · ENL '+stats.attributes.ENL+' · Machina '+stats.attributes.MACHINA+' · NIA '+stats.attributes.NIA+' · '+t('other_count',{n:stats.attributes.OTHER})),el('small',t('portal_loaded_scope',{hours:settings.hours})+(liveObservation?' · '+t('live_observation'):' · '+clockText.absolute(observationT))));
    if(stats.relations.incoming||stats.relations.outgoing||stats.relations.undirected)summary.append(el('p',t('portal_link_roles',stats.relations)));const categoryLine=el('p',t('portal_raw_categories'));categoryLine.dataset.portalRawCategories='1';for(const [action,count]of Object.entries(stats.categories))categoryLine.append(el('span',(shortActions[action]||action)+' '+count+' · '));summary.append(categoryLine);detail.append(el('summary',t('portal_stat_details')));const list=el('div');for(const actor of stats.actors){const line=el('p');line.append(button(actor.name,()=>openReader(actor.name)),document.createTextNode(actor.role+' · '+actor.count+' '+t('records')));list.append(line);}detail.append(list);pin.stats.replaceChildren(summary,detail);if(pin.center.disabled)pin.stats.append(el('small',t('coordinates_unavailable_249')));
  }
  function renderUnifiedActivity(w){if(w.viewSection==='inference'){renderHistoricalReader(w);return;}w.kind='reader';const v=sharedView(w.player),s=speeds(v),active=document.activeElement,anchor=readingAnchor(w.body,'[data-presentation-row]');w.expanded=w.expanded instanceof Set?w.expanded:new Set(w.expanded||[]);w.limit||=w.summaryRows||settings.summaryRows;
    const items=displayEvents([...v.events].reverse(),w.player),signature=JSON.stringify([i18n.locale(),v.events.map(e=>[e.guid,e.identity]),model.revision,w.limit,settings.speed,settings.timeMode,follow.target,follow.paused,follow.manual]);
    if(w.activitySignature===signature&&w.body.querySelector('[data-presentation-row]')){updateEventTimes(w.body);updateOrdinaryInferenceStatus(w);restoreAnchor(w.body,anchor,'[data-presentation-row]');return;}
    v.detailSegmentsByGuid=new Map();for(const segment of v.segments)for(const id of segment.toIds){if(!v.detailSegmentsByGuid.has(id))v.detailSegmentsByGuid.set(id,[]);v.detailSegmentsByGuid.get(id).push(segment);}v.detailBreaksByGuid=new Map();for(const gap of v.activityBreaks)for(const id of gap.eventIds){if(!v.detailBreaksByGuid.has(id))v.detailBreaksByGuid.set(id,[]);v.detailBreaksByGuid.get(id).push(gap);}const oldRows=new Map([...w.body.querySelectorAll('[data-presentation-row]')].map(n=>[n.dataset.rowKey,n])),f=document.createDocumentFragment(),actions=el('div',undefined,'ptcg-actions');playerHeading(w,v);followControl(actions,w.player);historyButton(actions,w);f.append(actions);addPlayerSections(f,w);f.append(roleStyle(el('small',roleLabels[v.role]+' · '+clockText.zone),v));
    const pref=el('label',t('activity_rows'),'ptcg-field'),select=el('select');select.dataset.summaryRows='1';for(const n of [3,5,10]){const o=el('option',String(n));o.value=n;select.append(o);}select.value=w.summaryRows||settings.summaryRows;select.addEventListener('change',()=>{w.summaryRows=settings.summaryRows=Number(select.value);w.limit=w.summaryRows;w.page=0;saveSettings();wm.save();renderReader(w);});pref.append(select);f.append(playerSpeedSummary(v,s),pref,el('small',t('raw_display_count',{raw:new Set(items.flatMap(i=>i.batch?i.batch.map(c=>c.event.guid):[i.event.guid])).size,display:items.length})));
    for(const item of items.slice(0,w.limit)){const key=item.flip?.id||item.event.guid,contentKey=JSON.stringify([key,item.batch?.map(i=>[i.event.guid,i.event.identity]),item.event.identity,i18n.locale(),settings.speed,resolvedEvidence().byGuid.get(item.event.guid),v.detailSegmentsByGuid.get(item.event.guid),s?.byGuid.get(item.event.guid)]);let row=oldRows.get(key);if(!row||row._contentKey!==contentKey){row=item.flip?flipArticle(item,v,s,w.expanded):playerEventArticle(item.event,v,s,w.expanded);row.dataset.rowKey=key;row.dataset.presentationRow='1';row._contentKey=contentKey;}f.append(row);}
    if(items.length>w.limit)f.append(button(t('more_records'),()=>{w.limit+=settings.pageSize;renderReader(w);wm.save();}));if(!items.length)f.append(el('p',t('no_data_yet')));w.body.replaceChildren(f);if(active?.isConnected&&w.body.contains(active))active.focus({preventScroll:true});w.activitySignature=signature;updateOrdinaryInferenceStatus(w);updateEventTimes(w.body);
    if(!w._restoredReading&&w.readingAnchor&&[...w.body.querySelectorAll('[data-presentation-row]')].some(r=>r.dataset.event===w.readingAnchor.id)){restoreAnchor(w.body,w.readingAnchor,'[data-presentation-row]');w._restoredReading=true;}else restoreAnchor(w.body,anchor,'[data-presentation-row]');
  }
  function updateOrdinaryInferenceStatus(w){if(w.viewSection==='inference')return;let n=w.body.querySelector('[data-ordinary-inference]');if(!n){n=el('details');n.dataset.ordinaryInference='1';const summary=el('summary'),content=el('p');summary.dataset.ordinaryInferenceSummary='1';content.dataset.ordinaryInferenceDetails='1';n.append(summary,content);w.body.prepend(n);}const base=inferenceCache.get(w.player)?.result,r=historicalModel.select(base?.historical,primaryModel(),settings.historicalScenario,w.historicalBranch??null),text=t(primaryModel()==='minimum-movement'?'minimum_movement_choice':'local_average_choice')+' / '+t(settings.historicalScenario==='XMP'?'xmp_assumption':'interaction_baseline')+' · '+t(i18n.catalog['route_'+r.state]?'route_'+r.state:'route_unavailable')+(r.reason&&i18n.catalog['historical_reason_'+r.reason]?' · '+t('historical_reason_'+r.reason):'')+' · '+t('backtrack_legend')+(r.wholeProof?.approximation?' · '+t('backtrack_approximation'):'');const summary=n.querySelector('summary'),inactive=!derivedEnabled()&&!(settings.paths&&settings.historicalScenario==='XMP'),short=inactive?t('historical_inference_off'):t(primaryModel()==='minimum-movement'?'minimum_movement_choice':'local_average_choice')+' / '+t(settings.historicalScenario==='XMP'?'xmp_assumption':'interaction_baseline')+' · '+t(i18n.catalog['route_'+r.state]?'route_'+r.state:'route_unavailable');if(summary.textContent!==short)summary.textContent=short;const detail=n.querySelector('p');if(detail.textContent!==text)detail.textContent=text;}
  function renderReader(w){renderUnifiedActivity(w);}
  function renderDetail(w){renderUnifiedActivity(w);}

  const inferenceCache=new Map(),inferencePending=new Map(),inferenceQueue=new Map();let inferenceWorker=null,inferenceLayer,masterLayer,observationT=Date.now(),jobId=0,discarded=0,activeJob=null,workerEpoch=0;
  const inferenceModel=createPositionInference(parseTrackerLink,parseTrackerInteraction),historicalModel=createTrackerHistory(inferenceModel);
  function historicalTime(name){const w=wm?.get('player:'+name.toLowerCase()),last=sharedView(name).events.at(-1)?.time;return Number.isSafeInteger(w?.historicalTime)?w.historicalTime:last??observationT;}
  function primaryModel(){return settings.inferenceReference==='both'?settings.historicalPrimary:settings.inferenceReference;}
  const sharedView=(name,hours=settings.hours)=>model.view(name,hours,observationT);
  function baselineKey(v){return JSON.stringify([inferenceModel.VERSION,settings.hours,observationT-(v.events.at(-1)?.time||observationT)>=inferenceModel.PARAMETERS.inactivityMs,v.events.map(e=>[e.guid,e.identity,e.raw?1:0])]);}
  function relevantSourceConflicts(v){const ids=new Set(v.events.map(e=>e.guid).concat(resolvedEvidence().forPlayer(v.name).flatMap(e=>(e.analysisConstraint?.rawIds||[]).concat(e.attackAssociation?.sourceGuids||[]))));return [...model.conflicts.values()].filter(c=>ids.has(c.guid)&&c.original.time<=observationT&&c.incoming.time<=observationT).map(c=>({id:c.id,guid:c.guid}));}
  function inferenceKey(v){return baselineKey(v)+'|'+JSON.stringify([settings.xmpRadius,historicalTime(v.name),observationRevision,dataGeneration,relevantSourceConflicts(v),resolvedEvidence().forPlayer(v.name).map(e=>[e.guid,e.analysisConstraint,e.attackAssociation])]);}
  function startInferenceWorker(){
    const epoch=++workerEpoch;
    try{const code='const createTrackerEvidence='+createTrackerEvidence.toString()+';const createTrackerHistory='+createTrackerHistory.toString()+';const createTrackerRegion='+createTrackerRegion.toString()+';const createTrackerMinimum='+createTrackerMinimum.toString()+';const parseTrackerSystem='+parseTrackerSystem.toString()+';const model=('+createPositionInference.toString()+')(('+parseTrackerLink.toString()+'),('+parseTrackerInteraction.toString()+'));onmessage=e=>{const {id,name,key,events,options}=e.data;let result;try{const minimum=model.inferMinimum(events,{...options,_cache:options._minimumCache||[],budgetMs:1200,sliceWindows:2}),minimumScenario=model.inferMinimum(events,{...options,_cache:options._minimumXmpCache||[],budgetMs:1200,sliceWindows:2},true);result={...minimum,minimum,minimumScenario,scenario:minimumScenario,historical:createTrackerHistory(model).evaluate(events,options,minimum,minimumScenario)};}catch(error){result={status:"unknown",reason:"worker-error",calculation:{state:"unavailable"},historical:{variants:[],unavailable:["minimum-movement","local-average"].flatMap(model=>["interaction","XMP"].map(scenario=>({model,scenario,state:"unavailable",reason:"worker-error"}))),limits:[],calculation:{state:"unavailable"}}};}const done=!(result.minimum?.progress?.pending||result.minimumScenario?.progress?.pending||result.historical?.progress?.pending);postMessage({id,name,key,result,done});};';
      const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));inferenceWorker=new Worker(url);URL.revokeObjectURL(url);
      inferenceWorker.onmessage=e=>{
        if(epoch!==workerEpoch){discarded++;return;}const {name,key,result,id,done}=e.data;const job=activeJob;if(job?.id===id)activeJob=null;
        if(inferencePending.get(name)?.id!==id){discarded++;pumpInference();return;}
        if(!computationEnabled(name)||inferenceKey(sharedView(name))!==key){discarded++;inferencePending.delete(name);pumpInference();return;}
        inferenceCache.set(name,{key,baseKey:baselineKey(sharedView(name)),result});
        if(done!==false)inferencePending.delete(name);else if(job){job.options._cache=result.cacheEntries||[];job.options._xmpCache=result.scenario?.cacheEntries||[];job.options._minimumCache=result.minimum?.cacheEntries||[];job.options._minimumXmpCache=result.minimumScenario?.cacheEntries||[];job.options._referenceCache=result.historical?.cacheEntries||[];job.continuation=true;inferenceQueue.set(name,job);}
        requestRender(true);pumpInference();
      };
      inferenceWorker.onerror=()=>{if(epoch!==workerEpoch)return;for(const[name,p]of inferencePending){const prior=inferenceCache.get(name);const result=prior?.key===p.key?{...prior.result,calculation:{...prior.result.calculation,state:'unavailable'},reason:'worker-unavailable',latest:prior.result.latest?.state==='pending'?{...prior.result.latest,state:'unavailable',point:null}:prior.result.latest}:p.preview||{status:'unknown'};if(result.scenario?.progress?.pending)result.scenario={...result.scenario,reason:'worker-unavailable',calculation:{...result.scenario.calculation,state:'unavailable'}};for(const k of ['minimum','minimumScenario'])if(result[k]?.progress?.pending){const v=result[k];result[k]={...v,reason:'worker-unavailable',calculation:{...v.calculation,state:'unavailable'},latest:v.latest?.point?{...v.latest,state:'possible'}:{...v.latest,state:'unavailable',point:null}};}result.reason='worker-unavailable';result.historical={...result.historical,variants:result.historical?.variants||[],limits:result.historical?.limits||[],unavailable:['minimum-movement','local-average'].flatMap(model=>['interaction','XMP'].map(scenario=>({model,scenario,state:'unavailable',reason:'worker-unavailable'})))};inferenceCache.set(name,{key:p.key,baseKey:p.baseKey,result});}inferencePending.clear();inferenceQueue.clear();activeJob=null;inferenceWorker.terminate();inferenceWorker=null;requestRender(true);};
    }catch(_){inferenceWorker=null;}
  }
  function cancelInference(name){if(!inferencePending.has(name))return;inferencePending.delete(name);inferenceQueue.delete(name);discarded++;if(activeJob?.name===name){inferenceWorker?.terminate();inferenceWorker=null;activeJob=null;startInferenceWorker();}pumpInference();}
  function pumpInference(){
    if(activeJob||!inferenceWorker||!inferenceQueue.size)return;
    for(const [name]of inferenceQueue)if(!computationEnabled(name)||(!matches(name,sharedView(name))&&follow.target!==name)){inferenceQueue.delete(name);inferencePending.delete(name);}
    if(!inferenceQueue.size)return;const selectedJob=inferenceQueue.get(settings.selected),name=selectedJob&&!selectedJob.continuation?settings.selected:inferenceQueue.keys().next().value;activeJob=inferenceQueue.get(name);inferenceQueue.delete(name);inferenceWorker.postMessage(activeJob);
  }
  function inferenceFor(v){if(!v.events.length)return {status:'unknown',reason:'no-input',historical:{variants:[],unavailable:['minimum-movement','local-average'].flatMap(model=>['interaction','XMP'].map(scenario=>({model,scenario,state:'unavailable',reason:'no-input'}))),limits:[]}};
    if(!computationEnabled(v.name))return inferenceCache.get(v.name)?.result||null;const key=inferenceKey(v),baseKey=baselineKey(v),cached=inferenceCache.get(v.name);
    if(inferencePending.has(v.name)&&inferencePending.get(v.name).key!==key)cancelInference(v.name);
    const cachedComplete=!cached?.result.progress?.pending&&!cached?.result.scenario?.progress?.pending&&!cached?.result.minimum?.progress?.pending&&!cached?.result.minimumScenario?.progress?.pending&&!cached?.result.historical?.progress?.pending;
    if(cached?.key===key&&(cachedComplete||inferencePending.get(v.name)?.key===key||!inferenceWorker))return cached.result;
    if(inferencePending.get(v.name)?.key!==key){
      cancelInference(v.name);const events=resolvedEvidence().forPlayer(v.name).filter(e=>v.events.some(row=>row.guid===e.guid)).map(e=>({...e,role:core.role(e)})),options={T:observationT,player:v.name,hours:settings.hours,xmp:true,minimum:true,historicalTime:historicalTime(v.name),sourceConflicts:relevantSourceConflicts(v),dataGeneration,xmpRadius:settings.xmpRadius,_cache:cached?.result.cacheEntries||[],_xmpCache:cached?.result.scenario?.cacheEntries||[],_minimumCache:cached?.result.minimum?.cacheEntries||[],_minimumXmpCache:cached?.result.minimumScenario?.cacheEntries||[],_referenceCache:cached?.result.historical?.cacheEntries||[]};
      // Revalidate exact window identities against the new input before displaying
      // retained histories while replacement work is pending.
      const preview={status:'pending',progress:{pending:1},calculation:{state:'partial'},latest:{state:'pending',point:null},historical:null};
      if(!inferenceWorker){preview.reason='worker-unavailable';preview.progress={pending:0};preview.calculation.state='unavailable';preview.latest={...preview.latest,state:'unavailable',point:null};preview.historical={variants:[],limits:[],unavailable:['minimum-movement','local-average'].flatMap(model=>['interaction','XMP'].map(scenario=>({model,scenario,state:'unavailable',reason:'worker-unavailable'}))),calculation:{state:'unavailable'}};inferenceCache.set(v.name,{key,baseKey,result:preview});return preview;}
      const id=++jobId;inferencePending.set(v.name,{id,key,baseKey,preview});inferenceQueue.set(v.name,{id,name:v.name,key,events,options});pumpInference();
    }
    return inferencePending.get(v.name)?.preview||{status:'pending',calculation:{state:'partial'}};
  }
  // A circle rim can cross another loaded Portal. Use the native marker's own
  // screen hit test; this is click routing, never an inferred actor anchor.
  function forwardEvidencePortalClick(ev){if(!ev.originalEvent)return;const p=window.map.mouseEventToLayerPoint(ev.originalEvent),hits=Object.values(window.portals||{}).filter(m=>window.map.hasLayer(m)&&typeof m._containsPoint==='function'&&m._containsPoint(p));if(hits.length!==1)return;const display=window.IITC?.portal?.display,render=display?.renderDetails||window.renderPortalDetails,guid=hits[0].options.guid||hits[0].options.data?.guid;if(guid&&typeof render==='function'){L.DomEvent.stop(ev.originalEvent);render.call(display,guid);return true;}return false;}
  function drawInferences(){
    clearInferenceGraphics();if(!(derivedEnabled()||settings.paths&&settings.historicalScenario==='XMP')||mapScope.kind!=='player'||!window.map.hasLayer(masterLayer)||window.map.getZoom()<MIN_ZOOM)return;const name=canonical(mapScope.player),w=wm.get('player:'+name.toLowerCase());if(!w||w.node.hidden)return;
    const v=sharedView(name);if(!matches(name,v)||!window.map.hasLayer(layers[v.role]))return;const base=inferenceFor(v),result=historicalModel.select(base?.historical,primaryModel(),settings.historicalScenario,w.historicalBranch??null);if(!['useful','coarse'].includes(result.state))return;
    const identity=result.key;
    if(settings.paths&&result.scenario==='XMP'&&result.route.length>=2)motionLine(result.route.map(p=>p.position),v.role,'raw',inferenceLayer,{ptcgPlayer:name,ptcgAttackSupported:true,ptcgConditional:true,ptcgResultIdentity:identity,ptcgScenario:result.scenario,ptcgRoute:result.route,title:'Conditional attack-supported simulation / 攻擊支持條件軌跡'});
    if(settings.historicalRegions&&result.state==='useful')for(const c of result.components)L.polygon(c.polygon,{pane:panes.regions,color:roleColors[v.role],fillColor:roleColors[v.role],fillOpacity:.1,weight:1.2,opacity:.7,interactive:false,ptcgRegionTime:result.time,ptcgPlayer:name,ptcgResultIdentity:identity,ptcgComponent:c.id,ptcgScenario:result.scenario}).addTo(inferenceLayer);
    if(settings.historicalPaths&&result.route.length>=2)motionLine(result.route.map(p=>p.position),v.role,'inferred',inferenceLayer,{ptcgPlayer:name,ptcgPointTimes:result.route.map(p=>p.time),ptcgScenario:result.scenario,ptcgResultIdentity:identity,ptcgWitness:true,ptcgWitnessDistanceM:result.distanceM,ptcgRoute:result.route,ptcgInterpolation:'uniform straight simulated edges'});
    if(settings.historicalPositions){const text=[settings.names?name:'',settings.labelTime?clockText.absolute(result.time):''].filter(Boolean).join(' · '),html=artwork.pin([v.role],1,true)+(text?'<span class="ptcg-label ptcg-region-label" style="color:'+roleColors[v.role]+'">'+escape(text)+'</span>':'');const marker=L.marker(result.position,{pane:panes.inferred,icon:L.divIcon({className:'ptcg-possible-pin',html,iconSize:artwork.inferredSize,iconAnchor:artwork.inferredAnchor}),title:name+' · '+t('simulation_point_help'),ptcgInferenceName:name,ptcgPlayer:name,ptcgInferenceTime:result.time,ptcgResultIdentity:identity,ptcgScenario:result.scenario,ptcgBranch:result.branch,ptcgWitness:true,ptcgSupport:result.model});bindHover(marker,result.rawIds.map(id=>({event:model.events.get(id)})).filter(x=>x.event),t('simulation_point_help'));marker.on('click',()=>{api.inspectHistory(name,result.time);});marker.addTo(inferenceLayer);}
  }
  function drawEvents(){
    // Event-object lines are independent of Portal marker ownership/hover lifetime.
    for(const l of eventGeometry)eventLayer.removeLayer(l);eventGeometry.clear();const icons=new Map();
    if((settings.events||settings.destroyedLinks)&&window.map.hasLayer(masterLayer)&&window.map.getZoom()>=MIN_ZOOM){
    const addGeometry=l=>{eventGeometry.add(l);l.addTo(eventLayer);};
    for(const name of model.players.keys()){const v=sharedView(name);if(!matches(name,v)||!window.map.hasLayer(layers[v.role]))continue;for(const e of v.events){const a=eventAppearance(e),link=core.parseLink(e);
      if(link&&(link.destroyed?settings.destroyedLinks:settings.events)){const points=link.endpoints.map(p=>p.position),lineColor=link.destroyed?roleColors[presentation.faction(e)]:a.color,fade=eventAge(e.time);addGeometry(L.polyline(points,{pane:panes.eventLines,color:'#102132',weight:5,opacity:fade,interactive:false,ptcgHalo:true,ptcgDestroyedLink:!!link.destroyed,ptcgSourceTime:e.time,ptcgBaseOpacity:1}));addGeometry(L.polyline(points,{pane:panes.eventLines,color:lineColor,opacity:fade,ptcgSourceTime:e.time,ptcgBaseOpacity:1,weight:2.5,dashArray:link.destroyed?'4,5':null,interactive:false,ptcgDestroyedLink:!!link.destroyed,ptcgLinkEvent:e.guid,ptcgPlayer:name}));
        if(link.directed){const p=points[0],q=points[1],x=window.map.latLngToContainerPoint(p),y=window.map.latLngToContainerPoint(q),angle=Math.atan2(y.y-x.y,y.x-x.x)*180/Math.PI,mid=window.map.containerPointToLatLng([(x.x+y.x)/2,(x.y+y.y)/2]);addGeometry(L.marker(mid,{pane:panes.eventLines,interactive:false,opacity:fade,ptcgSourceTime:e.time,ptcgBaseOpacity:1,ptcgLinkArrow:e.guid,ptcgPlayer:name,icon:L.divIcon({className:'ptcg-link-arrow',html:'<span style="color:'+lineColor+';transform:rotate('+angle+'deg)">➤</span>',iconSize:[18,18]})}));}}
      if(!settings.events)continue;const association=resolvedEvidence().byGuid.get(e.guid)?.attack;const displayPortals=e.action==='destroyedLink'?(association?.state==='supported'?[association.portal]:[]):e.action==='linked'&&link?.directed?[link.origin]:e.portals;for(const p of displayPortals){if(!p.position)continue;const key=portalKey(p);if(!icons.has(key))icons.set(key,new Map());icons.get(key).set(e.guid,{event:e,portal:p});}
    }}
    }
    for(const [key,entries] of icons){const items=[...entries.values()];
      const {event:e,portal:p}=items.slice().sort((a,b)=>b.event.time-a.event.time||a.event.guid.localeCompare(b.event.guid))[0],a=eventAppearance(e),names=[...new Set(items.filter(i=>!core.isSystem(i.event)).map(i=>i.event.player))],html='<span class="ptcg-event-body" style="border-color:'+a.color+';color:'+(a.glyphColor||a.color)+'"><span>'+a.glyph+'</span>'+(items.length>1?'<small class="ptcg-event-badge">'+items.length+'</small>':'')+'</span>';
      let entry=eventMarkers.get(key);if(!entry){const marker=L.marker(p.position,{pane:panes.events,icon:L.divIcon({className:'ptcg-event-icon',html,iconSize:[22,22],iconAnchor:[11,11]})});entry={marker,items,portal:p,html};eventMarkers.set(key,entry);marker.bindTooltip(()=>eventTooltip(entry.items,t("portal_activity")),{pane:panes.tooltip,className:'ptcg-hover',direction:'top',offset:[0,-12],interactive:false,opacity:1});marker.on('click',ev=>{if(ev.originalEvent)L.DomEvent.stopPropagation(ev.originalEvent);openPortalActivity(entry.portal);nativePortal(entry.portal);});marker.addTo(eventLayer);}
      const marker=entry.marker;entry.items=items;entry.portal=p;
      if(marker.getLatLng().lat!==p.position[0]||marker.getLatLng().lng!==p.position[1])marker.setLatLng(p.position);
      marker.setOpacity(eventAge(e.time));Object.assign(marker.options,{ptcgSourceTime:e.time,ptcgBaseOpacity:1,title:names.length+t("players_200")+items.length+t("activity_events_241")+(p.name||p.plain),ptcgPortalKey:key,ptcgEventId:e.guid,ptcgPortalPosition:p.position,ptcgContributions:items.map(i=>({guid:i.event.guid,player:i.event.player,time:i.event.time,action:i.event.action}))});
      if(marker._icon){if(entry.html!==html)marker._icon.innerHTML=html;entry.html=html;marker._icon.classList.toggle('ptcg-capture',!!a.accent);marker._icon.style.borderColor=a.color;marker._icon.title=marker.options.title;}
      marker.setTooltipContent(()=>eventTooltip(entry.items,t("portal_activity")));
    }
    for(const [key,entry] of eventMarkers)if(!icons.has(key)){closeOwnedTooltip(entry.marker);entry.marker.unbindTooltip();entry.marker.off();eventLayer.removeLayer(entry.marker);eventMarkers.delete(key);}
    updatePortalActivity();
  }
  let eventLayer,evidenceRenderer;
  const eventMarkers=new Map(),eventGeometry=new Set();let pinnedPortal=null;
  let focusedLink=null,eventFocusTimer=null,focusedIcons=[];
  function clearEventFocus(){clearTimeout(eventFocusTimer);eventFocusTimer=null;if(focusedLink){masterLayer.removeLayer(focusedLink);focusedLink=null;}for(const icon of focusedIcons)icon.classList.remove('ptcg-event-focus');focusedIcons=[];}
  function focusEvent(e){clearEventFocus();const p=e.portals.find(p=>p.position);if(p)nativePortal(p);if(!window.map.hasLayer(masterLayer)){messages.refreshText=()=>t('focus_master_off');return false;}const link=core.parseLink(e);if(['linked','destroyedLink'].includes(e.action)&&!link){messages.refreshText=()=>t('focus_geometry_unknown');requestRender();}if(link){focusedLink=L.layerGroup();for(const [color,weight]of [['#000000',9],['#ffffff',5],['#ff7700',2]])L.polyline(link.endpoints.map(p=>p.position),{pane:panes.eventLines,color,weight,opacity:1,interactive:false,ptcgFocusEvent:e.guid,ptcgFocusLink:true}).addTo(focusedLink);focusedLink.addTo(masterLayer);}for(const marker of eventLayer.getLayers())if((marker.options.ptcgEventId===e.guid||marker.options.ptcgContributions?.some(c=>c.guid===e.guid))&&marker._icon){marker._icon.classList.add('ptcg-event-focus');focusedIcons.push(marker._icon);}eventFocusTimer=setTimeout(clearEventFocus,3000);return !!link||!!p;}
  function portalKey(p){return p.guid||p.portalGuid||'coordinate:'+p.position?.join(',');}
  function clearEventGraphics(){for(const entry of eventMarkers.values()){closeOwnedTooltip(entry.marker);entry.marker.unbindTooltip();entry.marker.off();}eventMarkers.clear();eventGeometry.clear();eventLayer.clearLayers();}
  function closePortalActivity(){const w=wm?.get('portal-activity');if(w)wm.hide(w);pinnedPortal=null;}
  function validPortalPosition(p){return Array.isArray(p?.position)&&p.position.length===2&&p.position.every(Number.isFinite)&&Math.abs(p.position[0])<=90&&Math.abs(p.position[1])<=180;}
  function centerPortalActivity(){const p=pinnedPortal?.portal;if(!validPortalPosition(p))return;pauseFollow();window.map.panTo(p.position,{animate:false});}
  function openPortalActivity(p){if(!p||!window.map.hasLayer(masterLayer))return;const key=portalKey(p);
    const w=wm.open('portal-activity',t("portal_activity"),w=>{w.kind='portal';w.body.classList.add('ptcg-portal-activity');
      const title=el('h3'),stats=el('p'),center=button(t("center_on_screen"),centerPortalActivity),rows=el('div',undefined,'ptcg-portal-rows'),more=button(t('more_portal_events'),()=>{if(pinnedPortal){pinnedPortal.allowance+=5;updatePortalActivity();}}),end=el('small',t("all_shown"));
      center.title=t("center_on_screen");center.dataset.portalCenter='1';more.dataset.portalMore='1';rows.tabIndex=0;rows.setAttribute('aria-label',t("portal_activity_records"));w.body.append(title,stats,center,rows,more,end);w.portalUI={title,stats,center,rows,more,end};w.onHide=()=>{pinnedPortal=null;};
    },420,460,{owner:'portal',title:t("portal_activity"),standalone:true,initialHidden:true});
    if(pinnedPortal?.key===key){pinnedPortal.portal=p;updatePortalActivity();return;}
    w.portalUI.rows.replaceChildren();w.portalUI.rows.scrollTop=0;w.body.scrollTop=0;pinnedPortal={key,portal:p,node:w.node,w,...w.portalUI,allowance:5,rowNodes:new Map()};updatePortalActivity();
  }
  function portalBatches(items){return presentation.fold(items,flipResolution());}
  function portalEventRow(item){const e=item.event,row=el('details',undefined,'ptcg-portal-row'),summary=el('summary');row.dataset.portalEvent=e.guid;row.dataset.rowKey=item.flip?.id||e.guid;
    if(item.flip){summary.append(compactFlip(item));row.append(summary,el('p',t('raw_display_count',{raw:item.batch.length,display:1})),flipEvidenceDetails(item.flip));for(const child of item.batch){const detail=el('details'),s=el('summary');s.append(compactEvent(child.event));detail.append(s,eventDetails(child.event));row.append(detail);}}
    else{summary.append(compactEvent(e,null,'portal'));row.append(summary);const relation=relationLabel(e,item.portal||pinnedPortal?.portal);if(relation)row.append(el('small',relation));row.append(eventDetails(e));}return row;
  }
  function updatePortalActivity(){const pin=pinnedPortal;if(!pin)return;const items=new Map();for(const name of model.players.keys()){const v=sharedView(name);if(!matches(name,v)||!window.map.hasLayer(layers[v.role]))continue;for(const e of v.events){const p=e.portals.find(p=>p.position&&portalKey(p)===pin.key);if(p)items.set(e.guid,{event:e,portal:p});}}
    for(const e of model.events.values())if(core.isSystem(e)&&e.time<=observationT&&e.time>=observationT-settings.hours*3600000){const p=e.portals.find(p=>p.position&&portalKey(p)===pin.key);if(p)items.set(e.guid,{event:e,portal:p});}
    const all=[...items.values()].sort((a,b)=>b.event.time-a.event.time||a.event.guid.localeCompare(b.event.guid)),batches=portalBatches(all),visible=batches.slice(0,pin.allowance),anchor=readingAnchor(pin.rows,'[data-portal-event]');if(all.length)pin.portal=all[0].portal;pin.title.textContent=pin.portal.name||pin.portal.plain||t('unnamed_portal');wm.setTitle(pin.w,t('portal_activity_246')+pin.title.textContent);pin.center.disabled=!validPortalPosition(pin.portal);pin.center.title=pin.center.disabled?t('coordinates_unavailable'):t('center_on_screen');updatePortalHeader(pin,all,batches);
    const keep=new Set(visible.map(i=>i.flip?.id||i.event.guid));for(const [id,row]of pin.rowNodes)if(!keep.has(id)){row.remove();pin.rowNodes.delete(id);}let cursor=pin.rows.firstChild;
    for(const item of visible){const key=item.flip?.id||item.event.guid,signature=JSON.stringify([i18n.locale(),item.event.identity,item.batch?.map(x=>[x.event.guid,x.event.identity]),resolvedEvidence().byGuid.get(item.event.guid)]);let row=pin.rowNodes.get(key);if(!row||row._contentKey!==signature){const open=row?.open;if(row===cursor)cursor=row.nextSibling;row?.remove();row=portalEventRow(item);row.open=!!open;row._contentKey=signature;pin.rowNodes.set(key,row);}if(row!==cursor)pin.rows.insertBefore(row,cursor);cursor=row.nextSibling;}
    updateEventTimes(pin.rows);restoreAnchor(pin.rows,anchor,'[data-portal-event]');pin.more.disabled=visible.length>=batches.length;pin.end.hidden=!pin.more.disabled;
  }
  function factionCountsNode(views){const c=presentation.counts(views),others=c.MACHINA+c.NIA+c.OTHER,n=el('span',c.total+(others?t('accounts'):t('players_205')));n.dataset.factionCounts=JSON.stringify(c);for(const role of ['RES','ENL']){const text=el('span',' · '+role+' '+c[role]);text.style.color=roleColors[role];n.append(text);}for(const [role,names]of [['MACHINA','Machina'],['NIA','NIA']])if(c[role])n.append(document.createTextNode(' · '+names+' '+c[role]));if(c.OTHER)n.append(document.createTextNode(' · '+t('other_count',{n:c.OTHER})));return n;}
  function eventTooltip(items,heading=''){const node=el('div',undefined,'ptcg-hover-content');if(heading)node.append(el('strong',heading));const unique=new Map(items.filter(x=>!core.isSystem(x.event)).map(x=>[x.event.player.toLowerCase(),{name:x.event.player,role:core.role(x.event)}]));if(unique.size>1)node.append(factionCountsNode([...unique.values()]));const rows=portalBatches([...items].sort((a,b)=>b.event.time-a.event.time));for(const item of rows.slice(0,5)){const e=item.event,row=el('div',undefined,'ptcg-hover-row');if(item.flip){const stamp=el('span',time(e.time));stamp.dataset.eventTime=e.time;row.append(stamp,eventSymbol(e),el('strong',t('flip_summary')),el('span',item.flip.operator||item.flip.systemActor||e.player));for(const child of item.batch.filter(c=>['linked','destroyedLink'].includes(c.event.action)).slice(0,3))row.append(compactEvent(child.event,null,'portal',true));}else row.append(compactEvent(e,null,'portal',true));node.append(row);}if(rows.length>5)node.append(el('small',t('also')+(rows.length-5)+t('records_click_to_view')));return node;}
  function nativePortalSelected(data){const guid=data?.selectedPortalGuid||data?.guid||window.selectedPortal;if(!guid)return;let p;for(const e of model.events.values()){p=e.portals.find(p=>(p.guid||p.portalGuid)===guid);if(p)break;}if(!p){const m=window.portals?.[guid],ll=m&&(window.IITC?.portal?.getLatLng?window.IITC.portal.getLatLng(m):m.getLatLng?.());if(ll){const pos=[ll.lat,ll.lng];for(const e of model.events.values()){p=e.portals.find(p=>p.position?.join(',')===pos.join(','));if(p)break;}p=p||{guid,position:pos,name:m.options?.data?.title||'Portal'};}}if(p)openPortalActivity(p);}
  api.eventEvidence=()=>({policy:eventEvidence.POLICY,flips:resolvedEvidence().flips});
  api.inferenceResult=name=>inferenceCache.get(canonical(name))?.result||null;
  api.inferenceState=()=>({jobs:jobId,pending:inferencePending.size,discarded,T:observationT});
  // Read-only pipeline evidence for regression investigations, outside product UI.
  api.inferenceTrace=name=>{name=canonical(name);const v=sharedView(name),cache=inferenceCache.get(name),base=cache?.key===inferenceKey(v)?cache.result:inferencePending.get(name)?.preview||(!v.events.length?inferenceFor(v):null),w=wm.get('player:'+name.toLowerCase()),display=historicalModel.select(base?.historical,primaryModel(),settings.historicalScenario,w?.historicalBranch??null);return {name,T:observationT,displayTime:historicalTime(name),cutoff:observationT-settings.hours*3600000,worker:inferenceWorker?'available':'unavailable',pending:inferencePending.has(name),cacheCurrent:cache?.key===inferenceKey(v),display,comparison:base?.historical,minimumProofs:base?.minimum?.proofs||[],xmpAudit:base?.scenario?.audit,rawCount:v.events.length,legacyDiagnostic:{baseline:base?.audit,regions:base?.regions,paths:base?.pathSegments},rendered:{markers:inferenceLayer.getLayers().filter(l=>l.options.ptcgInferenceName===name).length,historicalMarkers:0,regions:inferenceLayer.getLayers().filter(l=>l.options.ptcgRegionTime!==undefined&&l.options.ptcgPlayer===name).length,paths:inferenceLayer.getLayers().filter(l=>l.options.ptcgInferredPath&&l.options.ptcgPlayer===name).length}};};
  api.inspectHistory=(name,at)=>{const w=playerWindow(name,'reader');w.viewSection='inference';if(Number.isSafeInteger(at))w.historicalTime=at;wm.save();requestRender(true);return w;};
  api.setHistoricalTime=(name,at)=>{if(!Number.isSafeInteger(at))throw Error('Invalid historical time');const w=wm.get('player:'+canonical(name).toLowerCase());if(!w)throw Error('Open the player first');w.historicalTime=at;wm.save();requestRender(true);};
  api.historicalPolicy=historicalModel.POLICY;



  const eventTypes={flip:{glyph:'⚑',group:'capture'},neutralized:{glyph:'○',group:'destroy'},captured:{glyph:'⚑',accent:true,group:'capture'},deployed:{glyph:'⚑',group:'capture'},beacon:{glyph:'B',group:'beacon'},battleBeacon:{glyph:'B',group:'beacon'},rbb:{glyph:'B',glyphColor:'#da8dff',group:'beacon'},vrbb:{glyph:'B',glyphColor:'#ffe46c',group:'beacon'},fracker:{glyph:'F',glyphColor:'#ff6f6f',group:'fracker'},fireworks:{glyph:'✧',group:'other'},beaconWinner:{glyph:'•',group:'other'},beaconForecast:{glyph:'•',group:'other'},destroyedResonator:{glyph:'×',group:'destroy'},destroyedLink:{glyph:'×',group:'destroy'},destroyedField:{glyph:'×',group:'destroy'},linked:{glyph:'↗',group:'link'},fielded:{glyph:'△',group:'other'},upgraded:{glyph:'↑',group:'other'},unknown:{glyph:'•',group:'other'}};
  let groups=['capture','destroy','link','beacon','fracker','other'],groupNames={capture:t("capture_resonator"),destroy:t("destruction"),link:t("link"),beacon:'Beacon／Battle Beacon',fracker:'Fracker',other:t("other_cf")};
  function eventAppearance(e){const type=eventTypes[e.action]||eventTypes.unknown;return {...type,color:['beacon','battleBeacon','rbb','vrbb','fracker'].includes(e.action)?({RESISTANCE:roleColors.RES,ENLIGHTENED:roleColors.ENL,MACHINA:roleColors.MACHINA}[e.wireTeam]||roleColors.OTHER):roleColors[core.role(e)],title:shortActions[e.action]};}
  function eventSymbol(e){const a=eventAppearance(e),n=el('span',a.glyph,'ptcg-row-symbol'+(a.accent?' ptcg-capture':''));n.style.color=a.glyphColor||a.color;n.style.borderColor=a.color;n.title=a.title;n.dataset.eventType=e.action;return n;}
  function counts(events){const c=Object.fromEntries(groups.map(g=>[g,0]));for(const e of events)c[(eventTypes[e.action]||eventTypes.unknown).group]++;return c;}
  function countText(c){return groups.map(g=>groupNames[g]+' '+c[g]).join(' · ');}
  function svgElement(tag,attributes={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,String(v));return n;}
  function renderCharts(node,views){
    node.replaceChildren();const events=views.flatMap(v=>v.events),c=counts(events),total=events.length;node.dataset.total=total;
    if(!total){node.append(el('p',t("no_activity_in_current_scope")));return;}const heading=el('small',t("event_counts")+countText(c));node.append(heading);
    const svg=svgElement('svg',{viewBox:'0 0 410 235',role:'img','aria-label':t("event_distribution")+countText(c)}),palette=['#ffe178','#ff8585','#7bd5ff','#da8dff','#ff6f6f','#b6bacb'];let offset=0;
    groups.forEach((g,i)=>{if(c[g]){const length=c[g]/total*251.327;svg.append(svgElement('circle',{cx:58,cy:63,r:40,fill:'none',stroke:palette[i],'stroke-width':18,'stroke-dasharray':length+' '+(251.327-length),'stroke-dashoffset':-offset,transform:'rotate(-90 58 63)'}));offset+=length;}const text=svgElement('text',{x:112,y:24+i*23,fill:palette[i],'font-size':12});text.textContent=groupNames[g]+' '+c[g];svg.append(text);});
    const center=svgElement('text',{x:58,y:67,'text-anchor':'middle',fill:'#eef5ff','font-size':14});center.textContent=total;svg.append(center);
    const summaries=[];for(const[ri,role]of ['RES','ENL','MACHINA','NIA','OTHER'].entries()){const rc=counts(views.filter(v=>v.role===role).flatMap(v=>v.events));if(!groups.some(g=>rc[g]))continue;summaries.push(roleLabels[role]+'：'+countText(rc));const y=170+ri*11,label=svgElement('text',{x:6,y:y+8,fill:roleColors[role],'font-size':9});label.textContent=roleLabels[role];svg.append(label);let x=83;groups.forEach((g,i)=>{const width=rc[g]/total*220;if(width){svg.append(svgElement('rect',{x,y,width,height:9,fill:palette[i],stroke:roleColors[role],'stroke-width':1}));x+=width;}});const t=svgElement('text',{x:x+5,y:y+8,fill:roleColors[role],'font-size':9});t.textContent=groups.reduce((s,g)=>s+rc[g],0);svg.append(t);}
    svg.setAttribute('aria-label',t("event_distribution_255")+countText(c)+t("faction_event_counts")+summaries.join('；'));node.append(svg);const accessible=el('small',summaries.join('；'),'ptcg-chart-summary');node.append(accessible);
    const legend=el('div',undefined,'ptcg-event-legend');for(const action of Object.keys(eventTypes).filter(action=>action!=='battleBeacon'))for(const team of action==='beacon'?['RESISTANCE','ENLIGHTENED']:['RESISTANCE']){const e={action,team,wireTeam:team,player:t("legend"),portals:[]};const n=el('span');n.dataset.legendTeam=team;n.append(eventSymbol(e),document.createTextNode(shortActions[action]+(action==='beacon'?(team==='RESISTANCE'?'（RES）':'（ENL）'):'')));legend.append(n);}node.append(legend,el('small',t("connection_legend"),'ptcg-line-legend'));
  }
  let followNode=null;
  const activityFollow=createTrackerActivity(core,{events:name=>model.players.get(name)||[],context:()=>({T:observationT,lower:observationT-settings.hours*3600000,live:liveObservation,visible:!!masterLayer&&window.map.hasLayer(masterLayer)&&window.map.getZoom()>=MIN_ZOOM}),center:loc=>{if(loc.points.length===1)window.map.panTo(loc.points[0],{animate:false});else window.map.fitBounds(loc.points,{padding:[40,40],maxZoom:window.map.getZoom(),animate:false});},change:()=>renderFollow()});
  const follow=activityFollow.state;
  function updateFollow(force=false){activityFollow.update(force);}
  function selectFollow(name){name=canonical(name);if(activityFollow.start(name))requestRender();}
  function pauseFollow(){activityFollow.manual();}
  function stopFollow(reason='stopped'){activityFollow.stop(reason);requestRender();}
  function renderFollow(){if(!followNode)return;followNode.hidden=follow.paused&&follow.status!=='cleared';const text=followNode.querySelector('[data-follow-status]');text.textContent=(follow.target?follow.target+' · ':'')+t('follow_'+follow.status)+(follow.locationKind==='event-geometry'?' · '+t('event_location'):'')+(follow.manual?' · '+t('recenter_on_next_event'):'');followNode.querySelector('[data-follow-stop]').textContent=t('stop_following');followNode.querySelector('[data-follow-center]').textContent=t('center_on_screen');}
  function installFollowControl(){const control=L.control({position:'bottomleft'});control.onAdd=()=>{followNode=el('div',undefined,'ptcg-follow-control');followNode.append(el('span',undefined));followNode.firstChild.dataset.followStatus='1';const center=button(t('center_on_screen'),()=>updateFollow(true)),stop=button(t('stop_following'),()=>stopFollow());center.dataset.followCenter='1';stop.dataset.followStop='1';followNode.append(center,stop);L.DomEvent.disableClickPropagation(followNode);L.DomEvent.disableScrollPropagation(followNode);renderFollow();return followNode;};control.addTo(window.map);cleanup.push(()=>control.remove());}
  function followControl(f,name){const own=follow.target===name&&!follow.paused;const b=button(own?t('stop_following'):t('follow_this_player'),()=>{if(own)stopFollow();else selectFollow(name);render();});b.disabled=core.isSystem({player:name});f.append(b);if(!follow.paused&&follow.target!==name)f.append(el('small',t('following')+follow.target));}
  api.followState=()=>({...follow});api.followPlayer=selectFollow;api.stopFollow=()=>stopFollow();
  function nativePortal(portal){if(!portal?.position)return;openPortalActivity(portal);pauseFollow();const guid=portal.guid||portal.portalGuid,portalAPI=window.IITC?.portal,display=portalAPI?.display;
    follow.programmatic=true;try{
      const render=display?.renderDetails||window.renderPortalDetails,select=portalAPI?.selectByLatLng||window.selectPortalByLatLng;
      if(typeof guid==='string'&&guid&&typeof render==='function')render.call(display,guid);
      else if(typeof select==='function')select.call(portalAPI,portal.position);
      else if(pinnedPortal)pinnedPortal.stats.textContent+=t("native_portal_selection_unavailable");
      window.map.setView(portal.position,Math.max(window.map.getZoom(),17),{animate:false});
    }finally{follow.programmatic=false;}
  }
  let historyBusy=false,historyPages=0,historyTimer=null,historyIntent=0;
  function cancelHistoryAction(){if(historyTimer!==null)clearTimeout(historyTimer);historyTimer=null;historyIntent++;}
  function fetchHistory(force=false){
    if(!acquisition){messages.historyText=()=>t('history_interface_unavailable');requestRender();return Promise.resolve({state:'unavailable'});}
    cancelHistoryAction();const token=historyIntent,epoch=dataGeneration,target=acquisitionTarget();historyFreezeRight=null;const lease=historySession.acquire();target.upper=observationT;target.lower=target.upper-Math.min(24,settings.hours)*3600000;target.live=false;
    if(force){const rows=activityStore.invalidateHistory(target);enqueue([],[],rows);}
    messages.historyText=()=>t('history_queued');requestRender();
    return acquisition.requestHistory(target,force).then(r=>{if(token!==historyIntent||epoch!==dataGeneration)return r;messages.historyText=()=>i18n.status(r.text)||t('history_'+r.state);requestRender(true);return r;}).finally(()=>historySession.release(lease));
  }
  function lookbackChanged(previous){settings.hours=Math.max(.5,Math.min(24,settings.hours));saveSettings();cancelHistoryAction();acquisition?.cancelHistory();if(settings.hours>previous){messages.historyText=()=>t('history_queued');historyTimer=setTimeout(()=>{historyTimer=null;fetchHistory();},250);}}
  function moreHistory(){const old=settings.hours;if(old>=24){messages.historyText=()=>t('map_24h_limit');requestRender();return false;}settings.hours=Math.min(24,old+1);saveSettings();lookbackChanged(old);requestRender(true);return true;}
  function historyButton(f,w){const b=button(t('lookback_more_global'),moreHistory);b.dataset.moreHistory='1';f.append(b);const status=w.historyStatus||(w.historyStatus=createHistoryStatus(w.player));updateHistoryNode(status);f.append(status);}
  api.expandHistory=moreHistory;api.retryHistory=()=>fetchHistory(true);api.historyState=()=>({...acquisition?.snapshot().history,busy:historyBusy,pages:historyPages,text:String(messages.historyText),visible:visibleHistoryCount()});
  function visibleHistoryCount(player){return [...model.players.keys()].reduce((n,p)=>{if(player&&p.toLowerCase()!==player.toLowerCase())return n;const v=sharedView(p);return n+(matches(p,v)&&window.map.hasLayer(masterLayer)&&window.map.hasLayer(layers[v.role])?v.events.length:0);},0);}
  let historyPresentationAt=0,historyPresentationKey='',historyPresentation=null;
  function historyPresentationState(){const state=acquisition?.snapshot(),raw=state?.history||{phase:'idle',pages:0},shared=coordinator?.snapshot(),waiting=state?.intent==='history'&&state.pluginInFlight&&!state.pluginDispatched,h={...raw,phase:state?.intent==='history'&&state.nativeUnknown?'waiting-native-unknown':waiting?'waiting':raw.phase,waitReason:waiting?shared.reason||raw.waitReason:raw.waitReason,nextEligibleAt:state?.nativeUnknown&&state?.intent==='history'?null:waiting?Math.max(raw.nextEligibleAt||0,shared.nextAttempt||0)||null:raw.nextEligibleAt},now=Date.now(),key=JSON.stringify([i18n.locale(),h.phase,h.target,state?.lastFailure?.at,state?.state==='backoff'||state?.state==='unavailable']);if(!historyPresentation||key!==historyPresentationKey||now-historyPresentationAt>=1000){historyPresentation={...h,transportState:state?.state,lastFailure:state?.lastFailure,cursor:state?.suspendedHistory?.cursor||state?.gaps?.at(-1)?.cursor||null,countdown:Number.isFinite(h.nextEligibleAt)?Math.max(0,Math.ceil((h.nextEligibleAt-now)/1000)):null};historyPresentationKey=key;historyPresentationAt=now;}return historyPresentation;}
  function createHistoryStatus(player){const node=el('details',undefined,'ptcg-history-status');node.dataset.ptcgHistoryStatus='1';if(player)node.dataset.historyPlayer=player;const summary=el('summary'),content=el('div');summary.dataset.historyPrimary='1';content.dataset.historyDetails='1';node.append(summary,content);updateHistoryNode(node);return node;}
  function updateHistoryNode(node){const h=historyPresentationState(),phase=h.phase==='waiting'&&(h.transportState==='backoff'||h.lastFailure)?t('history_retry_wait'):t('history_phase_'+h.phase),primary=t('shared_history')+' · '+phase+(h.countdown!==null?' · '+t('history_retry_after',{n:h.countdown}):'')+' · '+t('history_pages',{n:h.pages||0}),s=node.querySelector('[data-history-primary]');if(s.textContent!==primary)s.textContent=primary;const failure=h.lastFailure,detail=t('shared_history_detail',{returned:h.returned||0,accepted:h.accepted||0,visible:visibleHistoryCount(node.dataset.historyPlayer)})+(node.dataset.historyPlayer?' · '+t('this_player_visible'):' · '+t('current_filter_visible'))+' · '+(h.waitReason?i18n.status(h.waitReason):t('history_no_wait_reason'))+(failure?' · '+t('last_failure')+' '+(failure.status?'HTTP '+failure.status:t('http_status_unavailable'))+' · '+t(i18n.catalog['failure_reason_'+failure.reason]?'failure_reason_'+failure.reason:'failure_reason_unknown')+' · '+clockText.absolute(failure.at):'')+(h.nextEligibleAt?' · '+t('next_eligible_retry')+' '+clockText.absolute(h.nextEligibleAt):'')+(h.cursor?' · '+t('history_cursor')+' '+h.cursor.time+' / '+h.cursor.guid:'')+(h.earliestTime!==null&&h.earliestTime!==undefined?' · '+t('history_earliest')+clockText.absolute(h.earliestTime):'')+' · '+t('zero_pages_not_no_events');const content=node.querySelector('[data-history-details]');if(content.textContent!==detail)content.textContent=detail;}
  function renderHistorySummary(){for(const n of document.querySelectorAll('[data-ptcg-history-status]')){if(n.matches('details'))updateHistoryNode(n);else{const h=historyPresentationState(),text=t('shared_history')+' · '+t('history_phase_'+h.phase)+' · '+t('history_pages',{n:h.pages||0});if(n.textContent!==text)n.textContent=text;}}}
  function syncObservationInputs(){if(!wm)return;for(const w of wm.windows.values()){const at=w.body.querySelector('[data-observation-time]'),live=w.body.querySelector('[data-live-observation]');if(!at)continue;if(live)live.checked=liveObservation;at.disabled=liveObservation;if(document.activeElement!==at)at.value=clockText.absolute(observationT).replaceAll('/','-').replace(' ','T');}}
  function rowControl(f,w){
    const label=el('label',t("activity_rows"),'ptcg-field'),control=el('select');control.dataset.summaryRows='1';for(const n of [3,5,10]){const o=el('option',String(n));o.value=n;control.append(o);}w.summaryRows=w.summaryRows||settings.summaryRows;control.value=w.summaryRows;control.addEventListener('change',()=>{w.summaryRows=Number(control.value);settings.summaryRows=w.summaryRows;w.page=0;saveSettings();wm.save();renderReader(w);});label.append(control);f.append(label);
    const v=sharedView(w.player),pages=Math.ceil(v.events.length/w.summaryRows);w.page=Math.min(w.page||0,Math.max(0,pages-1));if(pages>1){const previous=button(t("previous_page"),()=>{w.page--;renderReader(w);wm.save();}),next=button(t("next_page"),()=>{w.page++;renderReader(w);wm.save();});previous.disabled=!w.page;next.disabled=w.page>=pages-1;f.append(previous,el('small',(w.page+1)+'/'+pages),next);}
  }
  function switchWindow(name,kind){const w=wm.get('player:'+name.toLowerCase());if(!w)return playerWindow(name,kind,true);w.scroll[w.kind]=w.body.scrollTop;w.kind=kind;w.node.dataset.kind=kind;w.body.replaceChildren();render();w.body.scrollTop=w.scroll[kind]||0;wm.save();return w;}
  function buildXMP(w){const label=el('label',t('attack_range_simulation'),'ptcg-field'),input=el('input');input.type='number';input.min=1;input.max=2000;input.value=settings.xmpRadius;input.dataset.xmpRadius='1';input.title=t('attack_range_help');input.addEventListener('change',()=>{if(localizing)return;const v=Number(input.value);if(!(v>0&&v<=2000)){input.value=settings.xmpRadius;return;}settings.xmpRadius=v;saveSettings();requestRender(true);});label.append(input,el('span','m'));w.body.append(label,el('small',t('attack_range_help')));
  }
  function motionLine(points,role,kind,group,options={}){const c=options.ptcgPlayer?color(options.ptcgPlayer,sharedView(options.ptcgPlayer).team):roleColors[role],dash=options.ptcgAttackSupported?'10,3,2,3':kind==='raw'?'7,6':'3,5',pane=kind==='raw'?panes.raw:panes.inferredPaths;L.polyline(points,{pane,color:'#000000',weight:kind==='raw'?6:3.5,opacity:.85,dashArray:dash,interactive:false,...options,ptcgHalo:true}).addTo(group);L.polyline(points,{pane,color:c,weight:kind==='raw'?4:1.5,dashArray:dash,interactive:false,...options,ptcgRawActivity:kind==='raw'&&!options.ptcgAttackSupported,ptcgInferredPath:kind==='inferred'}).addTo(group);}

  function portalLink(portal) {
    const span = el('span', undefined, 'ptcg-portal');
    const title = portal.name || portal.plain || t("unnamed_portal");
    if (!portal.position) { span.textContent = title + t("no_coordinates"); return span; }
    const a = el('a', title); const ll = portal.position.join(',');
    a.title = title;
    a.href = 'https://intel.ingress.com/intel?ll=' + encodeURIComponent(ll) + '&pll=' + encodeURIComponent(ll);
    a.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();e.stopPropagation();nativePortal(portal);
    });
    span.append(a); return span;
  }
  function clearWithConfirmation(){if(!window.confirm(t("clear_activity_conflicts_and_scope_records_across_all_tabs_unexpo")))return Promise.resolve(false);return clearData();}
  function resetActivity(change){clearEventFocus();capture?.cancel('cleared');historySession?.reset();const removed=change?.kind==='prune'?new Set(change.ids):null,keep=removed?[...model.events.values()].filter(e=>!removed.has(e.guid)):[],keepConflicts=removed?[...model.conflicts.values()].filter(c=>!removed.has(c.guid)):[];buffer=[];backtrack?.clear();model.clear();for(const e of keep)model.add(e);for(const c of keepConflicts)model.conflicts.set(c.id,c);speedCache.clear();cancelHistoryAction();if(!removed)stopFollow('cleared');if(removed){for(const id of removed)persisted.delete(id);for(const id of [...savedConflicts])if(!model.conflicts.has(id))savedConflicts.delete(id);}else{persisted.clear();savedConflicts.clear();}Object.values(layers).forEach(layer=>layer.clearLayers());drawn.clear();clearClusterGraphics();clusterRecords.clear();clearEventGraphics();closePortalActivity();clearInferenceGraphics();inferenceCache.clear();inferencePending.clear();inferenceQueue.clear();activeJob=null;workerEpoch++;inferenceWorker?.terminate();inferenceWorker=null;startInferenceWorker();acquisition.resetActivity();activityStore.resetScopes(change);if(!removed){backtrackSaveError='';backtrackArchiveChain=backtrackArchiveChain.then(async()=>{const db=await archiveDB();await new Promise((resolve,reject)=>{const tx=db.transaction('pages','readwrite');tx.objectStore('pages').clear();tx.oncomplete=()=>{backtrackArchiveBytes=0;resolve();};tx.onerror=()=>reject(tx.error);});}).catch(e=>{backtrackSaveError=e.message;});}dirty=new Set(model.players.keys());}
  async function adoptEpoch(g,change){if(g<=dataGeneration)return;coordinator.stop();dataGeneration=g;activityStore.adopt(g,change);resetActivity(change);localStorage.removeItem(KEY+'-acquisition-scopes');messages.storageState=()=>change?.kind==='prune'?t("activity_pruning_synchronized"):t("other_tab_s_clear_synchronized");requestRender(true);updateAcquisitionPause();if(settings.persist)enqueue([...model.events.values()].filter(e=>!persisted.has(e.guid)),[...model.conflicts.values()].filter(c=>!savedConflicts.has(c.id)),activityStore.allScopes());}
  async function clearData(ids=null){if(clearing)return false;backtrack?.pause('backtrack_reason_cleared');clearing=true;acquisition.setPause(t("clearing_activity"));coordinator.stop();acquisition.resetActivity();buffer=[];workerEpoch++;inferenceWorker?.terminate();inferenceWorker=null;activeJob=null;const operation=(async()=>{try{const result=await activityStore.clear(ids);dataGeneration=result.generation;resetActivity(result.change);localStorage.removeItem(KEY+'-acquisition-scopes');coordinator.epoch(dataGeneration);messages.storageError=()=>'';messages.storageState=()=>ids?t("selected_activity_pruned_other_data_retained"):t("activity_cleared_exported_files_unaffected");return true;}catch(e){messages.storageError=()=>t("clear_failed")+i18n.status(e.message);startInferenceWorker();return false;}finally{clearing=false;buffer=[];updateAcquisitionPause();schedule(true);}})();chain=operation;return operation;}
  // This API never bypasses the UI confirmation for ordinary use.
  api.clearWithConfirmation = clearWithConfirmation;
  function injectStyle() { const style=el('style');style.textContent=".ptcg-window{position:fixed;z-index:10020;display:flex;flex-direction:column;box-sizing:border-box;min-width:180px;background:#112232;color:#eff4f9;border:1px solid #647c91;border-radius:8px;box-shadow:0 8px 28px #0009;font:13px/1.5 system-ui,sans-serif;overflow:hidden}\r\n.ptcg-window[hidden],.ptcg-body[hidden]{display:none}.ptcg-window header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;padding:7px 10px;background:#20394e;cursor:move;touch-action:none;min-height:28px}.ptcg-window header strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ptcg-window-controls{display:flex;gap:3px;flex-shrink:0}.ptcg-window .ptcg-window-icon{margin:0;padding:3px;display:flex;background:transparent;border:0}.ptcg-body{padding:10px;overflow:auto;overscroll-behavior:contain;min-height:0;flex:1}\r\n.ptcg-window button,.ptcg-window select,.ptcg-window input,.ptcg-window textarea{font:inherit;max-width:100%;box-sizing:border-box}.ptcg-window button{cursor:pointer;background:#29465e;border:1px solid #6685a0;border-radius:4px;color:#f7fbff;padding:4px 8px;margin:3px 4px 3px 0}.ptcg-window button:hover{background:#3d6381}.ptcg-window button:disabled{opacity:.45}.ptcg-window input[type=search],.ptcg-window input[type=text],.ptcg-window textarea{width:100%;background:#0c1b29;color:#fff;border:1px solid #748da4;border-radius:4px;padding:5px}.ptcg-window select{color:#fff;background:#244158;border:1px solid #7891a5;padding:4px}.ptcg-window input[type=color]{width:62px;height:30px}.ptcg-window input[type=checkbox]{accent-color:#78bcff}.ptcg-field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0}.ptcg-field input[type=text]{width:65%}.ptcg-check{display:flex;align-items:center;gap:5px;padding:5px 0}.ptcg-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}.ptcg-actions{display:flex;flex-wrap:wrap;margin-bottom:8px}.ptcg-player-row{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;border-bottom:1px solid #3d566a;padding:5px 0}.ptcg-player-name{border-left:4px solid}.ptcg-player-row small{color:#ffda90}.ptcg-window a{color:#a7d9ff;text-decoration:underline}.ptcg-warning{color:#ffdd98;margin:5px 0}.ptcg-window p{margin:8px 0}.ptcg-window h3{font-size:15px}.ptcg-window small{color:#bdd0e0}.ptcg-window details{margin:7px 0}.ptcg-window summary{cursor:pointer;color:#b7d0e5}.ptcg-event{padding:5px 0;border-bottom:1px solid #3c5366}.ptcg-compact-event{display:grid;grid-template-columns:82px 105px minmax(0,1fr);gap:0 6px;border-bottom:1px solid #334c60;padding:6px 0;align-items:center}.ptcg-compact-event>span+span{border-left:1px solid #667b8d;padding-left:6px}.ptcg-compact-portal,.ptcg-portal,.ptcg-portal a{min-width:0;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ptcg-event details .ptcg-portal{white-space:normal;overflow:visible}.ptcg-count{display:block;margin:6px 0}\r\n.ptcg-pin{background:none!important;border:0!important}.ptcg-pin svg{display:block;filter:drop-shadow(0 1px 2px #0009)}.ptcg-label{position:absolute;bottom:44px;left:14px;transform:translateX(-50%);white-space:nowrap;background:#102132ed;color:#fff;border:1px solid;border-radius:4px;padding:3px 6px;max-width:300px;overflow:hidden;text-overflow:ellipsis;font:12px/1.3 system-ui}\r\n@media(max-width:500px){.ptcg-grid{grid-template-columns:1fr}.ptcg-body{padding:8px}.ptcg-compact-event{grid-template-columns:62px 90px minmax(0,1fr);font-size:12px}.ptcg-label{max-width:230px}}\r\n\r\n.ptcg-ghost-tag{color:#ffd46c;background:#63274a;border:1px solid #ffa54a;border-radius:3px;padding:1px 5px}.ptcg-window .ptcg-ghost{border:1px solid #ffc565;background:#57273e}.ptcg-ghost-window{border:2px solid #ffb94d}.ptcg-ghost-pin .ptcg-label{box-shadow:0 0 0 2px #ffb94d}.ptcg-cluster{background:#21475a;color:#fff;border:2px solid #99daff;border-radius:12px;box-sizing:border-box;text-align:center;font:12px/26px system-ui;white-space:nowrap}.ptcg-cluster.ptcg-ghost{border-color:#ffb94d;background:#57273e}.ptcg-body{overflow-wrap:anywhere}\r\n\r\n.ptcg-person{background:none;border:0}.ptcg-event-icon{border:2px solid #87bbdb;border-radius:50%;background:#0a2130;text-align:center;box-sizing:border-box;font:bold 16px/18px system-ui;box-shadow:0 0 3px #000}.ptcg-event-focus{box-shadow:0 0 0 5px #ffe46c}.ptcg-row-symbol{display:inline-block;width:14px;height:14px;border:1px solid #86caff;border-radius:50%;font:11px/14px system-ui;margin-right:3px;text-align:center;cursor:pointer}.ptcg-person .ptcg-label{bottom:32px}\r\n\r\n.ptcg-capture{background:#443517!important;box-shadow:0 0 0 1px #ffd96c}.ptcg-link-arrow{background:none;border:0;pointer-events:none}.ptcg-link-arrow span{display:block;transform-origin:center;font:18px/18px system-ui;text-shadow:0 0 2px #000}.ptcg-charts svg{width:100%;height:auto;max-height:220px}.ptcg-event-legend{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:11px}.ptcg-player-counts{flex-basis:100%;padding-left:8px}.ptcg-player-row{padding:9px 0;gap:6px 10px}.ptcg-field input[type=number]{width:115px;background:#153146;color:#fff;border:1px solid #87adc6;padding:4px}.ptcg-chart-summary{display:block;font-size:11px}.ptcg-person{pointer-events:auto}.ptcg-person .ptcg-label{pointer-events:none}\r\n\r\n/* 0.1.0.6 responsive in-page workspaces */\r\n.ptcg-workspace{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box}.ptcg-workspace[hidden]{display:none!important}.ptcg-workspace>header{flex:none;touch-action:none}.ptcg-tabs{display:flex;flex:none;overflow-x:auto;gap:3px;padding:4px;min-height:36px;scrollbar-width:thin}.ptcg-tabs [role=tab]{flex:none;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ptcg-tabs [aria-selected=true]{border-bottom:3px solid #ffe17a;background:#314d64}.ptcg-tab-tools{display:flex;flex:none;gap:4px;padding:3px 8px;flex-wrap:wrap}.ptcg-tab-tools button{min-width:30px}.ptcg-workspace-content{flex:1;min-height:0;overflow:hidden}.ptcg-tab-panel{height:100%;min-height:0;overflow:hidden}.ptcg-tab-panel[hidden]{display:none!important}.ptcg-tab-panel>.ptcg-body{height:100%;box-sizing:border-box;overflow:auto;padding-bottom:25px}.ptcg-resize{position:absolute;bottom:0;right:0;cursor:nwse-resize;touch-action:none;padding:0 4px!important}.ptcg-charts svg{width:100%;height:auto;max-height:none}.ptcg-workspace:has(.ptcg-body){container-type:inline-size}.ptcg-workspace button:focus-visible,.ptcg-workspace select:focus-visible{outline:2px solid #ffdc70;outline-offset:-2px}.ptcg-tab-panel .ptcg-actions{flex-wrap:wrap}.ptcg-window input,.ptcg-window select{max-width:100%;box-sizing:border-box}.ptcg-compact-portal{overflow-wrap:anywhere;min-width:0}@container(max-width:360px){.ptcg-grid{grid-template-columns:1fr!important}.ptcg-compact-event{grid-template-columns:1fr!important}.ptcg-player-row{flex-wrap:wrap}.ptcg-field{display:flex;flex-wrap:wrap}.ptcg-charts{display:block!important}}.ptcg-workspace.minimized{height:42px}\r\n\r\n/* 0.1.0.7 compact close-only tabs and hover cards */\r\n.ptcg-tab-item{display:flex;align-items:center;flex:none;max-width:240px;border:1px solid #57778e;border-radius:4px}.ptcg-tabs .ptcg-tab-item [role=tab]{margin:0;border:0;max-width:205px}.ptcg-tab-item>.ptcg-window-icon{flex:none;margin:0;padding:5px;border:0}.ptcg-tabs{overflow-x:auto}.ptcg-workspace [data-window-action=resize] svg{width:16px;height:16px}.leaflet-tooltip.ptcg-hover{background:#102333f5;color:#eff7ff;border:1px solid #83b3d5;border-radius:6px;box-shadow:0 2px 10px #0009;max-width:310px;white-space:normal;pointer-events:none;font:12px/1.4 system-ui}.ptcg-hover-content>strong,.ptcg-hover-content>small{display:block;margin-bottom:4px}.ptcg-hover-row{display:flex;gap:4px 7px;flex-wrap:wrap;border-top:1px solid #476174;padding:3px 0}.ptcg-hover-row small{width:100%;overflow-wrap:anywhere;color:#c8d9e7}.ptcg-hover-row .ptcg-row-symbol{cursor:default}.ptcg-event-badge{position:absolute;right:-8px;bottom:-6px;background:#102333;border:1px solid #a6d4ee;border-radius:7px;font:9px/12px system-ui;min-width:12px;color:#f2f8ff}.ptcg-workspace [data-select-player][aria-pressed=true]{background:#35576f;border-color:#c5e8ff}.ptcg-resize{display:flex}.ptcg-tab-item [aria-selected=true]{box-shadow:inset 0 -3px #ffe17a}\r\n\r\n.ptcg-view-actions{position:sticky;top:0;z-index:3;background:#112232;border-bottom:1px solid #57778e;padding:3px 0;box-shadow:0 3px 5px #112232}\r\n\r\n/* The glyph is below its true anchor; a non-interactive leader keeps coincident\r\n   activity pins and Portal icons accessible without changing coordinates. */\r\n.ptcg-person:before{content:\"\";position:absolute;left:14px;top:-14px;width:2px;height:14px;background:#fff;box-shadow:0 0 2px #142536;pointer-events:none}.ptcg-person .ptcg-label{top:34px;bottom:auto;left:15px}.ptcg-pin .ptcg-label{pointer-events:none}\r\n.leaflet-tooltip.ptcg-hover{width:max-content;min-width:min(220px,calc(100vw - 24px));max-width:min(310px,calc(100vw - 24px))}.ptcg-hover-row strong{overflow-wrap:anywhere;max-width:100%}\r\n\r\n.ptcg-history-point{position:relative}.ptcg-history-diamond{display:block;width:12px;height:12px;transform:rotate(45deg);border:2px solid #fff;box-shadow:0 0 0 1px #102132}.ptcg-history-point .ptcg-label{top:22px;bottom:auto;left:8px;pointer-events:none}.ptcg-history-point::before{content:'';position:absolute;left:7px;top:-14px;height:14px;border-left:1px solid #fff;pointer-events:none}\r\n\r\n.ptcg-portal-activity{display:flex;flex-direction:column;gap:5px}.ptcg-portal-activity>h3{margin:0;flex:none}.ptcg-portal-activity>p{margin:3px 0;flex:none}.ptcg-portal-activity>button{align-self:flex-start;flex:none}.ptcg-portal-rows{flex:1;min-height:60px;overflow:auto;overscroll-behavior:contain}.ptcg-portal-row{display:flex;gap:4px;flex-wrap:wrap;border-top:1px solid #476174;padding:4px 0}.ptcg-portal-row>span{width:100%;color:#c8d9e7}\r\n\r\n/* The group badge leaves the true Portal anchor available for native selection. */\r\n.ptcg-cluster::before{content:\"\";position:absolute;left:78px;bottom:100%;height:52px;border-left:1px dotted #bfe8ff;pointer-events:none}\r\n\r\n.ptcg-tabs[hidden],.ptcg-workspace-content[hidden]{display:none!important}\r\n\r\n/* EchoTrace 0.1.1.5: scoped IITC CE dialog/tab/control styling. */\r\n.ptcg-window{font-family:Roboto,\"Helvetica Neue\",Helvetica,Arial,sans-serif;background:rgba(8,48,78,.96);border:1px solid #20a8b1;border-radius:0;color:#eee;box-shadow:0 3px 14px #0008;line-height:1.4}\r\n.ptcg-window header{background:#0f2c3f;border-bottom:1px solid #20a8b1;padding:4px 6px;gap:4px}\r\n.ptcg-window button{background:rgba(8,48,78,.9);color:#ffce00;border:1px solid #ffce00;border-radius:0;padding:3px 6px;min-height:26px}\r\n.ptcg-window button:hover{background:#0f2c3f;text-decoration:underline}.ptcg-window button:focus-visible,.ptcg-window input:focus-visible,.ptcg-window select:focus-visible{outline:2px solid #ffce00;outline-offset:1px}\r\n.ptcg-window button:disabled{cursor:default;text-decoration:none}.ptcg-window .ptcg-window-icon{color:#ffce00;min-width:24px;min-height:24px}.ptcg-window input[type=text],.ptcg-window input[type=search],.ptcg-window input[type=number],.ptcg-window input[type=datetime-local],.ptcg-window select,.ptcg-window textarea{background:#0f2c3f;border:1px solid #20a8b1;border-radius:0;color:#eee;padding:4px}\r\n.ptcg-window .ptcg-tabs{padding:3px 0 0;gap:2px;border-bottom:1px solid #20a8b1;background:rgba(8,48,78,.9)}.ptcg-window .ptcg-tab-item{border:1px solid #20a8b1;border-radius:0;max-width:270px}.ptcg-window .ptcg-tabs [role=tab]{color:#ffce00;padding:3px 7px;max-width:200px}.ptcg-window .ptcg-tab-item:has([aria-selected=true]){background:#0f2c3f;border-bottom-color:#0f2c3f}.ptcg-window .ptcg-tab-item [aria-selected=true]{background:#0f2c3f;box-shadow:inset 0 -2px #20a8b1;font-weight:bold}.ptcg-window .ptcg-tab-move{border:0;min-width:24px;padding:2px;margin:0;flex:none}\r\n.ptcg-window .ptcg-view-actions{background:#0f2c3f;border-bottom-color:#20a8b1;box-shadow:none}.ptcg-window fieldset{border:1px solid #20a8b1;margin:8px 0;padding:4px 8px;display:flex;flex-wrap:wrap;gap:3px 12px}.ptcg-window legend{color:#ffce00}.ptcg-window .ptcg-player-row{border-bottom:1px solid #20a8b166;gap:4px 6px;padding:6px 0}.ptcg-window .ptcg-player-name{min-width:0;max-width:calc(100% - 32px);overflow-wrap:anywhere;white-space:normal;text-align:left;border-left-width:3px}.ptcg-window .ptcg-player-activity{flex:none;margin-left:auto}.ptcg-window .ptcg-player-pick{flex:none;min-width:26px;padding:2px}.ptcg-window .ptcg-player-row>span,.ptcg-window .ptcg-player-counts,.ptcg-window .ptcg-player-state{flex-basis:100%;padding-left:0}.ptcg-window .ptcg-player-state:empty{display:none}.ptcg-window .ptcg-player-counts{color:#ccc}.ptcg-window .ptcg-player-row [aria-pressed=true]{background:#0f2c3f;border-color:#20a8b1;color:#ffce00}.ptcg-window .ptcg-body{padding:8px}\r\n@container(max-width:360px){.ptcg-window .ptcg-player-name{max-width:calc(100% - 32px)}.ptcg-window .ptcg-player-activity{margin-left:32px}.ptcg-window .ptcg-grid{grid-template-columns:1fr}.ptcg-window .ptcg-field{gap:4px}.ptcg-window .ptcg-tabs [role=tab]{max-width:150px}}\r\n\r\n.ptcg-follow-control {background:rgba(8,48,78,.96);color:#eee;padding:6px;border:1px solid #20a8b1;max-width:320px;display:flex;flex-wrap:wrap;gap:5px;font:12px Roboto,Arial,sans-serif}.ptcg-follow-control[hidden]{display:none}.ptcg-follow-control button{color:#ffce00;border:1px solid #ffce00;background:transparent;cursor:pointer}.ptcg-portal-row details{width:100%}\r\n\r\n.ptcg-possible-pin .ptcg-region-label{left:14px;transform:translateX(-50%);border-style:dashed;max-width:280px;pointer-events:none}\r\n\r\n.ptcg-possible-pin,.ptcg-possible-pin svg{pointer-events:none}.ptcg-possible-pin path,.ptcg-possible-pin circle{pointer-events:visiblePainted}\r\n\r\n.ptcg-region-break{position:absolute;left:26px;top:32px;width:16px;height:16px;line-height:16px;text-align:center;background:#122232;border:1px dashed #ffd285;border-radius:50%;color:#ffd285;font-weight:bold;pointer-events:none}\r\n\r\n.ptcg-resize{width:28px;min-width:28px;height:28px;min-height:28px;align-items:center;justify-content:center}.ptcg-workspace [data-window-action=resize] svg{width:18px;height:18px;pointer-events:none}\r\n\r\n.ptcg-workspace .ptcg-resize{cursor:nwse-resize}\r\n\r\n.ptcg-faction-badge{display:inline-flex;vertical-align:middle;margin-right:4px;align-items:center}.ptcg-faction-badge svg{width:13px;height:20px;pointer-events:none}.ptcg-crescent{overflow:visible}.ptcg-pin,.ptcg-cluster{pointer-events:none}.ptcg-pin svg,.ptcg-cluster svg{pointer-events:visiblePainted}.ptcg-pin .ptcg-label,.ptcg-cluster .ptcg-group-label{pointer-events:auto}.ptcg-cluster .ptcg-group-label{position:absolute;width:160px;transform:translateX(-50%);white-space:nowrap}.ptcg-possible-pin .ptcg-phone-walk{overflow:visible}\r\n\r\n/* internal.7: internal.5 IITC surfaces plus retained functional controls.\r\n   Fixed geographic anchors; no global screen collision layout or new leaders. */\r\n.ptcg-window .ptcg-field{flex-wrap:wrap}.ptcg-window input[type=datetime-local]{min-width:0;max-width:100%;width:215px}.ptcg-window input[type=range]{width:100%}\r\n.ptcg-player-sections{display:flex;gap:5px;border-bottom:1px solid #20a8b1;padding-bottom:4px;margin-bottom:6px}.ptcg-player-sections [aria-pressed=true]{border-bottom:2px solid #20a8b1;background:#0f2c3f}\r\n.ptcg-model-card{border:1px solid #20a8b1;padding:7px;margin:8px 0;background:#0f2c3f}\r\n.ptcg-history-status{flex-basis:100%;width:100%;min-height:48px;margin:3px 0!important;box-sizing:border-box;border-left:2px solid #20a8b1;padding:4px 7px;background:#0f2c3f}.ptcg-history-status summary{height:36px;min-height:36px;max-height:36px;overflow:hidden;font-size:12px;line-height:16px;overflow-wrap:anywhere}.ptcg-history-status div{padding:5px 0;line-height:1.5;color:#bdd0e0}.ptcg-inference-primary{min-height:20px;color:#eee}\r\n.ptcg-pin,.ptcg-cluster,.ptcg-possible-pin{background:none!important;border:0!important;pointer-events:none}.ptcg-location-pin{display:block;pointer-events:visiblePainted;filter:drop-shadow(0 1px 2px #0008)}.ptcg-cluster:before,.ptcg-person:before{display:none}\r\n.ptcg-event-icon{background:none!important;border:0!important;box-shadow:none!important;pointer-events:none!important;transition:none}.ptcg-event-body{position:relative;display:block;box-sizing:border-box;width:22px;height:22px;border:2px solid;border-radius:50%;background:#0a2130;font:bold 16px/18px system-ui;text-align:center;pointer-events:auto;box-shadow:0 0 3px #000}.ptcg-event-icon.ptcg-capture .ptcg-event-body{background:#443517;box-shadow:0 0 0 1px #ffd96c}.ptcg-event-icon.ptcg-event-focus .ptcg-event-body{box-shadow:0 0 0 5px #ffe46c}\r\n@container(max-width:360px){.ptcg-history-status summary{font-size:11px}.ptcg-window .ptcg-model-card{padding:5px}}\r\n\r\n/* internal.8: observed faction shape only; count and shared IITC label upright. */\r\n.ptcg-faction-controls>.ptcg-faction-presets{display:flex;flex-wrap:wrap;gap:3px;width:100%}.ptcg-faction-controls>.ptcg-field{width:100%;margin:3px 0}.ptcg-faction-controls input[type=range]{flex:1;min-width:80px}.ptcg-faction-controls [aria-pressed=true]{border-bottom:3px solid #20a8b1;background:#0f2c3f}.ptcg-faction-controls small{flex-basis:100%}\r\n.ptcg-pin .ptcg-observed-label,.ptcg-cluster .ptcg-observed-label{width:max-content;bottom:auto;transform:translateX(-50%);text-align:left;pointer-events:auto}\r\n.ptcg-pin .ptcg-solid-pin,.ptcg-cluster .ptcg-solid-pin,.ptcg-solid-pin svg{pointer-events:none}.ptcg-solid-pin path,.ptcg-solid-pin circle,.ptcg-solid-pin text{pointer-events:visiblePainted}\r\n.leaflet-marker-icon.ptcg-pin,.leaflet-marker-icon.ptcg-cluster{pointer-events:none}\r\n\r\n\r\n/* Compact existing IITC primary tabs; retain move/close and geographic marker anchors. */\r\n.ptcg-tabs .ptcg-primary-tab [role=tab]{font-size:12px;padding:4px 3px}.ptcg-primary-tab>.ptcg-tab-move,.ptcg-primary-tab>.ptcg-window-icon{padding:2px;margin:0;width:16px;min-width:16px}.ptcg-primary-tab>.ptcg-window-icon svg{width:12px;height:12px}\r\n.ptcg-event>details>summary .ptcg-compact-event{display:inline-grid;width:calc(100% - 16px);box-sizing:border-box}.ptcg-hover-row details{width:100%}\r\n\r\n/* Individual workspace/container width, without changing unrelated tooltips. */\r\n.ptcg-compact-event{grid-template-columns:minmax(8ch,1fr) minmax(11ch,1.3fr) minmax(0,2fr);width:100%;box-sizing:border-box;align-items:start;gap:5px 8px;min-width:0}\r\n.ptcg-compact-event>*{min-width:0;overflow-wrap:anywhere}.ptcg-compact-event .ptcg-event-kind{display:flex;align-items:baseline;flex-wrap:wrap;gap:3px}.ptcg-event-time{font-variant-numeric:tabular-nums;overflow-wrap:normal}.ptcg-event-kind .ptcg-event-action{white-space:normal;overflow-wrap:normal;text-align:left;margin:0;padding:0;border:0;background:transparent;color:inherit}.ptcg-event-kind .ptcg-event-action:hover{background:transparent;text-decoration:underline}.ptcg-compact-event .ptcg-portal{display:inline;white-space:normal;overflow:visible;overflow-wrap:anywhere}.ptcg-compact-event .ptcg-compact-portal{display:block;white-space:normal;overflow:visible}.ptcg-event-context{overflow-wrap:anywhere}.ptcg-event-context>small,.ptcg-compact-portal>small{display:block}.ptcg-portal-row{display:block}.ptcg-portal-row>summary .ptcg-compact-event{display:inline-grid;width:calc(100% - 18px)}.ptcg-hover-row>.ptcg-compact-event{display:flex;flex-wrap:wrap;border:0}.ptcg-hover .ptcg-event-context{flex-basis:100%}.ptcg-hover .ptcg-compact-event>span+span{border:0;padding:0}\r\n@container (min-width:650px){.ptcg-compact-event{grid-template-columns:minmax(12ch,1.3fr) minmax(18ch,1.5fr) minmax(0,2fr)}}\r\n@container (max-width:360px){.ptcg-compact-event{grid-template-columns:1fr!important}.ptcg-compact-event>span+span{border-left:0;padding-left:0}.ptcg-compact-event .ptcg-event-time{white-space:normal}}\r\n.ptcg-capture-status,.ptcg-map-interval{overflow-wrap:anywhere}.ptcg-link-arrow span{-webkit-text-stroke:.6px #000;text-shadow:1px 0 #000,-1px 0 #000,0 1px #000,0 -1px #000}\r\n\r\n.ptcg-compact-event .ptcg-portal a{display:inline;white-space:normal;overflow:visible;overflow-wrap:anywhere}\r\n";document.head.append(style); }
  async function setup() {
    if (started) return; started = true; loadSettings(); refreshLabelCatalog(); injectStyle();
    activityStore=createTrackerStorage({window,core,name:DB,persist:()=>settings.persist,capacity:()=>({enabled:settings.storageLimits,maxRecords:settings.maxRecords,maxBytes:settings.maxMegabytes*1048576,extraBytes:backtrackArchiveBytes}),saved:(ids,conflicts,cross)=>{for(const id of ids)persisted.add(id);for(const id of conflicts)savedConflicts.add(id);for(const c of cross)model.conflicts.set(c.id,c);messages.storageError=()=>'';messages.storageState=()=>t("storage_transaction_completed");},error:message=>{messages.storageError=()=>i18n.status(message);messages.storageState=()=>t("save_incomplete_data_remains_in_this_page");schedule();},epoch:adoptEpoch});
    coordinator=createTrackerCoordination({window,identity:()=>window.PLAYER?.nickname,generation:()=>dataGeneration,paused:()=>clearing||document.hidden||window.isIdle?.()||!window.map.hasLayer(masterLayer),budget:()=>({enabled:settings.budgetEnabled,burstMs:settings.burstMs,burstPages:settings.burstPages,windowMs:settings.budgetWindowMs,requests:settings.budgetRequests,cooldownMs:settings.budgetCooldownMs}),transport:(p,ok,fail)=>{ownDispatch=true;try{return window.postAjax('getPlexts',p,ok,(xhr,_status,textStatus)=>{const retry=xhr?.getResponseHeader?.('Retry-After'),n=Number(retry);fail({status:xhr?.status||0,cancelled:textStatus==='abort',retryAfterMs:retry?(Number.isFinite(n)?n*1000:Math.max(0,Date.parse(retry)-Date.now())):0});});}finally{ownDispatch=false;}},epoch:async()=>{try{const d=await activityStore.read();await adoptEpoch(d.generation,d.change);}catch(e){messages.storageError=()=>t("tab_clear_status_unconfirmed")+i18n.status(e.message);requestRender();}},change:()=>{if(coordinator&&!coordinator.snapshot().owner.length)flushNative();requestRender();}});
    wm = createTrackerWindows(document, window,{t,migrateSaved:migrateNavigation,captureReading:w=>{if(!w.player)return null;const a=readingAnchor(w.body,'[data-presentation-row]');return a.id?{id:a.id,offset:a.offset,scroll:a.scroll,ids:a.ids}:w.readingAnchor;},onActivate:workspaceActivated,onFocus:workspaceFocused,onHide:workspaceHidden,onClose:workspaceClosed,beforeResize:c=>[...wm?.windows.values()||[]].filter(w=>w.owner===c.id&&!w.node.hidden).map(w=>({node:w.body,anchor:readingAnchor(w.body,'[data-presentation-row]')})).concat(pinnedPortal?.w.owner===c.id?[{node:pinnedPortal.rows,anchor:readingAnchor(pinnedPortal.rows,'[data-portal-event]'),selector:'[data-portal-event]'}]:[]),afterResize:rows=>{for(const r of rows||[])restoreAnchor(r.node,r.anchor,r.selector||'[data-presentation-row]');}});
    let resolvedLocale=i18n.locale();listenDOM(window,'languagechange',()=>{const next=i18n.locale();if(settings.language==='auto'&&next!==resolvedLocale){refreshLocale();}resolvedLocale=next;});
    wm.createContainer('portal',420,460,{title:t("portal_activity"),standalone:true,initialHidden:true});
    const windowGet=wm.windows.get.bind(wm.windows);wm.windows.get=id=>windowGet(legacyPanels[id]?.[0]||id);registerPanes();api.panes=panes;
    clusterLayer=L.layerGroup().addTo(window.map);api.clusterLayer=clusterLayer;
    eventLayer=L.layerGroup().addTo(window.map);inferenceLayer=L.layerGroup().addTo(window.map);api.eventLayer=eventLayer;api.inferenceLayer=inferenceLayer;
    masterLayer=L.layerGroup();let displayPrefs={};try{displayPrefs=JSON.parse(localStorage.getItem('ingress.intelmap.layergroupdisplayed')||'{}')||{};}catch(_){}const masterVisible=Object.hasOwn(displayPrefs,'EchoTrace')?displayPrefs.EchoTrace:displayPrefs['Player Tracker Advanced — khresist — 總開關']!==false;window.layerChooser.addOverlay(masterLayer,'EchoTrace',{default:masterVisible});api.masterLayer=masterLayer;startInferenceWorker();installFollowControl();listenMap('dragstart',pauseFollow);const container=window.map.getContainer();listenDOM(container,'wheel',pauseFollow,{passive:true});listenDOM(container,'dblclick',pauseFollow);listenDOM(container,'touchstart',pauseFollow,{passive:true});listenDOM(container,'click',e=>{if(e.target.closest('.leaflet-control-zoom'))pauseFollow();},true);listenDOM(container,'keydown',e=>{if(['+','-','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))pauseFollow();});
    let prior = {};
    try { prior = JSON.parse(localStorage.getItem('ingress.intelmap.layergroupdisplayed') || '{}') || {}; } catch (_) {}
    const priorVisible = prior['Player Tracker（ChatGPT 優化版）'] !== false;
    for(const role of ['RES','ENL','MACHINA','NIA','OTHER']){
      const label=role==='OTHER'?'未知／其他':({RES:'RES',ENL:'ENL',MACHINA:'Machina',NIA:'NIA'})[role],currentTitle='Player Tracker Advanced — khresist — '+label,legacyTitle='Player Tracker — khresist Edition — '+label;
      const enabled=Object.hasOwn(settings.roleVisibility,role)?settings.roleVisibility[role]:Object.hasOwn(prior,currentTitle)?prior[currentTitle]:Object.hasOwn(prior,legacyTitle)?prior[legacyTitle]:(role==='RES'||role==='ENL')&&priorVisible;
      settings.roleVisibility[role]=!!enabled;const layer=layers[role]=L.layerGroup();if(enabled)layer.addTo(window.map);
    }

    api.layers = layers; api.layer = layers.RES;
    listenMap('layeradd layerremove', e => { if(Object.values(layers).includes(e.layer)||e.layer===masterLayer){const role=Object.keys(layers).find(r=>layers[r]===e.layer);if(role){settings.roleVisibility[role]=window.map.hasLayer(e.layer);saveSettings();}updateAcquisitionPause();if(e.layer===masterLayer&&!window.map.hasLayer(masterLayer)){clearEventFocus();backtrack?.pause('backtrack_reason_layer');capture?.cancel('master-off');clearClusterGraphics();clearEventGraphics();closePortalActivity();clearInferenceGraphics();for(const l of Object.values(layers))l.clearLayers();drawn.clear();}requestRender(true);} });
    listenMap('zoomend moveend', () => { if(backtrack?.snapshot().active&&JSON.stringify(acquisitionTarget().bounds)!==JSON.stringify(backtrack.snapshot().bounds))backtrack.pause('backtrack_reason_area');backgroundInterest();acquisition?.scopeChanged();updateAcquisitionPause();requestRender(true); });
    const toolbox=document.getElementById('toolbox');if(toolbox){const a=el('a','EchoTrace');a.href='#';a.addEventListener('click',e=>{e.preventDefault();openPanel();});toolbox.append(a);cleanup.push(()=>a.remove());}
    hook('publicChatDataAvailable', handle);hook('portalSelected',nativePortalSelected);
    // The native public hook still exists in current CE; no double generic hook or extra request loop.
    hook('search', query => {
      const term = String(query.term || '').replace(/^@/, '').toLowerCase(); if (!term) return;
      for (const name of model.players.keys()) if (name.toLowerCase().includes(term)) {
        const v = sharedView(name, settings.hours); if (!v.last) continue;
        query.addResult({ title: escape(name), description: NAME+' · ' + time(v.last.time) + (v.uncertainLatest ? t("newer_position_unknown") : '') + (v.ambiguous ? t("multiple_simultaneous_positions_285") : ''), position: undefined, onSelected: (_result, e) => { e?.stopPropagation?.(); locate(name); return true; } });
      }
    });
    initAcquisition();initBacktrack();saveSettings();backgroundInterest();for(const id of primaryIds)openPanel(id); wm.restoreTabs(t=>{if(t.player)playerWindow(t.player,t.kind||'reader',true);else if([...primaryIds,...Object.keys(legacyPanels)].includes(t.id))openPanel(t.id);else if(t.kind==='overlap'){try{const names=Array.isArray(t.members)?t.members:JSON.parse(t.id.slice('overlap:'.length));if(Array.isArray(names)&&names.every(n=>typeof n==='string'&&n.trim()))openOverlap('',names);}catch(_){}}}); if(!settings.selectionOwner){for(const c of wm.initialState.containers||[]){const w=wm.get(c.active);if(!c.hidden&&w?.kind==='overlap'&&!w.groupReleased&&JSON.stringify(w.members.map(n=>n.toLowerCase()).sort())===JSON.stringify(settings.overviewSelection.map(n=>n.toLowerCase()).sort())){settings.selectionVersion++;settings.selectionOwner={id:w.id,version:settings.selectionVersion};saveSettings();break;}}}if(!wm.initialState.tabs?.length)openPanel('dashboard');refreshLocale();schedule(true);
    try { await openDatabase(); await restore(); messages.storageState=()=>settings.persist ? t("saved_data_restored") : t("new_activity_stays_in_this_page"); }
    catch (e) { messages.storageError=()=>t("storage_unavailable_data_stays_in_this_page") + i18n.status(e.message); messages.storageState=()=>t("storage_failed"); }
    ready = true;const waiting=buffer;buffer=[];for(const b of waiting)accept(b.events,b.meta);if(dataGeneration===0)seedCache();else messages.cacheWarning=()=>t("cleared_cache_is_not_replayed_awaiting_new_comm");schedule(true);
    // Presentation-only aging; never requests COMM/map data or scans IndexedDB.
    function tick(){if(disposed)return;renderHistorySummary();updateBacktrackUI();coordinator.checkIdentity();api.notifyNativeIdle();flushNative();updateAcquisitionPause();if(liveObservation){for(const name of drawn.keys())dirty.add(name);schedule();syncObservationInputs();}displayTimer=window.setTimeout(tick,1000);}displayTimer=window.setTimeout(tick,1000);
    api.dispose=()=>{clearEventFocus();capture?.dispose();historySession?.reset();backtrack?.dispose();disposed=true;cancelHistoryAction();clearTimeout(displayTimer);clearTimeout(pendingRender);acquisition.dispose();coordinator.dispose();activityStore.dispose();clearEventGraphics();closePortalActivity();if(evidenceRenderer&&window.map.hasLayer(evidenceRenderer))window.map.removeLayer(evidenceRenderer);inferenceWorker?.terminate();for(const f of cleanup.splice(0))f();wm.dispose();window.jQuery?.(document).off('.ptAdvanced');};window.addEventListener('pagehide',()=>api.dispose(),{once:true});
  }
  api.setup = setup;
  setup.info = { ...info, pluginId: 'player-tracker-chatgpt', script: { name: NAME, version: VERSION, description: t("public_comm_player_activity_tracker_standalone_plugin") } };
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  if (window.iitcLoaded) setup();
}


const script = document.createElement('script');
script.textContent = '(' + playerTrackerWrapper.toString() + ')(' + JSON.stringify({}) + ');';
(document.head || document.documentElement).appendChild(script);
script.remove();
})();
