// Hoofquake — save data, economy, stats, achievements, collectibles, interactions, world events.
'use strict';
(function () {
  // ---------------- event bus ----------------
  const subs = {};
  H.on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); };
  H.emit = (ev, ...a) => { (subs[ev] || []).forEach(fn => { try { fn(...a); } catch (e) { console.error(e); } }); };

  const START_EMOTES = ['emote:spin', 'emote:wiggle', 'emote:sit', 'emote:wave'];
  H.newState = () => ({
    v: 1, coins: 750, animals: { goat: 1 }, animal: 'goat', animal2: 'sheep', cos: Object.fromEntries(START_EMOTES.map(e => [e, 1])), outfits: {},
    vehicles: {}, gadgets: { blaster: 1 }, props: {}, furn: {}, found: {}, fish: {}, secrets: {}, missions: {}, ach: {}, stats: {}, spawn: null, time: 9.5, day: 0, playtime: 0, daily: null, coinsPeak: 750,
    pos: null,
  });
  H.state = H.newState();
  H.getOutfit = function (animalId, idx) {
    const o = H.state.outfits[animalId] = H.state.outfits[animalId] || { cur: {}, saved: [null, null, null, null, null] };
    if (!o.cur.emotes) o.cur.emotes = START_EMOTES.slice();
    return o.cur;
  };
  H.addCoins = function (n, why) {
    const s = H.state; s.coins = Math.max(0, s.coins + Math.round(n)); s.coinsPeak = Math.max(s.coinsPeak, s.coins);
    if (n > 0) { H.Audio.sfx(n > 200 ? 'cash' : 'coin'); H.stat('coinsEarned', n); }
    H.ui && H.ui.coins(n, why); H.checkAch(); H.dirty();
  };
  H.spend = function (n) { if (H.state.coins < n) { H.toast(`You need ${H.fmt(n - H.state.coins)} more coins.`, 'bad'); H.Audio.sfx('fail'); return false; } H.state.coins -= n; H.Audio.sfx('buy'); H.ui && H.ui.coins(-n); H.dirty(true); return true; };
  H.toast = function (msg, kind) { H.ui ? H.ui.toast(msg, kind) : console.log(msg); };

  // ---------------- stats & achievements ----------------
  H.stat = function (name, amt, isMax) {
    const st = H.state.stats; if (isMax) { if ((st[name] || 0) < amt) st[name] = amt; else return; } else st[name] = (st[name] || 0) + amt;
    if (!H._achT) H._achT = setTimeout(() => { H._achT = null; H.checkAch(); H.checkDaily(); }, 400);
  };
  H.derived = function (k) {
    const s = H.state, c = o => Object.keys(o).length;
    switch (k) {
      case 'animals': return c(s.animals); case 'vehicles': return c(s.vehicles); case 'properties': return c(s.props); case 'cosmetics': return c(s.cos);
      case 'ducks': return Object.keys(s.found).filter(k => k.startsWith('duck')).length; case 'gnomes': return Object.keys(s.found).filter(k => k.startsWith('gnome')).length;
      case 'chests': return Object.keys(s.found).filter(k => k.startsWith('chest')).length; case 'statues': return Object.keys(s.found).filter(k => k.startsWith('statue')).length;
      case 'fishSpecies': return c(s.fish); case 'secrets': return c(s.secrets); case 'coinsPeak': return s.coinsPeak; case 'missions': return c(s.missions);
      case 'summit': return s.secrets.summit ? 1 : 0;
      default: return s.stats[k] || 0;
    }
  };
  H.checkAch = function () {
    for (const a of H.ACHIEVEMENTS) {
      if (H.state.ach[a.id]) continue; if (H.derived(a.stat) >= a.goal) {
        H.state.ach[a.id] = 1; H.ui && H.ui.banner('🏆 Achievement: ' + a.name, a.desc + ` · +${H.fmt(a.reward)} coins`); H.Audio.sfx('unlock');
        H.state.coins += a.reward; if (a.item) H.grantCosmetic(a.item, true); H.dirty(true);
      }
    }
  };
  H.grantCosmetic = function (id, quiet) { if (!H.COSMETIC[id] || H.state.cos[id]) return false; H.state.cos[id] = 1; const it = H.COSMETIC[id]; if (!quiet) H.ui.banner(`✨ New ${H.RAR[it.rar]} cosmetic`, it.name); else H.toast(`✨ Unlocked ${it.name}`); H.dirty(true); return true; };
  H.grantAnimal = function (id) { if (H.state.animals[id]) return; H.state.animals[id] = 1; H.ui.banner('🐾 New animal unlocked!', H.ANIMAL[id].name + ' — ' + H.ANIMAL[id].desc); H.Audio.sfx('unlock'); H.stat('animalsUnlocked', 1); H.checkAch(); H.dirty(true); };
  H.grantVehicle = function (id) { if (H.state.vehicles[id]) return; H.state.vehicles[id] = { upg: { eng: 0, hand: 0, boost: 0 }, paint: null }; H.ui.banner('🚗 New vehicle!', H.VEHICLE[id].name + ' is in your garage.'); H.Audio.sfx('unlock'); H.checkAch(); H.dirty(true); };
  H.grantSecret = function (id, name) { if (H.state.secrets[id]) return; H.state.secrets[id] = 1; H.ui.banner('🔍 Secret discovered', name + ' · +500 coins'); H.state.coins += 500; H.Audio.sfx('unlock'); H.checkAch(); H.dirty(true); H.emit('secret', id); };

  // ---------------- daily challenges ----------------
  const DAILY = [['npcHits', 'Ragdoll {n} people', [10, 25]], ['breaks', 'Break {n} objects', [25, 60]], ['driveKm', 'Drive {n} km', [2, 6]], ['headbutts', 'Headbutt {n} things', [30, 80]], ['specials', 'Use your special ability {n} times', [8, 20]], ['fishCaught', 'Catch {n} fish', [3, 8]], ['missionsDone', 'Complete {n} missions', [2, 5]], ['emotes', 'Emote {n} times', [5, 12]], ['grabs', 'Lick and grab {n} things', [10, 25]], ['explosions', 'Cause {n} explosions', [3, 8]], ['flyKm', 'Fly {n} km', [1, 3]], ['swimKm', 'Swim {n} km', [0.5, 1.5]], ['carsFlipped', 'Flip {n} traffic cars', [3, 8]]];
  H.newDay = function () {
    const r = H.rng(H.state.day * 7919 + 13); H.state.day++; const picks = []; const pool = DAILY.slice();
    for (let i = 0; i < 3; i++) { const d = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = d[2][1] > 10 ? Math.round(d[2][0] + r() * (d[2][1] - d[2][0])) : Math.round((d[2][0] + r() * (d[2][1] - d[2][0])) * 2) / 2; picks.push({ stat: d[0], desc: d[1].replace('{n}', n), goal: n, base: H.state.stats[d[0]] || 0, reward: 400 + Math.round(r() * 8) * 100, done: false }); }
    H.state.daily = { day: H.state.day, list: picks }; H.ui && H.ui.toast('📅 New daily challenges are up (Missions → Daily)'); H.dirty();
  };
  H.checkDaily = function () {
    const d = H.state.daily; if (!d) return;
    for (const c of d.list) if (!c.done && (H.state.stats[c.stat] || 0) - c.base >= c.goal) { c.done = true; H.ui.banner('📅 Daily challenge complete', c.desc + ` · +${H.fmt(c.reward)}`); H.state.coins += c.reward; if (Math.random() < 0.35) { const pool = H.COSMETICS.filter(x => x.src === 'shop' && x.rar >= 1 && x.rar <= 3 && !H.state.cos[x.id]); if (pool.length) H.grantCosmetic(H.pick(pool).id); } H.dirty(true); }
  };

  // ---------------- collectibles ----------------
  H.initCollectibles = function () {
    for (const c of H.collectibles) { if (H.state.found[c.id]) continue; c.mesh = H.buildCollectible(c.type); c.mesh.position.set(c.x, c.y, c.z); H.scene.add(c.mesh); }
  };
  H.pickups = [];
  H.addPickup = function (type, x, y, z, cb, opt) { const m = H.buildCollectible(type); m.position.set(x, y, z); H.scene.add(m); const p = Object.assign({ type, x, y, z, mesh: m, cb, r: 2.2 }, opt || {}); H.pickups.push(p); return p; };
  H.removePickup = function (p) { H.scene.remove(p.mesh); const i = H.pickups.indexOf(p); if (i >= 0) H.pickups.splice(i, 1); };
  H.updateCollectibles = function (dt, t) {
    for (const pl of H.players) {
      const r = pl.radius + 1.6;
      for (const c of H.collectibles) {
        if (!c.mesh || H.state.found[c.id]) continue; if ((c.interior || null) !== (pl.interior ? pl.interior.id : null)) continue;
        const dx = c.x - pl.pos.x, dz = c.z - pl.pos.z; if (dx * dx + dz * dz > 2500) continue;
        c.mesh.rotation.y = t * 1.5; if (c.type !== 'chest') c.mesh.position.y = c.y + Math.sin(t * 2 + c.x) * 0.15 + 0.2;
        if (dx * dx + dz * dz < r * r && Math.abs(c.y - pl.pos.y) < 3 + pl.height) collect(c, pl);
      }
      for (const p of H.pickups.slice()) { p.mesh.rotation.y = t * 3; const dx = p.x - pl.pos.x, dz = p.z - pl.pos.z; if (dx * dx + dz * dz < (p.r + pl.radius) ** 2 && Math.abs(p.y - pl.pos.y) < 3 + pl.height) { H.removePickup(p); p.cb && p.cb(pl, p); } }
    }
  };
  function collect(c, pl) {
    if (c.type === 'ufopart' && !H.missions.activeIs('ufo')) { if (!H.state.found.ufohint) { H.state.found.ufohint = 1; H.toast('A strange glowing part… the Crash Site secret mission collects these.'); } }
    H.state.found[c.id] = 1; H.scene.remove(c.mesh); c.mesh = null; H.dirty(true);
    const n = H.derived;
    switch (c.type) {
      case 'duck': H.addCoins(150, 'Rubber duck'); H.toast(`🦆 Rubber duck ${n('ducks')}/60`); if (n('ducks') === 60) H.grantCosmetic('hat:duckhat'); break;
      case 'gnome': H.addCoins(250, 'Garden gnome'); H.toast(`🧙 Gnome ${n('gnomes')}/25`); if (n('gnomes') === 25) H.grantCosmetic('pattern:gnome'); break;
      case 'statue': { const k = n('statues'); H.addCoins(1000, 'Golden Goat Statue'); H.ui.banner('🏆 Golden Goat Statue', `${k}/12 found`); if (k === 6) H.grantCosmetic('hat:goldhorns'); if (k === 12) { H.grantAnimal('cosmicgoat'); H.grantCosmetic('aura:cosmic'); } break; }
      case 'chest': openChest(pl); break;
      case 'ufopart': { const k = Object.keys(H.state.found).filter(k => k.startsWith('ufopart')).length; H.toast(`🛸 UFO part ${k}/5`); H.Audio.sfx('ufo'); if (k === 5) { H.grantVehicle('saucer'); H.grantCosmetic('back:ufo'); H.grantSecret('ufoparts', 'The Lunar Saucer, rebuilt'); } break; }
      case 'keycard': H.ui.banner('🔑 Lab Keycard', 'Somewhere in Rustworks there\'s a shed that wants this.'); H.grantCosmetic('neck:keycard', true); H.Audio.sfx('unlock'); break;
    }
    H.fx.burst(c.x, c.y + 1, c.z, new THREE.Color('#ffd76a'), 20, 5, 0.25);
    H.checkAch();
  }
  function openChest(pl) {
    H.Audio.sfx('unlock'); const roll = Math.random();
    if (roll < 0.45) { const pool = H.COSMETICS.filter(x => (x.src === 'shop' || x.src === 'chests') && !H.state.cos[x.id] && x.rar <= (Math.random() < 0.1 ? 5 : 3)); if (pool.length) { const it = H.pick(pool); H.grantCosmetic(it.id); H.addCoins(200, 'Treasure chest'); return; } }
    if (roll < 0.55) { const f = H.pick(H.FURNITURE.filter(f => f.price < 8000)); H.state.furn[f.id] = (H.state.furn[f.id] || 0) + 1; H.ui.banner('📦 Treasure: furniture', f.name + ' added to your storage'); }
    H.addCoins(300 + Math.floor(Math.random() * 1200), 'Treasure chest');
  }

  // ---------------- interactions ----------------
  H.doInteract = function (p, o) {
    switch (o.kind) {
      case 'vehicle': o.v.enter(p); break;
      case 'shop': H.ui.openShop(o.shop.kind, o.shop); break;
      case 'property': {
        const pr = o.prop; p.visiting = null; if (H.state.props[pr.id]) { H.enterInterior(p, H.interiors['prop_' + pr.id]); } else H.ui.openShop('properties', null, pr.id); break;
      }
      case 'exit': H.exitInterior(p, o.interior); break;
      case 'enter': H.enterInterior(p, H.interiors[o.to]); break;
      case 'labdoor': if (H.state.cos['neck:keycard']) { H.enterInterior(p, H.interiors.lab); } else { H.toast('🔒 Locked. A keycard reader blinks red. (Rumour says the key is lost in a cave.)'); H.Audio.sfx('fail'); } break;
      case 'wardrobe': H.ui.openCustomize(); break;
      case 'terminal': H.ui.openProperty(o.interior.prop.id); break;
      case 'ride': p.startRide(o.ride); break;
      case 'fish': H.missions.startFishing(p, o.spot); break;
      case 'secret': secretInteract(p, o.secret); break;
      case 'mission': H.missions.offer(o.mission); break;
      case 'npctalk': break;
      default: if (o.fn) o.fn(p);
    }
  };
  function secretInteract(p, id) {
    if (id === 'mutantvat') { if (H.state.animals.mutant) return H.toast('The vat is empty now. Something two-headed is roaming free.'); H.fx.burst(p.pos.x, p.pos.y + 2, p.pos.z, new THREE.Color('#7ef25a'), 40, 8, 0.4); H.Audio.sfx('zap'); H.grantAnimal('mutant'); H.grantCosmetic('hat:labhelmet'); }
    if (id === 'slimevat') { if (H.state.animals.slime) return H.toast('Only a faint "blorp" remains.'); H.Audio.voice(['blorp', 200]); H.grantAnimal('slime'); }
    if (id === 'dinoegg') { if (H.state.animals.babyraptor) return H.toast('Just shell fragments now.'); const days = H.state.stats.eggVisits || 0; if (!H.Sky.isNight()) { H.toast('The egg is warm. It twitches… maybe come back at night?'); H.state.stats.eggVisits = days + 1; return; } H.Audio.sfx('dig'); H.grantAnimal('babyraptor'); H.grantCosmetic('back:egg', true); }
  }
  H.enterInterior = function (p, it) {
    if (!it) return; p.prevOutside = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    p.teleport(it.x, it.y + 0.1, it.z + it.d / 2 - 4, it); p.yaw = Math.PI; p.cam.yaw = Math.PI; H.Audio.sfx('click');
    H.ui.fade(); if (it.prop) H.furniture.build(it.prop.id, p.visiting); H.toast(it.prop ? `🏠 ${it.prop.name} · use the terminal to decorate` : '');
    const sz = H.SECRET_ZONES.find(s => s.interior === it.id); if (sz) H.grantSecret(sz.id, sz.name);
  };
  H.exitInterior = function (p, it) { p.visiting = null; const e = it.exit; p.teleport(e.x, H.groundAt(e.x, e.z, 999) + 0.2, e.z + 2, null); p.yaw = 0; H.ui.fade(); };

  // ---------------- secret zones (outdoor) ----------------
  H.checkSecrets = function () {
    for (const p of H.players) for (const s of H.SECRET_ZONES) {
      if (H.state.secrets[s.id] || s.interior) continue; if (p.interior) continue;
      if (H.dist2(p.pos.x, p.pos.z, s.x, s.z) < s.r * s.r && Math.abs(p.pos.y - s.y) < 8) {
        H.grantSecret(s.id, s.name);
        if (s.id === 'summit') { H.grantCosmetic('emote:summit', true); }
        if (s.id === 'shipwreck') H.grantCosmetic('body:pirate', true);
        if (s.id === 'temple') H.grantCosmetic('fur:templegold', true);
        if (s.id === 'lighthouse') H.grantCosmetic('hat:lighthouse', true);
      }
    }
  };

  // ---------------- furniture placement in owned properties ----------------
  H.furniture = {
    meshes: [],
    makeMesh(f) { const g = new THREE.Group(); for (const [geo, sx, sy, sz, x, y, z, c, rx] of f.parts) { const m = H.mesh(geo, c, sx, sy, sz, x, y, z, f.flags.glow ? { emissive: c, emissiveIntensity: 0.4 } : undefined); if (geo === 'cyl' || geo === 'cone') { m.scale.set(sx, sy, sz); } if (rx) m.rotation.x = rx; m.castShadow = true; g.add(m); } return g; },
    build(pid, override) {
      for (const m of this.meshes) H.scene.remove(m); this.meshes = []; if (this.pads) this.pads.forEach(pd => { const i = H.props.indexOf(pd); if (i >= 0) H.removeProp(pd); }); this.pads = [];
      const it = H.interiors['prop_' + pid], data = override ? { furn: override } : H.state.props[pid]; if (!it || !data) return;
      for (const f of data.furn || []) { const def = H.FURN[f.id]; if (!def) continue; const g = this.makeMesh(def); g.position.set(it.x + f.x, it.y, it.z + f.z); g.rotation.y = f.ry || 0; H.scene.add(g); this.meshes.push(g); if (def.flags.bouncy) { const pd = H.spawnProp('trampoline', it.x + f.x, it.y + 0.8, it.z + f.z, { interior: it.id, temp: true }); pd.mesh.visible = false; this.pads.push(pd); } }
      // trophy shelf: show collection progress as glowing count blocks
      const n = H.derived('statues'); for (let i = 0; i < n; i++) { const s = H.buildCollectible('statue'); s.scale.setScalar(0.35); s.position.set(it.x - it.w / 2 + 2 + i * 0.9, it.y + 2.2, it.z - it.d / 2 + 0.6); H.scene.add(s); this.meshes.push(s); }
      const shelf = H.mesh('box', '#6a4a2a', Math.max(4, n * 0.9 + 1), 0.2, 1, it.x - it.w / 2 + 1.6 + Math.max(4, n * 0.9 + 1) / 2, it.y + 2.1, it.z - it.d / 2 + 0.6); H.scene.add(shelf); this.meshes.push(shelf);
    },
  };

  // ---------------- world events ----------------
  H.events = { t: 150, active: null };
  H.updateEvents = function (dt) {
    const E = H.events; const p = H.players[0]; if (!p || p.interior) return;
    if (E.active) { E.active.t -= dt; E.active.tick(dt); if (E.active.t <= 0) { E.active.end && E.active.end(); E.active = null; } return; }
    E.t -= dt; if (E.t > 0) return; E.t = 200 + Math.random() * 200;
    const kinds = ['meteor', 'ufo', 'fruit', 'stampede', 'goldrain', 'giantball'];
    startEvent(H.pick(kinds), p);
  };
  function startEvent(kind, p) {
    const cx = p.pos.x + (Math.random() - 0.5) * 60, cz = p.pos.z + (Math.random() - 0.5) * 60; H.stat('events', 1);
    const E = H.events;
    if (kind === 'meteor') { H.ui.banner('☄️ Meteor shower!', 'Stand near an impact for a rare trail.'); E.active = { t: 20, acc: 0, tick(dt) { this.acc += dt; if (this.acc > 0.9) { this.acc = 0; const x = cx + (Math.random() - 0.5) * 120, z = cz + (Math.random() - 0.5) * 120, y = H.groundAt(x, z, 999); for (let i = 0; i < 20; i++) H.fx.spawn(x + 20 - i, y + 40 - i * 2, z, 0, 0, 0, new THREE.Color('#ff8a3a'), 1, 0.4, 0); setTimeout(() => { H.explode(x, y, z, 10, 30, null); if (H.dist2(x, z, p.pos.x, p.pos.z) < 900) H.grantCosmetic('trail:meteor'); }, 450); } } }; }
    if (kind === 'ufo') {
      H.ui.banner('🛸 Close encounter', 'Something is abducting the locals. Stand in the beam if you dare.'); const s = H.buildVehicle(H.VEHICLE.saucer).root; s.position.set(cx, H.groundAt(cx, cz, 999) + 40, cz); H.scene.add(s);
      const beam = H.mesh('cone', '#9affd8', 14, 38, 14, cx, s.position.y - 19, cz, { transparent: true, opacity: 0.25, depthWrite: false }); H.scene.add(beam); H.Audio.sfx('ufo');
      E.active = { t: 18, tick(dt) { s.rotation.y += dt * 2; for (const n of H.NPCs.near(cx, cz, 7)) { n.knock(0, 12, 0); } if (H.dist2(p.pos.x, p.pos.z, cx, cz) < 36 && !p.vehicle) { p.vel.y = 10; p.onGround = false; if (!this.got && p.pos.y > s.position.y - 12) { this.got = 1; H.addCoins(800, 'Abducted and returned'); p.knock(0, 5, 0); } } }, end() { H.scene.remove(s); H.scene.remove(beam); } };
    }
    if (kind === 'fruit') { H.ui.banner('🍉 Fruit storm!', 'It\'s raining watermelons. Don\'t ask.'); E.active = { t: 16, acc: 0, tick(dt) { this.acc += dt; if (this.acc > 0.25) { this.acc = 0; const pr = H.spawnProp(Math.random() < 0.6 ? 'watermelon' : 'beachball', cx + (Math.random() - 0.5) * 80, H.groundAt(cx, cz, 999) + 60, cz + (Math.random() - 0.5) * 80, { temp: true }); H.wakeProp(pr); pr.breakAt = 15; setTimeout(() => { if (H.props.includes(pr)) H.removeProp(pr); }, 30000); } } }; }
    if (kind === 'stampede') { H.ui.banner('🐄 STAMPEDE!', 'A herd is charging through. Jump!'); const herd = []; const a = Math.random() * 6.28; for (let i = 0; i < 16; i++) { const n = H.NPCs.add({ x: p.pos.x + Math.cos(a) * 70 + (Math.random() - 0.5) * 20, z: p.pos.z + Math.sin(a) * 70 + (Math.random() - 0.5) * 20, r: 1, type: 'cow', temp: 1 }); n.materialize(); n.state = 'flee'; n.t = 20; n.fleeFrom = { pos: new THREE.Vector3(p.pos.x + Math.cos(a) * 140, 0, p.pos.z + Math.sin(a) * 140) }; n.speed = 6; herd.push(n); } E.active = { t: 20, tick() { for (const n of herd) if (n.active && !n.ragdoll) { for (const pl of H.players) if (!pl.vehicle && !pl.ragdoll && H.dist2(n.pos.x, n.pos.z, pl.pos.x, pl.pos.z) < 3 && pl.pos.y - n.pos.y < 1.5) pl.knock((pl.pos.x - n.pos.x) * 4, 12, (pl.pos.z - n.pos.z) * 4); } }, end() { herd.forEach(n => (n.gone = true)); } }; }
    if (kind === 'goldrain') { H.ui.banner('💰 Coin rain!', 'Grab the coins before they vanish.'); const list = []; for (let i = 0; i < 30; i++) { const x = cx + (Math.random() - 0.5) * 70, z = cz + (Math.random() - 0.5) * 70; list.push(H.addPickup('coin', x, H.groundAt(x, z, 999, null), z, () => H.addCoins(40, 'Coin'))); } E.active = { t: 30, tick() { }, end() { list.forEach(pk => H.removePickup(pk)); } }; }
    if (kind === 'giantball') { H.ui.banner('🏐 Giant beach ball!', 'A ball the size of a house is loose.'); const b = H.spawnProp('beachball', cx, H.groundAt(cx, cz, 999) + 30, cz, { temp: true }); b.mesh.scale.setScalar(7); b.r = 5.6; b.mass = 3; H.wakeProp(b); b.vel.set(10, 0, 6); E.active = { t: 45, tick() { }, end() { if (H.props.includes(b)) H.removeProp(b); } }; }
    H.emit('worldEvent', kind);
  }
  H.startEvent = startEvent;

  // ---------------- saving ----------------
  // Cloud save goes to this viewer's private record via the page's `db` capability (server-side, not browser storage).
  // When that is unavailable, players can copy a save code instead.
  H.Save = {
    db: null, uid: null, ready: false, writing: false, pending: false, last: 0, dirty: false,
    async init() {
      try {
        if (!window.claude || !window.claude.use) return false;
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return false; const id = await user.id(); if (!id) return false;
        this.db = db; this.uid = id; this.doc = db.doc('data/users/' + id + '/hoofquake'); this.ready = true; return true;
      } catch (e) { return false; }
    },
    async load() {
      if (!this.ready) return null;
      try { const snap = await Promise.race([this.doc.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]); if (snap.exists) { const d = snap.data(); return JSON.parse(d.json); } } catch (e) { console.warn('load failed', e); }
      return null;
    },
    snapshot() { const s = H.state; const p = H.players[0]; if (p && !p.interior) s.pos = { x: p.pos.x, y: p.pos.y, z: p.pos.z }; s.time = H.Sky.time; return JSON.stringify(s); },
    async save(manual) {
      if (!this.ready) { if (manual) H.ui.openSaveCode(); return; }
      if (this.writing) { this.pending = true; return; }
      this.writing = true; this.dirty = false;
      try { await this.doc.set({ json: this.snapshot(), savedAt: Date.now() }); this.last = Date.now(); H.ui && H.ui.saved(true); }
      catch (e) { H.ui && H.ui.saved(false, e && e.code); }
      this.writing = false; if (this.pending) { this.pending = false; setTimeout(() => this.save(), 1500); }
    },
    code() { return btoa(unescape(encodeURIComponent(this.snapshot()))); },
    fromCode(str) { const s = JSON.parse(decodeURIComponent(escape(atob(str.trim())))); if (!s || s.v !== 1) throw new Error('bad'); return s; },
  };
  H.dirty = function (soon) { H.Save.dirty = true; if (soon) { clearTimeout(H._saveT); H._saveT = setTimeout(() => H.Save.save(), 2500); } };
  H.applyState = function (s) {
    H.state = Object.assign(H.newState(), s);
    H.state.gadgets = Object.assign({ blaster: 1 }, H.state.gadgets || {});
    for (const k of ['animals', 'cos', 'outfits', 'vehicles', 'props', 'furn', 'found', 'fish', 'secrets', 'missions', 'ach', 'stats']) H.state[k] = H.state[k] || {};
    H.Sky.time = H.state.time || 9.5;
  };
})();
