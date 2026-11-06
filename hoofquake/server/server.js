// Hoofquake multiplayer server.
// Serves the game's static files and relays player state between everyone in the same room over WebSockets.
//
//   npm install && npm start          → http://localhost:8080  (PORT env var overrides)
//
// Protocol (JSON text frames):
//   client → server  {t:'hello', name, room}        join a room (sent once, first)
//                    {t:'state', d:{...}}           merge-patch of this player's public state (position, animal, events…)
//                    {t:'ping'}                     keepalive
//   server → client  {t:'welcome', id, room, peers:[{id, d}]}
//                    {t:'states', s:[{id, d}]}      batched patches from other players (20 Hz)
//                    {t:'join', id, d} / {t:'left', id} / {t:'error', msg}
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = path.resolve(__dirname, '..');
const MAX_ROOM = 24, MAX_ROOMS = 300, MAX_STATE = 6144, TICK_MS = 50, MAX_MSGS_PER_SEC = 40;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon' };

const rooms = new Map(); // name → { players: Map<id, client>, created }
let nextId = 1;

const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 20) || 'Player';
const cleanRoom = s => (String(s || 'main').toLowerCase().match(/[a-z0-9-]+/g) || ['main']).join('-').slice(0, 24) || 'main';

function roomList() { return [...rooms.entries()].map(([name, r]) => ({ name, players: r.players.size })).sort((a, b) => b.players - a.players).slice(0, 50); }

// ---------------- HTTP: static files + tiny API ----------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ hoofquake: true, version: 1, rooms: roomList(), maxRoom: MAX_ROOM }));
  }
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(ROOT, '.' + path.posix.normalize('/' + p));
  if (!file.startsWith(ROOT + path.sep) || file.includes(`${path.sep}server${path.sep}`) || path.basename(file).startsWith('.')) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'content-length': st.size, 'cache-control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=300' });
    fs.createReadStream(file).pipe(res);
  });
});

// ---------------- WebSocket relay ----------------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg, except) { const s = JSON.stringify(msg); for (const c of room.players.values()) if (c !== except && c.ws.readyState === 1) c.ws.send(s); }

wss.on('connection', (ws, req) => {
  const client = { id: String(nextId++), ws, room: null, d: {}, dirty: {}, hasDirty: false, alive: true, msgs: 0, msgWindow: Date.now() };
  ws.on('pong', () => (client.alive = true));
  ws.on('message', raw => {
    const now = Date.now(); if (now - client.msgWindow > 1000) { client.msgWindow = now; client.msgs = 0; }
    if (++client.msgs > MAX_MSGS_PER_SEC) return; // drop floods silently
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello' && !client.room) {
      const name = cleanRoom(m.room);
      let room = rooms.get(name);
      if (!room) { if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'error', msg: 'The server is full right now.' }); room = { players: new Map(), created: now }; rooms.set(name, room); }
      if (room.players.size >= MAX_ROOM) return send(ws, { t: 'error', msg: `Room "${name}" is full (${MAX_ROOM} players).` });
      client.room = room; client.roomName = name; client.d = { n: cleanName(m.name) };
      send(ws, { t: 'welcome', id: client.id, room: name, peers: [...room.players.values()].map(c => ({ id: c.id, d: c.d })) });
      room.players.set(client.id, client);
      broadcast(room, { t: 'join', id: client.id, d: client.d }, client);
      return;
    }
    if (m.t === 'state' && client.room && m.d && typeof m.d === 'object' && !Array.isArray(m.d)) {
      if (raw.length > MAX_STATE) return;
      for (const [k, v] of Object.entries(m.d)) {
        if (!/^[a-z]{1,4}$/i.test(k)) continue;
        if (k === 'n') { client.d.n = cleanName(v); client.dirty.n = client.d.n; }
        else if (v === null) { delete client.d[k]; client.dirty[k] = null; }
        else { client.d[k] = v; client.dirty[k] = v; }
        client.hasDirty = true;
      }
    }
  });
  ws.on('close', () => {
    const room = client.room; if (!room) return;
    room.players.delete(client.id); broadcast(room, { t: 'left', id: client.id });
    if (!room.players.size) rooms.delete(client.roomName);
  });
  ws.on('error', () => { });
});

// Batch state patches per room at 20 Hz so each client gets one frame per tick.
setInterval(() => {
  for (const room of rooms.values()) {
    const s = []; for (const c of room.players.values()) if (c.hasDirty) { s.push({ id: c.id, d: c.dirty }); c.dirty = {}; c.hasDirty = false; }
    if (!s.length) continue;
    for (const c of room.players.values()) { const mine = s.filter(x => x.id !== c.id); if (mine.length) send(c.ws, { t: 'states', s: mine }); }
  }
}, TICK_MS);
// Drop dead connections.
setInterval(() => { for (const ws of wss.clients) { if (ws._hq === false) { ws.terminate(); continue; } ws._hq = false; ws.ping(); } }, 30000);
wss.on('connection', ws => { ws._hq = true; ws.on('pong', () => (ws._hq = true)); });

server.listen(PORT, () => console.log(`Hoofquake server on http://localhost:${PORT}  (WebSocket at /ws)`));
