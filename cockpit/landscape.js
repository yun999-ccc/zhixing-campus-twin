import * as T from './vendor/three.module.js';
import {roadDistance} from './site-safety.js';
// Stable placement/seed makes overview and cockpit share the same vegetation.
export function createLandscape(root,input,roads,sites){
 const trees=[],removed=[];
 for(const t of input){const reason=roadDistance(t,roads)<6.4?'road-clearance':sites.some(b=>b.type!=='park'&&Math.abs(t.x-b.x)<b.width/2+1&&Math.abs(t.z-b.z)<b.depth/2+1)?'building-footprint':trees.some(p=>Math.hypot(p.x-t.x,p.z-t.z)<2.2)?'duplicate':null;if(reason){removed.push({...t,reason});continue;}trees.push(t);}
 let seed=64577;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const barkCanvas=document.createElement('canvas');barkCanvas.width=barkCanvas.height=256;const bc=barkCanvas.getContext('2d');bc.fillStyle='#938573';bc.fillRect(0,0,256,256);for(let j=0;j<180;j++){bc.strokeStyle=j%3?'#71634f':'#b3a18a';bc.lineWidth=.5+random()*2;bc.beginPath();const x=random()*256;bc.moveTo(x,0);bc.lineTo(x+random()*8-4,256);bc.stroke();}
 const bark=new T.CanvasTexture(barkCanvas);bark.wrapS=bark.wrapT=T.RepeatWrapping;
 const trunkMat=new T.MeshStandardMaterial({color:'#8e7b62',roughness:.95,bumpMap:bark,bumpScale:.035});
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.22,.34,1,7),trunkMat,trees.length*4);trunks.name='branched-tree-trunks';trunks.castShadow=true;
 const atlas=document.createElement('canvas');atlas.width=atlas.height=512;const c=atlas.getContext('2d');
 for(let j=0;j<300;j++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*226,x=256+Math.cos(angle)*r,y=256+Math.sin(angle)*r;c.save();c.translate(x,y);c.rotate(random()*Math.PI);const v=160+Math.floor(random()*95);c.fillStyle=`rgb(${v},${v},${v})`;c.beginPath();c.ellipse(0,0,7+random()*14,3+random()*5,0,0,Math.PI*2);c.fill();c.restore();}
 const leaves=new T.CanvasTexture(atlas);leaves.colorSpace=T.SRGBColorSpace;leaves.anisotropy=4;
 const leafMat=new T.MeshStandardMaterial({map:leaves,color:'#ffffff',side:T.DoubleSide,alphaTest:.42,roughness:1,metalness:0});
 const cards=new T.InstancedMesh(new T.PlaneGeometry(1,1),leafMat,trees.length*21);cards.name='individual-leaf-clusters';cards.castShadow=true;
 const far=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),trees.length*7);far.name='distant-tree-crowns';far.castShadow=true;
 let minLeafY=Infinity;
 const dummy=new T.Object3D(),color=new T.Color();
 function branch(index,a,b,r){const d=b.clone().sub(a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());dummy.scale.set(r,d.length(),r);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);}
 trees.forEach((t,i)=>{
  const s=t.scale*(.9+random()*.2),pink=t.color&&t.color!=='#779638',base=new T.Vector3(t.x,0,t.z);
  branch(i*4,base,new T.Vector3(t.x,3.5*s,t.z),s);
  for(let j=0;j<3;j++){const a=j*Math.PI*2/3+i*.7;branch(i*4+j+1,new T.Vector3(t.x,2.2*s,t.z),new T.Vector3(t.x+Math.cos(a)*1.45*s,4.4*s,t.z+Math.sin(a)*1.45*s),s*.48);}
  for(let j=0;j<7;j++){
   const a=j*2.399+i*.13,spread=j?1.55:0,centre=new T.Vector3(t.x+Math.cos(a)*spread*s,(j?4.0:5.25)*s+1.4,t.z+Math.sin(a)*spread*s),size=(1.9+random()*.5)*s;
   color.set(pink?'#daa0ae':'#6c8d32').multiplyScalar(.86+random()*.32);
   dummy.position.copy(centre);dummy.quaternion.identity();dummy.scale.set(size,size*.9,size);dummy.updateMatrix();far.setMatrixAt(i*7+j,dummy.matrix);far.setColorAt(i*7+j,color);
   for(let k=0;k<3;k++){dummy.position.copy(centre);dummy.rotation.set((random()-.5)*.8,k*Math.PI/3+a,(random()-.5)*.6);dummy.scale.set(size*2.3,size*2.1,1);dummy.updateMatrix();const bottom=dummy.position.y-(Math.abs(dummy.matrix.elements[1])+Math.abs(dummy.matrix.elements[5]))*.5;if(bottom<2.6){dummy.position.y+=2.6-bottom;dummy.updateMatrix();}minLeafY=Math.min(minLeafY,dummy.position.y-(Math.abs(dummy.matrix.elements[1])+Math.abs(dummy.matrix.elements[5]))*.5);cards.setMatrixAt((i*7+j)*3+k,dummy.matrix);cards.setColorAt((i*7+j)*3+k,color);}
  }
 });
 for(const mesh of[trunks,cards,far]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;root.add(mesh);mesh.computeBoundingSphere();}
 function update(camera){const p=camera.getWorldPosition(new T.Vector3()),close=p.y<110;cards.visible=close;far.visible=!close;}
 return {trees,removed,update,stats:{minLeafY,accepted:trees.length,rejected:removed.length,leafCards:trees.length*21,trunkSegments:trees.length*4}};
}
