// Hoofquake — the playable animal: movement, abilities, ragdoll, emotes, camera.
'use strict';
(function () {
  const V = THREE.Vector3; const G = 30;
  const tmpP = [], v1 = new V(), v2 = new V();
  H.projectiles = [];

  class Player {
    constructor(idx) {
      this.idx = idx; this.isPlayer = true; this.pos = new V(); this.vel = new V(); this.yaw = 0;
      this.cam = { yaw: 0, pitch: 0.35, dist: 9, x: new V() }; this.cd = { atk: 0, sp: 0, grab: 0 };
      this.onGround = false; this.airT = 0; this.trailT = 0; this.phase = 0; this.timers = {};
      this.root = new THREE.Group(); H.scene.add(this.root);
    }
    get speed() { return Math.hypot(this.vel.x, this.vel.z); }
    setAnimal(id) {
      const def = H.ANIMAL[id] || H.ANIMAL.goat; this.def = def; this.animalId = def.id;
      if (this.parts) this.root.remove(this.parts.root);
      const outfit = this.remoteOutfit || (H.state ? H.getOutfit(def.id, this.idx) : {});
      this.parts = H.buildAnimal(def, outfit); this.root.add(this.parts.root);
      this.height = this.parts.height; this.radius = this.parts.radius; this.mass = def.stats.mass; this.outfit = outfit;
      this.trail = outfit.trail && H.COSMETIC[outfit.trail]; this.aura = outfit.aura && H.COSMETIC[outfit.aura];
      this.emotes = (outfit.emotes || []).map(e => H.COSMETIC[e]).filter(Boolean);
      if (this.held) this.drop();
    }
    teleport(x, y, z, interior) { this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.interior = interior || null; this.ragdoll = null; this.root.position.copy(this.pos); this.cam.x.set(x, y + 4, z + 8); }
    knock(ix, iy, iz, dmg) { if (this.vehicle || this.ride) return; if (H.hurtPlayer) H.hurtPlayer(this, dmg !== undefined ? dmg : Math.hypot(ix, iy, iz) * 0.3); if (H.noKnock && H.noKnock(this)) return; this.vel.set(this.vel.x + ix, Math.max(this.vel.y, 0) + iy, this.vel.z + iz); this.startRagdoll(2.2); }
    startRagdoll(t) {
      if (this.ride) return; if (this.held) this.drop();
      this.ragdoll = { t: 0, min: t || 2, spin: new V((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14) }; this.emote = null;
      H.Audio.voice(this.def.voice, 1.25);
    }
    // ------------------------------------------------------------------
    update(dt, inp) {
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      for (const k in this.timers) this.timers[k] = Math.max(0, this.timers[k] - dt);
      this.cam.yaw = inp.camYaw; this.cam.pitch = inp.camPitch;
      if (inp.interact) this.interact();
      if (this.vehicle) { this.vehicle.drive(dt, inp, this); this.pos.copy(this.vehicle.seatPos()); this.root.position.copy(this.pos); this.root.rotation.set(0, this.vehicle.yaw, 0); this.animateIdle(dt); return; }
      if (this.ride) { this.updateRide(dt, inp); return; }
      if (this.mount) { H.updateMount(this, dt, inp); return; }
      if (inp.gadget) H.cycleGadget(this);
      if (this.ragdoll) { this.updateRagdoll(dt, inp); return; }
      const def = this.def, st = def.stats;
      // ----- input → wish direction
      const sy = Math.sin(inp.camYaw), cy = Math.cos(inp.camYaw);
      let wx = -inp.mx * cy + inp.mz * sy, wz = inp.mx * sy + inp.mz * cy; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
      if (inp.moonwalk) { wx = -wx; wz = -wz; }
      const depth = H.waterDepth(this.pos.x, this.pos.z, this.interior);
      const inWater = depth > 0.6 && this.pos.y < 0.3;
      this.inWater = inWater;
      let spd = st.spd * (H.statMul ? H.statMul(this, 'spd') : 1) * (inp.sprint ? 1.65 : 1) * (this.timers.howl ? 1.5 : 1) * (this.heldSlow || 1);
      if (inWater) spd = st.spd * (0.35 + 0.45 * st.swim) * (H.statMul ? H.statMul(this, 'swm') : 1) * (inp.sprint ? 1.4 : 1);
      if (this.timers.roll) spd *= 2.1; if (this.timers.slide) spd *= 2.2;
      const flying = st.fly && !this.onGround && !inWater;
      if (flying) spd *= 1.5;
      if (wl > 0.1 && this.emote && this.emote.cancel !== false) this.emote = null;
      const acc = this.onGround || inWater ? 12 : flying ? 4 : 2.5;
      if (!this.timers.dash) { this.vel.x += (wx * spd - this.vel.x) * Math.min(1, acc * dt); this.vel.z += (wz * spd - this.vel.z) * Math.min(1, acc * dt); }
      if (this.gadget && this.idx === 0) this.yaw = H.angLerp(this.yaw, inp.camYaw, Math.min(1, dt * 14)); else if (wl > 0.1 && !inp.moonwalk) this.yaw = H.angLerp(this.yaw, Math.atan2(wx, wz), Math.min(1, dt * (this.onGround ? 12 : 6)));
      // ----- vertical
      if (inp.jumpPressed) {
        if (this.onGround || this.coyote > 0) { this.vel.y = st.jmp * (H.statMul ? H.statMul(this, 'jmp') : 1); this.onGround = false; this.coyote = 0; this.usedDbl = false; H.Audio.sfx('jump'); }
        else if (inWater) { this.vel.y = st.jmp * 0.7; }
        else if (st.dbl && !this.usedDbl) { this.usedDbl = true; this.vel.y = st.jmp * 0.95; H.fx.burst(this.pos.x, this.pos.y, this.pos.z, new THREE.Color('#ffffff'), 8, 3, 0.2); }
      }
      if (inWater) {
        const target = st.dive && inp.descend ? -40 : -this.height * 0.45;
        const ground = H.terrainH(this.pos.x, this.pos.z);
        if (inp.descend && st.dive) this.vel.y += (-8 - this.vel.y) * Math.min(1, 3 * dt);
        else if (inp.jump) this.vel.y += (6 - this.vel.y) * Math.min(1, 3 * dt);
        else this.vel.y += ((target - this.pos.y) * 4 - this.vel.y) * Math.min(1, 4 * dt);
        if (this.pos.y < ground + 0.3) this.pos.y = ground + 0.3;
        H.stat('swimKm', this.speed * dt / 1000);
        if (Math.random() < dt * 4 && this.speed > 2) H.fx.spawn(this.pos.x, 0.1, this.pos.z, 0, 2, 0, new THREE.Color('#e8f6ff'), 0.25, 0.5, 6);
      } else if (flying) {
        if (inp.jump) this.vel.y += (st.jet ? 70 : 55) * dt; this.vel.y -= G * dt * 0.75;
        if (inp.descend) this.vel.y -= 40 * dt;
        this.vel.y = H.clamp(this.vel.y, -40, 14); H.stat('flyKm', this.speed * dt / 1000);
        if (st.jet && inp.jump) H.fx.spawn(this.pos.x, this.pos.y + 0.4, this.pos.z, (Math.random() - 0.5) * 2, -8, (Math.random() - 0.5) * 2, new THREE.Color('#ff9a2a'), 0.35, 0.4, 0);
      } else {
        this.vel.y -= G * dt;
        if (st.glide && inp.jump && this.vel.y < -2) { this.vel.y = -2.5; this.vel.x *= 1 + dt * 0.5; this.vel.z *= 1 + dt * 0.5; }
      }
      if (this.timers.hover) this.vel.y = Math.max(this.vel.y, 0.5);
      // ----- integrate
      const prevY = this.pos.y;
      this.pos.addScaledVector(this.vel, dt);
      const hit = H.collideStatic(this.pos, this.radius, this.height, this.interior);
      this.climbing = false;
      if (hit.hit) {
        const into = -(wx * hit.x + wz * hit.z);
        if (st.climb && into > 0.4 && !inWater) { this.climbing = true; this.vel.y = Math.max(this.vel.y, 7 * st.climb); if (hit.top - this.pos.y < 1.2) { this.vel.y = 6; this.pos.x -= hit.x * 0.6; this.pos.z -= hit.z * 0.6; } }
        if (this.timers.dash && this.speed > 18) { H.Audio.sfx('thud'); H.shake(this.pos.x, this.pos.z, 0.4); this.timers.dash = 0; }
      }
      const g = H.groundAt(this.pos.x, this.pos.z, Math.max(prevY, this.pos.y), this.interior);
      this.propGround(g);
      if (this.pos.y <= this.groundY) {
        if (!this.onGround && this.vel.y < -6) { H.Audio.sfx('land', Math.min(1, -this.vel.y / 30)); if (this.timers.divebomb) { this.timers.divebomb = 0; this.shockwave(12, 38, 14, true); } }
        if (this.vel.y < -32 && !st.fly && def.id !== 'cat' && !inWater) { this.pos.y = this.groundY; if (H.hurtPlayer) H.hurtPlayer(this, (-this.vel.y - 30) * 1.5); this.startRagdoll(2); this.vel.y = 6; H.floatText('SPLAT!', this.pos, { cls: 'big' }); return; }
        this.pos.y = this.groundY; if (this.vel.y < 0) this.vel.y = 0; if (!this.onGround && this.airT > 0.2) { H.stat('bestAir', this.airT, true); H.emit('landed', this, this.airT); }
        this.onGround = true; this.coyote = 0.12; this.airT = 0; this.usedDbl = false;
      } else {
        if (this.onGround) this.coyote = 0.12; this.onGround = this.pos.y - this.groundY < 0.08 && this.vel.y <= 0; if (!this.onGround) { this.coyote -= dt; this.airT += dt; }
      }
      if (this.onGround && this.groundY > -1 && !this.interior && this.pos.y - prevY < -0.5) this.pos.y = this.groundY;
      if (this.pos.y < -80 && !this.interior) this.respawnSafe();
      // ----- interactions with dynamic world
      this.touchProps(dt); this.touchNPCs(); this.touchVehicles();
      if (this.held) this.updateHeld(dt);
      // ----- actions
      if (this.gadget && (inp.attack || (this.idx === 0 && inp.fireHeld && H.GADGET[this.gadget].rate < 0.3))) H.fireGadget(this);
      else if (inp.attack && this.cd.atk <= 0) this.attack(1);
      if (inp.grab && this.cd.grab <= 0) this.grab();
      if (inp.special && this.cd.sp <= 0) this.special();
      if (inp.ragdoll) { this.startRagdoll(1.2); }
      if (inp.emoteIdx >= 0) this.doEmote(inp.emoteIdx);
      if (this.timers.flame) this.fireBreath(dt);
      if (this.timers.blackhole) this.updateBlackhole(dt);
      // ----- visuals
      this.root.position.copy(this.pos); this.root.rotation.set(0, this.yaw, 0);
      this.animate(dt, inWater, flying);
      this.effects(dt);
      if (this.pos.y > 0 && !this.interior) H.stat('walkKm', this.speed * dt / 1000);
    }
    propGround(g) {
      this.groundY = g;
      H.propsNear(this.pos.x, this.pos.z, this.radius + 4, tmpP);
      for (const p of tmpP) {
        if (p.held === this) continue; const top = p.pos.y + (p.f.tramp ? 0.2 : p.r * 0.85);
        if (H.dist2(this.pos.x, this.pos.z, p.pos.x, p.pos.z) < (p.r * 0.9) * (p.r * 0.9) && this.pos.y >= top - 0.6 && top > this.groundY) {
          if (p.f.tramp && this.vel.y < -1) { this.vel.y = p.interior ? 22 : 125; this.pos.y = top + 0.1; H.Audio.sfx('bounce'); H.floatText('BOING!', this.pos); return; }
          this.groundY = top;
        }
      }
    }
    respawnSafe() { const h = H.terrainH(this.pos.x, this.pos.z); this.teleport(this.pos.x, Math.max(h, 0) + 3, this.pos.z); H.toast('Whoops — back on solid ground.'); }
    touchProps(dt) {
      H.propsNear(this.pos.x, this.pos.z, this.radius + 3, tmpP);
      for (const p of tmpP) {
        if (p.held || p.f.static) continue;
        const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dy = p.pos.y - (this.pos.y + this.height * 0.4);
        const rr = this.radius + p.r; const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && Math.abs(dy) < this.height * 0.6 + p.r) {
          const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, pen = rr - d;
          const ratio = this.mass / (this.mass + p.mass);
          p.pos.x += nx * pen * ratio; p.pos.z += nz * pen * ratio; this.pos.x -= nx * pen * (1 - ratio); this.pos.z -= nz * pen * (1 - ratio);
          const rel = this.vel.x * nx + this.vel.z * nz;
          if (rel > 0.5) { const boost = this.timers.dash || this.timers.roll || this.timers.slide ? 2.2 : 1; H.pushProp(p, nx * rel * this.mass * boost, rel * 0.15 * this.mass * boost, nz * rel * this.mass * boost, this); if (rel * boost > p.breakAt * 0.9 && boost > 1) H.breakProp(p, this); }
        }
      }
    }
    touchNPCs() {
      for (const n of H.NPCs.near(this.pos.x, this.pos.z, this.radius + 2)) {
        if (n.ragdoll || n.held) continue;
        const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 0.01, rr = this.radius + n.radius;
        if (d < rr && Math.abs(n.pos.y - this.pos.y) < 2.5) {
          const sp = this.speed;
          if (sp > 9 || this.timers.dash || this.timers.roll || this.timers.slide) { const f = (sp + 6) * Math.sqrt(this.mass); n.knock(dx / d * f * 0.8, f * 0.5, dz / d * f * 0.8, this); }
          else { n.pos.x += dx / d * (rr - d); n.pos.z += dz / d * (rr - d); n.bump(this); }
        }
      }
    }
    touchVehicles() {
      for (const v of H.vehicles) { if (v.driver) continue; if (v.interior !== this.interior) continue; const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z, rr = v.radius + this.radius; if (dx * dx + dz * dz < rr * rr && this.pos.y < v.pos.y + v.def.size[1]) { const d = Math.hypot(dx, dz) || 0.01; if (this.pos.y > v.pos.y + v.def.size[1] * 0.6) { this.groundY = Math.max(this.groundY, v.pos.y + v.def.size[1]); } else { this.pos.x = v.pos.x + dx / d * rr; this.pos.z = v.pos.z + dz / d * rr; } } }
    }
    // ------------------------------------------------------------------
    forward() { return v1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
    hitCone(reach, cosA, fn) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); const ox = this.pos.x + fx * this.radius * 0.5, oz = this.pos.z + fz * this.radius * 0.5;
      let n = 0; const inCone = (x, y, z, r) => { const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz); if (d > reach + r) return false; if (Math.abs(y - (this.pos.y + this.height * 0.5)) > this.height + 2 + r) return false; return d < r + 0.5 || (dx * fx + dz * fz) / d > cosA; };
      H.propsNear(ox, oz, reach + 2, tmpP); for (const p of tmpP.slice()) if (!p.held && inCone(p.pos.x, p.pos.y, p.pos.z, p.r)) { fn('prop', p); n++; }
      for (const npc of H.NPCs.near(ox, oz, reach + 2)) if (!npc.held && inCone(npc.pos.x, npc.pos.y + 1, npc.pos.z, npc.radius)) { fn('npc', npc); n++; }
      for (const c of H.traffic) if (inCone(c.pos.x, c.pos.y + 1, c.pos.z, 2)) { fn('car', c); n++; }
      for (const vh of H.vehicles) if (!vh.driver && inCone(vh.pos.x, vh.pos.y + 1, vh.pos.z, vh.radius)) { fn('veh', vh); n++; }
      for (const pl of H.players) if (pl !== this && !pl.vehicle && inCone(pl.pos.x, pl.pos.y + 1, pl.pos.z, pl.radius)) { fn('player', pl); n++; }
      for (const pl of H.remotes || []) if (pl.root.visible && !pl.vehModel && inCone(pl.pos.x, pl.pos.y + 1, pl.pos.z, pl.radius)) { fn('player', pl); n++; }
      return n;
    }
    attack(mult, reachMul) {
      const def = this.def; this.cd.atk = 0.42; this.atkAnim = 0.35; this.emote = null;
      const reach = (1.6 + this.radius) * (reachMul || 1), f = (13 + this.mass * 4) * mult * (H.statMul ? H.statMul(this, 'str') : 1), fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), up = def.atk === 'kick' ? 0.25 : 0.45;
      let back = def.atk === 'kick' && def.kind === 'quad' ? -1 : 1;
      if (back < 0) { this.yaw += Math.PI; }
      const n = this.hitCone(reach, 0.45, (k, o) => {
        if (k === 'prop') { H.pushProp(o, fx * back * f, f * up + 3, fz * back * f, this); if (f > o.breakAt * o.mass * 0.6 || f * mult > 40) { if (o.breakAt < 999 && Math.random() < 0.5 + mult * 0.2) H.breakProp(o, this); } }
        if (k === 'npc') { o.knock(fx * back * f * 0.9, f * up * 0.9 + 4, fz * back * f * 0.9, this); }
        if (k === 'car') { if (this.mass * mult >= 2.4) o.wreck(fx * back * f * 0.5, f * 0.4, fz * back * f * 0.5, this); else { o.stop = 2; H.Audio.sfx('horn'); } }
        if (k === 'veh') o.knock(fx * back * f * 0.3 / Math.max(1, o.def.size[2] / 4), f * 0.2, fz * back * f * 0.3 / Math.max(1, o.def.size[2] / 4));
        if (k === 'player') o.knock(fx * back * f * 0.7, f * 0.4, fz * back * f * 0.7);
      });
      if (back < 0) this.yaw -= Math.PI;
      if (!n && H.shakeTrees(this, reach)) { H.Audio.sfx('bonk'); H.stat('headbutts', 1); }
      if (n) { H.Audio.sfx('bonk'); H.stat('headbutts', n); H.shake(this.pos.x, this.pos.z, 0.15 * mult); }
      else H.Audio.sfx('swoosh', 0.5);
      if (Math.random() < 0.25) H.Audio.voice(def.voice);
    }
    grab() {
      this.cd.grab = 0.3;
      if (this.held) { this.throwHeld(); return; }
      let best = null, bd = 1e9; const reach = 2.4 + this.radius;
      this.hitCone(reach, 0.3, (k, o) => { if (k !== 'prop' && k !== 'npc') return; const d = H.dist2(o.pos.x, o.pos.z, this.pos.x, this.pos.z); if (d < bd) { bd = d; best = [k, o]; } });
      H.Audio.sfx('lick');
      if (!best) { this.lickAnim = 0.3; return; }
      const [k, o] = best; this.held = o; this.heldKind = k; o.held = this; this.lickAnim = 0.3; H.stat('grabs', 1);
      const m = k === 'prop' ? o.mass : 1.2; this.heldSlow = m > this.mass * 3 ? 0.35 : m > this.mass ? 0.7 : 1;
      if (k === 'npc') { o.grabbed(this); }
      H.emit('grabbed', this, o);
    }
    updateHeld(dt) {
      const o = this.held; if (!o || o.broken || (o.ragdoll === undefined && false)) { this.held = null; return; }
      this.parts.mouth.getWorldPosition(v2);
      const heavy = this.heldSlow < 0.5;
      const tx = v2.x, tz = v2.z, ty = heavy ? Math.max(o.pos.y, H.groundAt(tx, tz, o.pos.y + 1, this.interior) + (o.r || 0.5)) : v2.y - (o.r || 0.6) * 0.6;
      if (this.heldKind === 'prop') { o.pos.x += (tx - o.pos.x) * Math.min(1, 14 * dt); o.pos.y += (ty - o.pos.y) * Math.min(1, 14 * dt); o.pos.z += (tz - o.pos.z) * Math.min(1, 14 * dt); o.mesh.position.copy(o.pos); o.mesh.rotation.y += Math.sin(this.phase) * 0.02; o.vel.copy(this.vel); o.sleep = false; }
      else { o.pos.set(tx, ty - 1, tz); o.vel.copy(this.vel); }
    }
    drop() { const o = this.held; if (!o) return; o.held = null; if (this.heldKind === 'npc') o.released(this.vel.x, 2, this.vel.z); else H.wakeProp(o); this.held = null; this.heldSlow = 1; }
    throwHeld() {
      const o = this.held; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); const k = this.heldKind; this.drop();
      const s = 18 + this.mass * 3; if (k === 'prop') { o.vel.set(fx * s / Math.max(0.6, Math.sqrt(o.mass)), 9, fz * s / Math.max(0.6, Math.sqrt(o.mass))); o.ang.set(6, 3, 4); o.lastHit = this; H.wakeProp(o); } else o.knock(fx * s, 10, fz * s, this);
      H.Audio.sfx('throw'); this.atkAnim = 0.3;
    }
    // ------------------------------------------------------------------
    shockwave(r, force, scare, ground) {
      const x = this.pos.x, z = this.pos.z;
      H.propsNear(x, z, r, tmpP); for (const p of tmpP.slice()) { if (p.held === this) continue; const dx = p.pos.x - x, dz = p.pos.z - z, d = Math.hypot(dx, dz) + 0.3; if (d > r) continue; const f = force * (1 - d / r) * Math.max(1, p.mass * 0.5); H.pushProp(p, dx / d * f, f * 0.6, dz / d * f, this); }
      for (const n of H.NPCs.near(x, z, Math.max(r, scare || 0))) { const dx = n.pos.x - x, dz = n.pos.z - z, d = Math.hypot(dx, dz) + 0.3; if (d < r && force > 0) n.knock(dx / d * force * (1 - d / r) * 0.8, force * 0.5 * (1 - d / r) + 3, dz / d * force * (1 - d / r) * 0.8, this); else n.scare(this); }
      for (const c of H.traffic) { const d = Math.hypot(c.pos.x - x, c.pos.z - z); if (d < r * 0.7 && force > 30) c.wreck((c.pos.x - x) / d * 10, 12, (c.pos.z - z) / d * 10, this); else if (d < r) c.stop = 3; }
      for (const pl of H.players.concat(H.remotes || [])) if (pl !== this && !pl.vehModel) { const d = Math.hypot(pl.pos.x - x, pl.pos.z - z); if (d < r && force > 0) pl.knock((pl.pos.x - x) / (d + 0.3) * force * 0.5, force * 0.4, (pl.pos.z - z) / (d + 0.3) * force * 0.5); }
      const ringC = new THREE.Color(ground ? '#c8a878' : '#ffffff');
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; H.fx.spawn(x + Math.cos(a) * 1.5, this.pos.y + 0.3, z + Math.sin(a) * 1.5, Math.cos(a) * r * 1.6, 1, Math.sin(a) * r * 1.6, ringC, 0.5, 0.5, 0); }
      H.shake(x, z, force / 60);
    }
    dash(speed, up, t) { const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); this.vel.x = fx * speed; this.vel.z = fz * speed; this.vel.y = Math.max(this.vel.y, up); this.timers.dash = t; this.onGround = false; }
    special() {
      const id = this.def.sp; let cd = 3; H.stat('specials', 1); this.emote = null;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      switch (id) {
        case 'bigbutt': this.dash(16, 2, 0.25); setTimeout(() => this.attack(2.6, 1.4), 120); H.Audio.voice(this.def.voice, 0.8); cd = 2.5; break;
        case 'woolball': this.timers.roll = 3; H.Audio.sfx('bounce'); cd = 5; break;
        case 'slide': this.timers.slide = 2.2; this.dash(this.def.stats.spd * 2.2, 0, 0.1); H.Audio.sfx('swoosh'); cd = 3.5; break;
        case 'moo': H.Audio.voice(this.def.voice, 0.7); this.shockwave(14, 32, 20); cd = 4; break;
        case 'roar': H.Audio.voice(this.def.voice, 0.9); this.shockwave(this.mass > 5 ? 18 : 10, this.mass > 5 ? 34 : 12, 40); this.emoteFlash('roar'); H.emit('roar', this); cd = 4; break;
        case 'bark': H.Audio.voice(this.def.voice); H.Audio.voice(this.def.voice, 1.1); this.shockwave(7, 8, 22); H.emit('roar', this); cd = 1.5; break;
        case 'howl': H.Audio.voice(this.def.voice); this.shockwave(4, 0, 30); this.timers.howl = 6; H.emit('roar', this); cd = 10; break;
        case 'hoot': H.Audio.voice(this.def.voice); H.slowmo = 4; this.shockwave(6, 6, 20); cd = 12; break;
        case 'chestpound': case 'stomp': H.Audio.voice(this.def.voice); this.atkAnim = 0.5; setTimeout(() => this.shockwave(13, 40, 18, true), 250); cd = 3.5; break;
        case 'pounce': this.dash(24 + this.def.stats.spd * 0.5, 9, 0.7); H.Audio.voice(this.def.voice); cd = 2; break;
        case 'charge': this.dash(32, 1, 1.0); H.Audio.voice(this.def.voice); cd = 3.5; break;
        case 'rainbowdash': this.dash(42, 2, 1.2); this.timers.rainbow = 1.4; cd = 3; break;
        case 'deathroll': this.timers.roll = 1.5; this.dash(18, 0, 0.6); if (this.held) { const o = this.held; this.throwHeld(); if (o.knock) o.knock(0, 20, 0, this); } cd = 3; break;
        case 'buck': { this.yaw += Math.PI; const n = this.hitCone(3 + this.radius, 0.3, (k, o) => { const f = 48; if (k === 'prop') H.pushProp(o, Math.sin(this.yaw) * f, 20, Math.cos(this.yaw) * f, this); else if (k === 'npc' || k === 'player') o.knock(Math.sin(this.yaw) * f, 22, Math.cos(this.yaw) * f, this); else if (k === 'car') o.wreck(Math.sin(this.yaw) * 22, 16, Math.cos(this.yaw) * 22, this); }); this.yaw -= Math.PI; this.atkAnim = 0.4; H.Audio.sfx(n ? 'bonk' : 'swoosh'); cd = 1.6; break; }
        case 'superhop': this.vel.y = this.def.stats.jmp * 2.5; this.onGround = false; H.Audio.sfx('bounce'); H.fx.burst(this.pos.x, this.pos.y, this.pos.z, new THREE.Color('#ffffff'), 14, 4, 0.3); cd = 3; break;
        case 'dive': if (!this.onGround) { this.vel.set(fx * 20, -60, fz * 20); this.timers.divebomb = 3; H.Audio.voice(this.def.voice); } else { this.vel.y = 20; } cd = 2; break;
        case 'necksmash': this.attack(2.2, 2.2); cd = 1.8; break;
        case 'spit': this.projectile('spit', 70, 0.05); H.Audio.sfx('spit'); cd = 0.8; break;
        case 'eggbomb': this.projectile('egg', 22, 0.7); H.Audio.voice(this.def.voice); cd = 1.6; break;
        case 'laser': this.laser(); cd = 1.2; break;
        case 'rocket': this.projectile('rocket', 60, 0.05); H.Audio.sfx('swoosh'); cd = 2.5; break;
        case 'teleport': { H.fx.burst(this.pos.x, this.pos.y + 1, this.pos.z, new THREE.Color('#7ef25a'), 20, 5, 0.3); this.pos.x += fx * 20; this.pos.z += fz * 20; H.collideStatic(this.pos, this.radius, this.height, this.interior); this.pos.y = Math.max(this.pos.y, H.groundAt(this.pos.x, this.pos.z, 9999, this.interior) + 0.2); H.Audio.sfx('teleport'); H.fx.burst(this.pos.x, this.pos.y + 1, this.pos.z, new THREE.Color('#7ef25a'), 20, 5, 0.3); cd = 1.5; break; }
        case 'firebreath': this.timers.flame = 1.6; H.Audio.sfx('fire'); setTimeout(() => H.Audio.sfx('fire'), 600); cd = 3; break;
        case 'spray': this.timers.flame = 1.4; this.sprayWater = true; H.Audio.voice(this.def.voice); cd = 3; break;
        case 'blackhole': this.timers.blackhole = 3.2; this.bh = new V(this.pos.x + fx * 12, this.pos.y + 3, this.pos.z + fz * 12); H.Audio.sfx('ufo'); cd = 8; break;
        case 'rampage': this.timers.howl = 6; this.timers.rage = 6; H.Audio.voice(this.def.voice, 0.8); this.dash(20, 1, 0.5); cd = 12; break;
        case 'skyjump': this.vel.y = 45; this.onGround = false; H.Audio.sfx('bounce'); H.fx.burst(this.pos.x, this.pos.y, this.pos.z, new THREE.Color('#ffffff'), 16, 5, 0.3); cd = 0.4; break;
        default: this.shockwave(10, 20, 15);
      }
      this.cd.sp = cd; this.cd.spMax = cd;
    }
    emoteFlash() { this.atkAnim = 0.6; }
    projectile(type, speed, arc) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const m = type === 'egg' ? H.mesh('sphere', '#fff6e0', 0.6, 0.8, 0.6) : type === 'rocket' ? H.mesh('cyl', '#d8d8d8', 0.4, 1.4, 0.4) : H.mesh('sphere', '#c8f0d0', 0.35, 0.35, 0.35);
      if (type === 'rocket') m.rotation.x = Math.PI / 2;
      const g = new THREE.Group(); g.add(m); g.position.set(this.pos.x + fx * (this.radius + 0.8), this.pos.y + this.height * 0.7, this.pos.z + fz * (this.radius + 0.8)); g.rotation.y = this.yaw; H.scene.add(g);
      H.projectiles.push({ type, mesh: g, pos: g.position, vel: new V(fx * speed, arc * speed + (type === 'egg' ? 6 : 0), fz * speed), owner: this, life: 4, interior: this.interior });
    }
    laser() {
      H.Audio.sfx('laser'); const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); const y = this.pos.y + this.height * 0.8;
      for (let d = 1; d < 45; d += 0.8) H.fx.spawn(this.pos.x + fx * d, y, this.pos.z + fz * d, 0, 0, 0, new THREE.Color('#ff2a2a'), 0.25, 0.25, 0);
      this.hitCone(45, 0.97, (k, o) => { if (k === 'prop') { H.pushProp(o, fx * 20, 10, fz * 20, this); if (o.breakAt < 999) H.breakProp(o, this); } else if (k === 'npc') o.knock(fx * 18, 12, fz * 18, this); else if (k === 'car') o.wreck(fx * 10, 12, fz * 10, this); });
    }
    fireBreath(dt) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); this.parts.mouth.getWorldPosition(v2); const water = this.sprayWater;
      for (let i = 0; i < 6; i++) H.fx.spawn(v2.x, v2.y, v2.z, fx * 26 + (Math.random() - 0.5) * 7, (Math.random() - 0.3) * 5, fz * 26 + (Math.random() - 0.5) * 7, new THREE.Color(water ? '#9ad8ff' : (Math.random() < 0.5 ? '#ff7a1a' : '#ffd21a')), 0.6, 0.5, water ? 10 : -4);
      this.hitCone(13, 0.75, (k, o) => {
        if (k === 'prop') { H.pushProp(o, fx * 30 * dt * 4, 6 * dt * 4, fz * 30 * dt * 4, this); if (!water && (o.f.wood || o.f.crop || o.type === 'hay' || o.type === 'balloon') && Math.random() < dt * 3) H.breakProp(o, this); }
        else if (k === 'npc') { if (water) o.knock(fx * 14, 6, fz * 14, this); else o.scare(this, true); }
      });
      if (this.timers.flame <= dt) this.sprayWater = false;
    }
    updateBlackhole(dt) {
      const c = this.bh; for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, r = 6 + Math.random() * 10; H.fx.spawn(c.x + Math.cos(a) * r, c.y + (Math.random() - 0.5) * 6, c.z + Math.sin(a) * r, -Math.cos(a) * r * 2, 0, -Math.sin(a) * r * 2, new THREE.Color(Math.random() < 0.5 ? '#b98cff' : '#2a0a4a'), 0.4, 0.45, 0); }
      const fling = this.timers.blackhole <= dt;
      H.propsNear(c.x, c.z, 26, tmpP); for (const p of tmpP) { if (p.held) continue; const dx = c.x - p.pos.x, dy = c.y - p.pos.y, dz = c.z - p.pos.z, d = Math.hypot(dx, dy, dz) + 0.5; if (fling) H.pushProp(p, -dx / d * 40, 25, -dz / d * 40, this); else { p.vel.x += dx / d * 60 * dt; p.vel.y += (dy / d * 60 + 30) * dt; p.vel.z += dz / d * 60 * dt; H.wakeProp(p); } }
      for (const n of H.NPCs.near(c.x, c.z, 22)) { if (fling) n.knock((n.pos.x - c.x) * 2, 20, (n.pos.z - c.z) * 2, this); else if (!n.ragdoll) n.knock((c.x - n.pos.x) * 0.5, 8, (c.z - n.pos.z) * 0.5, this); }
      if (fling) { H.Audio.sfx('boom'); H.shake(c.x, c.z, 0.8); }
    }
    doEmote(i) {
      const e = this.emotes[i]; if (!e || !this.onGround) return;
      this.emote = { id: e.base, t: 0, cancel: true }; H.stat('emotes', 1);
      if (e.base === 'summit' || e.base === 'cheer' || e.base === 'victory') H.Audio.voice(this.def.voice, 1.2);
    }
    // ------------------------------------------------------------------
    updateRagdoll(dt, inp) {
      const r = this.ragdoll; r.t += dt; this.vel.y -= G * dt; this.pos.addScaledVector(this.vel, dt);
      const hit = H.collideStatic(this.pos, this.radius, this.height * 0.5, this.interior); if (hit.hit) { const vn = this.vel.x * hit.x + this.vel.z * hit.z; if (vn < 0) { this.vel.x -= 1.6 * vn * hit.x; this.vel.z -= 1.6 * vn * hit.z; r.spin.multiplyScalar(-0.8); if (-vn > 10) H.Audio.sfx('thud'); } }
      const water = H.waterDepth(this.pos.x, this.pos.z, this.interior) > 0.6 && this.pos.y < 0.3;
      const g = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, this.interior) + this.radius * 0.4;
      if (water) { this.vel.y += 40 * dt; this.vel.multiplyScalar(1 - dt); }
      if (this.pos.y < g) { this.pos.y = g; if (this.vel.y < -4) { this.vel.y *= -0.35; r.spin.multiplyScalar(0.7); H.Audio.sfx('thud', 0.5); H.fx.burst(this.pos.x, this.pos.y, this.pos.z, new THREE.Color('#c8b898'), 5, 3, 0.25); } else this.vel.y = 0; this.vel.x *= 1 - 3 * dt; this.vel.z *= 1 - 3 * dt; r.spin.multiplyScalar(1 - 2.5 * dt); }
      this.touchNPCsRagdoll();
      const rig = this.parts.rig; rig.rotation.x += r.spin.x * dt; rig.rotation.y += r.spin.y * dt; rig.rotation.z += r.spin.z * dt;
      this.parts.legs.forEach((l, i) => (l.rotation.x = Math.sin(r.t * 20 + i * 2) * 1.2)); this.parts.arms.forEach((l, i) => (l.rotation.z = Math.sin(r.t * 18 + i) * 1.4));
      if (this.parts.head) this.parts.head.rotation.z = Math.sin(r.t * 9) * 0.5;
      this.root.position.copy(this.pos); this.root.position.y += 0.3;
      if (this.pos.y < -80) this.respawnSafe();
      const slow = this.vel.lengthSq() < 4;
      if ((r.t > r.min && slow) || (r.t > 0.6 && (inp.jumpPressed || inp.ragdoll) && slow)) { this.ragdoll = null; rig.rotation.set(0, 0, 0); rig.position.set(0, 0, 0); this.parts.head.rotation.set(this.parts.head.rotation.x, 0, 0); this.vel.set(0, 0, 0); this.pos.y = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 2, this.interior); }
    }
    touchNPCsRagdoll() { if (this.vel.lengthSq() < 80) return; for (const n of H.NPCs.near(this.pos.x, this.pos.z, this.radius + 1.5)) if (!n.ragdoll) n.knock(this.vel.x * 0.7, 8, this.vel.z * 0.7, this); }
    // ------------------------------------------------------------------
    updateRide(dt, inp) {
      const r = this.ride; r.t += dt;
      if (r.type === 'coaster') {
        const c = H.coaster; const p = c.curve.getPoint(r.u), p2 = c.curve.getPoint((r.u + 0.003) % 1);
        const slope = (p2.y - p.y) / Math.max(0.01, p.distanceTo(p2)); r.spd = H.clamp(r.spd - slope * 30 * dt, 10, 42); r.u += r.spd * dt / c.curve.getLength();
        if (r.u >= 1) { this.endRide(); H.addCoins(25, 'Coaster ride'); return; }
        this.pos.copy(p); this.pos.y += 1.3; c.cart.position.set(p.x, p.y + 0.8, p.z); c.cart.lookAt(p2.x, p2.y + 0.8, p2.z);
        this.yaw = Math.atan2(p2.x - p.x, p2.z - p.z); r.vel = v2.copy(p2).sub(p).normalize().multiplyScalar(r.spd).clone();
        if (Math.random() < dt * 0.6) H.Audio.sfx('scream', 0.3);
      } else if (r.type === 'drop') {
        const d = H.dropTower; let h; if (r.t < 7) h = 2 + (r.t / 7) * 64; else if (r.t < 9) h = 66; else h = Math.max(2, 66 - (r.t - 9) * (r.t - 9) * 15);
        d.ring.position.y = d.y + h; this.pos.set(d.x, d.y + h + 1, d.z + 4.5); if (r.t > 9 && h <= 2) { this.endRide(); H.addCoins(15, 'Drop tower'); return; }
        r.vel = new V(0, r.t > 9 ? -30 : 0, 0);
      }
      if (inp.jumpPressed || inp.interact) { const vel = r.vel || new V(); this.endRide(); this.vel.copy(vel); this.vel.y += 12; this.startRagdoll(2); H.floatText('YEET!', this.pos, { cls: 'big' }); }
      this.root.position.copy(this.pos); this.root.rotation.set(0, this.yaw, 0); this.animateIdle(dt);
    }
    endRide() { const r = this.ride; this.ride = null; if (H.coaster) H.coaster.riding = false; if (r.type === 'drop') H.dropTower.ring.position.y = H.dropTower.y + 2; this.pos.y += 1; }
    startRide(type) { if (type === 'coaster') { if (H.coaster.riding) return H.toast('The coaster is busy — wait a sec.'); H.coaster.riding = true; this.ride = { type, t: 0, u: 0, spd: 10 }; } else this.ride = { type, t: 0 }; H.Audio.sfx('click'); }
    // ------------------------------------------------------------------
    interact() {
      if (this.vehicle) { this.vehicle.exit(this); return; }
      if (this.mount) return;
      if (this.ride) return;
      const c = this.nearestInteract(); if (!c) return; H.doInteract(this, c);
    }
    nearestInteract() {
      let best = null, bd = 1e9;
      for (const v of H.vehicles) { if (v.driver || v.dead || v.interior !== this.interior) continue; const d = H.dist2(v.pos.x, v.pos.z, this.pos.x, this.pos.z); const r = v.radius + 3.5; if (d < r * r && Math.abs(v.pos.y - this.pos.y) < 4 && d < bd) { bd = d; best = { kind: 'vehicle', v, label: 'Drive ' + v.def.name }; } }
      const tmp = []; H.interactGrid.query(this.pos.x, this.pos.z, 1, tmp);
      for (const o of tmp) { if ((o.interior || null) !== (this.interior || null)) continue; if (o.hidden) continue; if (Math.abs((o.y || this.pos.y) - this.pos.y) > 6) continue; const d = H.dist2(o.x, o.z, this.pos.x, this.pos.z); if (d < o.r * o.r && d < bd + 4) { bd = d; best = o; } }
      for (const n of H.NPCs.near(this.pos.x, this.pos.z, this.radius + 2.5)) { const d = H.dist2(n.pos.x, n.pos.z, this.pos.x, this.pos.z); if (d >= bd) continue; if (H.canRide(n)) { bd = d; best = { kind: 'custom', label: 'Ride the ' + n.animal[0].replace('wild', '').replace('deer', 'deer'), fn: p => H.mountNpc(p, n) }; } else if (n.isHuman && !n.ragdoll && n.type !== 'officer') { bd = d; best = { kind: 'custom', label: 'Talk', fn: p => H.talkTo(p, n) }; } }
      for (const f of H.fishSpots) if (!this.interior && H.dist2(f.x, f.z, this.pos.x, this.pos.z) < 36) best = { kind: 'fish', spot: f, label: 'Go fishing — ' + f.name };
      return best;
    }
    // ------------------------------------------------------------------
    animate(dt, inWater, flying) {
      const P = this.parts, def = this.def, sp = this.speed, rig = P.rig;
      this.phase += dt * (3 + sp * 1.1);
      const s = Math.sin(this.phase), c = Math.cos(this.phase), amp = Math.min(1, sp / 6) * 0.7;
      rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
      if (this.emote) { this.animEmote(dt); return; }
      if (def.kind === 'blob') { const sq = 1 + Math.sin(this.phase * 1.4) * 0.12 * (amp + 0.2); rig.scale.set(1 / sq, sq, 1 / sq); rig.position.y = Math.abs(s) * amp * 0.6; }
      else if (def.kind === 'fish' && !inWater) { rig.rotation.z = Math.PI / 2 * 0.9; rig.position.y = Math.abs(s) * 0.5 * (amp + 0.3); P.tail.rotation.y = s * 0.8; }
      else if (def.kind === 'fish') { P.tail.rotation.y = s * 0.6; rig.rotation.x = -this.vel.y * 0.03; }
      P.legs.forEach((l, i) => { const ph = def.kind === 'quad' ? (i === 0 || i === 3 ? 0 : Math.PI) : i * Math.PI; l.rotation.x = this.onGround || inWater ? Math.sin(this.phase + ph) * amp * 1.1 : 0.5 * (i < 2 ? -1 : 1); });
      P.arms.forEach((a, i) => { a.rotation.x = Math.sin(this.phase + i * Math.PI) * amp * 1.2; a.rotation.z = 0; });
      if (def.kind !== 'blob' && def.kind !== 'fish') rig.position.y = Math.abs(c) * amp * 0.12;
      if (P.tail && def.kind !== 'fish') { P.tail.rotation.y = Math.sin(this.phase * (def.tail === 'wag' ? 3 : 1.2)) * (def.tail === 'wag' ? 0.8 : 0.25); }
      // wings
      const flap = flying || (!this.onGround && (def.stats.glide)) ? Math.sin(performance.now() * 0.025) * 0.9 : 0.15;
      P.wings.forEach(w => (w.rotation.z = w.userData.side * (flying || !this.onGround ? flap : -0.2)));
      if (flying) rig.rotation.x = H.clamp(-this.vel.y * 0.03 + sp * 0.012, -0.5, 0.5);
      // head / attack lunge
      if (this.atkAnim > 0) { this.atkAnim -= dt; const k = Math.sin((1 - this.atkAnim / 0.35) * Math.PI); if (def.kind === 'biped') { P.arms.forEach(a => (a.rotation.x = -2.2 * k)); rig.rotation.x = 0.15 * k; } else { rig.position.z = 0.35 * k; P.head.rotation.x = 0.6 * k; } }
      else P.head.rotation.x = H.lerp(P.head.rotation.x, this.lickAnim > 0 ? 0.3 : 0, 0.2);
      if (this.lickAnim > 0) this.lickAnim -= dt;
      if (this.timers.roll) { rig.rotation.x = performance.now() * 0.02; rig.position.y = this.height * 0.25; }
      if (this.timers.slide) { rig.rotation.x = 0.3; rig.position.y = -this.parts.legLen * 0.6; P.legs.forEach(l => (l.rotation.x = 1.4)); }
      if (this.climbing) rig.rotation.x = -1.0;
      if (P.trunk) P.trunk.rotation.x = 0.3 + Math.sin(this.phase * 0.5) * 0.2;
      if (P.googly) P.eyes.forEach((e, i) => { e.position.x = e.userData.base.x + Math.sin(performance.now() * 0.01 + i * 3) * 0.05; e.position.y = e.userData.base.y + Math.cos(performance.now() * 0.013 + i) * 0.05; });
      if (inWater && def.kind !== 'fish') rig.position.y -= 0.1;
      P.root.traverse(o => { if (o.userData.spin) o.rotation.y += dt * 15; if (o.userData.flap) o.rotation.z = o.userData.flap * (0.3 + Math.sin(performance.now() * 0.008) * 0.25); if (o.userData.bob) o.position.y = (o.userData.by = o.userData.by || o.position.y) + Math.sin(performance.now() * 0.003) * 0.15; if (o.userData.cape) o.rotation.x = -0.2 - Math.min(1.2, sp * 0.06) + Math.sin(performance.now() * 0.01) * 0.08; });
    }
    animateIdle(dt) { const P = this.parts; P.legs.forEach(l => (l.rotation.x = 0.4)); P.rig.rotation.set(0, 0, 0); P.rig.position.set(0, 0, 0); }
    animEmote(dt) {
      const e = this.emote, P = this.parts, rig = P.rig, t = (e.t += dt), id = e.id, h = this.height;
      const loop = { sit: 1, playdead: 1, levitate: 1 }[id];
      if (!loop && t > 2.6) { this.emote = null; return; }
      switch (id) {
        case 'spin': rig.rotation.y = t * 12; break;
        case 'wiggle': rig.rotation.z = Math.sin(t * 14) * 0.3; rig.position.x = Math.sin(t * 7) * 0.25; P.tail.rotation.y = Math.sin(t * 20); break;
        case 'sit': rig.rotation.x = -0.45; rig.position.y = -this.parts.legLen * 0.3; P.legs.forEach((l, i) => (l.rotation.x = i >= 2 ? -1.3 : 0)); break;
        case 'playdead': rig.rotation.z = Math.PI; rig.position.y = h * 0.8; P.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 2 + i) * 0.1)); break;
        case 'flip': case 'backflip': { const k = Math.min(1, t / 0.9); rig.rotation.x = (id === 'flip' ? 1 : -1) * k * Math.PI * 2; rig.position.y = Math.sin(k * Math.PI) * 3; break; }
        case 'headbang': P.head.rotation.x = Math.sin(t * 16) * 0.7; rig.rotation.x = Math.sin(t * 16) * 0.1; break;
        case 'moonwalk': P.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 10 + i * Math.PI) * 0.6)); this.pos.x -= Math.sin(this.yaw) * dt * 3; this.pos.z -= Math.cos(this.yaw) * dt * 3; break;
        case 'breakdance': rig.rotation.z = Math.PI * 0.85; rig.rotation.y = t * 14; rig.position.y = h * 0.6; P.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 20 + i) * 1.2)); break;
        case 'salute': case 'wave': (P.arms[1] || P.legs[1]).rotation.x = -2.4 + (id === 'wave' ? Math.sin(t * 12) * 0.4 : 0); if (P.arms[1]) P.arms[1].rotation.z = id === 'wave' ? 0.4 : 0; break;
        case 'cheer': rig.position.y = Math.abs(Math.sin(t * 7)) * 1.4; P.arms.forEach(a => (a.rotation.x = -2.8)); break;
        case 'worm': rig.rotation.x = 0.3 + Math.sin(t * 8) * 0.4; rig.position.y = Math.abs(Math.sin(t * 8)) * 0.6; break;
        case 'twirl': rig.rotation.x = -0.9; rig.rotation.y = t * 9; rig.position.y = 0.4; break;
        case 'tornado': rig.rotation.y = t * 30; rig.position.y = Math.min(4, t * 3); for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; H.fx.spawn(this.pos.x + Math.cos(a) * 2, this.pos.y + Math.random() * 5, this.pos.z + Math.sin(a) * 2, -Math.sin(a) * 8, 3, Math.cos(a) * 8, new THREE.Color('#d8e0e8'), 0.3, 0.6, 0); } break;
        case 'levitate': rig.position.y = 2 + Math.sin(t * 2) * 0.4; rig.rotation.x = -0.2; if (Math.random() < 0.3) H.fx.spawn(this.pos.x + (Math.random() - 0.5) * 2, this.pos.y + 1, this.pos.z + (Math.random() - 0.5) * 2, 0, -1, 0, new THREE.Color('#b98cff'), 0.25, 0.8, 0); break;
        case 'victory': case 'summit': rig.rotation.x = -0.8; rig.position.y = this.parts.legLen * 0.4; P.legs.forEach((l, i) => (l.rotation.x = i < 2 ? -1.2 + Math.sin(t * 10 + i) * 0.4 : 0.6)); P.arms.forEach(a => (a.rotation.x = -2.8 + Math.sin(t * 10) * 0.3)); break;
        case 'bow': rig.rotation.x = Math.min(0.5, t) * (t < 2 ? 1 : 0); P.head.rotation.x = 0.6; break;
      }
    }
    effects(dt) {
      if (this.timers.rainbow || (this.trail && this.speed > 3)) {
        this.trailT -= dt; if (this.trailT <= 0) {
          this.trailT = 0.035; const b = this.timers.rainbow ? 'rainbow' : this.trail.base; const x = this.pos.x + (Math.random() - 0.5) * this.radius, y = this.pos.y + 0.3 + Math.random() * this.height * 0.5, z = this.pos.z + (Math.random() - 0.5) * this.radius;
          const col = b === 'rainbow' ? new THREE.Color().setHSL((performance.now() * 0.0004) % 1, 1, 0.55) : new THREE.Color(this.trail.data.c);
          const up = { fire: [3, -6], bubbles: [2, -3], hearts: [2, -2], ghost: [1.5, -2], stardust: [0.5, 0], money: [3, 12], leaves: [1, 6], snow: [0.5, 4], lightning: [0, 0], sparkle: [1, 0], footprints: [0, 0], meteor: [2, 4] }[b] || [1, 2];
          H.fx.spawn(x, b === 'footprints' ? this.groundY + 0.05 : y, z, (Math.random() - 0.5) * (b === 'lightning' ? 6 : 1), up[0], (Math.random() - 0.5) * (b === 'lightning' ? 6 : 1), col, b === 'footprints' ? 0.6 : b === 'money' ? 0.35 : 0.3, b === 'footprints' ? 3 : 0.9, up[1], b !== 'footprints');
        }
      }
      if (this.aura && Math.random() < dt * 25) { const a = Math.random() * 6.28, r = this.radius * 1.3; H.fx.spawn(this.pos.x + Math.cos(a) * r, this.pos.y + Math.random() * this.height, this.pos.z + Math.sin(a) * r, 0, 1.5, 0, new THREE.Color(this.aura.data.c), 0.22, 0.8, -1); }
    }
    // ------------------------------------------------------------------
    updateCamera(dt, cam) {
      const target = v1.copy(this.pos); target.y += (this.vehicle ? this.vehicle.def.size[1] * 0.8 : this.height * 0.85);
      if (this.ragdoll) target.y = this.pos.y + 1.2;
      let dist = this.cam.dist * (this.vehicle ? Math.max(1.4, this.vehicle.def.size[2] / 3.2) : Math.max(1, this.height / 1.6));
      if (this.vehicle && (this.vehicle.def.type === 'plane' || this.vehicle.def.type === 'heli')) dist *= 1.6;
      const p = this.cam.pitch, y = this.cam.yaw;
      const want = v2.set(target.x - Math.sin(y) * Math.cos(p) * dist, target.y + Math.sin(p) * dist, target.z - Math.cos(y) * Math.cos(p) * dist);
      if (this.interior) { const it = this.interior; want.x = H.clamp(want.x, it.x - it.w / 2 + 0.5, it.x + it.w / 2 - 0.5); want.z = H.clamp(want.z, it.z - it.d / 2 + 0.5, it.z + it.d / 2 - 0.5); want.y = H.clamp(want.y, it.y + 0.6, it.y + it.h - 0.4); }
      else { const gh = H.groundAt(want.x, want.z, want.y, null); if (want.y < gh + 0.8) want.y = gh + 0.8; }
      const k = Math.min(1, dt * (this.vehicle ? 8 : 12)); this.cam.x.lerp(want, k);
      cam.position.copy(this.cam.x);
      if (H.shakeAmt > 0) { cam.position.x += (Math.random() - 0.5) * H.shakeAmt; cam.position.y += (Math.random() - 0.5) * H.shakeAmt; }
      cam.lookAt(target);
      // underwater tint
      cam.userData.under = !this.interior && cam.position.y < 0 && H.terrainH(cam.position.x, cam.position.z) < 0;
    }
  }
  H.Player = Player;

  // ------------------------------------------------------------------ projectiles
  H.updateProjectiles = function (dt) {
    for (let i = H.projectiles.length - 1; i >= 0; i--) {
      const p = H.projectiles[i]; p.life -= dt; p.vel.y -= (p.type === 'egg' ? 30 : p.type === 'spit' ? 8 : 0) * dt; p.pos.addScaledVector(p.vel, dt);
      if (p.type === 'rocket') { H.fx.spawn(p.pos.x, p.pos.y, p.pos.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, new THREE.Color(Math.random() < 0.5 ? '#ff8a1a' : '#9a9a9a'), 0.4, 0.5, -2); }
      let hit = p.life <= 0 || p.pos.y < H.groundAt(p.pos.x, p.pos.z, p.pos.y, p.interior);
      const h2 = H.collideStatic(p.pos.clone(), 0.3, 0.5, p.interior); if (h2.hit) hit = true;
      if (!hit) for (const n of H.NPCs.near(p.pos.x, p.pos.z, 1.5)) if (Math.abs(n.pos.y + 1 - p.pos.y) < 1.5) { hit = true; if (p.type === 'spit') { n.knock(p.vel.x * 0.25, 5, p.vel.z * 0.25, p.owner); H.floatText(H.pick(['EW!', 'GROSS!', 'Was that SPIT?!', 'My shirt!']), n.pos, { follow: n, cls: 'speech' }); } }
      if (!hit) { const tmp = []; H.propsNear(p.pos.x, p.pos.z, 1.5, tmp); for (const q of tmp) if (Math.abs(q.pos.y - p.pos.y) < q.r + 0.5) { hit = true; H.pushProp(q, p.vel.x * 0.3, 5, p.vel.z * 0.3, p.owner); } }
      if (hit) {
        if (p.type === 'egg') H.explode(p.pos.x, p.pos.y, p.pos.z, 7, 22, p.owner);
        else if (p.type === 'rocket') H.explode(p.pos.x, p.pos.y, p.pos.z, 11, 42, p.owner);
        else H.fx.burst(p.pos.x, p.pos.y, p.pos.z, new THREE.Color('#c8f0d0'), 6, 3, 0.2);
        H.scene.remove(p.mesh); H.projectiles.splice(i, 1);
      }
    }
  };
  H.pick = a => a[Math.floor(Math.random() * a.length)];
  H.shakeAmt = 0; H.shake = function (x, z, amt) { for (const p of H.players) { const d = Math.hypot(p.pos.x - x, p.pos.z - z); if (d < 60) H.shakeAmt = Math.max(H.shakeAmt, amt * (1 - d / 60)); } };
})();
