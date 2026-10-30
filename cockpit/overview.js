import * as THREE from './vendor/three.module.js';
import {createCampus} from './campus-world.js';
const host=document.getElementById('campus3d'), detail=document.getElementById('campusDetail');
const bridge=window.cockpitBridge, model=bridge.geometry();
document.getElementById('mapHelp').textContent='按原校园布局搭建的简化三维场景；车辆与下方配送数据同步。点击建筑查看详情，点击厢式车进入驾驶舱。';
const focusButton=document.createElement('button');focusButton.textContent='主楼近景';focusButton.id='focus3d';document.querySelector('.campus-toolbar nav').prepend(focusButton);
const fullButton=document.createElement('button');fullButton.textContent='全屏校园';document.querySelector('.campus-toolbar nav').append(fullButton);fullButton.onclick=()=>host.requestFullscreen?.();
let renderer, visible=true, intersecting=true, drag=null, moved=false, last=0, labelsVisible=false;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e1edf3');scene.fog=new THREE.Fog('#e1edf3',2400,5200);
const camera=new THREE.PerspectiveCamera(38,1,15,7000),target=new THREE.Vector3(0,0,90);
let radius=2100,theta=.18,phi=.72;
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
function pose(){camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);camera.updateMatrixWorld();}
function home(all=true){
 if(!all){target.set(-220,32,-130);theta=.52;phi=1.05;radius=camera.aspect<1.4?1250:850;pose();return;}
 const bounds=campus.buildingRecords;
 const minX=Math.min(...bounds.map(b=>b.x-b.width/2)),maxX=Math.max(...bounds.map(b=>b.x+b.width/2));
 const minZ=Math.min(...bounds.map(b=>b.z-b.depth/2)),maxZ=Math.max(...bounds.map(b=>b.z+b.depth/2));
 target.set((minX+maxX)/2,10,(minZ+maxZ)/2);theta=.58;phi=1.06;
 // Fit the actual landmarks rather than a fixed camera distance or the empty terrain.
 const corners=bounds.flatMap(b=>[-1,1].flatMap(x=>[-1,1].flatMap(z=>[0,b.height].map(y=>new THREE.Vector3(b.x+x*b.width/2,y,b.z+z*b.depth/2)))));
 let lo=400,hi=5000;
 for(let i=0;i<24;i++){radius=(lo+hi)/2;pose();const fits=corners.every(p=>{const v=p.clone().project(camera);return Math.abs(v.x)<.94&&Math.abs(v.y)<.91&&v.z<1;});if(fits)hi=radius;else lo=radius;}
 radius=hi;pose();
}

let campus;
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','可旋转缩放的三维校园地图');
 scene.add(new THREE.HemisphereLight('#f5f8ff','#d5dac5',1.65));
 const sun=new THREE.DirectionalLight('#fffaf2',2.8);sun.position.set(-550,900,350);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-1200,right:1200,top:1100,bottom:-1100,near:10,far:2500});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.5;sun.shadow.bias=-.0001;sun.shadow.intensity=.65;scene.add(sun);
 campus=createCampus(scene,model);bridge.applyVisualSites(campus.buildingRecords);campus.labels.forEach(l=>l.visible=false);document.getElementById('labels3d').setAttribute('aria-pressed','false');
 // Buildings use exactly the same model as the driver's view; proxies are used only for picking.
 const proxies=[];
 for(const b of campus.buildingRecords){const proxy=new THREE.Mesh(new THREE.BoxGeometry(b.width,b.height+8,b.depth),new THREE.MeshBasicMaterial({visible:false}));proxy.position.set(b.x,b.height/2,b.z);proxy.userData.nodeId=b.id;scene.add(proxy);proxies.push(proxy);}
 const carMarkers=new Map();
 for(const v of bridge.overview().vehicles){const group=new THREE.Group();group.userData.vehicleId=v.id;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.4,24),new THREE.MeshBasicMaterial({color:v.type==='van'?'#eba847':'#298faa'}));group.add(mesh);const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#fffffff2';ctx.beginPath();ctx.roundRect(0,0,256,80,15);ctx.fill();ctx.fillStyle='#36576d';ctx.font='600 38px sans-serif';ctx.textAlign='center';ctx.fillText(v.id,128,54);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(32,10,1);sprite.position.y=12;group.add(sprite);group.userData.vehicle=v;scene.add(group);carMarkers.set(v.id,group);}
 let firstSize=true;
 function size(){if(!visible)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(firstSize&&campus){home(false);firstSize=false;}}new ResizeObserver(size).observe(host);size();home(false);
 const observer=new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;});observer.observe(host);
 renderer.setAnimationLoop(now=>{if(!visible||!intersecting||document.hidden||parent.document.getElementById('model')?.inert||now-last<40)return;last=now;const s=bridge.overview();campus.updateCars(s);for(const v of s.vehicles){const g=carMarkers.get(v.id),p=campus.point(v);g.position.set(p.x,.8,p.z);g.userData.vehicle=v;}campus.landscape.update(camera);renderer.render(scene,camera);});
 document.getElementById('campusLoading').hidden=true;
 document.getElementById('home3d').onclick=()=>home(true);
 const defaultButton=document.createElement('button');defaultButton.textContent='默认视角';defaultButton.id='default3d';defaultButton.onclick=()=>home(false);document.querySelector('.campus-toolbar nav').prepend(defaultButton);
 focusButton.onclick=()=>focus('01');
 function focus(id){const b=campus.buildingRecords.find(b=>b.id===id);target.set(b.x,8,b.z);theta=.35;phi=1;radius=430;pose();detail.hidden=true;}
 document.getElementById('labels3d').onclick=e=>{labelsVisible=!labelsVisible;campus.labels.forEach(l=>l.visible=labelsVisible);e.currentTarget.setAttribute('aria-pressed',String(labelsVisible));};
 host.addEventListener('contextmenu',e=>e.preventDefault());
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;drag={x:e.clientX,y:e.clientY,button:e.button};moved=false;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>2)moved=true;if(drag.button===2||e.shiftKey){const scale=radius*.0011;target.x-=Math.cos(theta)*dx*scale;target.z+=Math.sin(theta)*dx*scale;target.x-=Math.sin(theta)*dy*scale;target.z-=Math.cos(theta)*dy*scale;}else{theta-=dx*.004;phi=THREE.MathUtils.clamp(phi-dy*.003,.2,1.3);}drag.x=e.clientX;drag.y=e.clientY;pose();});
 host.addEventListener('pointerup',e=>{if(drag&&!moved&&drag.button===0)pick(e);drag=null;});host.addEventListener('pointercancel',()=>drag=null);
 host.addEventListener('wheel',e=>{e.preventDefault();radius=THREE.MathUtils.clamp(radius*Math.exp(e.deltaY*.001),180,4000);pose();},{passive:false});
 function pick(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...carMarkers.values(),...proxies],true)[0];if(!hit){detail.hidden=true;return;}let object=hit.object;while(object&&!object.userData.nodeId&&!object.userData.vehicleId)object=object.parent;if(!object)return;detail.hidden=false;detail.replaceChildren();const title=document.createElement('strong'),text=document.createElement('span'),close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','关闭地点详情');close.onclick=()=>detail.hidden=true;
 if(object.userData.vehicleId){const v=object.userData.vehicle;title.textContent=v.id+' · '+(v.type==='van'?'厢式配送车':'无人配送车');text.textContent=v.status+' · 电量 '+v.battery.toFixed(0)+'%';detail.append(title,text,close);if(v.type==='van'){const button=document.createElement('button');button.className='enter-car';button.textContent='进入驾驶舱';button.onclick=()=>parent.dispatchEvent(new CustomEvent('cockpit-request',{detail:{id:v.id}}));detail.append(button);}else{text.textContent+=' · 支持自动配送';}}
 else{const n=model.nodes.find(n=>n.id===object.userData.nodeId);title.textContent=n.name;text.textContent=n.model+' · '+n.note;detail.append(title,text,close);const button=document.createElement('button');button.className='enter-car';button.textContent='靠近查看';button.onclick=()=>focus(n.id);detail.append(button);}
 }
 window.__campusQA={scene,camera,campus,renderer,home,view:()=>({theta,phi,radius,target:target.toArray()}),projectNode:id=>{const b=campus.buildingRecords.find(b=>b.id===id);return project(new THREE.Vector3(b.x,b.height,b.z));},projectVehicle:id=>project(carMarkers.get(id).position.clone().add(new THREE.Vector3(0,12,0)))};
 function project(p){p.project(camera);const r=renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
 window.addEventListener('pagehide',()=>{observer.disconnect();renderer.setAnimationLoop(null);const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());gs.forEach(g=>g.dispose());renderer.dispose();});
}catch(e){console.error(e);document.getElementById('campusLoading').textContent='三维画面未能载入，请切换二维图层查看校园。';}
const switcher=document.getElementById('switchMap'),old=document.querySelector('.canvas-wrap'),layers=document.querySelector('.layerbar');
switcher.onclick=()=>{visible=!visible;host.hidden=!visible;focusButton.hidden=!visible;fullButton.hidden=!visible;old.hidden=visible;layers.hidden=visible;document.getElementById('home3d').hidden=!visible;document.getElementById('labels3d').hidden=!visible;switcher.textContent=visible?'查看二维图层':'返回三维校园';};
