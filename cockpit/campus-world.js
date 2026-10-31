import * as THREE from './vendor/three.module.js';
import {buildLandmark} from './landmarks.js';
import {createLandscape} from './landscape.js';
import {planSites,roadIntersections} from './site-safety.js';
import {createVehicle} from './vehicles.js';

// One world unit is one metre; the original map supplies its own metres-per-pixel.
export function createCampus(scene, model) {
  const root = new THREE.Group(); root.name = 'campus-from-original-map'; scene.add(root);
  const unit = model.metresPerPixel;
  const point = p => new THREE.Vector3((p.x - 600) * unit, 0, (p.y - 380) * unit);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.02, ...extra });
  const grass = mat('#b5c88e'), sidewalk = mat('#eeeade'), asphalt = mat('#737f87'), curb = mat('#e9eff0');
  const wall = mat('#ecece4'), brick = mat('#cda58f'), blue = mat('#8db1c2'), roof = mat('#b4c8d1'), glass = mat('#587e96', { roughness: 0.32, metalness: 0.08 });
  const boxGeometry = new THREE.BoxGeometry(1,1,1);
  const windowInstances = [], treeInstances = [], dashInstances = [];
  const buildingRecords = [], buildingGroups = [], labels = [];
  function box(parent, x,y,z, w,h,d, material = wall) {
    const mesh = new THREE.Mesh(boxGeometry, material); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function horizontal(parent, x,z,w,d,material,y=0.025) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,d), material);
    mesh.rotation.x = -Math.PI/2; mesh.position.set(x,y,z); mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  // Keep ground around the campus; avoid a large rectangular empty terrain.
  const extent=model.nodes.map(n=>point(n.building));
  const xs=extent.map(p=>p.x),zs=extent.map(p=>p.z);
  const minX=Math.min(...xs)-145,maxX=Math.max(...xs)+130,minZ=Math.min(...zs)-120,maxZ=Math.max(...zs)+130;
  const land=new THREE.Shape();land.moveTo(minX,minZ);land.lineTo(maxX,minZ);land.lineTo(maxX,maxZ);land.lineTo(minX,maxZ);land.closePath();
  const terrain=new THREE.Mesh(new THREE.ShapeGeometry(land),grass);terrain.rotation.x=Math.PI/2;terrain.material.side=THREE.DoubleSide;terrain.receiveShadow=true;root.add(terrain);
  horizontal(root,minX-35,(minZ+maxZ)/2,65,maxZ-minZ,mat('#8fc6dc',{roughness:.3}),.018);

  function ribbon(points, width, material, height) {
    const vertices = [], indices = [];
    points.forEach((p,i) => {
      const prev = points[Math.max(0,i-1)], next = points[Math.min(points.length-1,i+1)];
      const dx = next.x-prev.x, dz=next.z-prev.z, len=Math.hypot(dx,dz)||1;
      const nx = -dz/len*width/2, nz = dx/len*width/2;
      vertices.push(p.x+nx,height,p.z+nz,p.x-nx,height,p.z-nz);
      if(i<points.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry,material);mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  model.roads.forEach((road,index) => {
    const samples = road.points.map(point);
    ribbon(samples,15,sidewalk,0.025); ribbon(samples,11,curb,0.045); ribbon(samples,9.5,asphalt,0.055);
    // Dashed lane marks are geometries, so their width is in world metres.
    let total=0;
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1], b=samples[i], length=a.distanceTo(b);
      for(let d=0;d<length;d+=5){
        if(Math.floor((total+d)/6)%2)continue;
        const p=a.clone().lerp(b,Math.min(1,d/length));
        const q=a.clone().lerp(b,Math.min(1,(d+2.5)/length));
        if(p.distanceTo(q)>.01){
          const mark=new THREE.Object3D();mark.position.copy(p).add(q).multiplyScalar(.5);mark.position.y=.065;
          mark.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);mark.scale.set(.11,.012,p.distanceTo(q));mark.updateMatrix();dashInstances.push(mark.matrix.clone());
        }
      }
      total+=length;
    }
    for(let i=2;i<samples.length-2;i+=5){
      const p=samples[i], q=samples[i+1], dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz)||1;
      for(const side of [-1,1])treeInstances.push({x:p.x-dz/len*10*side,z:p.z+dx/len*10*side,scale:1.6+((index+i)%4)*0.25});
    }
  });
  const dashes=new THREE.InstancedMesh(boxGeometry,curb,dashInstances.length);
  dashInstances.forEach((matrix,index)=>dashes.setMatrixAt(index,matrix));dashes.instanceMatrix.needsUpdate=true;root.add(dashes);
  model.nodes.forEach(n=>{
    const p=point(n), mesh=new THREE.Mesh(new THREE.CircleGeometry(5.3,24),asphalt);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(p.x,0.06,p.z);root.add(mesh);
  });
  function label(text, group, height, width=38) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;
    const c=canvas.getContext('2d');c.fillStyle='#ffffffed';c.beginPath();c.roundRect(4,4,504,104,12);c.fill();
    c.fillStyle='#526e7b';c.textAlign='center';c.textBaseline='middle';c.font='500 36px "PingFang SC",sans-serif';c.fillText(text,256,57,470);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
    sprite.position.set(0,height,0);sprite.scale.set(width*1.8,width*1.8*112/512,1);group.add(sprite); labels.push(sprite);
  }
  function archRoof(group,w,d,height){
    const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.quadraticCurveTo(0,w*.18,w/2,0);shape.lineTo(w/2,-.8);shape.quadraticCurveTo(0,w*.18-.9,-w/2,-.8);shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1,curveSegments:14}),roof);mesh.position.set(0,height,-d/2);mesh.castShadow=true;group.add(mesh);
  }
  function windows(group,w,h,d){
    group.updateMatrixWorld(true);
    const rows=Math.max(1,Math.floor(h/3.6)), columns=Math.max(2,Math.floor(w/4));
    const dummy=new THREE.Object3D();
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      for(const side of [-1,1]){
        dummy.position.set(-w/2+(col+.5)*w/columns,2+row*3.4,side*(d/2+.035));
        dummy.rotation.set(0,side===1?0:Math.PI,0);dummy.scale.set(1.7,1.6,.06);dummy.updateMatrix();
        windowInstances.push(new THREE.Matrix4().multiplyMatrices(group.matrixWorld,dummy.matrix));
      }
    }
    const depthCols=Math.max(2,Math.floor(d/4));
    for(let row=0;row<rows;row++)for(let col=0;col<depthCols;col++)for(const side of [-1,1]){
      dummy.position.set(side*(w/2+.035),2+row*3.4,-d/2+(col+.5)*d/depthCols);
      dummy.rotation.set(0,Math.PI/2,0);dummy.scale.set(1.7,1.6,.06);dummy.updateMatrix();
      windowInstances.push(new THREE.Matrix4().multiplyMatrices(group.matrixWorld,dummy.matrix));
    }
  }
  model.nodes.forEach(n=>{
    const building=point(n.building),road=point(n);
    const group=new THREE.Group();group.name=`building-${n.id}`;group.position.copy(building);
    group.userData.nodeId=n.id;root.add(group);buildingGroups.push(group);group.updateMatrixWorld(true);
    const spec=buildLandmark(n,group,{box,plane:horizontal,tree:(x,z,scale,color)=>treeInstances.push({x,z,scale,color,owner:n.id})});
    buildingRecords.push({id:n.id,x:building.x,z:building.z,type:n.type,...spec});
    label(`${n.id==='05B'?'05女寝':n.id==='05R'?'05行政':n.id} ${n.name}`,group,spec.height+7,36);
  });
  const roadGeometry=model.roads.map(r=>({...r,points:r.points.map(point)}));
  const sites=planSites(buildingRecords,roadGeometry);
  for(const site of sites){
    const group=buildingGroups.find(g=>g.userData.nodeId===site.id);
    group.position.set(site.x,0,site.z);group.scale.setScalar(site.scale);group.updateMatrixWorld(true);
    for(const tree of treeInstances.filter(t=>t.owner===site.id)){
      tree.x=site.x+(tree.x-site.originalX)*site.scale;tree.z=site.z+(tree.z-site.originalZ)*site.scale;tree.scale*=site.scale;
    }
    const source=model.nodes.find(n=>n.id===site.id),road=point(source);
    const entrance=new THREE.Vector3(Math.max(site.x-site.width/2,Math.min(site.x+site.width/2,road.x)),0,Math.max(site.z-site.depth/2,Math.min(site.z+site.depth/2,road.z)));
    const outward=road.clone().sub(entrance).normalize();entrance.addScaledVector(outward,2);
    ribbon([road,entrance],4,sidewalk,.035);
  }
  buildingRecords.splice(0,buildingRecords.length,...sites);
  const roadAudit={roadWidth:9.5,clearancePadding:6.5,conflicts:sites.filter(b=>b.type!=='park').flatMap(b=>roadIntersections(b,roadGeometry,6.5).map(road=>({building:b.id,road}))),adjustments:sites.filter(b=>b.shift>0).map(b=>({id:b.id,dx:b.x-b.originalX,dz:b.z-b.originalZ,shift:b.shift,scale:b.scale}))};
  const landscape=createLandscape(root,treeInstances,roadGeometry,sites);
  // Batch repeated facade boxes once; vehicle parts remain independent and movable.
  root.updateMatrixWorld(true);
  const batches=new Map(), staticBoxes=[];
  root.traverse(o=>{if(o.isMesh&&o.geometry===boxGeometry&&!o.isInstancedMesh)staticBoxes.push(o);});
  for(const o of staticBoxes){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o.matrixWorld.clone());o.removeFromParent();}
  for(const [material,matrices] of batches){const batch=new THREE.InstancedMesh(boxGeometry,material,matrices.length);matrices.forEach((m,i)=>batch.setMatrixAt(i,m));batch.instanceMatrix.needsUpdate=true;batch.castShadow=true;batch.receiveShadow=true;root.add(batch);}

  const carMeshes=new Map();
  function updateCars(snapshot){
    snapshot.vehicles.forEach(v=>{
      // The original simulation can stack vehicles at one service node. Do not
      // render another vehicle's body through the driver's seat at that node.
      if(snapshot.id&&(v.id===snapshot.id||Math.hypot(v.x-snapshot.x,v.y-snapshot.y)*unit<5)){if(carMeshes.has(v.id))carMeshes.get(v.id).visible=false;return;}
      let g=carMeshes.get(v.id);
      if(!g){g=createVehicle(v.type,v.id);root.add(g);carMeshes.set(v.id,g);}
      const p=point(v);
      if(g.userData.previousPosition){
        const distance=p.distanceTo(g.userData.previousPosition);
        // Ignore resets and teleports; wheel motion follows actual route distance.
        if(distance<4)for(const wheel of g.userData.wheels)wheel.rotation.x-=distance/g.userData.wheelRadius;
      }
      g.userData.previousPosition=p.clone();
      g.position.copy(p);g.rotation.y=-v.heading-Math.PI/2;g.visible=true;
    });
  }
  return { root, point, buildingRecords, buildingGroups, labels, carMeshes, updateCars, landscape, roadAudit, treeCount:landscape.trees.length };
}
