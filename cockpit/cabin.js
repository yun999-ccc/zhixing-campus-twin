import * as THREE from './vendor/three.module.js';

export function createCabin() {
  const rig=new THREE.Group();rig.name='left-driver-cabin';const mirrorSurfaces=[];
  const matte=color=>new THREE.MeshStandardMaterial({color,roughness:.67,metalness:.04});
  const ivory=matte('#343b41'), pale=matte('#242c32'), trim=matte('#151b20'), silver=new THREE.MeshStandardMaterial({color:'#a7b3bd',roughness:.3,metalness:.72}), leather=matte('#15191e');
  ivory.name='charcoal-door-and-seat';pale.name='graphite-dashboard';leather.name='black-steering-leather';silver.name='brushed-metal-trim';
  const screenIvory=matte('#eeefeb'),screenSilver=matte('#c0ccd0');
  // Deterministic microscopic leather relief; albedo and bump are independent.
  const grain=document.createElement('canvas');grain.width=grain.height=512;const gc=grain.getContext('2d');gc.fillStyle='#808080';gc.fillRect(0,0,512,512);
  let seed=74821;for(let i=0;i<30000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%512;seed=(Math.imul(seed,1664525)+1013904223)>>>0;gc.fillStyle=(seed&1)?'#999999':'#666666';gc.fillRect(x,(seed>>>8)%512,1,1);}
  const leatherBump=new THREE.CanvasTexture(grain);leatherBump.wrapS=leatherBump.wrapT=THREE.RepeatWrapping;leather.bumpMap=leatherBump;leather.bumpScale=.00065;leather.roughness=.83;ivory.bumpMap=leatherBump;ivory.bumpScale=.0004;
  const headliner=matte('#8c9396'),stitch=matte('#89969f');

  const panel=matte('#313a42'), wood=matte('#66564b');
  function rounded(w,h,d,r=.035){
    const shape=new THREE.Shape(),x=-w/2,y=-h/2;
    shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:6});geometry.translate(0,0,-d/2);return geometry;
  }
  function box(parent,x,y,z,w,h,d,material=ivory,r=.025){
    const mesh=new THREE.Mesh(rounded(w,h,d,r),material);mesh.position.set(x,y,z);parent.add(mesh);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  function beam(a,b,r,material=ivory){
    const vector=b.clone().sub(a), mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,vector.length(),10),material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());rig.add(mesh);return mesh;
  }
  // Pale headliner and door cards define real window openings rather than an image overlay.
  box(rig,0,2.14,.45,2.42,.09,3.2,headliner,.06);
  box(rig,0,.24,.25,2.23,.08,3.3,trim,.04);
  for(const side of [-1,1]){
    box(rig,side*1.12,.69,.15,.1,.76,2.7,ivory,.025);
    box(rig,side*1.05,.94,.22,.12,.085,2.3,pale,.022);
    box(rig,side*1.045,.77,.3,.12,.10,.76,ivory,.025);
    box(rig,side*1.04,1.02,.3,.05,.025,.27,silver,.009);
    beam(new THREE.Vector3(side*1.13,1.02,-1.25),new THREE.Vector3(side*.99,2.10,-.94),.055,pale);
    beam(new THREE.Vector3(side*1.13,1.03,1.05),new THREE.Vector3(side*1.06,2.10,1.05),.06,pale);
    box(rig,side*1.06,2.04,.2,.09,.06,2.4,pale,.02);
    const mirror=box(rig,side*1.28,1.12,-.98,.3,.2,.1,ivory,.05);
    const face=box(mirror,0,0,.058,.25,.145,.008,new THREE.MeshBasicMaterial({color:'#d9e7ee',toneMapped:false}),.025);face.name=side<0?'left-exterior-mirror':'right-exterior-mirror';mirrorSurfaces.push(face);
  }
  beam(new THREE.Vector3(-.99,2.10,-.94),new THREE.Vector3(.99,2.10,-.94),.045,ivory);
  box(rig,0,1.02,-1.15,2.22,.17,.58,pale,.06);
  box(rig,0,.9,-.92,2.18,.27,.45,ivory,.06);
  box(rig,0,.52,-1.24,2.19,.51,.08,panel,.015);
  for(const x of[-.58,-.36]){const pedal=box(rig,x,.32,-.93,.11,.025,.18,trim,.009);pedal.rotation.x=-.35;}
  box(rig,0,1.08,-.87,2.16,.035,.17,wood,.012);
  box(rig,0,1.125,-1.32,2.18,.025,.025,trim,.009);
  // Shallow air vents span the facia, with individually visible slats.
  for(const x of [-.78,-.65,.25,.37,.49,.61,.73])box(rig,x,1.02,-.68,.09,.035,.02,trim,.005);
  box(rig,0,.55,-.1,.25,.52,1.25,ivory,.04);
  box(rig,0,.83,.22,.23,.025,.65,pale,.02);
  const cup=new THREE.Mesh(new THREE.TorusGeometry(.052,.009,8,24),silver);cup.rotation.x=Math.PI/2;cup.position.set(.02,.85,.35);rig.add(cup);
  // A light passenger seat is visible when the driver looks to the right.
  box(rig,.62,.53,.78,.54,.15,.62,ivory,.09);
  const back=box(rig,.62,.98,1.02,.55,.83,.17,ivory,.09);back.rotation.x=.13;
  box(rig,.62,1.51,1.05,.30,.22,.15,ivory,.055);
  const steering=new THREE.Group();steering.position.set(-.43,1.00,-.27);steering.rotation.x=-.12;rig.add(steering);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.232,.026,12,64),leather);steering.add(rim);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(.209,.003,8,64),stitch);inner.position.z=.006;steering.add(inner);
  box(steering,0,-.006,.015,.19,.13,.065,pale,.045);
  for(const side of [-1,1]){
    const spoke=box(steering,side*.14,-.008,-.006,.16,.045,.035,silver,.015);spoke.rotation.z=side*.15;
    box(steering,side*.12,-.004,.022,.055,.025,.008,ivory,.008);
  }
  const lower=box(steering,0,-.13,-.008,.055,.16,.035,silver,.014);lower.rotation.z=.04;
  steering.name='black-multifunction-steering-wheel';
  const seams=new THREE.InstancedMesh(new THREE.BoxGeometry(.004,.008,.0015),stitch,84);
  const seam=new THREE.Object3D();for(let i=0;i<84;i++){const a=i/84*Math.PI*2;seam.position.set(Math.cos(a)*.231,Math.sin(a)*.231,.027);seam.rotation.z=a;seam.updateMatrix();seams.setMatrixAt(i,seam.matrix);}steering.add(seams);
  // Narrow, non-emissive metal lines keep the dashboard readable in daylight.
  box(rig,0,1.09,-.77,2.09,.006,.012,silver,.002);
  for(const side of[-1,1])box(rig,side*1.038,.86,.25,.018,.008,1.45,silver,.003);
  // Seat seams and bolsters are separate from the upholstery grain.
  for(const side of[-1,1]){
    box(rig,.62+side*.23,.57,.78,.055,.12,.56,leather,.02);
    box(rig,.62+side*.21,.98,1.115,.008,.62,.003,stitch,.002);
  }
  box(rig,.62,.565,.78,.008,.009,.47,stitch,.002);
  const emblemCanvas=document.createElement('canvas');emblemCanvas.width=128;emblemCanvas.height=64;
  const ec=emblemCanvas.getContext('2d');ec.fillStyle='#252e35';ec.fillRect(0,0,128,64);ec.fillStyle='#c5d2dc';ec.font='500 24px sans-serif';ec.textAlign='center';ec.fillText('智行',64,42);
  const emblemTexture=new THREE.CanvasTexture(emblemCanvas);emblemTexture.colorSpace=THREE.SRGBColorSpace;
  const emblem=new THREE.Mesh(new THREE.PlaneGeometry(.105,.052),new THREE.MeshBasicMaterial({map:emblemTexture,toneMapped:false}));emblem.position.set(0,0,.06);steering.add(emblem);
  function display(w,h,width,height,x,y,z){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,fog:false}));
    mesh.position.set(x,y,z);mesh.rotation.x=-.12;rig.add(mesh);return{canvas,ctx:canvas.getContext('2d'),texture,mesh};
  }
  const clusterBack=box(rig,-.43,1.23,-.66,.49,.225,.045,pale,.035);clusterBack.rotation.x=-.12;
  const cluster=display(.445,.185,640,256,-.43,1.235,-.61);
  const screenBack=box(rig,.40,1.15,-.65,.87,.565,.045,screenSilver,.028);screenBack.rotation.x=-.12;
  const screenFace=box(rig,.40,1.15,-.623,.845,.54,.014,screenIvory,.024);screenFace.rotation.x=-.12;
  const screen=display(.804,.494,1024,640,.40,1.15,-.606);screen.mesh.name='unchanged-centre-map-display';screenBack.name='unchanged-display-frame';
  const tabAnchor=new THREE.Object3D();tabAnchor.position.set(0,-.31,.025);screen.mesh.add(tabAnchor);
  const clockText=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`;
  let tab='map';
  function update(snapshot,mapCanvas){
    const c=cluster.ctx;c.clearRect(0,0,640,256);c.fillStyle='#111b24';c.fillRect(0,0,640,256);
    c.fillStyle='#90c9e9';c.font='500 25px sans-serif';c.fillText('D',35,48);c.textAlign='right';c.fillText(snapshot.timeText,605,48);
    c.textAlign='center';c.fillStyle='#e0f1fb';c.font='400 110px sans-serif';c.fillText(snapshot.speed.toFixed(0),320,151);
    c.fillStyle='#a5bdcb';c.font='22px sans-serif';c.fillText('km/h',320,186);c.textAlign='left';c.fillText(`电量 ${snapshot.battery.toFixed(0)}%`,34,230);
    c.textAlign='right';c.fillText(snapshot.manual?'人工控制速度':'自动运行',605,230);cluster.texture.needsUpdate=true;
    const t=screen.ctx;t.fillStyle='#f8fbfe';t.fillRect(0,0,1024,640);
    t.fillStyle='#527d99';t.textAlign='left';t.font='500 24px sans-serif';t.fillText('智行校园',30,43);t.textAlign='right';t.fillStyle='#9ab0c0';t.font='19px sans-serif';t.fillText(`${snapshot.id}   ${snapshot.timeText}`,990,42);
    if(tab==='map'){
      t.drawImage(mapCanvas,15,68,994,490);
      // Current position uses exactly the map's coordinate system.
      const x=15+snapshot.x/1200*994,y=68+snapshot.y/760*490;
      t.strokeStyle='#fff';t.fillStyle='#418fbd';t.lineWidth=4;t.beginPath();t.arc(x,y,10,0,Math.PI*2);t.fill();t.stroke();
      t.fillStyle='#537f9b';t.font='22px sans-serif';t.textAlign='left';t.fillText(snapshot.task?`${snapshot.task.origin}  →  ${snapshot.task.destination}`:'暂无配送任务',30,603);
      t.textAlign='right';t.fillStyle='#8ca5b6';t.font='18px sans-serif';t.fillText('道路约束导航',990,603);
    }else if(tab==='task'){
      const job=snapshot.task;t.textAlign='left';t.fillStyle='#a0b2c0';t.font='22px sans-serif';t.fillText(job?.id||'当前任务',55,115);
      t.fillStyle='#5c819b';t.font='27px sans-serif';t.fillText('取货点',55,188);t.font='500 47px sans-serif';t.fillText(job?.origin||'—',55,252);
      t.fillStyle='#a9c0d1';t.font='34px sans-serif';t.fillText('↓',55,325);t.fillStyle='#5c819b';t.font='27px sans-serif';t.fillText('送达点',55,389);t.font='500 47px sans-serif';t.fillText(job?.destination||'—',55,453);
      t.fillStyle='#8ca6b8';t.font='25px sans-serif';t.fillText(`截止 ${job?.due||'—'}     ${snapshot.delivered?'已送达':snapshot.status}`,55,560);
    }else{
      const rows=[['当前速度',`${snapshot.speed.toFixed(1)} km/h`],['剩余电量',`${snapshot.battery.toFixed(1)}%`],['本车里程',`${snapshot.distance.toFixed(3)} km`],['本车能耗',`${snapshot.energy.toFixed(3)} kWh`],['载荷',`${snapshot.load} / ${snapshot.capacity} 件`]];
      rows.forEach(([label,value],i)=>{const y=125+i*94;t.textAlign='left';t.fillStyle='#91a9b9';t.font='27px sans-serif';t.fillText(label,48,y);t.textAlign='right';t.fillStyle='#527c98';t.font='500 34px sans-serif';t.fillText(value,975,y);});
    }
    screen.texture.needsUpdate=true;
  }
  rig.userData.style='charcoal-and-black-leather';
  return{rig,steering,screen,cluster,tabAnchor,mirrorSurfaces,update,setTab:value=>{tab=value;}};
}
