// Hoofquake — Scentline's places, merged into the map: Dustwater, Frostpeak, the raceway (with rivals),
// Fort Grizzle military base, the banks (vault heists), paw tokens, lake rings, wildlife, the Bramble King,
// and six planets reached by starship.
'use strict';
(function () {
  const V = THREE.Vector3, S = H.SITES;
  const gy = (x, z) => H.terrainH(x, z);

  // ------------------------------------------------------------------ planets
  H.PLANETS = [
    { id: 'selene', name: 'Selene', x: 6000, z: 0, h: 3, sky: '#0a0c18', g: [0.62, 0.63, 0.68], g2: [0.4, 0.41, 0.48], gun: 'mdriver', fauna: 'moonhopper', names: ['Dome Habitat', 'Mining Office', 'Oxygen Depot', 'Lunar Cantina'], wc: ['#dfe4ea', '#b8bcc8', '#e8eaf0', '#a8b0c0'], blurb: 'A dusty moon with craters and low gravity.' },
    { id: 'ares', name: 'Ares', x: 8200, z: 0, h: 3, sky: '#3a1608', g: [0.68, 0.32, 0.2], g2: [0.48, 0.2, 0.13], gun: 'magma', fauna: 'sandbeast', names: ['Rust Cantina', 'Terraform Lab', 'Dune Garage', 'Colony Habitat'], wc: ['#b8a090', '#c88a6a', '#a8785a', '#d8b090'], blurb: 'Red desert colony crawling with sand beasts.' },
    { id: 'zeph', name: 'Zephyria', x: 10400, z: 0, h: 3, sky: '#1a0a2e', g: [0.2, 0.55, 0.5], g2: [0.5, 0.22, 0.66], gun: 'void', fauna: 'drake', names: ['Neon Lounge', 'Bio Lab', 'Crystal Bazaar', 'Embassy of Strangers'], wc: ['#8a6aa8', '#4aa88a', '#a05aa8', '#6a8ac8'], blurb: 'Glowing alien jungle under a violet sky.' },
    { id: 'mythos', name: 'Mythos', x: 12600, z: 0, h: 3, sky: '#3a2a4a', g: [0.5, 0.82, 0.5], g2: [0.96, 0.62, 0.9], gun: 'starlight', fauna: 'glowstag', names: ['Rainbow Market', 'Unicorn Stables', 'Crystal Library', 'Moonwell Inn'], wc: ['#fff0f8', '#e8f0ff', '#f0e8ff', '#fff8e0'], blurb: 'A mystical world of unicorns, drakes and glowing stags.' },
    { id: 'cyber', name: 'Cyberia', x: 14800, z: 0, h: 3, sky: '#04121a', g: [0.16, 0.18, 0.24], g2: [0.12, 0.5, 0.6], gun: 'hack', fauna: 'sandbeast', names: ['Neon Arcade', 'Chrome Foundry', 'Data Vault', 'Android Bazaar'], wc: ['#2a2f3a', '#5a6270', '#1a2a3a', '#4a4a5a'], blurb: 'A neon machine world ruled by fighting robots.' },
    { id: 'pyros', name: 'Pyros', x: 17000, z: 0, h: 3, sky: '#2a0800', g: [0.14, 0.1, 0.1], g2: [0.95, 0.32, 0.05], gun: 'inferno', fauna: 'ashbeast', names: ['Obsidian Forge', 'Magma Mine', 'Ash Tavern', 'Volcano Outpost'], wc: ['#2a2220', '#4a3028', '#1a1816', '#5a3a2a'], blurb: 'A volcanic furnace world of lava and ash beasts.' },
  ];
  H.planetAt = (x, z) => { if (x < 4000) return null; for (const p of H.PLANETS) if (Math.abs(x - p.x) < 420 && Math.abs(z - p.z) < 420) return p; return null; };
  H.onPlanet = pl => { const o = pl && (pl.vehicle ? pl.vehicle.pos : pl.pos); const p = o && H.planetAt(o.x, o.z); return p ? p.id : null; };
  H.planetH = function (x, z) {
    const p = H.planetAt(x, z); if (!p) return 0.6; const dx = x - p.x, dz = z - p.z, r = Math.hypot(dx, dz);
    let h = p.h + H.fbm(dx * 0.012 + 77, dz * 0.012 + 33, 4) * 8 + H.noise(dx * 0.08, dz * 0.08) * 0.6;
    if (p.id === 'selene') for (let i = 0; i < 10; i++) { const r2 = H.rng(i * 13 + 5); const cx = (r2() - 0.5) * 520, cz = (r2() - 0.5) * 520, cr = 14 + r2() * 30, d = Math.hypot(dx - cx, dz - cz); if (d < cr * 1.35) h += -7 * (1 - H.smooth(0, cr, d)) + 4 * H.smooth(cr * 0.8, cr, d) * (1 - H.smooth(cr, cr * 1.35, d)); }
    if (p.id === 'ares') h += Math.sin(dx * 0.05 + H.fbm(dx * 0.01, dz * 0.01, 2) * 6) * 3;
    if (p.id === 'zeph') h += Math.abs(Math.sin(dx * 0.03) * Math.cos(dz * 0.035)) * 9;
    if (p.id === 'mythos') h += Math.sin(dx * 0.04) * Math.cos(dz * 0.04) * 5;
    if (p.id === 'cyber') h = p.h + (h - p.h) * 0.3;
    if (p.id === 'pyros') h += H.fbm(dx * 0.02 + 5, dz * 0.02 - 8, 3) * 9;
    h = H.lerp(p.h, h, H.smooth(120, 200, r)); h += H.smooth(250, 330, r) * 50; return Math.max(0.7, h);
  };
  function buildPlanet(B, p) {
    const SZ = 700, N = 110, geo = new THREE.PlaneGeometry(SZ, SZ, N, N); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = p.x + pos.getX(i), z = p.z + pos.getZ(i); pos.setX(i, x); pos.setZ(i, z); const h = H.planetH(x, z); pos.setY(i, h);
      const n = H.noise(x * 0.05, z * 0.05) * 0.5 + 0.5; const k = H.clamp(n * 1.3 - 0.15, 0, 1); let c = [H.lerp(p.g[0], p.g2[0], k), H.lerp(p.g[1], p.g2[1], k), H.lerp(p.g[2], p.g2[2], k)];
      const pad = 1 - H.smooth(110, 150, Math.hypot(x - p.x, z - p.z)); c = c.map((v, j) => H.lerp(v, [0.45, 0.45, 0.47][j], pad));
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: p.id === 'cyber' || p.id === 'pyros' || p.id === 'zeph' ? new THREE.Color(p.g2[0] * 0.25, p.g2[1] * 0.25, p.g2[2] * 0.25) : 0x000000 }));
    m.receiveShadow = true; H.scene.add(m);
    const Y = p.h;
    // starport and four named buildings around a plaza
    B.M.solid.box(p.x, Y - 0.2, p.z + 90, 44, 0.3, 44, '#55595f'); B.M.solid.box(p.x, Y, p.z + 90, 40, 0.06, 1, '#e0b030');
    B.sign('STARPORT · ' + p.name.toUpperCase(), p.x, Y + 9, p.z + 66, 18, 2, '#0b0f14', '#4af0ff');
    p.names.forEach((nm, k) => { const bx = p.x + (k % 2 ? 45 : -45), bz = p.z + (k < 2 ? -35 : 25); B.building(bx, bz, 26, 20, 6 + (k % 2) * 3, p.wc[k], { y: Y - 0.2, noRoofItems: 1, plain: 1, roof: '#2a3a5a' }); B.sign(nm, bx, Y + 4.5, bz + 10.4, 14, 1.6, '#0b0f14', '#ffd27a'); });
    for (const [dx, dz] of [[-24, 70], [24, 70], [-24, 112], [24, 112], [0, 0], [-30, -5], [30, -5]]) B.lamp(p.x + dx, p.z + dz, Y);
    H.npcZones.push({ x: p.x, z: p.z, r: 60, count: 9, type: 'tourist' }, { x: p.x + 150, z: p.z - 120, r: 120, count: 7, type: p.fauna }, { x: p.x - 160, z: p.z + 140, r: 100, count: 5, type: p.fauna });
    H.vehicleSpawns.push({ id: 'offroad', x: p.x + 70, z: p.z + 40, yaw: 1 });
    // the planet's signature weapon waits on a pedestal
    H.addInteract({ x: p.x, y: Y + 1, z: p.z + 5, r: 4, label: `Take the ${H.GADGET[p.gun] ? H.GADGET[p.gun].name : 'weapon'} (${p.name}'s signature gun)`, kind: 'custom', fn: pl => { H.state.loadout = H.state.loadout || []; if (!H.state.loadout.includes(p.gun)) { H.state.loadout.push(p.gun); if (H.state.loadout.length > 6) H.state.loadout.shift(); } pl.gadget = p.gun; document.body.classList.add('aiming'); H.toast('🔫 ' + H.GADGET[p.gun].name + ' added to your loadout'); H.dirty(); } });
    B.M.glow.box(p.x, Y, p.z + 5, 2, 1.2, 2, '#4af0ff');
  }
  // sky & tint while on a planet
  let lastPlanet = null;
  H.updatePlanetEnv = function () {
    const pl = H.players[0]; const id = H.onPlanet(pl); const p = id && H.PLANETS.find(q => q.id === id);
    if (id !== lastPlanet) { lastPlanet = id; if (p) { H.ui.banner('🪐 ' + p.name, p.blurb); const v = H.state.planetsSeen = H.state.planetsSeen || {}; if (!v[id]) { v[id] = 1; H.stat('planets', 1); H.addXP(150); } } H.water.visible = !p; H.Sky.clouds.visible = !p; }
    if (p) { const c = new THREE.Color(p.sky); H.scene.background = c; H.scene.fog.color.copy(c); H.scene.fog.far = 700; H.Sky.stars.material.opacity = 1; }
  };

  // ------------------------------------------------------------------ star map travel
  H.travelPlanet = function (id) {
    const pl = H.players[0], v = pl.vehicle; if (!v || !v.def.starship) { H.toast('You need to be flying a starship.'); return; }
    let x, z; if (id === 'earth') { x = S.military.x; z = S.military.z + 40; } else { const p = H.PLANETS.find(q => q.id === id); x = p.x; z = p.z + 90; }
    H.ui.fade(); H.Audio.sfx('teleport'); H.Audio.sfx('ufo');
    v.pos.set(x, H.terrainH(x, z) + 60, z); v.vy = 0; v.spd = 0; v.place(); pl.pos.copy(v.seatPos()); H.clearCops && H.clearCops(); H.heatLevel = Math.min(H.heatLevel, (H.state.fame || 0) > 3 ? 2 : 0);
  };

  // ------------------------------------------------------------------ banks & heists
  H.BANKS = [];
  let heist = null;
  function buildBank(B, id, name, x, z, y, face) {
    B.building(x, z, 24, 18, 7, '#cfc8ba', { y, noRoofItems: 1, plain: 1, roof: '#2f7a46' });
    for (let i = -2; i <= 2; i++) B.M.solid.shape('cyl', x + i * 4, y + 3.5, z + 9.6, 0.9, 7, 0.9, '#efe8dc');
    B.sign(name.toUpperCase(), x, y + 8, z + 9.4, 14, 1.6, '#2f7a46', '#e8f5e0');
    const bank = { id, name, x, z, door: { x, z: z + 12 }, cd: 0 }; H.BANKS.push(bank);
    H.addInteract({ x, y: y + 1, z: z + 12, r: 4, label: 'Hack the vault of ' + name + ' (stay close 12 s)', kind: 'custom', fn: pl => {
      if (heist) return; if (performance.now() < bank.cd) { H.toast('The vault is empty — come back later.'); return; }
      heist = { bank, t: 0 }; H.heat(3.5); H.toast('💻 Hacking the vault… stay close! The alarm is ringing.', 'bad'); H.Audio.sfx('horn');
    } });
    H.npcZones.push({ x, z: z + 18, r: 8, count: 4, type: 'shopper' });
  }
  H.updateHeist = function (dt) {
    const bar = document.getElementById('heist'); if (!heist) { if (bar) bar.hidden = true; return; }
    const p = H.players[0], b = heist.bank; const d = Math.hypot(p.pos.x - b.door.x, p.pos.z - b.door.z);
    if (p.dead || p.vehicle || d > 8) { heist = null; H.toast('Heist aborted', 'bad'); return; }
    heist.t += dt; if (bar) { bar.hidden = false; bar.querySelector('i').style.width = Math.min(100, heist.t / 12 * 100) + '%'; }
    if (heist.t >= 12) { const n = 700 + Math.floor(Math.random() * 400); H.addCoins(n, 'Vault cracked'); H.addXP(150, p.pos); H.stat('heists', 1); b.cd = performance.now() + 300000; heist = null; H.ui.banner('💰 Vault cracked', `+${n} coins — now get away!`); H.heat(1); }
  };

  // ------------------------------------------------------------------ the raceway (laps against rivals)
  let RACE_PTS = [];
  function racewayPts(n) { const s = S.raceway, pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push({ x: s.x + Math.cos(a) * 100, y: s.h, z: s.z + Math.sin(a) * 58 }); } return pts; }
  function buildRaceway(B) {
    const s = S.raceway, y = s.h + 0.12, n = 96; RACE_PTS = racewayPts(16);
    const pts = racewayPts(n); for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), nx = -dz / L * 8, nz = dx / L * 8;
      H.pushQuad(B.M.solid, [a.x + nx, y, a.z + nz], [b.x + nx, y, b.z + nz], [b.x - nx, y, b.z - nz], [a.x - nx, y, a.z - nz], 0, new THREE.Color(i % 8 < 1 ? '#e8e8e8' : '#2c2e33'));
      if (i % 3 === 0) { B.M.solid.box(a.x + nx * 1.15, y - 0.1, a.z + nz * 1.15, 1.2, 0.8, 1.2, i % 6 ? '#e8261a' : '#f2f2f2'); B.M.solid.box(a.x - nx * 1.15, y - 0.1, a.z - nz * 1.15, 1.2, 0.8, 1.2, i % 6 ? '#e8261a' : '#f2f2f2'); }
    }
    const st = pts[0]; B.M.solid.box(st.x, y, st.z, 2, 0.05, 16, '#f2f2f2'); B.M.solid.box(st.x, y, st.z - 9, 0.5, 7, 0.5, '#9aa0a8'); B.M.solid.box(st.x, y, st.z + 9, 0.5, 7, 0.5, '#9aa0a8'); B.M.solid.box(st.x, y + 7, st.z, 0.5, 1.5, 18.5, '#2a2a30');
    B.sign('SCENTLINE RACEWAY', st.x, y + 7.8, st.z, 14, 1.3, '#2a2a30', '#ffd21a', Math.PI / 2);
    for (const side of [-1, 1]) { const gx = s.x, gz = s.z + side * 82; B.M.solid.box(gx, s.h, gz, 90, 6, 10, '#9aa4b0'); for (let k = 0; k < 4; k++) B.M.solid.box(gx, s.h + k * 1.5, gz - side * (k * 2 - 3), 90, 1.5, 2, '#c8ccd2'); H.addBox(gx, gz, 90, 10, -10, s.h + 6); }
    H.npcZones.push({ x: s.x, z: s.z + 82, r: 40, count: 14, type: 'tourist' }, { x: s.x, z: s.z - 82, r: 40, count: 10, type: 'tourist' });
    H.vehicleSpawns.push({ id: 'kart', x: st.x - 6, z: st.z + 4, yaw: Math.PI }, { id: 'sportbike', x: st.x - 6, z: st.z - 4, yaw: Math.PI });
  }
  H.addRacewayMissions = function () {
    const st = RACE_PTS[0]; let i = 0;
    for (const [veh, laps, nm] of [['kart', 2, 'Raceway: Kart Cup'], ['supercar', 3, 'Raceway: Grand Prix'], ['sportbike', 3, 'Raceway: Superbike Showdown'], ['hyper', 4, 'Raceway: Hypercar Gauntlet']]) {
      const pts = []; for (let l = 0; l < laps; l++) for (let k = 1; k <= RACE_PTS.length; k++) pts.push(RACE_PTS[k % RACE_PTS.length]);
      const m = { id: 'raceway_' + i, type: 'race', name: nm, region: 'raceway', x: st.x - 12, z: st.z + 10 * (i - 1.5), diff: 1 + Math.min(2, i), p: { pts, mode: 'vehicle', veh, rivals: 3, time: 90 + laps * 40 }, reward: 900 + i * 400 };
      m.y = H.groundAt(m.x, m.z, 999); m.ia = H.addInteract({ x: m.x, y: m.y, z: m.z, r: 4, label: '🏁 ' + m.name + ' (vs 3 rivals)', kind: 'mission', mission: m }); H.MISSIONS.push(m); H.MISSION[m.id] = m; i++;
    }
  };
  // rival racers drive the same checkpoints
  let rivals = [];
  const origStart = H.missions.start.bind(H.missions), origCleanup = H.missions.cleanup.bind(H.missions), origComplete = H.missions.complete.bind(H.missions);
  H.missions.start = function (m) {
    origStart(m); if (!m.p.rivals) return; const A = this.active; const st = RACE_PTS[0];
    const cars = { kart: ['kart', 'kart', 'kart'], supercar: ['supercar', 'hyper', 'police'], sportbike: ['sportbike', 'moto', 'policebike'], hyper: ['hyper', 'supercar', 'hyper'] }[m.p.veh] || ['sedan', 'sedan', 'sedan'];
    rivals = cars.map((id, k) => { const v = new H.Vehicle(H.VEHICLE[id], st.x + 4 + k * 5, st.z - 6 + k * 4, Math.PI, { paint: H.pick(H.PAINTS) }); v.ai = true; v.cp = 0; v.skill = 0.82 + Math.random() * 0.12 - k * 0.03; return v; });
    A.rivalsOf = rivals; A.t = Math.max(A.t, m.p.time || 200); A.timed = true;
  };
  H.missions.cleanup = function () { const A = this.active; origCleanup(); if (A && A.rivalsOf) { for (const v of A.rivalsOf) setTimeout(() => v.remove(), 300); rivals = []; } };
  H.missions.complete = function (x) { const A = this.active; if (A && A.rivalsOf) { const pos = 1 + A.rivalsOf.filter(v => v.done).length; A.stars = pos === 1 ? 3 : pos === 2 ? 2 : 1; if (pos === 1) H.stat('raceWins', 1); return origComplete(pos === 1 ? '1st place!' : pos === 2 ? '2nd place' : pos + 'th place'); } return origComplete(x); };
  H.updateRivals = function (dt) {
    const A = H.missions.active; if (!A || !A.rivalsOf) return; const pts = A.pts;
    for (const v of A.rivalsOf) {
      if (v.dead || v.done) continue; const c = pts[v.cp]; if (!c) { v.done = true; continue; }
      const dx = c.x - v.pos.x, dz = c.z - v.pos.z, d = Math.hypot(dx, dz); if (d < 12) { v.cp++; if (v.cp >= pts.length) { v.done = true; H.toast('A rival crossed the finish line'); } continue; }
      let diff = Math.atan2(dx, dz) - v.yaw; diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      const max = v.maxSpd * v.skill; v.drive(dt, { mx: H.clamp(-diff * 2.2, -1, 1), mz: Math.abs(v.spd) > max ? 0 : 1, jump: false, sprint: false }, null);
    }
    const lead = Math.max(...A.rivalsOf.map(v => v.cp)); A.text = (A.text || '') + ` · Rivals: best ${Math.min(lead, pts.length)}/${pts.length}`;
  };

  // ------------------------------------------------------------------ the place builder (called from buildWorld)
  H.buildPlaces = function (B) {
    // Dustwater — desert frontier town
    { const s = S.dustwater, y = s.h - 0.3; const names = [['Rattlesnake Saloon', '#a87a4a'], ['Sheriff', '#8a6a4a'], ['General Store', '#c8a070'], ['Dustwater Hotel', '#b88a5a'], ['Assay Office', '#9a7a5a'], ['Stables', '#7a5a3a']];
      names.forEach(([nm, c], k) => { const x = s.x - 45 + (k % 3) * 45, z = s.z + (k < 3 ? -22 : 22); B.house(x, z, 16, 12, c, '#5a3a22', { y, h: 6, rh: 1, face: k < 3 ? 's' : 'n' }); B.sign(nm, x, y + 6.8, z + (k < 3 ? 6.3 : -6.3), 10, 1.4, '#3a2a1a', '#ffd27a', k < 3 ? 0 : Math.PI); });
      B.M.solid.shape('cyl', s.x + 40, y + 10, s.z, 7, 6, 7, '#8a6a4a'); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.M.solid.box(s.x + 40 + a * 2.5, y, s.z + b * 2.5, 0.4, 7, 0.4, '#6a4a2a'); H.addCircle(s.x + 40, s.z, 3.5, -10, y + 13);
      buildBank(B, 'dustwater', 'Dustwater Bank', s.x - 50, s.z + 0, y, 's');
      H.npcZones.push({ x: s.x, z: s.z, r: 50, count: 14, type: 'villager' }, { x: s.x, z: s.z, r: 50, count: 4, type: 'farmer' });
      H.vehicleSpawns.push({ id: 'pickup', x: s.x + 20, z: s.z + 5, yaw: 0 }, { id: 'cruiser', x: s.x - 20, z: s.z + 5, yaw: 0 }, { id: 'offroad', x: s.x + 5, z: s.z - 8, yaw: 1.5 });
      B.sign('DUSTWATER · pop. not many', s.x, y + 4, s.z - 60, 12, 1.6, '#c8a070', '#3a2a1a'); }
    // Frostpeak — ski village
    { const s = S.frostpeak, y = s.h - 0.3; B.M.solid.box(s.x, y + 0.15, s.z, 150, 0.2, 150, '#f2f6fa');
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = s.x + Math.cos(a) * 45, z = s.z + Math.sin(a) * 45; B.house(x, z, 10, 9, H.pick(['#8a5a3a', '#a86a3a', '#6a4a2a']), '#f2f6fa', { y, h: 5, rh: 5, face: Math.abs(Math.cos(a)) > 0.7 ? (Math.cos(a) > 0 ? 'w' : 'e') : (Math.sin(a) > 0 ? 'n' : 's') }); }
      B.house(s.x, s.z, 24, 16, '#7a4a2a', '#e8eef2', { y, h: 8, rh: 6, face: 's' }); B.sign('FROSTPEAK SKI LODGE', s.x, y + 10, s.z + 8.6, 14, 1.6, '#2a3a5a', '#ffffff');
      for (let k = 0; k < 7; k++) { const x = s.x - 80 - k * 30, z = s.z - 40 - k * 25, yy = gy(x, z); B.M.solid.box(x, yy, z, 0.6, 12, 0.6, '#9aa0a8'); B.M.solid.box(x, yy + 12, z, 5, 0.4, 0.4, '#5a5a5a'); }
      H.npcZones.push({ x: s.x, z: s.z, r: 55, count: 14, type: 'tourist' }); H.vehicleSpawns.push({ id: 'offroad', x: s.x + 25, z: s.z + 25, yaw: 0 }); }
    // Fort Grizzle — military base
    { const s = S.military, y = s.h - 0.3, hs = 100;
      for (const [x0, z0, x1, z1] of [[-hs, -hs, hs, -hs], [-hs, hs, -12, hs], [12, hs, hs, hs], [-hs, -hs, -hs, hs], [hs, -hs, hs, hs]]) B.fence(s.x + x0, s.z + z0, s.x + x1, s.z + z1, '#7a7a72');
      for (let k = 0; k < 3; k++) B.building(s.x - 60 + k * 30, s.z - 70, 22, 12, 5, '#6a7a4a', { y, noRoofItems: 1, plain: 1, roof: '#4a5a3a' });
      for (let k = 0; k < 2; k++) { B.M.solid.shape('cyl', s.x + 50, y, s.z - 40 + k * 50, 30, 1, 34, '#7a8a6a', Math.PI / 2, 0, 0); H.addBox(s.x + 50, s.z - 40 + k * 50 - 17, 30, 1, -10, y + 15); }
      B.M.solid.box(s.x - 20, y + 0.02, s.z + 40, 120, 0.1, 18, '#3a3c40');
      B.M.solid.box(s.x + 85, y, s.z + 85, 3, 18, 3, '#6a6a62'); B.M.solid.box(s.x + 85, y + 18, s.z + 85, 7, 3, 7, '#5a6a4a'); H.addBox(s.x + 85, s.z + 85, 3, 3, -10, y + 21);
      B.sign('FORT GRIZZLE', s.x, y + 6, s.z + hs + 2, 14, 2, '#4a5a2a', '#f2f2e0'); H.npcZones.push({ x: s.x, z: s.z, r: 70, count: 10, type: 'worker' });
      H.vehicleSpawns.push({ id: 'tank', x: s.x - 50, z: s.z, yaw: 0 }, { id: 'tank', x: s.x - 35, z: s.z, yaw: 0 }, { id: 'fighter', x: s.x - 60, z: s.z + 40, yaw: Math.PI / 2 }, { id: 'starship', x: s.x + 10, z: s.z + 40, yaw: Math.PI / 2 }, { id: 'heli', x: s.x + 40, z: s.z + 75, yaw: 0 });
      H.addInteract({ x: s.x + 10, y: y + 1, z: s.z + 52, r: 4, label: 'Starship tip: fly it, then press Special for the star map', kind: 'custom', fn: () => H.toast('Get in the starship (Interact), then press Special (Q) to open the star map.') }); }
    // Bleatsburg Bank
    buildBank(B, 'city', 'Bleatsburg Bank', S.bank.x, S.bank.z, 2.7, 's');
    // the raceway
    buildRaceway(B);
    // wildlife from Scentline
    H.npcZones.push({ x: -1080, z: -780, r: 120, count: 6, type: 'wolf' }, { x: -880, z: -560, r: 120, count: 4, type: 'wildboar' }, { x: 960, z: -760, r: 140, count: 4, type: 'wildboar' },
      { x: S.lake.x, z: S.lake.z, r: 50, count: 3, type: 'gator' }, { x: S.brambles.x, z: S.brambles.z, r: 15, count: 1, type: 'bramble' },
      { x: -900, z: 560, r: 150, count: 8, type: 'rabbit' }, { x: -900, z: -650, r: 200, count: 8, type: 'rabbit' }, { x: -600, z: -720, r: 100, count: 5, type: 'rabbit' });
    for (let i = 0; i < 14; i++) { const r = H.rng(800 + i); B.tree('rock', S.brambles.x + r.range(-50, 50), S.brambles.z + r.range(-50, 50), r.range(1, 2.4)); }
    B.sign('NORTHERN ROCKS · beware the Bramble King', S.brambles.x, gy(S.brambles.x, S.brambles.z + 55) + 4, S.brambles.z + 55, 16, 1.6, '#3a2a1c', '#f0a93a');
    // paw tokens and lake rings
    const r = H.rng(16161); let k = 0;
    while (k < 16) { const x = r.range(-1400, 1300), z = r.range(-1300, 950), h = gy(x, z); if (h < 2) continue; H.collectibles.push({ type: 'paw', id: 'paw_' + k, x, y: h + 0.3, z }); k++; }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; H.collectibles.push({ type: 'ring', id: 'ring_' + i, x: S.lake.x + Math.cos(a) * 55, y: 0.3, z: S.lake.z + Math.sin(a) * 40 }); }
    // planets
    for (const p of H.PLANETS) buildPlanet(B, p);
  };

  // ------------------------------------------------------------------ new collectibles
  const origCol = H.buildCollectible;
  H.buildCollectible = function (type) {
    if (type === 'paw') { const g = new THREE.Group(); g.add(H.mesh('cyl', '#f0a93a', 1.0, 0.18, 1.0, 0, 0.9, 0, { emissive: '#8a5a10', emissiveIntensity: 0.6 })); g.children[0].rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; const t = H.mesh('sphere', '#f0a93a', 0.32, 0.32, 0.18, Math.sin(a) * 0.62, 0.9 + Math.cos(a) * 0.62, 0.05, { emissive: '#8a5a10', emissiveIntensity: 0.6 }); g.add(t); } return g; }
    if (type === 'ring') { const g = new THREE.Group(); const t = H.mesh('torus', '#2affd0', 5, 5, 5, 0, 2.2, 0, { emissive: '#2a8a6a', emissiveIntensity: 0.8 }); g.add(t); return g; }
    return origCol(type);
  };
})();
