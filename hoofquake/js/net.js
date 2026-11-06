// Hoofquake — online multiplayer.
// Two transports share one model: every player publishes a small merge-patched "presence" object
// (position, animal, outfit, vehicle, a short ring of events). Remote players are rendered from it.
//   • ServerTransport — WebSocket to the Hoofquake server (server/server.js) when the page is served by it.
//   • RoomTransport   — the claude.ai artifact `room` capability, when the game runs as an artifact.
'use strict';
(function () {
  const V = THREE.Vector3;
  const SEND_MS = 100;           // presence send interval
  const RING = 8;                // recent events kept in presence
  const $ = s => document.querySelector(s);

  // ------------------------------------------------------------------ transports
  class ServerTransport {
    constructor(room, name) { this.kind = 'server'; this.room = room; this.name = name; this.peers = new Map(); this.myId = null; this.retry = 1000; this.connect(); }
    connect() {
      const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
      let ws; try { ws = new WebSocket(url); } catch (e) { this.status = 'error'; return; }
      this.ws = ws; this.status = 'connecting';
      ws.onopen = () => { this.retry = 1000; ws.send(JSON.stringify({ t: 'hello', room: this.room, name: this.name })); };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'welcome') { this.myId = m.id; this.room = m.room; this.status = 'online'; this.peers.clear(); for (const p of m.peers) this.peers.set(p.id, Object.assign({}, p.d)); if (this.full) this.send(this.full); H.Net.onPeers([...this.peers.keys()], []); H.ui && H.ui.toast(`🌐 Joined room "${m.room}" · ${m.peers.length + 1} online`); }
        else if (m.t === 'join') { this.peers.set(m.id, Object.assign({}, m.d)); H.Net.onPeers([m.id], []); }
        else if (m.t === 'left') { this.peers.delete(m.id); H.Net.onPeers([], [m.id]); }
        else if (m.t === 'states') { for (const s of m.s) { const cur = this.peers.get(s.id) || {}; for (const [k, v] of Object.entries(s.d)) { if (v === null) delete cur[k]; else cur[k] = v; } this.peers.set(s.id, cur); } }
        else if (m.t === 'error') { this.status = 'error'; this.err = m.msg; H.ui && H.ui.toast(m.msg, 'bad'); }
      };
      ws.onclose = () => { if (this.closed) return; this.status = 'reconnecting'; const gone = [...this.peers.keys()]; this.peers.clear(); H.Net.onPeers([], gone); setTimeout(() => !this.closed && this.connect(), this.retry); this.retry = Math.min(15000, this.retry * 2); };
    }
    send(patch) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'state', d: patch })); }
    setFull(full) { this.full = full; }
    list() { return [...this.peers.entries()].map(([id, d]) => ({ id, d })); }
    close() { this.closed = true; try { this.ws.close(); } catch (e) { } }
  }

  class RoomTransport {
    constructor(room) {
      this.kind = 'room'; this.r = room; this.status = 'online'; this.myId = null; this.known = new Set();
      this.unsub = room.onPeers(ch => {
        for (const p of ch.peers) if (p.isMe && p.sameTab) this.myId = p.peer;
        const joined = ch.joined.filter(p => !(p.isMe && p.sameTab) && p.kind === 'viewer').map(p => p.peer);
        const left = ch.left.map(p => p.peer);
        H.Net.onPeers(joined, left);
      }, e => { this.status = 'error'; this.err = e.message; });
    }
    send(patch) { this.r.presence(patch).catch(() => { }); }
    setFull() { }
    list() { return this.r.peers().filter(p => !(p.isMe && p.sameTab) && p.kind === 'viewer').map(p => ({ id: p.peer, d: p.presence || {}, guest: p.guest })); }
    close() { try { this.unsub(); } catch (e) { } }
  }

  // Peer-to-peer play for a static website (GitHub Pages): no game server anywhere.
  // Everyone on the same page + room meets through PeerJS's public broker. The first player to claim
  // the room's well-known id hosts the room in their tab (the same relay the Node server runs);
  // everyone else connects to them over WebRTC. If the host leaves, guests race to become the new host.
  class P2PTransport {
    constructor(room, name) { this.dbg = /[?&]broker=/.test(location.search); this.kind = 'p2p'; this.room = room; this.name = name; this.peers = new Map(); this.myId = null; this.status = 'connecting'; this.tries = 0; this.claim(); }
    broker() {
      const b = new URLSearchParams(location.search).get('broker');
      if (!b) return { debug: 0 };
      const [host, port] = b.split(':'); return { debug: 1, host: host || 'localhost', port: Number(port || 9000), path: '/', secure: location.protocol === 'https:' };
    }
    hostId() { return 'hoofquake-v1-' + this.room; }
    reset() { try { this.peer && this.peer.destroy(); } catch (e) { } this.peer = null; this.conn = null; this.hosting = false; clearInterval(this.tick); clearInterval(this.gtick); const gone = [...this.peers.keys()]; this.peers.clear(); if (gone.length) H.Net.onPeers([], gone); }
    claim() {
      if (this.closed) return; this.reset(); this.status = 'connecting';
      let peer; try { peer = new window.Peer(this.hostId(), this.broker()); } catch (e) { this.status = 'error'; this.err = 'WebRTC is not available in this browser.'; return; }
      this.peer = peer; let decided = false;
      peer.on('open', () => { decided = true; this.becomeHost(); });
      peer.on('error', e => {
        if (this.dbg) console.log('[p2p] claim error', e.type, decided);
        if (e.type === 'unavailable-id' && !decided) { decided = true; this.becomeGuest(); return; }
        if (!decided || this.hosting) { this.status = 'error'; this.err = 'Could not reach the matchmaking broker (' + e.type + ').'; this.retry(); }
      });
    }
    retry() { if (this.closed) return; const wait = Math.min(15000, 1500 * ++this.tries) + Math.random() * 1500; setTimeout(() => this.claim(), wait); }
    // ----- host: same relay logic as server/server.js
    becomeHost() {
      this.hosting = true; this.myId = 'h'; this.status = 'online'; this.tries = 0; this.clients = new Map(); this.nextId = 1; this.mine = {};
      H.ui && H.ui.toast(`🌐 Hosting room "${this.room}" — friends on this page join you`);
      this.peer.on('connection', conn => {
        const c = { id: 'g' + this.nextId++, conn, d: {}, dirty: {}, has: false, joined: false, seen: Date.now() };
        if (this.dbg) console.log('[p2p] host got connection', conn.peer);
        conn.on('data', m => { c.seen = Date.now(); if (this.dbg) console.log('[p2p] host data', JSON.stringify(m).slice(0, 80)); try { this.hostMsg(c, m); } catch (e) { console.log('[p2p] host err', e.message); } });
        conn.on('open', () => this.dbg && console.log('[p2p] host conn open'));
        conn.on('close', () => { if (this.dbg) console.log('[p2p] host conn close'); if (!this.clients.has(c.id)) return; this.clients.delete(c.id); this.peers.delete(c.id); this.bcast({ t: 'left', id: c.id }); H.Net.onPeers([], [c.id]); });
        conn.on('error', () => { });
      });
      this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { } });
      this.tick = setInterval(() => {
        const now = Date.now(); if (now - (this.pingT || 0) > 3000) { this.pingT = now; for (const c of this.clients.values()) { if (now - c.seen > 12000) { try { c.conn.close(); } catch (e) { } this.clients.delete(c.id); this.peers.delete(c.id); this.bcast({ t: 'left', id: c.id }); H.Net.onPeers([], [c.id]); } else this.sendTo(c, { t: 'ping' }); } }
        const s = [];
        if (this.mineHas) { s.push({ id: 'h', d: this.mineDirty }); this.mineDirty = {}; this.mineHas = false; }
        for (const c of this.clients.values()) if (c.has) { s.push({ id: c.id, d: c.dirty }); c.dirty = {}; c.has = false; }
        if (!s.length) return;
        for (const c of this.clients.values()) { const mine = s.filter(x => x.id !== c.id); if (mine.length && c.joined) this.sendTo(c, { t: 'states', s: mine }); }
      }, 50);
    }
    sendTo(c, m) { try { if (c.conn.open) c.conn.send(m); } catch (e) { } }
    bcast(m, except) { for (const c of this.clients.values()) if (c !== except && c.joined) this.sendTo(c, m); }
    hostMsg(c, m) {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'hello' && !c.joined) {
        if (this.clients.size >= 16) { this.sendTo(c, { t: 'error', msg: 'This room is full (16 players). Try another room.' }); return; }
        c.joined = true; c.d = { n: String(m.name || 'Player').slice(0, 20) }; this.clients.set(c.id, c); this.peers.set(c.id, c.d);
        const others = [{ id: 'h', d: this.full || {} }].concat([...this.clients.values()].filter(x => x !== c).map(x => ({ id: x.id, d: x.d })));
        this.sendTo(c, { t: 'welcome', id: c.id, room: this.room, peers: others }); this.bcast({ t: 'join', id: c.id, d: c.d }, c); H.Net.onPeers([c.id], []);
      } else if (m.t === 'state' && c.joined && m.d && typeof m.d === 'object') {
        if (JSON.stringify(m.d).length > 6144) return;
        for (const [k, v] of Object.entries(m.d)) { if (!/^[a-z]{1,4}$/i.test(k)) continue; if (v === null) delete c.d[k]; else c.d[k] = k === 'n' ? String(v).slice(0, 20) : v; c.dirty[k] = v; c.has = true; }
      }
    }
    // ----- guest
    becomeGuest() {
      this.reset(); let peer; try { peer = new window.Peer(this.broker()); } catch (e) { return this.retry(); }
      this.peer = peer; if (this.dbg) console.log('[p2p] guest peer created');
      peer.on('open', () => {
        if (this.dbg) console.log('[p2p] guest open', peer.id);
        const conn = peer.connect(this.hostId(), { serialization: 'json' }); this.conn = conn; if (this.dbg) { const oc = conn.close.bind(conn); conn.close = (...x) => { console.log('[p2p] close() by ' + new Error().stack.split('\n').slice(2, 6).join(' <- ')); return oc(...x); }; const od = peer.destroy.bind(peer); peer.destroy = () => { console.log('[p2p] destroy() by ' + new Error().stack.split('\n').slice(2, 6).join(' <- ')); return od(); }; }
        const giveUp = setTimeout(() => { if (this.status !== 'online' && !conn.open) this.claim(); }, 15000);
        conn.on('open', () => { if (this.dbg) console.log('[p2p] conn open'); conn.send({ t: 'hello', name: this.name }); });
        this.hostSeen = Date.now(); clearInterval(this.gtick); this.gtick = setInterval(() => { if (!conn.open) return; try { conn.send({ t: 'ping' }); } catch (e) { } if (this.status === 'online' && Date.now() - this.hostSeen > 12000) { clearInterval(this.gtick); H.Net.sys('Lost the host — finding a new one…'); this.claim(); } }, 3000);
        conn.on('data', m => {
          this.hostSeen = Date.now(); if (!m || typeof m !== 'object') return;
          if (m.t === 'welcome') { clearTimeout(giveUp); this.myId = m.id; this.status = 'online'; this.tries = 0; this.peers.clear(); for (const p of m.peers) this.peers.set(p.id, Object.assign({}, p.d)); if (this.full) this.send(this.full); H.Net.onPeers([...this.peers.keys()], []); H.ui && H.ui.toast(`🌐 Joined room "${this.room}" · ${m.peers.length + 1} online`); }
          else if (m.t === 'join') { this.peers.set(m.id, Object.assign({}, m.d)); H.Net.onPeers([m.id], []); }
          else if (m.t === 'left') { this.peers.delete(m.id); H.Net.onPeers([], [m.id]); }
          else if (m.t === 'states') { for (const s of m.s || []) { const cur = this.peers.get(s.id) || {}; for (const [k, v] of Object.entries(s.d || {})) { if (v === null) delete cur[k]; else cur[k] = v; } this.peers.set(s.id, cur); } }
          else if (m.t === 'error') { this.status = 'error'; this.err = m.msg; H.ui && H.ui.toast(m.msg, 'bad'); }
        });
        conn.on('close', () => { if (this.dbg) console.log('[p2p] conn close'); if (this.closed) return; this.status = 'reconnecting'; H.Net.sys('Host left — finding a new host…'); setTimeout(() => this.claim(), 300 + Math.random() * 2000); });
      });
      peer.on('error', e => { if (this.dbg) console.log('[p2p] guest error', e.type, e.message); if (e.type === 'peer-unavailable') { setTimeout(() => this.claim(), 500 + Math.random() * 1500); } });
    }
    send(patch) {
      if (this.hosting) { this.mineDirty = Object.assign(this.mineDirty || {}, patch); this.mineHas = true; return; }
      if (this.conn && this.conn.open) try { this.conn.send({ t: 'state', d: patch }); } catch (e) { }
    }
    setFull(full) { this.full = full; }
    list() { return [...this.peers.entries()].map(([id, d]) => ({ id, d })); }
    close() { this.closed = true; this.reset(); }
  }

  // ------------------------------------------------------------------ remote player
  class RemotePlayer extends H.Player {
    constructor(id) { super(90); this.id = id; this.isRemote = true; this.isPlayer = false; this.target = new V(); this.has = false; this.lastSeq = null; this.d = {}; this.nameEl = null; this.vehModel = null; }
    apply(d) {
      this.d = d; const animal = H.ANIMAL[d.a] ? d.a : 'goat'; const okey = JSON.stringify(d.o || {});
      if (animal !== this.animalId || okey !== this.okey) { this.okey = okey; this.remoteOutfit = sanitizeOutfit(d.o); this.setAnimal(animal); }
      if (Array.isArray(d.p) && d.p.length === 3 && d.p.every(Number.isFinite)) {
        this.target.set(d.p[0], d.p[1], d.p[2]); if (!this.has || this.target.distanceTo(this.pos) > 40) { this.pos.copy(this.target); this.has = true; }
      }
      this.tyaw = Number.isFinite(d.y) ? d.y : this.yaw;
      this.flags = d.f | 0; this.interiorId = typeof d.i === 'string' ? d.i : null;
      const em = typeof d.e === 'string' && H.COSMETIC['emote:' + d.e] ? d.e : null;
      if (em !== this.emoteId) { this.emoteId = em; this.emote = em ? { id: em, t: 0 } : null; }
      this.applyVehicle(d.vh);
      // events
      if (Array.isArray(d.ev)) {
        const seqs = d.ev.map(e => (Array.isArray(e) ? e[0] : 0)).filter(Number.isFinite);
        const max = seqs.length ? Math.max(...seqs) : 0;
        if (this.lastSeq === null) this.lastSeq = max; // never replay history from before we met
        for (const e of d.ev) if (Array.isArray(e) && e[0] > this.lastSeq) H.Net.onEvent(this, e);
        this.lastSeq = Math.max(this.lastSeq, max);
      }
    }
    applyVehicle(vh) {
      const id = Array.isArray(vh) && H.VEHICLE[vh[0]] ? vh[0] : null;
      if (!id) { if (this.vehModel) { H.scene.remove(this.vehModel.root); this.vehModel = null; this.vehId = null; this.parts.root.scale.setScalar(1); } this.veh = null; return; }
      const paint = typeof vh[1] === 'string' && /^#[0-9a-f]{6}$/i.test(vh[1]) ? vh[1] : null;
      if (id !== this.vehId) { if (this.vehModel) H.scene.remove(this.vehModel.root); this.vehModel = H.buildVehicle(H.VEHICLE[id], paint); H.scene.add(this.vehModel.root); this.vehId = id; }
      this.veh = { yaw: +vh[2] || 0, pitch: +vh[3] || 0, roll: +vh[4] || 0, spd: +vh[5] || 0 };
    }
    knock(ix, iy, iz) { H.Net.event('h', this.id, Math.round(ix * 10) / 10, Math.round(iy * 10) / 10, Math.round(iz * 10) / 10); this.spinT = 0.6; }
    tick(dt) {
      const prev = this.pos.clone();
      this.pos.lerp(this.target, Math.min(1, dt * 10)); this.yaw = H.angLerp(this.yaw, this.tyaw || 0, Math.min(1, dt * 10));
      const v = this.pos.clone().sub(prev).divideScalar(Math.max(dt, 1e-3)); this.vel.lerp(v, Math.min(1, dt * 8));
      this.onGround = !!(this.flags & 1); const ragdoll = !!(this.flags & 2), water = !!(this.flags & 4), flying = !!(this.flags & 8);
      const myInterior = H.players[0].interior ? H.players[0].interior.id : null;
      const visible = (this.interiorId || null) === myInterior;
      this.root.visible = visible; if (this.vehModel) this.vehModel.root.visible = visible;
      if (this.vehModel && this.veh) {
        const m = this.vehModel.root; m.position.copy(this.pos); m.rotation.set(this.veh.pitch, this.veh.yaw, this.veh.roll, 'YXZ');
        this.vehModel.wheels.forEach(w => (w.spin.rotation.x += this.veh.spd * dt / 0.5)); if (this.vehModel.rotor) this.vehModel.rotor.rotation.y += dt * 30; if (this.vehModel.prop) this.vehModel.prop.rotation.z += dt * 20;
        const s = H.VEHICLE[this.vehId].size; this.root.position.set(this.pos.x, this.pos.y + s[1] * 0.45, this.pos.z); this.root.rotation.set(0, this.veh.yaw, 0);
        this.parts.root.scale.setScalar(this.height > 3.5 ? 0.6 : 1); this.animateIdle(dt); return;
      }
      this.root.position.copy(this.pos); this.root.rotation.set(0, this.yaw, 0);
      if (ragdoll || this.spinT > 0) { this.spinT = Math.max(0, (this.spinT || 0) - dt); const rig = this.parts.rig; rig.rotation.x += dt * 9; rig.rotation.z += dt * 6; this.parts.legs.forEach((l, i) => (l.rotation.x = Math.sin(performance.now() * 0.02 + i * 2) * 1.2)); return; }
      this.animate(dt, water, flying); if (visible) this.effects(dt);
    }
    dispose() { H.scene.remove(this.root); if (this.vehModel) H.scene.remove(this.vehModel.root); if (this.nameEl) this.nameEl.remove(); }
  }
  function sanitizeOutfit(o) {
    const out = { emotes: [] }; if (!o || typeof o !== 'object') return out;
    for (const s of H.SLOTS) { if (s.id === 'emote') continue; const id = o[s.id]; if (typeof id === 'string' && H.COSMETIC[id] && H.COSMETIC[id].slot === s.id) out[s.id] = id; }
    return out;
  }

  // ------------------------------------------------------------------ manager
  const Net = H.Net = {
    t: null, remotes: new Map(), seq: 0, ring: [], last: {}, sendT: 0, chatLog: [], online: false, mission: 0,
    async init() {
      this.name = (H.settings.name || '').trim();
      this.buildChat();
      // 1) our own server (page served by server/server.js)
      try {
        if (/^https?:$/.test(location.protocol)) {
          const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 2500);
          const r = await fetch('api/info', { signal: ctl.signal, cache: 'no-store' }); clearTimeout(to);
          if (r.ok && (r.headers.get('content-type') || '').includes('json')) { const j = await r.json(); if (j && j.hoofquake) { this.serverInfo = j; this.start(new ServerTransport(this.roomFromHash(), this.displayName())); return; } }
        }
      } catch (e) { /* not on our server */ }
      // 2) claude.ai artifact room
      try {
        if (window.claude && window.claude.use) {
          const room = await window.claude.use('room');
          if (room) {
            if (!this.name) { try { const u = await window.claude.use('user'); const me = u && (await u.me()); if (me && me.name) this.name = me.name.split(' ')[0]; } catch (e) { } }
            this.start(new RoomTransport(room)); return;
          }
        }
      } catch (e) { /* no room available */ }
      // 3) peer-to-peer through the public PeerJS broker (static hosting such as GitHub Pages)
      if (window.Peer && /^https?:$/.test(location.protocol)) { this.start(new P2PTransport(this.roomFromHash(), this.displayName())); return; }
      this.status = 'offline';
    },
    roomFromHash() { const h = (location.hash || '').replace('#', ''); return /^[a-z0-9-]{1,24}$/i.test(h) ? h.toLowerCase() : 'main'; },
    displayName() { if (!this.name) this.name = (H.ANIMAL[H.state.animal] || H.ANIMAL.goat).name + '-' + Math.floor(Math.random() * 9000 + 1000); return this.name.slice(0, 20); },
    start(t) { this.t = t; this.online = true; this.last = {}; this.sendT = 0; $('#netBadge').hidden = false; },
    stop() { if (this.t) this.t.close(); this.t = null; this.online = false; for (const r of this.remotes.values()) r.dispose(); this.remotes.clear(); H.remotes = []; $('#netBadge').hidden = true; },
    switchRoom(name) { if (!this.t || this.t.kind === 'room') return; const K = this.t.kind; this.stop(); location.hash = name; this.start(K === 'server' ? new ServerTransport(name, this.displayName()) : new P2PTransport(name, this.displayName())); },
    setName(n) { this.name = String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20); H.settings.name = this.name; H.saveSettings(); this.last.n = undefined; },
    onPeers(joined, left) {
      for (const id of left) { const r = this.remotes.get(id); if (r) { if (r.d.n) this.sys(`${r.d.n} left`); r.dispose(); this.remotes.delete(id); } }
      if (joined.length && this.ready) H.Audio.sfx('ding');
      this.ready = true;
    },
    // a short-lived event, carried in presence so every viewer can send it
    event(type, ...args) { this.seq++; this.ring.push([this.seq, type, ...args]); if (this.ring.length > RING) this.ring.shift(); this.sendT = 1e9; },
    onEvent(from, e) {
      const [, type, a, b, c, d] = e; const me = this.t && this.t.myId;
      if (type === 'h' && a === me) { const p = H.players[0]; if (!p.vehicle && [b, c, d].every(Number.isFinite)) { p.knock(H.clamp(b, -80, 80), H.clamp(c, -60, 60), H.clamp(d, -80, 80)); H.floatText(`${from.d.n || 'Someone'} got you!`, p.pos, { cls: 'big' }); } }
      if (type === 'c' && typeof a === 'string') { const txt = a.slice(0, 140); this.addChat(from.d.n || 'Someone', txt); H.floatText(txt, from.pos, { follow: from, cls: 'speech', life: 4, rise: 0 }); }
      if (type === 'done' && typeof a === 'string' && H.MISSION[a]) { this.sys(`🏁 ${from.d.n || 'Someone'} finished ${H.MISSION[a].name}`); if (H.missions.active && H.missions.active.m.id === a) H.ui.toast(`${from.d.n || 'Someone'} beat you to it!`); }
      if (type === 'sh' && typeof a === 'string' && [b, c, d, e[5], e[6], e[7]].every(Number.isFinite)) H.remoteShot(from, a, new V(b, c, d), new V(e[5], e[6], e[7]).normalize());
      if (type === 'wave' && a === me) { H.ui.toast(`👋 ${from.d.n || 'Someone'} waves at you`); }
    },
    sendChat(text) { text = String(text || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 140); if (!text || !this.online) return; this.event('c', text); this.addChat('You', text); H.floatText(text, H.players[0].pos, { follow: H.players[0], cls: 'speech', life: 4, rise: 0 }); },
    setMission(id) { this.mission = id || 0; },
    // ---------------- per-frame ----------------
    update(dt) {
      if (!this.t) return;
      // remotes from transport
      const list = this.t.list(); const seen = new Set();
      for (const { id, d } of list) {
        if (!d || !d.a) continue; seen.add(id);
        let r = this.remotes.get(id); if (!r) { r = new RemotePlayer(id); this.remotes.set(id, r); if (d.n) this.sys(`${d.n} joined`); }
        if (r.d !== d || this.t.kind !== 'room') r.apply(d);
      }
      for (const [id, r] of this.remotes) if (!seen.has(id)) { r.dispose(); this.remotes.delete(id); }
      H.remotes = [...this.remotes.values()];
      for (const r of H.remotes) r.tick(dt);
      // publish my presence
      this.sendT += dt * 1000; if (this.sendT >= SEND_MS) { this.sendT = 0; this.publish(); }
      this.tags();
      const n = this.remotes.size; $('#netBadge').textContent = `👥 ${n + 1} online`;
    },
    snapshot() {
      const p = H.players[0], o = p.outfit || {}; const r2 = v => Math.round(v * 100) / 100;
      const outfit = {}; for (const s of H.SLOTS) if (s.id !== 'emote' && o[s.id]) outfit[s.id] = o[s.id];
      const flags = (p.onGround ? 1 : 0) | (p.ragdoll ? 2 : 0) | (p.inWater ? 4 : 0) | (!p.onGround && p.def.stats.fly ? 8 : 0);
      const v = p.vehicle; const base = v ? v.pos : p.pos;
      const s = { n: this.displayName(), a: p.animalId, o: outfit, p: [r2(base.x), r2(base.y), r2(base.z)], y: r2(p.yaw), f: flags, e: p.emote ? p.emote.id : null, i: p.interior ? p.interior.id : null, vh: v ? [v.def.id, v.paint || null, r2(v.yaw), r2(v.pitch), r2(v.roll), Math.round(v.spd)] : null, m: this.mission || null, ev: this.ring.slice(), hm: this.homeData() };
      return s;
    },
    homeData() {
      const pid = H.state.openHouse; if (!pid || !H.state.props[pid]) return null;
      const furn = (H.state.props[pid].furn || []).slice(0, 30).map(f => [f.id, Math.round(f.x * 10) / 10, Math.round(f.z * 10) / 10, Math.round((f.ry || 0) * 100) / 100]);
      return { p: pid, f: furn };
    },
    publish() {
      const full = this.snapshot(); const patch = {}; let any = false;
      for (const k of Object.keys(full)) { const j = JSON.stringify(full[k]); if (j !== this.last[k]) { this.last[k] = j; patch[k] = full[k]; any = true; } }
      this.t.setFull(full);
      if (any) this.t.send(patch);
    },
    tags() {
      const cam = H.cameras[0], W = innerWidth, Hh = H.players.length > 1 ? innerHeight / 2 : innerHeight; const box = $('#tags'); const pr = new V();
      for (const r of this.remotes.values()) {
        if (!r.nameEl) { r.nameEl = document.createElement('div'); r.nameEl.className = 'tag'; box.appendChild(r.nameEl); }
        const name = r.d.n || 'Player'; if (r.nameEl.textContent !== name) r.nameEl.textContent = name;
        pr.copy(r.pos); pr.y += (r.vehModel ? H.VEHICLE[r.vehId].size[1] + 1 : r.height + 0.9); const dist = pr.distanceTo(cam.position); pr.project(cam);
        const show = r.root.visible && pr.z < 1 && Math.abs(pr.x) < 1.1 && Math.abs(pr.y) < 1.1 && dist < 220;
        r.nameEl.hidden = !show; if (show) { r.nameEl.style.left = ((pr.x + 1) / 2 * W) + 'px'; r.nameEl.style.top = ((1 - pr.y) / 2 * Hh) + 'px'; r.nameEl.style.opacity = H.clamp(1.4 - dist / 200, 0.35, 1); }
      }
    },
    // ---------------- chat UI ----------------
    buildChat() {
      const input = $('#chatInput');
      addEventListener('keydown', e => {
        if (!this.online || H.paused) return;
        if (document.activeElement === input) { if (e.code === 'Enter') { this.sendChat(input.value); input.value = ''; input.blur(); $('#chatForm').hidden = true; } else if (e.code === 'Escape') { input.blur(); $('#chatForm').hidden = true; } e.stopPropagation(); return; }
        if (e.code === 'Enter' || e.code === 'KeyT') { e.preventDefault(); this.openChat(); }
      }, true);
      $('#chatForm').addEventListener('submit', e => { e.preventDefault(); this.sendChat(input.value); input.value = ''; input.blur(); $('#chatForm').hidden = true; });
      $('#netBadge').onclick = () => H.ui.openMulti();
    },
    openChat() { if (!this.online) return; $('#chatForm').hidden = false; document.exitPointerLock && document.exitPointerLock(); setTimeout(() => $('#chatInput').focus(), 0); },
    addChat(who, text) {
      this.chatLog.push({ who, text, t: Date.now() }); if (this.chatLog.length > 50) this.chatLog.shift();
      const log = $('#chatLog'); const row = document.createElement('div'); row.className = 'chatRow'; const b = document.createElement('b'); b.textContent = who + ': '; const s = document.createElement('span'); s.textContent = text; row.append(b, s); log.appendChild(row);
      while (log.children.length > 7) log.firstChild.remove(); setTimeout(() => row.classList.add('old'), 12000);
    },
    sys(text) { const log = $('#chatLog'); const row = document.createElement('div'); row.className = 'chatRow sys'; row.textContent = text; log.appendChild(row); while (log.children.length > 7) log.firstChild.remove(); setTimeout(() => row.classList.add('old'), 8000); },
    statusText() {
      if (!this.t) return 'Offline. Online play needs the Hoofquake server, or this page opened as a claude.ai artifact.';
      if (this.t.kind === 'server') return this.t.status === 'online' ? `Connected to the Hoofquake server · room "${this.t.room}"` : this.t.status === 'error' ? 'Server error: ' + (this.t.err || 'unknown') : 'Connecting to the server…';
      if (this.t.kind === 'p2p') return this.t.status === 'online' ? (this.t.hosting ? `You're hosting room "${this.t.room}" — everyone who opens this page joins you.` : `Connected peer-to-peer · room "${this.t.room}"`) : this.t.status === 'error' ? (this.t.err || 'Connection problem') + ' Retrying…' : 'Looking for players…';
      return 'Connected through claude.ai · everyone you\'ve shared this page with who opens it joins the same world.';
    },
  };
  H.remotes = [];
})();
