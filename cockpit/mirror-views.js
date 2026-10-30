import * as T from './vendor/three.module.js';
// Small rearward views use the same live campus. Updated only when visible.
// Approximate mirror projection, not a calibrated optical mirror simulation.
export function createMirrorViews(renderer,scene,cabin,driver){
 const views=cabin.mirrorSurfaces.map(surface=>{
  const target=new T.WebGLRenderTarget(256,144);target.texture.colorSpace=T.SRGBColorSpace;
  target.texture.wrapS=T.RepeatWrapping;target.texture.repeat.x=-1;target.texture.offset.x=1;
  surface.material.map=target.texture;surface.material.color.set('#ffffff');surface.material.needsUpdate=true;
  return{surface,target,camera:new T.PerspectiveCamera(48,256/144,.15,2200)};
 });
 let last=-Infinity;
 function update(now){
  if(now-last<280)return;last=now;
  cabin.rig.updateMatrixWorld(true);driver.updateMatrixWorld(true);
  const old=renderer.getRenderTarget();
  for(const view of views){
   const centre=view.surface.getWorldPosition(new T.Vector3()),ndc=centre.clone().project(driver);
   if(ndc.z>1||Math.abs(ndc.x)>1.2||Math.abs(ndc.y)>1.2)continue;
   const local=cabin.rig.worldToLocal(centre.clone());
   const direction=new T.Vector3(local.x<0?-.3:.3,.03,1).transformDirection(cabin.rig.matrixWorld);
   view.camera.position.copy(centre);view.camera.lookAt(centre.clone().add(direction));
   cabin.rig.visible=false;renderer.setRenderTarget(view.target);renderer.render(scene,view.camera);cabin.rig.visible=true;
  }
  renderer.setRenderTarget(old);
 }
 return{update,views,dispose:()=>views.forEach(v=>v.target.dispose()),count:views.length};
}
