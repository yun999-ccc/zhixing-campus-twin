import * as T from './vendor/three.module.js';
// Live rear cameras, with a horizontally reversed image; approximate vehicle mirrors.
// Same campus/vehicle state, not calibrated planar-optics reflections.
export function createMirrorViews(renderer,scene,cabin,driver){
 const views=cabin.mirrorSurfaces.map(surface=>{
  const aspect=surface.userData.mirrorAspect||1.5;
  const target=new T.WebGLRenderTarget(384,Math.round(384/aspect));target.texture.colorSpace=T.SRGBColorSpace;
  target.texture.wrapS=T.RepeatWrapping;target.texture.repeat.x=-1;target.texture.offset.x=1;
  target.texture.minFilter=T.LinearFilter;target.texture.magFilter=T.LinearFilter;
  surface.material.map=target.texture;surface.material.color.set('#ffffff');surface.material.needsUpdate=true;
  return{surface,target,camera:new T.PerspectiveCamera(54,aspect,.1,2200),frames:0,lastUpdate:-Infinity};
 });
 let last=-Infinity;
 function update(now){
  if(now-last<66)return;last=now;
  cabin.rig.updateMatrixWorld(true);driver.updateMatrixWorld(true);
  const oldTarget=renderer.getRenderTarget(),oldVisible=cabin.rig.visible;
  try{
   for(const view of views){
    const centre=view.surface.getWorldPosition(new T.Vector3()),ndc=centre.clone().project(driver);
    if(ndc.z< -1||ndc.z>1||Math.abs(ndc.x)>1.15||Math.abs(ndc.y)>1.15)continue;
    const local=cabin.rig.worldToLocal(centre.clone());
    // Rearward (+Z in the cabin) with a small outward bias; keep the horizon in view.
    const direction=new T.Vector3(local.x<0?-.12:.12,.015,1).transformDirection(cabin.rig.matrixWorld);
    view.camera.position.copy(centre);view.camera.lookAt(centre.clone().add(direction));view.camera.updateMatrixWorld(true);
    cabin.rig.visible=false;renderer.setRenderTarget(view.target);renderer.render(scene,view.camera);
    cabin.rig.visible=oldVisible;view.frames++;view.lastUpdate=now;
   }
  }finally{cabin.rig.visible=oldVisible;renderer.setRenderTarget(oldTarget);}
 }
 return{update,views,dispose:()=>views.forEach(v=>v.target.dispose()),count:views.length};
}
