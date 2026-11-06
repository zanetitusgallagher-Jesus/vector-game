// Hoofquake — dynamic props, explosions, particles and floating text.
'use strict';
(function () {
  const V = THREE.Vector3;
  // geo, scale, color, radius, mass, bounce, hp(break speed), coins, flags
  const T = {
    crate: ['box', [1.4, 1.4, 1.4], '#b8864a', 0.75, 1.2, 0.2, 16, 4, { wood: 1 }],
    barrel: ['cyl', [1.1, 1.5, 1.1], '#3a6aa8', 0.7, 1.5, 0.25, 26, 3, {}],
    explosive: ['cyl', [1.1, 1.5, 1.1], '#d8261a', 0.7, 1.5, 0.25, 14, 10, { explode: 1 }],
    trash: ['cyl', [0.9, 1.2, 0.9], '#5a7a5a', 0.55, 0.7, 0.3, 18, 2, {}],
    hydrant: ['cyl', [0.6, 1.0, 0.6], '#e8261a', 0.4, 3, 0.1, 22, 6, { geyser: 1, anchored: 1 }],
    cone: ['cone', [0.7, 1.0, 0.7], '#ff7a1a', 0.4, 0.2, 0.4, 999, 0, {}],
    mailbox: ['box', [0.6, 1.4, 0.8], '#2a4ad8', 0.45, 0.8, 0.2, 14, 3, { anchored: 1 }],
    bench: ['box', [2.6, 0.9, 0.9], '#8a5a2a', 1.1, 3, 0.15, 30, 4, { wood: 1 }],
    beachball: ['sphere', [1.6, 1.6, 1.6], '#ff4a8a', 0.8, 0.15, 0.85, 999, 0, { ball: 1, stripes: 1 }],
    soccer: ['sphere', [0.9, 0.9, 0.9], '#f4f4f4', 0.45, 0.35, 0.65, 999, 0, { ball: 1 }],
    basketball: ['sphere', [0.8, 0.8, 0.8], '#e8742a', 0.4, 0.4, 0.8, 999, 0, { ball: 1 }],
    golf: ['sphere', [0.35, 0.35, 0.35], '#ffffff', 0.18, 0.1, 0.5, 999, 0, { ball: 1 }],
    bowling: ['sphere', [0.9, 0.9, 0.9], '#2a2a5a', 0.45, 3, 0.2, 999, 0, { ball: 1 }],
    pin: ['cyl', [0.35, 1.2, 0.35], '#f6f6f2', 0.25, 0.25, 0.4, 999, 0, { pin: 1 }],
    watermelon: ['sphere', [1.1, 0.9, 0.9], '#3a8a3a', 0.5, 0.8, 0.2, 9, 2, { splat: '#ff4a5a' }],
    pumpkin: ['sphere', [1.2, 0.9, 1.2], '#ff8a1a', 0.55, 0.9, 0.2, 10, 2, { splat: '#ffaa3a', crop: 1 }],
    hay: ['box', [1.8, 1.0, 1.2], '#e8c45a', 0.75, 1.0, 0.3, 20, 1, {}],
    tire: ['torus', [1.4, 1.4, 1.4], '#1e1e22', 0.7, 0.6, 0.7, 999, 0, {}],
    balloon: ['sphere', [1, 1.2, 1], '#ff2a6a', 0.55, 0.05, 0.9, 6, 1, { float: 1 }],
    package: ['box', [1.2, 1.0, 1.2], '#c89a5a', 0.6, 0.8, 0.2, 999, 0, { pkg: 1 }],
    trampoline: ['cyl', [7, 0.4, 7], '#1a1a2a', 3.5, 999, 0, 999, 0, { tramp: 1, anchored: 1, static: 1 }],
  };
  H.PROP_TYPES = T;
  const geoCache = {}; const matCache = {};
  function propMesh(type) {
    const d = T[type];
    if (!matCache[type]) {
      if (d[8].stripes) matCache[type] = new THREE.MeshLambertMaterial({ map: H.canvasTex(64, 64, (g) => { ['#ff4a8a', '#ffffff', '#4ac8ff', '#ffd21a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 16, 0, 16, 64); }); }) });
      else if (type === 'soccer') matCache[type] = new THREE.MeshLambertMaterial({ map: H.canvasTex(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#111'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i * 23) % 64, (i * 37) % 64, 7, 0, 7); g.fill(); } }) });
      else if (type === 'explosive') matCache[type] = new THREE.MeshLambertMaterial({ map: H.canvasTex(64, 64, (g) => { g.fillStyle = '#d8261a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffd21a'; g.fillRect(0, 26, 64, 12); g.fillStyle = '#111'; g.font = 'bold 12px sans-serif'; g.fillText('BOOM', 16, 36); }) });
      else if (type === 'watermelon') matCache[type] = new THREE.MeshLambertMaterial({ map: H.canvasTex(64, 64, (g) => { g.fillStyle = '#2a7a2a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#5ab04a'; for (let i = 0; i < 8; i++) g.fillRect(i * 8, 0, 3, 64); }) });
      else matCache[type] = H.mat(d[2]);
    }
    const m = new THREE.Mesh(H.G[d[0]], matCache[type]); m.scale.set(...d[1]); if (d[0] === 'torus') m.rotation.x = Math.PI / 2; m.castShadow = true; m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m); if (type === 'hydrant') g.add(H.mesh('sphere', '#e8261a', 0.6, 0.6, 0.6, 0, 0.5, 0)); if (type === 'balloon') g.add(H.mesh('cyl', '#ffffff', 0.02, 2, 0.02, 0, -1.4, 0)); if (type === 'pumpkin') g.add(H.mesh('cyl', '#3a6a2a', 0.12, 0.3, 0.12, 0, 0.5, 0));
    if (type === 'pin') g.add(H.mesh('box', '#d8261a', 0.37, 0.08, 0.37, 0, 0.3, 0));
    return g;
  }

  H.props = []; const propGrid = new H.Grid(16); let gridDirty = true;
  H.spawnProp = function (type, x, y, z, opt) {
    const d = T[type]; if (!d) return null; opt = opt || {};
    const it = opt.interior ? H.interiors[opt.interior] : null;
    const gy = y !== undefined && y !== null ? y : H.groundAt(x, z, 999, it) + d[3];
    const p = { type, d, mesh: propMesh(type), pos: new V(x, gy, z), vel: new V(), ang: new V(), r: d[3], mass: d[4], bounce: d[5], breakAt: d[6], coins: d[7], f: d[8], hp: 1, interior: it, sleep: true, home: opt.temp ? null : { x, y: gy, z, ry: opt.ry || 0 }, temp: !!opt.temp, mission: opt.mission };
    p.mesh.position.copy(p.pos); p.mesh.rotation.y = opt.ry || 0; H.scene.add(p.mesh); H.props.push(p); gridDirty = true; return p;
  };
  H.removeProp = function (p) { H.scene.remove(p.mesh); const i = H.props.indexOf(p); if (i >= 0) H.props.splice(i, 1); gridDirty = true; };
  H.propsNear = function (x, z, r, out) { return propGrid.query(x, z, r, out); };
  H.wakeProp = p => { p.sleep = false; p.sleepT = 0; };
  H.pushProp = function (p, ix, iy, iz, src) {
    if (p.f.static) return; const k = 1 / Math.max(0.15, p.mass);
    p.vel.x += ix * k; p.vel.y += iy * k; p.vel.z += iz * k; p.ang.x += (Math.random() - 0.5) * 8; p.ang.z += (Math.random() - 0.5) * 8; p.ang.y += (Math.random() - 0.5) * 4;
    H.wakeProp(p); p.lastHit = src; if (p.f.anchored) { p.f = Object.assign({}, p.f, { anchored: 0 }); if (p.f.geyser) H.fx.geyser(p.pos.x, p.pos.y, p.pos.z); }
  };
  H.breakProp = function (p, by) {
    if (p.broken) return; p.broken = true;
    const c = new THREE.Color(p.f.splat || p.d[2]);
    H.fx.burst(p.pos.x, p.pos.y, p.pos.z, c, p.f.splat ? 26 : 16, 8, 0.35);
    H.Audio.sfx(p.f.wood ? 'smash' : p.f.splat ? 'thud' : 'smash', 0.8);
    if (p.f.explode) H.explode(p.pos.x, p.pos.y, p.pos.z, 12, 42, by);
    H.stat && H.stat('breaks', 1); H.emit && H.emit('propBroken', p, by);
    if (p.coins && by && by.isPlayer) H.chaos(p.coins * 5, p.f.explode ? 'KABOOM' : 'Smashed ' + p.type, by);
    if (p.f.crop && by && by.isPlayer) H.emit('cropCollected', p, by);
    H.removeProp(p);
    if (p.home && !p.mission) setTimeout(() => H.spawnProp(p.type, p.home.x, p.home.y, p.home.z, { interior: p.interior && p.interior.id, ry: p.home.ry }), 90000);
  };
  H.explode = function (x, y, z, r, force, by) {
    H.Audio.sfx('boom'); H.fx.burst(x, y, z, new THREE.Color('#ff8a1a'), 40, 16, 0.6); H.fx.burst(x, y, z, new THREE.Color('#3a3a3a'), 24, 6, 1.2, -2);
    H.shake && H.shake(x, z, 1.2);
    const tmp = []; H.propsNear(x, z, r, tmp);
    for (const p of tmp) { const dx = p.pos.x - x, dy = p.pos.y - y, dz = p.pos.z - z, d = Math.hypot(dx, dy, dz) + 0.5; if (d > r) continue; const f = force * (1 - d / r) * Math.max(1, p.mass * 0.6); H.pushProp(p, dx / d * f, (dy / d + 1) * f * 0.7, dz / d * f, by); if (p.f.explode && !p.broken && d < r * 0.8) setTimeout(() => H.breakProp(p, by), 150 + Math.random() * 200); }
    H.stat && H.stat('explosions', 1);
    for (const n of H.NPCs.near(x, z, r)) { const dx = n.pos.x - x, dz = n.pos.z - z, d = Math.hypot(dx, dz) + 0.5; n.knock(dx / d * force * 0.5, force * 0.55, dz / d * force * 0.5, by); }
    for (const pl of H.players) if (!pl.vehicle) { const dx = pl.pos.x - x, dz = pl.pos.z - z, d = Math.hypot(dx, dz, pl.pos.y - y); if (d < r) pl.knock(dx / (d + 0.5) * force * 0.6, force * 0.7, dz / (d + 0.5) * force * 0.6); }
    for (const v of H.vehicles.slice()) { const dx = v.pos.x - x, dz = v.pos.z - z, d = Math.hypot(dx, dz); if (d < r) { v.knock && v.knock(dx / (d + 0.5) * force * 0.4, force * 0.4, dz / (d + 0.5) * force * 0.4); v.damage && v.damage(force * 1.6 * (1 - d / r), by); } }
    for (const c of H.traffic) { const d = Math.hypot(c.pos.x - x, c.pos.z - z); if (d < r) c.wreck((c.pos.x - x) / (d + 0.5) * 20, 18, (c.pos.z - z) / (d + 0.5) * 20, by, d < r * 0.6); }
    for (const a of H.air || []) if (!a.down && a.pos.distanceTo(new THREE.Vector3(x, y, z)) < r + a.r) a.hit(60, by);
  };

  const tmpA = [];
  H.updateProps = function (dt) {
    // spatial grid of all props (rebuilt when needed; awake props move so rebuild each frame for them)
    propGrid.map.clear(); for (const p of H.props) propGrid.insert(p, p.pos.x - p.r, p.pos.z - p.r, p.pos.x + p.r, p.pos.z + p.r);
    const pls = H.players; const G = 30;
    for (const p of H.props) {
      let near = false; for (const pl of pls) if (H.dist2(p.pos.x, p.pos.z, pl.pos.x, pl.pos.z) < 300 * 300) { near = true; break; }
      p.mesh.visible = near; if (!near || p.sleep || p.held) continue;
      const v = p.vel; v.y -= G * dt * (p.f.float ? -0.02 : 1);
      if (p.f.float) { v.y = Math.min(v.y, 3); v.multiplyScalar(0.99); }
      const prevVy = v.y;
      p.pos.addScaledVector(v, dt);
      // water
      if (!p.interior && p.pos.y < 0.2 && H.terrainH(p.pos.x, p.pos.z) < -0.5) { v.y += (p.mass < 2 ? 45 : 20) * dt; v.multiplyScalar(1 - 1.2 * dt); if (!p.wet && prevVy < -6) { H.fx.splash(p.pos.x, p.pos.z); p.wet = true; } } else p.wet = false;
      // static
      const hit = H.collideStatic(p.pos, p.r, p.r * 2, p.interior);
      if (hit.hit) { const vn = v.x * hit.x + v.z * hit.z; if (vn < 0) { const sp = -vn; v.x -= (1 + p.bounce) * vn * hit.x; v.z -= (1 + p.bounce) * vn * hit.z; if (sp > p.breakAt) H.breakProp(p, p.lastHit); else if (sp > 6) H.Audio.sfx(p.f.ball ? 'bounce' : 'thud', Math.min(1, sp / 25)); } }
      if (p.broken) continue;
      const g = H.groundAt(p.pos.x, p.pos.z, p.pos.y, p.interior) + p.r * (p.type === 'trampoline' ? 0.1 : 1);
      if (p.pos.y < g) {
        p.pos.y = g; if (v.y < 0) { const sp = -v.y; if (sp > p.breakAt) { H.breakProp(p, p.lastHit); continue; } v.y = sp > 2 ? sp * p.bounce : 0; if (sp > 8) H.Audio.sfx(p.f.ball ? 'bounce' : 'thud', Math.min(1, sp / 30)); }
        const fr = p.f.ball ? 0.6 : 3.5; v.x *= Math.max(0, 1 - fr * dt); v.z *= Math.max(0, 1 - fr * dt);
        p.ang.multiplyScalar(Math.max(0, 1 - 3 * dt));
        if (p.f.ball) { p.ang.x = v.z / p.r; p.ang.z = -v.x / p.r; }
      }
      // prop vs prop
      H.propsNear(p.pos.x, p.pos.z, p.r + 1, tmpA);
      for (const q of tmpA) {
        if (q === p || q.held) continue; const dx = q.pos.x - p.pos.x, dy = q.pos.y - p.pos.y, dz = q.pos.z - p.pos.z, rr = p.r + q.r, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, pen = rr - d, im = 1 / p.mass, jm = q.f.static ? 0 : 1 / q.mass, ts = im + jm;
          p.pos.x -= nx * pen * im / ts; p.pos.y -= ny * pen * im / ts; p.pos.z -= nz * pen * im / ts;
          if (!q.f.static) { q.pos.x += nx * pen * jm / ts; q.pos.y += ny * pen * jm / ts; q.pos.z += nz * pen * jm / ts; }
          const rv = (v.x - q.vel.x) * nx + (v.y - q.vel.y) * ny + (v.z - q.vel.z) * nz;
          if (rv > 0) {
            const j = (1 + Math.min(p.bounce, q.bounce || 0.3)) * rv / ts; v.x -= j * im * nx; v.y -= j * im * ny; v.z -= j * im * nz;
            if (!q.f.static) { q.vel.x += j * jm * nx; q.vel.y += j * jm * ny; q.vel.z += j * jm * nz; q.lastHit = p.lastHit; H.wakeProp(q); if (q.f.anchored) q.f = Object.assign({}, q.f, { anchored: 0 }); }
            if (q.f.tramp) v.y = Math.max(v.y, 25);
            if (rv > q.breakAt) H.breakProp(q, p.lastHit);
            if (q.f.pin && rv > 2) H.Audio.sfx('bonk', 0.5);
          }
        }
      }
      // rotate
      p.mesh.position.copy(p.pos); p.mesh.rotation.x += p.ang.x * dt; p.mesh.rotation.y += p.ang.y * dt; p.mesh.rotation.z += p.ang.z * dt;
      if (p.f.pin || p.type === 'cone' || p.type === 'trash' || p.type === 'barrel' || p.type === 'explosive') {
        // tall props: tip over physically-ish when knocked
        if (Math.abs(p.mesh.rotation.x) > 0.3 || Math.abs(p.mesh.rotation.z) > 0.3) p.tipped = true;
      }
      // sleep
      if (v.lengthSq() < 0.05 && p.ang.lengthSq() < 0.1) { p.sleepT = (p.sleepT || 0) + dt; if (p.sleepT > 0.8) { p.sleep = true; v.set(0, 0, 0); p.ang.set(0, 0, 0); } } else p.sleepT = 0;
      if (p.pos.y < -60 && !p.interior) { if (p.temp || p.mission) H.removeProp(p); else { p.pos.set(p.home.x, p.home.y, p.home.z); v.set(0, 0, 0); } }
    }
  };

  // ---------------- particles ----------------
  const MAXP = 2500;
  H.fx = {
    init(scene) {
      this.mesh = new THREE.InstancedMesh(H.G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXP);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
      this.p = []; for (let i = 0; i < MAXP; i++) { this.p.push({ life: 0 }); this.mesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
      this.idx = 0; scene.add(this.mesh); this.m = new THREE.Matrix4(); this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < MAXP; i++) this.mesh.setMatrixAt(i, this.zero);
    },
    spawn(x, y, z, vx, vy, vz, color, size, life, grav, shrink) {
      const i = this.idx; this.idx = (this.idx + 1) % MAXP; const p = this.p[i];
      p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s = size; p.life = life; p.max = life; p.g = grav === undefined ? 20 : grav; p.shrink = shrink !== false;
      this.mesh.setColorAt(i, color.isColor ? color : new THREE.Color(color));
    },
    burst(x, y, z, color, n, speed, size, grav) { for (let i = 0; i < n; i++) this.spawn(x, y, z, (Math.random() - 0.5) * speed * 2, Math.random() * speed * 1.2, (Math.random() - 0.5) * speed * 2, color, size * (0.5 + Math.random()), 0.6 + Math.random() * 0.8, grav === undefined ? 20 : grav); },
    splash(x, z) { H.Audio.sfx('splash', 0.7); for (let i = 0; i < 24; i++) this.spawn(x, 0.2, z, (Math.random() - 0.5) * 8, 6 + Math.random() * 8, (Math.random() - 0.5) * 8, new THREE.Color('#d8f0ff'), 0.25, 1, 25); },
    geyser(x, y, z) { const t0 = performance.now(); const tick = () => { if (performance.now() - t0 > 8000) return; for (let i = 0; i < 6; i++) this.spawn(x, y + 0.5, z, (Math.random() - 0.5) * 2, 16 + Math.random() * 6, (Math.random() - 0.5) * 2, new THREE.Color('#bfe8ff'), 0.3, 1.2, 20); requestAnimationFrame(tick); }; tick(); },
    text: [],
    update(dt) {
      const m = this.m;
      for (let i = 0; i < MAXP; i++) {
        const p = this.p[i]; if (p.life <= 0) continue; p.life -= dt;
        if (p.life <= 0) { this.mesh.setMatrixAt(i, this.zero); continue; }
        p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const s = p.shrink ? p.s * (p.life / p.max) : p.s; m.makeScale(s, s, s); m.setPosition(p.x, p.y, p.z); this.mesh.setMatrixAt(i, m);
      }
      this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    },
  };

  // ---------------- floating text / speech bubbles ----------------
  H.floaters = [];
  H.floatText = function (text, pos, opt) {
    opt = opt || {}; const el = document.createElement('div'); el.className = 'floater ' + (opt.cls || ''); el.textContent = text; document.getElementById('floaters').appendChild(el);
    H.floaters.push({ el, pos: pos.clone ? pos.clone() : new V(pos.x, pos.y, pos.z), t: 0, life: opt.life || 1.6, rise: opt.rise === undefined ? 1.5 : opt.rise, follow: opt.follow });
    if (H.floaters.length > 30) { const f = H.floaters.shift(); f.el.remove(); }
  };
  const proj = new V();
  H.updateFloaters = function (dt, cam, vp) {
    for (let i = H.floaters.length - 1; i >= 0; i--) {
      const f = H.floaters[i]; f.t += dt; if (f.t > f.life) { f.el.remove(); H.floaters.splice(i, 1); continue; }
      if (f.follow) f.pos.set(f.follow.pos.x, f.follow.pos.y + (f.follow.height || 2) + 0.6, f.follow.pos.z);
      proj.copy(f.pos); proj.y += f.rise * f.t; proj.project(cam);
      if (proj.z > 1 || Math.abs(proj.x) > 1.2 || Math.abs(proj.y) > 1.2) { f.el.style.display = 'none'; continue; }
      f.el.style.display = ''; f.el.style.left = (vp.x + (proj.x + 1) / 2 * vp.w) + 'px'; f.el.style.top = (vp.y + (1 - proj.y) / 2 * vp.h) + 'px'; f.el.style.opacity = Math.min(1, (f.life - f.t) * 2);
    }
  };

  // ---------------- chaos combo ----------------
  H.combo = { pts: 0, mult: 1, t: 0, label: '', owner: null };
  H.chaos = function (pts, label, by) {
    const c = H.combo; c.pts += pts; c.mult = Math.min(10, 1 + Math.floor(c.count = (c.count || 0) + 1) / 3); c.t = 3; c.label = label; c.owner = by;
    H.heat && H.heat(pts / 60);
    H.ui && H.ui.combo(c);
  };
  H.updateCombo = function (dt) {
    const c = H.combo; if (c.t <= 0) return; c.t -= dt;
    if (c.t <= 0) { const coins = Math.round(c.pts * Math.floor(c.mult) * 0.4); if (coins > 0) { H.addCoins(coins, 'Chaos combo x' + Math.floor(c.mult)); } c.pts = 0; c.mult = 1; c.count = 0; H.ui && H.ui.combo(c); }
  };
})();
