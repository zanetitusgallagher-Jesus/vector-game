// Hoofquake — 250+ generated missions, activities, fishing & cooking minigames, waypoints.
'use strict';
(function () {
  const S = H.SITES; const V = THREE.Vector3;
  const R = H.rng(31337);
  const L = []; // mission list
  const TYPE_INFO = {
    race: ['🏁', 'Race'], delivery: ['📦', 'Delivery'], taxi: ['🚕', 'Taxi'], chaos: ['💥', 'Chaos'], bowlhumans: ['🎳', 'Human Bowling'], scare: ['😱', 'Scare'],
    stunt: ['🤸', 'Stunt'], flips: ['🔄', 'Flips'], soccer: ['⚽', 'Football'], basketball: ['🏀', 'Basketball'], golf: ['⛳', 'Golf'], bowling: ['🎳', 'Bowling'],
    fishing: ['🎣', 'Fishing'], herding: ['🐑', 'Farming'], harvest: ['🎃', 'Farming'], cooking: ['🍳', 'Cooking'], treasure: ['🗺️', 'Treasure Hunt'], parkour: ['🧗', 'Parkour'],
    skate: ['🛹', 'Skate'], obstacle: ['🎪', 'Obstacle Course'], collect: ['⭐', 'Collection'], secret: ['❓', 'Secret'],
  };
  H.TYPE_INFO = TYPE_INFO;
  const gy = (x, z) => H.terrainH(x, z);
  function landPt(cx, cz, r, minH) { for (let i = 0; i < 80; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (gy(x, z) > (minH === undefined ? 1.5 : minH)) return { x, z }; } return { x: cx, z: cz }; }
  function waterPt(cx, cz, r) { for (let i = 0; i < 120; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (gy(x, z) < -3) return { x, z }; } return { x: cx, z: cz + 200 }; }
  let nid = 0;
  function add(type, name, region, x, z, diff, params, reward, extra) {
    L.push(Object.assign({ id: type + '_' + (nid++), type, name, region, x, z, diff, p: params, reward: Math.round(reward * (0.8 + diff * 0.35) / 10) * 10 }, extra || {}));
  }
  const ADJ = ['Turbo', 'Wobbly', 'Midnight', 'Sunday', 'Speedy', 'Bonkers', 'Grand', 'Mini', 'Mega', 'Rusty', 'Golden', 'Sneaky', 'Thunder', 'Breezy', 'Grumpy', 'Lucky'];
  const nm = (a) => R.pick(ADJ) + ' ' + a;

  function roadPath(rd, n, spacing) { const s = rd.samples; const step = Math.max(1, Math.round(spacing / 6)); const start = Math.floor(R() * Math.max(1, s.length - n * step)); const out = []; for (let i = 0; i < n; i++) { const k = Math.min(s.length - 1, start + i * step); out.push({ x: s[k].x, y: s[k].y, z: s[k].z }); } return out; }
  function walkPath(cx, cz, r, n, step, minH) { const out = []; let p = landPt(cx, cz, r * 0.5, minH); for (let i = 0; i < n; i++) { let q; for (let k = 0; k < 30; k++) { const a = R() * 6.28; q = { x: p.x + Math.cos(a) * step, z: p.z + Math.sin(a) * step }; if (Math.hypot(q.x - cx, q.z - cz) < r && gy(q.x, q.z) > (minH === undefined ? 1.5 : minH)) break; } out.push({ x: q.x, y: gy(q.x, q.z), z: q.z }); p = q; } return out; }

  H.generateMissions = function () {
    // --- foot races
    for (const [k, n] of [['city', 4], ['beach', 2], ['forest', 2], ['farm', 1], ['desert', 1], ['mountains', 1], ['jungle', 1]]) for (let i = 0; i < n; i++) {
      const s = S[k], cx = k === 'beach' ? R.range(-900, 700) : s.x, cz = k === 'beach' ? 1010 : s.z, r = k === 'beach' ? 300 : Math.min(s.r, 250);
      const pts = walkPath(cx, cz, r, 6 + i * 2, 45, k === 'beach' ? 0.8 : 1.5); add('race', nm('Dash'), k, pts[0].x, pts[0].z, 1 + (i % 3), { pts: pts.slice(1), mode: 'foot' }, 300);
    }
    // --- vehicle races on roads
    const hws = H.ROADS.filter(r => r.hw && r.samples.length > 30);
    const vrace = (veh, count, label, region) => { for (let i = 0; i < count; i++) { const rd = hws[(i * 3 + veh.length) % hws.length]; const pts = roadPath(rd, 7 + (i % 3) * 2, 70); add('race', nm(label), region || 'roads', pts[0].x, pts[0].z, 1 + (i % 3), { pts: pts.slice(1), mode: 'vehicle', veh }, 450); } };
    vrace('sedan', 6, 'Grand Prix'); vrace('supercar', 4, 'Supercar Sprint'); vrace('pickup', 4, 'Rally'); vrace('moto', 4, 'Moto Run'); vrace('bike', 3, 'Pedal Race');
    for (let i = 0; i < 4; i++) { const t = S.themepark; const pts = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + i; pts.push({ x: t.x + Math.cos(a) * (60 + i * 12), y: 3, z: t.z + Math.sin(a) * (60 + i * 12) }); } add('race', nm('Kart Cup'), 'themepark', t.x - 90, t.z + 60, 1 + (i % 3), { pts: pts.concat([pts[0]]), mode: 'vehicle', veh: 'kart' }, 380); }
    for (let i = 0; i < 6; i++) { const lake = i === 5; const c = lake ? { x: S.lake.x, z: S.lake.z } : { x: R.range(-600, 900), z: 1250 }; const pts = []; let p = lake ? waterPt(c.x, c.z, 60) : waterPt(c.x, c.z, 100); for (let k = 0; k < 7; k++) { const q = lake ? waterPt(c.x, c.z, 80) : waterPt(p.x, p.z + 30, 140); pts.push({ x: q.x, y: 0, z: q.z }); p = q; } add('race', nm('Regatta'), lake ? 'lake' : 'beach', pts[0].x, pts[0].z, 1 + (i % 3), { pts: pts.slice(1), mode: 'vehicle', veh: i % 2 ? 'jetski' : 'speedboat', water: 1 }, 500); }
    for (let i = 0; i < 6; i++) { const reg = R.pick(['city', 'mountains', 'desert', 'beach', 'jungle', 'farm']); const s = S[reg]; const pts = []; for (let k = 0; k < 8; k++) { const q = landPt(s.x === 0 && reg === 'beach' ? R.range(-800, 800) : s.x, reg === 'beach' ? 1000 : s.z, 300, -50); pts.push({ x: q.x, y: Math.max(gy(q.x, q.z), 0) + 40 + R() * 70, z: q.z }); } const st = pts[0]; add('race', nm('Sky Rings'), reg, st.x, st.z, 2 + (i % 2), { pts: pts.slice(1), mode: 'vehicle', veh: i < 4 ? 'heli' : 'plane', air: 1 }, 800); }
    // --- deliveries
    const spots = [...H.SHOPS.map(s => ({ x: s.x, z: s.z + 12, n: s.name })), ...H.PROPERTIES.map(p => ({ x: p.door.x, z: p.door.z, n: p.name })), { x: S.farm.x, z: S.farm.z, n: 'Clover Patch Farm' }, { x: S.village.x, z: S.village.z, n: 'Little Hayfield' }, { x: 900, z: -140, n: 'the airport terminal' }, { x: S.pier.x, z: 1060, n: 'the Old Pier' }, { x: S.golf.x + 70, z: S.golf.z + 95, n: 'the golf clubhouse' }, { x: -1000, z: -690, n: 'the campsite' }, { x: 230, z: -415, n: 'the sports complex' }];
    const goods = ['a suspicious cake', 'grandma\'s teeth', 'a live lobster', '400 rubber bands', 'a very angry parcel', 'artisanal hay', 'a wedding dress', 'a bowling trophy', 'an urgent pizza', 'mystery goo', 'a garden gnome (unrelated)', 'fragile fine china', 'a single sock', 'a karaoke machine'];
    for (let i = 0; i < 30; i++) { const a = R.pick(spots); let b = R.pick(spots); let k = 0; while ((b === a || Math.hypot(a.x - b.x, a.z - b.z) < 120) && k++ < 20) b = R.pick(spots); const d = Math.hypot(a.x - b.x, a.z - b.z); add('delivery', 'Deliver ' + R.pick(goods), 'roads', a.x, a.z, d > 700 ? 3 : d > 350 ? 2 : 1, { to: { x: b.x, z: b.z, n: b.n }, from: a.n, time: Math.round(30 + d / 9) }, 200 + d * 0.6); }
    for (let i = 0; i < 15; i++) { const a = R.pick(spots); let b = R.pick(spots); let k = 0; while ((b === a || Math.hypot(a.x - b.x, a.z - b.z) < 200) && k++ < 20) b = R.pick(spots); const d = Math.hypot(a.x - b.x, a.z - b.z); add('taxi', 'Taxi: ' + R.pick(['a tourist', 'a nervous lawyer', 'a farmer', 'a pop star', 'a chef', 'a lost hiker', 'a mime']) + ' to ' + b.n, 'roads', a.x, a.z, d > 600 ? 3 : 2, { to: { x: b.x, z: b.z, n: b.n }, time: Math.round(25 + d / 14), veh: 'sedan' }, 250 + d * 0.5); }
    // --- chaos & crowd
    const chaosZones = [['city', 0, 0], ['city', -175, 105], ['city', 175, -175], ['industrial', 450, -330], ['industrial', 520, -400], ['mall', 400, 300], ['farm', -900, 500], ['beach', -100, 1010], ['beach', 500, 1010], ['themepark', -270, 520], ['village', -1180, 120], ['airport', 900, -120], ['suburbs', -500, 60], ['stuntpark', 1100, 560], ['sports', 230, -480], ['golf', -600, -720], ['mansions', -660, -380], ['skatepark', 150, 430]];
    chaosZones.forEach(([reg, x, z], i) => add('chaos', nm('Demolition'), reg, x, z, 1 + (i % 3), { n: 10 + (i % 3) * 8, time: 60, r: 45 }, 350));
    const crowd = [['city', 35, 35], ['mall', 400, 310], ['beach', -100, 1015], ['themepark', -270, 530], ['airport', 900, -140], ['sports', 230, -480], ['village', -1180, 120], ['suburbs', -500, 60], ['farm', -900, 520], ['skatepark', 150, 430]];
    crowd.forEach(([reg, x, z], i) => add('bowlhumans', nm('Human Bowling'), reg, x, z, 1 + (i % 3), { n: 5 + (i % 3) * 4, time: 60, r: 70 }, 300));
    crowd.slice(0, 8).forEach(([reg, x, z], i) => add('scare', nm('Fright Night'), reg, x + 10, z + 10, 1 + (i % 3), { n: 8 + (i % 3) * 6, time: 50, r: 70 }, 280));
    // --- stunts
    const stuntSpots = [[S.stuntpark.x, S.stuntpark.z - 50, 'stuntpark', 'moto'], [S.stuntpark.x, S.stuntpark.z - 50, 'stuntpark', 'monster'], [S.stuntpark.x - 20, S.stuntpark.z - 60, 'stuntpark', 'kart'], [S.skatepark.x, S.skatepark.z + 20, 'skatepark', 'bike'], [-660, -250, 'mansions', 'moto'], [0, -700, 'mountains', 'pickup'], [-200, -1000, 'mountains', 'moto'], [1000, 700, 'desert', 'monster'], [1200, 500, 'desert', 'pickup'], [-300, 900, 'beach', 'moto']];
    stuntSpots.forEach(([x, z, reg, veh], i) => add('stunt', nm('Air Time'), reg, x, z, 1 + (i % 3), { air: 4 + (i % 3) * 4, time: 90, veh }, 400));
    stuntSpots.slice(0, 6).forEach(([x, z, reg, veh], i) => add('flips', nm('Flip Fest'), reg, x + 6, z, 1 + (i % 3), { n: 1 + (i % 3), time: 120, veh }, 500));
    // --- sports
    for (let i = 0; i < 4; i++) add('soccer', ['Penalty Practice', 'Goal Rush', 'Football Frenzy', 'Golden Boot'][i], 'sports', H.soccer.x, H.soccer.z - 20, 1 + Math.min(2, i), { n: 1 + i, time: 50 + i * 25 }, 300, i === 3 ? { item: 'body:jersey' } : null);
    for (let i = 0; i < 4; i++) add('basketball', ['Free Throws', 'Hoop Dreams', 'Slam Dunk Contest', 'Buzzer Beater'][i], 'sports', 300, -430, 1 + Math.min(2, i), { n: 1 + i, time: 60 + i * 20 }, 320);
    H.golfHoles.forEach((h, i) => add('golf', `Golf: Hole ${h.n} (Par ${h.par})`, 'golf', h.tee.x, h.tee.z, h.par > 3 ? 2 : 1, { hole: h, time: 150 }, 350));
    for (let i = 0; i < 4; i++) add('bowling', ['Bowling: Gutter Ball Gala', 'Bowling: Strike Night', 'Bowling: Pin Pals', 'Bowling: Perfect Frame'][i], 'sports', H.bowling[i].x0 - 4, H.bowling[i].z, 1 + Math.min(2, i), { lane: i, n: [5, 7, 8, 10][i] }, 300, i === 3 ? { item: 'back:trophy' } : null);
    // --- fishing
    H.fishSpots.forEach((f, i) => { add('fishing', 'Fishing: ' + f.name, 'water', f.x, f.z, 1, { spot: i, n: 3 }, 250); add('fishing', 'Big Catch: ' + f.name, 'water', f.x + 1, f.z, 2, { spot: i, n: 6, rare: 1 }, 400, i === 0 ? { item: 'hat:fishhat' } : null); });
    // --- farming
    for (let i = 0; i < 4; i++) add('herding', ['Sheep Wrangler', 'Woolly Roundup', 'Bleat Patrol', 'The Great Escape'][i], 'farm', H.sheepPen.x + 30, H.sheepPen.z, 1 + Math.min(2, i), { n: 3 + i * 2, time: 120 + i * 30 }, 400);
    for (let i = 0; i < 4; i++) add('harvest', ['Pumpkin Picking', 'Harvest Moon', 'Melon Mayhem', 'Crop Duster'][i], 'farm', S.farm.x + 60, S.farm.z - 120, 1 + Math.min(2, i), { n: 8 + i * 5, time: 70 }, 320);
    // --- cooking
    const kitchens = [[S.village.x - 30, S.village.z + 28, 'village'], [S.city.x + 35, 15, 'city'], [S.themepark.x - 70, S.themepark.z - 105, 'themepark'], [-60, 990, 'beach'], [400, 300, 'mall'], [S.farm.x, S.farm.z - 60, 'farm']];
    const dishes = ['Hay Soufflé', 'Triple-Decker Grass Burger', 'Spicy Sock Stew', 'Rainbow Smoothie', 'Ultimate Pizza', 'Mystery Casserole'];
    kitchens.forEach(([x, z, reg], i) => add('cooking', 'Cook-off: ' + dishes[i], reg, x, z, 1 + (i % 3), { n: 3 + (i % 3), time: 90, r: 80 }, 400, i === 5 ? { item: 'face:chefstache' } : null));
    // --- treasure hunts
    const clues = [['forest', 'Where pines whisper, beneath the stone circle\'s shadow.', -800, -930], ['beach', 'Under the sun, near the umbrellas, where towels lie forgotten.', 300, 1020], ['desert', 'Past the cacti, where the dunes swallow the road.', 1200, 820], ['jungle', 'Below the temple steps, east side.', 1100, -930], ['mountains', 'A goat\'s favourite ledge, high on the slopes.', 200, -1150], ['farm', 'Behind the barn, where hay meets mud.', -860, 410], ['island', 'X marks the palm on Coconut Key.', 660, 1440], ['lake', 'On the shore opposite the dock.', -380, -560], ['golf', 'In the bunker nobody admits to visiting.', -540, -650], ['village', 'Beside the old well, three paces north.', -1180, 100], ['city', 'In the park, near the pond.', -45, -45], ['suburbs', 'A backyard with a pool. Not that one. The other one.', -560, -60], ['mansions', 'Behind the hedges of the biggest mansion.', -720, -470], ['industrial', 'Among the shipping containers.', 390, -390], ['themepark', 'Under the ferris wheel.', -200, 520], ['airport', 'At the far end of the runway.', 1310, -60], ['forest', 'By the giant hollow log.', -1060, -630], ['desert', 'At the oasis, under the third palm.', 1050, 760], ['mountains', 'Near the giant\'s chair, at its feet.', 320, -1180], ['beach', 'At the foot of the lighthouse.', -1230, 1080]];
    clues.forEach(([reg, clue, x, z], i) => { const s = S[reg] || { x, z }; const st = landPt(x + R.range(-120, 120), z + R.range(-120, 120), 20); add('treasure', 'Treasure Map #' + (i + 1), reg, st.x, st.z, 1 + (i % 3), { clue, x: x + R.range(-6, 6), z: z + R.range(-6, 6) }, 500); });
    // --- parkour (rooftops)
    const roofs = H.rooftops.filter(r => Math.abs(r.x) < 290 && Math.abs(r.z) < 290);
    for (let i = 0; i < 14; i++) { let cur = R.pick(roofs); const pts = [{ x: cur.x, y: cur.y, z: cur.z }]; for (let k = 0; k < 5 + (i % 3); k++) { const opts = roofs.filter(r => r !== cur && Math.hypot(r.x - cur.x, r.z - cur.z) < 70 && Math.abs(r.y - cur.y) < 30); if (!opts.length) break; cur = R.pick(opts); pts.push({ x: cur.x, y: cur.y, z: cur.z }); } add('parkour', nm('Rooftop Run'), 'city', pts[0].x, pts[0].z + 30, 1 + (i % 3), { pts, time: 60 + pts.length * 15, roof: 1 }, 450); }
    // --- skate
    for (let i = 0; i < 6; i++) { const s = S.skatepark; const pts = []; for (let k = 0; k < 6; k++) { const a = R() * 6.28; pts.push({ x: s.x + Math.cos(a) * R.range(10, 42), y: 3, z: s.z + Math.sin(a) * R.range(10, 42) }); } add('skate', nm('Skate Session'), 'skatepark', s.x + 20, s.z + 30, 1 + (i % 3), { pts, air: 2 + (i % 3) * 2, time: 90, veh: 'skate' }, 350); }
    // --- obstacle course
    for (let i = 0; i < 5; i++) { const t = S.themepark; const pts = [{ x: t.x, y: 3, z: t.z - 135 }, { x: t.x + 70, y: 3, z: t.z - 30 }, { x: H.coaster.station.x, y: H.coaster.station.y, z: H.coaster.station.z }, { x: t.x - 50, y: 3, z: t.z - 60 }, { x: H.dropTower.x, y: 3, z: H.dropTower.z + 8 }, { x: t.x - 85, y: 3, z: t.z + 65 }]; for (let k = 0; k < i; k++) pts.splice(1 + R.int(0, pts.length - 2), 0, landPt(t.x, t.z, 120)); pts.forEach(p => (p.y = p.y || 3)); add('obstacle', nm('Obstacle Course'), 'themepark', t.x, t.z - 150, 1 + (i % 3), { pts, time: 70 + i * 15 }, 380); }
    // --- collect
    const collZones = ['city', 'farm', 'forest', 'beach', 'desert', 'jungle', 'village', 'suburbs', 'themepark', 'mountains', 'golf', 'industrial', 'mall', 'airport', 'lake', 'mansions'];
    collZones.forEach((k, i) => { const s = S[k]; const cx = k === 'beach' ? R.range(-700, 700) : s.x, cz = k === 'beach' ? 1010 : s.z; add('collect', nm('Star Hunt'), k, cx, cz, 1 + (i % 3), { n: 8 + (i % 3) * 4, r: k === 'mountains' ? 200 : Math.min(160, (s.r || 150)), cx, cz, time: 90 }, 300); });
    // --- secrets (guided)
    add('secret', 'The Mossback', 'forest', -950, -620, 3, { kind: 'mossback' }, 3000, { hint: 'Giant footprints appear in Whispering Pines… but only at night.' });
    add('secret', 'Shed #9', 'industrial', S.lab.x, S.lab.z + 8, 3, { kind: 'lab' }, 2500, { hint: 'The shed in Rustworks needs a keycard. Caves keep secrets.' });
    add('secret', 'Crash Landing', 'desert', S.ufo.x, S.ufo.z - 30, 3, { kind: 'ufo' }, 2500, { hint: 'Five glowing parts lie scattered around the desert crash site.' });
    add('secret', 'Davy Goat\'s Locker', 'beach', -500, 1150, 2, { kind: 'shipwreck' }, 1500, { hint: 'A wreck rests on the sea floor off the west beach. Swimmers that dive can reach it.' });
    add('secret', 'Head in the Clouds', 'city', -45, -10, 2, { kind: 'cloud' }, 1500, { hint: 'There\'s a garden above the city. The park trampoline is VERY bouncy.' });
    add('secret', 'Top of the World', 'mountains', -100, -1000, 2, { kind: 'summit' }, 1500, { hint: 'Climb to the observatory on Grumblepeak.' });
    add('secret', 'Something Is Hatching', 'mountains', S.cave.x, S.cave.z + 12, 2, { kind: 'egg' }, 2000, { hint: 'A huge egg sits in Grumble Cave. It might hatch at night.' });
    H.MISSIONS = L; H.MISSION = {}; L.forEach(m => (H.MISSION[m.id] = m));
    // mission markers as interactables
    for (const m of L) { m.y = H.groundAt(m.x, m.z, 999); m.ia = H.addInteract({ x: m.x, y: m.y, z: m.z, r: 4, label: TYPE_INFO[m.type][0] + ' ' + m.name, kind: 'mission', mission: m }); }
  };

  // ---------------- beacons ----------------
  const beacons = []; let targetBeacon, ringMeshes = [];
  function beaconMat(c, o) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide }); }
  H.initBeacons = function () {
    const geo = new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true);
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(geo, beaconMat('#ffd21a', 0.22)); m.visible = false; H.scene.add(m); beacons.push(m); }
    targetBeacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 400, 16, 1, true), beaconMat('#2affd0', 0.25)); targetBeacon.visible = false; H.scene.add(targetBeacon);
  };
  H.updateBeacons = function () {
    const p = H.players[0]; const A = H.missions.active;
    if (A) { beacons.forEach(b => (b.visible = false)); }
    else {
      const near = []; for (const m of H.MISSIONS) { if (p.interior) break; const d = H.dist2(m.x, m.z, p.pos.x, p.pos.z); if (d < 220 * 220) near.push([d, m]); }
      near.sort((a, b) => a[0] - b[0]);
      beacons.forEach((b, i) => { const e = near[i]; if (!e) { b.visible = false; return; } const m = e[1]; b.visible = true; b.position.set(m.x, m.y + 30, m.z); b.material.color.set(H.state.missions[m.id] ? '#9aa0a8' : m.type === 'secret' ? '#b673ff' : '#ffd21a'); });
    }
    const w = H.waypoint; targetBeacon.visible = !!w && !p.interior;
    if (w) { targetBeacon.position.set(w.x, (w.y !== undefined ? w.y : H.groundAt(w.x, w.z, 999)) + 200, w.z); }
  };

  // ---------------- runtime ----------------
  H.missions = {
    active: null,
    activeIs(kind) { return this.active && this.active.m.type === 'secret' && this.active.m.p.kind === kind; },
    offer(m) { H.ui.missionOffer(m); },
    start(m) {
      if (this.active) this.fail('Switched missions');
      const p = H.players[0]; if (p.vehicle && !m.p.veh) p.vehicle.exit(p);
      const A = this.active = { m, t: m.p.time || 0, timed: !!m.p.time, prog: 0, cp: 0, objs: [], props: [], npcs: [], text: '', p };
      H.Audio.sfx('checkpoint'); H.ui.banner(TYPE_INFO[m.type][0] + ' ' + m.name, missionBrief(m));
      if (m.p.veh) { const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); let x = m.x + fx * 6, z = m.z + fz * 6; if (m.p.water) { x = m.p.pts[0].x - 20; z = m.p.pts[0].z - 20; if (gy(x, z) > -1) { x = m.p.pts[0].x; z = m.p.pts[0].z; } } const v = new H.Vehicle(H.VEHICLE[m.p.veh], x, z, p.yaw); if (m.p.air) { v.pos.y = Math.max(gy(x, z), 0) + (m.p.veh === 'heli' ? 30 : 60); if (m.p.veh === 'plane') v.spd = v.maxSpd * 0.7; } if (p.vehicle) p.vehicle.exit(p); v.enter(p); A.veh = v; }
      setup[m.type] && setup[m.type](A, m);
      H.ui.missionHud(A); H.Net && H.Net.setMission(m.id);
    },
    complete(extraText) {
      const A = this.active; if (!A) return; const m = A.m; this.cleanup(); H.Net && H.Net.online && H.Net.event('done', m.id);
      const frac = A.timed && m.p.time ? A.t / m.p.time : 0.5, stars = A.stars || (frac > 0.5 ? 3 : frac > 0.25 ? 2 : 1);
      const first = !H.state.missions[m.id]; const coins = Math.round(m.reward * (first ? 1 : 0.3) * (0.6 + stars * 0.2));
      H.state.missions[m.id] = Math.max(H.state.missions[m.id] || 0, stars); H.stat('missionsDone', 1);
      H.Audio.sfx('win'); H.addCoins(coins, 'Mission complete'); H.addXP && H.addXP(Math.round(m.reward / 5) * (first ? 1 : 0.3), H.players[0].pos);
      H.ui.banner('✅ ' + m.name, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${H.fmt(coins)} coins${extraText ? ' · ' + extraText : ''}`);
      if (first && m.item) H.grantCosmetic(m.item);
      if (first && !m.item && R() < 0.2) { const pool = H.COSMETICS.filter(x => x.src === 'shop' && x.rar >= 1 && x.rar <= 3 && !H.state.cos[x.id]); if (pool.length) H.grantCosmetic(H.pick(pool).id); }
      // category completion bonuses
      const done = t => H.MISSIONS.filter(x => x.type === t).every(x => H.state.missions[x.id]);
      if (first && m.type === 'race' && H.MISSIONS.filter(x => x.type === 'race' && x.p.mode === 'vehicle' && H.state.missions[x.id]).length >= 10) H.grantCosmetic('hat:racehelmet');
      if (first && done(m.type)) { H.ui.banner('🏅 Category cleared: ' + TYPE_INFO[m.type][1], '+5,000 coins'); H.state.coins += 5000; }
      const pl = H.players[0]; pl.emote = { id: 'victory', t: 0 };
      H.dirty(true); H.checkAch(); H.ui.missionHud(null);
    },
    fail(why) { const A = this.active; if (!A) return; this.cleanup(); H.Audio.sfx('fail'); H.ui.banner('❌ Mission failed', why || 'Out of time'); H.ui.missionHud(null); },
    cleanup() {
      const A = this.active; if (!A) return; this.active = null; H.Net && H.Net.setMission(0); H.waypoint = A.prevWaypoint || null;
      A.objs.forEach(o => H.scene.remove(o)); A.props.forEach(p => { if (H.props.includes(p)) H.removeProp(p); }); A.npcs.forEach(n => (n.gone = true)); (A.pickups || []).forEach(pk => H.removePickup(pk));
      if (A.veh) { const v = A.veh; setTimeout(() => { if (!v.driver) v.remove(); else { v.owned = false; v.missionLeft = true; } }, 400); }
      if (A.carry) A.p.root.remove(A.carry); if (A.cleanupFn) A.cleanupFn();
    },
    update(dt) {
      const A = this.active; if (!A) return;
      if (A.timed) { A.t -= dt; if (A.t <= 0) return this.fail('Out of time!'); }
      const fn = tick[A.m.type]; if (fn) fn(A, dt);
      if (this.active) H.ui.missionHud(A);
    },
  };
  function missionBrief(m) {
    const p = m.p;
    switch (m.type) {
      case 'race': return `Hit ${p.pts.length} checkpoints${p.veh ? ' in the ' + H.VEHICLE[p.veh].name : ''} before time runs out.`;
      case 'delivery': return `Carry the package from ${p.from} to ${p.to.n}. Don't ragdoll — you'll drop it!`;
      case 'taxi': return `Drive your passenger to ${p.to.n}. Crashing hurts your tip.`;
      case 'chaos': return `Break ${p.n} objects in the zone.`;
      case 'bowlhumans': return `Ragdoll ${p.n} people.`; case 'scare': return `Scare ${p.n} people with your special or by charging at them.`;
      case 'stunt': return `Get ${p.air} seconds of total air time.`; case 'flips': return `Land ${p.n} flip(s) — tilt with W/S in the air.`;
      case 'soccer': return `Headbutt the ball into either goal ${p.n} time(s).`; case 'basketball': return `Get the ball through a hoop ${p.n} time(s). Jump + headbutt upward!`;
      case 'golf': return `Headbutt the golf ball into the hole. Par ${p.hole.par}.`; case 'bowling': return `Two throws. Knock down at least ${p.n} pins with the ball.`;
      case 'fishing': return `Catch ${p.n} fish here.`; case 'herding': return `Chase ${p.n} sheep into the pen (bark and charge to steer them).`;
      case 'harvest': return `Smash ${p.n} crops in the field.`; case 'cooking': return `Find ${p.n} ingredients nearby, bring them to the stove, then nail the timing.`;
      case 'treasure': return `Clue: "${p.clue}" Follow the hot/cold meter.`; case 'parkour': return `Reach every rooftop checkpoint.`;
      case 'skate': return `Hit the skatepark checkpoints and get ${p.air}s of air.`; case 'obstacle': return `Run the Wobbleland course.`;
      case 'collect': return `Collect ${p.n} stars in the area.`; case 'secret': return m.hint;
    }
    return '';
  }
  H.missionBrief = missionBrief;
  function cpMesh(A, pt, air) {
    const m = air ? new THREE.Mesh(new THREE.TorusGeometry(10, 0.8, 8, 32), new THREE.MeshBasicMaterial({ color: '#2affd0' })) : new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 6, 24, 1, true), beaconMat('#2affd0', 0.45));
    m.position.set(pt.x, (pt.y !== undefined ? pt.y : gy(pt.x, pt.z)) + (air ? 0 : 3), pt.z); H.scene.add(m); A.objs.push(m); return m;
  }
  function checkpoints(A, pts, air) {
    A.pts = pts; A.cp = 0; A.cpm = pts.map(p => { const m = cpMesh(A, p, air); m.visible = false; return m; });
    const show = () => { A.cpm.forEach((m, i) => { m.visible = i === A.cp || i === A.cp + 1; m.material.opacity = i === A.cp ? 0.55 : 0.18; if (air) m.lookAt(H.players[0].pos); }); const c = pts[A.cp]; if (c) H.waypoint = { x: c.x, z: c.z, y: c.y, label: 'Checkpoint ' + (A.cp + 1) + '/' + pts.length }; };
    A.showCp = show; show();
  }
  function cpTick(A, rad) {
    const p = A.p, c = A.pts[A.cp]; if (!c) return true;
    const pos = p.vehicle ? p.vehicle.pos : p.pos; const dy = Math.abs(pos.y - (c.y !== undefined ? c.y : pos.y));
    if (H.dist2(pos.x, pos.z, c.x, c.z) < rad * rad && dy < (A.m.p.air ? 12 : 10)) { A.cp++; H.Audio.sfx('checkpoint'); if (A.timed && A.m.type === 'race') A.t += 2; A.showCp(); if (A.air) A.cpm.forEach(m => m.lookAt(pos)); }
    A.text = `Checkpoint ${Math.min(A.cp + 1, A.pts.length)} / ${A.pts.length}`; return A.cp >= A.pts.length;
  }
  function zoneRing(A, x, z, r, col) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4, 48, 1, true), beaconMat(col || '#ff4ab0', 0.15)); m.position.set(x, gy(x, z) + 2, z); H.scene.add(m); A.objs.push(m); }

  const setup = {
    race(A, m) { A.air = m.p.air; checkpoints(A, m.p.pts, m.p.air); if (!m.p.time) { let d = 0, prev = { x: m.x, z: m.z }; for (const q of m.p.pts) { d += Math.hypot(q.x - prev.x, q.z - prev.z); prev = q; } const spd = m.p.mode === 'foot' ? 9 : (H.VEHICLE[m.p.veh].spd * 0.55); A.t = A.max = Math.round(d / spd + 15 - m.diff * 3); A.timed = true; m.p.time = A.t; } },
    delivery(A, m) { A.t = m.p.time; A.timed = true; A.carry = H.mesh('box', '#c89a5a', 1.2, 1, 1.2, 0, A.p.height + 0.4, 0); A.p.root.add(A.carry); H.waypoint = { x: m.p.to.x, z: m.p.to.z, label: m.p.to.n }; zoneRing(A, m.p.to.x, m.p.to.z, 6, '#2affd0'); A.has = true; },
    taxi(A, m) { A.t = m.p.time; A.timed = true; H.waypoint = { x: m.p.to.x, z: m.p.to.z, label: m.p.to.n }; zoneRing(A, m.p.to.x, m.p.to.z, 8, '#ffd21a'); A.tip = 1; A.onCrash = () => { A.tip = Math.max(0.2, A.tip - 0.25); H.toast('😬 Passenger: "Is that how you drive?!"'); }; H.on('exitVehicle', (p) => { if (H.missions.active === A && p === A.p) A.outT = 0; }); },
    chaos(A, m) { A.t = m.p.time; A.timed = true; zoneRing(A, m.x, m.z, m.p.r); for (let i = 0; i < m.p.n + 6; i++) { const q = landPt(m.x, m.z, m.p.r * 0.8, -1); const p = H.spawnProp(R.pick(['crate', 'crate', 'barrel', 'explosive', 'watermelon', 'trash', 'hay']), q.x, null, q.z, { mission: 1 }); A.props.push(p); } A.cnt = 0; A.h = (p, by) => { if (H.dist2(p.pos.x, p.pos.z, m.x, m.z) < m.p.r * m.p.r * 1.3) A.cnt++; }; H.on('propBroken', (p, by) => H.missions.active === A && A.h(p, by)); H.waypoint = { x: m.x, z: m.z, label: 'Chaos zone' }; },
    bowlhumans(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; zoneRing(A, m.x, m.z, m.p.r, '#ff8a1a'); H.on('npcHit', (n, by) => { if (H.missions.active === A && n.isHuman) A.cnt++; }); for (let i = 0; i < m.p.n + 4; i++) { const n = H.NPCs.add({ x: m.x, z: m.z, r: m.p.r * 0.6, type: 'tourist', temp: 1 }); A.npcs.push(n); } },
    scare(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; A.seen = new Set(); zoneRing(A, m.x, m.z, m.p.r, '#b673ff'); H.on('scared', (n, by) => { if (H.missions.active === A && n.isHuman && !A.seen.has(n)) { A.seen.add(n); A.cnt++; } }); for (let i = 0; i < m.p.n; i++) A.npcs.push(H.NPCs.add({ x: m.x, z: m.z, r: m.p.r * 0.6, type: 'ped', temp: 1 })); },
    stunt(A, m) { A.t = m.p.time; A.timed = true; A.airT = 0; H.on('vehicleAir', (p, v, dt) => { if (H.missions.active === A) A.airT += dt; }); },
    flips(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; H.on('vehicleLand', (p, v, air, flip) => { if (H.missions.active === A && Math.abs(flip) > 5.2) { A.cnt += Math.floor(Math.abs(flip) / 6.28 + 0.2); H.floatText('FLIP!', v.pos, { cls: 'big' }); } }); },
    soccer(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; A.ball = H.spawnProp('soccer', H.soccer.x, null, H.soccer.z, { mission: 1 }); A.props.push(A.ball); H.waypoint = { x: H.soccer.x, z: H.soccer.z, label: 'Ball' }; },
    basketball(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; A.ball = H.spawnProp('basketball', 300, null, -436, { mission: 1 }); A.props.push(A.ball); A.prevY = A.ball.pos.y; },
    golf(A, m) { const h = m.p.hole; A.t = m.p.time; A.timed = true; A.hits = 0; A.ball = H.spawnProp('golf', h.tee.x, null, h.tee.z, { mission: 1 }); A.props.push(A.ball); H.waypoint = { x: h.hole.x, z: h.hole.z, label: 'Hole ' + h.n }; zoneRing(A, h.hole.x, h.hole.z, 1.5, '#ffffff'); H.on('golfHit', () => { if (H.missions.active === A) A.hits++; }); },
    bowling(A, m) {
      const ln = H.bowling[m.p.lane]; A.ln = ln; A.throws = 0; A.pins = [];
      const setPins = () => { A.pins.forEach(p => { if (H.props.includes(p)) H.removeProp(p); }); A.pins = []; let k = 0; for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) { const px = ln.x1 - 4 + row * 1.0, pz = ln.z + (i - row / 2) * 0.9; const p = H.spawnProp('pin', px, 3.6, pz, { mission: 1 }); p.origin = { x: px, z: pz }; A.pins.push(p); A.props.push(p); k++; } };
      setPins(); A.reset = () => { if (A.ball && H.props.includes(A.ball)) H.removeProp(A.ball); A.ball = H.spawnProp('bowling', ln.x0 + 1, null, ln.z, { mission: 1 }); A.props.push(A.ball); A.rollT = 0; };
      A.reset(); A.best = 0; H.waypoint = { x: ln.x0, z: ln.z, label: 'Lane ' + (m.p.lane + 1) };
    },
    fishing(A, m) { A.cnt = 0; A.spot = H.fishSpots[m.p.spot]; H.waypoint = { x: A.spot.x, z: A.spot.z, label: A.spot.name }; H.on('fishCaught', (f) => { if (H.missions.active === A && (!m.p.rare || f.rar >= 1)) A.cnt++; }); },
    herding(A, m) { A.t = m.p.time; A.timed = true; const pen = H.sheepPen; for (let i = 0; i < m.p.n + 2; i++) { const n = H.NPCs.add({ x: pen.x + 40 + R.range(-15, 15), z: pen.z + R.range(-25, 25), r: 2, type: 'sheep', temp: 1 }); n.materialize(); A.npcs.push(n); } zoneRing(A, pen.x, pen.z, pen.r, '#2affd0'); H.waypoint = { x: pen.x, z: pen.z, label: 'Sheep pen' }; },
    harvest(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; for (let i = 0; i < m.p.n + 6; i++) { const p = H.spawnProp(R() < 0.6 ? 'pumpkin' : 'watermelon', m.x + R.range(-40, 40), null, m.z + 40 + R.range(-30, 30), { mission: 1 }); A.props.push(p); } H.on('cropCollected', (p) => { if (H.missions.active === A) A.cnt++; }); zoneRing(A, m.x, m.z + 40, 50, '#ffd21a'); },
    cooking(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; A.pickups = []; for (let i = 0; i < m.p.n; i++) { const q = landPt(m.x, m.z, m.p.r, 1); A.pickups.push(H.addPickup('ingredient', q.x, H.groundAt(q.x, q.z, 999), q.z, () => { A.cnt++; H.Audio.sfx('coin'); H.toast(`🥕 Ingredient ${A.cnt}/${m.p.n}`); })); } zoneRing(A, m.x, m.z, 3, '#ff7a3a'); },
    treasure(A, m) { A.dig = { x: m.p.x, z: m.p.z }; A.text = 'Search… (follow the meter)'; },
    parkour(A, m) { A.t = m.p.time; A.timed = true; checkpoints(A, m.p.pts.map(p => ({ x: p.x, y: p.y, z: p.z }))); },
    skate(A, m) { A.t = m.p.time; A.timed = true; A.airT = 0; checkpoints(A, m.p.pts); H.on('vehicleAir', (p, v, dt) => { if (H.missions.active === A) A.airT += dt; }); },
    obstacle(A, m) { A.t = m.p.time; A.timed = true; checkpoints(A, m.p.pts); },
    collect(A, m) { A.t = m.p.time; A.timed = true; A.cnt = 0; A.pickups = []; for (let i = 0; i < m.p.n; i++) { const q = landPt(m.p.cx, m.p.cz, m.p.r, 0.5); A.pickups.push(H.addPickup('star', q.x, H.groundAt(q.x, q.z, 999) + 0.5, q.z, () => { A.cnt++; H.Audio.sfx('coin'); })); } zoneRing(A, m.p.cx, m.p.cz, m.p.r, '#ffd21a'); },
    secret(A, m) {
      const k = m.p.kind;
      if (k === 'mossback') { A.steps = []; const r2 = H.rng(77); let x = -950, z = -650; for (let i = 0; i < 7; i++) { x += r2.range(-40, 10); z += r2.range(-50, -20); A.steps.push({ x, z }); } A.steps.push({ x: -1100, z: -850 }); A.i = 0; A.step = () => { const s = A.steps[A.i]; if (!s) return; const fp = H.mesh('box', '#3a2a1a', 1.6, 0.1, 3, s.x, gy(s.x, s.z) + 0.05, s.z); H.scene.add(fp); A.objs.push(fp); H.waypoint = { x: s.x, z: s.z, label: 'Footprints' }; }; A.step(); }
      if (k === 'lab') H.waypoint = H.state.cos['neck:keycard'] ? { x: S.lab.x, z: S.lab.z + 5, label: 'Shed #9' } : { x: S.cave.x, z: S.cave.z + 6, label: 'Grumble Cave' };
      if (k === 'ufo') H.waypoint = { x: S.ufo.x, z: S.ufo.z, label: 'Crash Site' };
      if (k === 'shipwreck') H.waypoint = { x: H.shipwreck.x, z: H.shipwreck.z, label: 'Shipwreck' };
      if (k === 'cloud') H.waypoint = { x: -45, z: -20, label: 'Park trampoline' };
      if (k === 'summit') H.waypoint = { x: H.summit.x, z: H.summit.z, y: H.summit.y, label: 'Summit' };
      if (k === 'egg') H.waypoint = { x: S.cave.x, z: S.cave.z + 6, label: 'Grumble Cave' };
    },
  };
  const tick = {
    race(A) { if (cpTick(A, A.m.p.air ? 11 : A.m.p.mode === 'foot' ? 5 : 8)) H.missions.complete(); },
    parkour(A) { if (cpTick(A, 6)) H.missions.complete(); },
    obstacle(A) { if (cpTick(A, 6)) H.missions.complete(); },
    skate(A) { const done = cpTick(A, 6); A.text += ` · Air ${A.airT.toFixed(1)}/${A.m.p.air}s`; if (done && A.airT >= A.m.p.air) H.missions.complete(); },
    delivery(A) {
      const p = A.p, m = A.m;
      if (A.has && p.ragdoll && !A.dropped) { A.has = false; p.root.remove(A.carry); const pk = H.spawnProp('package', p.pos.x, p.pos.y + 2, p.pos.z, { mission: 1 }); pk.vel.set(p.vel.x, 6, p.vel.z); H.wakeProp(pk); A.props.push(pk); A.pkg = pk; H.toast('📦 You dropped the package! Go get it.'); H.waypoint = { x: pk.pos.x, z: pk.pos.z, label: 'Package' }; }
      if (!A.has && A.pkg && !p.ragdoll && H.dist2(p.pos.x, p.pos.z, A.pkg.pos.x, A.pkg.pos.z) < 9) { A.has = true; if (A.pkg.held) A.pkg.held.drop(); H.removeProp(A.pkg); A.pkg = null; p.root.add(A.carry); H.waypoint = { x: m.p.to.x, z: m.p.to.z, label: m.p.to.n }; H.Audio.sfx('click'); }
      if (A.pkg) H.waypoint = { x: A.pkg.pos.x, z: A.pkg.pos.z, label: 'Package' };
      const pos = p.vehicle ? p.vehicle.pos : p.pos; const d = Math.hypot(pos.x - m.p.to.x, pos.z - m.p.to.z);
      A.text = A.has ? `Deliver to ${m.p.to.n} · ${Math.round(d)} m` : 'Pick the package back up!';
      if (A.has && d < 7) H.missions.complete();
    },
    taxi(A) {
      const p = A.p, m = A.m; if (!p.vehicle) { A.outT = (A.outT || 0) + 1 / 60; A.text = 'Get back in the car!'; if (A.outT > 12) H.missions.fail('Your passenger left.'); return; } A.outT = 0;
      if (p.vehicle && Math.abs(p.vehicle.spd) < 4 && A.lastSpd > 25) A.onCrash(); A.lastSpd = Math.abs(p.vehicle.spd);
      const d = Math.hypot(p.vehicle.pos.x - m.p.to.x, p.vehicle.pos.z - m.p.to.z); A.text = `To ${m.p.to.n} · ${Math.round(d)} m · Tip ${Math.round(A.tip * 100)}%`;
      if (d < 9 && Math.abs(p.vehicle.spd) < 6) { const tip = Math.round(m.reward * 0.5 * A.tip); H.addCoins(tip, 'Tip'); H.missions.complete('Tip ' + H.fmt(tip)); }
    },
    chaos(A) { A.text = `Destroyed ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    bowlhumans(A) { A.text = `Ragdolled ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    scare(A) { A.text = `Scared ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    stunt(A) { A.text = `Air time ${A.airT.toFixed(1)} / ${A.m.p.air}s`; if (!A.p.vehicle) A.text += ' (get in a vehicle!)'; if (A.airT >= A.m.p.air) H.missions.complete(); },
    flips(A) { A.text = `Flips ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    soccer(A) {
      const b = A.ball; if (!b || !H.props.includes(b)) { A.ball = H.spawnProp('soccer', H.soccer.x, null, H.soccer.z, { mission: 1 }); A.props.push(A.ball); return; }
      for (const g of H.soccer.goals) if (Math.abs(b.pos.z - g.z) < 6 && (g.dir > 0 ? b.pos.x > g.x : b.pos.x < g.x) && b.pos.y < 7.5) { A.cnt++; H.Audio.sfx('win'); H.floatText('GOAL!', b.pos, { cls: 'big' }); H.fx.burst(b.pos.x, b.pos.y + 1, b.pos.z, new THREE.Color('#ffd21a'), 40, 8, 0.3); b.pos.set(H.soccer.x, 4, H.soccer.z); b.vel.set(0, 0, 0); break; }
      if (Math.abs(b.pos.x - H.soccer.x) > 70 || Math.abs(b.pos.z - H.soccer.z) > 50) { b.pos.set(H.soccer.x, 4, H.soccer.z); b.vel.set(0, 0, 0); H.toast('Ball out of play — reset.'); }
      H.waypoint = { x: b.pos.x, z: b.pos.z, label: 'Ball' };
      A.text = `Goals ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete();
    },
    basketball(A) {
      const b = A.ball; if (!H.props.includes(b)) { setup.basketball(A, A.m); return; }
      for (const h of H.hoops) { if (H.dist2(b.pos.x, b.pos.z, h.x, h.z) < 1.4 && A.prevY > h.y && b.pos.y <= h.y + 0.2) { A.cnt++; H.Audio.sfx('win'); H.floatText('SWISH!', b.pos, { cls: 'big' }); } }
      A.prevY = b.pos.y; if (H.dist2(b.pos.x, b.pos.z, 300, -440) > 40 * 40) { b.pos.set(300, 5, -436); b.vel.set(0, 0, 0); }
      A.text = `Baskets ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete();
    },
    golf(A) {
      const b = A.ball, h = A.m.p.hole; if (!H.props.includes(b)) { A.ball = H.spawnProp('golf', h.tee.x, null, h.tee.z, { mission: 1 }); A.props.push(A.ball); return; }
      if (b.lastHit && !b.counted && b.vel.lengthSq() > 4) { b.counted = true; A.hits++; H.Audio.sfx('bonk'); } if (b.vel.lengthSq() < 0.5) b.counted = false;
      const d = Math.hypot(b.pos.x - h.hole.x, b.pos.z - h.hole.z); A.text = `Strokes ${A.hits} · Par ${h.par} · ${d.toFixed(0)} m to hole`;
      if (d < 1.3 && b.vel.lengthSq() < 30) { A.stars = A.hits <= h.par - 1 ? 3 : A.hits <= h.par ? 3 : A.hits <= h.par + 2 ? 2 : 1; H.removeProp(b); H.missions.complete(A.hits === 1 ? 'HOLE IN ONE!' : A.hits < h.par ? 'Birdie!' : A.hits === h.par ? 'Par' : 'Bogey'); }
      if (A.hits > h.par + 5) H.missions.fail('Too many strokes');
    },
    bowling(A) {
      const ln = A.ln, b = A.ball; const knocked = A.pins.filter(p => !H.props.includes(p) || p.tipped || Math.hypot(p.pos.x - p.origin.x, p.pos.z - p.origin.z) > 0.6).length;
      A.text = `Throw ${Math.min(2, A.throws + 1)}/2 · Pins down ${knocked}/10 (need ${A.m.p.n})`;
      if (b && b.pos.x > ln.x0 + 4 && b.vel.lengthSq() > 4) A.rolling = true;
      if (A.rolling) { A.rollT += 1 / 60; if (A.rollT > 5 || (b && b.pos.x > ln.x1 + 1) || (b && b.vel.lengthSq() < 0.5)) { A.rolling = false; A.throws++; if (knocked >= 10) { A.stars = A.throws === 1 ? 3 : 2; H.floatText(A.throws === 1 ? 'STRIKE!' : 'SPARE!', H.players[0].pos, { cls: 'big' }); return H.missions.complete(); } if (A.throws >= 2) { if (knocked >= A.m.p.n) { A.stars = knocked >= 9 ? 2 : 1; H.missions.complete(knocked + ' pins'); } else H.missions.fail(`Only ${knocked} pins`); } else A.reset(); } }
    },
    fishing(A) { A.text = `Fish caught ${A.cnt}/${A.m.p.n}${A.m.p.rare ? ' (uncommon or better)' : ''} — stand at the spot and press Interact`; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    herding(A) { const pen = H.sheepPen; const n = A.npcs.filter(s => s.active && H.dist2(s.pos.x, s.pos.z, pen.x, pen.z) < (pen.r - 1) ** 2).length; A.text = `Sheep in pen ${n}/${A.m.p.n}`; if (n >= A.m.p.n) H.missions.complete(); },
    harvest(A) { A.text = `Crops ${A.cnt}/${A.m.p.n}`; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    cooking(A) {
      const m = A.m; if (A.cooking) return; A.text = A.cnt < m.p.n ? `Ingredients ${A.cnt}/${m.p.n}` : 'Bring them to the stove!';
      H.waypoint = A.cnt < m.p.n && A.pickups.length ? (() => { const live = A.pickups.filter(pk => H.pickups.includes(pk)); const pk = live[0]; return pk ? { x: pk.x, z: pk.z, label: 'Ingredient' } : null; })() : { x: m.x, z: m.z, label: 'Stove' };
      if (A.cnt >= m.p.n && H.dist2(A.p.pos.x, A.p.pos.z, m.x, m.z) < 25) { A.cooking = true; A.timed = false; H.ui.cookingGame((score) => { A.stars = score; H.missions.complete(['', 'Edible', 'Tasty!', 'Chef\'s kiss!'][score]); }); }
    },
    treasure(A) {
      const p = A.p, d = Math.hypot(p.pos.x - A.dig.x, p.pos.z - A.dig.z); const prev = A.prevD || d; A.prevD = d;
      const heat = d < 8 ? 'BURNING HOT 🔥' : d < 25 ? 'Hot!' : d < 60 ? 'Warm' : d < 150 ? 'Cool' : 'Freezing ❄️';
      A.text = `"${A.m.p.clue}" · ${heat}`; A.heat = H.clamp(1 - d / 200, 0, 1);
      const reveal = p.def.stats.dig ? 10 : 4;
      if (d < reveal && !A.marker) { A.marker = H.buildCollectible('dig'); A.marker.position.set(A.dig.x, gy(A.dig.x, A.dig.z) + 0.05, A.dig.z); H.scene.add(A.marker); A.objs.push(A.marker); H.toast('Something is buried here! Press Interact to dig.'); A.ia = H.addInteract({ x: A.dig.x, y: gy(A.dig.x, A.dig.z), z: A.dig.z, r: 4, label: 'Dig here', kind: 'custom', fn: () => { if (H.missions.active !== A) return; H.Audio.sfx('dig'); A.ia.hidden = true; H.fx.burst(A.dig.x, gy(A.dig.x, A.dig.z), A.dig.z, new THREE.Color('#8a6a4a'), 30, 6, 0.4); const loot = 400 + A.m.diff * 400; H.addCoins(loot, 'Buried treasure'); if (R() < 0.5) { const pool = H.COSMETICS.filter(x => (x.src === 'shop' || x.src === 'chests') && x.rar >= 2 && !H.state.cos[x.id]); if (pool.length) H.grantCosmetic(H.pick(pool).id); } H.missions.complete(); } }); A.cleanupFn = () => { A.ia.hidden = true; }; }
    },
    collect(A) { A.text = `Stars ${A.cnt}/${A.m.p.n}`; const live = A.pickups.filter(pk => H.pickups.includes(pk)); let best = null, bd = 1e12; for (const pk of live) { const d = H.dist2(pk.x, pk.z, A.p.pos.x, A.p.pos.z); if (d < bd) { bd = d; best = pk; } } if (best) H.waypoint = { x: best.x, z: best.z, label: 'Star' }; if (A.cnt >= A.m.p.n) H.missions.complete(); },
    secret(A) {
      const k = A.m.p.kind, p = A.p;
      if (k === 'mossback') {
        if (!H.Sky.isNight()) { A.text = 'Come back at night (rest at a property or use Settings → Time).'; return; }
        const s = A.steps[A.i]; if (!s) return; A.text = `Follow the footprints (${A.i + 1}/${A.steps.length})`;
        if (H.dist2(p.pos.x, p.pos.z, s.x, s.z) < 64) { A.i++; H.Audio.sfx('checkpoint'); if (A.i >= A.steps.length) { H.Audio.voice(['grunt', 70]); H.grantAnimal('mossback'); H.grantCosmetic('face:mossmask', true); H.grantCosmetic('trail:footprints', true); H.missions.complete('You befriended the Mossback!'); } else A.step(); }
      }
      if (k === 'lab') { A.text = H.state.animals.mutant ? 'Done!' : H.state.cos['neck:keycard'] ? 'Use the keycard on Shed #9, then free the specimen.' : 'Find the keycard in Grumble Cave.'; if (H.state.animals.mutant) H.missions.complete(); }
      if (k === 'ufo') { const n = Object.keys(H.state.found).filter(x => x.startsWith('ufopart')).length; A.text = `UFO parts ${n}/5`; const next = H.collectibles.find(c => c.type === 'ufopart' && !H.state.found[c.id]); if (next) H.waypoint = { x: next.x, z: next.z, label: 'UFO part' }; if (n >= 5) H.missions.complete(); }
      if (k === 'shipwreck') { A.text = 'Dive to the wreck (swimmers with Dive: hold Descend).'; if (H.state.secrets.shipwreck) H.missions.complete(); }
      if (k === 'cloud') { A.text = 'Bounce up to the Cloud Garden.'; if (H.state.secrets.cloud) H.missions.complete(); }
      if (k === 'summit') { A.text = 'Reach the top of Grumblepeak.'; if (H.state.secrets.summit) H.missions.complete(); }
      if (k === 'egg') { A.text = H.Sky.isNight() ? 'Visit the egg in Grumble Cave now!' : 'Wait for night, then visit the egg.'; if (H.state.animals.babyraptor) H.missions.complete(); }
    },
  };
  // golf stroke counting: any player attack that moves the golf ball emits golfHit via lastHit tracking in tick

  // ---------------- fishing ----------------
  H.missions.startFishing = function (p, spot) {
    if (H.fishing) return; p.vel.set(0, 0, 0);
    const pool = spot.pool.map(i => H.FISH[i]);
    H.fishing = { p, spot, phase: 'wait', t: 1 + Math.random() * 3, pos: 0.5, fish: 0.5, fv: 0, prog: 0.3, pool };
    H.ui.fishing(H.fishing); H.Audio.sfx('swoosh');
  };
  H.updateFishing = function (dt, hold) {
    const F = H.fishing; if (!F) return;
    if (F.phase === 'wait') { F.t -= dt; if (F.t <= 0) { F.phase = 'bite'; F.t = 1.2; H.Audio.sfx('ding'); } }
    else if (F.phase === 'bite') { F.t -= dt; if (hold) { F.phase = 'reel'; const wts = F.pool.map(f => [1, 0.6, 0.35, 0.18, 0.08, 0.03][f.rar]); let tot = wts.reduce((a, b) => a + b, 0), r = Math.random() * tot; F.catch = F.pool[0]; for (let i = 0; i < F.pool.length; i++) { r -= wts[i]; if (r <= 0) { F.catch = F.pool[i]; break; } } F.diff = 0.6 + F.catch.rar * 0.35; } else if (F.t <= 0) { F.phase = 'wait'; F.t = 2 + Math.random() * 3; H.toast('Too slow — it got away.'); } }
    else if (F.phase === 'reel') {
      F.fv += (Math.random() - 0.5) * 6 * F.diff * dt * 10; F.fv *= 0.94; F.fish = H.clamp(F.fish + F.fv * dt, 0.05, 0.95); if (F.fish <= 0.05 || F.fish >= 0.95) F.fv *= -1;
      F.pos = H.clamp(F.pos + (hold ? 0.9 : -0.8) * dt, 0.08, 0.92);
      const inZone = Math.abs(F.pos - F.fish) < 0.12; F.prog += (inZone ? 0.28 : -0.2 / F.diff) * dt;
      if (Math.random() < dt * 4 && inZone) H.Audio.sfx('reel');
      if (F.prog >= 1) { const f = F.catch; H.state.fish[f.name] = (H.state.fish[f.name] || 0) + 1; H.stat('fishCaught', 1); H.emit('fishCaught', f); H.addCoins(f.val, 'Caught a ' + f.name); H.ui.banner(`🎣 ${f.name}`, `${H.RAR[f.rar]} · worth ${f.val} coins${H.state.fish[f.name] === 1 ? ' · NEW SPECIES' : ''}`); F.phase = 'wait'; F.t = 2 + Math.random() * 3; F.prog = 0.3; H.dirty(); H.checkAch(); }
      if (F.prog <= 0) { F.phase = 'wait'; F.t = 2 + Math.random() * 3; F.prog = 0.3; H.toast('The line snapped!'); H.Audio.sfx('fail'); }
    }
    H.ui.fishing(F);
  };
  H.stopFishing = function () { H.fishing = null; H.ui.fishing(null); };
})();
