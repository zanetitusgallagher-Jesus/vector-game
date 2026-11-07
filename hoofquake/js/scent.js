// Hoofquake — the Scentline layer, merged in: health & stamina, XP, levels and six stats, hunting with a
// bestiary, fighting wildlife and the Bramble King, heavy attacks, animal sounds, sniffing, eating,
// car hijacking, knock-outs, and a wanted level with police, police cars and SWAT.
'use strict';
(function () {
  const V = THREE.Vector3;

  // ------------------------------------------------------------------ species (Scentline wildlife)
  H.SPECIES = {
    rabbit: { name: 'Rabbit', hp: 14, xp: 14, food: 25, coins: 2, prey: 1 },
    deer: { name: 'Deer', hp: 55, xp: 40, food: 55, coins: 6, prey: 1 },
    chicken: { name: 'Chicken', hp: 9, xp: 8, food: 18, coins: 1, prey: 1 },
    sheep: { name: 'Sheep', hp: 35, xp: 18, food: 40, coins: 3, prey: 1 },
    cow: { name: 'Cow', hp: 90, xp: 30, food: 70, coins: 6, prey: 1 },
    pig: { name: 'Pig', hp: 45, xp: 20, food: 50, coins: 3, prey: 1 },
    goatwild: { name: 'Mountain goat', hp: 60, xp: 35, food: 45, coins: 5, fighter: 1, neutral: 1, dmg: 10 },
    camelwild: { name: 'Camel', hp: 80, xp: 35, food: 60, coins: 6, fighter: 1, neutral: 1, dmg: 10 },
    monkey: { name: 'Monkey', hp: 40, xp: 25, food: 30, coins: 4, prey: 1 },
    wolf: { name: 'Wolf', hp: 95, xp: 80, food: 55, coins: 12, fighter: 1, dmg: 11, sense: 26 },
    wildboar: { name: 'Wild boar', hp: 80, xp: 55, food: 60, coins: 10, fighter: 1, neutral: 1, dmg: 13 },
    bear: { name: 'Bear', hp: 180, xp: 120, food: 90, coins: 30, fighter: 1, neutral: 1, dmg: 20 },
    gator: { name: 'Lake gator', hp: 140, xp: 90, food: 70, coins: 20, fighter: 1, dmg: 18, sense: 18 },
    bramble: { name: 'Bramble King', hp: 480, xp: 400, food: 100, coins: 120, fighter: 1, dmg: 26, sense: 28, boss: 1 },
    sandbeast: { name: 'Sand beast', hp: 120, xp: 90, food: 50, coins: 25, fighter: 1, dmg: 16, sense: 26 },
    glowstag: { name: 'Glowing stag', hp: 90, xp: 60, food: 50, coins: 20, prey: 1 },
    drake: { name: 'Drake', hp: 160, xp: 120, food: 60, coins: 35, fighter: 1, dmg: 18, sense: 24 },
    ashbeast: { name: 'Ash beast', hp: 150, xp: 110, food: 50, coins: 30, fighter: 1, dmg: 20, sense: 26 },
    moonhopper: { name: 'Moon hopper', hp: 30, xp: 25, food: 25, coins: 8, prey: 1 },
    human: { name: 'Person', hp: 40, xp: 6, food: 0, coins: 4 },
    officer: { name: 'Police officer', hp: 45, xp: 15, coins: 8 }, swat: { name: 'SWAT', hp: 60, xp: 30, coins: 12 }, soldier: { name: 'Soldier', hp: 70, xp: 40, coins: 20 },
    alien: { name: 'Alien enforcer', hp: 130, xp: 60, coins: 50 }, robot: { name: 'Robot', hp: 190, xp: 90, coins: 90 },
  };
  H.speciesOf = n => H.SPECIES[n.type] || (n.isHuman ? H.SPECIES.human : { hp: 40, xp: 10, coins: 2 });
  // models for the new wildlife (template animal, scale, colour)
  Object.assign(H.ANIMAL_NPC, {
    rabbit: ['rabbit', 0.9, null], wolf: ['wolf', 1, null], wildboar: ['boar', 1, null], gator: ['croc', 1.1, '#3f5a2a'], bramble: ['bear', 1.7, '#3a2a1c'],
    sandbeast: ['rhino', 0.8, '#c87a4a'], glowstag: ['horse', 0.8, '#b8f0ff'], drake: ['dragon', 0.55, '#7a3aa8'], ashbeast: ['bear', 1.2, '#2a1a1a'], moonhopper: ['rabbit', 1.4, '#d8dce8'],
  });
  Object.assign(H.HUMAN_TYPES, { swat: 'officer', soldier: 'worker', alien: 'ped', robot: 'worker' });

  // ------------------------------------------------------------------ player progression
  const STAT_NAMES = { spd: 'Speed', str: 'Strength', sta: 'Stamina', jmp: 'Jumping', swm: 'Swimming', dur: 'Durability' };
  H.STAT_NAMES = STAT_NAMES;
  const rpg = () => (H.state.rpg = H.state.rpg || { lvl: 1, xp: 0, sp: 0, ups: {}, bestiary: {}, god: false });
  H.rpg = rpg;
  H.ups = (p) => { const r = rpg(); return r.ups[p.animalId] || (r.ups[p.animalId] = { spd: 0, str: 0, sta: 0, jmp: 0, swm: 0, dur: 0 }); };
  const PER = { spd: 0.04, str: 0.07, sta: 0.08, jmp: 0.035, swm: 0.08, dur: 0.06 };
  H.statMul = function (p, k) {
    if (!p || p.isRemote) return 1; let m = 1 + (H.ups(p)[k] || 0) * PER[k] + (rpg().lvl - 1) * (k === 'str' ? 0.02 : 0.004);
    if (k === 'spd') { if (H.hasGear('boots')) m *= 1.22; if (H.hasGear('cyber')) m *= 1.3; if (p.timers && p.timers.rage) m *= 1.25; }
    if (k === 'jmp') { if (H.hasGear('springs')) m *= 1.5; if (H.hasGear('lowg')) m *= 1.9; if (H.onPlanet && H.onPlanet(p) === 'selene') m *= 1.6; }
    if (k === 'str' && p.timers && (p.timers.rage || p.timers.beat)) m *= 1.5;
    return m;
  };
  H.maxHp = p => Math.round(80 + p.mass * 10 + (H.ups(p).dur || 0) * 12 + (rpg().lvl - 1) * 4);
  H.maxSt = p => Math.round(70 + (H.ups(p).sta || 0) * 8 + (rpg().lvl - 1) * 2);
  const xpNeed = l => 110 + 90 * (l - 1) + 15 * (l - 1) * (l - 1);
  H.xpNeed = xpNeed;
  H.addXP = function (n, where) {
    if (n <= 0) return; const r = rpg(); r.xp += Math.round(n); if (where) H.floatText('+' + Math.round(n) + ' XP', where, { cls: 'xp' });
    while (r.xp >= xpNeed(r.lvl)) { r.xp -= xpNeed(r.lvl); r.lvl++; r.sp++; const p = H.players[0]; if (p) { p.hp = H.maxHp(p); p.st = H.maxSt(p); } H.ui.banner('⬆ Level ' + r.lvl, 'You earned a skill point — spend it in Animals → Stats'); H.Audio.sfx('unlock'); H.stat('level', r.lvl, true); }
    H.dirty();
  };

  // ------------------------------------------------------------------ gear (passive effects)
  H.hasGear = id => !!(H.state.gearOn && H.state.gearOn[id]);
  const dmgFactor = () => { let f = 1; if (H.hasGear('vest')) f *= 0.65; if (H.hasGear('kinetic')) f *= 0.9; if (H.hasGear('bulwark')) f *= 0.6; if (H.hasGear('aegis')) f *= 0.5; return f; };
  H.noKnock = p => !p.isRemote && (H.hasGear('kinetic') || H.hasGear('aegis')) && !p.dead;

  // ------------------------------------------------------------------ health, damage, death
  H.hurtPlayer = function (p, dmg) {
    if (!p || p.isRemote || p.dead || !(dmg > 0.5)) return; if (rpg().god) return;
    if (p.hp === undefined) { p.hp = H.maxHp(p); p.st = H.maxSt(p); }
    dmg *= 1.15 * (1 - (H.ups(p).dur || 0) * 0.02) * dmgFactor();
    if (H.hasGear('shield') && (p.shield || 0) > 0) { const a = Math.min(p.shield, dmg); p.shield -= a; dmg -= a; }
    p.hp -= dmg; p.hurtT = 0; p.combatT = 0;
    if (p.idx === 0) { const h = document.getElementById('hurtFx'); if (h) { h.style.opacity = Math.min(0.8, 0.25 + dmg / 40); clearTimeout(h._t); h._t = setTimeout(() => (h.style.opacity = 0), 220); } }
    if (dmg >= 4) H.floatText('-' + Math.round(dmg), p.pos, { cls: 'dmg' });
    if (H.hasGear('medic') && p.hp < H.maxHp(p) * 0.25 && (performance.now() - (p.medicT || -1e9)) > 60000) { p.medicT = performance.now(); p.hp += 60; H.toast('💉 Auto-medkit kicked in'); }
    if (p.hp <= 0) H.playerDie(p);
  };
  H.playerDie = function (p) {
    p.hp = 0; p.dead = true; if (p.vehicle) p.vehicle.exit(p); if (p.mount) H.dismount(p);
    p.startRagdoll(4); H.ui.banner('💫 Knocked out', 'You wake up somewhere safer…'); H.Audio.sfx('fail');
    H.stat('deaths', 1); H.heatLevel = 0; H.clearCops && H.clearCops();
    
    setTimeout(() => {
      p.dead = false; p.ragdoll = null; p.hp = H.maxHp(p); p.st = H.maxSt(p); p.parts.rig.rotation.set(0, 0, 0);
      let x = 30, z = 62; const s = H.state.spawn && H.PROP[H.state.spawn]; if (s) { x = s.door.x; z = s.door.z + 2; }
      if (p.interior) p.interior = null; p.teleport(x, H.groundAt(x, z, 999) + 0.5, z); H.ui.fade();
    }, 4000);
  };
  // NPC health & knock-outs
  const NPC = H.NPCClass.prototype;
  NPC.ensureHp = function () { if (this.hp === undefined) { this.maxHp = H.speciesOf(this).hp; this.hp = this.maxHp; } };
  const origKnock = NPC.knock;
  NPC.knock = function (ix, iy, iz, by, dmg) {
    if (!this.active) return; this.ensureHp();
    const d = dmg !== undefined ? dmg : Math.hypot(ix, iy, iz) * 0.5 * (by && by.isPlayer ? H.statMul(by, 'str') : 1);
    origKnock.call(this, ix, iy, iz, by); this.hurt(d, by);
  };
  NPC.hurt = function (d, by) {
    if (this.dead || !this.active) return; this.ensureHp(); this.hp -= d;
    if (d >= 3 && by && (by.isPlayer || by.isRemote)) H.floatText('-' + Math.round(d), this.pos, { cls: 'dmg' });
    const sp = H.speciesOf(this); if (sp.fighter && by && by.isPlayer) { this.angry = 15; this.chase = by; }
    if (this.hp <= 0) this.die(by);
  };
  NPC.die = function (by) {
    if (this.dead) return; this.dead = true; this.downT = 0; this.hp = 0; this.state = 'down'; this.angry = 0;
    if (!this.ragdoll) this.ragdoll = { t: 0, spin: new V(0, 0, 3) };
    const sp = H.speciesOf(this);
    if (by && by.isPlayer) {
      H.addXP(sp.xp || 5, this.pos); if (sp.coins) H.addCoins(sp.coins, sp.name);
      if (!this.isHuman) { const b = rpg().bestiary; b[this.type] = (b[this.type] || 0) + 1; H.stat('kills', 1); if (sp.boss) { H.stat('bossKills', 1); H.ui.banner('👑 The Bramble King falls!', '+' + sp.xp + ' XP'); } }
      else { H.heat(this.type === 'officer' || this.type === 'swat' ? 1.2 : 0.6); H.stat('kos', 1); }
    }
  };
  const origUpdate = NPC.update;
  NPC.update = function (dt) {
    if (this.dead && !this.ragdoll && !this.held) {
      this.downT += dt; const P = this.parts; P.rig.rotation.set(0, 0, Math.PI / 2 * 0.95); P.rig.position.y = this.radius * 0.5; this.model.position.copy(this.pos);
      if (this.downT > (this.isHuman ? 25 : 40)) {
        this.dead = false; this.hp = this.maxHp; P.rig.rotation.set(0, 0, 0); P.rig.position.y = 0; this.state = 'idle';
        if (!this.isHuman || this.zone.temp) { if (this.zone.temp) { this.gone = true; return; } this.pos.copy(this.home); this.pos.y = H.groundAt(this.home.x, this.home.z, 999, this.interior); }
        else this.say('hit');
      }
      return;
    }
    const sp = H.speciesOf(this);
    if (sp.fighter && !sp.neutral && !this.angry && !this.dead) { const p = H.players[0]; if (p && !p.dead && (p.interior || null) === (this.interior || null) && H.dist2(p.pos.x, p.pos.z, this.pos.x, this.pos.z) < (sp.sense || 20) ** 2) { this.angry = 12; this.chase = p; } }
    if (this.type === 'swat' || this.type === 'soldier' || this.type === 'alien' || this.type === 'robot') return shooterAI.call(this, dt);
    return origUpdate.call(this, dt);
  };
  // armed enforcers keep their distance and shoot
  function shooterAI(dt) {
    if (this.ragdoll) return this.updateRagdoll(dt);
    const p = H.players[0]; const tgt = p.vehicle ? p.vehicle.pos : p.pos; const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    this.yaw = H.angLerp(this.yaw, Math.atan2(dx, dz), dt * 6);
    const want = d > 22 ? 8 : d < 10 ? -4 : 0; this.pos.x += Math.sin(this.yaw) * want * dt; this.pos.z += Math.cos(this.yaw) * want * dt;
    H.collideStatic(this.pos, this.radius, this.height, this.interior); this.pos.y = H.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, this.interior);
    this.model.position.copy(this.pos); this.model.rotation.set(0, this.yaw, 0); this.phase += dt * Math.abs(want) * 2; const s = Math.sin(this.phase) * (want ? 1 : 0); this.parts.legs.forEach((l, i) => (l.rotation.x = s * (i % 2 ? -0.8 : 0.8)));
    if (this.parts.arms) { this.parts.arms[1].rotation.x = -1.5; this.parts.arms[0].rotation.x = -1.3; }
    this.shotT = (this.shotT || Math.random()) - dt;
    if (d < 45 && this.shotT <= 0 && !p.dead) {
      const tier = { swat: [3, 0.45], soldier: [4, 0.5], alien: [5, 0.52], robot: [6, 0.55] }[this.type]; this.shotT = 0.5 + Math.random() * 0.4;
      const o = new V(this.pos.x, this.pos.y + 1.4, this.pos.z), hit = Math.random() < tier[1]; const end = new V(tgt.x + (hit ? 0 : (Math.random() - 0.5) * 4), tgt.y + 1, tgt.z + (hit ? 0 : (Math.random() - 0.5) * 4));
      H.tracer && H.tracer(o, end, this.type === 'alien' ? '#7aff9a' : this.type === 'robot' ? '#7ac8ff' : '#ffd27a'); H.Audio.sfx('click', 0.4);
      if (hit) { if (p.vehicle) p.vehicle.damage(tier[0] * 1.5, null); else H.hurtPlayer(p, tier[0]); }
    }
    if (H.heatLevel < 1 && this.zone.temp && this.zone.wanted) this.gone = true;
  }

  // ------------------------------------------------------------------ heavy attacks, sounds, sniff
  const HEAVY = { leap: ['Pounce', 14], dash: ['Charge', 20], slam: ['Ground pound', 24], swoop: ['Swoop', 12] };
  H.heavyOf = def => def.kind === 'bird' ? 'swoop' : def.kind === 'biped' || ['bear', 'gorilla', 'elephant', 'panda', 'mechabear', 'trex', 'mossback'].includes(def.id) ? 'slam' : ['goat', 'boar', 'rhino', 'cow', 'bull', 'croc', 'trike', 'camel', 'pig', 'sheep', 'shark'].includes(def.id) ? 'dash' : 'leap';
  const SOUND = { bark: 'Bark', meow: 'Meow', bleat: 'Bleat', baa: 'Baa', moo: 'Moo', oink: 'Oink', neigh: 'Neigh', squeak: 'Squeak', cluck: 'Cluck', roar: 'Roar', growl: 'Growl', howl: 'Howl', grunt: 'Grunt', hiss: 'Hiss', trumpet: 'Trumpet', snort: 'Snort', screech: 'Screech', hoot: 'Hoot' };
  const NOSE = ['dog', 'pitbull', 'wolf', 'fox', 'bear', 'boar', 'pig', 'eagle', 'cat', 'shark', 'lion', 'tiger', 'owl', 'trex', 'babyraptor'];
  H.canSniff = def => NOSE.includes(def.id);
  H.heavyAttack = function (p) {
    const kind = H.heavyOf(p.def), [name, cost] = HEAVY[kind]; if ((p.cd.heavy || 0) > 0) return; if (p.st < cost) { H.toast('Too tired — rest a moment'); return; }
    p.st -= cost; p.cd.heavy = kind === 'swoop' ? 2.5 : 3.5; p.emote = null;
    if (kind === 'leap') { p.dash(18 + p.def.stats.spd * 0.6, 10, 0.7); setTimeout(() => p.attack(1.8, 1.3), 260); }
    if (kind === 'dash') { p.dash(26, 1, 0.9); setTimeout(() => p.attack(2.2, 1.2), 200); }
    if (kind === 'slam') { p.vel.y = 8; p.onGround = false; p.atkAnim = 0.5; setTimeout(() => p.shockwave(12, 34 * H.statMul(p, 'str'), 14, true), 330); }
    if (kind === 'swoop') { p.dash(30, -2, 0.6); setTimeout(() => p.attack(1.5, 1.6), 200); }
    H.Audio.sfx('swoosh'); H.stat('specials', 1);
  };
  H.animalSound = function (p) {
    if ((p.cd.sound || 0) > 0) return; p.cd.sound = 1.6; H.Audio.voice(p.def.voice, 1);
    const menace = Math.min(1, p.mass / 4), x = p.pos.x, z = p.pos.z; const charm = ['cat', 'rabbit', 'hamster', 'chicken', 'penguin', 'owl', 'babyraptor'].includes(p.def.id);
    for (const n of H.NPCs.near(x, z, 16)) {
      if (n.dead || n.ragdoll) continue; const sp = H.speciesOf(n);
      if (charm && n.isHuman && !['officer', 'swat', 'soldier'].includes(n.type) && Math.random() < 0.6) { n.state = 'walk'; n.target = { x: p.pos.x + 1.2, z: p.pos.z }; n.t = 6; n.petting = p; H.floatText(H.pick(['Aww!', 'Who\'s a good one?', 'So cute!', 'Come here!']), n.pos, { follow: n, cls: 'speech', life: 2.2, rise: 0 }); }
      else if (!n.isHuman && sp.prey && (n.def && n.def.stats.mass < 1.5)) { n.sleep(3); }
      else if (n.isHuman && Math.random() < menace + 0.3) n.scare(p);
    }
    H.emit('roar', p);
  };
  // people who were charmed come over and pet you
  H.updatePets = function (dt) {
    const p = H.players[0]; if (!p) return;
    for (const n of H.NPCs.near(p.pos.x, p.pos.z, 3)) if (n.petting === p && !n.dead) { n.petting = null; n.state = 'idle'; n.t = 3; n.yaw = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z); p.hp = Math.min(H.maxHp(p), (p.hp || 0) + 15); H.stat('pets', 1); H.floatText('♥', p.pos, { cls: 'big' }); H.Audio.sfx('ding'); if (Math.random() < 0.4) H.addCoins(5, 'Treat'); }
  };
  let sniffT = 0;
  H.updateSniff = function (p, dt, holding) {
    document.body.classList.toggle('sniffing', !!holding);
    if (!holding) return; sniffT -= dt; if (sniffT > 0) return; sniffT = 0.12;
    const range = 150 + (H.ups(p).spd || 0) * 5, targets = [];
    for (const c of H.collectibles) { if (!c.mesh || H.state.found[c.id]) continue; if ((c.interior || null) !== (p.interior ? p.interior.id : null)) continue; const d = H.dist2(c.x, c.z, p.pos.x, p.pos.z); if (d < range * range) targets.push([d, c.x, c.y, c.z, c.type === 'paw' ? '#f0a93a' : '#ffd76a']); }
    for (const n of H.NPCs.list) if (n.active && n.dead && !n.isHuman) { const d = H.dist2(n.pos.x, n.pos.z, p.pos.x, p.pos.z); if (d < range * range) targets.push([d, n.pos.x, n.pos.y, n.pos.z, '#ff6a6a']); }
    const A = H.missions.active; if (A && A.dig) targets.push([0, A.dig.x, H.terrainH(A.dig.x, A.dig.z), A.dig.z, '#ffffff']);
    targets.sort((a, b) => a[0] - b[0]);
    for (const [, x, y, z, col] of targets.slice(0, 4)) {
      const dx = x - p.pos.x, dy = y - p.pos.y, dz = z - p.pos.z, L = Math.hypot(dx, dz) || 1; const c = new THREE.Color(col);
      for (let k = 1; k < 8; k++) { const t = k / 8 * Math.min(1, 40 / L); H.fx.spawn(p.pos.x + dx * t, p.pos.y + 0.6 + dy * t * 0.5 + Math.sin(performance.now() * 0.004 + k) * 0.2, p.pos.z + dz * t, 0, 0.3, 0, c, 0.22, 0.6, 0); }
      H.fx.spawn(x, y + 1.5, z, 0, 2, 0, c, 0.5, 0.8, 0);
    }
  };

  // ------------------------------------------------------------------ eating & hijacking (interactions)
  const origNear = H.Player.prototype.nearestInteract;
  H.Player.prototype.nearestInteract = function () {
    const best = origNear.call(this);
    if (best && best.kind === 'vehicle') return best;
    for (const n of H.NPCs.near(this.pos.x, this.pos.z, this.radius + 2.5)) if (n.dead && !n.isHuman && H.speciesOf(n).food) return { kind: 'custom', label: 'Eat the ' + H.speciesOf(n).name.toLowerCase(), fn: p => { const f = H.speciesOf(n).food; p.hp = Math.min(H.maxHp(p), (p.hp || 0) + f); p.st = H.maxSt(p); H.Audio.sfx('dig'); H.floatText('+' + f + ' HP', p.pos, { cls: 'xp' }); n.downT = 999; } };
    if (!this.interior) for (const c of H.traffic) { if (c.wrecked) continue; if (H.dist2(c.pos.x, c.pos.z, this.pos.x, this.pos.z) < (c.def.size[2] / 2 + 3) ** 2) return { kind: 'custom', label: 'Hijack the ' + c.def.name, fn: p => H.hijack(p, c) }; }
    return best;
  };
  H.hijack = function (p, c) {
    const v = new H.Vehicle(c.def, c.pos.x, c.pos.z, c.yaw, { paint: c.model.paintMat.color.getStyle() }); v.pos.y = c.pos.y; v.place(); v.enter(p);
    c.place(p.pos); H.stat('hijacks', 1); H.heat(0.8); H.Audio.sfx('horn'); H.floatText('HIJACKED!', p.pos, { cls: 'big' });
    if (c.def.id === 'police') H.stat('copCars', 1);
  };

  // ------------------------------------------------------------------ wanted level: police, police cars, SWAT, army
  H.cops = [];
  function spawnEnforcer(type, p) {
    for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28, d = 55 + Math.random() * 30; const x = p.pos.x + Math.cos(a) * d, z = p.pos.z + Math.sin(a) * d; if (H.terrainH(x, z) < 0.5) continue; const n = H.NPCs.add({ x, z, r: 2, type, temp: 1, wanted: 1 }); n.materialize(); n.state = 'chase'; n.chase = p; if (type !== 'officer') { n.parts.root.traverse(o => { if (o.isMesh && o.material && o.material.color && Math.random() < 0.6) { o.material = o.material.clone(); o.material.color.set(type === 'swat' ? '#2a2a32' : type === 'soldier' ? '#4a5a2a' : type === 'alien' ? '#3ac86a' : '#9aa8b8'); } }); } return n; }
  }
  function spawnCopCar(p) {
    const roads = H.ROADS.filter(r => r.samples); let best = null, bd = 1e12;
    for (const r of roads) for (const s of r.samples) { const d = Math.abs(H.dist2(s.x, s.z, p.pos.x, p.pos.z) - 90 * 90); if (d < bd) { bd = d; best = s; } }
    if (!best) return; const v = new H.Vehicle(H.VEHICLE[Math.random() < 0.3 ? 'policebike' : 'police'], best.x, best.z, 0); v.ai = true; v.cop = true; H.cops.push(v);
  }
  H.clearCops = function () { for (const v of H.cops) if (!v.dead) v.remove(); H.cops = []; for (const n of H.NPCs.list) if (n.zone.wanted) n.gone = true; };
  let copT = 0, lastStars = 0, escapeT = 0;
  H.updateWanted = function (dt) {
    const p = H.players[0]; if (!p || !H.settings.animalControl) return; const stars = Math.floor(H.heatLevel);
    if (stars > lastStars) { const msg = ['', 'Police are on the way!', 'Police cars are hunting you!', 'SWAT teams are on the way!', 'The army has been called in!', 'Everything is coming for you!'][Math.min(5, stars)]; if (msg) H.toast('🚨 ' + msg, 'bad'); H.state.fame = Math.max(H.state.fame || 0, stars); }
    if (stars === 0 && lastStars > 0) { H.toast('😎 You shook off the law'); H.stat('escaped', 1); H.clearCops(); }
    lastStars = stars; copT -= dt; if (copT > 0 || stars === 0 || p.dead || p.interior) return; copT = 2;
    const count = t => H.NPCs.list.filter(n => n.zone.wanted && n.type === t && !n.dead && !n.gone).length;
    const planet = H.onPlanet(p); const foot = planet ? 'alien' : 'officer';
    if (count(foot) < Math.min(8, stars * 2)) spawnEnforcer(foot, p);
    if (stars >= 3 && count(planet ? 'robot' : 'swat') < (stars - 2) * 2) spawnEnforcer(planet ? 'robot' : 'swat', p);
    if (stars >= 4 && !planet && count('soldier') < (stars - 3) * 3) spawnEnforcer('soldier', p);
    H.cops = H.cops.filter(v => !v.dead && H.vehicles.includes(v));
    if (stars >= 2 && !planet && H.cops.length < Math.min(4, stars - 1)) spawnCopCar(p);
  };
  // police cars drive themselves at you
  H.updateCopCars = function (dt) {
    const p = H.players[0]; if (!p) return;
    for (const v of H.cops) {
      if (v.dead || v.driver) continue; const tgt = p.vehicle ? p.vehicle.pos : p.pos; const dx = tgt.x - v.pos.x, dz = tgt.z - v.pos.z, d = Math.hypot(dx, dz);
      let diff = Math.atan2(dx, dz) - v.yaw; diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      v.drive(dt, { mx: H.clamp(-diff * 2, -1, 1), mz: d > 8 || Math.abs(v.spd) < 10 ? 1 : 0.3, jump: false, sprint: d > 60 }, null);
      v.sirenT = (v.sirenT || 0) - dt; if (v.sirenT <= 0 && d < 80) { v.sirenT = 1.2; H.Audio.sfx('horn', 0.25); }
      if (d > 400) { v.remove(); }
    }
  };

  // ------------------------------------------------------------------ per-frame upkeep
  H.updateVitals = function (dt, inp) {
    const p = H.players[0]; if (!p) return;
    if (p.hp === undefined) { p.hp = H.maxHp(p); p.st = H.maxSt(p); p.shield = 60; }
    p.hurtT = (p.hurtT || 0) + dt; p.combatT = (p.combatT || 0) + dt;
    if (!p.dead) {
      let regen = p.hurtT > 6 ? 2 : 0; if (H.hasGear('nano') && p.hurtT > 4) regen += 3; if (H.hasGear('charm')) regen += 5;
      p.hp = Math.min(H.maxHp(p), p.hp + regen * dt);
      const moving = p.speed > 1 && !p.vehicle;
      if (inp && inp.sprint && moving && p.onGround) p.st = Math.max(0, p.st - 14 * dt); else p.st = Math.min(H.maxSt(p), p.st + (H.hasGear('cell') ? 30 : 12) * dt);
      if (H.hasGear('shield') && p.hurtT > 5) p.shield = Math.min(60, (p.shield || 0) + 10 * dt);
    }
  };
  // stamina gates sprinting and specials; sniff/heavy/sound keys are read here
  const origPlayerUpdate = H.Player.prototype.update;
  H.Player.prototype.update = function (dt, inp) {
    if (this.dead) { inp = Object.assign({}, inp, { mx: 0, mz: 0, jumpPressed: false, attack: false, grab: false, special: false, interact: false, ragdoll: false }); }
    else if (this.idx === 0 && !this.isRemote) {
      if (this.st !== undefined && this.st <= 1) inp.sprint = false;
      if (inp.special && this.st !== undefined) { if (this.st < 10) inp.special = false; else if ((this.cd.sp || 0) <= 0 && !this.vehicle) this.st -= 10; }
      if (!this.vehicle && !this.ride && !this.mount) { if (inp.heavy) H.heavyAttack(this); if (inp.sound) H.animalSound(this); }
      H.updateSniff(this, dt, inp.sniff && !this.vehicle && H.canSniff(this.def));
    }
    return origPlayerUpdate.call(this, dt, inp);
  };
})();
