// Hoofquake — builds every structure, landmark, interior, collectible and spawn list in the world.
'use strict';
(function () {
  const S = H.SITES;
  let M; // merges
  const R = H.rng(4242);
  H.interacts = []; H.interactGrid = new H.Grid(40);
  H.anims = []; H.propSpawns = []; H.vehicleSpawns = []; H.npcZones = []; H.rooftops = [];
  H.collectibles = []; H.interiors = {}; H.fishSpots = []; H.golfHoles = []; H.signs = [];
  H.addInteract = function (o) { o.r = o.r || 3; H.interacts.push(o); H.interactGrid.insert(o, o.x - o.r, o.z - o.r, o.x + o.r, o.z + o.r); return o; };
  const gy = (x, z) => H.terrainH(x, z);

  // ---------- primitives ----------
  function building(x, z, w, d, h, col, opt) {
    opt = opt || {}; const y = opt.y !== undefined ? opt.y : gy(x, z) - 0.5;
    if (opt.plain) M.solid.box(x, y, z, w, h, d, col); else M.wall.wallBox(x, y, z, w, h, d, col, opt.tile || 4);
    M.solid.box(x, y + h, z, w + 0.6, 0.6, d + 0.6, opt.roof || '#6a6e74');
    const top = y + h + 0.6; H.addBox(x, z, w, d, -1000, top);
    if (!opt.noRoofItems && w > 10) {
      if (R() < 0.6) M.solid.box(x + R.range(-w / 4, w / 4), top, z + R.range(-d / 4, d / 4), 3, 1.6, 2.4, '#b8bcc0');
      if (R() < 0.25) { const wx = x - w / 4, wz = z + d / 4; M.solid.shape('cyl', wx, top + 4, wz, 4, 3, 4, '#8a5a3a'); M.solid.shape('cone6', wx, top + 6.3, wz, 4.6, 1.6, 4.6, '#6a4a2a'); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.solid.box(wx + a * 1.4, top, wz + b * 1.4, 0.3, 2.6, 0.3, '#4a3a2a'); H.addBox(wx, wz, 4, 4, top, top + 5.3); }
      if (R() < 0.3) M.solid.box(x + w / 3, top, z - d / 3, 0.2, 6 + R() * 6, 0.2, '#d0d0d0');
      H.rooftops.push({ x, z, y: top, w, d });
    }
    if (opt.door) { const [dx, dz] = opt.door; M.solid.box(x + dx, y, z + dz, 2.4, 3.6, 0.3, '#4a3020'); }
    return top;
  }
  function gable(x, y, z, w, d, h, col, alongX) { // triangular roof
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3); const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y + h / 2 - 0.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(alongX ? 0 : Math.PI / 2, alongX ? 0 : 0, alongX ? Math.PI / 2 : 0, 'XYZ')), new THREE.Vector3(1, 1, 1));
    // Build a prism manually for clarity
    const hw = w / 2 + 0.4, hd = d / 2 + 0.4;
    const c = new THREE.Color(col);
    const tri = (pts, n) => { for (const p of pts) { M.solid.p.push(p[0], p[1], p[2]); M.solid.n.push(n[0], n[1], n[2]); M.solid.c.push(c.r, c.g, c.b); M.solid.u.push(0, 0); } };
    if (alongX) { // ridge along x
      const A = [x - hw, y, z - hd], B = [x + hw, y, z - hd], C = [x + hw, y, z + hd], D = [x - hw, y, z + hd], E = [x - hw, y + h, z], F = [x + hw, y + h, z];
      const s = h / Math.hypot(h, hd), cc = hd / Math.hypot(h, hd);
      tri([A, E, F, A, F, B], [0, cc, -s]); tri([D, C, F, D, F, E], [0, cc, s]); tri([A, D, E], [-1, 0, 0]); tri([B, F, C], [1, 0, 0]);
    } else {
      const A = [x - hw, y, z - hd], B = [x + hw, y, z - hd], C = [x + hw, y, z + hd], D = [x - hw, y, z + hd], E = [x, y + h, z - hd], F = [x, y + h, z + hd];
      const s = h / Math.hypot(h, hw), cc = hw / Math.hypot(h, hw);
      tri([A, D, F, A, F, E], [-s, cc, 0]); tri([B, E, F, B, F, C], [s, cc, 0]); tri([A, E, B], [0, 0, -1]); tri([D, C, F], [0, 0, 1]);
    }
  }
  function house(x, z, w, d, col, roof, opt) {
    opt = opt || {}; const y = opt.y !== undefined ? opt.y : gy(x, z) - 0.3; const h = opt.h || 7;
    M.wall.wallBox(x, y, z, w, h, d, col, 3.5); M.solid.box(x, y + h, z, w, 0.3, d, col);
    gable(x, y + h, z, w, d, opt.rh || 4.5, roof, w > d);
    H.addBox(x, z, w, d, -1000, y + h + 0.3);
    const f = opt.face || 's'; const dd = f === 's' ? [0, d / 2 + 0.1] : f === 'n' ? [0, -d / 2 - 0.1] : f === 'e' ? [w / 2 + 0.1, 0] : [-w / 2 - 0.1, 0];
    M.solid.box(x + dd[0], y, z + dd[1], f === 's' || f === 'n' ? 2.2 : 0.3, 3.4, f === 's' || f === 'n' ? 0.3 : 2.2, '#5a3a22');
    H.rooftops.push({ x, z, y: y + h + 0.3, w, d });
    return { y, h, door: { x: x + dd[0] * 1.3 + (f === 'e' ? 1.5 : f === 'w' ? -1.5 : 0), z: z + dd[1] * 1.3 + (f === 's' ? 1.5 : f === 'n' ? -1.5 : 0) } };
  }
  function fence(x0, z0, x1, z1, col, opt) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 2.5), yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; M.solid.box(x, gy(x, z), z, 0.25, 1.4, 0.25, col); }
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, y = gy(mx, mz);
    M.solid.box(mx, y + 0.5, mz, 0.12, 0.2, L, col, yaw); M.solid.box(mx, y + 1.0, mz, 0.12, 0.2, L, col, yaw);
    if (!(opt && opt.noCollide)) { const w = Math.abs(x1 - x0) + 0.4, d = Math.abs(z1 - z0) + 0.4; H.addBox(mx, mz, w, d, y - 2, y + 1.3); }
  }
  function sign(text, x, y, z, w, h, bg, fg, yaw, opt) {
    const tex = H.canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = ch * 0.62; g.font = `${fs}px "Bowlby One", Impact, sans-serif`; while (g.measureText(text).width > cw * 0.92 && fs > 8) { fs -= 2; g.font = `${fs}px "Bowlby One", Impact, sans-serif`; }
      g.fillText(text, cw / 2, ch / 2 + 2);
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    mat.userData.glowMax = 0.9; H.Sky.nightLights.push(mat);
    const m = new THREE.Mesh(H.G.plane, mat); m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.y = yaw || 0; H.scene.add(m);
    if (opt && opt.ret) return m; H.signs.push(m);
  }
  H.makeSign = sign;
  // ---------- trees & rocks (instanced) ----------
  const TREES = { pine: [], oak: [], palm: [], jungle: [], cactus: [], bush: [], rock: [], deadtree: [] };
  function tree(type, x, z, s, y) { TREES[type].push([x, y === undefined ? gy(x, z) : y, z, s || 1, R()]); if (type !== 'bush') H.addCircle(x, z, (type === 'rock' ? 1.6 : 0.6) * (s || 1), -1000, (y === undefined ? gy(x, z) : y) + (type === 'rock' ? 1.5 * s : 6 * (s || 1))); }
  H.addTree = tree;
  function buildTrees() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const inst = (geo, color, list, fn, opt) => {
      if (!list.length) return; const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(Object.assign({ color: 0xffffff }, opt || {})), list.length);
      list.forEach((t, i) => { const r = fn(t, m, c); im.setMatrixAt(i, m); im.setColorAt(i, c.set(color).offsetHSL(0, 0, (t[4] - 0.5) * 0.12)); if (r) im.setColorAt(i, r); });
      im.castShadow = true; im.receiveShadow = true; H.scene.add(im);
    };
    const trunks = [...TREES.pine.map(t => [...t, 'p']), ...TREES.oak.map(t => [...t, 'o']), ...TREES.palm.map(t => [...t, 'a']), ...TREES.jungle.map(t => [...t, 'j']), ...TREES.deadtree.map(t => [...t, 'd'])];
    inst(H.G.cyl6, '#6a4a2c', trunks, (t, m) => { const s = t[3]; const hh = t[5] === 'a' ? 9 : t[5] === 'j' ? 12 : t[5] === 'd' ? 5 : 4; q.setFromEuler(new THREE.Euler(t[5] === 'a' ? (t[4] - 0.5) * 0.3 : 0, 0, t[5] === 'a' ? (t[4] - 0.5) * 0.3 : 0)); m.compose(v.set(t[0], t[1] + hh * s / 2, t[2]), q, sc.set(0.7 * s, hh * s, 0.7 * s)); });
    inst(H.G.cone6, '#2e6a36', TREES.pine.flatMap(t => [[...t, 0], [...t, 1]]), (t, m) => { const s = t[3]; const k = t[5]; m.compose(v.set(t[0], t[1] + (4 + k * 3.2) * s, t[2]), q.identity(), sc.set((5.5 - k * 1.8) * s, (6 - k) * s, (5.5 - k * 1.8) * s)); });
    inst(H.G.ico, '#4a8a34', TREES.oak, (t, m) => { const s = t[3]; m.compose(v.set(t[0], t[1] + 6.5 * s, t[2]), q.identity(), sc.set(7 * s, 6 * s, 7 * s)); });
    inst(H.G.cone6, '#3a9a3a', TREES.palm, (t, m) => { const s = t[3]; m.compose(v.set(t[0], t[1] + 9.3 * s, t[2]), q.setFromEuler(new THREE.Euler(Math.PI, t[4] * 6, 0)), sc.set(7 * s, 1.6 * s, 7 * s)); });
    inst(H.G.ico, '#2a7a2a', TREES.jungle, (t, m) => { const s = t[3]; m.compose(v.set(t[0], t[1] + 13 * s, t[2]), q.identity(), sc.set(11 * s, 5 * s, 11 * s)); });
    inst(H.G.cyl6, '#4a8a3a', TREES.cactus.flatMap(t => [[...t, 0], [...t, 1], [...t, 2]]), (t, m) => { const s = t[3], k = t[5]; if (k === 0) m.compose(v.set(t[0], t[1] + 2.5 * s, t[2]), q.identity(), sc.set(0.9 * s, 5 * s, 0.9 * s)); else m.compose(v.set(t[0] + (k === 1 ? 0.9 : -0.9) * s, t[1] + (2.6 + k * 0.5) * s, t[2]), q.identity(), sc.set(0.6 * s, 1.8 * s, 0.6 * s)); });
    inst(H.G.ico, '#3e7a32', TREES.bush, (t, m) => { const s = t[3]; m.compose(v.set(t[0], t[1] + 0.6 * s, t[2]), q.identity(), sc.set(2.4 * s, 1.6 * s, 2.4 * s)); });
    inst(H.G.ico, '#8a8680', TREES.rock, (t, m) => { const s = t[3]; m.compose(v.set(t[0], t[1] + 0.4 * s, t[2]), q.setFromEuler(new THREE.Euler(t[4], t[4] * 3, 0)), sc.set(3.4 * s, 2.4 * s, 3 * s)); });
  }

  // ---------- region builders ----------
  const BUILD_COLS = ['#c8b8a0', '#a8b4c0', '#d8c8b0', '#8c9aa8', '#b8a090', '#e0d8c8', '#9aa8a0', '#c0a8a0', '#b0b8c8', '#d0c0a0', '#7a8a9a', '#c8c0b8'];
  function city() {
    const reserved = new Set(['35,35', '-35,-35', '35,-105', '-105,35', '175,35', '-35,175', '105,175', '-105,-105']);
    const blocks = [-245, -175, -105, -35, 35, 105, 175, 245];
    for (const bx of blocks) for (const bz of blocks) {
      M.solid.box(bx, 2.95, bz, 58, 0.2, 58, '#b4b0a8');
      if (reserved.has(bx + ',' + bz)) continue;
      const dc = Math.hypot(bx, bz), tall = dc < 170, split = R() < 0.5 ? 1 : R() < 0.5 ? 2 : 4;
      const lots = split === 1 ? [[0, 0, 48, 48]] : split === 2 ? [[-13, 0, 22, 48], [13, 0, 22, 48]] : [[-13, -13, 22, 22], [13, -13, 22, 22], [-13, 13, 22, 22], [13, 13, 22, 22]];
      for (const [ox, oz, w, d] of lots) {
        const h = tall ? R.range(28, 105) * (1 - dc / 500) + 15 : R.range(10, 32);
        building(bx + ox, bz + oz, w - R.range(0, 4), d - R.range(0, 4), h, R.pick(BUILD_COLS), { y: 3, door: [0, d / 2 - 1.5] });
      }
    }
    // Plaza with fountain
    M.solid.shape('cyl', 35, 3, 35, 16, 1.2, 16, '#c8c4bc'); M.solid.shape('cyl', 35, 3.3, 35, 14, 1.0, 14, '#4aa8e8');
    M.solid.shape('cyl', 35, 4, 35, 2, 5, 2, '#d8d4cc'); M.solid.shape('cyl', 35, 6.5, 35, 6, 0.5, 6, '#d8d4cc');
    H.addCircle(35, 35, 8, -10, 4.2); H.fountains = [{ x: 35, y: 7, z: 35 }];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; H.propSpawns.push({ type: 'bench', x: 35 + Math.cos(a) * 20, z: 35 + Math.sin(a) * 20, ry: -a }); }
    // statue of the city founder (a goat, obviously)
    M.solid.box(20, 3, 20, 4, 3, 4, '#a8a49c'); M.solid.box(20, 6, 20, 2, 2, 3.4, '#c8a858'); M.solid.box(20, 8, 21.4, 1.2, 1.2, 1.2, '#c8a858'); H.addBox(20, 20, 4, 4, -10, 6);
    // Park
    M.solid.box(-35, 3, -35, 56, 0.25, 56, '#4a9a3a');
    for (let i = 0; i < 18; i++) tree(R() < 0.5 ? 'oak' : 'bush', -35 + R.range(-24, 24), -35 + R.range(-24, 24), R.range(0.6, 1), 3.2);
    M.solid.shape('cyl', -35, 3.1, -35, 14, 0.3, 14, '#3a8ac8');
    H.propSpawns.push({ type: 'beachball', x: -25, z: -45 }, { type: 'soccer', x: -45, z: -25 });
    // Penthouse tower
    building(-105, -105, 40, 40, 150, '#3a4a5a', { y: 3, tile: 3, roof: '#2a2e34' });
    // Apartment block
    building(105, 168, 44, 30, 26, '#c88a6a', { y: 3, roof: '#5a4a4a' });
    // Shops in city
    for (const s of H.SHOPS) if (Math.abs(s.x) < 290 && Math.abs(s.z) < 290 && !s.inMall) shopBuilding(s);
    // City furniture
    for (let x = -280; x <= 280; x += 35) for (let z = -280; z <= 280; z += 70) {
      lamp(x + 6.5, z + 6.5);
      if (R() < 0.35) H.propSpawns.push({ type: R.pick(['trash', 'hydrant', 'cone', 'mailbox', 'crate', 'trash']), x: x + R.range(-3, 3) + 8, z: z + 8 });
    }
    H.npcZones.push({ x: 0, z: 0, r: 270, count: 70, type: 'city' });
    // parked vehicles
    [['sedan', 60, 7.5, Math.PI / 2], ['pickup', -150, -63, Math.PI / 2], ['bus', 145, -7, Math.PI / 2], ['police', -7, 120, 0], ['bike', 22, 60, 0], ['skate', 30, 20, 0], ['sedan', -230, 76, Math.PI / 2], ['icecream', 63, -160, 0]].forEach(([id, x, z, yaw]) => H.vehicleSpawns.push({ id, x, z, yaw }));
  }
  function lamp(x, z, y) {
    y = y === undefined ? gy(x, z) : y; M.solid.box(x, y, z, 0.3, 7, 0.3, '#3a3e44'); M.glow.box(x, y + 7, z, 1.2, 0.5, 1.2, '#fff2c0'); H.addCircle(x, z, 0.3, y - 1, y + 7.5);
  }
  function shopBuilding(s) {
    const y = gy(s.x, s.z); const cols = { cosmetics: '#ff6ab0', animals: '#4ac86a', vehicles: '#3a8ae8', furniture: '#e8a83a', properties: '#2ab0a0', garage: '#e8442a', fish: '#2a8ab8' };
    const col = cols[s.kind] || '#e8442a';
    building(s.x, s.z - 4, 36, 24, 10, '#efe8dc', { y, noRoofItems: 1, roof: '#4a4a52' });
    M.solid.box(s.x, y + 6, s.z + 8.6, 30, 0.4, 3.2, col);
    M.glow.box(s.x - 6, y + 1, s.z + 8.1, 8, 4, 0.2, '#bfe6ff'); M.glow.box(s.x + 6, y + 1, s.z + 8.1, 8, 4, 0.2, '#bfe6ff');
    M.solid.box(s.x, y, s.z + 8.1, 3, 4.2, 0.3, '#3a2a1a');
    sign(s.name, s.x, y + 8.2, s.z + 8.25, 28, 2.6, col, '#ffffff');
    H.addInteract({ x: s.x, y: y + 1, z: s.z + 11, r: 4, label: 'Enter ' + s.name, kind: 'shop', shop: s });
    H.npcZones.push({ x: s.x, z: s.z + 14, r: 3, count: 1, type: 'shopkeeper' });
  }

  function suburbs() {
    const cols = ['#e8dcc0', '#c8d8e8', '#e8c8c0', '#d8e8c8', '#f0e8d8', '#d0c8e0', '#e8d0a0'], roofs = ['#8a3a2a', '#4a5a6a', '#5a4a3a', '#2a4a3a', '#7a6a5a'];
    const taken = H.PROPERTIES.filter(p => p.style === 'house');
    for (let x = -650; x <= -350; x += 52) for (const z of [-75, -30, 30, 75, 125, 170]) {
      if (taken.some(p => Math.abs(p.x - x) < 30 && Math.abs(p.z - z) < 30)) continue;
      const face = z < 0 ? 's' : 'n'; const hx = x + R.range(-4, 4), hz = z + R.range(-3, 3);
      house(hx, hz, R.range(12, 16), R.range(10, 13), R.pick(cols), R.pick(roofs), { face });
      const fz = face === 's' ? hz + 12 : hz - 12;
      fence(hx - 11, fz, hx - 3, fz, '#f4f4f0', { noCollide: 1 }); fence(hx + 3, fz, hx + 11, fz, '#f4f4f0', { noCollide: 1 });
      if (R() < 0.3) { M.solid.box(hx + 8, gy(hx + 8, hz) - 0.1, hz - (face === 's' ? 9 : -9), 6, 0.35, 4, '#5ac8f0'); }
      tree(R() < 0.6 ? 'oak' : 'bush', hx + R.range(-10, 10), fz + (face === 's' ? 3 : -3), R.range(0.5, 0.9));
      H.propSpawns.push({ type: 'mailbox', x: hx + 4, z: fz + (face === 's' ? 1.5 : -1.5) });
      if (R() < 0.4) H.propSpawns.push({ type: R.pick(['trash', 'beachball', 'crate']), x: hx - 6, z: fz - (face === 's' ? 2 : -2) });
      if (R() < 0.15) H.vehicleSpawns.push({ id: R.pick(['sedan', 'pickup', 'bike', 'golfcart']), x: hx - 9, z: hz, yaw: 0 });
    }
    H.npcZones.push({ x: -500, z: 60, r: 170, count: 22, type: 'suburb' });
  }
  function mansions() {
    const p = S.mansions; const y = p.h;
    house(-720, -440, 34, 22, '#f4ead4', '#3a3a44', { y, h: 12, rh: 6, face: 's' });
    for (let i = -2; i <= 2; i++) M.solid.shape('cyl', -720 + i * 6, y + 6, -428, 1.2, 12, 1.2, '#ffffff');
    M.solid.shape('cyl', -650, y, -380, 10, 1, 10, '#d8d0c0'); M.solid.shape('cyl', -650, y + 0.3, -380, 8.6, 1, 8.6, '#5ab4f0'); M.solid.shape('cyl', -650, y + 1, -380, 1.4, 5, 1.4, '#e8e0d0');
    H.addCircle(-650, -380, 5, -10, y + 1);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; M.solid.box(-660 + Math.cos(a) * 105, y - 1, -380 + Math.sin(a) * 105, 6, 3, 2, '#2e6a2a', -a); }
    for (let i = 0; i < 20; i++) tree(R() < 0.5 ? 'bush' : 'oak', -660 + R.range(-90, 90), -380 + R.range(-90, 90), R.range(0.6, 1));
    H.npcZones.push({ x: -660, z: -380, r: 80, count: 8, type: 'rich' });
    H.vehicleSpawns.push({ id: 'golfcart', x: -630, z: -350, yaw: 1 });
  }
  function farm() {
    const f = S.farm, y = f.h;
    // barn
    const bx = -860, bz = 440; M.wall.wallBox(bx, y - 0.3, bz, 26, 11, 18, '#b8322a', 4); gable(bx, y + 10.7, bz, 26, 18, 8, '#5a4a40', false);
    H.addBox(bx, bz, 26, 18, -100, y + 10.7); M.solid.box(bx, y - 0.3, bz + 9.1, 8, 8, 0.3, '#f0e8d8');
    M.solid.shape('cyl', -835, y, 430, 8, 30, 8, '#c8ccd0'); M.solid.shape('sphere', -835, y + 30, 430, 8, 6, 8, '#9aa0a8'); H.addCircle(-835, 430, 4, -100, y + 33);
    // pens
    const pens = [[-860, 600, 34], [-960, 600, 26]];
    for (const [px, pz, s] of pens) { const hs = s / 2; fence(px - hs, pz - hs, px + hs, pz - hs, '#8a6a4a'); fence(px - hs, pz + hs, px - 4, pz + hs, '#8a6a4a'); fence(px + 4, pz + hs, px + hs, pz + hs, '#8a6a4a'); fence(px - hs, pz - hs, px - hs, pz + hs, '#8a6a4a'); fence(px + hs, pz - hs, px + hs, pz + hs, '#8a6a4a'); }
    H.sheepPen = { x: -860, z: 600, r: 15 };
    // windmill
    const wx = -1020, wz = 600, wy = gy(wx, wz); M.solid.shape('cone6', wx, wy + 10, wz, 7, 20, 7, '#e8e0d0'); H.addCircle(wx, wz, 3, -100, wy + 18);
    const blades = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = H.mesh('box', '#f4f0e6', 1.6, 12, 0.3, 0, 6, 0); const p = new THREE.Group(); p.add(b); p.rotation.z = i * Math.PI / 2; blades.add(p); }
    blades.position.set(wx, wy + 18, wz + 3.5); H.scene.add(blades); H.anims.push(dt => (blades.rotation.z += dt * 0.8));
    // crops & scarecrow
    for (let i = 0; i < 60; i++) H.propSpawns.push({ type: R() < 0.5 ? 'pumpkin' : 'watermelon', x: f.x + 60 + R.range(-80, 80), z: f.z - 40 + R.range(-70, 70) });
    for (let i = 0; i < 20; i++) H.propSpawns.push({ type: 'hay', x: -900 + R.range(-60, 60), z: 500 + R.range(-30, 60) });
    M.solid.box(-920, y, 480, 0.3, 4, 0.3, '#6a4a2a'); M.solid.box(-920, y + 3, 480, 3, 0.3, 0.3, '#6a4a2a'); M.solid.box(-920, y + 3.2, 480, 1.4, 1.6, 0.8, '#3a6aa8'); M.solid.shape('sphere', -920, y + 4.6, 480, 1, 1, 1, '#e8c86a');
    H.npcZones.push({ x: -900, z: 520, r: 120, count: 10, type: 'farmer' }, { x: -860, z: 600, r: 40, count: 10, type: 'sheep' }, { x: -950, z: 470, r: 60, count: 6, type: 'cow' }, { x: -880, z: 470, r: 40, count: 10, type: 'chicken' }, { x: -960, z: 600, r: 12, count: 5, type: 'pig' });
    H.vehicleSpawns.push({ id: 'tractor', x: -900, z: 460, yaw: 0.5 }, { id: 'pickup', x: -940, z: 440, yaw: 0 });
    for (let i = 0; i < 30; i++) tree('oak', f.x + R.range(-190, 190), f.z + R.range(-190, 190), R.range(0.7, 1.2));
  }
  function village() {
    const v = S.village, y = v.h;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + R() * 0.2, r = R.range(45, 95); const x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r; house(x, z, R.range(8, 11), R.range(7, 9), R.pick(['#efe6d0', '#e8d8b8', '#d8e0d0']), R.pick(['#6a4a32', '#4a5a3a', '#8a5a3a']), { h: 5, rh: 4, face: Math.abs(Math.cos(a)) > 0.7 ? (Math.cos(a) > 0 ? 'w' : 'e') : (Math.sin(a) > 0 ? 'n' : 's') }); }
    // church
    house(v.x, v.z - 30, 14, 24, '#f2ece0', '#5a4a4a', { h: 9, face: 's' }); M.solid.box(v.x, y + 9, v.z - 44, 6, 14, 6, '#f2ece0'); M.solid.shape('cone6', v.x, y + 27, v.z - 44, 6, 8, 6, '#5a4a4a'); H.addBox(v.x, v.z - 44, 6, 6, -10, y + 31);
    // well & market
    M.solid.shape('cyl', v.x, y, v.z, 4, 1.4, 4, '#9a9690'); M.solid.box(v.x, y + 1.4, v.z, 0.3, 3, 4, '#6a4a2a'); gable(v.x, y + 4.2, v.z, 4.4, 4.4, 1.6, '#8a3a2a', true); H.addCircle(v.x, v.z, 2, -10, y + 1.4);
    for (let i = 0; i < 5; i++) { const sx = v.x - 30 + i * 12, sz = v.z + 25; M.solid.box(sx, y, sz, 6, 1.2, 3, '#8a6a4a'); M.solid.box(sx, y + 3, sz, 7, 0.2, 4, R.pick(['#e84a3a', '#3a8ae8', '#e8b83a', '#3ab86a'])); for (const q of [-1, 1]) M.solid.box(sx + q * 3, y, sz - 1.5, 0.2, 3, 0.2, '#6a4a2a'); H.propSpawns.push({ type: R.pick(['watermelon', 'pumpkin', 'crate']), x: sx, z: sz + 3 }); }
    H.npcZones.push({ x: v.x, z: v.z, r: 90, count: 14, type: 'villager' });
  }
  function industrial() {
    const s = S.industrial;
    for (const [x, z, w, d, h, c] of [[400, -290, 50, 30, 16, '#8a9aa8'], [500, -330, 40, 50, 20, '#a8786a'], [400, -380, 46, 26, 14, '#7a8a7a'], [520, -400, 30, 22, 12, '#9a8a6a']]) building(x, z, w, d, h, c, { y: 3, tile: 6, noRoofItems: 1, roof: '#5a5e64' });
    // containers
    const cc = ['#d8442a', '#2a7ad8', '#e8b02a', '#3aa85a', '#8a4ac8', '#e87a2a'];
    for (let i = 0; i < 14; i++) for (let k = 0; k < (R() < 0.5 ? 2 : 3); k++) { const x = 360 + (i % 7) * 8, z = -230 - Math.floor(i / 7) * 16 - 140; M.solid.box(x, 3 + k * 2.8, z, 6, 2.8, 13, R.pick(cc)); if (k === 0) H.addBox(x, z, 6, 13, -10, 3 + 2.8 * (R() < 2 ? 1 : 1)); }
    // stack colliders more simply: recompute tallest per column
    // crane
    const cx = 540, cz = -260; for (let i = 0; i < 12; i++) M.solid.box(cx, 3 + i * 4, cz, 2.4, 4, 2.4, i % 2 ? '#e8b81a' : '#d8a81a'); M.solid.box(cx + 14, 51, cz, 40, 2, 2, '#e8b81a'); M.solid.box(cx - 8, 49, cz, 6, 4, 4, '#5a5a5a');
    H.addBox(cx, cz, 2.4, 2.4, -10, 51); H.addBox(cx + 14, cz, 40, 2, 50, 53); H.rooftops.push({ x: cx + 30, z: cz, y: 53, w: 4, d: 2 });
    // tanks & stacks
    for (const [x, z] of [[560, -300], [575, -330], [560, -360]]) { M.solid.shape('cyl', x, 3 + 6, z, 12, 12, 12, '#d0d4d8'); H.addCircle(x, z, 6, -10, 15); }
    M.solid.shape('cyl', 420, 3 + 22, -420, 4, 44, 4, '#a85a4a'); H.addCircle(420, -420, 2, -10, 47);
    for (let i = 0; i < 40; i++) H.propSpawns.push({ type: R.pick(['barrel', 'barrel', 'explosive', 'crate', 'crate', 'tire']), x: s.x + R.range(-100, 100), z: s.z + R.range(-90, 90) });
    H.npcZones.push({ x: 450, z: -330, r: 100, count: 12, type: 'worker' });
    H.vehicleSpawns.push({ id: 'digger', x: 470, z: -360, yaw: 0 }, { id: 'hauler', x: 380, z: -335, yaw: Math.PI / 2 });
    // Shed #9 — secret lab entrance
    const lx = S.lab.x, lz = S.lab.z, ly = gy(lx, lz); house(lx, lz, 8, 6, '#7a6a5a', '#4a3a2a', { h: 3.5, rh: 2, face: 's' });
    sign('KEEP OUT', lx, ly + 2.2, lz + 3.2, 4, 0.8, '#e8c81a', '#1a1a1a');
    H.addInteract({ x: lx, y: ly + 1, z: lz + 4.5, r: 3, label: 'Open the shed door', kind: 'labdoor' });
    // mod shop
    shopBuilding(H.SHOPS.find(s => s.id === 'mods'));
  }
  function mall() {
    const x = 400, z = 370, y = 3;
    building(x, z, 140, 60, 18, '#e8e4dc', { y, plain: 1, noRoofItems: 1, roof: '#9aa0a8' });
    M.glow.box(x, y + 1, z - 30.2, 120, 12, 0.2, '#9ad8ff');
    sign('MEGAMALL', x, y + 15.5, z - 30.4, 40, 5, '#d8263a', '#ffffff', Math.PI);
    sign('MEGAMALL', x, y + 15.5, z - 30.4, 40, 5, '#d8263a', '#ffffff');
    for (let i = -6; i <= 6; i++) M.solid.box(x + i * 10, y + 0.02, 300, 0.3, 0.05, 10, '#f2f2f2');
    for (let i = 0; i < 10; i++) H.vehicleSpawns.push({ id: R.pick(['sedan', 'pickup', 'sedan', 'golfcart']), x: x - 55 + i * 12 + 5, z: 300 + (R() < 0.5 ? -6 : 6), yaw: 0 });
    for (const s of H.SHOPS.filter(s => s.inMall)) { sign(s.name, s.x, y + 6, z - 30.5, 18, 1.8, '#2a2a30', '#ffffff'); H.addInteract({ x: s.x, y: y + 1, z: s.z, r: 4, label: 'Enter ' + s.name, kind: 'shop', shop: s }); M.solid.box(s.x, y, z - 30.3, 4, 5, 0.3, '#5a5a62'); }
    H.npcZones.push({ x, z: 310, r: 70, count: 22, type: 'shopper' });
  }
  function airport() {
    const y = 3;
    M.solid.box(1030, y, -60, 600, 0.12, 46, '#3a3c40'); for (let i = 0; i < 28; i++) M.solid.box(760 + i * 20, y + 0.13, -60, 10, 0.05, 1.2, '#f2f2f2');
    M.solid.box(900, y, -10, 220, 0.12, 14, '#4a4c50');
    building(900, -180, 160, 40, 16, '#e0e6ec', { y, plain: 1, noRoofItems: 1, roof: '#aab4c0' }); M.glow.box(900, y + 2, -159.8, 150, 10, 0.2, '#8ac8f0');
    sign('GUST INTERNATIONAL', 900, y + 14, -159.6, 60, 4, '#1a3a6a', '#ffffff');
    // control tower
    M.solid.shape('cyl', 1000, y + 25, -210, 6, 50, 6, '#e8ecf0'); M.glow.shape('cyl', 1000, y + 52, -210, 14, 6, 14, '#9ad8ff'); M.solid.shape('cyl', 1000, y + 55.5, -210, 15, 1, 15, '#5a6470');
    H.addCircle(1000, -210, 7, -10, y + 56); H.rooftops.push({ x: 1000, z: -210, y: y + 56, w: 6, d: 6 });
    for (const hx of [1100, 1180, 1260]) { M.solid.shape('cyl', hx, y, -170, 40, 1, 46, '#9aa4b0', Math.PI / 2, 0, 0); const g = new THREE.Matrix4(); M.solid.box(hx, y, -170, 40, 12, 0.5, '#8a94a0'); H.addBox(hx, -193, 40, 2, -10, y + 14); H.addBox(hx - 20, -170, 2, 46, -10, y + 14); H.addBox(hx + 20, -170, 2, 46, -10, y + 14); }
    shopBuilding(H.SHOPS.find(s => s.id === 'hangar'));
    H.npcZones.push({ x: 900, z: -140, r: 60, count: 16, type: 'tourist' });
    H.vehicleSpawns.push({ id: 'bus', x: 850, z: -130, yaw: Math.PI / 2 }, { id: 'golfcart', x: 960, z: -120, yaw: 0 });
  }
  function themepark() {
    const t = S.themepark, y = t.h;
    // entrance arch
    M.solid.box(t.x - 14, y, t.z - 140, 3, 14, 3, '#ff4ab0'); M.solid.box(t.x + 14, y, t.z - 140, 3, 14, 3, '#ff4ab0'); M.solid.box(t.x, y + 14, t.z - 140, 31, 4, 3, '#ffd21a');
    sign('WOBBLELAND', t.x, y + 16, t.z - 141.6, 28, 3.6, '#ffd21a', '#d8263a'); H.addBox(t.x - 14, t.z - 140, 3, 3, -10, y + 18); H.addBox(t.x + 14, t.z - 140, 3, 3, -10, y + 18);
    // ferris wheel
    const fw = new THREE.Group(); fw.position.set(t.x + 70, y + 32, t.z - 40);
    const rim = H.mesh('torus', '#ff4ab0', 56, 56, 6); fw.add(rim);
    for (let i = 0; i < 12; i++) { const sp = H.mesh('box', '#f2f2f2', 0.5, 28, 0.5); const g = new THREE.Group(); g.rotation.z = i / 12 * Math.PI * 2; sp.position.y = 14; g.add(sp); fw.add(g); }
    const cabins = []; for (let i = 0; i < 12; i++) { const c = H.mesh('box', ['#ffd21a', '#4ac8ff', '#7ad21a', '#ff8a1a'][i % 4], 3, 3, 3); fw.add(c); cabins.push(c); }
    H.scene.add(fw); M.solid.box(t.x + 70, y, t.z - 43, 2, 32, 2, '#c8c8d0', 0); M.solid.box(t.x + 70, y, t.z - 37, 2, 32, 2, '#c8c8d0');
    H.anims.push((dt, time) => { fw.rotation.z += dt * 0.12; cabins.forEach((c, i) => { const a = i / 12 * Math.PI * 2 + fw.rotation.z; c.position.set(Math.cos(a) * 28, Math.sin(a) * 28 - 2, 0); c.rotation.z = -fw.rotation.z; }); });
    H.addBox(t.x + 70, t.z - 40, 4, 8, -10, y + 4);
    // carousel
    const car = new THREE.Group(); car.position.set(t.x - 50, y, t.z - 60);
    car.add(H.mesh('cyl', '#ffd8e8', 20, 0.8, 20, 0, 0.4, 0)); car.add(H.mesh('cone', '#ff4ab0', 22, 5, 22, 0, 8.5, 0));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; car.add(H.mesh('cyl', '#ffd21a', 0.2, 6, 0.2, Math.cos(a) * 8, 3.5, Math.sin(a) * 8)); const hs = H.mesh('box', '#ffffff', 1, 1.4, 2.4, Math.cos(a) * 8, 2.5, Math.sin(a) * 8); hs.rotation.y = -a; car.add(hs); }
    H.scene.add(car); H.anims.push((dt, tt) => { car.rotation.y += dt * 0.6; car.children.forEach((c, i) => { if (i > 1 && i % 2 === 1) c.position.y = 2.5 + Math.sin(tt * 2 + i) * 0.6; }); });
    H.addCircle(t.x - 50, t.z - 60, 10, -10, y + 0.8);
    // roller coaster
    const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const r = 60 + Math.sin(a * 3) * 14; pts.push(new THREE.Vector3(t.x + Math.cos(a) * r - 10, y + 6 + (i === 2 ? 46 : i === 3 ? 30 : i === 6 ? 32 : i === 9 ? 20 : i === 12 ? 26 : 6 + Math.abs(Math.sin(a * 2)) * 10), t.z + 30 + Math.sin(a) * r * 0.7)); }
    const curve = new THREE.CatmullRomCurve3(pts, true); H.coaster = { curve, station: curve.getPoint(0) };
    const N = 360; const mtx = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { const p = curve.getPoint(i / N), p2 = curve.getPoint((i + 1) / N); mtx.lookAt(p2, p, new THREE.Vector3(0, 1, 0)); mtx.setPosition(p); mtx.scale(new THREE.Vector3(3, 0.4, p.distanceTo(p2) + 0.1)); M.solid.addGeo(H.G.box, mtx, '#d8263a'); if (i % 9 === 0) M.solid.box(p.x, y, p.z, 0.6, p.y - y, 0.6, '#e8e8e8'); }
    const st = H.coaster.station; M.solid.box(st.x, y, st.z, 8, 0.6, 10, '#ffd21a');
    H.addInteract({ x: st.x, y: st.y, z: st.z, r: 6, label: 'Ride the Wobble Coaster', kind: 'ride', ride: 'coaster' });
    const cart = new THREE.Group(); cart.add(H.mesh('box', '#2a8ae8', 2.6, 1.2, 4)); cart.add(H.mesh('box', '#ffd21a', 2.8, 0.4, 0.5, 0, 0.8, 1.8)); H.scene.add(cart); H.coaster.cart = cart; H.coaster.t = 0;
    H.anims.push(dt => { if (H.coaster.riding) return; H.coaster.t = (H.coaster.t + dt * 0.025) % 1; const p = curve.getPoint(H.coaster.t), p2 = curve.getPoint((H.coaster.t + 0.002) % 1); cart.position.copy(p).y += 0.8; cart.lookAt(p2.x, p2.y + 0.8, p2.z); });
    // drop tower
    const dx = t.x + 10, dz = t.z + 110; M.solid.box(dx, y, dz, 3, 70, 3, '#9aa0a8'); H.addCircle(dx, dz, 2.2, -10, y + 70);
    const ring = H.mesh('cyl', '#ff8a1a', 9, 2, 9); ring.position.set(dx, y + 2, dz); H.scene.add(ring); H.dropTower = { x: dx, z: dz, y, ring };
    H.addInteract({ x: dx, y: y + 1, z: dz + 6, r: 5, label: 'Ride the Drop Tower', kind: 'ride', ride: 'drop' });
    // stalls & balloons
    for (let i = 0; i < 8; i++) { const sx = t.x - 70 + i * 18, sz = t.z - 110; M.solid.box(sx, y, sz, 7, 3, 5, R.pick(['#ff4ab0', '#4ac8ff', '#ffd21a', '#7ad21a'])); M.solid.box(sx, y + 4.5, sz, 8, 0.3, 6, '#ffffff'); H.addBox(sx, sz, 7, 5, -10, y + 3); }
    for (let i = 0; i < 25; i++) H.propSpawns.push({ type: R.pick(['beachball', 'beachball', 'cone', 'trash', 'balloon']), x: t.x + R.range(-120, 120), z: t.z + R.range(-120, 120) });
    // obstacle course pads
    H.npcZones.push({ x: t.x, z: t.z - 40, r: 110, count: 30, type: 'tourist' });
    H.vehicleSpawns.push({ id: 'kart', x: t.x - 90, z: t.z + 60, yaw: 0 }, { id: 'kart', x: t.x - 84, z: t.z + 60, yaw: 0 }, { id: 'kart', x: t.x - 78, z: t.z + 60, yaw: 0 });
    // bumper kart arena
    fence(t.x - 110, t.z + 40, t.x - 60, t.z + 40, '#ffd21a', { noCollide: 1 }); fence(t.x - 110, t.z + 90, t.x - 60, t.z + 90, '#ffd21a', { noCollide: 1 });
  }
  function sports() {
    const s = S.sports, y = 3;
    const fx = 190, fz = -500; M.solid.box(fx, y, fz, 96, 0.08, 62, '#3a9a3a');
    for (const [w, d, ox, oz] of [[96, 0.4, 0, -31], [96, 0.4, 0, 31], [0.4, 62, -48, 0], [0.4, 62, 48, 0], [0.4, 62, 0, 0]]) M.solid.box(fx + ox, y + 0.1, fz + oz, w || 0.4, 0.05, d || 0.4, '#ffffff');
    for (const gx of [-48, 48]) { const g = gx > 0 ? 1 : -1; M.solid.box(fx + gx, y, fz - 6, 0.4, 4, 0.4, '#ffffff'); M.solid.box(fx + gx, y, fz + 6, 0.4, 4, 0.4, '#ffffff'); M.solid.box(fx + gx, y + 4, fz, 0.4, 0.4, 12.4, '#ffffff'); M.solid.box(fx + gx + g * 2, y, fz, 0.2, 4, 12, '#e8e8e8'); H.addCircle(fx + gx, fz - 6, 0.3, -10, y + 4); H.addCircle(fx + gx, fz + 6, 0.3, -10, y + 4); H.addBox(fx + gx + g * 2.2, fz, 0.4, 12, -10, y + 4); }
    H.soccer = { x: fx, z: fz, goals: [{ x: fx - 49, z: fz, dir: -1 }, { x: fx + 49, z: fz, dir: 1 }] };
    for (const bz of [-540, -460]) { M.solid.box(fx, y, bz + (bz < -500 ? -3 : 3), 96, 4, 6, '#9aa4b0'); H.addBox(fx, bz + (bz < -500 ? -3 : 3), 96, 6, -10, y + 4); }
    // basketball
    const bx = 300, bz = -440; M.solid.box(bx, y, bz, 30, 0.1, 18, '#c8743a');
    H.hoops = [];
    for (const side of [-1, 1]) { const hx = bx + side * 13.5; M.solid.box(hx + side * 1.2, y, bz, 0.4, 7, 0.4, '#5a5a5a'); M.solid.box(hx + side * 0.6, y + 6, bz, 0.2, 2.6, 3.6, '#ffffff'); const ring = H.mesh('torus', '#ff5a1a', 1.8, 1.8, 1.8, hx, y + 6, bz); ring.rotation.x = Math.PI / 2; H.scene.add(ring); H.hoops.push({ x: hx - side * 0.3, y: y + 6, z: bz }); H.addCircle(hx + side * 1.2, bz, 0.3, -10, y + 8.6); }
    // bowling lanes
    H.bowling = [];
    for (let i = 0; i < 4; i++) { const lz = -545 + i * 6, lx0 = 270, lx1 = 320; M.solid.box((lx0 + lx1) / 2, y, lz, lx1 - lx0, 0.15, 3.4, '#d8b07a'); M.solid.box((lx0 + lx1) / 2, y, lz - 2, lx1 - lx0, 0.5, 0.4, '#5a3a2a'); M.solid.box(lx1 + 2, y, lz, 0.6, 3, 5, '#2a2a30'); H.addBox(lx1 + 2, lz, 0.6, 5, -10, y + 3); H.bowling.push({ x0: lx0, x1: lx1, z: lz }); }
    sign('KICKABOUT SPORTS', 230, y + 9, -418, 30, 3, '#1ab06a', '#ffffff'); M.solid.box(230, y, -418.4, 1, 9, 0.4, '#5a5a5a');
    H.propSpawns.push({ type: 'soccer', x: fx, z: fz }, { type: 'basketball', x: bx, z: bz }, { type: 'basketball', x: bx + 3, z: bz + 2 });
    H.npcZones.push({ x: 230, z: -480, r: 90, count: 16, type: 'athlete' });
  }
  function golf() {
    const g = S.golf; house(g.x + 70, g.z + 80, 30, 18, '#f2ece0', '#2a5a3a', { h: 6, face: 's' });
    const r2 = H.rng(91);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, tx = g.x + Math.cos(a) * 40, tz = g.z + Math.sin(a) * 40, hx = g.x + Math.cos(a + 0.6) * 105, hz = g.z + Math.sin(a + 0.6) * 105;
      const hy = gy(hx, hz); M.solid.shape('cyl', hx, hy, hz, 12, 0.1, 12, '#5ad85a'); M.solid.shape('cyl', hx, hy + 0.05, hz, 1.4, 0.1, 1.4, '#111111'); M.solid.box(hx, hy, hz, 0.12, 5, 0.12, '#f2f2f2'); M.solid.box(hx + 0.8, hy + 4, hz, 1.6, 1, 0.05, '#e8261a');
      M.solid.box(tx, gy(tx, tz), tz, 4, 0.2, 4, '#3ab83a');
      if (r2() < 0.7) M.solid.shape('cyl', (tx + hx) / 2 + 8, gy((tx + hx) / 2, (tz + hz) / 2) - 0.2, (tz + hz) / 2, 10, 0.4, 7, '#e8d8a0');
      H.golfHoles.push({ n: i + 1, tee: { x: tx, z: tz }, hole: { x: hx, z: hz }, par: 3 + (i % 3 === 0 ? 1 : 0) });
    }
    for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, r = R.range(125, 170); tree(R() < 0.5 ? 'oak' : 'pine', g.x + Math.cos(a) * r, g.z + Math.sin(a) * r, R.range(0.7, 1.1)); }
    H.vehicleSpawns.push({ id: 'golfcart', x: g.x + 60, z: g.z + 100, yaw: 0 }, { id: 'golfcart', x: g.x + 66, z: g.z + 100, yaw: 0 });
    H.npcZones.push({ x: g.x, z: g.z, r: 100, count: 8, type: 'golfer' });
  }
  function lake() {
    const l = S.lake; const dx = l.x + 80, dz = l.z + 40;
    M.solid.box(dx - 15, 1.5, dz, 30, 0.4, 4, '#8a6a4a'); H.addBox(dx - 15, dz, 30, 4, -20, 1.9); for (let i = 0; i < 6; i++) M.solid.box(dx - 28 + i * 5, -6, dz, 0.5, 7.5, 0.5, '#6a4a2a');
    H.fishSpots.push({ x: dx - 28, z: dz, name: 'Lake Lumpy Dock', pool: [0, 1, 2, 3, 4, 5, 6, 16] });
    H.vehicleSpawns.push({ id: 'jetski', x: dx - 20, z: dz + 8, yaw: 0 });
    for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, r = R.range(125, 170); tree(R() < 0.6 ? 'pine' : 'oak', l.x + Math.cos(a) * r, l.z + Math.sin(a) * r, R.range(0.7, 1.2)); }
    H.npcZones.push({ x: dx, z: dz + 20, r: 30, count: 5, type: 'fisher' });
  }
  function beach() {
    // boardwalk
    M.solid.box(-200, 3.6, 975, 700, 0.4, 8, '#b8905a'); for (let x = -540; x <= 140; x += 10) M.solid.box(x, 0, 978.5, 0.4, 3.6, 0.4, '#7a5a3a');
    for (let i = 0; i < 70; i++) H.addDeck(-550 + i * 10, 975, -540 + i * 10, 975, 4, 4, 4);
    // pier
    const p = S.pier; for (let z = 1050; z < 1230; z += 6) H.addDeck(p.x, z, p.x, z + 6, 2.5, 2.5, 4);
    M.solid.box(p.x, 2.1, 1140, 8, 0.4, 180, '#9a7a52'); for (let z = 1050; z < 1230; z += 12) { M.solid.box(p.x - 3.6, -14, z, 0.6, 16.5, 0.6, '#6a4a2a'); M.solid.box(p.x + 3.6, -14, z, 0.6, 16.5, 0.6, '#6a4a2a'); }
    H.fishSpots.push({ x: p.x, z: 1225, name: 'Old Pier', pool: [0, 3, 8, 9, 10, 11, 12, 13, 16, 17] });
    shopBuilding(H.SHOPS.find(s => s.id === 'fishmarket'));
    // marina
    shopBuilding(H.SHOPS.find(s => s.id === 'boats'));
    for (let i = 0; i < 4; i++) { const mx = 300 + i * 18; M.solid.box(mx, 1.8, 1160, 3, 0.4, 40, '#9a7a52'); for (let z = 1140; z < 1180; z += 6) H.addDeck(mx, z, mx, z + 6, 2.2, 2.2, 1.6); }
    H.vehicleSpawns.push({ id: 'jetski', x: 309, z: 1150, yaw: Math.PI }, { id: 'speedboat', x: 327, z: 1165, yaw: Math.PI }, { id: 'icecream', x: -60, z: 990, yaw: Math.PI / 2 });
    // umbrellas, towels, lifeguard towers, palms
    for (let i = 0; i < 70; i++) { const x = R.range(-1100, 1000), z = R.range(1005, 1040); if (Math.abs(x - p.x) < 10) continue; const y = gy(x, z); M.solid.box(x, y, z, 0.15, 3.2, 0.15, '#f2f2f2'); M.solid.shape('cone', x, y + 3.4, z, 5, 1.2, 5, R.pick(['#ff4a4a', '#4ac8ff', '#ffd21a', '#7ad21a', '#ff8ad8'])); M.solid.box(x + 2, y + 0.02, z + 1, 1.6, 0.05, 3, R.pick(['#ff8a3a', '#3a8ae8', '#e84ab0'])); }
    for (const x of [-800, -300, 450, 900]) { const y = gy(x, 1030); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.solid.box(x + a, y, 1030 + b, 0.3, 5, 0.3, '#f2f2f2'); M.solid.box(x, y + 5, 1030, 3.4, 2.4, 3.4, '#e8261a'); H.addBox(x, 1030, 3.4, 3.4, y + 4.5, y + 7.6); }
    for (let i = 0; i < 90; i++) { const x = R.range(-1350, 1350), z = R.range(940, 1000); if (gy(x, z) > 1.5) tree('palm', x, z, R.range(0.8, 1.2)); }
    for (let i = 0; i < 25; i++) H.propSpawns.push({ type: 'beachball', x: R.range(-900, 900), z: R.range(1000, 1040) });
    H.npcZones.push({ x: -100, z: 1015, r: 400, count: 40, type: 'beach' });
    // Lighthouse
    const lx = S.lighthouse.x, lz = S.lighthouse.z, ly = 8;
    for (let i = 0; i < 8; i++) M.solid.shape('cyl', lx, ly + i * 5 + 2.5, lz, 12 - i * 0.4, 5, 12 - i * 0.4, i % 2 ? '#d8261a' : '#ffffff');
    M.glow.shape('cyl', lx, ly + 42, lz, 6, 4, 6, '#fff6a0'); M.solid.shape('cone6', lx, ly + 46, lz, 8, 3, 8, '#2a2a2a'); H.addCircle(lx, lz, 6, -10, ly + 40); H.rooftops.push({ x: lx, z: lz, y: ly + 40, w: 4, d: 4 });
    const beam = H.mesh('cone', '#fff6c0', 18, 160, 18, 0, 0, 0, { transparent: true, opacity: 0.12, depthWrite: false, emissive: 0xfff6c0 }); beam.geometry = new THREE.ConeGeometry(0.5, 1, 16, 1, true); beam.rotation.z = Math.PI / 2; beam.position.x = 80;
    const bg = new THREE.Group(); bg.position.set(lx, ly + 42, lz); bg.add(beam); H.scene.add(bg); H.anims.push(dt => { bg.rotation.y += dt * 0.8; bg.visible = H.Sky.isNight(); });
    H.fishSpots.push({ x: lx + 20, z: lz + 30, name: 'Lighthouse Rocks', pool: [3, 8, 10, 11, 13, 14, 17, 18] });
    for (let i = 0; i < 12; i++) tree('rock', lx + R.range(-40, 40), lz + R.range(10, 50), R.range(0.8, 1.6));
    // Island
    const is = S.island; for (let i = 0; i < 14; i++) tree('palm', is.x + R.range(-45, 45), is.z + R.range(-45, 45), R.range(0.8, 1.2));
    M.solid.box(is.x, 1.6, is.z - 62, 4, 0.4, 20, '#9a7a52'); for (let z = is.z - 72; z < is.z - 52; z += 5) H.addDeck(is.x, z, is.x, z + 5, 2, 2, 2);
    H.fishSpots.push({ x: is.x, z: is.z - 72, name: 'Coconut Key Dock', pool: [9, 10, 11, 12, 13, 14, 15, 17, 18, 19] });
    // Sunken ship
    const sx = -500, sz = 1400, sy = gy(sx, sz);
    M.solid.box(sx, sy - 1, sz, 10, 6, 30, '#5a3a22', 0.3); M.solid.box(sx, sy + 5, sz, 0.8, 18, 0.8, '#4a2a1a'); M.solid.box(sx, sy + 15, sz, 10, 6, 0.3, '#d8d0c0'); H.addBox(sx, sz, 10, 26, -100, sy + 5);
    H.shipwreck = { x: sx, y: sy + 5, z: sz };
  }
  function forest() {
    const f = S.forest;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x = -1000 + Math.cos(a) * 8, z = -700 + Math.sin(a) * 8; M.solid.shape('cone6', x, gy(x, z) + 1.4, z, 4, 3, 4, R.pick(['#e8442a', '#3a8ae8', '#e8b02a'])); }
    M.solid.shape('cyl', -1000, gy(-1000, -700), -700, 2, 0.6, 2, '#5a5a5a'); H.campfire = { x: -1000, y: gy(-1000, -700) + 1, z: -700 };
    // Goathenge
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = -800 + Math.cos(a) * 18, z = -900 + Math.sin(a) * 18, y = gy(x, z); M.solid.box(x, y - 0.5, z, 3, 9, 2, '#8a8a84', -a); H.addCircle(x, z, 1.4, -10, y + 8.5); if (i % 2 === 0) { const a2 = (i + 1) / 12 * Math.PI * 2; M.solid.box((x + (-800 + Math.cos(a2) * 18)) / 2, y + 8.5, (z + (-900 + Math.sin(a2) * 18)) / 2, 3, 1.6, 10, '#8a8a84', -a - 0.26 + Math.PI / 2); } }
    // giant hollow log
    M.solid.shape('cyl', -1060, gy(-1060, -620) + 2.5, -620, 5, 24, 5, '#6a4a2a', 0, 0, Math.PI / 2);
    // mushroom ring
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = -900 + Math.cos(a) * 7, z = -780 + Math.sin(a) * 7, y = gy(x, z); M.solid.box(x, y, z, 0.6, 1.4, 0.6, '#f2ead8'); M.solid.shape('sphere', x, y + 1.5, z, 2.2, 1.2, 2.2, '#e8261a'); }
    H.npcZones.push({ x: -1000, z: -700, r: 30, count: 5, type: 'camper' }, { x: -950, z: -700, r: 220, count: 10, type: 'deer' }, { x: -900, z: -800, r: 200, count: 4, type: 'bear' });
  }
  function jungle() {
    const t = S.temple, ty = gy(t.x, t.z);
    for (let i = 0; i < 12; i++) { const s = 44 - i * 3.4, h = 1.9; M.solid.box(t.x, ty - 1 + i * h, t.z, s, h + (i === 0 ? 1 : 0), s, i % 2 ? '#8a9a6a' : '#7a8a5a'); H.addBox(t.x, t.z, s, s, -50, ty - 1 + (i + 1) * h); }
    M.solid.box(t.x, ty - 1 + 12 * 1.9, t.z, 5, 4, 5, '#6a7a4a'); H.addBox(t.x, t.z, 5, 5, -50, ty + 25.8 + 4);
    H.templeTop = { x: t.x, y: ty + 26.8 + 4, z: t.z };
    for (let i = 0; i < 16; i++) { const x = t.x + R.range(-70, 70), z = t.z + R.range(-70, 70); if (Math.hypot(x - t.x, z - t.z) < 30) continue; M.solid.box(x, gy(x, z) - 0.5, z, 2, R.range(2, 7), 2, '#8a9a7a'); }
    H.npcZones.push({ x: 980, z: -860, r: 200, count: 8, type: 'monkey' }, { x: 1060, z: -900, r: 50, count: 4, type: 'explorer' });
    H.fishSpots.push({ x: H.RIVER(-700) - 20, z: -700, name: 'Jungle River', pool: [1, 4, 5, 6, 7, 14, 15, 16] });
  }
  function mountains() {
    const o = S.observatory; const oy = gy(o.x, o.z);
    M.solid.shape('cyl', o.x, oy + 3, o.z, 18, 8, 18, '#e8ecf0'); M.solid.shape('sphere', o.x, oy + 7, o.z, 18, 14, 18, '#c8d0dc'); H.addCircle(o.x, o.z, 9, -10, oy + 13);
    H.summit = { x: o.x, y: oy + 14, z: o.z }; H.rooftops.push({ x: o.x, z: o.z, y: oy + 13, w: 6, d: 6 });
    // cave entrance
    const c = S.cave, cy = gy(c.x, c.z);
    M.solid.shape('cyl', c.x, cy + 1, c.z, 14, 10, 14, '#5a5650', Math.PI / 2, 0, 0); M.solid.shape('cyl', c.x, cy + 1, c.z + 0.6, 10, 9.6, 8, '#0a0a0c', Math.PI / 2, 0, 0);
    H.addInteract({ x: c.x, y: cy + 1, z: c.z + 6, r: 5, label: 'Enter Grumble Cave', kind: 'enter', to: 'cave' });
    // giant's chair
    const gx = 320, gz = -1200, gyy = gy(gx, gz); M.solid.box(gx, gyy, gz, 30, 14, 30, '#7a5a3a'); M.solid.box(gx, gyy + 14, gz - 13, 30, 40, 4, '#7a5a3a'); H.addBox(gx, gz, 30, 30, -100, gyy + 14); H.addBox(gx, gz - 13, 30, 4, -100, gyy + 54);
    H.giantChair = { x: gx, y: gyy + 54, z: gz - 13 };
    H.npcZones.push({ x: -200, z: -1050, r: 200, count: 6, type: 'hiker' }, { x: 100, z: -1100, r: 300, count: 6, type: 'goatwild' });
  }
  function desert() {
    const sp = S.stuntpark, y = sp.h;
    // ramps of the stunt park
    const ramps = [[1060, 520, 0, 10, 24, 6], [1060, 600, Math.PI, 10, 24, 6], [1140, 520, 0, 12, 36, 12], [1140, 640, Math.PI, 12, 30, 9], [1100, 560, Math.PI / 2, 8, 20, 4], [1020, 560, -Math.PI / 2, 8, 30, 10], [1180, 580, Math.PI / 2, 14, 46, 18]];
    for (const [x, z, yaw, w, l, h] of ramps) {
      H.addRamp(x, z, yaw, w, l, h, y); const m = new THREE.Matrix4();
      const geo = new THREE.BufferGeometry(); const hw = w / 2, hl = l / 2;
      const P = [[-hw, 0, -hl], [hw, 0, -hl], [hw, h, hl], [-hw, h, hl], [-hw, 0, hl], [hw, 0, hl]];
      const idx = [0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5];
      const pos = []; idx.forEach(i => pos.push(...P[i])); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(idx.length * 2).fill(0), 2));
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -yaw, 0)), new THREE.Vector3(1, 1, 1)); M.solid.addGeo(geo, m, R.pick(['#e8442a', '#ffd21a', '#2a8ae8']));
    }
    sign('STUNT PARK', sp.x, y + 8, sp.z - 80, 22, 3, '#2a2a30', '#ffd21a'); M.solid.box(sp.x, y, sp.z - 80.4, 1, 8, 0.4, '#5a5a5a');
    for (let i = 0; i < 20; i++) H.propSpawns.push({ type: R.pick(['tire', 'cone', 'explosive', 'crate']), x: sp.x + R.range(-80, 80), z: sp.z + R.range(-80, 80) });
    H.vehicleSpawns.push({ id: 'moto', x: sp.x - 20, z: sp.z - 60, yaw: 0 }, { id: 'pickup', x: sp.x - 30, z: sp.z - 60, yaw: 0 });
    // cacti, rocks, oasis
    for (let i = 0; i < 160; i++) { const x = S.desert.x + R.range(-300, 300), z = S.desert.z + R.range(-300, 300); if (H.inDesert(x, z) > 0.7 && gy(x, z) > 2 && Math.hypot(x - sp.x, z - sp.z) > 95) tree(R() < 0.7 ? 'cactus' : R() < 0.5 ? 'rock' : 'deadtree', x, z, R.range(0.7, 1.3)); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; tree('palm', 1020 + Math.cos(a) * 32, 760 + Math.sin(a) * 32, R.range(0.8, 1.1)); }
    // UFO crash site
    const u = S.ufo, uy = gy(u.x, u.z); const saucer = new THREE.Group(); saucer.add(H.mesh('sphere', '#c8d0dc', 18, 3.5, 18)); saucer.add(H.mesh('sphere', '#7affd0', 7, 5, 7, 0, 1.6, 0, { emissive: 0x2a8a6a }));
    saucer.position.set(u.x, uy + 1, u.z); saucer.rotation.z = 0.35; H.scene.add(saucer); H.addCircle(u.x, u.z, 8, -10, uy + 4);
    for (let i = 0; i < 10; i++) tree('rock', u.x + R.range(-25, 25), u.z + R.range(-25, 25), R.range(0.5, 1));
    // bunker hatch decoration
    H.npcZones.push({ x: 1080, z: 600, r: 120, count: 8, type: 'tourist' }, { x: 1200, z: 750, r: 200, count: 6, type: 'camelwild' });
  }
  function skatepark() {
    const s = S.skatepark, y = s.h; M.solid.box(s.x, y, s.z, 110, 0.1, 110, '#a8a8ac');
    const rs = [[s.x - 40, s.z, Math.PI / 2, 30, 10, 5, 1], [s.x + 40, s.z, -Math.PI / 2, 30, 10, 5, 1], [s.x, s.z - 40, 0, 30, 10, 5, 1], [s.x, s.z + 40, Math.PI, 30, 10, 5, 1], [s.x - 10, s.z + 8, 0, 8, 10, 2], [s.x + 10, s.z - 8, Math.PI, 8, 10, 2]];
    for (const [x, z, yaw, w, l, h, curve] of rs) {
      H.addRamp(x, z, yaw, w, l, h, y, { curve });
      const segs = 8, hw = w / 2, hl = l / 2, pos = [];
      for (let i = 0; i < segs; i++) { const t0 = i / segs, t1 = (i + 1) / segs; const h0 = (curve ? 1 - Math.cos(t0 * Math.PI / 2) : t0) * h, h1 = (curve ? 1 - Math.cos(t1 * Math.PI / 2) : t1) * h; const z0 = -hl + t0 * l, z1 = -hl + t1 * l; pos.push(-hw, h0, z0, -hw, h1, z1, hw, h1, z1, -hw, h0, z0, hw, h1, z1, hw, h0, z0); }
      pos.push(-hw, 0, hl, -hw, h, hl, hw, h, hl, -hw, 0, hl, hw, h, hl, hw, 0, hl);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -yaw, 0)), new THREE.Vector3(1, 1, 1)); M.solid.addGeo(geo, m, '#c8c8cc');
    }
    M.solid.box(s.x, y, s.z, 14, 1.4, 6, '#9a9aa0'); H.addBox(s.x, s.z, 14, 6, -10, y + 1.4);
    M.solid.box(s.x - 20, y + 1, s.z - 20, 16, 0.2, 0.3, '#e8b81a');
    H.vehicleSpawns.push({ id: 'skate', x: s.x - 5, z: s.z + 25, yaw: 0 }, { id: 'skate', x: s.x + 5, z: s.z + 25, yaw: 0 }, { id: 'bike', x: s.x + 30, z: s.z + 30, yaw: 0 });
    H.npcZones.push({ x: s.x, z: s.z, r: 40, count: 8, type: 'skater' });
  }
  function cloudGarden() {
    const x = -220, z = 140, y = 240;
    M.solid.shape('cone6', x, y - 14, z, 44, 28, 44, '#8a7a6a', Math.PI); M.solid.shape('cyl', x, y - 0.5, z, 44, 1, 44, '#5ab84a'); H.addCircle(x, z, 21, y - 28, y);
    for (let i = 0; i < 6; i++) tree(R() < 0.5 ? 'oak' : 'bush', x + R.range(-14, 14), z + R.range(-14, 14), 0.7, y);
    H.cloudGarden = { x, y, z };
    // trampoline launcher in the park to reach it
    H.propSpawns.push({ type: 'trampoline', x: -45, z: -20 });
  }
  function riverExtras() {
    H.fishSpots.push({ x: H.RIVER(200) - 30, z: 200, name: 'Riverbank', pool: [0, 1, 2, 3, 4, 5, 6, 7, 16] });
    for (let i = 0; i < 80; i++) { const z = R.range(-900, 950); const x = H.RIVER(z) + (R() < 0.5 ? -1 : 1) * R.range(40, 70); if (!H.nearRoad(x, z) && gy(x, z) > 2) tree(R() < 0.5 ? 'oak' : 'bush', x, z, R.range(0.6, 1.1)); }
  }
  // Wilderness scatter: forests, jungle, mountains, open fields
  function scatter() {
    const r = H.rng(555);
    for (let i = 0; i < 26000; i++) {
      const x = r.range(-1560, 1560), z = r.range(-1560, 980); const h = gy(x, z); if (h < 1.5 || H.nearRoad(x, z)) continue;
      let flat = false; for (const k of ['city', 'mall', 'industrial', 'suburbs', 'mansions', 'themepark', 'sports', 'golf', 'farm', 'village', 'skatepark', 'stuntpark', 'lake']) { const s = S[k]; if (Math.hypot(x - s.x, z - s.z) < s.r + 15 || (k === 'city' && Math.abs(x) < 320 && Math.abs(z) < 320)) { flat = true; break; } }
      if (flat || (x > 680 && x < 1360 && z > -260 && z < 140)) continue;
      const fo = H.inForest(x, z), ju = H.inJungle(x, z), de = H.inDesert(x, z), mo = H.mountainMask(z);
      const v = r();
      if (fo > 0.3 && v < 0.5 * fo) tree('pine', x, z, r.range(0.8, 1.5));
      else if (ju > 0.3 && v < 0.5 * ju) tree(r() < 0.7 ? 'jungle' : 'palm', x, z, r.range(0.8, 1.4));
      else if (mo > 0.2 && h < 110 && v < 0.08) tree(r() < 0.75 ? 'pine' : 'rock', x, z, r.range(0.8, 1.6));
      else if (mo > 0.4 && v < 0.12) tree('rock', x, z, r.range(0.8, 2.2));
      else if (de < 0.1 && mo < 0.2 && v < 0.035) tree(r() < 0.6 ? 'oak' : r() < 0.5 ? 'bush' : 'pine', x, z, r.range(0.7, 1.3));
    }
  }

  // ---------- properties (exteriors + interiors) ----------
  function properties() {
    for (const p of H.PROPERTIES) {
      const y = gy(p.x, p.z); let door = { x: p.x, z: p.z + 10 };
      switch (p.style) {
        case 'house': door = house(p.x, p.z, 16, 13, p.col || '#e8d8b0', '#4a3a3a', { face: p.z < 0 ? 's' : 'n' }).door; break;
        case 'farmhouse': door = house(p.x, p.z, 18, 14, '#f2ead8', '#8a3a2a', { face: 's', h: 8 }).door; break;
        case 'cabin': door = house(p.x, p.z, 14, 11, '#7a5232', '#3a2a1a', { face: 's', h: 5 }).door; break;
        case 'hut': door = house(p.x, p.z, 10, 10, '#e8d0a0', '#c8a058', { face: 'n', h: 4, y: y + 1.5 }).door; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.solid.box(p.x + a * 4.5, y - 1, p.z + b * 4.5, 0.4, 2.6, 0.4, '#8a6a4a'); break;
        case 'mansion': door = house(p.x, p.z, 30, 22, p.col, '#2a2e3a', { face: 's', h: 12, rh: 6, y: S.mansions.h - 0.3 }).door; for (let i = -2; i <= 2; i++) M.solid.shape('cyl', p.x + i * 5, S.mansions.h + 6, p.z + 12.5, 1.2, 12, 1.2, '#ffffff'); M.solid.box(p.x + 22, S.mansions.h - 0.2, p.z, 12, 0.4, 18, '#5ac8f0'); break;
        case 'treehouse': { const ty = y + 14; M.solid.shape('cyl6', p.x, y + 10, p.z, 4, 20, 4, '#6a4a2a'); M.solid.shape('ico', p.x, y + 26, p.z, 22, 10, 22, '#2a7a2a'); M.solid.box(p.x, ty, p.z, 16, 0.6, 16, '#8a6a4a'); house(p.x, p.z, 10, 10, '#a87a4a', '#5a3a1a', { y: ty + 0.6, h: 4, face: 's' }); H.addBox(p.x, p.z, 16, 16, ty - 0.5, ty + 0.6); H.addCircle(p.x, p.z, 2, -10, ty); for (let k = 0; k < 14; k++) { M.solid.box(p.x, y + k, p.z + 8.4, 2, 0.2, 0.3, '#5a3a1a'); } door = { x: p.x, z: p.z + 10 }; break; }
        case 'lighthouse': door = { x: p.x, z: p.z + 8 }; break;
        case 'apartment': door = { x: p.x, z: p.z + 10 }; break;
        case 'penthouse': door = { x: p.x, z: p.z + 22 }; M.solid.box(p.x, 3, p.z + 20.3, 4, 5, 0.3, '#ffd76a'); break;
        case 'garage': building(p.x, p.z, 30, 20, 9, '#8a8a92', { y: 3, noRoofItems: 1 }); M.solid.box(p.x, 3, p.z + 10.1, 14, 7, 0.3, '#c8c8d0'); door = { x: p.x, z: p.z + 13 }; break;
        case 'bunker': M.solid.shape('cyl', p.x, y - 0.4, p.z, 8, 1.4, 8, '#5a6a4a'); M.solid.box(p.x, y + 0.4, p.z, 3, 0.4, 3, '#3a3a3a'); door = { x: p.x, z: p.z + 5 }; break;
        case 'villa': door = house(p.x, p.z, 28, 20, p.col, '#c87a3a', { face: 'n', h: 9 }).door; M.solid.box(p.x + 20, y - 0.2, p.z, 10, 0.4, 16, '#5ad8f0'); break;
      }
      p.door = door;
      const sg = H.makeSign('FOR SALE · ' + H.fmt(p.price), door.x, gy(door.x, door.z) + 3.4, door.z + 1.2, 6, 1.2, '#ffffff', '#d8263a', 0, { ret: 1 }); p.saleSign = sg;
      const sg2 = sg.clone(); sg2.rotation.y = Math.PI; H.scene.add(sg2); p.saleSign2 = sg2;
      M.solid.box(door.x, gy(door.x, door.z), door.z + 1.2, 0.2, 2.8, 0.2, '#6a4a2a');
      H.addInteract({ x: door.x, y: gy(door.x, door.z) + 1, z: door.z, r: 4, label: p.name, kind: 'property', prop: p });
      // interior room
      const [w, d] = p.room; const it = { id: 'prop_' + p.id, x: p.x, z: p.z, y: -400, w, d, h: 9, prop: p, exit: { x: door.x, z: door.z + 2 } };
      H.interiors[it.id] = it; interiorShell(it, { wall: p.style === 'bunker' ? '#5a6068' : p.style === 'cabin' ? '#8a6040' : p.style === 'mansion' ? '#f2ead8' : '#e8dcc8', floor: p.style === 'garage' || p.style === 'bunker' ? '#6a6e74' : '#a87a52' });
      M.glow.box(it.x - w / 2 + 3, it.y, it.z - d / 2 + 0.3, 1.4, 2.4, 0.3, '#c8e0f0');
      H.addInteract({ x: it.x - w / 2 + 3, y: it.y + 1, z: it.z - d / 2 + 1.8, r: 2.5, label: 'Wardrobe', kind: 'wardrobe', interior: it });
      M.solid.box(it.x + w / 2 - 3, it.y, it.z - d / 2 + 0.6, 2, 1.4, 1, '#3a3a44'); M.glow.box(it.x + w / 2 - 3, it.y + 1.4, it.z - d / 2 + 0.6, 1.6, 1, 0.2, '#2affd0');
      H.addInteract({ x: it.x + w / 2 - 3, y: it.y + 1, z: it.z - d / 2 + 2, r: 2.5, label: 'Decorate / Garage terminal', kind: 'terminal', interior: it });
    }
  }
  function interiorShell(it, c) {
    const { x, z, y, w, d, h } = it;
    M.solid.box(x, y - 0.5, z, w, 0.5, d, c.floor); M.solid.box(x, y + h, z, w, 0.4, d, c.ceil || '#f4f0e8');
    M.solid.box(x, y, z - d / 2 - 0.2, w, h, 0.4, c.wall); M.solid.box(x, y, z + d / 2 + 0.2, w, h, 0.4, c.wall); M.solid.box(x - w / 2 - 0.2, y, z, 0.4, h, d, c.wall); M.solid.box(x + w / 2 + 0.2, y, z, 0.4, h, d, c.wall);
    M.glow.box(x, y + h - 0.1, z, Math.min(6, w / 3), 0.1, Math.min(6, d / 3), '#fff4d8');
    M.solid.box(x, y, z + d / 2 - 0.1, 3, 4, 0.2, '#5a3a22');
    H.addInteract({ x, y: y + 1, z: z + d / 2 - 1.5, r: 3, label: 'Exit', kind: 'exit', interior: it });
  }
  function secretInteriors() {
    // Hidden laboratory
    const lab = { id: 'lab', x: S.lab.x, z: S.lab.z, y: -400, w: 64, d: 44, h: 12, exit: { x: S.lab.x, z: S.lab.z + 6 } };
    H.interiors.lab = lab; interiorShell(lab, { wall: '#c8d0d8', floor: '#8a949e', ceil: '#d8dee4' });
    for (let i = 0; i < 6; i++) { const vx = lab.x - 25 + i * 10, vz = lab.z - 14; M.solid.shape('cyl', vx, lab.y + 0.5, vz, 4, 1, 4, '#5a5a62'); M.glow.shape('cyl', vx, lab.y + 4, vz, 3.4, 6, 3.4, i === 2 ? '#7ef25a' : i === 4 ? '#5af2c8' : '#4ad8ff'); H.addCircle(vx, vz, 2, -500, lab.y + 7); }
    for (let i = 0; i < 5; i++) { M.solid.box(lab.x - 20 + i * 10, lab.y, lab.z + 8, 6, 1.2, 2.4, '#e8ecf0'); M.glow.box(lab.x - 20 + i * 10, lab.y + 1.2, lab.z + 7.6, 4, 2.4, 0.2, R.pick(['#2affd0', '#7aff1a', '#ff2ad8'])); H.addBox(lab.x - 20 + i * 10, lab.z + 8, 6, 2.4, -500, lab.y + 1.2); }
    H.addInteract({ x: lab.x - 5, y: lab.y + 1, z: lab.z - 10, r: 4, label: 'Inspect the green specimen vat', kind: 'secret', secret: 'mutantvat', interior: lab });
    H.addInteract({ x: lab.x + 15, y: lab.y + 1, z: lab.z - 10, r: 4, label: 'Inspect the bubbling slime vat', kind: 'secret', secret: 'slimevat', interior: lab });
    for (let i = 0; i < 12; i++) H.propSpawns.push({ type: R.pick(['barrel', 'explosive', 'crate']), x: lab.x + R.range(-28, 28), z: lab.z + R.range(-2, 18), interior: 'lab' });
    // Grumble Cave
    const cave = { id: 'cave', x: S.cave.x, z: S.cave.z, y: -400, w: 80, d: 80, h: 16, exit: { x: S.cave.x, z: S.cave.z + 9 } };
    H.interiors.cave = cave; interiorShell(cave, { wall: '#3a3632', floor: '#4a4440', ceil: '#2a2622' });
    for (let i = 0; i < 40; i++) { const x = cave.x + R.range(-36, 36), z = cave.z + R.range(-36, 30); M.solid.shape('cone6', x, cave.y + 2, z, R.range(1.5, 3), R.range(3, 7), R.range(1.5, 3), '#5a5450'); M.solid.shape('cone6', x + 3, cave.y + 14, z, 2, 5, 2, '#4a4440', Math.PI); }
    for (let i = 0; i < 18; i++) { const x = cave.x + R.range(-36, 36), z = cave.z + R.range(-36, 36); M.glow.shape('cone6', x, cave.y + 1.5, z, 1.4, 4, 1.4, R.pick(['#7a4aff', '#2affd0', '#ff4ab0'])); }
    M.solid.shape('torus', cave.x - 20, cave.y + 0.4, cave.z - 25, 6, 6, 4, '#8a7a5a', Math.PI / 2); M.solid.shape('sphere', cave.x - 20, cave.y + 1.4, cave.z - 25, 2.4, 3.2, 2.4, '#f0e0c0');
    H.addInteract({ x: cave.x - 20, y: cave.y + 1, z: cave.z - 25, r: 4, label: 'Examine the giant egg', kind: 'secret', secret: 'dinoegg', interior: cave });
    H.dinoEgg = { x: cave.x - 20, z: cave.z - 25 };
  }

  // ---------- collectibles ----------
  function collectibles() {
    const r = H.rng(9001);
    const landPoint = (pred) => { for (let i = 0; i < 400; i++) { const x = r.range(-1450, 1450), z = r.range(-1450, 1100); const h = gy(x, z); if (h > 1.5 && (!pred || pred(x, z, h))) return [x, h, z]; } return [0, 5, 0]; };
    let n = 0;
    const add = (type, x, y, z, interior) => H.collectibles.push({ type, id: type + '_' + (n++), x, y, z, interior });
    // 60 rubber ducks
    const roofs = H.rooftops.slice(); for (let i = 0; i < 18; i++) { const t = roofs.splice(Math.floor(r() * roofs.length), 1)[0]; if (t) add('duck', t.x + r.range(-t.w / 4, t.w / 4), t.y + 0.4, t.z + r.range(-t.d / 4, t.d / 4)); }
    for (let i = 0; i < 34; i++) { const [x, h, z] = landPoint(); add('duck', x, h + 0.4, z); }
    add('duck', S.pier.x, 3, 1228); add('duck', S.island.x + 10, gy(S.island.x + 10, S.island.z) + 0.4, S.island.z); add('duck', H.summit.x + 4, H.summit.y, H.summit.z);
    add('duck', H.templeTop.x, H.templeTop.y, H.templeTop.z + 1.5); add('duck', -1100, gy(-1100, -850) + 0.4, -850); add('duck', S.lake.x, 0.4, S.lake.z);
    add('duck', 35, 7.6, 35); add('duck', H.coaster.station.x, H.coaster.station.y + 1, H.coaster.station.z);
    // 25 gnomes
    const gz = [['forest', 0.4], ['suburbs'], ['farm'], ['village'], ['golf'], ['jungle', 0.4], ['mansions']];
    for (let i = 0; i < 25; i++) { const [k] = gz[i % gz.length]; const s = S[k]; const x = s.x + r.range(-s.r * 0.8, s.r * 0.8), z = s.z + r.range(-s.r * 0.8, s.r * 0.8); add('gnome', x, gy(x, z), z); }
    // 12 golden statues
    const st = [[H.summit.x - 3, H.summit.y, H.summit.z], [H.cloudGarden.x, H.cloudGarden.y, H.cloudGarden.z], [H.templeTop.x, H.templeTop.y, H.templeTop.z], [H.shipwreck.x, H.shipwreck.y, H.shipwreck.z], [S.island.x - 20, gy(S.island.x - 20, S.island.z + 20), S.island.z + 20],
      [-105, 153.6, -105], [1000, 59.5, -210], [574, 53.5, -260], [H.giantChair.x, H.giantChair.y, H.giantChair.z], [-835, S.farm.h + 33.5, 430]];
    st.forEach(p => add('statue', ...p));
    add('statue', H.interiors.cave.x + 30, -400, H.interiors.cave.z + 30, 'cave'); add('statue', H.interiors.lab.x + 28, -400, H.interiors.lab.z - 18, 'lab');
    // 40 treasure chests
    for (let i = 0; i < 34; i++) { const [x, h, z] = landPoint((x, z) => !H.nearRoad(x, z)); add('chest', x, h, z); }
    add('chest', H.shipwreck.x + 4, H.shipwreck.y - 5, H.shipwreck.z + 8); add('chest', S.island.x + 15, gy(S.island.x + 15, S.island.z - 15), S.island.z - 15);
    add('chest', H.interiors.cave.x + 30, -400, H.interiors.cave.z - 30, 'cave'); add('chest', H.templeTop.x + 3, H.templeTop.y - 4, H.templeTop.z + 6);
    add('chest', -1100, gy(-1100, -850), -852); add('chest', H.interiors.lab.x - 28, -400, H.interiors.lab.z + 18, 'lab');
    // UFO parts (secret mission)
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, x = S.ufo.x + Math.cos(a) * r.range(60, 160), z = S.ufo.z + Math.sin(a) * r.range(60, 140) * 0.8; add('ufopart', x, gy(x, z), z); }
    // Lab keycard (in cave)
    add('keycard', H.interiors.cave.x + 32, -400, H.interiors.cave.z - 32, 'cave');
  }
  H.SECRET_ZONES = [];
  function secretZones() {
    const z = (id, name, x, y, zz, r, interior) => H.SECRET_ZONES.push({ id, name, x, y, z: zz, r, interior });
    z('lab', 'The Hidden Laboratory', S.lab.x, -400, S.lab.z, 20, 'lab'); z('cave', 'Grumble Cave', S.cave.x, -400, S.cave.z, 30, 'cave');
    z('shipwreck', 'The Sunken Wreck of the Salty Nanny', H.shipwreck.x, H.shipwreck.y, H.shipwreck.z, 22);
    z('temple', 'Top of the Sunken Temple', H.templeTop.x, H.templeTop.y, H.templeTop.z, 6); z('summit', 'Grumblepeak Summit', H.summit.x, H.summit.y, H.summit.z, 14);
    z('island', 'Coconut Key', S.island.x, 5, S.island.z, 45); z('ufo', 'The Crash Site', S.ufo.x, gy(S.ufo.x, S.ufo.z), S.ufo.z, 30);
    z('lighthouse', 'Lighthouse Lantern Deck', S.lighthouse.x, 48, S.lighthouse.z, 6); z('mossback', 'The Mossback Clearing', -1100, gy(-1100, -850), -850, 20);
    z('cloud', 'Cloud Garden', H.cloudGarden.x, H.cloudGarden.y, H.cloudGarden.z, 22); z('chair', 'The Giant\'s Chair', H.giantChair.x, H.giantChair.y, H.giantChair.z, 14);
    z('goathenge', 'Goathenge', -800, gy(-800, -900), -900, 16); z('crane', 'Top of the Crane', 554, 53, -260, 20); z('tower', 'Penthouse Roof', -105, 153.6, -105, 18);
  }

  // ---------- entry ----------
  H.buildWorld = function (scene) {
    H.scene = scene;
    const winTex = H.canvasTex(64, 64, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a4a5c'; g.fillRect(10, 12, 44, 36); g.fillStyle = '#5a6a7c'; g.fillRect(10, 12, 44, 6); });
    const winEm = H.canvasTex(64, 64, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); if (true) { g.fillStyle = '#ffd890'; g.fillRect(12, 14, 40, 32); } });
    const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: winTex, emissive: 0xffffff, emissiveMap: winEm, emissiveIntensity: 0 }); wallMat.userData.glowMax = 0.55;
    const glowMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0.2 }); glowMat.userData.glowMax = 1;
    H.Sky.nightLights.push(wallMat, glowMat);
    M = { wall: new H.Merge(), solid: new H.Merge(), glow: new H.Merge() };
    city(); suburbs(); mansions(); farm(); village(); industrial(); mall(); airport(); themepark(); sports(); golf(); lake(); beach(); forest(); jungle(); mountains(); desert(); skatepark(); cloudGarden(); riverExtras();
    properties(); secretInteriors(); scatter(); buildTrees(); collectibles(); secretZones();
    const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const a = M.wall.build(wallMat), b = M.solid.build(solidMat), c = M.glow.build(glowMat);
    for (const m of [a, b, c]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  };
})();
