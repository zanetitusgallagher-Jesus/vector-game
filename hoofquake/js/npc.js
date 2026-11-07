// Hoofquake — the living world: pedestrians, animals, traffic and Animal Control.
'use strict';
(function () {
  const V = THREE.Vector3; const G = 30;
  const LINES = {
    hit: ['MY BACK!', 'Not again!', 'I just got this shirt!', 'Who raised you?!', 'Unbelievable.', 'I\'m calling Animal Control!', 'OW!', 'Is that a goat?!', 'Worth it.', 'I\'m filming this!', 'Rude!', 'My coffee!'],
    scare: ['AAAH!', 'RUN!', 'Nope nope nope', 'Not today!', 'Somebody help!', 'It\'s loose again!', 'Mommy!'],
    idle: ['Nice day for it.', 'Have you seen my keys?', 'I love this town.', 'Did you hear about the cave?', 'They say something big lives in the pines…', 'The lab shed is ALWAYS locked.', 'Bowling at the sports complex later?', 'Ice cream truck! Where?!', 'My cousin saw a UFO in the desert.', 'Rubber ducks keep showing up on roofs.'],
    bump: ['Excuse you.', 'Watch it!', 'Hey!', 'Personal space!', 'Oh, hello there.', 'Good boy? Good girl? Good… thing?'],
  };
  const ANIMAL_NPC = { sheep: ['sheep', 1, null], cow: ['cow', 1, null], chicken: ['chicken', 1, null], pig: ['pig', 1, null], deer: ['horse', 0.75, '#a8784a'], bear: ['bear', 1, null], monkey: ['gorilla', 0.45, '#7a5a3a'], goatwild: ['goat', 1, '#b8b0a0'], camelwild: ['camel', 1, null] };
  const HUMAN_TYPES = { city: 'ped', suburb: 'ped', rich: 'ped', shopper: 'ped', tourist: 'tourist', beach: 'beach', farmer: 'farmer', worker: 'worker', villager: 'ped', athlete: 'ped', golfer: 'ped', fisher: 'farmer', camper: 'ped', explorer: 'tourist', hiker: 'tourist', skater: 'ped', shopkeeper: 'shopkeeper', officer: 'officer' };

  class NPC {
    constructor(zone, i) {
      this.zone = zone; this.type = zone.type; this.animal = ANIMAL_NPC[zone.type]; this.isHuman = !this.animal;
      const r = H.rng((zone.x * 31 + zone.z * 17 + i * 101) | 0); this.seed = r;
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * zone.r;
      this.home = new V(zone.x + Math.cos(a) * d, 0, zone.z + Math.sin(a) * d);
      this.pos = new V(this.home.x, H.groundAt(this.home.x, this.home.z, 999), this.home.z); this.vel = new V(); this.yaw = r() * 6.28;
      this.target = null; this.state = 'idle'; this.t = r() * 3; this.radius = 0.5; this.height = 2; this.speed = 2 + r() * 1.5; this.phase = 0;
      this.night = this.isHuman && r() < 0.6 && zone.type !== 'shopkeeper'; this.model = null; this.active = false; this.mood = 0;
      if (zone.interior) this.interior = H.interiors[zone.interior];
    }
    materialize() {
      if (this.isHuman) { const m = H.buildHuman(HUMAN_TYPES[this.type] || 'ped', this.seed); this.parts = m; this.height = m.height; }
      else { const [id, sc, col] = this.animal; const def = Object.assign({}, H.ANIMAL[id]); if (sc !== 1) def.scale = sc; if (col) def.col = col; this.def = def; const m = H.buildAnimal(def, {}); this.parts = m; this.height = m.height; this.radius = m.radius; this.speed = def.stats.spd * 0.3; }
      this.model = this.parts.root; H.scene.add(this.model); this.active = true; this.model.position.copy(this.pos);
    }
    dematerialize() { if (this.model) H.scene.remove(this.model); this.model = null; this.active = false; this.ragdoll = null; this.held = null; this.state = 'idle'; }
    say(kind, force) { if (!force && (this.sayT || 0) > 0) return; this.sayT = 4; H.floatText(H.pick(LINES[kind]), this.pos, { follow: this, cls: 'speech', life: 2.2, rise: 0 }); }
    knock(ix, iy, iz, by) {
      if (!this.active) return; if (this.held) { this.held.drop(); }
      this.asleep = 0; if (by && by.isPlayer) this.provoke(by); if (this.rider) H.dismount(this.rider, true);
      this.vel.set(ix, iy, iz); this.ragdoll = { t: 0, spin: new V((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12) };
      if (this.isHuman) { H.Audio.sfx(Math.random() < 0.5 ? 'scream' : 'ouch', 0.7); } else H.Audio.voice(this.def.voice, 1.2);
      if (by && by.isPlayer) { H.stat('npcHits', 1); H.chaos(this.isHuman ? 25 : 12, this.isHuman ? 'Bowled a ' + (this.type === 'officer' ? 'cop' : 'human') : 'Launched a ' + this.animal[0], by); H.emit('npcHit', this, by); if (this.type === 'officer') H.heat(1); }
      this.mood = 1; this.fleeFrom = by;
    }
    sleep(t) { if (!this.active) return; this.asleep = t; this.ragdoll = null; this.state = 'idle'; H.floatText('Zzz…', this.pos, { follow: this, cls: 'speech', life: 2, rise: 0 }); }
    provoke(by) { if (!by || !by.isPlayer) return; if (this.type === 'bear' || this.type === 'goatwild' || this.type === 'camelwild') { this.angry = 12; this.chase = by; } }
    grabbed(by) { this.held = by; this.ragdoll = null; this.say('scare', true); }
    released(vx, vy, vz) { this.held = null; this.knock(vx, vy, vz); }
    scare(by, fire) { if (!this.active || this.ragdoll) return; this.state = 'flee'; this.fleeFrom = by; this.t = 4 + Math.random() * 3; if (this.isHuman) { if (Math.random() < 0.4) this.say('scare'); if (Math.random() < 0.3) H.Audio.sfx('scream', 0.4); } H.emit('scared', this, by); }
    bump(by) { if (this.isHuman && Math.random() < 0.02) this.say('bump'); }
    update(dt) {
      this.sayT = (this.sayT || 0) - dt;
      if (this.held) { this.parts.rig.rotation.z = Math.sin(performance.now() * 0.02) * 0.6; this.parts.legs.forEach((l, i) => (l.rotation.x = Math.sin(performance.now() * 0.03 + i) * 1.2)); this.model.position.copy(this.pos); return; }
      if (this.ragdoll) return this.updateRagdoll(dt);
      if (this.rider) return;
      if (this.asleep > 0) { this.asleep -= dt; this.parts.rig.rotation.z = Math.PI / 2 * 0.95; this.parts.rig.position.y = this.radius * 0.6; if (Math.random() < dt * 0.6) H.fx.spawn(this.pos.x, this.pos.y + 1.5, this.pos.z, 0, 1, 0, new THREE.Color('#ffffff'), 0.2, 1.2, 0); if (this.asleep <= 0) { this.parts.rig.rotation.z = 0; this.parts.rig.position.y = 0; } return; }
      if (this.angry > 0) {
        this.angry -= dt; const c = this.chase; const dx = c.pos.x - this.pos.x, dz = c.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
        this.yaw = H.angLerp(this.yaw, Math.atan2(dx, dz), dt * 6); const sp = (this.def ? this.def.stats.spd : 8) * 1.15;
        this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt; H.collideStatic(this.pos, this.radius, this.height, this.interior); this.pos.y = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, this.interior);
        if (d < this.radius + 1.6 && !c.ragdoll && !c.vehicle && (this.atkT || 0) <= 0) { this.atkT = 1.5; c.knock(dx / d * 10, 8, dz / d * 10, H.speciesOf ? H.speciesOf(this).dmg || 15 : 15); H.Audio.voice(this.def.voice, 0.9); H.floatText('RAWR!', this.pos, { cls: 'big' }); }
        this.atkT = (this.atkT || 0) - dt; if (d > 120) this.angry = 0;
        this.model.position.copy(this.pos); this.model.rotation.set(0, this.yaw, 0); this.phase += dt * sp * 2.2; const s = Math.sin(this.phase); this.parts.legs.forEach((l, i) => (l.rotation.x = s * ((i === 0 || i === 3) ? 0.9 : -0.9))); return;
      }
      const night = H.Sky.isNight();
      if (this.night && night && !this.interior) { this.model.visible = false; return; } this.model.visible = true;
      this.t -= dt; let spd = 0;
      // react to nearby players
      for (const p of H.players) {
        const d2 = H.dist2(p.pos.x, p.pos.z, this.pos.x, this.pos.z);
        if (d2 < 100 && (p.speed > 11 || (p.mass >= 4 && d2 < 49) || p.timers.dash) && this.state !== 'flee' && this.type !== 'officer' && this.type !== 'shopkeeper') this.scare(p);
        if (this.type === 'officer' && d2 < 160000) { this.state = 'chase'; this.chase = p; }
        if (this.state === 'idle' && d2 < 16 && this.isHuman && Math.random() < dt * 0.2) { this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z); if (Math.random() < 0.15) this.say('idle'); }
      }
      if (this.state === 'flee') {
        const f = this.fleeFrom || H.players[0]; const a = Math.atan2(this.pos.x - f.pos.x, this.pos.z - f.pos.z); this.yaw = H.angLerp(this.yaw, a, dt * 6); spd = this.isHuman ? 7 : this.speed * 2.2;
        if (this.t <= 0) this.state = 'idle';
      } else if (this.state === 'chase') {
        const c = this.chase; const dx = c.pos.x - this.pos.x, dz = c.pos.z - this.pos.z, d = Math.hypot(dx, dz);
        this.yaw = H.angLerp(this.yaw, Math.atan2(dx, dz), dt * 8); spd = 9.5;
        if (d < 1.6 && !c.vehicle && !c.ragdoll && Math.abs(c.pos.y - this.pos.y) < 2) { c.knock(dx / d * 6, 8, dz / d * 6); const fine = Math.min(500, Math.floor(H.state.coins * 0.05)); if (fine > 0) { H.addCoins(-fine, 'Animal Control fine'); } H.floatText('GOTCHA!', this.pos, { follow: this, cls: 'speech' }); H.heatLevel = Math.max(0, H.heatLevel - 1.5); }
        if (H.heatLevel < 1 || d > 260) { this.state = 'idle'; if (this.zone.temp) this.gone = true; }
      } else if (this.state === 'walk') {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
        this.yaw = H.angLerp(this.yaw, Math.atan2(dx, dz), dt * 4); spd = this.speed; if (d < 1.5 || this.t <= 0) { this.state = 'idle'; this.t = 2 + Math.random() * 5; }
      } else if (this.t <= 0) {
        if (this.type === 'shopkeeper') { this.t = 5; }
        else { const a = Math.random() * 6.28, r = Math.random() * this.zone.r; this.target = { x: this.zone.x + Math.cos(a) * r, z: this.zone.z + Math.sin(a) * r }; this.state = 'walk'; this.t = 15; }
      }
      this.vel.x = Math.sin(this.yaw) * spd; this.vel.z = Math.cos(this.yaw) * spd;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      const hit = H.collideStatic(this.pos, this.radius, this.height, this.interior); if (hit.hit && this.state === 'walk') { this.state = 'idle'; this.t = 0.5; }
      const g = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, this.interior);
      if (!this.interior && g < -0.5 && this.isHuman) { this.pos.x -= this.vel.x * dt * 2; this.pos.z -= this.vel.z * dt * 2; this.state = 'idle'; this.t = 1; }
      this.pos.y = Math.max(g, this.interior ? g : -this.height * 0.6);
      this.model.position.copy(this.pos); this.model.rotation.set(0, this.yaw, 0);
      this.phase += dt * spd * 2.2; const s = Math.sin(this.phase) * Math.min(1, spd / 3);
      const P = this.parts; P.rig.rotation.set(0, 0, 0); P.rig.position.set(0, 0, 0);
      P.legs.forEach((l, i) => (l.rotation.x = s * (i % 2 ? -0.8 : 0.8) * (this.isHuman ? 1 : (i === 0 || i === 3 ? 1 : -1))));
      if (P.arms) P.arms.forEach((a, i) => { a.rotation.x = (this.state === 'flee' ? -2.8 : -s * (i % 2 ? -0.7 : 0.7)); a.rotation.z = 0; });
      if (this.state === 'idle' && !this.isHuman && P.head) P.head.rotation.x = 0.5 + Math.sin(performance.now() * 0.002 + this.home.x) * 0.2;
    }
    updateRagdoll(dt) {
      const r = this.ragdoll; r.t += dt; this.vel.y -= G * dt; this.pos.addScaledVector(this.vel, dt);
      const hit = H.collideStatic(this.pos, this.radius, 1, this.interior); if (hit.hit) { const vn = this.vel.x * hit.x + this.vel.z * hit.z; if (vn < 0) { this.vel.x -= 1.5 * vn * hit.x; this.vel.z -= 1.5 * vn * hit.z; if (-vn > 10) H.Audio.sfx('thud', 0.6); } }
      const water = !this.interior && H.terrainH(this.pos.x, this.pos.z) < -0.5 && this.pos.y < 0.2;
      if (water) { this.vel.y += 45 * dt; this.vel.multiplyScalar(1 - 1.5 * dt); if (!r.splashed) { r.splashed = 1; H.fx.splash(this.pos.x, this.pos.z); } }
      const g = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, this.interior) + 0.3;
      if (this.pos.y < g) { this.pos.y = g; if (this.vel.y < -5) { this.vel.y *= -0.4; r.spin.multiplyScalar(0.6); H.Audio.sfx('thud', 0.4); } else this.vel.y = 0; this.vel.x *= 1 - 4 * dt; this.vel.z *= 1 - 4 * dt; r.spin.multiplyScalar(1 - 3 * dt); }
      // knock other NPCs like bowling pins
      if (this.vel.lengthSq() > 64) for (const n of H.NPCs.near(this.pos.x, this.pos.z, 1.4)) if (n !== this && !n.ragdoll && !n.held) { n.knock(this.vel.x * 0.6, 6, this.vel.z * 0.6, r.by); }
      const P = this.parts; P.rig.rotation.x += r.spin.x * dt; P.rig.rotation.y += r.spin.y * dt; P.rig.rotation.z += r.spin.z * dt;
      P.legs.forEach((l, i) => (l.rotation.x = Math.sin(r.t * 18 + i * 2) * 1.2)); if (P.arms) P.arms.forEach((a, i) => (a.rotation.z = Math.sin(r.t * 15 + i * 3) * 1.6));
      this.model.position.copy(this.pos);
      if (r.t > 2.5 && this.vel.lengthSq() < 2) {
        this.ragdoll = null; P.rig.rotation.set(0, 0, 0); if (P.arms) P.arms.forEach(a => (a.rotation.z = 0)); this.pos.y = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 2, this.interior);
        if (this.dead) return; if (this.isHuman && Math.random() < 0.7) this.say('hit'); this.state = this.type === 'officer' || this.type === 'swat' ? 'chase' : 'flee'; this.t = 3;
      }
      if (this.pos.y < -100) { this.pos.copy(this.home); this.pos.y = H.groundAt(this.home.x, this.home.z, 999); this.ragdoll = null; }
    }
  }

  H.NPCClass = NPC; H.ANIMAL_NPC = ANIMAL_NPC; H.HUMAN_TYPES = HUMAN_TYPES; H.NPC_LINES = LINES;
  H.NPCs = {
    list: [], grid: new H.Grid(24),
    init() { for (const z of H.npcZones) for (let i = 0; i < z.count; i++) this.list.push(new NPC(z, i)); },
    add(zone) { const n = new NPC(zone, Math.floor(Math.random() * 999)); this.list.push(n); return n; },
    near(x, z, r) { const out = []; this.grid.query(x, z, r, out); return out.filter(n => n.active && H.dist2(n.pos.x, n.pos.z, x, z) < (r + n.radius) * (r + n.radius)); },
    update(dt) {
      this.grid.map.clear(); const pl = H.players; const ACT = 180, DE = 230; let active = 0;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const n = this.list[i]; if (n.gone) { n.dematerialize(); this.list.splice(i, 1); continue; }
        let md = 1e12; for (const p of pl) { if ((p.interior || null) !== (n.interior || null)) continue; md = Math.min(md, H.dist2(p.pos.x, p.pos.z, n.pos.x, n.pos.z)); }
        if (!n.active && md < ACT * ACT && active < 160) n.materialize();
        else if (n.active && md > DE * DE) { if (!n.ragdoll) n.pos.copy(n.home).setY(H.groundAt(n.home.x, n.home.z, 999, n.interior)); n.dematerialize(); }
        if (n.active) { active++; n.update(H.slowmo > 0 ? dt * 0.35 : dt); this.grid.insert(n, n.pos.x - 1, n.pos.z - 1, n.pos.x + 1, n.pos.z + 1); }
      }
    },
  };

  // ------------------------------------------------------------------ Traffic
  class TrafficCar {
    constructor(i) { this.i = i; this.pos = new V(); this.yaw = 0; this.spd = 0; this.place(); }
    place(near) {
      const roads = H.ROADS.filter(r => r.samples && r.samples.length > 4);
      for (let k = 0; k < 30; k++) {
        const rd = H.pick(roads), si = Math.floor(Math.random() * (rd.samples.length - 2)), s = rd.samples[si];
        if (near) { const d = Math.hypot(s.x - near.x, s.z - near.z); if (d < 90 || d > 300) continue; }
        this.road = rd; this.si = si; this.dir = Math.random() < 0.5 ? 1 : -1; this.u = 0; this.max = rd.city ? 11 + Math.random() * 5 : 16 + Math.random() * 8; this.spd = this.max;
        const defs = ['sedan', 'sedan', 'pickup', 'sedan', 'bus', 'icecream', 'police', 'hauler', 'golfcart', 'moto'];
        const def = H.VEHICLE[H.pick(defs)];
        if (this.model) H.scene.remove(this.model.root);
        this.def = def; this.model = H.buildVehicle(def, H.pick(H.PAINTS)); H.scene.add(this.model.root);
        this.wrecked = null; this.stop = 0; this.update(0); return;
      }
    }
    lanePos(si, u) {
      const s = this.road.samples, a = s[si], b = s[Math.min(s.length - 1, si + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, off = this.road.w * 0.25 * -this.dir;
      return { x: a.x + dx * u + nx * off, y: a.y + (b.y - a.y) * u, z: a.z + dz * u + nz * off, yaw: Math.atan2(dx * this.dir, dz * this.dir), L };
    }
    wreck(ix, iy, iz, by, boom) {
      if (this.wrecked) { if (boom && !this.wrecked.burnt) { this.wrecked.burnt = true; H.explode(this.pos.x, this.pos.y + 1, this.pos.z, 9, 34, by); this.model.root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color && o.material.color.multiplyScalar(0.2); } }); } return; }
      if (boom) setTimeout(() => this.wreck(0, 0, 0, by, true), 60); this.wrecked = { t: 0, vel: new V(ix, iy, iz), spin: new V((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6) };
      H.Audio.sfx('smash'); H.Audio.sfx('horn', 0.6); H.fx.burst(this.pos.x, this.pos.y + 1, this.pos.z, new THREE.Color('#9ad8ff'), 14, 6, 0.25);
      if (by && by.isPlayer) { H.chaos(60, 'Flipped a ' + this.def.name, by); H.stat('carsFlipped', 1); }
    }
    update(dt) {
      const m = this.model.root;
      if (this.wrecked) {
        const w = this.wrecked; w.t += dt; w.vel.y -= G * dt; this.pos.addScaledVector(w.vel, dt); const g = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1);
        if (this.pos.y < g) { this.pos.y = g; w.vel.y = Math.abs(w.vel.y) > 5 ? -w.vel.y * 0.3 : 0; w.vel.x *= 0.9; w.vel.z *= 0.9; w.spin.multiplyScalar(0.85); }
        m.position.copy(this.pos); m.rotation.x += w.spin.x * dt; m.rotation.y += w.spin.y * dt; m.rotation.z += w.spin.z * dt;
        if (w.burnt && Math.random() < 0.7) H.fx.spawn(this.pos.x + (Math.random() - 0.5) * 2, this.pos.y + 1.2, this.pos.z + (Math.random() - 0.5) * 2, 0, 3, 0, new THREE.Color(Math.random() < 0.4 ? '#ff8a1a' : '#3a3a3a'), 0.7, 1.2, -3);
        if (w.t > 3 && Math.random() < dt * 2) H.fx.spawn(this.pos.x, this.pos.y + 1.5, this.pos.z, 0, 3, 0, new THREE.Color('#5a5a5a'), 0.8, 1.5, -1);
        if (w.t > 12) this.place(H.players[0].pos);
        return;
      }
      // obstacle check
      let blocked = false; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      for (const p of H.players) { if (p.interior) continue; const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); if (ahead > 0 && ahead < 9 + this.def.size[2] / 2 && side < 2.6 && Math.abs(p.pos.y - this.pos.y) < 3) blocked = true;
        // collision
        if (Math.abs(ahead) < this.def.size[2] / 2 + p.radius && side < this.def.size[0] / 2 + p.radius && Math.abs(p.pos.y - this.pos.y) < 2.5) {
          if (p.vehicle) { const rel = this.spd; if (rel > 4) { this.wreck(-fx * 8, 6, -fz * 8); p.vehicle.knock(fx * rel * 0.6, 4, fz * rel * 0.6); } }
          else if (this.spd > 5 && !p.ragdoll) { p.knock(fx * this.spd * 1.5, 10 + this.spd * 0.5, fz * this.spd * 1.5); H.Audio.sfx('horn'); H.floatText('HONK!', this.pos); }
          else { p.pos.x += Math.sign(dx * fz - dz * fx || 1) * fz * 0.2; }
        }
      }
      for (const n of H.NPCs.near(this.pos.x + fx * 4, this.pos.z + fz * 4, 3)) { if (n.ragdoll) continue; if (this.spd > 8 && Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z) < 2.5) n.knock(fx * this.spd, 8, fz * this.spd); else blocked = true; }
      this.stop = Math.max(0, this.stop - dt); if (this.stop > 0) blocked = true;
      this.spd += ((blocked ? 0 : this.max) - this.spd) * Math.min(1, dt * (blocked ? 4 : 0.8));
      if (blocked && Math.random() < dt * 0.3) H.Audio.sfx('horn', 0.4);
      // advance along road
      let lp = this.lanePos(this.si, this.u); this.u += this.spd * dt / lp.L * (this.dir > 0 ? 1 : -1);
      const s = this.road.samples;
      while (this.u > 1) { this.u -= 1; this.si++; if (this.si >= s.length - 1) { this.si = s.length - 2; this.u = 1; this.dir = -1; break; } }
      while (this.u < 0) { this.u += 1; this.si--; if (this.si < 0) { this.si = 0; this.u = 0; this.dir = 1; break; } }
      lp = this.lanePos(this.si, this.u); this.pos.set(lp.x, lp.y, lp.z); this.yaw = H.angLerp(this.yaw, lp.yaw, Math.min(1, dt * 6) || 1);
      m.position.copy(this.pos); m.rotation.set(0, this.yaw, 0);
      this.model.wheels.forEach(w => (w.spin.rotation.x += this.spd * dt / 0.5));
      // despawn far away
      let near = 1e12; for (const p of H.players) near = Math.min(near, H.dist2(p.pos.x, p.pos.z, this.pos.x, this.pos.z));
      if (near > 380 * 380) this.place(H.players[0].pos);
    }
  }
  H.traffic = [];
  H.initTraffic = function (n) { for (let i = 0; i < n; i++) H.traffic.push(new TrafficCar(i)); };
  H.updateTraffic = function (dt) { const inInterior = H.players.every(p => p.interior); for (const c of H.traffic) { c.model.root.visible = !inInterior; if (!inInterior) c.update(dt); } };

  // ------------------------------------------------------------------ Heat (Animal Control)
  H.heatLevel = 0; H.heatT = 0;
  H.heat = function (amt) {
    if (H.settings && !H.settings.animalControl) return;
    const p = H.players[0]; if (!p || p.dead) return;
    // crimes only count when somebody sees them (or you're already wanted)
    if (H.heatLevel < 1) { let seen = Math.abs(p.pos.x) < 300 && Math.abs(p.pos.z) < 300; if (!seen) for (const n of H.NPCs.near(p.pos.x, p.pos.z, 60)) if (n.isHuman && !n.dead) { seen = true; break; } if (!seen) return; }
    if (H.hasGear) { if (H.hasGear('stealth')) amt *= 0.45; if (H.hasGear('veil')) amt *= 0.5; }
    H.heatLevel = Math.min(5, H.heatLevel + amt); H.heatT = 0; H.stat('maxHeat', Math.floor(H.heatLevel), true);
  };
  H.updateHeat = function (dt) { H.heatT += dt; if (H.heatT > 20 && H.heatLevel > 0) { H.heatLevel = Math.max(0, H.heatLevel - dt * 0.08); } };
})();
