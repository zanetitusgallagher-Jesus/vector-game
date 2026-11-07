// Hoofquake — the merged arsenal: Scentline's 30 guns (hitscan with pierce / chain / knockback, and rockets),
// its gear, vehicle weapon upgrades, and the battle tank, fighter jet and starship.
'use strict';
(function () {
  const V = THREE.Vector3;
  const SL = [
    ['pistol', 'Pistol', 16, 0.26, 1, 0.008, 90, 0, '#ffd27a'], ['smg', 'SMG', 7, 0.075, 1, 0.03, 80, 1, '#ffd27a'], ['pump', 'Pump Shotgun', 9, 0.85, 8, 0.075, 38, 0, '#ffd27a'],
    ['rifle', 'Sniper Rifle', 70, 1.0, 1, 0.0015, 240, 0, '#ffe8a0'], ['minigun', 'Minigun', 5, 0.04, 1, 0.05, 85, 1, '#ffd27a'],
    ['plasma', 'Plasma Pistol', 26, 0.2, 1, 0.006, 120, 0, '#5be3ff'], ['pulse', 'Pulse Rifle', 11, 0.065, 1, 0.02, 130, 1, '#7aa8ff'], ['laser', 'Laser Repeater', 5, 0.03, 1, 0.01, 170, 1, '#ff3a3a'],
    ['rail', 'Railgun', 150, 1.3, 1, 0, 320, 0, '#c79bff', { pierce: 4 }], ['ion', 'Ion Scattergun', 8, 0.7, 14, 0.1, 45, 0, '#6dffb0'], ['sonic', 'Sonic Blaster', 6, 0.5, 1, 0.01, 60, 0, '#e8f4ff', { knock: 16 }],
    ['grav', 'Gravity Cannon', 12, 0.9, 1, 0.01, 55, 0, '#a06bff', { knock: 30 }], ['arc', 'Arc Caster', 30, 0.45, 1, 0.01, 70, 0, '#7ad6ff', { chain: 3 }], ['nova', 'Nova Launcher', 0, 0.9, 1, 0, 200, 0, '#ff8a3a', { rocket: 1, blast: 10, speed: 42, grav: 14 }],
    ['quantum', 'Quantum Sniper', 220, 1.6, 1, 0, 420, 0, '#ffd6ff', { pierce: 6 }], ['torch', 'Plasma Torch', 4, 0.05, 1, 0.12, 16, 1, '#ff9a3a'], ['plaunch', 'Plasma Launcher', 0, 1.1, 1, 0, 240, 0, '#c04aff', { rocket: 1, blast: 13, speed: 80 }],
    ['mdriver', 'Mass Driver', 95, 0.8, 1, 0.002, 280, 0, '#e0e8ff', { pierce: 3, knock: 18, world: 'selene' }], ['dust', 'Dust Blaster', 5, 0.05, 1, 0.07, 70, 1, '#cfd8ff', { world: 'selene' }],
    ['magma', 'Magma Cannon', 0, 1.2, 1, 0, 220, 0, '#ff5a1a', { rocket: 1, blast: 16, speed: 55, grav: 6, world: 'ares' }], ['ember', 'Ember Repeater', 9, 0.08, 1, 0.025, 110, 1, '#ff7a3a', { world: 'ares' }],
    ['spore', 'Spore Gun', 14, 0.35, 3, 0.06, 70, 0, '#9aff5a', { chain: 2, world: 'zeph' }], ['void', 'Void Lance', 260, 1.8, 1, 0, 500, 0, '#b04aff', { pierce: 8, world: 'zeph' }],
    ['rainbow', 'Rainbow Beam', 8, 0.03, 1, 0.008, 150, 1, '#ff9aff', { pierce: 2, world: 'mythos' }], ['starlight', 'Starlight Bow', 120, 0.7, 1, 0.001, 300, 0, '#fff2a0', { pierce: 2, knock: 6, world: 'mythos' }],
    ['hack', 'Hack Rifle', 20, 0.12, 1, 0.015, 130, 1, '#4af0ff', { chain: 4, world: 'cyber' }], ['emp', 'EMP Cannon', 0, 1.0, 1, 0, 200, 0, '#4a8aff', { rocket: 1, blast: 20, speed: 36, world: 'cyber' }],
    ['inferno', 'Inferno Thrower', 6, 0.04, 1, 0.14, 22, 1, '#ff5a1a', { world: 'pyros' }], ['meteor', 'Meteor Launcher', 0, 1.4, 1, 0, 260, 0, '#ff6a2a', { rocket: 1, blast: 22, speed: 30, grav: 20, world: 'pyros' }],
  ];
  for (const [id, name, dmg, rate, pellets, spread, range, auto, tr, ex] of SL) {
    const w = Object.assign({ id, name, dmg, rate, pellets, spread, range, auto, tr, sl: 1, price: 0 }, ex || {});
    w.desc = w.rocket ? `Explosive shells, blast radius ${w.blast} m.` : `${dmg} damage${pellets > 1 ? ' × ' + pellets : ''}${w.pierce ? ', pierces ' + w.pierce + ' targets' : ''}${w.chain ? ', chains to ' + w.chain + ' more' : ''}${w.knock ? ', heavy knockback' : ''}${auto ? ', automatic' : ''}.` + (w.world ? ' Forged on ' + w.world[0].toUpperCase() + w.world.slice(1) + '.' : '');
    H.GADGETS.push(w); H.GADGET[id] = w;
  }
  H.GEAR = [
    ['vest', 'Nano vest', 'Take 35% less damage'], ['shield', 'Shield generator', 'Absorbs 60 damage, recharges'], ['nano', 'Nanobots', 'Heal 3 HP/s out of combat'], ['cell', 'Energy cell', 'Stamina refills fast'],
    ['boots', 'Exo boots', '+22% move speed'], ['magnet', 'Coin magnet', 'Pulls coins and stars from far away'], ['stealth', 'Ghost suit', 'Crimes raise your wanted level 55% slower'], ['kinetic', 'Kinetic armor', 'No knockback, 10% less damage'],
    ['medic', 'Auto-medkit', 'Heals 60 when nearly knocked out (once a minute)'], ['springs', 'Spring legs', 'Jump 50% higher'], ['lowg', 'Moon boots', 'Jump almost twice as high'], ['bulwark', 'Martian plating', 'Take 40% less damage'],
    ['veil', 'Void veil', 'Crimes raise your wanted level 50% slower'], ['charm', 'Unicorn charm', 'Heals 5 HP/s all the time'], ['cyber', 'Cyber legs', '+30% sprint speed'], ['aegis', 'Magma aegis', '50% less damage and no knockback'],
  ].map(([id, name, desc]) => ({ id, name, desc }));

  // ------------------------------------------------------------------ tracers
  const tracers = [];
  H.tracer = function (a, b, col) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]); const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col || '#ffd27a', transparent: true, opacity: 0.95 }));
    m.frustumCulled = false; H.scene.add(m); tracers.push({ m, t: 0.09 });
  };
  H.updateTracers = function (dt) { for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.t -= dt; t.m.material.opacity = Math.max(0, t.t / 0.09); if (t.t <= 0) { H.scene.remove(t.m); t.m.geometry.dispose(); tracers.splice(i, 1); } } };

  // ------------------------------------------------------------------ hitscan
  const tmpProps = [], pv = new V();
  function rayHit(o, d, range, owner, skip, interior) {
    for (let t = 0.6; t < range; t += 0.7) {
      pv.copy(o).addScaledVector(d, t); const x = pv.x, y = pv.y, z = pv.z;
      if (y < H.groundAt(x, z, y + 0.5, interior) - 0.05) return { t, kind: 'ground' };
      if (H.collideStatic(pv.clone(), 0.05, 0.1, interior).hit) return { t, kind: 'wall' };
      for (const n of H.NPCs.near(x, z, 1)) { if (skip.has(n) || n.dead) continue; if (y > n.pos.y - 0.3 && y < n.pos.y + n.height + 0.3) return { t, kind: 'npc', o: n }; }
      for (const r of H.remotes || []) { if (skip.has(r) || !r.root.visible) continue; if (H.dist2(r.pos.x, r.pos.z, x, z) < (r.radius + 0.3) ** 2 && y > r.pos.y - 0.3 && y < r.pos.y + r.height) return { t, kind: 'remote', o: r }; }
      if (owner && !owner.isPlayer) for (const p of H.players) { if (H.dist2(p.pos.x, p.pos.z, x, z) < (p.radius + 0.3) ** 2 && y > p.pos.y && y < p.pos.y + p.height) return { t, kind: 'player', o: p }; }
      H.propsNear(x, z, 1, tmpProps); for (const q of tmpProps) if (!skip.has(q) && Math.abs(q.pos.y - y) < q.r + 0.2 && H.dist2(q.pos.x, q.pos.z, x, z) < q.r * q.r) return { t, kind: 'prop', o: q };
      for (const v of H.vehicles) { if (skip.has(v) || v.driver === owner || v === (owner && owner.vehicle)) continue; if (H.dist2(v.pos.x, v.pos.z, x, z) < v.radius * v.radius && y > v.pos.y - 0.5 && y < v.pos.y + v.def.size[1] + 0.5) return { t, kind: 'veh', o: v }; }
      for (const c of H.traffic) { if (c.wrecked || skip.has(c)) continue; if (H.dist2(c.pos.x, c.pos.z, x, z) < 5 && y < c.pos.y + c.def.size[1] + 0.5) return { t, kind: 'car', o: c }; }
      for (const a of H.air) { if (a.down) continue; if (a.pos.distanceToSquared(pv) < a.r * a.r) return { t, kind: 'air', o: a }; }
    }
    return { t: range, kind: 'none' };
  }
  function applyHit(h, w, d, owner, dmg) {
    const by = owner && owner.isPlayer ? owner : null, kn = w.knock || 0, o = h.o;
    if (h.kind === 'npc') { if (kn || dmg >= 20) o.knock(d.x * (kn + dmg * 0.15), 3 + kn * 0.4, d.z * (kn + dmg * 0.15), by, dmg); else o.hurt(dmg, by); o.provoke && o.provoke(by); }
    if (h.kind === 'remote') o.knock(d.x * (kn + 3), 2 + kn * 0.3, d.z * (kn + 3), dmg);
    if (h.kind === 'player') o.knock(d.x * (kn + 2), 2, d.z * (kn + 2), dmg);
    if (h.kind === 'prop') { H.pushProp(o, d.x * (dmg * 0.3 + kn), dmg * 0.1 + kn * 0.3, d.z * (dmg * 0.3 + kn), owner); if (dmg > 25 && o.breakAt < 999) H.breakProp(o, owner); }
    if (h.kind === 'veh') o.damage(dmg * 0.6, owner);
    if (h.kind === 'car') { o.hp = (o.hp === undefined ? 50 : o.hp) - dmg * 0.6; o.stop = 2; if (o.hp <= 0) o.wreck(d.x * 8, 8, d.z * 8, by, true); }
    if (h.kind === 'air') o.hit(dmg * 0.4, owner);
  }
  function fireHitscan(w, o, dir, owner, interior, visualOnly) {
    for (let k = 0; k < (w.pellets || 1); k++) {
      const d = dir.clone(); if (w.spread) { d.x += (Math.random() - 0.5) * w.spread * 2; d.y += (Math.random() - 0.5) * w.spread * 2; d.z += (Math.random() - 0.5) * w.spread * 2; d.normalize(); }
      const skip = new Set(owner ? [owner] : []); let start = o.clone(), left = (w.pierce || 0) + 1, end = null, firstNpc = null;
      while (left-- > 0) {
        const h = rayHit(start, d, w.range, owner, skip, interior); end = start.clone().addScaledVector(d, h.t);
        if (h.kind === 'none' || h.kind === 'ground' || h.kind === 'wall') { if (h.kind !== 'none' && w.dmg >= 12) H.fx.burst(end.x, end.y, end.z, new THREE.Color(w.tr), 4, 3, 0.15); break; }
        if (!(visualOnly && (h.kind === 'player' || h.kind === 'remote'))) applyHit(h, w, d, owner, w.dmg);
        if (h.kind === 'npc' && !firstNpc) firstNpc = h.o; skip.add(h.o); start = end.clone();
        if (!w.pierce) break;
      }
      H.tracer(o, end, w.tr);
      if (w.chain && firstNpc) { let from = firstNpc; const hitSet = new Set([firstNpc]); for (let c = 0; c < w.chain; c++) { let best = null, bd = 144; for (const n of H.NPCs.near(from.pos.x, from.pos.z, 12)) { if (hitSet.has(n) || n.dead) continue; const dd = H.dist2(n.pos.x, n.pos.z, from.pos.x, from.pos.z); if (dd < bd) { bd = dd; best = n; } } if (!best) break; hitSet.add(best); H.tracer(new V(from.pos.x, from.pos.y + 1, from.pos.z), new V(best.pos.x, best.pos.y + 1, best.pos.z), w.tr); best.hurt(w.dmg * 0.6, owner && owner.isPlayer ? owner : null); from = best; } }
    }
  }
  // rockets
  const rockets = [];
  function fireRocket(w, o, d, owner, interior) {
    const m = new THREE.Group(); const b = H.mesh('cyl', '#d8d8d8', 0.35, 1.2, 0.35); b.rotation.x = Math.PI / 2; m.add(b); m.add(H.mesh('sphere', w.tr, 0.5, 0.5, 0.5, 0, 0, 0.6, { emissive: w.tr }));
    m.position.copy(o); m.lookAt(o.clone().add(d)); H.scene.add(m); rockets.push({ w, m, pos: m.position, vel: d.clone().multiplyScalar(w.speed || 60), owner, life: 5, interior });
  }
  H.updateRockets = function (dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.life -= dt; r.vel.y -= (r.w.grav || 0) * dt; r.pos.addScaledVector(r.vel, dt); r.m.lookAt(r.pos.clone().add(r.vel));
      H.fx.spawn(r.pos.x, r.pos.y, r.pos.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, new THREE.Color(Math.random() < 0.5 ? r.w.tr : '#8a8a8a'), 0.45, 0.5, -2);
      let hit = r.life <= 0 || r.pos.y < H.groundAt(r.pos.x, r.pos.z, r.pos.y, r.interior) || H.collideStatic(r.pos.clone(), 0.3, 0.5, r.interior).hit;
      if (!hit) { const h = rayHit(r.pos, r.vel.clone().normalize(), 1.2, r.owner, new Set([r.owner]), r.interior); if (h.kind !== 'none') hit = true; }
      if (hit) { const by = r.owner && r.owner.isPlayer ? r.owner : null; H.explode(r.pos.x, r.pos.y, r.pos.z, r.w.blast || 10, (r.w.blast || 10) * 3.4, by); for (const a of H.air) if (!a.down && a.pos.distanceTo(r.pos) < (r.w.blast || 10) + a.r) a.hit(999, r.owner); H.scene.remove(r.m); rockets.splice(i, 1); }
    }
  };
  // fire a Scentline weapon for a player (or remote copy)
  H.fireSL = function (p, w, o, d, remote) {
    if (w.rocket) fireRocket(w, o, d, p, p.interior); else fireHitscan(w, o, d, p, p.interior, remote);
    if (!remote) { H.Audio.sfx(w.rocket ? 'swoosh' : w.dmg >= 60 ? 'laser' : w.pellets > 1 ? 'smash' : 'click', w.auto ? 0.35 : 0.7); if (w.id === 'torch' || w.id === 'inferno') H.Audio.sfx('fire', 0.4); }
  };
  // hook the gadget system so the Scentline guns fire through it
  const origFire = H.fireGadget;
  H.fireGadget = function (p) {
    const w = H.GADGET[p.gadget]; if (!w || !w.sl) return origFire(p);
    if ((p.cd.gun || 0) > 0) return; p.cd.gun = w.rate; p.atkAnim = 0.12;
    let o, d; if (p.idx === 0 && H.cameras[0]) { const cam = H.cameras[0]; d = new V(); cam.getWorldDirection(d); o = new V(p.pos.x, p.pos.y + p.height * 0.75, p.pos.z); const tgt = cam.position.clone().addScaledVector(d, Math.min(w.range, 90)); d = tgt.sub(o).normalize(); } else { o = new V(p.pos.x, p.pos.y + p.height * 0.75, p.pos.z); d = new V(Math.sin(p.yaw), 0.04, Math.cos(p.yaw)).normalize(); }
    o.addScaledVector(d, p.radius + 0.5); H.fireSL(p, w, o, d);
    if (H.Net && H.Net.online) { const r = v => Math.round(v * 100) / 100; H.Net.event('sh', w.id, r(o.x), r(o.y), r(o.z), r(d.x), r(d.y), r(d.z)); }
    if (!w.auto || Math.random() < 0.2) H.heat(0.04 * (H.hasGear('stealth') ? 0.45 : 1) * (H.hasGear('veil') ? 0.5 : 1));
  };
  const origRemote = H.remoteShot;
  H.remoteShot = function (from, type, o, d) { const w = H.GADGET[type]; if (w && w.sl) return H.fireSL(from, w, o, d, true); return origRemote(from, type, o, d); };
  // cycle through the loadout instead of every gun in the game
  H.cycleGadget = function (p) {
    const ids = [null, ...(H.state.loadout || []).filter(id => H.GADGET[id])]; const i = ids.indexOf(p.gadget || null); p.gadget = ids[(i + 1) % ids.length];
    H.Audio.sfx('click'); H.toast(p.gadget ? `🔫 ${H.GADGET[p.gadget].name} — Attack fires, aim with the camera` : 'Weapon put away');
    document.body.classList.toggle('aiming', !!p.gadget && p.idx === 0);
  };

  // ------------------------------------------------------------------ vehicles: upgrades, mounted guns, tank, fighter, starship
  H.VUPS = [['eng', 'Engine tuning', 5], ['hand', 'Handling', 5], ['tir', 'Grip tires', 3], ['boost', 'Nitro', 3], ['arm', 'Armor plating', 5], ['bump', 'Ram bumper', 3], ['gun', 'Mounted guns (Attack)', 3], ['rock', 'Rocket pods (Special)', 2], ['glow', 'Underglow', 1]];
  const VP = H.Vehicle.prototype;
  const origDamage = VP.damage; VP.damage = function (amt, by) { const a = (this.upg && this.upg.arm) || 0; amt *= 1 - a * 0.14; if (this.def.type === 'tank') amt *= 0.35; return origDamage.call(this, amt, by); };
  const CAR_GUN = { id: 'cargun', name: 'Mounted guns', dmg: 9, rate: 0.09, pellets: 1, spread: 0.02, range: 110, tr: '#ffd27a' };
  const CANNON = { id: 'cannon', name: 'Tank cannon', rocket: 1, blast: 12, speed: 70, tr: '#ffb84a' };
  const MISSILE = { id: 'missile', name: 'Missile', rocket: 1, blast: 11, speed: 110, tr: '#ff6a3a' };
  const LASER = { id: 'shiplaser', name: 'Ship lasers', dmg: 22, rate: 0.12, pellets: 1, spread: 0.01, range: 260, tr: '#4af0ff' };
  const origDrive = VP.drive;
  VP.drive = function (dt, inp, p) {
    origDrive.call(this, dt, inp, p); if (!p || this.dead) return;
    this.wcd = Math.max(0, (this.wcd || 0) - dt); this.rcd = Math.max(0, (this.rcd || 0) - dt);
    const fwd = new V(Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).normalize();
    const nose = this.pos.clone().addScaledVector(fwd, this.def.size[2] / 2 + 1.5); nose.y += this.def.size[1] * 0.5;
    const t = this.def;
    if (t.type === 'tank') {
      const tur = this.m.turret; if (tur && p.idx === 0) { tur.rotation.y = H.angLerp(tur.rotation.y, p.cam.yaw - this.yaw, Math.min(1, dt * 4)); }
      if (inp.attack && this.wcd <= 0) { this.wcd = 1.4; const ang = this.yaw + (tur ? tur.rotation.y : 0); const d = new V(Math.sin(ang), 0.03, Math.cos(ang)); const o = this.pos.clone().addScaledVector(d, 5); o.y += 2.3; fireRocket(CANNON, o, d, p, null); H.Audio.sfx('boom', 0.5); H.shake(this.pos.x, this.pos.z, 0.5); H.heat(0.3); }
    } else if (t.starship) {
      if ((inp.attack || inp.fireHeld) && this.wcd <= 0) { this.wcd = LASER.rate; for (const s of [-1, 1]) { const o = nose.clone(); o.x += Math.cos(this.yaw) * s * 2.5; o.z -= Math.sin(this.yaw) * s * 2.5; fireHitscan(LASER, o, fwd, p, null); } H.Audio.sfx('laser', 0.3); }
      if (inp.special) H.ui.openStarMap();
    } else if (t.guns) {
      if ((inp.attack || inp.fireHeld) && this.wcd <= 0) { this.wcd = 0.07; for (const s of [-1, 1]) { const o = nose.clone(); o.x += Math.cos(this.yaw) * s * 1.5; o.z -= Math.sin(this.yaw) * s * 1.5; fireHitscan(CAR_GUN, o, fwd, p, null); } H.Audio.sfx('click', 0.3); }
      if (inp.special && this.rcd <= 0) { this.rcd = 1.2; fireRocket(MISSILE, nose, fwd, p, null); H.Audio.sfx('swoosh'); }
    } else if (this.upg) {
      const g = this.upg.gun || 0, r = this.upg.rock || 0;
      if (g && (inp.attack || inp.fireHeld) && this.wcd <= 0) { this.wcd = 0.14 / g; const w = Object.assign({}, CAR_GUN, { dmg: 6 + g * 4, tr: g >= 3 ? '#5be3ff' : '#ffd27a' }); for (const s of [-1, 1]) { const o = nose.clone(); o.x += Math.cos(this.yaw) * s * 0.8; o.z -= Math.sin(this.yaw) * s * 0.8; fireHitscan(w, o, fwd, p, null); } H.Audio.sfx('click', 0.3); H.heat(0.02); }
      if (r && inp.special && this.rcd <= 0) { this.rcd = 2.2 / r; for (let k = 0; k < r * 2; k++) setTimeout(() => { if (!this.dead) fireRocket(MISSILE, nose.clone(), fwd.clone(), p, null); }, k * 120); H.Audio.sfx('swoosh'); H.heat(0.2); }
    }
    if (t.id === 'police' || t.id === 'policebike') H.stat('copCars', 0);
  };
  // underglow and stat bookkeeping
  H.updateVehicleExtras = function () {
    for (const v of H.vehicles) {
      if (v.upg && v.upg.glow && !v.glow && !v.dead) { const g = new THREE.Mesh(new THREE.PlaneGeometry(v.def.size[0] + 0.6, v.def.size[2] + 0.6), new THREE.MeshBasicMaterial({ color: '#2affd0', transparent: true, opacity: 0.55, depthWrite: false })); g.rotation.x = -Math.PI / 2; g.position.y = 0.08; v.m.root.add(g); v.glow = g; }
      if (v.glow) v.glow.material.opacity = 0.35 + Math.sin(performance.now() * 0.004) * 0.15;
    }
  };
  // models for the new vehicles
  const origBuild = H.buildVehicle;
  H.buildVehicle = function (def, paint) {
    if (def.type === 'tank') {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const pm = new THREE.MeshPhongMaterial({ color: paint || def.col, shininess: 20 }); const dark = H.mat('#2a2a26');
      const box = (m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(H.G.box, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; body.add(o); return o; };
      box(pm, 3.0, 1.1, 6.8, 0, 1.2, 0); box(dark, 0.7, 1.1, 7.2, -1.55, 0.55, 0); box(dark, 0.7, 1.1, 7.2, 1.55, 0.55, 0);
      const tur = new THREE.Group(); tur.position.y = 1.75; const tt = new THREE.Mesh(H.G.box, pm); tt.scale.set(2.2, 0.9, 2.8); tt.position.y = 0.45; tur.add(tt);
      const bar = new THREE.Mesh(H.G.cyl, dark); bar.scale.set(0.3, 3.6, 0.3); bar.rotation.x = Math.PI / 2; bar.position.set(0, 0.5, 3); tur.add(bar); body.add(tur);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      return { root: g, body, wheels: [], rotor: null, prop: null, paintMat: pm, turret: tur };
    }
    if (def.starship) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const pm = new THREE.MeshPhongMaterial({ color: paint || def.col, shininess: 110, specular: 0xffffff });
      const hull = new THREE.Mesh(H.G.capsule, pm); hull.scale.set(2.2, 4, 1.6); hull.rotation.x = Math.PI / 2; hull.position.y = 1.4; body.add(hull);
      const wing = new THREE.Mesh(H.G.box, pm); wing.scale.set(8, 0.2, 3); wing.position.set(0, 1.2, -1.5); body.add(wing);
      const cock = new THREE.Mesh(H.G.sphere, new THREE.MeshPhongMaterial({ color: '#4af0ff', transparent: true, opacity: 0.7, shininess: 120 })); cock.scale.set(1.2, 0.8, 2); cock.position.set(0, 2.1, 1.8); body.add(cock);
      for (const s of [-1, 1]) { const e = H.mesh('sphere', '#4af0ff', 0.9, 0.9, 0.9, s * 0.9, 1.4, -4.6, { emissive: '#4af0ff' }); body.add(e); }
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      return { root: g, body, wheels: [], rotor: null, prop: null, paintMat: pm };
    }
    if (def.id === 'fighter') { const m = origBuild(Object.assign({}, def, { id: 'jet' }), paint); return m; }
    return origBuild(def, paint);
  };
})();
