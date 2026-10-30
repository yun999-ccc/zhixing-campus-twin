import * as T from './vendor/three.module.js';
import {sourcePalette} from './source-palette.js';
// Shapes follow the original artwork families; dimensions are visual approximations.
export function buildLandmark(n,g,kit){
 const {box,plane,tree}=kit;
 const m=(c,r=.8)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:.05});
 const assets={'01':'main-teaching-large','02':'park-central-water','04':'campus-gymnasium','05R':'administration-center','05B':'dorm-female-1','06':'campus-cafeteria-curved','07':'dorm-male-1','08':'dorm-male-2','09':'basketball-pavilion','10':'park-south-rain','11':'park-south-pocket','12':'dorm-male-3','13':'market-timber-glass','14':'teaching-silver','15':'teaching-silver','16':'teaching-timber','17':'teaching-timber','18':'engineering-lab','19':'engineering-lab','20':'engineering-lab','21':'engineering-lab','22':'park-north-learning','23':'football-mini-stadium','24':'information-fins','25':'volleyball-pavilion'};
 const palette=sourcePalette[assets[n.id]]||{};
 // Local zones are separate; a whole-asset average would mix vegetation into walls.
 const white=m('#e8e5df'),stone=m(palette.neutral||'#c9c2ba'),blue=m(palette.blue||'#6d8394'),glass=m(n.id==='01'?'#a5b2ad':palette.blue||'#7fa3b8',.26),brick=m(palette['wood-brick']||'#c47452'),wood=m(['16','17','13'].includes(n.id)?'#c28a4c':palette['wood-brick']||'#ad825a'),silver=m('#b5c8db',.4),green=m('#7e9b36'),paving=m('#d0c9be');
 // Independent surface fields: no albedo is reused as height or roughness.
 const relief=document.createElement('canvas');relief.width=relief.height=1024;
 const rc=relief.getContext('2d');rc.fillStyle='#868686';rc.fillRect(0,0,1024,1024);rc.strokeStyle='#777777';rc.lineWidth=2;
 for(let y=0;y<1024;y+=64){rc.beginPath();rc.moveTo(0,y);rc.lineTo(1024,y);rc.stroke();for(let x=(y/64%2)*64;x<1024;x+=128){rc.beginPath();rc.moveTo(x,y);rc.lineTo(x,y+64);rc.stroke();}}
 const bump=new T.CanvasTexture(relief);bump.wrapS=bump.wrapT=T.RepeatWrapping;
 for(const material of[white,stone,brick]){material.bumpMap=bump;material.bumpScale=.08;}
 const roofGlass=new T.MeshStandardMaterial({color:'#93bce0',roughness:.24,metalness:.08,transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide});

 const profile={ '01':[206,110,79],'02':[158,144,12],'04':[200,128,45],'05R':[150,86,52],'05B':[158,104,70],'06':[204,124,48],'07':[174,66,63],'08':[168,98,65],'09':[184,118,47],'10':[128,84,12],'11':[118,102,12],'12':[154,110,70],'13':[148,86,29],'14':[104,72,86],'15':[104,72,86],'16':[135,72,34],'17':[135,72,34],'18':[140,106,65],'19':[140,106,65],'20':[140,106,65],'21':[140,106,65],'22':[142,124,10],'23':[244,146,30],'24':[120,86,54],'25':[165,105,35] };
 const [w,d,h]=profile[n.id];
 const source=new T.TextureLoader().load(new URL('../assets/buildings/'+assets[n.id]+'.webp',import.meta.url).href,()=>window.review?.render());source.colorSpace=T.SRGBColorSpace;
 function artworkPanel(x,y,z,a,b,uv,side=false){
  const vertices=side?[0,0,a/2,0,0,-a/2,0,b,-a/2,0,b,a/2]:[-a/2,0,0,a/2,0,0,a/2,b,0,-a/2,b,0];
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex([0,1,2,0,2,3]);geo.setAttribute('uv',new T.Float32BufferAttribute(uv.flatMap(([u,v])=>[u,1-v]),2));geo.computeVertexNormals();
  const material=new T.MeshBasicMaterial({map:source,alphaTest:.8,toneMapped:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);g.add(mesh);
 }

 const B=(x,y,z,a,b,c,ma=white)=>box(g,x,y,z,a,b,c,ma);
 const P=(x,z,a,b,ma=paving,y=.16)=>plane(g,x,z,a,b,ma,y);
 function cylinder(x,y,z,r,height,ma,segments=40){const o=new T.Mesh(new T.CylinderGeometry(r,r,height,segments),ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
 function ring(x,z,inner,outer,ma,y=.2,arc=Math.PI*2){const o=new T.Mesh(new T.RingGeometry(inner,outer,64,1,.4,arc),ma);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;g.add(o);return o;}
 function beam(a,b,r,ma=white){const aV=new T.Vector3(...a),bV=new T.Vector3(...b),v=bV.clone().sub(aV);const o=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),6),ma);o.position.copy(aV).add(bV).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());o.castShadow=true;g.add(o);}
 function shrub(x,z,a=8,b=5){B(x,1.8,z,a,3,b,green);}
 function trees(x,z,scale=2.2,color){const v=new T.Vector3(x,0,z).applyMatrix4(g.matrixWorld);tree(v.x,v.z,scale,color);}
 function block(x,z,a,b,height,ma=white){B(x,height/2,z,a,height,b,ma);B(x,height+.6,z,a+1.5,1.2,b+1.5,white);for(let y=6;y<height-1;y+=(['05B','07','08','12'].includes(n.id)?10:8)){B(x,y,z+b/2+.12,a-6,3.8,.22,glass);B(x,y,z-b/2-.12,a-6,3.8,.22,glass);for(let xx=x-a/2+4;xx<x+a/2;xx+=7)for(const side of[-1,1])B(xx,y,z+side*(b/2+.3),.6,5,.7,white);for(const side of[-1,1]){B(x+side*(a/2+.15),y,z,.24,3.8,b-5,glass);for(let zz=z-b/2+4;zz<z+b/2;zz+=7)B(x+side*(a/2+.3),y,zz,.65,5,.6,white);}}B(x,2,z+b/2+1,9,4,.3,glass);B(x,height+2,z-b*.18,a*.22,3,b*.3,silver);}
 function steps(x,z,a){for(let j=0;j<4;j++)B(x,.3+j*.55,z-j*1.6,a,.6+j*1.1,2,paving);}
 function pergola(x,z,a=30,b=20){for(const sx of[-1,1])for(const sz of[-1,1])B(x+sx*a/2,5,z+sz*b/2,1,10,1,wood);for(let xx=x-a/2-2;xx<=x+a/2+2;xx+=3)B(xx,10.4,z,1,1,b+6,wood);}
 function roofArch(a,b,base,open=false){
  const rise=a*.14;
  const shape=new T.Shape();shape.moveTo(-a/2,0);shape.quadraticCurveTo(0,rise*2,a/2,0);shape.lineTo(a/2,-.8);shape.quadraticCurveTo(0,rise*2-.9,-a/2,-.8);shape.closePath();
  const shell=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:b,bevelEnabled:false,curveSegments:24}),open?roofGlass:silver);shell.position.set(0,base,-b/2);shell.castShadow=true;g.add(shell);
  for(let z=-b/2;z<=b/2+.1;z+=b/5){const points=[];for(let i=0;i<=24;i++){let t=i/24;points.push(new T.Vector3(-a/2+t*a,base+4*rise*t*(1-t)+.4,z));}const rib=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.65,6,false),white);g.add(rib);for(const side of[-1,1]){beam([side*a/2,0,z],[side*a/2,base*.63,z],1.1,white);beam([side*a/2,base*.63,z],[side*a*.36,base+rise*.48,z],.9,white);beam([side*a/2,base*.63,z],[side*a/2,base,z+b*.08],.9,white);}}
 }
 function court(kind){const c=document.createElement('canvas');c.width=1024;c.height=640;const x=c.getContext('2d');x.fillStyle=kind==='football'?'#568a54':'#258dc1';x.fillRect(0,0,1024,640);x.strokeStyle='#e9f4eb';x.lineWidth=4;x.strokeRect(35,35,954,570);x.beginPath();x.moveTo(512,35);x.lineTo(512,605);x.stroke();if(kind==='basketball'){for(const side of[0,1]){const xx=side?870:154;x.fillStyle='#65bdad';x.fillRect(side?830:35,198,159,244);x.strokeRect(side?830:35,198,159,244);x.beginPath();x.arc(xx,320,90,-Math.PI/2,Math.PI/2,!!side);x.stroke();x.beginPath();x.arc(side?950:74,320,240,-Math.PI/2,Math.PI/2,!!side);x.stroke();}}else if(kind==='football'){for(const side of[0,1])x.strokeRect(side?839:35,155,150,330);}else {x.fillStyle='#65b9a8';x.fillRect(270,40,484,560);x.strokeRect(270,40,484,560);x.beginPath();x.moveTo(270,320);x.lineTo(754,320);x.stroke();}x.beginPath();x.arc(512,320,kind==='volleyball'?0:68,0,Math.PI*2);x.stroke();const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;P(0,0,w,d,new T.MeshStandardMaterial({map:tex,roughness:1}),.3);}
 if(n.type!=='park'){P(0,0,w+16,d+16,green,.05);P(0,0,w+6,d+6,paving,.12);}
 if(n.type==='park'){
  // Four distinct gardens: fountain, amphitheatre, rain garden and pocket garden.
  const outline=new T.Mesh(new T.CylinderGeometry(w*.5,w*.5,1,64),green);outline.scale.z=d/w;outline.position.y=.3;outline.receiveShadow=true;g.add(outline);
 const edge=new T.Mesh(new T.TorusGeometry(w*.49,1.3,6,64),stone);edge.rotation.x=Math.PI/2;edge.scale.y=d/w;edge.position.y=.9;g.add(edge);
  if(n.id==='02'){cylinder(0,.4,0,61,.5,paving);cylinder(0,.8,0,42,.6,m('#6fb0be',.3));ring(0,0,42,45,white,1.2);ring(0,0,49,54,green,.8);cylinder(0,3,0,4,5,stone);cylinder(0,5,0,12,1,stone);for(let i=0;i<5;i++)cylinder(0,6+i*2,0,1.4-i*.2,2,m('#bde4ec',.2));for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5])P(Math.cos(a)*51,Math.sin(a)*51,12,36,paving,.9);}
  if(n.id==='22'){cylinder(0,.6,0,49,.8,paving);for(let j=0;j<3;j++)ring(0,0,35+j*4,39+j*4,m('#ba9576'),1.3+j*1.2,Math.PI*1.6);cylinder(0,.9,0,33,.4,green);pergola(26,-44,42,18);steps(0,57,20);}
  if(n.id==='10'){const pond=cylinder(0,.6,0,25,.5,m('#659ea4',.3));pond.scale.set(2,1,.65);for(const side of[-1,1]){P(0,side*29,107,7,paving,.5);for(let i=0;i<9;i++)shrub(-48+i*12,side*20,7,6);}B(0,2,0,15,1,40,wood);for(const sx of[-1,1])for(let z=-20;z<21;z+=8)B(sx*8,3,z,.7,3,.7,wood);}
  if(n.id==='11'){ring(0,0,19,39,paving,.6);cylinder(0,1,0,18,1,stone);trees(0,0,4,'#e3a6b3');pergola(30,-32,30,18);}
  const flowerColors=['#e5d8d1','#d5bc57','#e3a6b3'];
  for(let i=0;i<36;i++){const a=i*Math.PI/18,r=w*.44;const x=Math.cos(a)*r,z=Math.sin(a)*r*d/w;const flower=new T.Mesh(new T.IcosahedronGeometry(1.2,0),m(flowerColors[i%3]));flower.position.set(x,2,z);g.add(flower);}
  for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*(w/2-9),z=Math.sin(a)*(d/2-9);trees(x,z,2.6,n.id==='22'&&i%3===0?'#e3a6b3':'#779638');shrub(x,z,9,8);if(i%3===0)B(x,2,z-6,12,1.2,3,wood);}
  return {width:w,depth:d,height:20,family:n.id==='02'?'fountain-park':n.id==='22'?'amphitheatre-garden':n.id==='10'?'rain-garden':'cherry-pocket-park'};
 }
 if(['09','23','25'].includes(n.id)){
  court(n.id==='09'?'basketball':n.id==='23'?'football':'volleyball');
  if(n.id==='09'){roofArch(w,d,31,true);for(let j=0;j<3;j++)B(0,1+j*1.8,-d/2-5-j*3,w*.85,1.8,3,wood);for(const side of[-1,1]){B(side*w*.42,6,0,1,12,1,blue);B(side*w*.4,12,0,3,.7,10,white);B(side*w*.4,13,0,.5,7,11,white);}}
  else if(n.id==='25'){for(let j=0;j<3;j++){const shape=new T.BufferGeometry();const z=-d/2+j*d/3;shape.setAttribute('position',new T.Float32BufferAttribute([-w/2,26,z,w/2,26,z,w/2,26,z+d/3,-w/2,26,z,-w/2,26,z+d/3,w/2,26,z+d/3,0,38,z+d/6,-w/2,26,z,w/2,26,z],3));shape.computeVertexNormals();const roof=new T.Mesh(shape,new T.MeshStandardMaterial({color:'#d5e3ec',side:T.DoubleSide,roughness:.5}));g.add(roof);for(const side of[-1,1]){beam([side*w/2,26,z],[0,38,z+d/6],.8);beam([side*w/2,26,z+d/3],[0,38,z+d/6],.8);beam([side*w/2,0,z+d/6],[side*w/2,26,z],1);}}B(0,3,0,w*.8,6,.3,white);}
  else{for(let j=0;j<5;j++)B(0,1+j*2,-d/2-5-j*3,w,2,3,j%2?blue:white);B(0,18,-d/2-10,w+4,1,25,silver);for(const side of[-1,1]){beam([side*w*.46,0,-d/2-20],[side*w*.46,18,-d/2],1);for(const z of[-d*.35,d*.35])B(side*w*.48,5,z,1,10,1,white);B(side*w*.48,7,0,2,1,25,white);}}
  for(const side of[-1,1])for(let x=-w/2;x<=w/2;x+=14)B(x,3,side*(d/2+2),.5,6,.5,blue);
  return {width:w,depth:d+30,height:h,family:n.id==='09'?'arched-basketball':n.id==='25'?'folded-volleyball':'football-stands'};
 }
 if(n.id==='01'){block(-w*.34,0,w*.3,d,h);block(w*.34,0,w*.3,d,h);const atriumGlass=m('#a5b7b5',.22);atriumGlass.transparent=true;atriumGlass.opacity=.38;atriumGlass.depthWrite=false;
 B(0,h*.47,0,w*.34,h*.92,d*.8,atriumGlass);
 const interior=m('#d9b779');interior.emissive.set('#8d6b31');interior.emissiveIntensity=.16;
 B(0,h*.46,-d*.36,w*.32,h*.88,.5,interior);
 for(let y=7;y<h-2;y+=9)B(0,y,0,w*.32,.7,d*.73,white);
for(let y=7;y<h;y+=9)B(0,y,d*.41,w*.35,.7,1,white);for(let x=-w*.17;x<=w*.17;x+=9)B(x,h*.47,d*.41,.8,h*.92,1,white);for(const side of[-1,1]){B(side*w*.34,h+2,-d*.15,w*.27,3,d*.3,white);B(side*w*.34,h+3,d*.36,w*.27,2,4,green);}for(const side of[-1,1])for(const fraction of[.2,.45])B(side*w*fraction,h*.49,d/2+1,3,h*.96,2,wood);B(0,h+5,0,w*.31,10,d*.75,glass);for(const side of[-1,1]){B(side*w*.19,h*.51,d*.43,5,h*1.02,4,white);B(side*w*.45,h*.51,d*.48,4,h*1.02,3,white);}B(0,h+10,0,w*.34,1,d*.78,silver);B(0,11,d*.51,w*.43,2,25,silver);for(const side of[-1,1])B(side*w*.19,5,d*.58,1,10,1,white);steps(0,d/2+12,w*.5);
 artworkPanel(-w*.34,1,d/2+1.3,w*.3,h-2,[[.05,.70],[.31,.79],[.31,.19],[.05,.12]]);
 artworkPanel(w*.34,1,d/2+1.3,w*.3,h-2,[[.66,.77],[.91,.84],[.91,.31],[.66,.23]]);
 artworkPanel(w*.49,1,0,d,h-2,[[.66,.77],[.91,.84],[.91,.31],[.66,.23]],true);
 artworkPanel(0,0,d*.405+.3,w*.33,h*.92,[[.37,.76],[.58,.72],[.58,.16],[.37,.20]]);
 }
 else if(n.id==='04'||n.id==='06'){block(0,0,w,d,h*.68,brick);B(0,h*.38,d/2+.5,w*.45,h*.6,1,glass);for(let x=-w/2+3;x<w/2;x+=14)B(x,h*.35,d/2+1,2,h*.7,2,white);roofArch(w,d,h*.69);B(0,9,d/2+5,38,1.2,16,glass);steps(0,d/2+13,45);}
 else if(n.id==='05B'||n.id==='08'||n.id==='12'){
  const ma=n.id==='05B'?white:n.id==='08'?stone:brick;
  if(n.id==='05B')for(const side of[-1,1])B(side*w*.44,h*.5,d*.1,w*.06,h,d*.9,blue);
  if(n.id==='08'){
   block(-w*.35,0,w*.25,d,h,ma);block(w*.1,-d*.34,w*.75,d*.3,h,ma);
  }else if(n.id==='12'){
   for(const side of[-1,1])for(let j=0;j<3;j++){
    const hh=h*(1-j*.19),z=-d*.33+j*d*.33;
    block(side*w*.35,z,w*.25,d*.34,hh,ma);B(side*w*.35,hh+2,z,w*.2,2,d*.26,green);
   }block(0,-d*.36,w*.5,d*.27,h,ma);
  }else{block(-w*.35,0,w*.25,d,h,ma);block(w*.35,0,w*.25,d,h,ma);block(0,-d*.36,w*.5,d*.27,h,ma);}
  P(0,d*.1,w*.43,d*.65,green,.3);P(0,d*.25,12,d*.5,paving,.4);
  B(0,8,d*.06,w*.24,1.2,18,white);for(const side of[-1,1])B(side*w*.1,4,d*.11,1.3,8,1.3,white);
 }else if(n.id==='07'){block(0,0,w,d,h,brick);for(const x of[-w*.46,0,w*.46])B(x,h*.52,d/2+1,10,h*1.04,3,brick);for(const x of[-w*.46,-w*.23,w*.23,w*.46])B(x,h*.5,d/2+2,2,h,2,white);B(0,6,d/2+2,13,12,3,stone);B(0,4,d/2+4,7,8,.6,glass);steps(0,d/2+10,25);}
 else if(['18','19','20','21'].includes(n.id)){block(-w*.32,0,w*.3,d*.8,h*.7,blue);block(w*.3,-d*.25,w*.3,d*.5,h,blue);block(w*.3,d*.3,w*.35,d*.4,h*.5,blue);B(-w*.02,h*.4,0,w*.32,h*.8,d*.55,glass);for(let y=8;y<h*.8;y+=8)B(0,y,d*.28,w*.3,1,1,white);B(w*.12,h*.48,0,w*.4,2,8,m('#e4b941'));
  for(const side of[-1,1]){beam([-w*.18,h*.8,side*d*.28],[-w*.02,h*.95,side*d*.28],.7,white);beam([w*.14,h*.8,side*d*.28],[-w*.02,h*.95,side*d*.28],.7,white);}
  for(let z=-d*.25;z<=d*.25;z+=8)beam([-w*.18,h*.8,z],[-w*.02,h*.95,z],.6,white);
  for(const side of[-1,1])beam([-w*.02,h*.48,side*4],[w*.28,h*.55,side*4],.8,m('#e4b941'));
 }

 else if(n.id==='14'||n.id==='15'){
  for(let j=0;j<3;j++){
   const x=j%2?7:-5,z=j%2?-3:4,y=j*25;
   B(x,y+11,z,w*.9,22,d*.86,glass);B(x,y+23,z,w*.98,3,d*.94,white);
   B(x-w*.39,y+11,z,7,22,d*.87,white);
   for(let xx=-w*.33;xx<w*.42;xx+=13)B(x+xx,y+11,z+d*.435,1.1,22,1.5,white);
   for(const zz of[-1,1])for(let k=0;k<3;k++)B(x-w*.3+k*3,y+12,z+zz*d*.44,1.5,18,1.7,brick);
  }
  B(5,80,-8,w*.56,9,d*.53,white);B(5,85,-8,w*.58,1,d*.55,silver);B(0,8,d*.5,38,1.2,18,white);for(const x of[-16,16])B(x,4,d*.54,1.3,8,1.3,white);steps(0,d/2+10,35);
 }
 else if(n.id==='16'||n.id==='17'){
  B(0,8,0,w*.94,16,d*.9,glass);B(0,17,0,w,2,d,white);
  B(0,26,0,w,17,d,wood);B(0,35,0,w+3,2,d+3,white);
  for(let x=-w*.42;x<=w*.42;x+=16){B(x,26,d/2+.2,8,12,.7,glass);B(x-6,26,d/2+1,1.5,18,2.3,wood);}
  for(const side of[-1,1])B(side*w*.47,8,d*.46,2,16,2,wood);
 }
 else if(n.id==='13'){block(0,0,w,d,22,glass);for(let x=-w/2;x<=w/2;x+=20){B(x,13,d/2+2,3,26,3,wood);beam([x,15,d/2+2],[x+10,25,d/2+2],1.2,wood);}B(0,27,0,w+8,3,d+8,wood);B(0,29,0,w*.75,2,d*.25,glass);
  for(let x=-w/2+10;x<w/2-10;x+=28){const pts=[new T.Vector3(x-12,15,d/2+3),new T.Vector3(x-8,23,d/2+3),new T.Vector3(x,26,d/2+3),new T.Vector3(x+8,23,d/2+3),new T.Vector3(x+12,15,d/2+3)];g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,1.3,5,false),wood));}
  for(const side of[-1,1])B(0,29,side*d*.32,w*.85,2,9,green);
 }

 else if(n.id==='24'){
  function roundedShell(a,b,r,height,base,material){const shape=new T.Shape();shape.moveTo(-a/2+r,-b/2);shape.lineTo(a/2-r,-b/2);shape.quadraticCurveTo(a/2,-b/2,a/2,-b/2+r);shape.lineTo(a/2,b/2-r);shape.quadraticCurveTo(a/2,b/2,a/2-r,b/2);shape.lineTo(-a/2+r,b/2);shape.quadraticCurveTo(-a/2,b/2,-a/2,b/2-r);shape.lineTo(-a/2,-b/2+r);shape.quadraticCurveTo(-a/2,-b/2,-a/2+r,-b/2);const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:8}),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=base;mesh.castShadow=true;g.add(mesh);}
  roundedShell(w,d,12,h,0,glass);roundedShell(w+3,d+3,13,2,h,white);roundedShell(w*.8,d*.75,10,1,h+2,green);
  for(let x=-w/2+10;x<=w/2-10;x+=6)B(x,h/2,d/2+.8,1.8,h,3,white);
  for(const side of[-1,1])for(let z=-d/2+10;z<=d/2-10;z+=6)B(side*(w/2+.8),h/2,z,3,h,1.8,white);
  for(let y=12;y<h;y+=12)B(0,y,d/2+.3,w*.95,1,1,white);steps(0,d/2+9,36);
 }
 else{
  block(-w*.32,0,w*.35,d,h*.85,brick);block(w*.32,0,w*.35,d,h*.85,brick);block(0,0,w*.29,d*.83,h*1.08,stone);B(0,h*.52,d*.42,w*.2,h*.9,1,glass);
  for(const side of[-1,1])B(side*w*.17,h*.54,d*.44,4,h*1.08,5,stone);
  const roofShape=new T.ConeGeometry(w*.22,12,4);const roofMesh=new T.Mesh(roofShape,m('#63727c'));roofMesh.rotation.y=Math.PI/4;roofMesh.position.set(0,h*1.08+6,0);roofMesh.scale.z=d/w;g.add(roofMesh);
  B(0,13,d/2+8,w*.43,2,22,stone);for(const side of[-1,1])B(side*w*.18,6,d/2+12,3,12,3,stone);steps(0,d/2+20,w*.44);
 }
 for(const side of[-1,1])for(let i=0;i<4;i++){const x=-w*.4+i*w*.26;shrub(x,side*(d/2+5),14,5);if(i%2===0)trees(x,side*(d/2+12),2.5);}
 return {width:w,depth:d+22,height:h+12,family:n.id==='01'?'atrium-main':n.id==='04'?'arched-gym':n.id==='06'?'arched-cafeteria':n.model};
}
