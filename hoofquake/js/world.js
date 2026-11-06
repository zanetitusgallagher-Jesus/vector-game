// Hoofquake — terrain, roads, collision queries, sky, day/night and weather.
'use strict';
(function () {
  const W = H.WORLD, N = 320, CELL = W.size / N, HALF = W.half;
  const heights = new Float32Array((N + 1) * (N + 1));
  const S = H.SITES;
  const flatSites = [
    ['city', 70, 1, 1], ['mall', 60], ['industrial', 60], ['suburbs', 70], ['mansions', 110], ['themepark', 60], ['sports', 60],
    ['golf', 80, 0.8], ['farm', 80], ['village', 70], ['skatepark', 30], ['lighthouse', 40],
  ];

  function siteMask(s, x, z, feather, sq) {
    const d = sq ? Math.max(Math.abs(x - s.x), Math.abs(z - s.z)) : Math.hypot(x - s.x, z - s.z);
    return 1 - H.smooth(s.r, s.r + feather, d);
  }
  H.siteMask = siteMask;
  function airportMask(x, z) {
    const dx = Math.max(0, 700 - x, x - 1340), dz = Math.max(0, -230 - z, z - 110);
    return 1 - H.smooth(0, 60, Math.hypot(dx, dz));
  }
  H.inDesert = (x, z) => 1 - H.smooth(230, 330, Math.hypot(x - S.desert.x, z - S.desert.z));
  H.inForest = (x, z) => 1 - H.smooth(180, 300, Math.hypot(x - S.forest.x, z - S.forest.z));
  H.inJungle = (x, z) => 1 - H.smooth(180, 300, Math.hypot(x - S.jungle.x, z - S.jungle.z));
  H.mountainMask = z => H.smooth(-850, -1250, z);

  function rawHeight(x, z) {
    let h = 7 + H.fbm(x * 0.0022, z * 0.0022, 4) * 18 + H.noise(x * 0.02, z * 0.02) * 1.2;
    const m = H.mountainMask(z);
    if (m > 0) {
      const ridge = 1 - Math.abs(H.fbm(x * 0.0032 + 7, z * 0.0032 - 3, 5));
      h += m * (45 + 150 * ridge * ridge);
      const dp = Math.hypot(x - S.observatory.x, z - S.observatory.z);
      h += m * 170 * Math.exp(-(dp / 210) * (dp / 210));
    }
    const e = H.smooth(1300, 1560, Math.abs(x)) * (1 - H.smooth(950, 1100, z)); h += e * 90;
    const d = H.inDesert(x, z);
    if (d > 0) h = H.lerp(h, 8 + Math.sin(x * 0.03 + z * 0.012) * 4 + Math.sin(x * 0.011 - z * 0.03) * 3 + H.noise(x * 0.01, z * 0.01) * 3, d);
    for (const [k, f, amt, sq] of flatSites) { const s = S[k]; const mk = siteMask(s, x, z, f, sq) * (amt || 1); if (mk > 0) h = H.lerp(h, s.h, mk); }
    const st = siteMask(S.stuntpark, x, z, 40); if (st > 0) h = H.lerp(h, S.stuntpark.h, st);
    const ap = airportMask(x, z); if (ap > 0) h = H.lerp(h, 3, ap);
    // lake
    const lk = 1 - H.smooth(S.lake.r * 0.4, S.lake.r, Math.hypot(x - S.lake.x, z - S.lake.z)); if (lk > 0) h = H.lerp(h, -9, lk);
    // oasis
    const oa = 1 - H.smooth(10, 35, Math.hypot(x - 1020, z - 760)); if (oa > 0) h = H.lerp(h, -3, oa);
    // river
    if (z > -1050 && z < 1200) {
      const fade = H.smooth(-1050, -950, z);
      const rm = (1 - H.smooth(12, 38, Math.abs(x - H.RIVER(z)))) * fade; if (rm > 0) h = H.lerp(h, -6, rm);
    }
    // beach & ocean
    const b = H.smooth(900, 1000, z);
    if (b > 0) { const target = Math.max(-20, 3 - (z - 1000) * 0.06); h = H.lerp(h, Math.min(h, target), b); }
    const lh = siteMask(S.lighthouse, x, z, 40); if (lh > 0) h = H.lerp(h, 8, lh);
    const isl = 1 - H.smooth(45, 85, Math.hypot(x - S.island.x, z - S.island.z)); if (isl > 0) h = H.lerp(h, 5 + H.noise(x * 0.05, z * 0.05), isl);
    return h;
  }
  H.rawHeight = rawHeight;

  // Terrain height (bilinear on the baked grid so it matches the mesh)
  H.terrainH = function (x, z) {
    const fx = H.clamp((x + HALF) / CELL, 0, N - 0.001), fz = H.clamp((z + HALF) / CELL, 0, N - 0.001);
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, R = N + 1;
    const a = heights[j * R + i], b = heights[j * R + i + 1], c = heights[(j + 1) * R + i], d = heights[(j + 1) * R + i + 1];
    // match PlaneGeometry triangulation (diagonal from (i,j+1) to (i+1,j))
    if (tx + tz < 1) return a + (b - a) * tx + (c - a) * tz;
    return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
  };

  // ---------------- static collision ----------------
  H.colGrid = new H.Grid(32);
  H.boxes = [];
  H.addBox = function (cx, cz, w, d, bottom, top, opt) {
    const b = Object.assign({ minx: cx - w / 2, maxx: cx + w / 2, minz: cz - d / 2, maxz: cz + d / 2, bottom, top }, opt || {});
    H.boxes.push(b); H.colGrid.insert(b, b.minx, b.minz, b.maxx, b.maxz); return b;
  };
  H.addCircle = function (x, z, r, bottom, top) { const c = { circle: 1, x, z, r, bottom, top }; H.colGrid.insert(c, x - r, z - r, x + r, z + r); return c; };
  // ramps: oriented boxes whose height rises along local +z
  H.addRamp = function (x, z, yaw, w, l, h, base, opt) {
    const r = Object.assign({ ramp: 1, x, z, yaw, w, l, h, base, cos: Math.cos(yaw), sin: Math.sin(yaw) }, opt || {});
    const ext = Math.hypot(w, l) / 2; H.colGrid.insert(r, x - ext, z - ext, x + ext, z + ext); return r;
  };
  H.addDeck = function (ax, az, bx, bz, ha, hb, hw) {
    const dk = { deck: 1, ax, az, bx, bz, ha, hb, hw };
    H.colGrid.insert(dk, Math.min(ax, bx) - hw, Math.min(az, bz) - hw, Math.max(ax, bx) + hw, Math.max(az, bz) + hw); return dk;
  };
  const tmp = [];
  const STEP = 0.7;
  function rampLocal(r, x, z) {
    const dx = x - r.x, dz = z - r.z; const lx = dx * r.cos - dz * r.sin, lz = dx * r.sin + dz * r.cos;
    return [lx, lz];
  }
  H.groundAt = function (x, z, y, interior) {
    if (interior) return interior.y;
    let h = H.terrainH(x, z);
    H.colGrid.query(x, z, 0.5, tmp);
    for (const o of tmp) {
      if (o.circle) continue;
      if (o.ramp) {
        const [lx, lz] = rampLocal(o, x, z);
        if (Math.abs(lx) <= o.w / 2 && Math.abs(lz) <= o.l / 2) {
          const t = (lz + o.l / 2) / o.l; const rh = o.base + (o.curve ? (1 - Math.cos(t * Math.PI / 2)) : t) * o.h;
          if (y >= rh - STEP * 2.5 && rh > h) h = rh;
        }
      } else if (o.deck) {
        const vx = o.bx - o.ax, vz = o.bz - o.az, L2 = vx * vx + vz * vz; let t = ((x - o.ax) * vx + (z - o.az) * vz) / L2; t = H.clamp(t, 0, 1);
        const px = o.ax + vx * t, pz = o.az + vz * t; if (H.dist2(x, z, px, pz) < o.hw * o.hw) { const dh = H.lerp(o.ha, o.hb, t); if (y >= dh - 1.5 && dh > h) h = dh; }
      } else if (x >= o.minx && x <= o.maxx && z >= o.minz && z <= o.maxz && !o.noTop) {
        if (y >= o.top - STEP && o.top > h) h = o.top;
      }
    }
    return h;
  };
  // Push a cylinder (x,z,radius) out of static boxes. Returns wall normal if hit.
  const hitN = { x: 0, z: 0, hit: false, top: 0 };
  H.collideStatic = function (p, r, height, interior) {
    hitN.hit = false;
    if (interior) {
      const it = interior, hx = it.w / 2 - r, hz = it.d / 2 - r;
      if (p.x < it.x - hx) { p.x = it.x - hx; hitN.hit = true; hitN.x = 1; hitN.z = 0; }
      if (p.x > it.x + hx) { p.x = it.x + hx; hitN.hit = true; hitN.x = -1; hitN.z = 0; }
      if (p.z < it.z - hz) { p.z = it.z - hz; hitN.hit = true; hitN.x = 0; hitN.z = 1; }
      if (p.z > it.z + hz) { p.z = it.z + hz; hitN.hit = true; hitN.x = 0; hitN.z = -1; }
      hitN.top = it.y + it.h; return hitN;
    }
    if (p.x < -HALF + 10) { p.x = -HALF + 10; } if (p.x > HALF - 10) p.x = HALF - 10;
    if (p.z < -HALF + 10) p.z = -HALF + 10; if (p.z > HALF - 10) p.z = HALF - 10;
    H.colGrid.query(p.x, p.z, r + 1, tmp);
    for (const o of tmp) {
      if (o.ramp || o.deck) continue;
      if (p.y >= o.top - STEP || p.y + height <= o.bottom) continue;
      if (o.circle) {
        const dx = p.x - o.x, dz = p.z - o.z, d2 = dx * dx + dz * dz, rr = r + o.r;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = o.x + dx / d * rr; p.z = o.z + dz / d * rr; hitN.hit = true; hitN.x = dx / d; hitN.z = dz / d; hitN.top = o.top; }
        continue;
      }
      const cx = H.clamp(p.x, o.minx, o.maxx), cz = H.clamp(p.z, o.minz, o.maxz);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; hitN.x = dx / d; hitN.z = dz / d; }
        else { // centre inside: push out the shortest way
          const l = p.x - o.minx, rr = o.maxx - p.x, f = p.z - o.minz, b = o.maxz - p.z, m = Math.min(l, rr, f, b);
          if (m === l) { p.x = o.minx - r; hitN.x = -1; hitN.z = 0; } else if (m === rr) { p.x = o.maxx + r; hitN.x = 1; hitN.z = 0; }
          else if (m === f) { p.z = o.minz - r; hitN.x = 0; hitN.z = -1; } else { p.z = o.maxz + r; hitN.x = 0; hitN.z = 1; }
        }
        hitN.hit = true; hitN.top = o.top; hitN.box = o;
      }
    }
    return hitN;
  };
  H.waterDepth = (x, z, interior) => (interior ? 0 : Math.max(0, -H.terrainH(x, z)));

  // ---------------- terrain mesh ----------------
  H.buildTerrain = function (scene) {
    const R = N + 1;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) heights[j * R + i] = rawHeight(-HALF + i * CELL, -HALF + j * CELL);
    const geo = new THREE.PlaneGeometry(W.size, W.size, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k), i = Math.round((x + HALF) / CELL), j = Math.round((z + HALF) / CELL), h = heights[j * R + i];
      pos.setY(k, h);
      const hx = heights[j * R + Math.min(N, i + 1)] - heights[j * R + Math.max(0, i - 1)], hz = heights[Math.min(N, j + 1) * R + i] - heights[Math.max(0, j - 1) * R + i];
      const slope = Math.hypot(hx, hz) / (2 * CELL);
      const n = H.noise(x * 0.05, z * 0.05) * 0.06, n2 = H.noise(x * 0.008, z * 0.008) * 0.08;
      const des = H.inDesert(x, z), jung = H.inJungle(x, z), fore = H.inForest(x, z);
      if (h < -1.5) c.setRGB(0.55 + n, 0.5 + n, 0.36);
      else if (h < 1.6) c.setRGB(0.86 + n, 0.78 + n, 0.55);
      else c.setRGB(0.34 + n + n2, 0.55 + n + n2 * 0.5, 0.25 + n);
      if (jung > 0) c.lerp(new THREE.Color(0.16 + n, 0.44 + n, 0.16), jung * 0.85);
      if (fore > 0) c.lerp(new THREE.Color(0.24 + n, 0.42 + n, 0.22), fore * 0.7);
      if (des > 0 && h > 0) c.lerp(new THREE.Color(0.9 + n, 0.74 + n, 0.46 + n), des);
      if (z > 900 && h > -1.5 && h < 4.5) c.lerp(new THREE.Color(0.92 + n, 0.83 + n, 0.6), H.smooth(900, 990, z));
      const paved = Math.max(siteMask(S.city, x, z, 8, 1), siteMask(S.industrial, x, z, 10), siteMask(S.mall, x, z, 10), airportMask(x, z) > 0.98 ? 1 : 0, siteMask(S.skatepark, x, z, 4));
      if (paved > 0) c.lerp(new THREE.Color(0.5 + n, 0.5 + n, 0.52 + n), paved);
      if (siteMask(S.farm, x, z, 0) > 0 && Math.abs(x - S.farm.x - 60) < 90 && Math.abs(z - S.farm.z + 40) < 80) {
        const band = Math.floor((x + 2000) / 14) % 4; const fc = [[0.45, 0.32, 0.18], [0.55, 0.7, 0.25], [0.85, 0.75, 0.3], [0.4, 0.6, 0.22]][band]; c.setRGB(fc[0] + n, fc[1] + n, fc[2]);
      }
      if (siteMask(S.golf, x, z, 0) > 0.9) c.setRGB(0.32 + n * 0.5, 0.7 + n * 0.5, 0.3);
      const rock = H.smooth(0.55, 0.9, slope) + H.smooth(60, 90, h) * H.mountainMask(z);
      if (rock > 0 && des < 0.5) c.lerp(new THREE.Color(0.48 + n, 0.46 + n, 0.44 + n), H.clamp(rock, 0, 1));
      if (h > 105 + n2 * 200) c.setRGB(0.95 + n * 0.4, 0.96 + n * 0.4, 0.98);
      cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; scene.add(mesh); H.terrainMesh = mesh;
    // water
    const wg = new THREE.PlaneGeometry(9000, 9000, 1, 1); wg.rotateX(-Math.PI / 2);
    const wtex = H.canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#2f86c0'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 2); }
    });
    wtex.repeat.set(300, 300);
    H.waterMat = new THREE.MeshPhongMaterial({ color: 0x5ab4e8, map: wtex, transparent: true, opacity: 0.78, shininess: 90, specular: 0x88aacc, depthWrite: false });
    const water = new THREE.Mesh(wg, H.waterMat); water.position.y = 0; water.renderOrder = 2; scene.add(water); H.water = water;
  };

  // ---------------- roads ----------------
  H.roadMask = new Uint8Array(N * N);
  H.nearRoad = (x, z) => { const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL); return i >= 0 && j >= 0 && i < N && j < N && H.roadMask[j * N + i]; };
  H.ROADS = [];
  H.buildRoads = function (scene) {
    const P = (a) => a.map(([x, z]) => ({ x, z }));
    const roads = [];
    for (let v = -280; v <= 280; v += 70) { roads.push({ pts: P([[v, -290], [v, 290]]), w: 11, city: 1 }); roads.push({ pts: P([[-290, v], [290, v]]), w: 11, city: 1 }); }
    const hw = (pts, w) => roads.push({ pts: P(pts), w: w || 13, hw: 1 });
    hw([[280, 0], [500, 0], [700, 10], [760, -60], [900, -60]]);
    hw([[0, 280], [0, 520], [-90, 760], [-110, 960]]);
    hw([[280, 280], [330, 300], [460, 300], [520, 330], [700, 460], [900, 540], [1050, 560]]);
    hw([[-280, 0], [-700, 0], [-900, 60], [-1100, 120]]);
    hw([[-700, 0], [-820, 250], [-900, 420]]);
    hw([[0, -280], [0, -420], [-140, -620], [-170, -820], [-60, -900], [100, -905]]);
    hw([[-280, -200], [-450, -230], [-600, -300], [-660, -330]]);
    hw([[280, -210], [380, -260], [450, -300], [470, -400]]);
    hw([[140, -280], [230, -400]]);
    hw([[-280, 280], [-270, 470]]);
    hw([[-110, 960], [-400, 1000], [-800, 1000], [-1200, 1030]]);
    hw([[-110, 960], [300, 1000], [600, 1000]]);
    hw([[-1100, 120], [-1180, -300], [-950, -560], [-860, -560]]);
    hw([[900, -60], [920, -400], [940, -700]]);
    hw([[1050, 560], [1250, 740]]);
    hw([[-900, 420], [-1150, 700], [-1250, 1000]]);
    H.ROADS = roads;
    const asphalt = new H.Merge(), lines = new H.Merge(), rails = new H.Merge();
    const wht = new THREE.Color('#f2f0e6'), ylw = new THREE.Color('#f2c84a');
    for (const rd of roads) {
      // resample
      const s = [];
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const a = rd.pts[k], b = rd.pts[k + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 6));
        for (let q = 0; q < n; q++) { const t = q / n; s.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }); }
      }
      s.push(rd.pts[rd.pts.length - 1]);
      for (const p of s) { p.t = H.terrainH(p.x, p.z); p.y = Math.max(p.t, 2.6) + 0.14; }
      // bridges: lift over water, then smooth heights so approaches ramp up
      for (const p of s) if (p.t < 1.5) p.y = 5;
      for (let it = 0; it < 6; it++) for (let k = 1; k < s.length - 1; k++) s[k].y = Math.max(s[k].t + 0.14, (s[k - 1].y + s[k].y + s[k + 1].y) / 3);
      rd.samples = s;
      const hw2 = rd.w / 2;
      for (let k = 0; k < s.length - 1; k++) {
        const a = s[k], b = s[k + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L * hw2, nz = dx / L * hw2;
        pushQuad(asphalt, [a.x + nx, a.y, a.z + nz], [b.x + nx, b.y, b.z + nz], [b.x - nx, b.y, b.z - nz], [a.x - nx, a.y, a.z - nz], 0.2);
        if (!rd.city && k % 2 === 0) { const lx = -dz / L * 0.18, lz = dx / L * 0.18; pushQuad(lines, [a.x + lx, a.y + 0.03, a.z + lz], [b.x + lx, b.y + 0.03, b.z + lz], [b.x - lx, b.y + 0.03, b.z - lz], [a.x - lx, a.y + 0.03, a.z - lz], 1, ylw); }
        if (rd.city && k % 3 === 0) { const lx = -dz / L * 0.15, lz = dx / L * 0.15; pushQuad(lines, [a.x + lx, a.y + 0.03, a.z + lz], [b.x + lx, b.y + 0.03, b.z + lz], [b.x - lx, b.y + 0.03, b.z - lz], [a.x - lx, a.y + 0.03, a.z - lz], 1, wht); }
        const elev = Math.min(a.y - a.t, b.y - b.t);
        if (elev > 0.9) {
          H.addDeck(a.x, a.z, b.x, b.z, a.y, b.y, hw2 + 0.5);
          for (const sgn of [1, -1]) rails.box(a.x + nx * sgn, a.y, a.z + nz * sgn, 0.4, 1.1, L + 0.2, '#c8c4bc', Math.atan2(dx, dz));
          if (k % 4 === 0) rails.box(a.x, Math.min(a.t, 0) - 2, a.z, 3, a.y - Math.min(a.t, 0) + 2, 3, '#a8a49c');
        }
        // mark road mask
        for (let q = -1; q <= 1; q++) for (let w = -1; w <= 1; w++) {
          const i = Math.floor((a.x + HALF) / CELL) + q, j = Math.floor((a.z + HALF) / CELL) + w; if (i >= 0 && j >= 0 && i < N && j < N) H.roadMask[j * N + i] = 1;
        }
      }
    }
    const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const m1 = asphalt.build(roadMat); m1.receiveShadow = true; scene.add(m1);
    scene.add(lines.build(new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })));
    const rm = rails.build(new THREE.MeshLambertMaterial({ vertexColors: true })); rm.castShadow = true; scene.add(rm);
  };
  function pushQuad(m, a, b, c, d, shade, col) {
    const cc = col || new THREE.Color(0.22 + shade * 0.1, 0.22 + shade * 0.1, 0.25 + shade * 0.1);
    for (const p of [a, b, c, a, c, d]) { m.p.push(p[0], p[1], p[2]); m.n.push(0, 1, 0); m.c.push(cc.r, cc.g, cc.b); m.u.push(0, 0); }
  }
  H.pushQuad = pushQuad;

  // ---------------- sky, sun, weather ----------------
  const SKY = {
    day: new THREE.Color('#8ecdf2'), dusk: new THREE.Color('#f29a6a'), night: new THREE.Color('#0b1430'),
    fogDay: new THREE.Color('#bfe0f2'), rain: new THREE.Color('#7c8a96'),
  };
  H.Sky = {
    time: 9.5, timeSpeed: 1, weather: 'clear', weatherT: 240, forced: null, lightning: 0, dayCount: 0,
    init(scene) {
      this.scene = scene;
      scene.fog = new THREE.Fog(SKY.fogDay, 120, 900);
      this.hemi = new THREE.HemisphereLight(0xdff2ff, 0x5a6a3a, 0.75); scene.add(this.hemi);
      this.sun = new THREE.DirectionalLight(0xfff2dc, 0.95); this.sun.castShadow = true;
      const sc = this.sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 600;
      this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0008;
      scene.add(this.sun); scene.add(this.sun.target);
      this.amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(this.amb);
      // sun & moon discs
      this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false }));
      this.moonDisc = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false }));
      scene.add(this.sunDisc, this.moonDisc);
      // stars
      const sg = new THREE.BufferGeometry(), sp = [];
      const r = H.rng(77); for (let i = 0; i < 1800; i++) { const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95); sp.push(Math.sin(ph) * Math.cos(th) * 2400, Math.cos(ph) * 2400, Math.sin(ph) * Math.sin(th) * 2400); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
      scene.add(this.stars);
      // clouds
      const cg = H.G.lowSphere; this.clouds = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }), 240);
      this.cloudData = []; const m = new THREE.Matrix4();
      for (let i = 0; i < 40; i++) { const cx = r.range(-1600, 1600), cz = r.range(-1600, 1600), cy = r.range(260, 360); for (let k = 0; k < 6; k++) this.cloudData.push({ x: cx + r.range(-40, 40), y: cy + r.range(-8, 8), z: cz + r.range(-25, 25), s: r.range(30, 60) }); }
      this.cloudData.forEach((c, i) => { m.makeScale(c.s * 1.6, c.s * 0.55, c.s); m.setPosition(c.x, c.y, c.z); this.clouds.setMatrixAt(i, m); });
      scene.add(this.clouds);
      // precipitation
      const pg = new THREE.BufferGeometry(); this.precip = new Float32Array(4000 * 3);
      for (let i = 0; i < 4000; i++) { this.precip[i * 3] = r.range(-60, 60); this.precip[i * 3 + 1] = r.range(0, 60); this.precip[i * 3 + 2] = r.range(-60, 60); }
      pg.setAttribute('position', new THREE.BufferAttribute(this.precip, 3));
      this.rain = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xaaccee, size: 0.25, transparent: true, opacity: 0.7 }));
      this.rain.visible = false; this.rain.frustumCulled = false; scene.add(this.rain);
      this.nightLights = [];
    },
    isNight() { return this.time < 6 || this.time > 19.5; },
    dayFactor() { // 0 night .. 1 day
      const t = this.time; if (t < 5) return 0; if (t < 7) return (t - 5) / 2; if (t < 18.5) return 1; if (t < 20.5) return 1 - (t - 18.5) / 2; return 0;
    },
    setWeather(w) { this.weather = w; this.weatherT = 180 + Math.random() * 240; H.emit && H.emit('weather', w); },
    update(dt, camPos, inInterior) {
      const prev = this.time;
      this.time += dt * this.timeSpeed * (24 / 1200); // 20-minute days
      if (this.time >= 24) { this.time -= 24; this.dayCount++; H.stat && H.stat('days', 1); H.newDay && H.newDay(); }
      if (!this.forced) { this.weatherT -= dt; if (this.weatherT <= 0) { const opts = ['clear', 'clear', 'clear', 'cloudy', 'rain', 'storm', 'fog']; this.setWeather(opts[Math.floor(Math.random() * opts.length)]); } }
      else this.weather = this.forced;
      const df = this.dayFactor(), ang = ((this.time - 6) / 24) * Math.PI * 2;
      const sx = Math.cos(ang), sy = Math.sin(ang);
      const w = this.weather, wet = w === 'rain' || w === 'storm' || w === 'snow';
      const cloudy = wet || w === 'cloudy' ? 1 : 0;
      // colors
      const sky = new THREE.Color().copy(SKY.night).lerp(SKY.day, df);
      const duskAmt = Math.max(0, 1 - Math.abs(this.time - 19) / 1.5, 1 - Math.abs(this.time - 6.2) / 1.2) * 0.6;
      sky.lerp(SKY.dusk, duskAmt);
      if (cloudy) sky.lerp(SKY.rain.clone().multiplyScalar(0.3 + df * 0.7), wet ? 0.75 : 0.4);
      if (this.lightning > 0) { sky.lerp(new THREE.Color(1, 1, 1), this.lightning); this.lightning -= dt * 3; }
      if (inInterior) sky.setRGB(0.05, 0.05, 0.07);
      this.scene.background = sky;
      this.scene.fog.color.copy(sky);
      const fogFar = inInterior ? 140 : w === 'fog' ? 160 : wet ? 420 : 900;
      this.scene.fog.far = H.lerp(this.scene.fog.far, fogFar, dt); this.scene.fog.near = inInterior ? 60 : w === 'fog' ? 10 : 120;
      this.sun.intensity = (0.12 + df * 0.72) * (cloudy ? 0.55 : 1);
      this.hemi.intensity = 0.26 + df * 0.34 + (inInterior ? 0.3 : 0);
      this.sun.color.setHSL(0.1, 0.6, 0.5 + df * 0.4);
      const lp = sy > -0.1 ? [sx, Math.max(0.15, sy), 0.35] : [-sx, Math.max(0.2, -sy), -0.35];
      this.sun.position.set(camPos.x + lp[0] * 250, camPos.y + lp[1] * 250, camPos.z + lp[2] * 250);
      this.sun.target.position.copy(camPos);
      this.sun.castShadow = !inInterior && H.settings.shadows;
      this.sunDisc.position.set(camPos.x + sx * 1800, camPos.y + sy * 1800, camPos.z + 600); this.sunDisc.lookAt(camPos);
      this.moonDisc.position.set(camPos.x - sx * 1800, camPos.y - sy * 1800, camPos.z - 600); this.moonDisc.lookAt(camPos);
      this.sunDisc.visible = !inInterior && sy > -0.1 && !wet; this.moonDisc.visible = !inInterior && sy < 0.1;
      this.stars.position.copy(camPos); this.stars.material.opacity = inInterior ? 0 : (1 - df) * (cloudy ? 0.2 : 1);
      this.clouds.visible = !inInterior; this.clouds.material.color.setScalar(0.35 + df * 0.65 - (wet ? 0.25 : 0));
      this.clouds.position.x = (this.clouds.position.x + dt * 3) % 400;
      // night glow for windows & lamps
      const glow = 1 - df; for (const m of this.nightLights) m.emissiveIntensity = glow * (m.userData.glowMax || 1);
      // precipitation
      const snowy = camPos.z < -900 || w === 'snow';
      this.rain.visible = wet && !inInterior;
      if (this.rain.visible) {
        this.rain.position.set(camPos.x, camPos.y - 20, camPos.z);
        this.rain.material.color.set(snowy ? 0xffffff : 0xaaccee); this.rain.material.size = snowy ? 0.6 : 0.25;
        const spd = snowy ? 6 : 55;
        for (let i = 0; i < 4000; i++) { let y = this.precip[i * 3 + 1] - spd * dt; if (y < 0) y += 60; this.precip[i * 3 + 1] = y; if (snowy) this.precip[i * 3] += Math.sin(y + i) * dt; }
        this.rain.geometry.attributes.position.needsUpdate = true;
      }
      if (w === 'storm' && !inInterior && Math.random() < dt * 0.12) { this.lightning = 1; setTimeout(() => H.Audio.sfx('thunder', 0.8), 400 + Math.random() * 1500); }
      if (prev < 19.5 && this.time >= 19.5) H.toast && H.toast('🌙 Night falls on Bleatsburg');
      if (prev < 6 && this.time >= 6) H.toast && H.toast('☀️ A new morning');
    },
    clock() { const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; },
  };
})();
