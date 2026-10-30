// This adapter is local to the design preview. The published app.js is unchanged.
(() => {
  let navigationCanvas=null;
  const sourcePositions=Object.fromEntries(Object.keys(nodes).map(id=>[id,{...buildingPosition(id)}]));
  const originalBuildingPosition=buildingPosition,visualSites=new Map();
  // Local display placement only: road nodes and all route computations remain untouched.
  buildingPosition=id=>visualSites.get(id)||originalBuildingPosition(id);
  let selected = null, active = false, manual = true, pedal = false, power = 0;
  let actualSpeed = 0, lastDispatch = 0, lastPaint = 0, job = null;
  const notify = detail => parent.dispatchEvent(new CustomEvent('cockpit-request', { detail }));
  function enter(id) {
    const vehicle = state.vehicles.find(v => v.id === id && v.type === 'van');
    if (!vehicle) return false;
    if (state.judgeMode) { showToast('请先退出评委体验，再进入驾驶舱。'); return false; }
    selected = vehicle;
    if (!vehicle.mission && vehicle.status === '空闲') {
      const origin = id === 'E-01' ? '06' : '13', dest = id === 'E-01' ? '04' : '12';
      const order = createOrder(origin, dest, 1, 45, '普通', `D-${state.orders.length + 1}`, '驾驶体验');
      if (!assignOrders(vehicle, [order])) { order.status = 'pending'; }
    }
    job = selected.mission ? state.orders.find(o => o.id === selected.mission.orders[0]) : null;
    const s = ensureVehicleSegment(vehicle);
    if (s) vehicle.heading = edgeHeading(s.a, s.b, s.t) + (s.targetT < s.t ? Math.PI : 0);
    manual = true; pedal = false; power = 0; actualSpeed = 0; active = true;
    state.running = false; state.activityStarted = true;
    state.containsManualControl = true;
    addLog(`${id} 进入驾驶舱：人工控制速度，系统控制转向。`);
    renderAll();
    return true;
  }
  function advance(dt) {
    if (!active || !selected || state.time >= state.sessionEnd) return;
    state.running = false;
    dt = Math.min(Math.max(dt, 0), 0.05);
    const minutes = Math.min(dt / 60 * (manual ? 1 : 15), state.sessionEnd - state.time);
    state.time += minutes;
    power = Math.max(0, Math.min(1, power + (pedal ? 0.7 : -1) * dt));
    for (const vehicle of state.vehicles) {
      const base = vehicleSpecs[vehicle.type].speed, before = vehicle.distance;
      vehicle.speed = vehicle === selected && manual ? base * power : base;
      updateVehicle(vehicle, minutes);
      vehicle.speed = base;
      if (vehicle === selected) actualSpeed = minutes ? (vehicle.distance - before) / minutes * 60 : 0;
    }
    if (state.orderWave < state.maxOrderWaves && state.time >= state.nextWaveMinute) generateOrderWave();
    lastDispatch += dt; lastPaint += dt;
    if (lastDispatch >= 1) {
      lastDispatch = 0;
      const status = selected.status;
      if (selected.status === '空闲') selected.status = '人工接管';
      if (pendingOrders().length) autoDispatch();
      if (selected.status === '人工接管') selected.status = status;
      state.running = false;
    }
    if (lastPaint >= 0.08) { lastPaint = 0; renderAll(); draw(); }
  }
  function snapshot() {
    if (!selected) return null;
    const v = selected, s = v.segment;
    const traffic = s ? trafficFactor(s.a, s.b) : 1;
    const nearest = Object.entries(nodes).sort(([, a], [, b]) => Math.hypot(v.x-a.x, v.y-a.y)-Math.hypot(v.x-b.x, v.y-b.y))[0];
    return {
      id: v.id, x: v.x, y: v.y, heading: v.heading,
      battery: v.battery, load: v.load, capacity: v.capacity, distance: v.distance, energy: v.energy,
      speed: actualSpeed, maxSpeed: vehicleSpecs.van.speed * MAP_KM_PER_PIXEL * 60 / traffic,
      status: v.status, stage: v.stage, manual, pedal, power, active, experienceRate: manual ? 1 : 15,
      time: state.time, timeText: fmtTime(state.time), delivered: job?.status === 'delivered',
      task: job ? { id: job.id, origin: nodes[job.origin].name, destination: nodes[job.dest].name, due: fmtTime(job.due), qty: job.qty } : null,
      nearest: nearest[1].name, currentNode: v.currentNode,
      next: nodes[s ? (s.targetT === 0 ? s.a : s.b) : v.path[v.pathIndex]]?.name || '停靠点',
      path: v.path.slice(), segment: s ? { ...s } : null,
      vehicles: state.vehicles.map(v => ({ id: v.id, type: v.type, x: v.x, y: v.y, heading: v.heading })),
      totals: { ...state.metrics }, orders: state.orders.length
    };
  }
  const api = {
    enter, advance, snapshot,
    applyVisualSites(sites){
      visualSites.clear();sites.forEach(s=>visualSites.set(s.id,{x:s.x/(MAP_KM_PER_PIXEL*1000)+600,y:s.z/(MAP_KM_PER_PIXEL*1000)+380}));
      staticKey='';draw();
    },
    overview: () => ({vehicles: state.vehicles.map(v=>({id:v.id,type:v.type,x:v.x,y:v.y,heading:v.heading,status:v.status,battery:v.battery})),time:fmtTime(state.time),running:state.running}),
    ready: () => modelImages.every(img => img.complete),
    canvas: () => {
      if(state.view.scale===1&&state.view.ox===0&&state.view.oy===0)return canvas;
      // The in-car display always uses full-map coordinates; preserve the user's dashboard zoom.
      if(!navigationCanvas){navigationCanvas=document.createElement('canvas');navigationCanvas.width=canvas.width;navigationCanvas.height=canvas.height;}
      const view=state.view;try{state.view={scale:1,ox:0,oy:0};draw();navigationCanvas.getContext('2d').drawImage(canvas,0,0);}finally{state.view=view;draw();}
      return navigationCanvas;
    },
    geometry: () => ({
      metresPerPixel: MAP_KM_PER_PIXEL * 1000,
      nodes: Object.entries(nodes).map(([id, n]) => ({ id, ...n, building: {...sourcePositions[id]} })),
      roads: edgePairs.map(([a, b]) => ({ a, b, points: edgeGeometry(a, b).points.map(p => ({ ...p })) }))
    }),
    pedal(value) { pedal = !!value && manual; },
    brake() { pedal = false; power = 0; actualSpeed = 0; },
    automatic(value) { manual = !value; pedal = false; power = 0; },
    exit() {
      api.brake(); active = false; manual = false;
      state.running = state.time < state.sessionEnd;
      $('#playBtn').textContent = state.running ? 'Ⅱ 暂停' : '▶ 开始仿真';
      addLog(`${selected?.id || '车辆'} 退出驾驶舱，恢复系统调度。`);
      renderAll();
    }
  };
  window.cockpitBridge = api;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-cockpit]');
    const card = event.target.closest('[data-vehicle]');
    const id = button?.dataset.cockpit || card?.dataset.vehicle;
    if (!['E-01','E-02'].includes(id)) return;
    if (!button && state.selectedOrder) return;
    event.preventDefault(); event.stopImmediatePropagation(); notify({ id });
  }, true);
  function buttons() {
    document.querySelectorAll('[data-vehicle]').forEach(card => {
      if (!['E-01','E-02'].includes(card.dataset.vehicle) || card.querySelector('[data-cockpit]')) return;
      const button = document.createElement('button');
      button.dataset.cockpit = card.dataset.vehicle;
      button.textContent = '进入驾驶舱';
      button.style.cssText = 'margin-top:9px;padding:7px 13px;border-radius:7px;background:#e6f4ff;color:#376e93;border:1px solid #c5e2f4;font-size:12px;cursor:pointer';
      card.appendChild(button);
    });
  }
  new MutationObserver(buttons).observe($('#fleetList'), { childList: true });
  buttons();
  let mapPointer = null;
  canvas.addEventListener('pointerdown', event => { mapPointer = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (!mapPointer || Math.hypot(event.clientX-mapPointer.x,event.clientY-mapPointer.y)>5) { mapPointer=null; return; }
    mapPointer=null;
    const r = canvas.getBoundingClientRect();
    const x = ((event.clientX-r.left)*canvas.width/r.width-state.view.ox)/state.view.scale;
    const y = ((event.clientY-r.top)*canvas.height/r.height-state.view.oy)/state.view.scale;
    const v = state.vehicles.filter(v => v.type === 'van').sort((a,b) => Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    if (v && Math.hypot(v.x-x,v.y-y)<20) notify({ id: v.id });
  });
})();
