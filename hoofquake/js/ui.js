// Hoofquake — menus, shops, customization, garage, properties, map, HUD, touch controls.
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rarTag = r => `<span class="rar r${r}">${H.RAR[r]}</span>`;
  const coinTag = n => `<span class="coin">◉ ${H.fmt(n)}</span>`;

  const ui = H.ui = {
    open: null,
    init() {
      this.panel = $('#panel'); this.body = $('#panelBody'); this.tabs = $('#panelTabs'); this.title = $('#panelTitle');
      $('#panelClose').onclick = () => this.close();
      document.querySelectorAll('[data-menu]').forEach(b => (b.onclick = () => { H.Audio.init(); H.Audio.sfx('click'); this.menu(b.dataset.menu); }));
      $('#btnPlay').onclick = () => { H.Audio.init(); H.startGame(); };
      $('#btnContinue').onclick = () => { H.Audio.init(); H.startGame(true); };
      $('#hudMenu').onclick = () => this.mainMenu(true);
      this.toasts = $('#toasts'); this.bannerEl = $('#banner');
      this.buildTouch();
    },
    // ------------------------------------------------------------------ main menu
    mainMenu(show) { $('#menu').hidden = !show; H.paused = show && H.started; if (show) { this.panel.hidden = true; this.renderFn = null; if (this.preview) this.preview.stop(); $('#btnPlay').textContent = H.started ? 'Resume' : 'Play'; $('#btnContinue').hidden = H.started || !H.hasSave; document.exitPointerLock && document.exitPointerLock(); } },
    menu(id) {
      const fn = { animals: () => this.openAnimals(), customize: () => this.openCustomize(), shop: () => this.openShop('cosmetics'), inventory: () => this.openInventory(), garage: () => this.openGarage(), properties: () => this.openShop('properties'), missions: () => this.openMissions(), map: () => this.openMap(), multiplayer: () => this.openMulti(), settings: () => this.openSettings(), save: () => this.openSaveCode() }[id];
      if (fn) { $('#menu').hidden = true; H.paused = true; fn(); }
    },
    show(title, tabs, active, render) {
      this.panel.hidden = false; this.title.textContent = title; this.tabs.innerHTML = ''; H.paused = true; document.exitPointerLock && document.exitPointerLock();
      this.renderFn = render; this.activeTab = active;
      (tabs || []).forEach(([id, label]) => { const b = el('button', 'tab' + (id === active ? ' on' : ''), label); b.onclick = () => { this.activeTab = id; [...this.tabs.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); H.Audio.sfx('click'); this.refresh(); }; this.tabs.appendChild(b); });
      this.refresh();
    },
    refresh() { this.body.innerHTML = ''; this.body.scrollTop = 0; this.renderFn && this.renderFn(this.activeTab, this.body); },
    close() { this.panel.hidden = true; this.renderFn = null; if (this.preview) this.preview.stop(); if (H.started) { H.paused = false; } else this.mainMenu(true); },
    // ------------------------------------------------------------------ toasts, banners, coins
    toast(msg, kind) { if (!msg) return; const t = el('div', 'toast ' + (kind || ''), esc(msg)); this.toasts.appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800); while (this.toasts.children.length > 5) this.toasts.firstChild.remove(); },
    banner(title, sub) { const b = el('div', 'bannerItem', `<b>${esc(title)}</b><span>${esc(sub || '')}</span>`); this.bannerEl.appendChild(b); setTimeout(() => b.classList.add('out'), 3800); setTimeout(() => b.remove(), 4400); while (this.bannerEl.children.length > 3) this.bannerEl.firstChild.remove(); },
    coins(delta, why) { $('#coins').textContent = H.fmt(H.state.coins); if (delta) { const f = el('div', 'coinDelta ' + (delta > 0 ? 'up' : 'down'), (delta > 0 ? '+' : '−') + H.fmt(Math.abs(delta)) + (why ? ' · ' + esc(why) : '')); $('#coinBox').appendChild(f); setTimeout(() => f.remove(), 1800); } },
    combo(c) { const e = $('#combo'); if (c.t <= 0 || c.pts <= 0) { e.hidden = true; return; } e.hidden = false; e.innerHTML = `<b>${esc(c.label)}</b><span>${H.fmt(c.pts)} chaos × ${Math.floor(c.mult)}</span>`; e.style.setProperty('--k', Math.min(1, c.t / 3)); },
    saved(ok, code) { const s = $('#saveDot'); s.textContent = ok ? 'Saved' : 'Save failed'; s.className = ok ? 'ok' : 'bad'; clearTimeout(this._sd); this._sd = setTimeout(() => (s.textContent = ''), 2500); },
    fade() { const f = $('#fade'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },
    vehicleHud(p, v) { if (p.idx !== 0) return; $('#vehHud').hidden = !v; this.veh = v; },
    missionHud(A) {
      const e = $('#missionHud'); if (!A) { e.hidden = true; return; } e.hidden = false;
      const info = H.TYPE_INFO[A.m.type];
      e.innerHTML = `<div class="mh-top"><span>${info[0]} ${esc(A.m.name)}</span>${A.timed ? `<b class="${A.t < 10 ? 'hot' : ''}">${Math.max(0, A.t).toFixed(1)}s</b>` : ''}</div><div class="mh-obj">${esc(A.text || '')}</div>${A.heat !== undefined ? `<div class="heatbar"><i style="width:${(A.heat * 100).toFixed(0)}%"></i></div>` : ''}<button id="mhQuit">Abandon</button>`;
      $('#mhQuit').onclick = () => H.missions.fail('Abandoned');
    },
    // ------------------------------------------------------------------ HUD tick
    hud(dt) {
      const p = H.players[0]; if (!p) return;
      $('#clock').textContent = H.Sky.clock(); $('#weather').textContent = { clear: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', fog: '🌫️', snow: '🌨️' }[H.Sky.weather] || '';
      const stars = Math.floor(H.heatLevel); $('#heat').textContent = stars ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : ''; $('#heat').hidden = !stars;
      const cd = p.cd.sp, mx = p.cd.spMax || 1; $('#spBtnFill').style.transform = `scaleY(${cd > 0 ? cd / mx : 0})`; $('#spName').textContent = H.SPECIALS[p.def.sp] || '';
      $('#animalName').textContent = p.def.name + (p.gadget ? ' · 🔫 ' + H.GADGET[p.gadget].name : '') + (p.mount ? ' · riding' : '');
      // interaction prompt
      const c = p.vehicle ? { label: 'Exit ' + p.vehicle.def.name } : p.nearestInteract();
      const pr = $('#prompt'); if (c && !H.fishing) { pr.hidden = false; pr.innerHTML = `<kbd>${H.keyName('interact')}</kbd> ${esc(c.label)}`; } else pr.hidden = true;
      this.veh = p.vehicle || null; $('#vehHud').hidden = !this.veh; if (this.veh) { const v = this.veh; $('#vehSpd').textContent = Math.round(Math.abs(v.spd) * 3.6) + ' km/h'; $('#vehName').textContent = v.def.name + (v.upg.boost ? ' · Boost ' + Math.round(v.boost * 100) + '%' : ''); $('#vehAlt').textContent = v.isAir ? 'ALT ' + Math.round(v.pos.y) + ' m' : ''; }
      // waypoint arrow
      const w = H.waypoint, arrow = $('#waypoint');
      if (w && !p.interior) { const dx = w.x - p.pos.x, dz = w.z - p.pos.z, d = Math.hypot(dx, dz); const ang = Math.atan2(dx, dz) - p.cam.yaw; arrow.hidden = false; arrow.querySelector('i').style.transform = `rotate(${-ang}rad)`; arrow.querySelector('span').textContent = `${w.label || 'Waypoint'} · ${Math.round(d)} m`; if (d < 6 && !H.missions.active) { H.waypoint = null; } }
      else arrow.hidden = true;
      this.minimap(p);
    },
    // ------------------------------------------------------------------ map
    mapImage() {
      if (this._mapImg) return this._mapImg; const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const img = g.createImageData(N, N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = -1600 + (i + 0.5) * 3200 / N, z = -1600 + (j + 0.5) * 3200 / N, h = H.terrainH(x, z); let r, gg, b;
        if (h < -6) [r, gg, b] = [30, 90, 150]; else if (h < 0) [r, gg, b] = [60, 140, 200]; else if (h < 2) [r, gg, b] = [225, 205, 150];
        else if (h > 105) [r, gg, b] = [240, 244, 248]; else if (h > 60) [r, gg, b] = [140, 136, 128];
        else if (H.inDesert(x, z) > 0.6) [r, gg, b] = [228, 190, 120]; else if (H.inJungle(x, z) > 0.5) [r, gg, b] = [40, 110, 50]; else if (H.inForest(x, z) > 0.5) [r, gg, b] = [60, 110, 60]; else [r, gg, b] = [110, 165, 80];
        if (Math.abs(x) < 290 && Math.abs(z) < 290) [r, gg, b] = [150, 150, 158];
        const k = (j * N + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
      }
      g.putImageData(img, 0, 0); g.strokeStyle = 'rgba(40,40,46,0.8)'; g.lineWidth = 1.4;
      for (const rd of H.ROADS) { if (!rd.samples) continue; g.beginPath(); rd.samples.forEach((s, i) => { const X = (s.x + 1600) / 3200 * N, Y = (s.z + 1600) / 3200 * N; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); }
      this._mapImg = c; return c;
    },
    minimap(p) {
      const c = $('#minimap'); if (!c) return; const g = c.getContext('2d'), W = c.width, img = this.mapImage(), N = 256, scale = 3200 / N;
      const zoom = 3.2, view = 260; // world units shown
      g.save(); g.clearRect(0, 0, W, W); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip();
      if (p.interior) { g.fillStyle = '#1c2a2e'; g.fillRect(0, 0, W, W); g.fillStyle = '#e8f0e8'; g.font = '700 12px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('Indoors', W / 2, W / 2); g.restore(); return; }
      g.translate(W / 2, W / 2); g.rotate(-p.cam.yaw + Math.PI); const k = W / view;
      g.drawImage(img, (-1600 - p.pos.x) * k, (-1600 - p.pos.z) * k, 3200 * k, 3200 * k);
      const dot = (x, z, col, r) => { g.fillStyle = col; g.beginPath(); g.arc((x - p.pos.x) * k, (z - p.pos.z) * k, r, 0, 7); g.fill(); };
      for (const m of H.MISSIONS) if (Math.abs(m.x - p.pos.x) < view && Math.abs(m.z - p.pos.z) < view) dot(m.x, m.z, H.state.missions[m.id] ? '#9aa0a8' : m.type === 'secret' ? '#b673ff' : '#ffd21a', 2.5);
      for (const s of H.SHOPS) dot(s.x, s.z + 12, '#2affd0', 3);
      for (const pr of H.PROPERTIES) if (H.state.props[pr.id]) dot(pr.door.x, pr.door.z, '#ff8ad8', 3.5);
      if (H.waypoint) dot(H.waypoint.x, H.waypoint.z, '#ff3a5a', 4);
      if (H.players[1]) dot(H.players[1].pos.x, H.players[1].pos.z, '#7ad2ff', 4);
      for (const r of H.remotes || []) if (!r.interiorId) dot(r.pos.x, r.pos.z, '#3ee0b0', 4);
      g.restore(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 7); g.lineTo(W / 2 - 5, W / 2 + 5); g.lineTo(W / 2 + 5, W / 2 + 5); g.fill();
    },
    openMap() {
      this.show('World Map', null, null, (t, b) => {
        const wrap = el('div', 'mapWrap'); const c = el('canvas'); c.width = c.height = 900; wrap.appendChild(c); b.appendChild(wrap);
        const legend = el('div', 'legend', '<span><i style="background:#ffd21a"></i>Mission</span><span><i style="background:#b673ff"></i>Secret mission</span><span><i style="background:#2affd0"></i>Shop</span><span><i style="background:#ff8ad8"></i>Your property</span><span><i style="background:#ff3a5a"></i>Waypoint</span><span>Tap the map to set a waypoint. Owned properties offer fast travel.</span>'); b.appendChild(legend);
        const draw = () => {
          const g = c.getContext('2d'), W = c.width, k = W / 3200; g.imageSmoothingEnabled = true; g.drawImage(this.mapImage(), 0, 0, W, W);
          const P = (x, z) => [(x + 1600) * k, (z + 1600) * k];
          g.font = '700 15px Nunito, sans-serif'; g.textAlign = 'center';
          for (const [key, s] of Object.entries(H.SITES)) { if (['lab', 'cave', 'ufo', 'temple', 'observatory', 'pier', 'beach'].includes(key)) continue; const [X, Y] = P(s.x, s.z); g.fillStyle = 'rgba(14,24,28,0.6)'; const w = g.measureText(s.name).width + 10; g.fillRect(X - w / 2, Y - 11, w, 20); g.fillStyle = '#fff6dc'; g.fillText(s.name, X, Y + 4); }
          const dot = (x, z, col, r) => { const [X, Y] = P(x, z); g.fillStyle = col; g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); g.stroke(); };
          for (const m of H.MISSIONS) dot(m.x, m.z, H.state.missions[m.id] ? '#9aa0a8' : m.type === 'secret' ? '#b673ff' : '#ffd21a', 3.5);
          for (const s of H.SHOPS) dot(s.x, s.z + 12, '#2affd0', 5); for (const pr of H.PROPERTIES) dot(pr.door.x, pr.door.z, H.state.props[pr.id] ? '#ff8ad8' : '#ffffff', H.state.props[pr.id] ? 6 : 3);
          if (H.waypoint) dot(H.waypoint.x, H.waypoint.z, '#ff3a5a', 7); if (H.mapPing) dot(H.mapPing.x, H.mapPing.z, '#ffffff', 8);
          for (const pl of H.players) { const [X, Y] = P(pl.prevOutside && pl.interior ? pl.prevOutside.x : pl.pos.x, pl.prevOutside && pl.interior ? pl.prevOutside.z : pl.pos.z); g.save(); g.translate(X, Y); g.rotate(-pl.yaw + Math.PI); g.fillStyle = pl.idx ? '#7ad2ff' : '#ffffff'; g.strokeStyle = '#111'; g.beginPath(); g.moveTo(0, -11); g.lineTo(-8, 8); g.lineTo(8, 8); g.closePath(); g.fill(); g.stroke(); g.restore(); }
        };
        draw();
        c.onclick = (e) => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 3200 - 1600, z = (e.clientY - r.top) / r.height * 3200 - 1600; H.waypoint = { x, z, label: 'Map marker' }; H.Audio.sfx('checkpoint'); draw(); this.toast('Waypoint set'); };
        const ft = el('div', 'row wrap'); ft.appendChild(el('b', '', 'Fast travel: ')); const owned = H.PROPERTIES.filter(p => H.state.props[p.id]);
        if (!owned.length) ft.appendChild(el('span', 'muted', 'Buy a property to unlock fast travel.'));
        owned.forEach(p => { const bt = el('button', 'btn sm', esc(p.name)); bt.onclick = () => { H.travelTo(p.door.x, p.door.z); this.close(); }; ft.appendChild(bt); });
        b.appendChild(ft);
      });
    },
    // ------------------------------------------------------------------ animals
    openAnimals() {
      this.show('Animals', [['owned', 'Your animals'], ['all', 'All animals']], 'owned', (t, b) => {
        const grid = el('div', 'grid cards');
        const list = H.ANIMALS.filter(a => t === 'all' || H.state.animals[a.id]);
        for (const a of list) {
          const own = H.state.animals[a.id], cur = H.players[0] && H.players[0].animalId === a.id;
          const card = el('div', 'card animal' + (own ? '' : ' locked') + (cur ? ' cur' : ''));
          const st = a.stats;
          card.innerHTML = `<div class="sw" style="background:linear-gradient(135deg,${a.col},${a.col2})"></div><h4>${esc(a.name)}</h4><p>${esc(a.desc)}</p>
            <div class="stats"><label>Speed<i style="width:${st.spd / 16 * 100}%"></i></label><label>Jump<i style="width:${st.jmp / 18 * 100}%"></i></label><label>Weight<i style="width:${Math.min(1, st.mass / 8) * 100}%"></i></label><label>Swim<i style="width:${Math.min(1, st.swim / 2.4) * 100}%"></i></label></div>
            <div class="tags"><span>⚡ ${H.SPECIALS[a.sp]}</span>${st.fly ? '<span>🪽 Flies</span>' : ''}${st.glide ? '<span>🪂 Glides</span>' : ''}${st.climb ? '<span>🧗 Climbs</span>' : ''}${st.dive ? '<span>🤿 Dives</span>' : ''}${st.dbl ? '<span>⤴️ Double jump</span>' : ''}${st.dig ? '<span>🦴 Digger</span>' : ''}</div>`;
          const act = el('div', 'act');
          if (own) { const bt = el('button', 'btn', cur ? 'Playing' : 'Play as ' + esc(a.name)); bt.disabled = cur; bt.onclick = () => { H.setAnimal(0, a.id); this.refresh(); }; act.appendChild(bt); if (H.players[1]) { const b2 = el('button', 'btn ghost', 'P2'); b2.onclick = () => { H.setAnimal(1, a.id); this.toast('Player 2 is now a ' + a.name); }; act.appendChild(b2); } }
          else if (a.price < 0) act.appendChild(el('span', 'secret', '🔒 Secret · ' + esc(a.secret)));
          else { const bt = el('button', 'btn buy', 'Adopt ' + coinTag(a.price)); bt.onclick = () => { if (H.spend(a.price)) { H.grantAnimal(a.id); H.setAnimal(0, a.id); this.refresh(); } }; act.appendChild(bt); }
          card.appendChild(act); grid.appendChild(card);
        }
        b.appendChild(el('p', 'muted', `${Object.keys(H.state.animals).length} of ${H.ANIMALS.length} animals owned. Adopt more at the Critter Adoption Center or right here.`));
        b.appendChild(grid);
      });
    },
    // ------------------------------------------------------------------ customization
    openCustomize(slotStart) {
      const p = H.players[0]; const aid = p.animalId; const outfit = H.getOutfit(aid);
      const trial = JSON.parse(JSON.stringify(outfit));
      this.show('Customize · ' + p.def.name, H.SLOTS.map(s => [s.id, s.name]).concat([['outfits', 'Saved outfits']]), slotStart || 'hat', (t, b) => {
        const layout = el('div', 'custom'); const left = el('div', 'previewCol'); const right = el('div', 'itemsCol'); layout.append(left, right); b.appendChild(layout);
        const cv = el('canvas', 'preview'); left.appendChild(cv); this.startPreview(cv, p.def, trial);
        const owned = id => !!H.state.cos[id];
        const unowned = Object.keys(trial).filter(k => k !== 'emotes' && trial[k] && !owned(trial[k]));
        const sum = el('div', 'trySum'); left.appendChild(sum);
        const totalTry = unowned.reduce((s, k) => s + (H.COSMETIC[trial[k]].price || 0), 0);
        sum.innerHTML = unowned.length ? `Trying on ${unowned.length} item(s) you don't own · ${coinTag(totalTry)}` : 'Everything shown is yours.';
        const row = el('div', 'row'); left.appendChild(row);
        const apply = el('button', 'btn', 'Wear it'); apply.onclick = () => { for (const k of Object.keys(trial)) if (k !== 'emotes' && trial[k] && !owned(trial[k])) trial[k] = outfit[k] || null; Object.assign(outfit, trial); H.setAnimal(0, aid); H.dirty(true); this.toast('Outfit equipped'); this.refresh(); };
        const buyAll = el('button', 'btn buy', 'Buy all & wear'); buyAll.hidden = !unowned.length || unowned.some(k => !H.COSMETIC[trial[k]].price); buyAll.onclick = () => { if (H.spend(totalTry)) { unowned.forEach(k => (H.state.cos[trial[k]] = 1)); Object.assign(outfit, trial); H.setAnimal(0, aid); H.dirty(true); H.checkAch(); this.refresh(); } };
        const reset = el('button', 'btn ghost', 'Clear slot'); reset.onclick = () => { if (t !== 'outfits' && t !== 'emote') { trial[t] = null; Object.assign(outfit, { [t]: null }); H.setAnimal(0, aid); H.dirty(); this.refresh(); } };
        row.append(apply, buyAll, reset);
        if (t === 'outfits') {
          const o = H.state.outfits[aid];
          for (let i = 0; i < 5; i++) { const s = o.saved[i]; const r = el('div', 'outfitRow'); r.innerHTML = `<b>Slot ${i + 1}</b><span>${s ? esc(s.name) : '<i class="muted">Empty</i>'}</span>`; const sv = el('button', 'btn sm', 'Save current'); sv.onclick = () => { o.saved[i] = { name: `${p.def.name} look ${i + 1}`, items: JSON.parse(JSON.stringify(outfit)) }; H.dirty(true); this.refresh(); }; r.appendChild(sv); if (s) { const ld = el('button', 'btn sm ghost', 'Wear'); ld.onclick = () => { Object.assign(outfit, JSON.parse(JSON.stringify(s.items))); H.setAnimal(0, aid); H.dirty(true); this.refresh(); }; r.appendChild(ld); } right.appendChild(r); }
          right.appendChild(el('p', 'muted', 'Each animal keeps its own five saved outfits.'));
          return;
        }
        const filt = el('div', 'row wrap filters'); right.appendChild(filt); let rf = this._rf === undefined ? -1 : this._rf; let ownOnly = !!this._own;
        const fb = (label, r) => { const bt = el('button', 'chip' + (rf === r ? ' on' : ''), label); bt.onclick = () => { this._rf = r; this.refresh(); }; filt.appendChild(bt); };
        fb('All', -1); H.RAR.forEach((n, i) => fb(n, i));
        const oc = el('button', 'chip' + (ownOnly ? ' on' : ''), 'Owned only'); oc.onclick = () => { this._own = !ownOnly; this.refresh(); }; filt.appendChild(oc);
        const grid = el('div', 'grid items'); right.appendChild(grid);
        const items = H.COSMETICS.filter(c => c.slot === t && (rf < 0 || c.rar === rf) && (!ownOnly || owned(c.id)));
        if (t === 'emote') right.insertBefore(el('p', 'muted', `Equip up to 4 emotes (keys ${['emote1', 'emote2', 'emote3', 'emote4'].map(H.keyName).join(' ')}). Equipped: ${(outfit.emotes || []).map(e => H.COSMETIC[e] ? H.COSMETIC[e].name : '').join(', ')}`), grid);
        for (const it of items) {
          const isOn = t === 'emote' ? (outfit.emotes || []).includes(it.id) : trial[t] === it.id; const own = owned(it.id);
          const card = el('div', `item r${it.rar}` + (isOn ? ' on' : '') + (own ? ' owned' : ''));
          const sw = it.data.c ? `<div class="dot" style="background:${it.data.c}"></div>` : '';
          card.innerHTML = `${sw}<b>${esc(it.name)}</b>${rarTag(it.rar)}<small>${own ? 'Owned' : it.price ? coinTag(it.price) : srcLabel(it.src)}</small>`;
          card.onclick = () => {
            H.Audio.sfx('click');
            if (t === 'emote') { if (!own) { if (it.price && H.spend(it.price)) { H.state.cos[it.id] = 1; } else return; } const e = outfit.emotes = outfit.emotes || []; const i = e.indexOf(it.id); if (i >= 0) e.splice(i, 1); else { e.push(it.id); if (e.length > 4) e.shift(); } H.setAnimal(0, aid); H.dirty(); this.refresh(); return; }
            if (trial[t] === it.id && !own && it.price) { if (H.spend(it.price)) { H.state.cos[it.id] = 1; outfit[t] = it.id; H.setAnimal(0, aid); H.checkAch(); H.dirty(true); this.refresh(); } return; }
            trial[t] = it.id; if (own) { outfit[t] = it.id; H.setAnimal(0, aid); H.dirty(); }
            this.refresh();
          };
          if (!own && trial[t] === it.id && it.price) card.appendChild(el('em', 'tap', 'Tap again to buy'));
          grid.appendChild(card);
        }
        if (!items.length) grid.appendChild(el('p', 'muted', 'Nothing here with these filters.'));
        // keep trial across refreshes
        this._trial = trial;
      });
    },
    startPreview(canvas, def, outfit) {
      if (!this.preview) {
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); const sc = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0)); const d = new THREE.DirectionalLight(0xffffff, 0.7); d.position.set(3, 5, 4); sc.add(d);
        const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 40), new THREE.MeshLambertMaterial({ color: '#2a3a40' })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
        this.preview = { r, sc, cam, model: null, raf: 0, stop() { cancelAnimationFrame(this.raf); this.raf = 0; } };
      }
      const P = this.preview; P.stop(); canvas.replaceWith(P.r.domElement); P.r.domElement.className = 'preview';
      const size = Math.min(360, (canvas.parentElement || document.body).clientWidth || 320); P.r.setPixelRatio(Math.min(2, devicePixelRatio)); P.r.setSize(size, size);
      if (P.model) P.sc.remove(P.model.root); P.model = H.buildAnimal(def, outfit); P.sc.add(P.model.root);
      const h = P.model.height, dist = Math.max(4, h * 2.6); P.cam.position.set(0, h * 0.75, dist); P.cam.lookAt(0, h * 0.5, 0);
      let t0 = performance.now(); const em = (outfit.emotes || [])[0];
      const loop = () => { const t = (performance.now() - t0) / 1000; P.model.root.rotation.y = t * 0.6; P.model.parts ? 0 : 0; const tr = outfit.trail && H.COSMETIC[outfit.trail]; P.model.root.traverse(o => { if (o.userData.spin) o.rotation.y += 0.25; if (o.userData.flap) o.rotation.z = o.userData.flap * (0.3 + Math.sin(t * 8) * 0.25); }); P.model.tail && (P.model.tail.rotation.y = Math.sin(t * 4) * 0.4); P.r.render(P.sc, P.cam); P.raf = requestAnimationFrame(loop); };
      loop();
    },
    // ------------------------------------------------------------------ shop
    openShop(kind, shop, focusProp) {
      const tabs = [['cosmetics', 'Cosmetics'], ['animals', 'Animals'], ['vehicles', 'Vehicles'], ['furniture', 'Furniture'], ['properties', 'Real Estate'], ['gadgets', 'Gadgets'], ['fish', 'Sell Fish']];
      if (kind === 'garage') return this.openGarage();
      if (kind === 'animals') return this.openAnimals();
      this.show(shop ? shop.name : 'Shop', tabs, kind, (t, b) => {
        b.appendChild(el('div', 'wallet', `You have ${coinTag(H.state.coins)}`));
        if (t === 'cosmetics') {
          const daily = this.dailyDeals(); b.appendChild(el('h3', '', 'Today\'s featured items · 25% off'));
          const g1 = el('div', 'grid items'); daily.forEach(it => g1.appendChild(this.cosCard(it, Math.round(it.price * 0.75)))); b.appendChild(g1);
          const f = el('div', 'row wrap filters'); b.appendChild(f); const cur = this._shopSlot || 'hat';
          H.SLOTS.forEach(s => { const c = el('button', 'chip' + (cur === s.id ? ' on' : ''), s.name); c.onclick = () => { this._shopSlot = s.id; this.refresh(); }; f.appendChild(c); });
          const g = el('div', 'grid items'); H.COSMETICS.filter(c => c.slot === cur && c.src === 'shop').forEach(it => g.appendChild(this.cosCard(it))); b.appendChild(g);
          const total = H.COSMETICS.length, own = Object.keys(H.state.cos).length; b.appendChild(el('p', 'muted', `${own} / ${total} cosmetics collected. Secret and Mythical items also drop from treasure chests, missions, achievements and events.`));
        }
        if (t === 'animals') { this.openAnimals(); return; }
        if (t === 'vehicles') {
          const g = el('div', 'grid cards');
          for (const v of H.VEHICLES) {
            const own = H.state.vehicles[v.id]; const c = el('div', 'card');
            c.innerHTML = `<div class="sw" style="background:${v.col}"></div><h4>${esc(v.name)}</h4><p>${esc(typeLabel(v.type))} · top speed ${Math.round(v.spd * 3.6)} km/h</p>`;
            const act = el('div', 'act');
            if (own) { const bt = el('button', 'btn', 'Call it here'); bt.onclick = () => { H.summonVehicle(H.players[0], v.id); this.close(); }; act.appendChild(bt); }
            else if (v.price < 0) act.appendChild(el('span', 'secret', '🔒 ' + esc(v.secret)));
            else { const bt = el('button', 'btn buy', 'Buy ' + coinTag(v.price)); bt.onclick = () => { if (H.spend(v.price)) { H.grantVehicle(v.id); this.refresh(); } }; act.appendChild(bt); }
            c.appendChild(act); g.appendChild(c);
          }
          b.appendChild(g);
        }
        if (t === 'furniture') {
          b.appendChild(el('p', 'muted', 'Furniture goes into storage. Place it from the terminal inside any property you own.'));
          const g = el('div', 'grid items');
          for (const f of H.FURNITURE) { const c = el('div', 'item'); const n = H.state.furn[f.id] || 0; c.innerHTML = `<div class="dot" style="background:${f.parts[0][7]}"></div><b>${esc(f.name)}</b><small>${coinTag(f.price)}${n ? ' · ' + n + ' in storage' : ''}</small>`; c.onclick = () => { if (H.spend(f.price)) { H.state.furn[f.id] = n + 1; H.stat('furnitureBought', 1); this.refresh(); } }; g.appendChild(c); }
          b.appendChild(g);
        }
        if (t === 'properties') {
          const g = el('div', 'grid cards');
          const list = focusProp ? [H.PROP[focusProp], ...H.PROPERTIES.filter(p => p.id !== focusProp)] : H.PROPERTIES;
          for (const pr of list) {
            const own = H.state.props[pr.id]; const c = el('div', 'card' + (pr.id === focusProp ? ' cur' : ''));
            c.innerHTML = `<h4>${esc(pr.name)}</h4><p>${esc(pr.desc)}</p><div class="tags"><span>🛋️ ${pr.slots} furniture</span><span>🚗 ${pr.garage} garage</span><span>📐 ${pr.room[0]}×${pr.room[1]} m</span></div>`;
            const act = el('div', 'act');
            if (own) { const tr = el('button', 'btn', 'Travel here'); tr.onclick = () => { H.travelTo(pr.door.x, pr.door.z); this.close(); }; const sp = el('button', 'btn ghost', H.state.spawn === pr.id ? 'Home ✓' : 'Set as home'); sp.onclick = () => { H.state.spawn = pr.id; H.dirty(); this.refresh(); }; act.append(tr, sp); }
            else { const bt = el('button', 'btn buy', 'Buy ' + coinTag(pr.price)); bt.onclick = () => { if (H.spend(pr.price)) { H.state.props[pr.id] = { furn: [] }; H.updateSaleSigns(); H.ui.banner('🏠 Property purchased', pr.name + ' is yours!'); H.checkAch(); H.dirty(true); this.refresh(); } }; act.appendChild(bt); const go = el('button', 'btn ghost', 'Show on map'); go.onclick = () => { H.waypoint = { x: pr.door.x, z: pr.door.z, label: pr.name }; this.toast('Waypoint set'); }; act.appendChild(go); }
            c.appendChild(act); g.appendChild(c);
          }
          b.appendChild(g);
        }
        if (t === 'gadgets') {
          b.appendChild(el('p', 'muted', `Press ${H.keyName('gadget')} (or GUN on touch) to take out a gadget, aim with the camera, and Attack to fire. Shoot people, wildlife, traffic, parked cars and the planes overhead.`));
          const g = el('div', 'grid cards');
          for (const gd of H.GADGETS) { const own = (H.state.gadgets || {})[gd.id]; const c = el('div', 'card'); c.innerHTML = `<h4>${esc(gd.name)}</h4><p>${esc(gd.desc)}</p>`; const act = el('div', 'act');
            if (own) { const bt = el('button', 'btn', 'Equip'); bt.onclick = () => { const p = H.players[0]; p.gadget = gd.id; document.body.classList.add('aiming'); this.close(); this.toast('🔫 ' + gd.name + ' equipped'); }; act.appendChild(bt); }
            else { const bt = el('button', 'btn buy', 'Buy ' + coinTag(gd.price)); bt.onclick = () => { if (H.spend(gd.price)) { H.state.gadgets[gd.id] = 1; H.dirty(true); this.refresh(); } }; act.appendChild(bt); }
            c.appendChild(act); g.appendChild(c); }
          b.appendChild(g);
        }
        if (t === 'fish') {
          const caught = Object.entries(H.state.fish); if (!caught.length) b.appendChild(el('p', 'muted', 'You haven\'t caught anything yet. Fishing spots: Old Pier, Lake Lumpy Dock, Riverbank, Lighthouse Rocks, Jungle River, Coconut Key Dock.'));
          b.appendChild(el('p', 'muted', 'Caught fish pay out instantly. Your collection keeps every species you\'ve discovered — here\'s the full catalogue.'));
          const g = el('div', 'grid items'); H.FISH.forEach(f => { const n = H.state.fish[f.name] || 0; const c = el('div', `item r${f.rar}` + (n ? ' owned' : '')); c.innerHTML = `<b>${n ? esc(f.name) : '???'}</b>${rarTag(f.rar)}<small>${n ? n + ' caught · ' : ''}${coinTag(f.val)}</small>`; g.appendChild(c); }); b.appendChild(g);
        }
      });
    },
    dailyDeals() { const r = H.rng(H.state.day * 97 + 5); const pool = H.COSMETICS.filter(c => c.src === 'shop' && c.rar >= 2); return [0, 1, 2, 3, 4, 5].map(() => pool[Math.floor(r() * pool.length)]); },
    cosCard(it, price) {
      const own = H.state.cos[it.id]; price = price || it.price; const c = el('div', `item r${it.rar}` + (own ? ' owned' : ''));
      c.innerHTML = `${it.data.c ? `<div class="dot" style="background:${it.data.c}"></div>` : ''}<b>${esc(it.name)}</b>${rarTag(it.rar)}<small>${own ? 'Owned' : coinTag(price)}</small>`;
      c.onclick = () => { if (own) { this.toast('Already yours — equip it in Customize.'); return; } if (H.spend(price)) { H.state.cos[it.id] = 1; H.checkAch(); H.dirty(true); this.toast('Bought ' + it.name + ' — equip it in Customize'); this.refresh(); } };
      return c;
    },
    // ------------------------------------------------------------------ inventory / collection
    openInventory() {
      this.show('Collection', [['summary', 'Summary'], ['collect', 'Collectibles'], ['ach', 'Achievements'], ['stats', 'Stats']], 'summary', (t, b) => {
        const d = H.derived;
        if (t === 'summary') {
          const g = el('div', 'grid stat');
          [['Coins', H.fmt(H.state.coins)], ['Animals', `${d('animals')} / ${H.ANIMALS.length}`], ['Vehicles', `${d('vehicles')} / ${H.VEHICLES.length}`], ['Properties', `${d('properties')} / ${H.PROPERTIES.length}`], ['Cosmetics', `${d('cosmetics')} / ${H.COSMETICS.length}`], ['Missions', `${d('missions')} / ${H.MISSIONS.length}`], ['Achievements', `${Object.keys(H.state.ach).length} / ${H.ACHIEVEMENTS.length}`], ['Secrets', `${d('secrets')} / ${H.SECRET_ZONES.length + 1}`], ['Furniture in storage', Object.values(H.state.furn).reduce((a, b) => a + b, 0)]].forEach(([k, v]) => g.appendChild(el('div', 'tile', `<small>${k}</small><b>${v}</b>`)));
          b.appendChild(g);
          b.appendChild(el('h3', '', 'Cosmetics by rarity'));
          const rr = el('div', 'grid stat'); H.RAR.forEach((n, i) => { const all = H.COSMETICS.filter(c => c.rar === i).length, own = H.COSMETICS.filter(c => c.rar === i && H.state.cos[c.id]).length; rr.appendChild(el('div', 'tile', `${rarTag(i)}<b>${own} / ${all}</b>`)); }); b.appendChild(rr);
          b.appendChild(el('h3', '', 'Owned animals')); b.appendChild(el('p', '', H.ANIMALS.filter(a => H.state.animals[a.id]).map(a => esc(a.name)).join(' · ')));
          b.appendChild(el('h3', '', 'Owned vehicles')); b.appendChild(el('p', '', Object.keys(H.state.vehicles).map(v => esc(H.VEHICLE[v].name)).join(' · ') || '<span class="muted">None yet — any parked vehicle in the world is free to drive.</span>'));
        }
        if (t === 'collect') {
          const g = el('div', 'grid stat');
          [['🦆 Rubber ducks', d('ducks'), 60], ['🧙 Garden gnomes', d('gnomes'), 25], ['🏆 Golden Goat Statues', d('statues'), 12], ['📦 Treasure chests', d('chests'), 40], ['🎣 Fish species', d('fishSpecies'), 20], ['🛸 UFO parts', Object.keys(H.state.found).filter(k => k.startsWith('ufopart')).length, 5]].forEach(([k, v, m]) => g.appendChild(el('div', 'tile', `<small>${k}</small><b>${v} / ${m}</b><div class="bar"><i style="width:${v / m * 100}%"></i></div>`)));
          b.appendChild(g);
          b.appendChild(el('h3', '', 'Secrets'));
          const sg = el('div', 'grid items'); H.SECRET_ZONES.forEach(s => sg.appendChild(el('div', 'item' + (H.state.secrets[s.id] ? ' owned' : ''), `<b>${H.state.secrets[s.id] ? esc(s.name) : '???'}</b><small>${H.state.secrets[s.id] ? 'Discovered' : 'Undiscovered'}</small>`))); b.appendChild(sg);
          b.appendChild(el('p', 'muted', 'Rewards: all 60 ducks → Rubber Duck Hat · all 25 gnomes → Gnome Camo · 6 statues → Golden Statue Crown · 12 statues → Cosmic Goat.'));
        }
        if (t === 'ach') { const g = el('div', 'grid items'); H.ACHIEVEMENTS.forEach(a => { const done = H.state.ach[a.id]; const v = Math.min(a.goal, d(a.stat)); g.appendChild(el('div', 'item' + (done ? ' owned' : ''), `<b>${done ? '🏆 ' : ''}${esc(a.name)}</b><small>${esc(a.desc)}</small><div class="bar"><i style="width:${v / a.goal * 100}%"></i></div><small>${coinTag(a.reward)}${a.item ? ' + ' + esc(H.COSMETIC[a.item].name) : ''}</small>`)); }); b.appendChild(g); }
        if (t === 'stats') { const st = H.state.stats; const rows = [['Headbutts', st.headbutts], ['People ragdolled', st.npcHits], ['Objects broken', st.breaks], ['Explosions', st.explosions], ['Traffic flipped', st.carsFlipped], ['Distance walked (km)', (st.walkKm || 0).toFixed(2)], ['Distance driven (km)', (st.driveKm || 0).toFixed(2)], ['Distance flown (km)', (st.flyKm || 0).toFixed(2)], ['Distance swum (km)', (st.swimKm || 0).toFixed(2)], ['Best single airtime (s)', (st.bestAir || 0).toFixed(1)], ['Vehicle flips', st.flips], ['Fish caught', st.fishCaught], ['Specials used', st.specials], ['Emotes', st.emotes], ['Coins earned', st.coinsEarned], ['Days survived', st.days]]; const tb = el('table', 'stats'); tb.innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${H.fmt(Number(v) || 0) === '0' && String(v).includes('.') ? v : (typeof v === 'string' ? v : H.fmt(v || 0))}</td></tr>`).join(''); b.appendChild(tb); }
      });
    },
    // ------------------------------------------------------------------ garage
    openGarage() {
      this.show('Garage', [['owned', 'Your vehicles'], ['buy', 'Dealership']], 'owned', (t, b) => {
        if (t === 'buy') { this.openShop('vehicles'); return; }
        const ids = Object.keys(H.state.vehicles); if (!ids.length) { b.appendChild(el('p', 'muted', 'No vehicles yet. Parked cars, bikes, boats and karts around the world are free to drive — buy your own at the dealership to summon them anywhere and upgrade them.')); const go = el('button', 'btn', 'Open dealership'); go.onclick = () => this.openShop('vehicles'); b.appendChild(go); return; }
        const g = el('div', 'grid cards');
        for (const id of ids) {
          const v = H.VEHICLE[id], o = H.state.vehicles[id]; const c = el('div', 'card');
          c.innerHTML = `<div class="sw" style="background:${o.paint || v.col}"></div><h4>${esc(v.name)}</h4><p>${typeLabel(v.type)} · ${Math.round(v.spd * (1 + o.upg.eng * 0.12) * 3.6)} km/h</p>`;
          const up = el('div', 'upg');
          [['eng', 'Engine', 5], ['hand', 'Handling', 5], ['boost', 'Nitro boost', 3]].forEach(([k, label, mx]) => { const lv = o.upg[k]; const cost = Math.round((Math.max(800, v.price > 0 ? v.price : 20000) * 0.25) * (lv + 1)); const r = el('div', 'upRow', `<span>${label}</span><span class="pips">${'●'.repeat(lv)}${'○'.repeat(mx - lv)}</span>`); const bt = el('button', 'btn sm', lv >= mx ? 'Max' : 'Upgrade ' + coinTag(cost)); bt.disabled = lv >= mx; bt.onclick = () => { if (H.spend(cost)) { o.upg[k]++; H.dirty(true); const sv = H.players[0].summoned; if (sv && sv.def.id === id) sv.upg = o.upg; this.refresh(); } }; r.appendChild(bt); up.appendChild(r); });
          c.appendChild(up);
          const pr = el('div', 'paints'); H.PAINTS.forEach(pc => { const s = el('button', 'paint' + ((o.paint || v.col) === pc ? ' on' : '')); s.style.background = pc; s.title = 'Paint ' + pc + ' (250)'; s.onclick = () => { if (H.spend(250)) { o.paint = pc; const sv = H.players[0].summoned; if (sv && sv.def.id === id) sv.repaint(pc); H.dirty(); this.refresh(); } }; pr.appendChild(s); }); c.appendChild(pr);
          const act = el('div', 'act'); const bt = el('button', 'btn', 'Call it here'); bt.onclick = () => { H.summonVehicle(H.players[0], id); this.close(); }; act.appendChild(bt); c.appendChild(act); g.appendChild(c);
        }
        b.appendChild(el('p', 'muted', 'Paint jobs cost 250 coins. Engine adds +12% top speed per level; Nitro lets you hold Sprint to boost.'));
        b.appendChild(g);
      });
    },
    // ------------------------------------------------------------------ property decorating
    openProperty(pid) {
      const pr = H.PROP[pid], data = H.state.props[pid], it = H.interiors['prop_' + pid];
      this.show(pr.name, [['place', 'Place furniture'], ['placed', 'Placed items'], ['garage', 'Garage']], 'place', (t, b) => {
        const p = H.players[0];
        if (t === 'place') {
          b.appendChild(el('p', 'muted', `Items are placed where you're standing, facing your direction. ${data.furn.length} / ${pr.slots} slots used.`));
          const g = el('div', 'grid items'); const owned = Object.entries(H.state.furn).filter(([, n]) => n > 0);
          if (!owned.length) b.appendChild(el('p', '', 'Your storage is empty. Buy furniture from the Shop (Furniture tab) or find it in treasure chests.'));
          owned.forEach(([id, n]) => { const f = H.FURN[id]; const c = el('div', 'item'); c.innerHTML = `<div class="dot" style="background:${f.parts[0][7]}"></div><b>${esc(f.name)}</b><small>${n} in storage · tap to place</small>`; c.onclick = () => { if (data.furn.length >= pr.slots) return this.toast('This property is full — upgrade to a bigger place!', 'bad'); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); data.furn.push({ id, x: p.pos.x - it.x + fx * 3, z: p.pos.z - it.z + fz * 3, ry: p.yaw + Math.PI }); H.state.furn[id]--; H.furniture.build(pid); H.Audio.sfx('buy'); H.dirty(true); this.refresh(); }; g.appendChild(c); });
          b.appendChild(g); const sh = el('button', 'btn ghost', 'Buy more furniture'); sh.onclick = () => this.openShop('furniture'); b.appendChild(sh);
        }
        if (t === 'placed') {
          const g = el('div', 'grid items'); data.furn.forEach((f, i) => { const c = el('div', 'item'); c.innerHTML = `<b>${esc(H.FURN[f.id].name)}</b><small>Tap to rotate · long list below</small>`; const rot = el('button', 'btn sm', 'Rotate'); rot.onclick = (e) => { e.stopPropagation(); f.ry = (f.ry || 0) + Math.PI / 4; H.furniture.build(pid); H.dirty(); }; const rm = el('button', 'btn sm ghost', 'Store'); rm.onclick = (e) => { e.stopPropagation(); data.furn.splice(i, 1); H.state.furn[f.id] = (H.state.furn[f.id] || 0) + 1; H.furniture.build(pid); H.dirty(); this.refresh(); }; c.append(rot, rm); g.appendChild(c); });
          if (!data.furn.length) g.appendChild(el('p', 'muted', 'Nothing placed yet.')); b.appendChild(g);
        }
        if (t === 'garage') {
          b.appendChild(el('p', 'muted', `This property's garage holds ${pr.garage} vehicle(s). Call any owned vehicle to the front door.`));
          const ids = Object.keys(H.state.vehicles).slice(0, Math.max(pr.garage, 0)); const g = el('div', 'grid items');
          ids.forEach(id => { const c = el('div', 'item'); c.innerHTML = `<b>${esc(H.VEHICLE[id].name)}</b><small>Tap to bring it outside</small>`; c.onclick = () => { H.exitInterior(p, it); setTimeout(() => H.summonVehicle(p, id), 50); this.close(); }; g.appendChild(c); });
          if (!ids.length) g.appendChild(el('p', 'muted', pr.garage ? 'No vehicles owned yet.' : 'No garage here.')); b.appendChild(g);
        }
      });
    },
    // ------------------------------------------------------------------ missions
    openMissions() {
      const cats = [['daily', 'Daily'], ['all', 'All']].concat(Object.entries(H.TYPE_INFO).map(([k, v]) => [k, v[0] + ' ' + v[1]]));
      this.show('Missions', cats, 'all', (t, b) => {
        if (t === 'daily') {
          if (!H.state.daily) H.newDay();
          b.appendChild(el('p', 'muted', 'Daily challenges refresh every in-game morning.'));
          H.state.daily.list.forEach(c => { const v = Math.min(c.goal, (H.state.stats[c.stat] || 0) - c.base); b.appendChild(el('div', 'item wide' + (c.done ? ' owned' : ''), `<b>${c.done ? '✅ ' : ''}${esc(c.desc)}</b><div class="bar"><i style="width:${Math.max(0, v) / c.goal * 100}%"></i></div><small>${coinTag(c.reward)}</small>`)); });
          return;
        }
        const done = H.MISSIONS.filter(m => H.state.missions[m.id]).length; b.appendChild(el('p', 'muted', `${done} / ${H.MISSIONS.length} missions completed. Walk into a glowing beacon and press ${H.keyName('interact')}, or track one below.`));
        const list = H.MISSIONS.filter(m => t === 'all' || m.type === t); const p = H.players[0];
        list.sort((a, b2) => (!!H.state.missions[a.id] - !!H.state.missions[b2.id]) || H.dist2(a.x, a.z, p.pos.x, p.pos.z) - H.dist2(b2.x, b2.z, p.pos.x, p.pos.z));
        const g = el('div', 'mlist');
        list.slice(0, 120).forEach(m => {
          const st = H.state.missions[m.id] || 0; const d = Math.round(Math.hypot(m.x - p.pos.x, m.z - p.pos.z)); const r = el('div', 'mrow' + (st ? ' done' : ''));
          r.innerHTML = `<span class="ic">${H.TYPE_INFO[m.type][0]}</span><div><b>${esc(m.type === 'secret' && !st ? m.name + ' (secret)' : m.name)}</b><small>${esc(H.SITES[m.region] ? H.SITES[m.region].name : 'Around town')} · ${d} m · ${'◆'.repeat(m.diff)}${'◇'.repeat(3 - m.diff)}${st ? ' · ' + '★'.repeat(st) : ''}</small></div><span class="rw">${coinTag(st ? Math.round(m.reward * 0.3) : m.reward)}</span>`;
          const tr = el('button', 'btn sm', 'Track'); tr.onclick = () => { H.waypoint = { x: m.x, z: m.z, label: m.name }; this.toast('Tracking ' + m.name); this.close(); };
          const fee = Math.round(50 + d * 0.15); const tx = el('button', 'btn sm ghost', 'Taxi ' + coinTag(fee)); tx.onclick = () => { if (H.spend(fee)) { H.travelTo(m.x, m.z); this.close(); } };
          r.append(tr, tx); g.appendChild(r);
        });
        if (list.length > 120) g.appendChild(el('p', 'muted', `Showing the 120 nearest of ${list.length}. Pick a category to narrow down.`));
        b.appendChild(g);
      });
    },
    missionOffer(m) {
      const st = H.state.missions[m.id];
      this.show(H.TYPE_INFO[m.type][0] + ' ' + m.name, null, null, (t, b) => {
        b.appendChild(el('p', 'lead', esc(H.missionBrief(m))));
        b.appendChild(el('div', 'tags', `<span>${'◆'.repeat(m.diff)}${'◇'.repeat(3 - m.diff)} difficulty</span><span>Reward ${coinTag(st ? Math.round(m.reward * 0.3) : m.reward)}${st ? ' (replay)' : ''}</span>${m.item && !st ? `<span>+ ${esc(H.COSMETIC[m.item].name)}</span>` : ''}${m.p.veh ? `<span>🚗 ${esc(H.VEHICLE[m.p.veh].name)} provided</span>` : ''}${st ? `<span>Best ${'★'.repeat(st)}</span>` : ''}`));
        const go = el('button', 'btn big', 'Start mission'); go.onclick = () => { this.close(); H.missions.start(m); }; b.appendChild(go);
      });
    },
    // ------------------------------------------------------------------ fishing / cooking overlays
    fishing(F) {
      const o = $('#fishing'); if (!F) { o.hidden = true; return; } o.hidden = false;
      const msg = F.phase === 'wait' ? 'Waiting for a bite…' : F.phase === 'bite' ? 'BITE! Press and hold ' + H.keyName('jump') + ' / tap!' : 'Keep the fish inside the green bar — hold to raise it';
      o.querySelector('.fmsg').textContent = msg; o.querySelector('.fzone').style.bottom = (F.pos * 100 - 12) + '%'; o.querySelector('.ffish').style.bottom = (F.fish * 100 - 3) + '%'; o.querySelector('.fprog i').style.height = (F.prog * 100) + '%'; o.classList.toggle('bite', F.phase === 'bite');
    },
    cookingGame(done) {
      const o = $('#cooking'); o.hidden = false; let round = 0, score = 0, t = 0, active = true; const needle = o.querySelector('.cneedle'), zone = o.querySelector('.czone'), msg = o.querySelector('.cmsg');
      let zs = 0.4 + Math.random() * 0.3; zone.style.left = (zs * 100) + '%'; H.cookingActive = true;
      const step = () => { if (!active) return; t += 0.016 * (1.2 + round * 0.5); const v = (Math.sin(t * 3) + 1) / 2; needle.style.left = (v * 100) + '%'; o.dataset.v = v; requestAnimationFrame(step); }; step();
      msg.textContent = `Round 1 of 3 — press ${H.keyName('jump')} or tap when the needle is in the green!`;
      H.cookPress = () => { const v = +o.dataset.v; const hit = v > zs && v < zs + 0.18; if (hit) { score++; H.Audio.sfx('checkpoint'); } else H.Audio.sfx('fail'); round++; zs = 0.15 + Math.random() * 0.6; zone.style.left = (zs * 100) + '%'; msg.textContent = round < 3 ? `${hit ? 'Perfect!' : 'Burnt…'} Round ${round + 1} of 3` : `${score}/3 — ${['Disaster', 'Edible', 'Tasty!', 'Masterpiece!'][score]}`; if (round >= 3) { active = false; H.cookPress = null; setTimeout(() => { o.hidden = true; H.cookingActive = false; done(Math.max(1, score)); }, 1000); } };
    },
    // ------------------------------------------------------------------ multiplayer
    openMulti() {
      const N = H.Net;
      this.show('Multiplayer', [['online', 'Online'], ['local', 'Same screen']], N.online ? 'online' : 'online', (t, b) => {
        if (t === 'local') {
          b.appendChild(el('p', 'lead', 'Play together on one screen. Player 2 joins with split-screen and their own animal; you share the world, missions, money and properties.'));
          const on = !!H.players[1]; const bt = el('button', 'btn big', on ? 'Remove Player 2' : 'Add Player 2 (split-screen)'); bt.onclick = () => { on ? H.removeP2() : H.addP2(); this.refresh(); }; b.appendChild(bt);
          b.appendChild(el('h3', '', 'Player 2 controls'));
          b.appendChild(el('table', 'stats', ['move', 'jump', 'sprint', 'attack', 'grab', 'special', 'interact', 'ragdoll', 'descend', 'camLeft', 'camRight'].map(a => `<tr><td>${H.ACTION_LABEL[a]}</td><td><kbd>${H.keyName(a, 1)}</kbd></td></tr>`).join('')));
          if (on) { b.appendChild(el('h3', '', 'Player 2 animal')); const g = el('div', 'row wrap'); H.ANIMALS.filter(a => H.state.animals[a.id]).forEach(a => { const c = el('button', 'chip' + (H.players[1].animalId === a.id ? ' on' : ''), esc(a.name)); c.onclick = () => { H.setAnimal(1, a.id); this.refresh(); }; g.appendChild(c); }); b.appendChild(g); }
          return;
        }
        b.appendChild(el('p', 'lead', esc(N.statusText())));
        // nickname
        const nr = el('label', 'set', '<span>Your name</span>'); const ni = el('input'); ni.id = 'netName'; ni.maxLength = 20; ni.value = N.online ? N.displayName() : (H.settings.name || ''); ni.className = 'textIn';
        const ns = el('button', 'btn sm', 'Save'); ns.onclick = () => { N.setName(ni.value); this.toast('Name saved'); }; nr.append(ni, ns); b.appendChild(nr);
        if (N.t && N.t.kind !== 'room') {
          const rr = el('label', 'set', '<span>Room (share it with friends)</span>'); const ri = el('input'); ri.id = 'netRoom'; ri.maxLength = 24; ri.value = N.t.room; ri.className = 'textIn';
          const rj = el('button', 'btn sm', 'Join room'); rj.onclick = () => { const v = (ri.value.toLowerCase().match(/[a-z0-9-]+/g) || ['main']).join('-').slice(0, 24); N.switchRoom(v); setTimeout(() => this.refresh(), 800); }; rr.append(ri, rj); b.appendChild(rr);
          const link = location.origin + location.pathname + '#' + N.t.room; const lr = el('div', 'row wrap'); const lc = el('code', 'linkCode', esc(link)); const cp = el('button', 'btn sm ghost', 'Copy invite link'); cp.onclick = () => { try { navigator.clipboard.writeText(link).then(() => this.toast('Invite link copied'), () => this.toast(link)); } catch (e) { this.toast(link); } }; lr.append(lc, cp); b.appendChild(lr);
          if (N.serverInfo && N.serverInfo.rooms && N.serverInfo.rooms.length) b.appendChild(el('p', 'muted', 'Busy rooms: ' + N.serverInfo.rooms.slice(0, 8).map(r => esc(r.name) + ' (' + r.players + ')').join(' · ')));
        }
        if (N.online) {
          const cb = el('button', 'btn', '💬 Chat'); cb.onclick = () => { this.close(); setTimeout(() => N.openChat(), 50); }; b.appendChild(cb);
          // open house
          const owned = H.PROPERTIES.filter(p => H.state.props[p.id]);
          const oh = el('label', 'set', '<span>Open house (friends can visit this property)</span>'); const os = el('select'); os.id = 'netHome'; const none = el('option', '', 'None'); none.value = ''; os.appendChild(none);
          owned.forEach(p => { const o = el('option', '', esc(p.name)); o.value = p.id; if (H.state.openHouse === p.id) o.selected = true; os.appendChild(o); }); os.onchange = () => { H.state.openHouse = os.value || null; H.dirty(); }; oh.appendChild(os); b.appendChild(oh);
          b.appendChild(el('h3', '', `Players here (${N.remotes.size + 1})`));
          const list = el('div', 'mlist');
          list.appendChild(el('div', 'mrow', `<span class="ic">⭐</span><div><b>${esc(N.displayName())} (you)</b><small>${esc(H.players[0].def.name)}</small></div>`));
          for (const r of N.remotes.values()) {
            const d = r.d; const row = el('div', 'mrow'); const an = H.ANIMAL[d.a] ? H.ANIMAL[d.a].name : 'Animal'; const dist = Math.round(r.pos.distanceTo(H.players[0].pos));
            const mis = typeof d.m === 'string' && H.MISSION[d.m] ? H.MISSION[d.m] : null; const home = d.hm && H.PROP[d.hm.p] ? d.hm : null;
            row.innerHTML = `<span class="ic">🐾</span><div><b>${esc(d.n || 'Player')}</b><small>${esc(an)}${d.vh ? ' · driving' : ''}${d.i ? ' · indoors' : ' · ' + dist + ' m away'}${mis ? ' · on “' + esc(mis.name) + '”' : ''}</small></div>`;
            const tp = el('button', 'btn sm', 'Go to'); tp.onclick = () => { if (d.i) { this.toast('They\'re indoors right now.'); return; } H.travelTo(r.pos.x + 2, r.pos.z + 2); this.close(); }; row.appendChild(tp);
            if (mis) { const jm = el('button', 'btn sm buy', 'Join mission'); jm.onclick = () => { this.close(); H.travelTo(mis.x, mis.z); setTimeout(() => H.missions.start(mis), 300); }; row.appendChild(jm); }
            if (home) { const vh = el('button', 'btn sm ghost', 'Visit home'); vh.onclick = () => { const pl = H.players[0]; this.close(); if (pl.vehicle) pl.vehicle.exit(pl); pl.visiting = home.f.filter(f => Array.isArray(f) && H.FURN[f[0]]).map(f => ({ id: f[0], x: +f[1] || 0, z: +f[2] || 0, ry: +f[3] || 0 })); H.enterInterior(pl, H.interiors['prop_' + home.p]); this.toast(`🏠 Visiting ${d.n || 'a friend'}'s ${H.PROP[home.p].name}`); }; row.appendChild(vh); }
            const wv = el('button', 'btn sm ghost', '👋'); wv.title = 'Wave'; wv.onclick = () => { N.event('wave', r.id); this.toast('Waved at ' + (d.n || 'them')); }; row.appendChild(wv);
            list.appendChild(row);
          }
          if (!N.remotes.size) list.appendChild(el('p', 'muted', N.t.kind === 'room' ? 'Nobody else is here yet. Share this page from its Share menu; anyone signed in who opens it appears here.' : 'Nobody else is in this room yet. Send friends the invite link above.'));
          b.appendChild(list);
          b.appendChild(el('h3', '', 'Playing together'));
          b.appendChild(el('ul', '', '<li>Headbutt, charge or blast other players to ragdoll them.</li><li>Press <kbd>Enter</kbd> or <kbd>T</kbd> to chat; messages also pop up over your head.</li><li>Start the same race or sports mission and see who finishes first.</li><li>Set an open house and friends can walk through your furniture.</li>'));
        } else {
          b.appendChild(el('h3', '', 'How to play online'));
          b.appendChild(el('ul', '', '<li>Run the bundled server (<code>hoofquake/server</code>: <code>npm install && npm start</code>) or deploy it, then open the page it serves. Everyone on that address plays together, split into rooms.</li><li>Or open the game as a claude.ai artifact and share it: signed-in people who open it share one world.</li>'));
        }
      });
    },
    // ------------------------------------------------------------------ settings
    openSettings() {
      const s = H.settings;
      this.show('Settings', [['game', 'Game'], ['video', 'Graphics'], ['controls', 'Controls'], ['save', 'Save & load']], 'game', (t, b) => {
        const range = (label, key, min, max, step, fn) => { const r = el('label', 'set', `<span>${label}</span>`); const i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = s[key]; i.id = 'set_' + key; const v = el('em', '', s[key]); i.oninput = () => { s[key] = +i.value; v.textContent = i.value; fn && fn(+i.value); H.saveSettings(); }; r.append(i, v); b.appendChild(r); };
        const check = (label, key, fn) => { const r = el('label', 'set', `<span>${label}</span>`); const i = el('input'); i.type = 'checkbox'; i.checked = !!s[key]; i.id = 'set_' + key; i.onchange = () => { s[key] = i.checked; fn && fn(i.checked); H.saveSettings(); }; r.appendChild(i); b.appendChild(r); };
        if (t === 'game') {
          range('Volume', 'volume', 0, 1, 0.05, v => H.Audio.setVol(v));
          const tr = el('label', 'set', '<span>Time of day</span>'); const ti = el('input'); ti.type = 'range'; ti.min = 0; ti.max = 23.9; ti.step = 0.1; ti.value = H.Sky.time; ti.id = 'set_time'; const tv = el('em', '', H.Sky.clock()); ti.oninput = () => { H.Sky.time = +ti.value; tv.textContent = H.Sky.clock(); }; tr.append(ti, tv); b.appendChild(tr);
          range('Time speed', 'timeSpeed', 0, 10, 0.5, v => (H.Sky.timeSpeed = v));
          const wr = el('label', 'set', '<span>Weather</span>'); const ws = el('select'); ws.id = 'set_weather'; ['auto', 'clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'].forEach(w => { const o = el('option', '', w[0].toUpperCase() + w.slice(1)); o.value = w; if ((H.Sky.forced || 'auto') === w) o.selected = true; ws.appendChild(o); }); ws.onchange = () => { H.Sky.forced = ws.value === 'auto' ? null : ws.value; if (H.Sky.forced) H.Sky.weather = H.Sky.forced; }; wr.appendChild(ws); b.appendChild(wr);
          check('Animal Control (police chase when you cause chaos)', 'animalControl');
          check('Random world events', 'events');
          const ev = el('button', 'btn ghost', 'Trigger a random world event now'); ev.onclick = () => { H.events.t = 0; this.close(); }; b.appendChild(ev);
          const st = el('button', 'btn ghost', 'Unstick me (teleport to safety)'); st.onclick = () => { H.players[0].respawnSafe(); this.close(); }; b.appendChild(st);
        }
        if (t === 'video') {
          check('Shadows', 'shadows'); range('Resolution scale', 'pixelRatio', 0.5, 2, 0.25, () => H.resize()); range('View distance', 'viewDist', 300, 1500, 50, v => { H.cameras.forEach(c => { c.far = v * 2.5; c.updateProjectionMatrix(); }); });
          range('Field of view', 'fov', 50, 95, 1, v => { H.cameras.forEach(c => { c.fov = v; c.updateProjectionMatrix(); }); }); range('Traffic cars', 'traffic', 0, 40, 2); check('Show touch controls', 'touch', v => ($('#touch').hidden = !v));
        }
        if (t === 'controls') {
          range('Mouse sensitivity', 'sens', 0.2, 3, 0.1); check('Invert vertical camera', 'invertY');
          b.appendChild(el('p', 'muted', 'Click a key to rebind it, then press the new key. Mouse: left = attack, right = lick/grab, wheel = zoom.'));
          const tb = el('div', 'binds');
          for (const a of Object.keys(H.ACTION_LABEL)) { if (a === 'move' || a === 'camLeft' || a === 'camRight') continue; const r = el('div', 'bind', `<span>${H.ACTION_LABEL[a]}</span>`); const k = el('button', 'key', H.keyName(a)); k.onclick = () => { k.textContent = 'Press a key…'; H.rebinding = (code) => { H.keys[0][a] = [code]; H.saveSettings(); this.refresh(); }; }; r.appendChild(k); tb.appendChild(r); }
          b.appendChild(tb); const rs = el('button', 'btn ghost', 'Reset to defaults'); rs.onclick = () => { H.resetKeys(); this.refresh(); }; b.appendChild(rs);
        }
        if (t === 'save') this.saveSection(b);
      });
    },
    saveSection(b) {
      b.appendChild(el('p', 'lead', H.Save.ready ? 'Your progress saves automatically to your private Claude account record about every minute and after every purchase.' : 'Cloud saving isn\'t available in this view. Copy a save code to keep your progress, and paste it next time.'));
      if (H.Save.ready) { const sv = el('button', 'btn', 'Save now'); sv.onclick = () => H.Save.save(true); b.appendChild(sv); }
      b.appendChild(el('h3', '', 'Save code'));
      const ta = el('textarea', 'code'); ta.id = 'saveCode'; ta.readOnly = true; ta.value = H.Save.code(); b.appendChild(ta);
      const cp = el('button', 'btn', 'Copy code'); cp.onclick = () => { try { navigator.clipboard.writeText(ta.value).then(() => this.toast('Save code copied'), () => { ta.select(); this.toast('Select-all is on — copy with Ctrl/Cmd+C'); }); } catch (e) { ta.select(); } }; b.appendChild(cp);
      b.appendChild(el('h3', '', 'Load a save code'));
      const ti = el('textarea', 'code'); ti.id = 'loadCode'; ti.placeholder = 'Paste a save code here'; b.appendChild(ti);
      const ld = el('button', 'btn', 'Load code'); ld.onclick = () => { try { const s = H.Save.fromCode(ti.value); H.applyState(s); H.reloadWorldState(); this.toast('Save loaded'); this.close(); } catch (e) { this.toast('That code didn\'t work — check you pasted all of it.', 'bad'); } }; b.appendChild(ld);
      const fl = el('label', 'btn ghost', 'Load from file…'); const fi = el('input'); fi.type = 'file'; fi.accept = '.txt,.json'; fi.hidden = true; fi.id = 'loadFile'; fi.onchange = () => { const f = fi.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const txt = String(rd.result).trim(); const s = txt.startsWith('{') ? JSON.parse(txt) : H.Save.fromCode(txt); H.applyState(s); H.reloadWorldState(); this.toast('Save loaded'); this.close(); } catch (e) { this.toast('Couldn\'t read that file.', 'bad'); } }; rd.readAsText(f); }; fl.appendChild(fi); b.appendChild(fl);
      const rs = el('button', 'btn danger', 'Start over'); rs.onclick = () => { if (rs.dataset.armed) { H.applyState(H.newState()); H.reloadWorldState(); this.toast('Fresh start!'); this.close(); } else { rs.dataset.armed = 1; rs.textContent = 'Tap again to erase all progress'; } }; b.appendChild(rs);
    },
    openSaveCode() { this.show('Save & load', null, null, (t, b) => this.saveSection(b)); },
    // ------------------------------------------------------------------ touch controls
    buildTouch() {
      const T = H.touch = { mx: 0, mz: 0, look: { dx: 0, dy: 0 }, btn: {}, pressed: {} };
      const stick = $('#stick'), knob = $('#knob'); let sid = null, sx = 0, sy = 0;
      stick.addEventListener('pointerdown', e => { sid = e.pointerId; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; stick.setPointerCapture(sid); e.preventDefault(); });
      stick.addEventListener('pointermove', e => { if (e.pointerId !== sid) return; let dx = e.clientX - sx, dy = e.clientY - sy; const m = 50, d = Math.hypot(dx, dy); if (d > m) { dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; T.mx = dx / m; T.mz = dy / m; T.sprint = d > m * 0.95; });
      const end = e => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; T.mx = T.mz = 0; T.sprint = false; };
      stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
      const look = $('#lookpad'); let lid = null, lx = 0, ly = 0;
      look.addEventListener('pointerdown', e => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; look.setPointerCapture(lid); });
      look.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; T.look.dx += e.clientX - lx; T.look.dy += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
      look.addEventListener('pointerup', e => { if (e.pointerId === lid) lid = null; });
      document.querySelectorAll('#touch [data-act]').forEach(b => { const a = b.dataset.act; b.addEventListener('pointerdown', e => { e.preventDefault(); H.Audio.init(); T.btn[a] = true; T.pressed[a] = true; b.classList.add('on'); }); const up = () => { T.btn[a] = false; b.classList.remove('on'); }; b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); });
      $('#tMenu').onclick = () => this.mainMenu(true); $('#tMap').onclick = () => this.menu('map');
    },
  };
  function srcLabel(s) { return { statues6: 'Find 6 statues', statues12: 'Find 12 statues', ufo: 'Crash Site secret', lab: 'Hidden lab', shipwreck: 'Shipwreck', mossback: 'The Mossback', ducks: 'All ducks', gnomes: 'All gnomes', summit: 'Summit', cave: 'Grumble Cave', temple: 'Temple top', lighthouse: 'Lighthouse', event: 'World event', missions: 'Mission reward', achievements: 'Achievement', chests: 'Treasure chests' }[s] || 'Special'; }
  function typeLabel(t) { return { car: 'Car', truck: 'Truck', bus: 'Bus', kart: 'Go-kart', tractor: 'Tractor', digger: 'Construction', moto: 'Motorcycle', bike: 'Bicycle', skate: 'Skateboard', boat: 'Boat', jetski: 'Jet ski', sub: 'Submarine', hover: 'Hovercraft', heli: 'Aircraft (VTOL)', plane: 'Airplane' }[t] || t; }
})();
