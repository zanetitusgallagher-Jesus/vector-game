// Hoofquake — interact with everything: gadgets (guns), destructible vehicles, air traffic you can
// shoot down, rideable animals, talkative townsfolk, shakeable trees and wildlife that fights back.
'use strict';
(function () {
  const V = THREE.Vector3; const G = 30;

  // ------------------------------------------------------------------ gadgets
  H.GADGETS = [
    { id: 'blaster', name: 'Paint Blaster', price: 0, rate: 0.14, speed: 120, desc: 'Rapid paintballs. Knocks people, animals and props flying and splats paint everywhere.' },
    { id: 'shotgun', name: 'Hay Shotgun', price: 4500, rate: 0.7, speed: 95, pellets: 7, desc: 'A spray of hay bales at close range. Clears a sidewalk in one shot.' },
    { id: 'rocket', name: 'Rocket Launcher', price: 12000, rate: 1.1, speed: 70, desc: 'Explosive rockets. Wrecks cars, downs aircraft, flattens fences.' },
    { id: 'gust', name: 'Gust Cannon', price: 7000, rate: 0.9, speed: 0, desc: 'A cone of hurricane wind that throws everything in front of you.' },
    { id: 'tranq', name: 'Snooze Dart', price: 3000, rate: 0.5, speed: 140, desc: 'Puts people and animals to sleep for a while. Rude, but quiet.' },
  ];
  H.GADGETS.forEach(g => (g.price = 0)); // everything is free
  H.GADGET = {}; H.GADGETS.forEach(g => (H.GADGET[g.id] = g));
  H.shots = [];
  const PAINT = ['#ff3a6a', '#3ad8ff', '#ffd21a', '#7aff3a', '#b84aff', '#ff8a1a'];

  H.ownedGadgets = () => H.GADGETS.filter(g => (H.state.gadgets || {})[g.id]);
  H.cycleGadget = function (p) {
    const own = H.ownedGadgets(); if (!own.length) { H.toast('No gadgets yet — the Shop sells them.'); return; }
    const ids = [null, ...own.map(g => g.id)]; const i = ids.indexOf(p.gadget || null); p.gadget = ids[(i + 1) % ids.length];
    H.Audio.sfx('click'); H.toast(p.gadget ? `🔫 ${H.GADGET[p.gadget].name} equipped — Attack fires, aim with the camera` : 'Gadget put away');
    document.body.classList.toggle('aiming', !!p.gadget && p.idx === 0);
  };
  function aimDir(p) {
    if (p.idx === 0 && H.cameras[0]) { const cam = H.cameras[0]; const f = new V(); cam.getWorldDirection(f); const tgt = cam.position.clone().addScaledVector(f, 80); const o = new V(p.pos.x, p.pos.y + p.height * 0.75, p.pos.z); return { o, d: tgt.sub(o).normalize() }; }
    return { o: new V(p.pos.x, p.pos.y + p.height * 0.75, p.pos.z), d: new V(Math.sin(p.yaw), 0.05, Math.cos(p.yaw)).normalize() };
  }
  H.fireGadget = function (p) {
    const g = H.GADGET[p.gadget]; if (!g || (p.cd.gun || 0) > 0) return; p.cd.gun = g.rate; p.atkAnim = 0.15;
    const { o, d } = aimDir(p); o.addScaledVector(d, p.radius + 0.6);
    if (g.id === 'gust') { gust(p, o, d); netShot('gust', o, d); return; }
    const n = g.pellets || 1;
    for (let i = 0; i < n; i++) { const dd = d.clone(); if (n > 1) { dd.x += (Math.random() - 0.5) * 0.18; dd.y += (Math.random() - 0.5) * 0.12; dd.z += (Math.random() - 0.5) * 0.18; dd.normalize(); } H.spawnShot(g.id, o, dd, p); }
    netShot(g.id, o, d);
    H.Audio.sfx(g.id === 'rocket' ? 'swoosh' : g.id === 'shotgun' ? 'smash' : g.id === 'tranq' ? 'spit' : 'click', 0.7);
    if (g.id === 'blaster') H.Audio.sfx('bonk', 0.25);
  };
  function netShot(type, o, d) { if (H.Net && H.Net.online) { const r = v => Math.round(v * 100) / 100; H.Net.event('sh', type, r(o.x), r(o.y), r(o.z), r(d.x), r(d.y), r(d.z)); } }
  H.remoteShot = function (from, type, o, d) {
    if (!H.GADGET[type]) return; if (type === 'gust') return gust(from, o, d, true);
    const n = H.GADGET[type].pellets || 1; for (let i = 0; i < n; i++) { const dd = d.clone(); if (n > 1) { dd.x += (Math.random() - 0.5) * 0.18; dd.z += (Math.random() - 0.5) * 0.18; dd.normalize(); } H.spawnShot(type, o, dd, from, true); }
  };
  H.spawnShot = function (type, o, d, owner, remote) {
    const g = H.GADGET[type]; let mesh;
    if (type === 'rocket') { mesh = new THREE.Group(); const b = H.mesh('cyl', '#d8d8d8', 0.35, 1.4, 0.35); b.rotation.x = Math.PI / 2; mesh.add(b); mesh.add(H.mesh('cone', '#d8261a', 0.36, 0.5, 0.36, 0, 0, 0.9)); mesh.children[1].rotation.x = Math.PI / 2; }
    else if (type === 'shotgun') mesh = H.mesh('box', '#e8c45a', 0.45, 0.3, 0.3);
    else if (type === 'tranq') mesh = H.mesh('cyl', '#7affd0', 0.08, 0.6, 0.08, 0, 0, 0, { emissive: '#2a8a6a' });
    else { const c = PAINT[Math.floor(Math.random() * PAINT.length)]; mesh = H.mesh('sphere', c, 0.32, 0.32, 0.32, 0, 0, 0, { emissive: c, emissiveIntensity: 0.4 }); mesh.userData.c = c; }
    mesh.position.copy(o); mesh.lookAt(o.clone().add(d)); H.scene.add(mesh);
    H.shots.push({ type, mesh, pos: mesh.position, vel: d.clone().multiplyScalar(g.speed), owner, remote, life: type === 'shotgun' ? 0.55 : 3, interior: owner && owner.interior });
  };
  function splat(x, y, z, c) { H.fx.burst(x, y, z, new THREE.Color(c || '#ff3a6a'), 10, 4, 0.25); }
  const tmpP = [];
  function hitThing(s, x, y, z, rad) {
    // returns true if the shot struck something
    const g = s.type, dir = s.vel.clone().normalize(), pow = g === 'shotgun' ? 16 : g === 'blaster' ? 12 : g === 'tranq' ? 4 : 30;
    for (const n of H.NPCs.near(x, z, rad + 1)) { if (Math.abs(n.pos.y + n.height * 0.5 - y) > n.height * 0.7 + rad) continue;
      if (g === 'tranq') n.sleep(20); else n.knock(dir.x * pow, pow * 0.5 + 3, dir.z * pow, s.owner && s.owner.isPlayer ? s.owner : null); n.provoke && n.provoke(s.owner); return true; }
    H.propsNear(x, z, rad + 1, tmpP); for (const p of tmpP) if (Math.abs(p.pos.y - y) < p.r + rad) { H.pushProp(p, dir.x * pow, pow * 0.4, dir.z * pow, s.owner); if (g === 'shotgun' && p.breakAt < 40) H.breakProp(p, s.owner); return true; }
    for (const c of H.traffic) if (!c.wrecked && H.dist2(c.pos.x, c.pos.z, x, z) < 6 && Math.abs(c.pos.y + 1 - y) < 2.5) { c.hp = (c.hp === undefined ? 40 : c.hp) - (g === 'shotgun' ? 6 : 5); c.stop = 2; if (c.hp <= 0) c.wreck(dir.x * 10, 10, dir.z * 10, s.owner && s.owner.isPlayer ? s.owner : null, true); else H.Audio.sfx('bonk', 0.4); return true; }
    for (const v of H.vehicles) { const r = v.radius + rad; if (H.dist2(v.pos.x, v.pos.z, x, z) < r * r && y > v.pos.y - 1 && y < v.pos.y + v.def.size[1] + 1) { v.damage(g === 'rocket' ? 70 : g === 'shotgun' ? 5 : g === 'blaster' ? 4 : 2, s.owner); return true; } }
    for (const a of H.air) if (!a.down && a.pos.distanceTo(new V(x, y, z)) < a.r + rad) { a.hit(g === 'shotgun' ? 8 : 6, s.owner); return true; }
    if (!s.remote) for (const r of H.remotes || []) if (r.root.visible && !r.vehModel && H.dist2(r.pos.x, r.pos.z, x, z) < 1.6 && y > r.pos.y - 0.5 && y < r.pos.y + r.height + 0.5) { if (g !== 'tranq') r.knock(dir.x * pow, pow * 0.5 + 3, dir.z * pow); return true; }
    return false;
  }
  H.updateShots = function (dt) {
    for (let i = H.shots.length - 1; i >= 0; i--) {
      const s = H.shots[i]; s.life -= dt; if (s.type !== 'rocket') s.vel.y -= (s.type === 'shotgun' ? 25 : 6) * dt;
      const steps = 3; let done = s.life <= 0;
      for (let k = 0; k < steps && !done; k++) {
        s.pos.addScaledVector(s.vel, dt / steps);
        const gh = H.groundAt(s.pos.x, s.pos.z, s.pos.y, s.interior);
        if (s.pos.y < gh || (!s.interior && s.pos.y < 0 && H.terrainH(s.pos.x, s.pos.z) < 0)) { done = true; if (s.pos.y < 0.1 && !s.interior && H.terrainH(s.pos.x, s.pos.z) < 0) H.fx.splash(s.pos.x, s.pos.z); break; }
        const h = H.collideStatic(s.pos.clone(), 0.2, 0.3, s.interior); if (h.hit) { done = true; break; }
        if (hitThing(s, s.pos.x, s.pos.y, s.pos.z, s.type === 'rocket' ? 1.2 : 0.4)) { done = true; break; }
      }
      if (s.type === 'rocket') H.fx.spawn(s.pos.x, s.pos.y, s.pos.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, new THREE.Color(Math.random() < 0.5 ? '#ff8a1a' : '#8a8a8a'), 0.45, 0.5, -2);
      if (done) {
        if (s.type === 'rocket') H.explode(s.pos.x, s.pos.y, s.pos.z, 12, 46, s.owner && s.owner.isPlayer ? s.owner : null);
        else if (s.type === 'blaster') splat(s.pos.x, s.pos.y, s.pos.z, s.mesh.userData.c);
        else if (s.type === 'shotgun') H.fx.burst(s.pos.x, s.pos.y, s.pos.z, new THREE.Color('#e8c45a'), 5, 3, 0.2);
        H.scene.remove(s.mesh); H.shots.splice(i, 1);
      }
    }
  };
  function gust(p, o, d, remote) {
    H.Audio.sfx('swoosh'); H.Audio.sfx('thunder', 0.3);
    for (let i = 0; i < 40; i++) { const s = 8 + Math.random() * 30; H.fx.spawn(o.x, o.y, o.z, d.x * s + (Math.random() - 0.5) * 8, d.y * s + (Math.random() - 0.3) * 5, d.z * s + (Math.random() - 0.5) * 8, new THREE.Color('#e8f0f8'), 0.3, 0.7, 0); }
    const R = 24, cosA = 0.7, inCone = (x, y, z) => { const dx = x - o.x, dy = y - o.y, dz = z - o.z, L = Math.hypot(dx, dy, dz); return L < R && L > 0.01 && (dx * d.x + dy * d.y + dz * d.z) / L > cosA; };
    H.propsNear(o.x, o.z, R, tmpP); for (const q of tmpP.slice()) if (inCone(q.pos.x, q.pos.y, q.pos.z)) H.pushProp(q, d.x * 45 * q.mass, 18 * q.mass, d.z * 45 * q.mass, p);
    for (const n of H.NPCs.near(o.x, o.z, R)) if (inCone(n.pos.x, n.pos.y + 1, n.pos.z)) n.knock(d.x * 40, 16, d.z * 40, p && p.isPlayer ? p : null);
    for (const c of H.traffic) if (inCone(c.pos.x, c.pos.y + 1, c.pos.z)) c.wreck(d.x * 18, 12, d.z * 18, p && p.isPlayer ? p : null);
    for (const v of H.vehicles) if (!v.driver && inCone(v.pos.x, v.pos.y + 1, v.pos.z)) v.knock(d.x * 25, 10, d.z * 25);
    if (!remote) for (const r of H.remotes || []) if (r.root.visible && inCone(r.pos.x, r.pos.y + 1, r.pos.z)) r.knock(d.x * 40, 16, d.z * 40);
  }

  // ------------------------------------------------------------------ vehicle damage
  H.vehicleHp = def => ({ skate: 20, bike: 25, kart: 40, moto: 35, jetski: 40, golfcart: 40, car: 70, truck: 110, bus: 120, tractor: 90, digger: 130, boat: 70, sub: 120, hover: 80, heli: 70, plane: 60 })[def.id] || ({ car: 70, truck: 110, bus: 120, plane: 60, heli: 70 })[def.type] || 70;
  H.Vehicle.prototype.damage = function (amt, by) {
    if (this.dead) return; if (this.hp === undefined) this.hp = this.maxHp = H.vehicleHp(this.def);
    this.hp -= amt; this.lastBy = by;
    if (this.hp <= 0) this.destroy(by);
  };
  H.Vehicle.prototype.destroy = function (by) {
    if (this.dead) return; this.dead = true; this.hp = 0;
    const d = this.driver; if (d) this.exit(d, 24);
    H.explode(this.pos.x, this.pos.y + 1, this.pos.z, 10, 40, by && by.isPlayer ? by : null);
    this.m.root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color && o.material.color.multiplyScalar(0.18); if (o.material.emissive) o.material.emissive.setRGB(0, 0, 0); } });
    this.vy = 12; this.lat.set((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8); this.loose = 3; this.burn = 25; this.spd = 0;
    if (by && by.isPlayer) { H.chaos(150, 'Blew up a ' + this.def.name, by); H.stat('vehiclesDestroyed', 1); }
    H.burning.push(this);
  };
  H.burning = [];
  H.updateBurning = function (dt) {
    for (let i = H.burning.length - 1; i >= 0; i--) {
      const v = H.burning[i]; v.burn -= dt; const p = v.pos;
      if (Math.random() < 0.8) H.fx.spawn(p.x + (Math.random() - 0.5) * 2, p.y + 1 + Math.random(), p.z + (Math.random() - 0.5) * 2, 0, 3 + Math.random() * 2, 0, new THREE.Color(Math.random() < 0.4 ? '#ff8a1a' : '#4a4a4a'), 0.7, 1.2, -3);
      if (v.burn <= 0) { H.burning.splice(i, 1); const home = v.world && !v.owned ? v.home : null; const id = v.def.id; v.remove(); if (home) setTimeout(() => new H.Vehicle(H.VEHICLE[id], home.x, home.z, home.yaw), 60000); }
    }
    // smoking damaged vehicles
    for (const v of H.vehicles) if (!v.dead && v.hp !== undefined && v.hp < v.maxHp * 0.4 && Math.random() < 0.3) H.fx.spawn(v.pos.x, v.pos.y + v.def.size[1], v.pos.z, 0, 2, 0, new THREE.Color('#5a5a5a'), 0.5, 1, -1);
  };

  // ------------------------------------------------------------------ air traffic
  H.air = [];
  class Aircraft {
    constructor(id, i) {
      this.def = H.VEHICLE[id]; this.m = H.buildVehicle(this.def, H.pick(H.PAINTS)); H.scene.add(this.m.root);
      this.cx = (Math.random() - 0.5) * 1800; this.cz = (Math.random() - 0.5) * 1600 - 100; this.rad = 300 + Math.random() * 400; this.alt = id === 'heli' ? 90 + Math.random() * 60 : 150 + Math.random() * 120;
      this.ang = Math.random() * 6.28; this.dir = Math.random() < 0.5 ? 1 : -1; this.spd = id === 'heli' ? 26 : id === 'jet' ? 70 : 45; this.pos = new V(); this.vel = new V(); this.r = Math.max(...this.def.size) * 0.45; this.hp = id === 'heli' ? 30 : 40; this.down = false; this.id = id;
      this.fly(0);
    }
    fly(dt) {
      this.ang += this.dir * this.spd / this.rad * dt;
      const x = this.cx + Math.cos(this.ang) * this.rad, z = this.cz + Math.sin(this.ang) * this.rad; const y = Math.max(this.alt, H.terrainH(x, z) + 60);
      this.vel.set((x - this.pos.x) / Math.max(dt, 1e-3), (y - this.pos.y) / Math.max(dt, 1e-3), (z - this.pos.z) / Math.max(dt, 1e-3)); this.pos.set(x, y, z);
      const yaw = Math.atan2(-Math.sin(this.ang) * this.dir, Math.cos(this.ang) * this.dir);
      this.m.root.position.copy(this.pos); this.m.root.rotation.set(0, yaw, this.dir * (this.id === 'heli' ? 0.1 : 0.35), 'YXZ');
      if (this.m.rotor) this.m.rotor.rotation.y += dt * 30; if (this.m.prop) this.m.prop.rotation.z += dt * 40;
    }
    hit(dmg, by) { if (this.down) return; this.hp -= dmg; this.lastBy = by; H.fx.burst(this.pos.x, this.pos.y, this.pos.z, new THREE.Color('#ffd21a'), 6, 6, 0.3); if (this.hp <= 0) this.shootDown(by); }
    shootDown(by) {
      if (this.down) return; this.down = true; this.spin = new V((Math.random() - 0.5) * 2, (Math.random() < 0.5 ? -1 : 1) * 3, (Math.random() - 0.5) * 3); H.Audio.sfx('boom', 0.6);
      H.fx.burst(this.pos.x, this.pos.y, this.pos.z, new THREE.Color('#ff8a1a'), 30, 12, 0.6);
      if (by && by.isPlayer) { H.chaos(300, 'Shot down a ' + this.def.name + '!', by); H.addCoins(250, 'Air kill'); H.stat('aircraftDowned', 1); }
      // the pilot bails out
      const n = H.NPCs.add({ x: this.pos.x, z: this.pos.z, r: 1, type: 'tourist', temp: 1 }); n.materialize(); n.pos.copy(this.pos); n.knock(this.vel.x * 0.3, 15, this.vel.z * 0.3); setTimeout(() => (n.gone = true), 40000);
    }
    update(dt) {
      if (this.burnT !== undefined) { this.burnT -= dt; if (Math.random() < 0.9) H.fx.spawn(this.pos.x + (Math.random() - 0.5) * 3, this.pos.y + 1, this.pos.z + (Math.random() - 0.5) * 3, 0, 4, 0, new THREE.Color(Math.random() < 0.4 ? '#ff8a1a' : '#3a3a3a'), 0.9, 1.4, -3); if (this.burnT <= 0) this.respawn(); return; }
      if (!this.down) {
        this.fly(dt);
        // rammed by a flying player or aircraft
        for (const p of H.players) { const pp = p.vehicle ? p.vehicle.pos : p.pos; if (pp.distanceTo(this.pos) < this.r + (p.vehicle ? p.vehicle.radius : p.radius)) { this.shootDown(p); if (p.vehicle) p.vehicle.damage(200, p); else p.knock(this.vel.x * 0.4, 10, this.vel.z * 0.4); } }
        return;
      }
      this.vel.y -= G * dt * 0.8; this.vel.x *= 1 - 0.1 * dt; this.vel.z *= 1 - 0.1 * dt; this.pos.addScaledVector(this.vel, dt);
      const r = this.m.root; r.position.copy(this.pos); r.rotation.x += this.spin.x * dt; r.rotation.y += this.spin.y * dt; r.rotation.z += this.spin.z * dt;
      if (Math.random() < 0.95) H.fx.spawn(this.pos.x, this.pos.y, this.pos.z, 0, 1, 0, new THREE.Color(Math.random() < 0.5 ? '#ff7a1a' : '#2a2a2a'), 1, 1.6, -2);
      const g = H.groundAt(this.pos.x, this.pos.z, this.pos.y);
      const hitB = H.collideStatic(this.pos.clone(), this.r * 0.6, 2, null).hit;
      if (this.pos.y <= Math.max(g, 0) + 0.5 || hitB) {
        this.pos.y = Math.max(g, 0) + 0.5; H.explode(this.pos.x, this.pos.y, this.pos.z, 16, 55, this.lastBy && this.lastBy.isPlayer ? this.lastBy : null); H.shake(this.pos.x, this.pos.z, 1.5);
        if (g < 0) { H.fx.splash(this.pos.x, this.pos.z); this.respawnT = 1; this.burnT = 0.5; }
        else this.burnT = 20;
        r.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color && o.material.color.multiplyScalar(0.2); } });
        r.position.copy(this.pos); r.rotation.set(0.3, r.rotation.y, 1.4);
      }
    }
    respawn() { H.scene.remove(this.m.root); const i = H.air.indexOf(this); if (i >= 0) H.air.splice(i, 1); const id = this.id; setTimeout(() => H.air.push(new Aircraft(id)), 45000); }
  }
  H.initAir = function () { ['plane', 'plane', 'heli', 'heli', 'jet', 'plane'].forEach((id, i) => H.air.push(new Aircraft(id, i))); };
  H.updateAir = function (dt) { const indoors = H.players[0] && H.players[0].interior; for (const a of H.air.slice()) { a.m.root.visible = !indoors; a.update(dt); } };

  // ------------------------------------------------------------------ riding animals
  const RIDEABLE = { sheep: 1, cow: 1, pig: 1, deer: 1, bear: 1, camelwild: 1, goatwild: 1 };
  H.canRide = n => n.active && !n.isHuman && RIDEABLE[n.type] && !n.ragdoll && !n.rider && !n.asleep;
  H.mountNpc = function (p, n) {
    if (p.held) p.drop(); p.mount = n; n.rider = p; n.state = 'ridden'; p.emote = null; H.Audio.voice(n.def.voice, 1.1);
    H.toast(`🐎 Riding a ${n.animal[0]} — Interact to hop off${n.type === 'bear' ? ' (it might not like this)' : ''}`);
  };
  H.dismount = function (p, thrown) {
    const n = p.mount; if (!n) return; p.mount = null; n.rider = null; n.state = 'flee'; n.t = 3; p.parts.root.position.y = 0;
    if (thrown) { p.knock(Math.sin(n.yaw) * 14, 12, Math.cos(n.yaw) * 14); H.floatText('BUCKED OFF!', p.pos, { cls: 'big' }); }
    else { p.pos.x += Math.cos(p.yaw) * 2; p.pos.z -= Math.sin(p.yaw) * 2; }
  };
  H.updateMount = function (p, dt, inp) {
    const n = p.mount; if (!n.active || n.ragdoll) return H.dismount(p);
    const sy = Math.sin(inp.camYaw), cy = Math.cos(inp.camYaw); let wx = -inp.mx * cy + inp.mz * sy, wz = inp.mx * sy + inp.mz * cy; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    const spd = Math.max(p.def.stats.spd, n.def.stats.spd * 1.25) * (inp.sprint ? 1.7 : 1);
    p.vel.x += (wx * spd - p.vel.x) * Math.min(1, 6 * dt); p.vel.z += (wz * spd - p.vel.z) * Math.min(1, 6 * dt);
    if (wl > 0.1) p.yaw = H.angLerp(p.yaw, Math.atan2(wx, wz), Math.min(1, dt * 6));
    p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt; H.collideStatic(p.pos, n.radius, n.height, p.interior);
    if (inp.jumpPressed && p.onGround) { p.vel.y = 10; p.onGround = false; }
    p.vel.y -= G * dt; p.pos.y += p.vel.y * dt; const g = H.groundAt(p.pos.x, p.pos.z, p.pos.y + 1, p.interior); if (p.pos.y <= g) { p.pos.y = g; p.vel.y = 0; p.onGround = true; }
    n.pos.copy(p.pos); n.yaw = p.yaw; n.model.position.copy(n.pos); n.model.rotation.set(0, n.yaw, 0);
    const s = Math.sin(performance.now() * 0.012 * (1 + p.speed * 0.1)) * Math.min(1, p.speed / 4); n.parts.legs.forEach((l, i) => (l.rotation.x = s * ((i === 0 || i === 3) ? 1 : -1)));
    // trample people
    for (const m of H.NPCs.near(p.pos.x, p.pos.z, n.radius + 1)) if (m !== n && !m.ragdoll && p.speed > 8) m.knock(p.vel.x, 8, p.vel.z, p);
    p.root.position.set(p.pos.x, p.pos.y + n.parts.bodyTop * 0.9, p.pos.z); p.root.rotation.set(0, p.yaw, 0); p.animateIdle(dt);
    if (n.type === 'bear' || n.type === 'goatwild') { p.buckT = (p.buckT || 0) + dt; if (p.buckT > 4 && Math.random() < dt * 0.4) { p.buckT = 0; H.Audio.voice(n.def.voice, 0.8); H.dismount(p, true); } }
    if (inp.interact) H.dismount(p);
    if (inp.attack) { H.Audio.voice(n.def.voice); n.parts.rig.rotation.x = -0.4; setTimeout(() => n.parts && (n.parts.rig.rotation.x = 0), 300); }
  };

  // ------------------------------------------------------------------ talking to people
  const TALK = ['Lovely weather for headbutting.', 'You\'re that goat from the news!', 'My cousin swears there\'s a lab under Rustworks.', 'Have you tried the Wobble Coaster? Don\'t eat first.', 'Planes keep falling out of the sky lately. Weird.', 'If you find a gnome, it\'s not mine.', 'The bears in the pines HATE being ridden.', 'Some fella at the pier sells the best fish.', 'Psst. The trampoline in the park goes REALLY high.', 'I heard the observatory has a view of everything.'];
  H.talkTo = function (p, n) {
    n.state = 'idle'; n.t = 4; n.yaw = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z);
    const r = Math.random();
    if (r < 0.15) { const tip = 20 + Math.floor(Math.random() * 80); H.floatText('Here, buy yourself a hat.', n.pos, { follow: n, cls: 'speech', life: 3, rise: 0 }); H.addCoins(tip, 'Tip from a stranger'); }
    else if (r < 0.35) { const open = H.MISSIONS.filter(m => !H.state.missions[m.id] && m.type !== 'secret').sort((a, b) => H.dist2(a.x, a.z, n.pos.x, n.pos.z) - H.dist2(b.x, b.z, n.pos.x, n.pos.z))[0]; if (open) { H.floatText('Hey, could you help me with something?', n.pos, { follow: n, cls: 'speech', life: 3, rise: 0 }); setTimeout(() => H.ui.missionOffer(open), 600); } }
    else H.floatText(H.pick(TALK), n.pos, { follow: n, cls: 'speech', life: 3.5, rise: 0 });
    H.Audio.sfx('click');
  };

  // ------------------------------------------------------------------ trees you can shake
  const shaken = new Map();
  H.shakeTrees = function (p, reach) {
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), x = p.pos.x + fx * (p.radius + 1), z = p.pos.z + fz * (p.radius + 1); const out = []; H.colGrid.query(x, z, reach, out);
    for (const o of out) {
      if (!o.circle || o.r > 3 || Math.hypot(o.x - x, o.z - z) > reach + o.r) continue; if (Math.abs(o.top - p.pos.y) > 14 && o.top - p.pos.y < 0) continue;
      const k = o.x.toFixed(0) + ',' + o.z.toFixed(0); const t = shaken.get(k) || 0; if (performance.now() - t < 20000) { H.fx.burst(o.x, p.pos.y + 4, o.z, new THREE.Color('#4a8a34'), 8, 3, 0.25, 6); continue; }
      shaken.set(k, performance.now());
      for (let i = 0; i < 18; i++) H.fx.spawn(o.x + (Math.random() - 0.5) * 5, p.pos.y + 4 + Math.random() * 4, o.z + (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 2, -1, (Math.random() - 0.5) * 2, new THREE.Color(Math.random() < 0.5 ? '#4a8a34' : '#7ab83a'), 0.35, 2, 3);
      const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { const a = H.spawnProp('apple', o.x + (Math.random() - 0.5) * 3, p.pos.y + 6, o.z + (Math.random() - 0.5) * 3, { temp: true }); if (a) { H.wakeProp(a); setTimeout(() => H.props.includes(a) && H.removeProp(a), 60000); } }
      if (Math.random() < 0.06) { H.addCoins(100, 'Something fell out of the tree'); }
      H.Audio.sfx('swoosh', 0.5); return true;
    }
    return false;
  };
  H.PROP_TYPES.apple = ['sphere', [0.5, 0.5, 0.5], '#d8261a', 0.25, 0.2, 0.3, 8, 1, { splat: '#ffe8c0' }];

  // ------------------------------------------------------------------ portal to the Scentline world
  H.travelToScentline = function () {
    H.ui.toast('🌀 Travelling to Scentline…'); H.Audio.sfx('teleport');
    try { if (H.Save.ready) H.Save.save(); } catch (e) { }
    setTimeout(() => { location.href = 'scentline/'; }, 500);
  };
  H.buildPortal = function () {
    const x = 60, z = 60, y = H.groundAt(x, z, 999); const g = new THREE.Group(); g.position.set(x, y, z);
    const ring = H.mesh('torus', '#8fcf5a', 7, 7, 6, 0, 4.2, 0, { emissive: '#4a8a2a', emissiveIntensity: 0.9 }); g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3, 40), new THREE.MeshBasicMaterial({ color: '#f0a93a', transparent: true, opacity: 0.55, side: THREE.DoubleSide })); disc.position.y = 4.2; g.add(disc);
    g.add(H.mesh('cyl', '#3a4a30', 5, 0.4, 5, 0, 0.2, 0));
    H.scene.add(g); H.makeSign('SCENTLINE →', x, y + 9, z, 8, 1.4, '#0b0f0a', '#f0a93a');
    H.anims.push((dt, t) => { ring.rotation.z += dt * 0.8; disc.material.opacity = 0.4 + Math.sin(t * 3) * 0.15; if (Math.random() < dt * 20) H.fx.spawn(x + (Math.random() - 0.5) * 5, y + 1.5 + Math.random() * 5, z, 0, 1.5, 0, new THREE.Color(Math.random() < 0.5 ? '#f0a93a' : '#8fcf5a'), 0.25, 1, -1); });
    H.addInteract({ x, y: y + 1, z, r: 5, label: '🌀 Travel to Scentline (a second world)', kind: 'custom', fn: () => H.travelToScentline() });
  };
})();
