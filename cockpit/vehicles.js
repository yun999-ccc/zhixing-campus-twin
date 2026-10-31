import * as T from './vendor/three.module.js';

// Dimensions are visual design parameters, not surveyed vehicle specifications.
// Each type has its own chassis, axle locations and glazing attachment points.
const shapes=new Map();
function rounded(w,h,d,r=.035){
  const key=[w,h,d,r].join(':');if(shapes.has(key))return shapes.get(key);
  r=Math.min(r,w/3,h/3,d/3);
  const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:r*.35,bevelSize:r*.35,bevelSegments:2,curveSegments:4});
  g.translate(0,0,-d/2);shapes.set(key,g);return g;
}
function axleGeometry(radius,width){
  const key=`tire:${radius}:${width}`;if(shapes.has(key))return shapes.get(key);
  const g=new T.CylinderGeometry(radius,radius,width,24);g.rotateZ(Math.PI/2);shapes.set(key,g);return g;
}
export function createVehicle(type,id){
  const van=type==='van',g=new T.Group();g.name=`delivery-${type}-${id}`;
  const paint=new T.MeshStandardMaterial({color:van?'#eeeae0':'#e3eeec',roughness:.48,metalness:.18});
  const accent=new T.MeshStandardMaterial({color:van?'#38738d':'#3a8d86',roughness:.5,metalness:.12});
  const rubber=new T.MeshStandardMaterial({color:'#20292d',roughness:.92});
  const metal=new T.MeshStandardMaterial({color:'#a4afb4',roughness:.35,metalness:.65});
  const dark=new T.MeshStandardMaterial({color:'#283a43',roughness:.63});
  const glass=new T.MeshStandardMaterial({color:'#2c5061',roughness:.2,metalness:.28,side:T.DoubleSide});
  const white=new T.MeshStandardMaterial({color:'#fbf6db',emissive:'#e8d9a0',emissiveIntensity:.32,roughness:.3});
  const red=new T.MeshStandardMaterial({color:'#be4c45',emissive:'#8f261d',emissiveIntensity:.23});
  const amber=new T.MeshStandardMaterial({color:'#dba34c',roughness:.4});
  function mesh(geo,mat,name,x=0,y=0,z=0,parent=g){const o=new T.Mesh(geo,mat);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(name,x,y,z,w,h,d,mat=paint,r=.025){return mesh(rounded(w,h,d,r),mat,name,x,y,z);}
  function quad(name,points,mat){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return mesh(geo,mat,name);}
  function badge(x,y,z,side){
    const c=document.createElement('canvas');c.width=512;c.height=200;const t=c.getContext('2d');
    t.fillStyle=van?'#38738d':'#3a8d86';t.fillRect(0,0,512,200);
    t.textAlign='center';t.fillStyle='#ffffff';t.font='600 56px sans-serif';t.fillText(van?'智行 · 校园配送':'无人配送',256,83);
    t.font='42px sans-serif';t.fillText(id,256,153);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const o=mesh(new T.PlaneGeometry(van?1.3:.83,van?.50:.325),new T.MeshStandardMaterial({map,roughness:.65,side:T.DoubleSide}),'delivery-marking',x,y,z);
    o.rotation.y=side*Math.PI/2;
  }
  const wheels=[],wheelRadius=van?.38:.24,wheelWidth=van?.24:.20;
  const axleX=van?1.15:.54,axleZ=van?[-.92,2.82]:[-.54,.54];
  box('chassis',0,van?.48:.35,van?1.06:0,van?2.16:1.12,van?.22:.17,van?5.43:1.68,dark,.035);
  for(const side of[-1,1])for(const z of axleZ){
    const x=side*axleX,y=.055+wheelRadius;
    const tire=mesh(axleGeometry(wheelRadius,wheelWidth),rubber,'tire',x,y,z);wheels.push(tire);
    const rim=mesh(axleGeometry(wheelRadius*.64,.025),metal,'wheel-rim',side*(wheelWidth/2+.003),0,0,tire);
    mesh(axleGeometry(wheelRadius*.22,.038),dark,'wheel-hub',side*.017,0,0,rim);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      const spoke=mesh(rounded(.012,wheelRadius*.55,.025,.004),dark,'rim-slot',side*.016,Math.cos(a)*wheelRadius*.34,Math.sin(a)*wheelRadius*.34,rim);spoke.rotation.x=a;
    }
    const arch=mesh(new T.TorusGeometry(wheelRadius+.045,van?.032:.02,6,24,Math.PI),van?dark:accent,'wheel-arch',side*(axleX+.015),y,z);arch.rotation.y=Math.PI/2;
  }
  if(van){
    // Extruded cab profile includes the sloped windshield and a short bonnet.
    const s=new T.Shape();s.moveTo(1.68,.48);s.lineTo(1.68,1.10);s.lineTo(1.34,1.29);s.lineTo(.98,2.20);s.lineTo(-.78,2.20);s.lineTo(-.78,.48);s.closePath();
    const cab=new T.ExtrudeGeometry(s,{depth:2.26,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:3});cab.translate(0,0,-1.13);cab.rotateY(Math.PI/2);
    mesh(cab,paint,'body');
    box('cargo-shell',0,1.38,2.25,2.26,1.78,3.18,paint,.08);
    box('roof-cap',0,2.25,1.49,2.28,.075,4.56,paint,.045);
    quad('front-glazing',[[-.96,1.38,-1.35],[.96,1.38,-1.35],[.96,2.10,-1.064],[-.96,2.10,-1.064]],glass);
    box('wiper',0,1.39,-1.369,1.10,.025,.018,dark,.006).rotation.z=.04;
    for(const side of[-1,1]){
      const x=side*1.161;
      quad('cab-side-window',[[x,1.40,-1.22],[x,1.40,.44],[x,2.07,.44],[x,2.07,-.94]],glass);
      box('window-divider',x,1.73,.02,.021,.69,.027,dark,.006);
      box('door-handle',x,1.20,.42,.035,.055,.20,dark,.009);
      box('cab-door-seam',x,.96,.64,.016,.84,.014,dark,.004);
      box('cargo-door-seam',x,1.37,1.07,.015,1.55,.014,dark,.004);
      box('cargo-lower-trim',x,.63,2.24,.025,.12,3.04,accent,.012);
      box('side-step',side*1.19,.43,-.16,.18,.09,1.35,dark,.02);
      box('mirror-arm',side*1.24,1.39,-1.02,.22,.035,.04,dark,.008);
      box('mirror-housing',side*1.36,1.43,-1.02,.17,.25,.13,dark,.04);
      box('mirror-glass',side*1.36,1.43,-.948,.13,.19,.01,metal,.018);
      box('headlamp',side*.84,1.02,-1.70,.39,.16,.045,white,.025);
      box('indicator',side*1.02,.97,-1.707,.06,.08,.047,amber,.01);
      box('tail-lamp',side*.96,1.06,3.86,.13,.44,.04,red,.016);
      badge(side*1.166,1.48,2.22,side);
      for(const z of[1.45,3.22])box('cargo-door-hinge',side*1.164,1.00,z,.028,.18,.09,metal,.012);
    }
    box('front-bumper',0,.65,-1.70,2.23,.19,.14,dark,.035);
    box('grille',0,.93,-1.706,.94,.19,.025,dark,.015);
    for(const y of[.89,.94,.99])box('grille-slat',0,y,-1.725,.85,.012,.012,metal,.003);
    box('rear-bumper',0,.59,3.89,2.22,.17,.14,dark,.03);
    box('rear-door-split',0,1.42,3.861,.018,1.58,.018,dark,.004);
    for(const side of[-1,1]){
      box('rear-door-inset',side*.55,1.50,3.858,.94,1.26,.02,paint,.025);
      box('rear-door-latch',side*.10,1.11,3.886,.025,.31,.028,metal,.006);
    }
    box('rear-plate',0,.76,3.893,.43,.13,.015,accent,.009);
  }else{
    box('body',0,.83,0,1.14,.94,1.62,paint,.07);
    box('lower-skirt',0,.43,0,1.16,.15,1.65,accent,.035);
    box('roof',0,1.32,0,1.12,.08,1.58,paint,.045);
    box('front-glazing',0,1.10,-.826,1.00,.19,.028,glass,.035);
    for(const x of[-.30,.30]){
      const lens=mesh(new T.CylinderGeometry(.047,.047,.018,16),dark,'camera-lens',x,1.10,-.848);lens.rotation.x=Math.PI/2;
      const lensGlass=mesh(new T.CylinderGeometry(.025,.025,.022,16),glass,'lens-glass',x,1.10,-.858);lensGlass.rotation.x=Math.PI/2;
      box('running-light',x,.66,-.842,.25,.055,.025,white,.018);
      box('rear-light',x,.66,.839,.22,.055,.025,red,.015);
    }
    box('front-bumper',0,.44,-.86,1.07,.12,.10,dark,.03);
    box('rear-bumper',0,.44,.86,1.07,.12,.10,dark,.03);
    for(const side of[-1,1]){
      badge(side*.606,.99,0,side);
      for(const z of[-.54,0,.54]){
        box('locker-seam',side*.601,.81,z,.014,.73,.012,dark,.003);
        box('locker-latch',side*.612,.69,z+.12,.016,.07,.09,metal,.008);
      }
    }
    box('rear-service-panel',0,.91,.825,.89,.52,.022,accent,.035);
    mesh(new T.CylinderGeometry(.095,.095,.055,20),dark,'lidar-base',0,1.38,-.40);
    mesh(new T.CylinderGeometry(.075,.075,.065,20),glass,'lidar',0,1.435,-.40);
    box('status-lamp',0,1.38,.52,.32,.045,.055,accent,.018);
  }
  g.userData={vehicleId:id,vehicleType:type,wheels,wheelRadius};
  return g;
}
