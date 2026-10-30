// Deterministic geometry checks in metres, independent of Three.js rendering.
export function segmentHitsRect(a,b,r,padding=0){
 let lo=0,hi=1;
 for(const [u,v,min,max] of [[a.x,b.x,r.x-r.width/2-padding,r.x+r.width/2+padding],[a.z,b.z,r.z-r.depth/2-padding,r.z+r.depth/2+padding]]){
  if(Math.abs(v-u)<1e-9){if(u<min||u>max)return false;}
  else{const t1=(min-u)/(v-u),t2=(max-u)/(v-u);lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}
 }return true;
}
export function roadIntersections(rect,roads,padding=0){return roads.filter(r=>r.points.some((p,i)=>i>0&&segmentHitsRect(r.points[i-1],p,rect,padding))).map(r=>r.a+'-'+r.b);}
export function fitSite(rect,roads,padding=6.5){
 if(!roadIntersections(rect,roads,padding).length)return 1;
 let lo=0,hi=1;for(let i=0;i<24;i++){const s=(lo+hi)/2;if(roadIntersections({...rect,width:rect.width*s,depth:rect.depth*s},roads,padding).length)hi=s;else lo=s;}return Math.max(.01,lo*.98);
}
export function pointSegmentDistance(p,a,b){const x=b.x-a.x,z=b.z-a.z,l=x*x+z*z,t=l?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/l)):0;return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);}
export function roadDistance(p,roads){return Math.min(...roads.flatMap(r=>r.points.slice(1).map((q,i)=>pointSegmentDistance(p,r.points[i],q))));}
export function rectsOverlap(a,b,margin=0){return Math.abs(a.x-b.x)<(a.width+b.width)/2+margin&&Math.abs(a.z-b.z)<(a.depth+b.depth)/2+margin;}
export function planSites(source,roads){
 const plan=source.map(b=>({...b,originalX:b.x,originalZ:b.z,sourceWidth:b.width,sourceDepth:b.depth,sourceHeight:b.height,scale:1,shift:0}));
 const needs=plan.filter(b=>b.type!=='park'&&roadIntersections(b,roads,6.5).length).sort((a,b)=>b.width*b.depth-a.width*a.depth);
 for(const site of needs){let best=null;
  for(const scale of[1,.95,.9,.85,.8])for(let radius=0;radius<=176;radius+=8){const count=Math.max(1,Math.ceil(radius*Math.PI/4));for(let i=0;i<count;i++){
   const angle=i/count*Math.PI*2,candidate={...site,x:site.originalX+Math.cos(angle)*radius,z:site.originalZ+Math.sin(angle)*radius,width:site.sourceWidth*scale,depth:site.sourceDepth*scale,height:site.sourceHeight*scale};
   const cost=radius+(1-scale)*220;if(best&&cost>=best.cost)continue;
   if(roadIntersections(candidate,roads,6.5).length)continue;
   if(plan.some(other=>other.id!==site.id&&rectsOverlap(candidate,other,3)))continue;
   best={...candidate,scale,shift:radius,cost};
  }}
  if(best)Object.assign(site,best);else site.unresolved=true;
 }
 return plan;
}
