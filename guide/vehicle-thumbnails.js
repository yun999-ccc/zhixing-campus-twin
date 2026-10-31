import * as T from '../cockpit/vendor/three.module.js';
import {createVehicle} from '../cockpit/vehicles.js';
try {
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(420,300);renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.toneMapping=T.NeutralToneMapping;
 for(const type of ['van','bot']){
  const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xb3c5d3,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-3,6,-4);scene.add(light);
  const model=createVehicle(type,'preview');scene.add(model);const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const extent=Math.max(size.x,size.y,size.z)*.70;
  const camera=new T.OrthographicCamera(-extent*1.4,extent*1.4,extent,-extent,.1,100);camera.position.copy(center).add(new T.Vector3(-5,2.6,-7));camera.lookAt(center);renderer.render(scene,camera);
  window.guideVehicleImages[type]=renderer.domElement.toDataURL('image/png');
 }
 renderer.dispose();window.__guideQA.paint();
}catch(error){console.warn('车辆缩略图使用已有二维素材',error);}
