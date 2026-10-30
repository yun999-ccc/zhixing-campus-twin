import * as THREE from './vendor/three.module.js';
import { createCampus } from './campus-world.js';
import { createCabin } from './cabin.js';
import { createMirrorViews } from './mirror-views.js';

const $=id=>document.getElementById(id), frame=$('model'), overlay=$('cockpit'), viewport=$('viewport');
let bridge, renderer, scene, camera, campus, cabin, timer, opened=false, previousFocus, mirrors;
let yaw=0,pitch=-.12,lookYaw=0,lookPitch=-.12,bodyYaw=null,previousHeading=null;
let drag=null,lastUi=0,lastTexture=0,lastVehicle=0,noticeTimer,screenTab='map';
const measurements={frames:0,totalRenderMs:0,maxRenderMs:0};
const lookLimit=1.75, pitchMin=-.65, pitchMax=.35;
function notice(text){$('notice').textContent=text;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),2800);}
function deltaAngle(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
function resize(){
  if(!renderer)return;
  const r=viewport.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;
  // Keep the centre screen in view when the preview is opened in a narrow panel.
  camera.fov=camera.aspect<1.3?Math.min(112,THREE.MathUtils.radToDeg(2*Math.atan(1/camera.aspect))):70;
  camera.updateProjectionMatrix();
}
function createScene(){
  scene=new THREE.Scene();scene.background=new THREE.Color('#d7edfa');scene.fog=new THREE.Fog('#d7edfa',600,1900);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  viewport.appendChild(renderer.domElement);
  const hemi=new THREE.HemisphereLight('#f5f8ff','#d5dac5',1.65);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fffaf2',2.8);sun.name='sun';sun.position.set(-110,180,70);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:500});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00015;sun.shadow.normalBias=.08;sun.shadow.intensity=.38;
  scene.add(sun,sun.target);
  campus=createCampus(scene,bridge.geometry());bridge.applyVisualSites(campus.buildingRecords);campus.labels.forEach(label=>label.visible=false);cabin=createCabin();scene.add(cabin.rig);
  camera=new THREE.PerspectiveCamera(70,1,.05,2600);camera.position.set(-.43,1.43,.85);camera.rotation.order='YXZ';cabin.rig.add(camera);
  mirrors=createMirrorViews(renderer,scene,cabin,camera);
  timer=new THREE.Timer();timer.connect(document);resize();
  window.__scene={scene,camera,renderer,campus,cabin,mirrors};
}
function setTab(value){screenTab=value;cabin?.setTab(value);document.querySelectorAll('[data-screen]').forEach(b=>{b.classList.toggle('active',b.dataset.screen===value);b.setAttribute('aria-selected',b.dataset.screen===value);});lastTexture=-Infinity;}
function ui(s){
  $('carLabel').textContent=`${s.id} 主驾驶位`;
  $('driveStage').textContent=s.delivered?'任务已完成':s.stage==='pickup'?'前往取货':s.task?'正在配送':'停靠中';
  $('routeTitle').textContent=s.task?`${s.task.origin} → ${s.task.destination}`:'等待配送任务';
  $('nextRoad').textContent=s.delivered?`已抵达${s.task.destination}，请制动后退出或切换车辆。`:`下一节点：${s.next} · 当前限速 ${s.maxSpeed.toFixed(1)} km/h`;
  $('speedText').innerHTML=`${s.speed.toFixed(1)} <small>km/h</small>`;
  $('dockInfo').textContent=`电量 ${s.battery.toFixed(0)}% · 本车里程 ${s.distance.toFixed(2)} km · 能耗 ${s.energy.toFixed(3)} kWh`;
  $('ownership').textContent=s.manual?'人工控制速度':'系统自动运行';
  $('experienceClock').textContent=s.manual?'人工驾驶 1× · 自动转向':'自动演示 15× · 自动转向';
  $('auto').textContent=s.manual?'恢复自动':'接管速度';
  $('forward').classList.toggle('pressed',s.pedal);
  $('forward').disabled=!s.manual||s.delivered;
  $('brake').disabled=!s.manual;
  const projected=cabin.tabAnchor.getWorldPosition(new THREE.Vector3()).project(camera);
  const r=viewport.getBoundingClientRect();
  $('screenTabs').hidden=projected.z>1||projected.z< -1||Math.abs(projected.x)>1.1||Math.abs(projected.y)>1;
  $('screenTabs').style.left=`${(projected.x+1)*r.width/2}px`;
  $('screenTabs').style.top=`${(-projected.y+1)*r.height/2}px`;
}
function animate(now){
  if(!opened)return;
  timer.update(now);const dt=Math.min(timer.getDelta(),.05);
  bridge.advance(document.hidden?0:dt);const s=bridge.snapshot();if(!s)return;
  const p=campus.point(s);cabin.rig.position.copy(p);
  const target=-s.heading-Math.PI/2;
  if(bodyYaw===null)bodyYaw=target;
  bodyYaw+=deltaAngle(target,bodyYaw)*(1-Math.exp(-dt*14));cabin.rig.rotation.y=bodyYaw;
  yaw+=(lookYaw-yaw)*(1-Math.exp(-dt*18));pitch+=(lookPitch-pitch)*(1-Math.exp(-dt*18));
  camera.rotation.set(pitch,yaw,0,'YXZ');
  if(previousHeading!==null){const turn=deltaAngle(s.heading,previousHeading);cabin.steering.rotation.z=THREE.MathUtils.damp(cabin.steering.rotation.z,THREE.MathUtils.clamp(-turn/Math.max(dt,.001)*.7,-.6,.6),6,dt);}previousHeading=s.heading;
  const sun=scene.getObjectByName('sun');sun.position.set(p.x-110,180,p.z+70);sun.target.position.set(p.x,0,p.z);
  if(now-lastVehicle>75){campus.updateCars(s);lastVehicle=now;}
  if(now-lastTexture>125){cabin.update(s,bridge.canvas());lastTexture=now;}
  campus.landscape.update(camera);
  const begin=performance.now();mirrors.update(now);renderer.render(scene,camera);const duration=performance.now()-begin;
  measurements.frames++;measurements.totalRenderMs+=duration;measurements.maxRenderMs=Math.max(measurements.maxRenderMs,duration);
  if(now-lastUi>80){ui(s);lastUi=now;}
}
async function open(id){
  if(!bridge||!bridge.ready()){alert('校园模型仍在载入，请稍后再试。');return;}
  if(!bridge.enter(id))return;
  previousFocus=document.activeElement;overlay.hidden=false;$('loading').hidden=false;frame.classList.add('model-hidden');frame.inert=true;
  opened=true;bodyYaw=null;previousHeading=null;yaw=lookYaw=0;pitch=lookPitch=-.12;
  try{
    if(!renderer)createScene();else resize();
    setTab('map');timer.reset();timer.update();lastTexture=-Infinity;lastUi=-Infinity;lastVehicle=-Infinity;
    renderer.setAnimationLoop(animate);$('loading').hidden=true;$('exit').focus({preventScroll:true});
    const query=new URLSearchParams(location.search), named=query.get('look');
    if(named==='left')lookYaw=1.2;else if(named==='right')lookYaw=-1.2;
    notice('已坐入左侧驾驶位。按住 W 前进，拖动鼠标观察左右。');
  }catch(error){console.error(error);$('loading').classList.add('failed');$('loading').textContent='当前浏览器未能创建三维画面，可按 Esc 返回原网页。';}
}
function exit(){
  if(!opened)return;bridge.brake();bridge.exit();opened=false;renderer?.setAnimationLoop(null);overlay.hidden=true;frame.inert=false;frame.classList.remove('model-hidden');previousFocus?.focus({preventScroll:true});
}
function brake(){bridge?.brake();$('forward').classList.remove('pressed');}
function release(){bridge?.pedal(false);$('forward').classList.remove('pressed');}
function forward(){if(opened&&bridge.snapshot()?.manual&&!bridge.snapshot()?.delivered){bridge.pedal(true);$('forward').classList.add('pressed');}}
function recenter(){lookYaw=0;lookPitch=-.12;}
document.querySelectorAll('[data-enter]').forEach(b=>{b.disabled=true;b.addEventListener('click',()=>open(b.dataset.enter));});
window.addEventListener('cockpit-request',e=>open(e.detail.id));
$('exit').addEventListener('click',exit);$('centerView').addEventListener('click',recenter);
$('forward').addEventListener('pointerdown',e=>{e.preventDefault();$('forward').setPointerCapture(e.pointerId);forward();});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('forward').addEventListener(type,release));
$('brake').addEventListener('click',()=>{brake();notice('车辆已制动，校园任务时钟继续运行。');});
$('auto').addEventListener('click',()=>{bridge.automatic(bridge.snapshot().manual);release();notice(bridge.snapshot().manual?'已接管速度控制。':'已恢复自动行驶。');});
document.querySelectorAll('[data-screen]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.screen)));
viewport.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,id:e.pointerId};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
viewport.addEventListener('pointermove',e=>{
  if(!drag)return;lookYaw=THREE.MathUtils.clamp(lookYaw-(e.clientX-drag.x)*.0032,-lookLimit,lookLimit);lookPitch=THREE.MathUtils.clamp(lookPitch-(e.clientY-drag.y)*.0025,pitchMin,pitchMax);drag.x=e.clientX;drag.y=e.clientY;
});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>viewport.addEventListener(type,()=>{drag=null;viewport.classList.remove('dragging');}));
viewport.addEventListener('dblclick',recenter);
window.addEventListener('keydown',e=>{
  if(!opened)return;
  if(e.code==='Escape'){e.preventDefault();exit();return;}
  if(e.code==='KeyW'||e.code==='ArrowUp'){e.preventDefault();forward();}
  if(e.code==='Space'){e.preventDefault();brake();}
  if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!e.repeat)notice('车辆转向由系统控制。请拖动鼠标观察左右车窗。');}
  if(e.code==='Tab'){
    const buttons=[...overlay.querySelectorAll('button:not(:disabled)')].filter(b=>b.offsetParent!==null);
    if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
window.addEventListener('keyup',e=>{if(['KeyW','ArrowUp'].includes(e.code))release();});
window.addEventListener('blur',brake);document.addEventListener('visibilitychange',()=>{if(document.hidden)brake();});
window.addEventListener('resize',resize);
function connect(){
  bridge=frame.contentWindow?.cockpitBridge;
  if(!bridge||!bridge.ready()){setTimeout(connect,100);return;}
  document.querySelectorAll('[data-enter]').forEach(b=>b.disabled=false);
  const id=new URLSearchParams(location.search).get('vehicle');if(['E-01','E-02'].includes(id)&&!opened)open(id);
}
frame.addEventListener('load',connect);connect();
window.__cockpitQA={
  snapshot:()=>bridge?.snapshot(),geometry:()=>bridge?.geometry(),
  view:()=>({opened,yaw,pitch,lookYaw,lookPitch,bodyYaw}),
  scene:()=>({buildings:campus?.buildingRecords,treeCount:campus?.treeCount,rendererVersion:THREE.REVISION,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,meanRenderMs:measurements.totalRenderMs/Math.max(1,measurements.frames),frames:measurements.frames}),
  sourceFrame:()=>frame,open,exit,
};
window.addEventListener('pagehide',()=>{
  renderer?.setAnimationLoop(null);timer?.dispose();mirrors?.dispose();
  if(scene){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}
  renderer?.dispose();
});
