// Hoofquake — boot, input, game loop, split-screen.
'use strict';
(function () {
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  H.settings = { volume: 0.6, shadows: !isTouch, pixelRatio: isTouch ? 0.75 : 1, viewDist: isTouch ? 600 : 900, fov: 70, traffic: isTouch ? 14 : 24, touch: isTouch, sens: 1, invertY: false, animalControl: true, events: true, timeSpeed: 1 };
  H.ACTION_LABEL = { move: 'Move', jump: 'Jump / fly up', sprint: 'Sprint / boost', attack: 'Headbutt / attack', grab: 'Lick / grab / throw', special: 'Special ability', interact: 'Interact / enter vehicle', ragdoll: 'Ragdoll', descend: 'Dive / fly down', emote1: 'Emote 1', emote2: 'Emote 2', emote3: 'Emote 3', emote4: 'Emote 4', horn: 'Horn', gadget: 'Weapon (cycle loadout)', heavy: 'Heavy attack', sound: 'Animal sound', sniff: 'Sniff (hold)', map: 'Map', missions: 'Missions', customize: 'Customize', camLeft: 'Camera left', camRight: 'Camera right' };
  const DEFAULT_KEYS = [
    { jump: ['Space'], sprint: ['ShiftLeft'], attack: ['KeyF'], grab: ['KeyG'], special: ['KeyQ'], interact: ['KeyE'], ragdoll: ['KeyR'], descend: ['KeyC', 'ControlLeft'], emote1: ['Digit1'], emote2: ['Digit2'], emote3: ['Digit3'], emote4: ['Digit4'], horn: ['KeyH'], gadget: ['KeyX'], heavy: ['KeyV'], sound: ['KeyB'], sniff: ['KeyZ'], map: ['KeyM'], missions: ['KeyJ'], customize: ['KeyK'], up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] },
    { jump: ['Slash'], sprint: ['ShiftRight'], attack: ['Period'], grab: ['Comma'], special: ['Semicolon'], interact: ['Quote'], ragdoll: ['BracketRight'], descend: ['ControlRight'], up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], camLeft: ['BracketLeft'], camRight: ['Backslash'] },
  ];
  H.resetKeys = () => { H.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); H.saveSettings(); };
  H.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
  H.keyName = (a, i) => { if (a === 'move') return i ? 'Arrow keys' : 'W A S D'; const k = (H.keys[i || 0][a] || [])[0]; return k ? k.replace(/^Key|^Digit/, '').replace('Left', ' L').replace('Right', ' R').replace('Space', 'Space') : '—'; };
  H.saveSettings = () => { H.state.settings = H.settings; H.state.keys = H.keys; H.dirty(); };

  // ---------------- input ----------------
  const down = new Set(), pressed = new Set(); let mouse = { dx: 0, dy: 0, l: false, r: false, lp: false, rp: false, wheel: 0, locked: false, drag: false, moved: 0 };
  addEventListener('keydown', e => {
    if (H.rebinding) { e.preventDefault(); const f = H.rebinding; H.rebinding = null; f(e.code); return; }
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (!down.has(e.code)) pressed.add(e.code); down.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Slash', 'Quote'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'Tab') { if (!H.ui.panel.hidden) H.ui.close(); else if (H.fishing) H.stopFishing(); else if (H.started) H.ui.mainMenu($('#menu').hidden); }
  });
  addEventListener('keyup', e => down.delete(e.code));
  addEventListener('blur', () => down.clear());
  const $ = s => document.querySelector(s);
  const has = (i, a) => (H.keys[i][a] || []).some(k => down.has(k));
  const hit = (i, a) => (H.keys[i][a] || []).some(k => pressed.has(k));

  function setupMouse(canvas) {
    canvas.addEventListener('mousedown', e => {
      H.Audio.init(); if (!H.started || H.paused) return;
      if (!mouse.locked && !isTouch && e.button === 0) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (err) { } }
      mouse.drag = true; mouse.moved = 0; mouse.btn = e.button; if (e.button === 0) mouse.down0 = true;
      if (mouse.locked) { if (e.button === 0) mouse.lp = true; if (e.button === 2) mouse.rp = true; }
    });
    addEventListener('mouseup', e => { if (e.button === 0) mouse.down0 = false; if (!mouse.locked && mouse.drag && mouse.moved < 6 && H.started && !H.paused) { if (e.button === 0) mouse.lp = true; if (e.button === 2) mouse.rp = true; } mouse.drag = false; });
    addEventListener('mousemove', e => { if (mouse.locked || (mouse.drag && !isTouch)) { mouse.dx += e.movementX; mouse.dy += e.movementY; mouse.moved += Math.abs(e.movementX) + Math.abs(e.movementY); } });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { mouse.locked = document.pointerLockElement === canvas; });
  }
  function readInput(i, dt) {
    const p = H.players[i]; const T = H.touch, t = i === 0 && H.settings.touch;
    const inp = { mx: 0, mz: 0 };
    inp.mx = (has(i, 'right') ? 1 : 0) - (has(i, 'left') ? 1 : 0); inp.mz = (has(i, 'up') ? 1 : 0) - (has(i, 'down') ? 1 : 0);
    if (t && (T.mx || T.mz)) { inp.mx = T.mx; inp.mz = -T.mz; }
    const tb = a => t && T.btn[a], tp = a => { if (t && T.pressed[a]) { T.pressed[a] = false; return true; } return false; };
    inp.jump = has(i, 'jump') || tb('jump'); inp.jumpPressed = hit(i, 'jump') || tp('jump');
    inp.sprint = has(i, 'sprint') || tb('sprint') || (t && T.sprint);
    inp.descend = has(i, 'descend') || tb('descend');
    inp.attack = hit(i, 'attack') || (i === 0 && mouse.lp) || tp('attack');
    inp.grab = hit(i, 'grab') || (i === 0 && mouse.rp) || tp('grab');
    inp.special = hit(i, 'special') || tp('special');
    inp.interact = hit(i, 'interact') || tp('interact');
    inp.ragdoll = hit(i, 'ragdoll') || tp('ragdoll');
    inp.heavy = hit(i, 'heavy') || tp('heavy'); inp.sound = hit(i, 'sound') || tp('sound'); inp.sniff = has(i, 'sniff') || tb('sniff');
    inp.horn = hit(i, 'horn'); inp.gadget = hit(i, 'gadget') || tp('gadget'); inp.fireHeld = (i === 0 && mouse.locked && mouse.down0) || has(i, 'attack') || tb('attack');
    inp.emoteIdx = -1; for (let k = 0; k < 4; k++) if (hit(i, 'emote' + (k + 1))) inp.emoteIdx = k; if (tp('emote')) inp.emoteIdx = Math.floor(Math.random() * Math.max(1, p.emotes.length));
    // camera
    if (i === 0) {
      const s = 0.0025 * H.settings.sens;
      p.cam.yaw -= mouse.dx * s; p.cam.pitch += mouse.dy * s * (H.settings.invertY ? -1 : 1);
      if (t) { p.cam.yaw -= T.look.dx * 0.006; p.cam.pitch += T.look.dy * 0.005; T.look.dx = T.look.dy = 0; }
      mouse.dx = mouse.dy = 0; if (mouse.wheel) { p.cam.dist = H.clamp(p.cam.dist + mouse.wheel * 0.8, 3, 26); mouse.wheel = 0; }
      // gentle auto-follow when moving with no mouse input (helps touch & vehicles)
      if ((p.vehicle || (t && !mouse.locked)) && (Math.abs(inp.mz) > 0.2 || (p.vehicle && Math.abs(p.vehicle.spd) > 4))) p.cam.yaw = H.angLerp(p.cam.yaw, p.vehicle ? p.vehicle.yaw : p.yaw, dt * (p.vehicle ? 2.2 : 0.6));
    } else {
      const turn = (has(i, 'camRight') ? 1 : 0) - (has(i, 'camLeft') ? 1 : 0); p.cam.yaw -= turn * dt * 2.2;
      if (!turn && (Math.abs(inp.mz) > 0.2 || p.vehicle)) p.cam.yaw = H.angLerp(p.cam.yaw, p.vehicle ? p.vehicle.yaw : p.yaw, dt * 1.5);
    }
    p.cam.pitch = H.clamp(p.cam.pitch, -0.35, 1.3);
    inp.camYaw = p.cam.yaw; inp.camPitch = p.cam.pitch;
    if (i === 0) { if (hit(0, 'map')) H.ui.menu('map'); if (hit(0, 'missions')) H.ui.menu('missions'); if (hit(0, 'customize')) H.ui.openCustomize(); }
    return inp;
  }

  // ---------------- boot ----------------
  let renderer, clock;
  H.players = []; H.cameras = [];
  function loading(msg, pct) { $('#loadMsg').textContent = msg; $('#loadBar').style.width = pct + '%'; }
  const wait = () => new Promise(r => setTimeout(r, 16));
  async function boot() {
    try {
      loading('Warming up the physics engine…', 5); await wait();
      H.initGeos(); H.ui.init();
      renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      $('#game').appendChild(renderer.domElement); setupMouse(renderer.domElement); H.renderer = renderer;
      const scene = new THREE.Scene(); H.scene = scene;
      for (let i = 0; i < 2; i++) H.cameras.push(new THREE.PerspectiveCamera(H.settings.fov, 1, 0.3, H.settings.viewDist * 2.5));
      H.Sky.init(scene); H.fx.init(scene);
      loading('Raising mountains and digging rivers…', 15); await wait(); H.buildTerrain(scene);
      loading('Paving roads and building bridges…', 30); await wait(); H.buildRoads(scene);
      loading('Building Bleatsburg, farms, an airport and one suspicious shed…', 45); await wait(); H.buildWorld(scene);
      loading('Writing 250+ missions…', 70); await wait(); H.generateMissions(); H.addRacewayMissions(); H.initBeacons();
      loading('Waking up the townsfolk…', 80); await wait();
      H.players.push(new H.Player(0)); H.players[0].setAnimal('goat'); placeAtSpawn(H.players[0], false);
      for (const s of H.propSpawns) H.spawnProp(s.type, s.x, null, s.z, { interior: s.interior, ry: s.ry });
      H.NPCs.init(); H.spawnWorldVehicles(); H.initAir(); H.initTraffic(H.settings.traffic);
      loading('Looking for your save…', 92); await wait();
      const cloud = await H.Save.init(); let saved = null; if (cloud) saved = await H.Save.load();
      if (saved) { H.applyState(saved); H.hasSave = true; if (saved.settings) Object.assign(H.settings, saved.settings); if (saved.keys) H.keys = saved.keys; }
      H.grantAll(H.state);
      H.Audio.setVol(H.settings.volume);
      H.setAnimal(0, H.state.animal); placeAtSpawn(H.players[0], false);
      H.updateSaleSigns(); H.ui.coins(0);
      $('#touch').hidden = !H.settings.touch;
      addEventListener('resize', H.resize); H.resize();
      $('#loading').hidden = true; H.ui.mainMenu(true); $('#btnPlay').textContent = H.hasSave ? 'New game' : 'Play'; $('#btnContinue').hidden = !H.hasSave;
      $('#saveNote').textContent = cloud ? 'Progress saves to your account automatically.' : 'Tip: copy a save code from Settings to keep your progress.';
      clock = new THREE.Clock(); requestAnimationFrame(loop);
      H.Net.init();
    } catch (e) { console.error(e); loading('Something went wrong while building the world: ' + e.message, 100); }
  }
  function placeAtSpawn(p, useSaved) {
    const s = H.state; let x = 30, z = 62;
    if (useSaved && s.pos) { p.teleport(s.pos.x, s.pos.y + 0.5, s.pos.z); return; }
    if (s.spawn && H.PROP[s.spawn] && s.props[s.spawn]) { const d = H.PROP[s.spawn].door; x = d.x; z = d.z + 2; }
    p.teleport(x, H.groundAt(x, z, 999) + 0.5, z); p.yaw = Math.PI; p.cam.yaw = Math.PI;
  }
  H.startGame = function (cont) {
    if (H.started) { H.ui.mainMenu(false); return; }
    if (!cont && H.hasSave) { const b = $('#btnPlay'); if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again: erase save & start fresh'; return; } H.applyState(H.newState()); H.reloadWorldState(); }
    H.started = true; H.ui.mainMenu(false); H.initCollectibles();
    if (cont) placeAtSpawn(H.players[0], true);
    if (!H.state.daily) H.newDay();
    if (!cont) setTimeout(() => H.ui.banner('Hoofquake × Scentline 🐾', 'Everything is free: every animal, car, gun and house. Press ' + H.keyName('gadget') + ' for guns, ' + H.keyName('heavy') + ' heavy attack, Menu → Scentline world to jump to Dustwater, the raceway, the army base or other planets.'), 400);
    if (!cont) setTimeout(() => H.ui.banner('Welcome to Bleatsburg 🐐', H.settings.touch ? 'Stick to move · BUTT headbutts · LICK grabs · USE enters cars & shops · glowing beacons are missions' : `${H.keyName('move')} move · ${H.keyName('jump')} jump · F/click headbutt · G/right-click lick · Q special · E interact`), 800);
    H.Audio.sfx('win');
  };
  H.setAnimal = function (i, id) { const p = H.players[i]; if (!p) return; if (!H.state.animals[id]) id = 'goat'; if (i === 0) H.state.animal = id; else H.state.animal2 = id; const wasV = p.vehicle; if (wasV) wasV.exit(p); p.setAnimal(id); H.dirty(); };
  H.travelTo = function (x, z) { const p = H.players[0]; if (p.vehicle) p.vehicle.exit(p); if (p.interior) p.interior = null; H.ui.fade(); p.teleport(x, H.groundAt(x, z, 999) + 0.5, z + 2); H.Audio.sfx('teleport'); };
  H.updateSaleSigns = function () { for (const p of H.PROPERTIES) { const own = !!H.state.props[p.id]; p.saleSign.visible = !own; p.saleSign2.visible = !own; } };
  H.reloadWorldState = function () {
    for (const c of H.collectibles) { if (c.mesh) H.scene.remove(c.mesh); c.mesh = null; } if (H.started) H.initCollectibles();
    H.setAnimal(0, H.state.animal); if (H.players[1]) H.setAnimal(1, H.state.animal2); H.updateSaleSigns(); H.ui.coins(0); H.Sky.time = H.state.time || 9.5;
    if (H.state.settings) Object.assign(H.settings, H.state.settings);
  };
  H.addP2 = function () { if (H.players[1]) return; const p = new H.Player(1); H.players.push(p); const a = H.state.animals[H.state.animal2] ? H.state.animal2 : 'goat'; p.setAnimal(a); const p1 = H.players[0]; p.teleport(p1.pos.x + 3, p1.pos.y + 1, p1.pos.z, p1.interior); H.resize(); H.toast('Player 2 joined — arrow keys to move'); };
  H.removeP2 = function () { const p = H.players[1]; if (!p) return; if (p.vehicle) p.vehicle.exit(p); H.scene.remove(p.root); H.players.pop(); H.resize(); };
  H.resize = function () {
    if (!renderer) return; renderer.setPixelRatio(Math.min(2, devicePixelRatio) * H.settings.pixelRatio); renderer.setSize(innerWidth, innerHeight);
    const split = H.players.length > 1; H.cameras.forEach((c, i) => { c.aspect = split ? innerWidth / (innerHeight / 2) : innerWidth / innerHeight; c.fov = H.settings.fov; c.updateProjectionMatrix(); });
    document.body.classList.toggle('split', split);
  };

  // ---------------- loop ----------------
  let saveT = 0, secretT = 0, fpsT = 0, frames = 0;
  function loop() {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
    const p1 = H.players[0];
    if (H.started && !H.paused) {
      H.slowmo = Math.max(0, (H.slowmo || 0) - dt);
      // fishing locks movement
      const fishHold = has(0, 'jump') || mouse.l || (H.touch && (H.touch.btn.jump || H.touch.btn.attack)) || down.has('Space');
      if (H.cookingActive && (hit(0, 'jump') || mouse.lp || (H.touch && (H.touch.pressed.jump || H.touch.pressed.attack)))) { H.cookPress && H.cookPress(); if (H.touch) { H.touch.pressed.jump = H.touch.pressed.attack = false; } mouse.lp = false; }
      if (H.fishing) { H.updateFishing(dt, fishHold || mouse.drag); if (hit(0, 'interact') || (H.touch && H.touch.pressed.interact) || has(0, 'up') || has(0, 'down')) { H.stopFishing(); if (H.touch) H.touch.pressed.interact = false; } }
      for (let i = 0; i < H.players.length; i++) {
        const inp = readInput(i, dt);
        if ((H.fishing && i === 0) || (H.cookingActive && i === 0)) { inp.mx = inp.mz = 0; inp.jumpPressed = inp.attack = inp.grab = inp.special = inp.interact = false; inp.jump = false; }
        if (i === 0) H.lastInp = inp;
        H.players[i].update(dt, inp);
      }
      const sdt = H.slowmo > 0 ? dt * 0.35 : dt;
      H.missions.update(dt); H.updateProps(sdt); H.NPCs.update(dt); H.updateTraffic(sdt); H.updateVehicles(sdt); H.updateProjectiles(sdt); H.updateShots(sdt); H.updateBurning(sdt); H.updateAir(sdt);
      H.updateVitals(dt, H.lastInp); H.updatePets(dt); H.updateWanted(dt); H.updateCopCars(sdt); H.updateTracers(dt); H.updateRockets(sdt); H.updateVehicleExtras(); H.updateHeist(dt); H.updateRivals(sdt);
      H.updateCombo(dt); H.updateHeat(dt); if (H.settings.events) H.updateEvents(dt); H.updateCollectibles(dt, t);
      for (const a of H.anims) a(dt, t);
      secretT += dt; if (secretT > 0.5) { secretT = 0; H.checkSecrets(); }
      H.state.playtime += dt; saveT += dt; if (saveT > 60) { saveT = 0; if (H.Save.dirty) H.Save.save(); }
      H.shakeAmt = Math.max(0, H.shakeAmt - dt * 2);
      if (H.mapPing) { H.mapPing.t -= dt; if (H.mapPing.t <= 0) H.mapPing = null; }
    }
    pressed.clear(); mouse.lp = mouse.rp = false; if (H.touch) for (const k in H.touch.pressed) H.touch.pressed[k] = false;
    H.fx.update(dt);
    const cam0 = H.cameras[0];
    for (let i = 0; i < H.players.length; i++) H.players[i].updateCamera(dt, H.cameras[i]);
    H.Sky.update(H.started && !H.paused ? dt : 0, cam0.position, !!p1.interior); H.updatePlanetEnv();
    H.updateBeacons(); if (H.started) H.Net.update(dt);
    // render
    const W = innerWidth, Hh = innerHeight;
    if (H.players.length > 1) {
      renderer.setScissorTest(true);
      for (let i = 0; i < 2; i++) { const y = i === 0 ? Hh / 2 : 0; renderer.setViewport(0, y, W, Hh / 2); renderer.setScissor(0, y, W, Hh / 2); renderer.render(H.scene, H.cameras[i]); }
      renderer.setScissorTest(false);
      H.updateFloaters(dt, H.cameras[0], { x: 0, y: 0, w: W, h: Hh / 2 });
    } else { renderer.setViewport(0, 0, W, Hh); renderer.render(H.scene, cam0); H.updateFloaters(dt, cam0, { x: 0, y: 0, w: W, h: Hh }); }
    $('#underwater').hidden = !cam0.userData.under;
    if (H.started) H.ui.hud(dt);
    frames++; fpsT += dt; if (fpsT > 2) { H.fps = frames / fpsT; frames = 0; fpsT = 0; }
  }
  window.addEventListener('beforeunload', () => { if (H.Save.ready && H.Save.dirty) H.Save.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && H.Save.ready && H.Save.dirty) H.Save.save(); });
  H.boot = boot;
})();
