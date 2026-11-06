// Hoofquake — drivable vehicles: cars, bikes, boats, subs, helicopters, planes.
'use strict';
(function () {
  const V = THREE.Vector3; const G = 30;
  H.vehicles = [];
  const LAND = ['car', 'truck', 'bus', 'kart', 'tractor', 'digger', 'moto', 'bike', 'skate'];
  class Vehicle {
    constructor(def, x, z, yaw, opt) {
      opt = opt || {}; this.def = def; this.owned = !!opt.owned; this.upg = opt.upg || { eng: 0, hand: 0, boost: 0 }; this.paint = opt.paint;
      this.m = H.buildVehicle(def, this.paint); H.scene.add(this.m.root);
      this.pos = new V(x, 0, z); this.yaw = yaw || 0; this.spd = 0; this.vy = 0; this.pitch = 0; this.roll = 0; this.lat = new V();
      this.radius = Math.max(def.size[0], def.size[2]) * 0.45; this.air = 0; this.boost = 1; this.home = { x, z, yaw }; this.world = !this.owned; this.flipAcc = 0;
      const g = this.isWater ? 0 : H.groundAt(x, z, 999); this.pos.y = this.isWater ? Math.max(g, 0) : g; this.altHold = this.pos.y;
      this.place();
      H.vehicles.push(this);
    }
    get isWater() { return ['boat', 'jetski', 'sub'].includes(this.def.type); }
    get isAir() { return this.def.type === 'heli' || this.def.type === 'plane'; }
    get maxSpd() { return this.def.spd * (1 + this.upg.eng * 0.12); }
    place() { this.m.root.position.copy(this.pos); this.m.root.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ'); }
    seatPos() { const s = this.def.size; const t = this.def.type; const up = t === 'skate' ? 0.25 : t === 'bike' || t === 'moto' ? 0.9 : t === 'kart' ? 0.4 : t === 'boat' || t === 'jetski' ? s[1] * 0.6 : t === 'plane' ? 1.6 : t === 'heli' ? (this.def.saucer ? 1.6 : 1.0) : s[1] * 0.45; const fwd = t === 'bus' || t === 'truck' ? s[2] * 0.3 : t === 'plane' ? s[2] * 0.1 : 0; return new V(this.pos.x + Math.sin(this.yaw) * fwd, this.pos.y + up, this.pos.z + Math.cos(this.yaw) * fwd); }
    enter(p) {
      if (this.driver) return; this.driver = p; p.vehicle = this; p.drop(); p.emote = null;
      const big = p.height > 3.5 && !['bus', 'truck', 'plane', 'heli'].includes(this.def.type);
      p.parts.root.scale.setScalar(big ? 0.6 : 1); H.Audio.sfx('click'); H.ui && H.ui.vehicleHud(p, this);
      H.emit('enterVehicle', p, this);
    }
    exit(p, eject) {
      if (this.driver !== p) return; this.driver = null; p.vehicle = null; p.parts.root.scale.setScalar(1);
      const sx = Math.cos(this.yaw) * (this.def.size[0] / 2 + p.radius + 0.6), sz = -Math.sin(this.yaw) * (this.def.size[0] / 2 + p.radius + 0.6);
      p.pos.set(this.pos.x + sx, this.pos.y + 0.5, this.pos.z + sz); p.vel.set(0, 0, 0);
      if (this.isAir && this.pos.y - H.groundAt(this.pos.x, this.pos.z, this.pos.y) > 5) { p.vel.set(Math.sin(this.yaw) * this.spd * 0.5, 2, Math.cos(this.yaw) * this.spd * 0.5); }
      if (eject) { p.pos.y += 1.5; p.vel.set(Math.sin(this.yaw) * eject, 10 + eject * 0.3, Math.cos(this.yaw) * eject); p.startRagdoll(2.5); H.floatText('EJECTED!', p.pos, { cls: 'big' }); }
      H.Audio.engine(false); H.ui && H.ui.vehicleHud(p, null); H.emit('exitVehicle', p, this);
    }
    knock(ix, iy, iz) { if (this.driver) return; this.lat.x += ix; this.vy += iy * 0.5; this.lat.z += iz; this.loose = 4; }
    drive(dt, inp, p) {
      const d = this.def, t = d.type, hand = 1 + this.upg.hand * 0.12;
      let throttle = inp.mz, steer = inp.mx; // mz +1 = forward, mx +1 = right
      const max = this.maxSpd * (this.boosting ? 1.45 : 1), acc = d.acc * (1 + this.upg.eng * 0.08);
      this.boosting = this.upg.boost > 0 && inp.sprint && LAND.includes(t) && this.boost > 0;
      if (this.boosting) { this.boost = Math.max(0, this.boost - dt * 0.35); if (Math.random() < 0.6) H.fx.spawn(this.pos.x - Math.sin(this.yaw) * d.size[2] / 2, this.pos.y + 0.6, this.pos.z - Math.cos(this.yaw) * d.size[2] / 2, 0, 1, 0, new THREE.Color('#5ad8ff'), 0.4, 0.3, 0); } else this.boost = Math.min(1, this.boost + dt * 0.08 * this.upg.boost);
      const ground = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1.5);
      const depth = -H.terrainH(this.pos.x, this.pos.z);
      if (t === 'heli') {
        const lift = (inp.jump ? 1 : 0) - (inp.descend ? 1 : 0);
        this.vy += (lift * 14 - this.vy) * Math.min(1, dt * 2);
        this.spd += (throttle * max - this.spd) * Math.min(1, dt * 0.8);
        this.yaw -= steer * d.turn * dt * 0.9;
        this.pos.y += this.vy * dt; if (this.pos.y < Math.max(ground, 0)) { this.pos.y = Math.max(ground, 0); this.vy = Math.max(0, this.vy); if (ground < 0) this.vy = 0; }
        this.pitch = H.lerp(this.pitch, this.spd / max * 0.25, dt * 3); this.roll = H.lerp(this.roll, steer * 0.3, dt * 3);
        if (this.m.rotor) this.m.rotor.rotation.y += dt * (this.def.saucer ? 3 : 30);
        if (this.pos.y - ground > 2) H.stat('flyKm', Math.abs(this.spd) * dt / 1000);
      } else if (t === 'plane') {
        const air = this.pos.y - Math.max(ground, 0) > 1.5;
        this.spd += (Math.max(0, throttle) * max - (throttle < 0 ? max * 0.5 : 0) - this.spd * 0.15) * dt * (acc / max) * 2.5; this.spd = H.clamp(this.spd, 0, max);
        const liftSpd = max * 0.42, lifting = this.spd > liftSpd;
        const pitchIn = (inp.jump ? 1 : 0) - (inp.descend ? 1 : 0);
        if (air || lifting) this.pitch = H.clamp(this.pitch - pitchIn * dt * 1.2, -0.8, 0.8); else this.pitch = H.lerp(this.pitch, 0, dt * 4);
        this.yaw -= steer * d.turn * dt * (air ? 0.7 : 0.5); this.roll = H.lerp(this.roll, air ? steer * 0.6 : 0, dt * 3);
        const climb = -Math.sin(this.pitch) * this.spd; const stall = air && this.spd < liftSpd * 0.8;
        this.vy = lifting || air ? climb - (stall ? 12 : 0) : this.vy - G * dt; if (!air && !lifting) this.vy = Math.max(this.vy, -5);
        this.pos.y += this.vy * dt; const gnd = Math.max(ground, ground < 0 ? 0 : ground);
        if (this.pos.y < gnd) { if (air && (this.vy < -14 || Math.abs(this.roll) > 0.5)) { this.crash(p, Math.abs(this.vy) + this.spd * 0.3); } this.pos.y = gnd; this.vy = 0; if (this.pitch > 0) this.pitch = 0; }
        if (this.m.prop) this.m.prop.rotation.z += dt * (5 + this.spd);
        if (air) H.stat('flyKm', this.spd * dt / 1000);
        if (inp.attack && air) this.dropBomb();
      } else if (t === 'sub') {
        const onWater = depth > 1;
        this.spd += (throttle * max - this.spd) * Math.min(1, dt * acc / max); this.yaw -= steer * d.turn * dt * Math.min(1, Math.abs(this.spd) / 4 + 0.3);
        if (onWater) { const v = (inp.jump ? 6 : 0) - (inp.descend ? 6 : 0); this.pos.y += v * dt; this.pos.y = H.clamp(this.pos.y, -depth + 1.5, -0.6); }
        else { this.spd *= 1 - 3 * dt; this.pos.y = ground; }
        if (this.m.prop) this.m.prop.rotation.z += dt * this.spd;
        if (this.pos.y < -2 && Math.random() < dt * 6) H.fx.spawn(this.pos.x, this.pos.y + 2, this.pos.z, 0, 3, 0, new THREE.Color('#d8f4ff'), 0.25, 1.5, -2);
      } else if (t === 'boat' || t === 'jetski' || t === 'hover') {
        const onWater = depth > 0.7 || (t === 'hover');
        const canMove = t === 'hover' ? true : depth > 0.7;
        this.spd += ((canMove ? throttle : throttle * 0.1) * max - this.spd) * Math.min(1, dt * acc / max);
        this.yaw -= steer * d.turn * hand * dt * Math.min(1, Math.abs(this.spd) / 6 + 0.25) * Math.sign(this.spd || 1);
        const sea = depth > 0 ? 0 : ground; const targetY = t === 'hover' ? Math.max(ground, 0) + 0.4 : (depth > 0.7 ? 0 : ground);
        this.vy -= G * dt; this.pos.y += this.vy * dt; if (this.pos.y < targetY) { this.pos.y = targetY; this.vy = Math.max(0, this.vy); }
        this.pitch = H.lerp(this.pitch, -this.spd / max * 0.12 + (onWater ? Math.sin(performance.now() * 0.002) * 0.03 : 0), dt * 3); this.roll = H.lerp(this.roll, -steer * Math.abs(this.spd) / max * 0.25, dt * 3);
        if (onWater && Math.abs(this.spd) > 5 && Math.random() < 0.8) H.fx.spawn(this.pos.x - Math.sin(this.yaw) * d.size[2] / 2, 0.2, this.pos.z - Math.cos(this.yaw) * d.size[2] / 2, (Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3, new THREE.Color('#ffffff'), 0.3, 0.6, 15);
        if (this.m.prop) this.m.prop.rotation.z += dt * 20;
        if (t === 'hover' && Math.random() < 0.3) H.fx.spawn(this.pos.x, this.pos.y, this.pos.z, (Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 6, new THREE.Color(depth > 0 ? '#ffffff' : '#c8b898'), 0.3, 0.4, 0);
      } else {
        // ground vehicles
        const onGround = this.pos.y - ground < 0.25;
        if (onGround) {
          let a = throttle * acc; if (Math.sign(throttle) !== Math.sign(this.spd) && Math.abs(this.spd) > 0.5 && throttle !== 0) a = throttle * acc * 2.2;
          this.spd += a * dt; if (throttle === 0) this.spd *= 1 - 1.1 * dt;
          this.spd = H.clamp(this.spd, -max * 0.4, max);
          if (inp.jump && (t === 'skate' || t === 'bike' || t === 'moto')) { this.vy = t === 'skate' ? 11 : 9; H.Audio.sfx('jump'); }
          else if (inp.jump && LAND.includes(t)) this.spd *= 1 - 3 * dt; // handbrake
          const turn = d.turn * hand * Math.min(1, Math.abs(this.spd) / 5) * (this.spd < 0 ? -1 : 1) * (inp.jump ? 1.6 : 1);
          this.yaw -= steer * turn * dt;
          // align to slope
          const f = d.size[2] * 0.4, sx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
          const hf = H.groundAt(this.pos.x + sx * f, this.pos.z + cz * f, this.pos.y + 2), hb = H.groundAt(this.pos.x - sx * f, this.pos.z - cz * f, this.pos.y + 2);
          const hr = H.groundAt(this.pos.x + cz * 1, this.pos.z - sx * 1, this.pos.y + 2), hl = H.groundAt(this.pos.x - cz * 1, this.pos.z + sx * 1, this.pos.y + 2);
          this.pitch = H.lerp(this.pitch, -Math.atan2(hf - hb, 2 * f), Math.min(1, dt * 10)); this.roll = H.lerp(this.roll, Math.atan2(hr - hl, 2), Math.min(1, dt * 10));
          if (this.air > 0.25) { H.Audio.sfx('land'); H.emit('vehicleLand', p, this, this.air, this.flipAcc); if (Math.abs(this.flipAcc) > 5.2) { H.stat('flips', Math.floor(Math.abs(this.flipAcc) / 6.28 + 0.2)); } if (this.air > 1) H.floatText(`AIR ${this.air.toFixed(1)}s${Math.abs(this.flipAcc) > 5.2 ? ' + FLIP' : ''}`, this.pos, { cls: 'big' }); }
          this.air = 0; this.flipAcc = 0;
          if (depth > 1.4 && t !== 'hover') { this.spd *= 1 - 2.5 * dt; if (Math.random() < dt) H.fx.splash(this.pos.x, this.pos.z); }
        } else {
          this.air += dt; if (inp.mz) { const fr = -inp.mz * 4 * dt; this.pitch += fr; this.flipAcc += fr; } this.roll += steer * 3 * dt;
          if (this.air > 0.15) H.emit('vehicleAir', p, this, dt);
        }
        // ramps launch: while grounded, vertical speed follows the ground's rise rate, so leaving a ramp keeps it
        const dG = ground - (this.lastG === undefined ? ground : this.lastG); this.lastG = ground;
        this.vy -= G * dt; this.pos.y += this.vy * dt;
        if (this.pos.y <= ground) { this.pos.y = ground; this.vy = onGround && dG > 0 && dG < 0.6 ? dG / dt : Math.max(0, Math.min(this.vy, 0)); if (this.vy > 30) this.vy = 30; }
        const rot = Math.abs(this.spd) * dt / 0.5; this.m.wheels.forEach(w => { w.spin.rotation.x += rot * Math.sign(this.spd); if (w.front) w.piv.rotation.y = -steer * 0.4; });
        if (this.m.root.userData.arm) this.m.root.userData.arm.rotation.x = inp.attack ? -0.5 : 0;
        if (Math.abs(this.roll) > 1.6 && onGround && Math.abs(this.spd) < 3) { this.roll = 0; this.pitch = 0; H.toast('Flipped back over'); }
        H.stat('driveKm', Math.abs(this.spd) * dt / 1000);
      }
      // horizontal move & collisions
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const hs = t === 'plane' ? this.spd * Math.cos(this.pitch) : this.spd;
      this.pos.x += fx * hs * dt + this.lat.x * dt; this.pos.z += fz * hs * dt + this.lat.z * dt; this.lat.multiplyScalar(1 - 3 * dt);
      const hit = H.collideStatic(this.pos, this.radius * 0.8, this.def.size[1], null);
      if (hit.hit) { const imp = Math.abs(this.spd); if (imp > 12) { H.Audio.sfx('smash', Math.min(1, imp / 40)); H.shake(this.pos.x, this.pos.z, imp / 60); H.fx.burst(this.pos.x + fx * 2, this.pos.y + 1, this.pos.z + fz * 2, new THREE.Color('#c8c8c8'), 10, 5, 0.25); } if (imp > 38 && !this.isAir) this.crash(p, imp); else if (this.isAir && imp > 18) this.crash(p, imp * 2); else if (imp > 12) this.damage(imp * 0.5, p); this.spd *= -0.25; }
      // world interactions
      this.smash(p, fx, fz);
      if (t === 'plane' || t === 'heli') { const sky = this.pos.y > 600; if (sky) this.pos.y = 600; }
      this.place();
      H.Audio.engine(true, Math.min(1, Math.abs(this.spd) / max), t);
      if (inp.horn) H.Audio.sfx('horn');
    }
    crash(p, imp) { if (this.isAir && imp > 22) { this.damage(9999, p); return; } this.damage(imp * 1.4, p); if (this.dead) return; H.Audio.sfx('boom', 0.6); H.fx.burst(this.pos.x, this.pos.y + 1, this.pos.z, new THREE.Color('#5a5a5a'), 20, 8, 0.6); this.spd = 0; this.vy = 0; this.pitch = 0; this.roll = 0; if (p) this.exit(p, Math.min(40, imp * 0.8)); H.stat('crashes', 1); }
    dropBomb() { if ((this.bombT || 0) > performance.now()) return; this.bombT = performance.now() + 900; const b = H.spawnProp('explosive', this.pos.x, this.pos.y - 2, this.pos.z, { temp: true }); b.vel.set(Math.sin(this.yaw) * this.spd * 0.6, -5, Math.cos(this.yaw) * this.spd * 0.6); b.lastHit = this.driver; H.wakeProp(b); b.breakAt = 4; }
    smash(p, fx, fz) {
      const sp = Math.abs(this.spd); if (sp < 4) return; const r = this.radius + 0.5;
      const tmp = []; H.propsNear(this.pos.x, this.pos.z, r + 1, tmp);
      for (const o of tmp) { if (Math.abs(o.pos.y - this.pos.y) > this.def.size[1] + 1) continue; const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z; if (dx * dx + dz * dz < (r + o.r) ** 2) { H.pushProp(o, fx * sp * 1.6 + dx, sp * 0.5, fz * sp * 1.6 + dz, p); if (sp > o.breakAt * 0.8) H.breakProp(o, p); } }
      for (const n of H.NPCs.near(this.pos.x, this.pos.z, r)) if (!n.ragdoll && Math.abs(n.pos.y - this.pos.y) < 3) n.knock(fx * sp * 1.1, 8 + sp * 0.4, fz * sp * 1.1, p);
      for (const c of H.traffic) if (!c.wrecked && Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z) < r + 2 && sp > 14) { c.wreck(fx * sp * 0.6, 8, fz * sp * 0.6, p); this.spd *= 0.6; }
      for (const pl of H.players) if (pl !== p && !pl.vehicle && Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z) < r + pl.radius) pl.knock(fx * sp, 10, fz * sp);
    }
    idle(dt) {
      if (this.driver) return;
      // parked / loose physics
      if (this.loose > 0 || this.lat.lengthSq() > 0.1 || this.vy !== 0) {
        this.loose -= dt; this.pos.x += this.lat.x * dt; this.pos.z += this.lat.z * dt; this.lat.multiplyScalar(1 - 2 * dt);
        this.vy -= G * dt; this.pos.y += this.vy * dt; const g = this.isWater && H.terrainH(this.pos.x, this.pos.z) < 0 ? 0 : H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1); if (this.pos.y < g) { this.pos.y = g; this.vy = 0; }
        H.collideStatic(this.pos, this.radius * 0.8, this.def.size[1], null); this.place();
      } else if (this.isAir || this.isWater) {
        const g = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1); const target = this.isWater && H.terrainH(this.pos.x, this.pos.z) < 0 ? 0 : g;
        if (this.pos.y > target + 0.05) { this.vy -= G * dt; this.pos.y = Math.max(target, this.pos.y + this.vy * dt); if (this.pos.y <= target) { this.vy = 0; if (this.isAir && this.spd > 15) this.crash(null, this.spd); this.spd = 0; } this.pitch *= 0.95; this.roll *= 0.95; this.place(); }
      }
    }
    remove() { if (this.driver) this.exit(this.driver); H.scene.remove(this.m.root); const i = H.vehicles.indexOf(this); if (i >= 0) H.vehicles.splice(i, 1); }
    repaint(c) { this.paint = c; this.m.paintMat.color.set(c); }
  }
  H.Vehicle = Vehicle;
  H.spawnWorldVehicles = function () { for (const s of H.vehicleSpawns) { const d = H.VEHICLE[s.id]; if (d) new Vehicle(d, s.x, s.z, s.yaw); } };
  H.updateVehicles = function (dt) { for (const v of H.vehicles) { v.idle(dt); let near = false; for (const p of H.players) if (H.dist2(p.pos.x, p.pos.z, v.pos.x, v.pos.z) < 260 * 260) near = true; v.m.root.visible = near; } };
  // Summon an owned vehicle in front of the player
  H.summonVehicle = function (p, id) {
    const d = H.VEHICLE[id]; const own = H.state.vehicles[id]; if (!d || !own) return;
    if (p.interior) return H.toast('Step outside first — vehicles don\'t fit indoors.');
    if (p.summoned) p.summoned.remove();
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); let x = p.pos.x + fx * (d.size[2] / 2 + 4), z = p.pos.z + fz * (d.size[2] / 2 + 4);
    if (['boat', 'jetski', 'sub'].includes(d.type) && H.terrainH(x, z) > -0.7) { // find water nearby
      let found = false; for (let r = 10; r < 400 && !found; r += 10) for (let a = 0; a < 6.28; a += 0.3) { const tx = p.pos.x + Math.cos(a) * r, tz = p.pos.z + Math.sin(a) * r; if (H.terrainH(tx, tz) < -2) { x = tx; z = tz; found = true; break; } }
      if (!found) return H.toast('No water nearby for a boat.');
      H.toast('Your ' + d.name + ' is waiting at the nearest water (check the map).');
    }
    const v = new Vehicle(d, x, z, p.yaw, { owned: true, upg: own.upg, paint: own.paint }); v.pos.y = Math.max(v.pos.y, H.groundAt(x, z, p.pos.y + 5)); if (v.isAir) v.pos.y = H.groundAt(x, z, p.pos.y + 5); v.place(); p.summoned = v; H.Audio.sfx('unlock');
    H.mapPing = { x, z, t: 10 };
  };
})();
