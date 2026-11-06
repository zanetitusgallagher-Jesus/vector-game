// Hoofquake — procedural models: animals (with cosmetics), humans, vehicles, collectibles.
'use strict';
(function () {
  const patCache = new Map();
  function patternTex(pat, c1, c2) {
    const key = pat + c1 + c2; if (patCache.has(key)) return patCache.get(key);
    const t = H.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = c2; const r = H.rng(pat.length * 31 + 7);
      switch (pat) {
        case 'spots': for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(r() * w, r() * h, 5 + r() * 10, 0, 7); g.fill(); } break;
        case 'patches': for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 14 + r() * 20, 10 + r() * 16, r() * 3, 0, 7); g.fill(); } break;
        case 'stripes': for (let i = 0; i < 8; i++) g.fillRect(i * 16, 0, 7, h); break;
        case 'zebra': for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(i * 13, 0); g.quadraticCurveTo(i * 13 + 14, h / 2, i * 13 - 2, h); g.lineTo(i * 13 + 6, h); g.quadraticCurveTo(i * 13 + 20, h / 2, i * 13 + 6, 0); g.fill(); } break;
        case 'tiger': g.fillStyle = '#e8862a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1410'; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 15, 0); g.lineTo(i * 15 + 6, h * 0.6); g.lineTo(i * 15 + 10, 0); g.fill(); } break;
        case 'leopard': for (let i = 0; i < 18; i++) { const x = r() * w, y = r() * h; g.strokeStyle = c2; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 6, 0, 5); g.stroke(); } break;
        case 'checker': for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) g.fillRect(i * 16, j * 16, 16, 16); break;
        case 'camo': ['#4a5a2a', '#6a7a3a', '#3a3a2a', '#8a8a5a'].forEach(cc => { g.fillStyle = cc; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 14, 6 + r() * 10, r() * 3, 0, 7); g.fill(); } }); break;
        case 'hearts': g.fillStyle = '#ff4a8a'; for (let i = 0; i < 10; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.arc(x - 3, y, 4, 0, 7); g.arc(x + 3, y, 4, 0, 7); g.moveTo(x - 7, y + 1); g.lineTo(x, y + 9); g.lineTo(x + 7, y + 1); g.fill(); } break;
        case 'stars': case 'galaxy': if (pat === 'galaxy') { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a0a3a'); gr.addColorStop(0.5, '#4a1a7a'); gr.addColorStop(1, '#0a2a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } g.fillStyle = pat === 'galaxy' ? '#ffffff' : '#ffd21a'; for (let i = 0; i < (pat === 'galaxy' ? 60 : 12); i++) { const x = r() * w, y = r() * h, s = pat === 'galaxy' ? r() * 2 : 4; g.fillRect(x, y, s + 1, s + 1); } break;
        case 'flames': for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ff7a1a' : '#ffd21a'; g.beginPath(); g.moveTo(i * 16, h); g.quadraticCurveTo(i * 16 + 4, h * 0.3, i * 16 + 8, h * (0.1 + r() * 0.3)); g.quadraticCurveTo(i * 16 + 14, h * 0.5, i * 16 + 16, h); g.fill(); } break;
        case 'circuit': g.fillStyle = '#0a2a1a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2affa0'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); x += (r() - 0.5) * 60; g.lineTo(x, y); y += (r() - 0.5) * 60; g.lineTo(x, y); g.stroke(); g.fillStyle = '#2affa0'; g.fillRect(x - 2, y - 2, 4, 4); } break;
        case 'rainbow': ['#ff3a3a', '#ff9a2a', '#ffe22a', '#3ad84a', '#2a8aff', '#8a4aff'].forEach((cc, i) => { g.fillStyle = cc; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); break;
        case 'lava': g.fillStyle = '#2a0a0a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff5a1a'; g.lineWidth = 4; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); } break;
        case 'ice': g.fillStyle = '#d8f4ff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8ad0ff'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); } break;
        case 'pixel': for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (r() < 0.3) { g.fillStyle = ['#ff2ad8', '#2affd0', '#ffe22a', c2][Math.floor(r() * 4)]; g.fillRect(i * 8, j * 8, 8, 8); } break;
        case 'gnome': g.fillStyle = '#d8261a'; for (let i = 0; i < 10; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x - 5, y + 4); g.lineTo(x + 5, y + 4); g.fill(); } g.fillStyle = '#2a5ad8'; for (let i = 0; i < 8; i++) g.fillRect(r() * w, r() * h, 6, 6); break;
      }
    });
    patCache.set(key, t); return t;
  }

  function cosMat(d, fallback) {
    const c = (d && d.c) || fallback || '#ffffff';
    if (d && d.galaxy) return new THREE.MeshPhongMaterial({ color: 0xffffff, map: patternTex('galaxy', '#000', '#fff'), emissive: 0x3a1a6a, emissiveIntensity: 0.6 });
    if (d && d.metal) return new THREE.MeshPhongMaterial({ color: c, shininess: 120, specular: 0xffffff, emissive: d.glow ? c : 0x000000, emissiveIntensity: d.glow ? 0.35 : 0 });
    if (d && d.glow) return new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 });
    return new THREE.MeshLambertMaterial({ color: c });
  }
  const box = (mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(H.G.box, mat); m.scale.set(w, h, d); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; };
  const geo = (g, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(H.G[g], mat); m.scale.set(sx, sy, sz); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; };

  // ------------------------- ANIMALS -------------------------
  H.buildAnimal = function (def, outfit) {
    outfit = outfit || {};
    const S = def.scale || 1, root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
    const furItem = outfit.fur && H.COSMETIC[outfit.fur], patItem = outfit.pattern && H.COSMETIC[outfit.pattern];
    const col = furItem ? furItem.data.c : def.col, col2 = def.col2;
    let pat = patItem ? patItem.base : null;
    if (!pat || pat === 'none') pat = def.galaxy ? 'galaxy' : def.spots === 1 ? 'patches' : def.spots === 2 ? 'leopard' : def.stripes === 1 ? 'tiger' : def.stripes === 2 ? 'zebra' : null;
    let mat;
    if (furItem && furItem.data.prism) mat = new THREE.MeshPhongMaterial({ color: 0xffffff, map: patternTex('rainbow', '#fff', '#fff'), shininess: 80 });
    else if (pat) mat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: patternTex(pat, col, pat === 'tiger' ? col2 : col2) });
    else if (furItem && furItem.data.metal) mat = new THREE.MeshPhongMaterial({ color: col, shininess: 110, specular: 0xffffff, emissive: furItem.data.glow ? col : 0, emissiveIntensity: 0.25 });
    else if (def.robot) mat = new THREE.MeshPhongMaterial({ color: col, shininess: 90, specular: 0xaaaaaa });
    else mat = new THREE.MeshLambertMaterial({ color: col });
    if (def.glow && !furItem) { mat.emissive = new THREE.Color(def.glow); mat.emissiveIntensity = 0.25; }
    const mat2 = new THREE.MeshLambertMaterial({ color: col2 });
    const hoof = new THREE.MeshLambertMaterial({ color: def.robot ? '#2a2a30' : '#3a2a20' });
    const [bw, bh, bl] = def.body.map(v => v * S); const leg = def.leg * S, headS = def.head * S;
    const parts = { legs: [], arms: [], wings: [], attach: {}, rig, root, mat };
    let headPos, bodyTop, height, radius = Math.max(bw, bl) * 0.45;

    if (def.kind === 'quad' || def.kind === 'blob' || def.kind === 'fish') {
      const by = leg + bh / 2;
      if (def.kind === 'blob') { const b = geo('sphere', mat, bw * 1.2, bh * 1.2, bl * 1.2, 0, bh * 0.55, 0); b.material = new THREE.MeshPhongMaterial({ color: col, transparent: true, opacity: 0.85, shininess: 100, emissive: def.glow || 0, emissiveIntensity: 0.3 }); rig.add(b); parts.body = b; bodyTop = bh * 1.1; headPos = new THREE.Vector3(0, bh * 0.7, bl * 0.45); }
      else if (def.kind === 'fish') { const b = geo('capsule', mat, bw, bl / 2, bh, 0, bh * 0.5, 0); b.rotation.x = Math.PI / 2; rig.add(b); parts.body = b; const belly = geo('capsule', mat2, bw * 0.8, bl / 2.2, bh * 0.6, 0, bh * 0.3, 0); belly.rotation.x = Math.PI / 2; rig.add(belly); const fin = geo('cone', mat, 0.2 * S, 1.1 * S, 0.9 * S, 0, bh + 0.3 * S, 0); rig.add(fin); bodyTop = bh; headPos = new THREE.Vector3(0, bh * 0.55, bl * 0.55); }
      else {
        const body = def.wool ? geo('lowSphere', mat, bw * 1.25, bh * 1.2, bl * 1.15, 0, by, 0) : box(mat, bw, bh, bl, 0, by, 0); rig.add(body); parts.body = body;
        if (def.hump) rig.add(geo('sphere', mat, bw * 0.8, bh * 0.8, bl * 0.4, 0, by + bh * 0.5, 0));
        if (def.panda) { rig.add(box(mat2, bw * 1.02, bh * 0.45, bl * 0.35, 0, by + bh * 0.1, bl * 0.12)); }
        if (def.spikes) for (let i = 0; i < 6; i++) rig.add(geo('cone', mat2, 0.25 * S, 0.5 * S, 0.25 * S, 0, by + bh / 2 + 0.2 * S, -bl / 2 + i * bl / 5));
        if (def.moss) rig.add(geo('ico', new THREE.MeshLambertMaterial({ color: '#6a8a3a' }), bw * 1.1, bh * 0.4, bl * 1.1, 0, by + bh * 0.4, 0));
        bodyTop = by + bh / 2;
        const lx = bw / 2 - 0.12 * S, lz = bl / 2 - 0.18 * S, lw = Math.max(0.16, Math.min(bw, bl) * 0.22);
        for (const [x, z] of [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]]) {
          const p = new THREE.Group(); p.position.set(x, leg, z); const L = box(mat, lw, leg, lw, 0, -leg / 2, 0); p.add(L); p.add(box(hoof, lw * 1.1, 0.12 * S, lw * 1.1, 0, -leg + 0.06 * S, 0)); rig.add(p); parts.legs.push(p);
        }
        headPos = new THREE.Vector3(0, by + bh * 0.25, bl / 2);
      }
    } else if (def.kind === 'biped') {
      const by = leg + bh / 2, lean = def.tail === 'dino' ? 0.9 : 0;
      const body = box(mat, bw, bh, bl, 0, by, 0); body.rotation.x = lean * 0.6; rig.add(body); parts.body = body;
      if (def.flippers || def.id === 'penguin') rig.add(box(mat2, bw * 0.8, bh * 0.8, 0.1 * S, 0, by, bl / 2 + 0.01));
      if (def.moss) rig.add(geo('ico', new THREE.MeshLambertMaterial({ color: '#6a8a3a' }), bw * 1.1, bh * 0.4, bl * 1.1, 0, by + bh * 0.4, 0));
      bodyTop = by + bh / 2;
      for (const x of [-bw * 0.28, bw * 0.28]) { const p = new THREE.Group(); p.position.set(x, leg, 0); p.add(box(mat, bw * 0.3, leg, bw * 0.32, 0, -leg / 2, 0)); p.add(box(hoof, bw * 0.34, 0.15 * S, bw * 0.5, 0, -leg + 0.08, 0.08 * S)); rig.add(p); parts.legs.push(p); }
      const al = (def.arms || 0.8) * S;
      for (const x of [-bw / 2 - 0.12 * S, bw / 2 + 0.12 * S]) { const p = new THREE.Group(); p.position.set(x, by + bh * 0.35, lean ? bl * 0.4 : 0); p.add(box(mat, 0.22 * S + al * 0.12, al, 0.24 * S + al * 0.12, 0, -al / 2, 0)); rig.add(p); parts.arms.push(p); }
      headPos = new THREE.Vector3(0, by + bh / 2 + headS * 0.35, lean ? bl * 0.75 : 0.05 * S);
    } else if (def.kind === 'bird') {
      const by = leg + bh / 2; const body = geo('sphere', mat, bw, bh, bl, 0, by, 0); rig.add(body); parts.body = body; rig.add(geo('sphere', mat2, bw * 0.7, bh * 0.6, bl * 0.5, 0, by - bh * 0.1, bl * 0.25));
      bodyTop = by + bh / 2;
      const legMat = new THREE.MeshLambertMaterial({ color: def.id === 'flamingo' ? '#ff8fae' : '#e8a82a' });
      for (const x of [-bw * 0.2, bw * 0.2]) { const p = new THREE.Group(); p.position.set(x, leg + 0.05, 0); p.add(box(legMat, 0.07 * S, leg, 0.07 * S, 0, -leg / 2, 0)); p.add(box(legMat, 0.2 * S, 0.05, 0.3 * S, 0, -leg, 0.1 * S)); rig.add(p); parts.legs.push(p); }
      const ws = [0, 0.7, 1.3, 2.4, 2.8][def.wings || 1] * S;
      for (const sd of [-1, 1]) { const p = new THREE.Group(); p.position.set(sd * bw * 0.45, by + bh * 0.2, 0); const w = box(mat, ws, 0.06 * S, bl * 0.75, sd * ws / 2, 0, 0); p.add(w); rig.add(p); parts.wings.push(p); p.userData.side = sd; }
      headPos = new THREE.Vector3(0, by + bh * 0.45 + (def.neck || 0) * S * 0.8, bl * 0.45);
    }
    // extra wings for flying quadrupeds
    if (def.wings && def.kind !== 'bird') { const ws = 2.6 * S; for (const sd of [-1, 1]) { const p = new THREE.Group(); p.position.set(sd * bw * 0.45, bodyTop, 0); p.add(box(mat2, ws, 0.08 * S, bl * 0.6, sd * ws / 2, 0, 0)); rig.add(p); parts.wings.push(p); p.userData.side = sd; } }

    // neck + head
    const headG = new THREE.Group(); parts.head = headG;
    if (def.kind === 'quad' && def.neck > 0) {
      const nl = def.neck * S, neck = new THREE.Group(); neck.position.copy(headPos); neck.rotation.x = -0.75;
      neck.add(box(mat, Math.min(bw, 0.5 * S + headS * 0.4), nl + 0.2 * S, Math.min(bw, 0.5 * S + headS * 0.4), 0, nl / 2, 0)); rig.add(neck); parts.neck = neck;
      headG.position.set(0, nl, 0); headG.rotation.x = 0.75; neck.add(headG);
      if (def.mane) neck.add(box(new THREE.MeshLambertMaterial({ color: def.mane === 3 ? '#ff8ad8' : col2 }), 0.15 * S, nl, 0.3 * S, 0, nl / 2, -0.25 * S));
    } else if (def.kind === 'bird' && def.neck > 0.3) {
      const nl = def.neck * S; const neck = new THREE.Group(); neck.position.set(0, bodyTop - 0.1, def.body[2] * S * 0.4); neck.add(box(mat, 0.15 * S, nl, 0.15 * S, 0, nl / 2, 0)); rig.add(neck); parts.neck = neck; headG.position.set(0, nl, 0); neck.add(headG);
    } else { headG.position.copy(headPos); rig.add(headG); }
    if (def.kind !== 'blob' && def.kind !== 'fish') {
      const hd = def.kind === 'bird' ? geo('sphere', mat, headS, headS, headS) : box(mat, headS, headS * 0.9, headS * (def.snout === 2 ? 1.4 : 1.1));
      headG.add(hd);
      if (def.snout) headG.add(box(def.id === 'pig' ? mat2 : mat, headS * 0.55, headS * 0.45, headS * (def.snout === 2 ? 0.9 : 0.4), 0, -headS * 0.15, headS * (def.snout === 2 ? 1.0 : 0.7)));
      if (def.snout === 2 && def.teeth !== 0) headG.add(box(new THREE.MeshLambertMaterial({ color: '#fffef0' }), headS * 0.5, 0.05 * S, headS * 0.8, 0, -headS * 0.3, headS * 1.0));
      if (def.beak) { const bm = new THREE.MeshLambertMaterial({ color: def.beak === 3 ? '#c8a07a' : '#f2a81a' }); const bk = geo('cone', bm, headS * 0.35, headS * (def.beak === 3 ? 1.8 : def.beak === 2 ? 0.8 : 0.6), headS * 0.35, 0, -headS * 0.05, headS * 0.6 + (def.beak === 3 ? 0.5 * S : 0)); bk.rotation.x = Math.PI / 2; headG.add(bk); }
      if (def.comb) headG.add(box(new THREE.MeshLambertMaterial({ color: '#e23b2e' }), 0.08 * S, headS * 0.4, headS * 0.5, 0, headS * 0.6, 0));
      if (def.crest) { const c = geo('cone', mat2, 0.2 * S, 1.2 * S, 0.3 * S, 0, headS * 0.3, -headS * 0.6); c.rotation.x = -2.2; headG.add(c); }
      if (def.trunk) { const tr = new THREE.Group(); tr.position.set(0, -headS * 0.1, headS * 0.55); tr.rotation.x = 0.3; tr.add(geo('cyl', mat, 0.28 * S, 1.6 * S, 0.28 * S, 0, -0.8 * S, 0)); headG.add(tr); parts.trunk = tr; }
      if (def.tusks) for (const sd of [-1, 1]) { const t = geo('cone', new THREE.MeshLambertMaterial({ color: '#fffef0' }), 0.15 * S, 0.9 * S, 0.15 * S, sd * headS * 0.3, -headS * 0.45, headS * 0.6); t.rotation.x = 2.2; headG.add(t); }
      // horns
      const hm = new THREE.MeshLambertMaterial({ color: def.horns === 'unicorn' ? '#ffd76a' : def.horns === 'dragon' ? col2 : '#d8cbb0' });
      if (def.horns === 'goat' || def.horns === 'small') for (const sd of [-1, 1]) { const h = geo('cone', hm, 0.14 * S, (def.horns === 'goat' ? 0.7 : 0.35) * S, 0.14 * S, sd * headS * 0.25, headS * 0.6, -headS * 0.15); h.rotation.x = -0.6; h.rotation.z = -sd * 0.3; headG.add(h); }
      if (def.horns === 'rhino') { const h = geo('cone', hm, 0.3 * S, 0.9 * S, 0.3 * S, 0, headS * 0.2, headS * 0.75); h.rotation.x = 0.4; headG.add(h); }
      if (def.horns === 'unicorn') { const h = geo('cone', hm, 0.15 * S, 1.0 * S, 0.15 * S, 0, headS * 0.7, headS * 0.35); h.rotation.x = 0.5; h.material = new THREE.MeshLambertMaterial({ color: '#ffd76a', emissive: '#ffd76a', emissiveIntensity: 0.3 }); headG.add(h); }
      if (def.horns === 'trike') { for (const sd of [-1, 1]) { const h = geo('cone', hm, 0.2 * S, 1.2 * S, 0.2 * S, sd * headS * 0.3, headS * 0.5, headS * 0.3); h.rotation.x = 0.9; headG.add(h); } const n = geo('cone', hm, 0.18 * S, 0.5 * S, 0.18 * S, 0, 0, headS * 0.7); n.rotation.x = 0.6; headG.add(n); }
      if (def.frill) headG.add(box(mat2, headS * 2, headS * 1.4, 0.1 * S, 0, headS * 0.4, -headS * 0.5));
      if (def.horns === 'ossicone') for (const sd of [-1, 1]) headG.add(box(mat2, 0.1 * S, 0.3 * S, 0.1 * S, sd * 0.15 * S, headS * 0.6, -headS * 0.1));
      if (def.horns === 'antler' || def.horns === 'dragon') for (const sd of [-1, 1]) { const h = geo('cone', hm, 0.15 * S, 0.8 * S, 0.15 * S, sd * headS * 0.3, headS * 0.6, -headS * 0.3); h.rotation.x = -1; headG.add(h); }
      // ears
      const em = def.ears === 'elephant' ? mat : mat2;
      const earDef = { pointy: [0.12, 0.3, 0.08, 0.5, 0], floppy: [0.3, 0.12, 0.2, 0.4, 0.5], round: [0.22, 0.22, 0.06, 0.5, 0], long: [0.12, 0.7, 0.06, 0.75, 0], tuft: [0.1, 0.25, 0.06, 0.55, 0], antenna: [0.04, 0.5, 0.04, 0.7, 0], elephant: [0.1, 1.2, 1.0, 0, 0] }[def.ears];
      if (earDef) for (const sd of [-1, 1]) { const e = box(em, earDef[0] * S, earDef[1] * S, earDef[2] * S, sd * (headS * 0.5 + earDef[0] * S * 0.5), headS * earDef[3], -headS * 0.1); if (def.ears === 'floppy') e.rotation.z = sd * 0.6; if (def.ears === 'elephant') e.position.x = sd * headS * 0.65; headG.add(e); }
      if (def.beard) headG.add(box(mat2, 0.12 * S, 0.3 * S, 0.12 * S, 0, -headS * 0.55, headS * 0.35));
      if (def.mane === 2) headG.add(geo('ico', mat2, headS * 1.8, headS * 1.7, headS * 1.0, 0, 0, -headS * 0.2));
      if (def.extraHeads) { const h2 = box(mat, headS * 0.8, headS * 0.7, headS * 0.9, headS * 0.9, headS * 0.1, -0.1); headG.add(h2); h2.add(geo('sphere', new THREE.MeshLambertMaterial({ color: '#ff2a2a', emissive: '#ff2a2a' }), 0.15, 0.15, 0.15, 0, 0.1, 0.5)); }
    } else if (def.kind === 'fish') { headG.add(box(new THREE.MeshLambertMaterial({ color: '#fffef0' }), headS * 0.8, 0.06, headS * 0.3, 0, -headS * 0.25, headS * 0.5)); }
    // eyes
    const eyeItem = outfit.eyes && H.COSMETIC[outfit.eyes]; const eb = eyeItem ? eyeItem.base : 'normal';
    const eyeSize = (def.bigeyes ? 0.24 : eb === 'googly' ? 0.2 : 0.11) * S * (def.kind === 'blob' ? 2 : 1);
    const whiteM = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    const pupM = new THREE.MeshLambertMaterial({ color: eyeItem ? eyeItem.data.c : (def.robot ? '#2fd2ff' : '#111111'), emissive: (eyeItem && eyeItem.data.glow) || def.robot ? (eyeItem ? eyeItem.data.c : '#2fd2ff') : '#000', emissiveIntensity: 1 });
    const eyeFwd = def.kind === 'blob' ? headPos.z : (def.kind === 'bird' ? headS * 0.42 : headS * (def.snout === 2 ? 0.65 : 0.52));
    const eyeHolder = def.kind === 'blob' || def.kind === 'fish' ? rig : headG;
    parts.eyes = [];
    for (const sd of [-1, 1]) {
      const ex = sd * (def.kind === 'blob' ? bw * 0.3 : headS * 0.3), ey = def.kind === 'blob' ? headPos.y : def.kind === 'fish' ? headPos.y + 0.1 : headS * 0.2, ez = def.kind === 'fish' ? headPos.z : eyeFwd;
      const w = geo('sphere', whiteM, eyeSize * 2, eyeSize * 2, eyeSize * 2, ex, ey, ez); eyeHolder.add(w);
      let p; if (eb === 'hearts' || eb === 'stars') { p = geo(eb === 'stars' ? 'ico' : 'sphere', pupM, eyeSize * 1.6, eyeSize * 1.4, eyeSize * 0.6, ex, ey, ez + eyeSize * 0.9); }
      else p = geo('sphere', pupM, eyeSize * (eb === 'googly' ? 0.9 : 1.2), eyeSize * (eb === 'googly' ? 0.9 : 1.2), eyeSize * 0.5, ex, ey, ez + eyeSize * 0.85);
      eyeHolder.add(p); parts.eyes.push(p); p.userData.base = p.position.clone();
      if (eb === 'sleepy') eyeHolder.add(geo('box', mat, eyeSize * 2.2, eyeSize * 1.1, eyeSize * 2.2, ex, ey + eyeSize * 0.5, ez));
    }
    parts.googly = eb === 'googly';
    // tail
    const tailG = new THREE.Group(); tailG.position.set(0, def.kind === 'biped' ? leg + 0.3 * S : bodyTop - 0.15 * S, -(def.kind === 'blob' ? bl * 0.6 : bl / 2)); rig.add(tailG); parts.tail = tailG;
    const tl = { short: 0.3, long: 1.0, fluffy: 0.9, tuft: 1.0, wag: 0.6, curly: 0.3, puff: 0.2, croc: 2.0, dino: 2.4, thick: 1.6, fan: 0.5, fishtail: 0.8 }[def.tail] || 0;
    if (tl) {
      const tw = def.tail === 'fluffy' ? 0.35 : def.tail === 'croc' || def.tail === 'dino' || def.tail === 'thick' ? 0.5 : def.tail === 'puff' ? 0.3 : 0.1;
      const t = def.tail === 'puff' ? geo('sphere', new THREE.MeshLambertMaterial({ color: '#ffffff' }), tw * S, tw * S, tw * S, 0, 0, -0.1 * S) : def.tail === 'fan' ? box(mat, 0.6 * S, 0.06 * S, tl * S, 0, 0.1 * S, -tl * S / 2) : def.tail === 'fishtail' ? box(mat, 0.1 * S, 1.0 * S, 0.6 * S, 0, 0, -0.4 * S) : box(def.tail === 'fluffy' ? mat : mat, tw * S, tw * S, tl * S, 0, 0, -tl * S / 2);
      if (def.tail === 'fluffy') t.add(geo('sphere', whiteM, 1.1, 1.1, 0.3, 0, 0, -0.5));
      tailG.add(t); tailG.rotation.x = def.tail === 'croc' || def.tail === 'dino' || def.tail === 'thick' || def.tail === 'fishtail' ? 0.15 : -0.6;
      if (def.tail === 'tuft') t.add(geo('sphere', mat2, 2.5, 2.5, 0.3, 0, 0, -0.5));
    }
    parts.tailLen = tl * S;
    height = Math.max(bodyTop, headG.getWorldPosition(new THREE.Vector3()).y + headS) + 0.1;
    root.updateMatrixWorld(true); const hw = headG.getWorldPosition(new THREE.Vector3()); height = Math.max(bodyTop, hw.y + headS * 0.6);
    parts.mouth = new THREE.Object3D(); parts.mouth.position.set(0, -headS * 0.2, headS * 0.9 + (def.snout === 2 ? 0.6 * S : 0)); (def.kind === 'blob' || def.kind === 'fish' ? rig : headG).add(parts.mouth);
    if (def.kind === 'blob' || def.kind === 'fish') parts.mouth.position.copy(headPos).z += 0.4;
    // ---------- cosmetics ----------
    const hatY = def.kind === 'blob' ? bh * 1.2 : headS * 0.5;
    const hatHolder = def.kind === 'blob' || def.kind === 'fish' ? rig : headG;
    const hatOff = def.kind === 'blob' ? new THREE.Vector3(0, bh * 1.15, 0) : def.kind === 'fish' ? new THREE.Vector3(0, bh, bl * 0.25) : new THREE.Vector3(0, hatY, 0);
    const faceOff = def.kind === 'blob' ? new THREE.Vector3(0, headPos.y, headPos.z + eyeSize) : def.kind === 'fish' ? new THREE.Vector3(0, headPos.y + 0.1, headPos.z + 0.1) : new THREE.Vector3(0, headS * 0.2, eyeFwd + eyeSize);
    const hs = def.kind === 'blob' ? bw * 0.6 : headS;
    for (const slot of ['hat', 'face', 'neck', 'back', 'body', 'feet', 'tail']) {
      const it = outfit[slot] && H.COSMETIC[outfit[slot]]; if (!it) continue;
      const cm = cosMat(it.data), base = it.base;
      if (slot === 'hat') { const o = hatMesh(base, cm, hs); o.position.copy(hatOff); hatHolder.add(o); }
      if (slot === 'face') { const o = faceMesh(base, cm, hs, eyeSize); o.position.copy(faceOff); hatHolder.add(o); }
      if (slot === 'neck') { const o = neckMesh(base, cm, Math.min(bw, 1.2 * S)); if (parts.neck) { o.position.set(0, 0.15 * S, 0); parts.neck.add(o); } else { o.position.set(0, (def.kind === 'blob' ? bh * 0.4 : headG.position.y - headS * 0.5), def.kind === 'biped' ? 0 : headG.position.z * 0.8); rig.add(o); } }
      if (slot === 'back') { const o = backMesh(base, cm, bw, bl); o.position.set(0, bodyTop, def.kind === 'biped' ? -bl / 2 : 0); if (def.kind === 'biped') o.rotation.x = -Math.PI / 2; rig.add(o); parts.backItem = o; }
      if (slot === 'body') { const o = bodyMesh(base, cm, bw, bh, bl, def.kind); o.position.copy(parts.body.position); o.rotation.copy(parts.body.rotation); rig.add(o); }
      if (slot === 'feet') parts.legs.forEach(l => { const o = feetMesh(base, cm, S); o.position.y = -(def.kind === 'biped' ? leg : leg) + 0.05; l.add(o); });
      if (slot === 'tail' && tl) { const o = tailMesh(base, cm, S); o.position.z = -tl * S; tailG.add(o); }
    }
    parts.height = height; parts.radius = radius * 0.9 + 0.25; parts.bodyTop = bodyTop; parts.legLen = leg; parts.headS = headS;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    return parts;
  };

  function hatMesh(b, m, s) {
    const g = new THREE.Group(); const k = s;
    const add = (geoK, sx, sy, sz, x, y, z, mat, rx) => { const o = geo(geoK, mat || m, sx * k, sy * k, sz * k, x * k, y * k, z * k); if (rx) o.rotation.x = rx; g.add(o); return o; };
    switch (b) {
      case 'cap': add('sphere', 1.0, 0.6, 1.0, 0, 0.05, 0); add('box', 0.8, 0.05, 0.6, 0, 0.02, 0.55); break;
      case 'tophat': add('cyl', 1.2, 0.05, 1.2, 0, 0.02, 0); add('cyl', 0.75, 1.0, 0.75, 0, 0.5, 0); add('cyl', 0.77, 0.15, 0.77, 0, 0.12, 0, new THREE.MeshLambertMaterial({ color: '#d8263a' })); break;
      case 'cowboy': add('cyl', 1.6, 0.05, 1.6, 0, 0.03, 0); add('cyl', 0.7, 0.55, 0.8, 0, 0.3, 0); break;
      case 'beanie': add('sphere', 1.05, 0.8, 1.05, 0, 0.05, 0); add('sphere', 0.3, 0.3, 0.3, 0, 0.45, 0, new THREE.MeshLambertMaterial({ color: '#ffffff' })); break;
      case 'crown': case 'goldhorns': case 'crownmythic': add('cyl', 0.8, 0.4, 0.8, 0, 0.2, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add('cone', 0.18, 0.35, 0.18, Math.cos(a) * 0.36, 0.55, Math.sin(a) * 0.36); } add('sphere', 0.15, 0.15, 0.15, 0, 0.3, 0.42, new THREE.MeshLambertMaterial({ color: '#ff2a4a', emissive: '#ff2a4a', emissiveIntensity: 0.5 })); break;
      case 'helmet': case 'racehelmet': add('sphere', 1.15, 0.85, 1.25, 0, 0, 0); add('box', 0.9, 0.08, 0.3, 0, 0.1, 0.6, new THREE.MeshLambertMaterial({ color: '#2a2a2a' })); break;
      case 'viking': add('sphere', 1.1, 0.8, 1.1, 0, 0, 0); for (const sd of [-1, 1]) { const h = add('cone', 0.2, 0.7, 0.2, sd * 0.6, 0.35, 0, new THREE.MeshLambertMaterial({ color: '#f2ead8' })); h.rotation.z = -sd * 0.9; } break;
      case 'party': add('cone', 0.6, 1.0, 0.6, 0, 0.5, 0); add('sphere', 0.2, 0.2, 0.2, 0, 1.0, 0, new THREE.MeshLambertMaterial({ color: '#ffd21a' })); break;
      case 'chef': add('cyl', 0.8, 0.5, 0.8, 0, 0.25, 0, new THREE.MeshLambertMaterial({ color: '#ffffff' })); add('sphere', 1.1, 0.6, 1.1, 0, 0.6, 0); break;
      case 'wizard': add('cyl', 1.4, 0.05, 1.4, 0, 0.03, 0); add('cone', 0.8, 1.6, 0.8, 0, 0.8, 0); add('ico', 0.15, 0.15, 0.15, 0.2, 0.9, 0.3, new THREE.MeshLambertMaterial({ color: '#ffd21a', emissive: '#ffd21a' })); break;
      case 'halo': { const t = add('torus', 0.9, 0.9, 0.9, 0, 0.6, 0); t.rotation.x = Math.PI / 2; t.material = new THREE.MeshLambertMaterial({ color: m.color, emissive: m.color, emissiveIntensity: 0.8 }); break; }
      case 'propeller': add('sphere', 1.0, 0.6, 1.0, 0, 0.05, 0); add('cyl', 0.05, 0.3, 0.05, 0, 0.4, 0); { const p = add('box', 1.4, 0.03, 0.15, 0, 0.55, 0, new THREE.MeshLambertMaterial({ color: '#e8261a' })); p.userData.spin = 1; } break;
      case 'pirate': { const p = add('cyl', 1.4, 0.4, 0.7, 0, 0.25, 0); p.rotation.z = Math.PI / 2; p.scale.set(0.5 * k, 1.4 * k, 0.6 * k); add('box', 0.25, 0.25, 0.02, 0, 0.3, 0.32, new THREE.MeshLambertMaterial({ color: '#ffffff' })); break; }
      case 'sombrero': add('cyl', 2.2, 0.06, 2.2, 0, 0.03, 0); add('cone', 0.8, 0.9, 0.8, 0, 0.45, 0); break;
      case 'bunny': for (const sd of [-1, 1]) add('box', 0.18, 0.9, 0.08, sd * 0.25, 0.5, 0); break;
      case 'antlers': for (const sd of [-1, 1]) { add('box', 0.08, 0.7, 0.08, sd * 0.3, 0.35, 0); add('box', 0.4, 0.08, 0.08, sd * 0.45, 0.6, 0); add('box', 0.08, 0.3, 0.08, sd * 0.62, 0.75, 0); } break;
      case 'cone': add('cone', 0.8, 1.3, 0.8, 0, 0.6, 0); add('cyl', 0.62, 0.15, 0.62, 0, 0.45, 0, new THREE.MeshLambertMaterial({ color: '#ffffff' })); break;
      case 'flowers': for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; add('sphere', 0.25, 0.25, 0.25, Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45, new THREE.MeshLambertMaterial({ color: ['#ff8ad8', '#ffd21a', '#ffffff', '#ff5a5a'][i % 4] })); } break;
      case 'devil': for (const sd of [-1, 1]) { const h = add('cone', 0.16, 0.45, 0.16, sd * 0.3, 0.2, 0); h.rotation.z = -sd * 0.4; } break;
      case 'astro': { const h = add('sphere', 1.5, 1.5, 1.5, 0, -0.2, 0); h.material = new THREE.MeshPhongMaterial({ color: m.color, transparent: true, opacity: 0.45, shininess: 120 }); break; }
      case 'labhelmet': add('sphere', 1.3, 1.2, 1.3, 0, -0.1, 0); add('box', 0.8, 0.5, 0.05, 0, -0.1, 0.62, new THREE.MeshLambertMaterial({ color: '#3a4a5a' })); break;
      case 'duckhat': add('sphere', 0.9, 0.7, 1.0, 0, 0.3, 0); add('sphere', 0.5, 0.5, 0.5, 0, 0.75, 0.25); add('cone', 0.15, 0.3, 0.15, 0, 0.72, 0.55, new THREE.MeshLambertMaterial({ color: '#ff8a1a' }), Math.PI / 2); break;
      case 'fishhat': add('cyl', 1.2, 0.05, 1.2, 0, 0.03, 0); add('cyl', 0.8, 0.45, 0.85, 0, 0.25, 0); break;
      case 'lighthouse': add('cyl', 0.6, 0.6, 0.6, 0, 0.3, 0, m); add('cone', 0.7, 0.4, 0.7, 0, 0.8, 0, new THREE.MeshLambertMaterial({ color: '#2a2a2a' })); break;
      default: add('sphere', 1.0, 0.6, 1.0, 0, 0.05, 0);
    }
    return g;
  }
  function faceMesh(b, m, s, eye) {
    const g = new THREE.Group(); const k = s; const add = (gk, sx, sy, sz, x, y, z, mat) => { const o = geo(gk, mat || m, sx * k, sy * k, sz * k, x * k, y * k, z * k); g.add(o); return o; };
    switch (b) {
      case 'shades': case 'heartglasses': for (const sd of [-1, 1]) add(b === 'heartglasses' ? 'sphere' : 'box', 0.38, 0.25, 0.05, sd * 0.28, 0, 0.02); add('box', 0.25, 0.05, 0.03, 0, 0.05, 0.02); break;
      case 'round': for (const sd of [-1, 1]) { const t = add('torus', 0.35, 0.35, 0.35, sd * 0.28, 0, 0.02); } break;
      case 'monocle': add('torus', 0.4, 0.4, 0.4, 0.28, 0, 0.03); add('box', 0.02, 0.5, 0.02, 0.45, -0.3, 0); break;
      case 'goggles': case 'visor': add('box', 0.95, 0.32, 0.12, 0, 0, 0.02); add('box', 1.05, 0.08, 0.9, 0, 0, -0.4, new THREE.MeshLambertMaterial({ color: '#2a2a2a' })); break;
      case 'hero': case 'ninja': add('box', 1.02, b === 'ninja' ? 0.7 : 0.3, 0.06, 0, b === 'ninja' ? -0.2 : 0, 0.01); break;
      case 'clown': add('sphere', 0.3, 0.3, 0.3, 0, -0.3, 0.3); break;
      case 'stache': case 'chefstache': add('box', 0.6, 0.12, 0.08, 0, -0.35, 0.2); break;
      case 'patch': add('box', 0.3, 0.3, 0.04, 0.28, 0, 0.02); add('box', 1.05, 0.04, 0.04, 0, 0.15, 0); break;
      case 'phones': add('torus', 1.1, 1.1, 0.8, 0, 0.1, -0.5); for (const sd of [-1, 1]) add('cyl', 0.3, 0.15, 0.3, sd * 0.55, -0.1, -0.5); break;
      case 'mossmask': add('box', 1.05, 1.0, 0.08, 0, 0, 0.02); add('ico', 0.6, 0.4, 0.2, 0, 0.4, 0.05, new THREE.MeshLambertMaterial({ color: '#6a8a3a' })); break;
      default: add('box', 0.9, 0.25, 0.05, 0, 0, 0.02);
    }
    return g;
  }
  function neckMesh(b, m, w) {
    const g = new THREE.Group(); const k = w;
    const add = (gk, sx, sy, sz, x, y, z, mat) => { const o = geo(gk, mat || m, sx * k, sy * k, sz * k, x * k, y * k, z * k); g.add(o); return o; };
    switch (b) {
      case 'collar': case 'keycard': { const t = add('torus', 0.95, 0.95, 0.95, 0, 0, 0); t.rotation.x = Math.PI / 2; if (b === 'keycard') add('box', 0.25, 0.32, 0.03, 0, -0.3, 0.5); else add('sphere', 0.12, 0.12, 0.12, 0, -0.1, 0.5, new THREE.MeshLambertMaterial({ color: '#ffd21a' })); break; }
      case 'bowtie': add('cone', 0.25, 0.3, 0.12, -0.15, 0, 0.5).rotation.z = Math.PI / 2; add('cone', 0.25, 0.3, 0.12, 0.15, 0, 0.5).rotation.z = -Math.PI / 2; break;
      case 'scarf': case 'bandana': { const t = add('torus', 1.0, 1.0, 1.6, 0, 0, 0); t.rotation.x = Math.PI / 2; add('box', 0.2, 0.5, 0.06, 0.2, -0.3, 0.5); break; }
      case 'chain': case 'medal': { const t = add('torus', 1.0, 1.0, 0.6, 0, -0.1, 0.1); t.rotation.x = Math.PI / 2.4; add(b === 'medal' ? 'cyl' : 'box', 0.25, b === 'medal' ? 0.04 : 0.25, 0.25, 0, -0.35, 0.5).rotation.x = b === 'medal' ? Math.PI / 2 : 0; break; }
      case 'bell': { const t = add('torus', 0.95, 0.95, 0.95, 0, 0, 0, new THREE.MeshLambertMaterial({ color: '#8a5a2a' })); t.rotation.x = Math.PI / 2; add('cone', 0.25, 0.3, 0.25, 0, -0.25, 0.5); break; }
      case 'lei': for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add('sphere', 0.18, 0.18, 0.18, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, new THREE.MeshLambertMaterial({ color: ['#ff8ad8', '#ffd21a', '#ff5a5a', '#ffffff'][i % 4] })); } break;
      case 'tie': add('box', 0.15, 0.6, 0.04, 0, -0.3, 0.5); break;
      default: { const t = add('torus', 0.95, 0.95, 0.95, 0, 0, 0); t.rotation.x = Math.PI / 2; }
    }
    return g;
  }
  function backMesh(b, m, bw, bl) {
    const g = new THREE.Group(); const k = Math.max(bw, 0.7);
    const add = (gk, sx, sy, sz, x, y, z, mat) => { const o = geo(gk, mat || m, sx * k, sy * k, sz * k, x * k, y * k, z * k); g.add(o); return o; };
    switch (b) {
      case 'backpack': add('box', 0.6, 0.6, 0.7, 0, 0.3, -0.1); add('box', 0.5, 0.2, 0.05, 0, 0.3, 0.27, new THREE.MeshLambertMaterial({ color: '#2a2a2a' })); break;
      case 'angel': case 'bat': case 'butterfly': case 'wingsdemon': for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(sd * 0.2 * k, 0.3 * k, 0); const p = geo(b === 'butterfly' ? 'sphere' : 'box', m, 1.4 * k, 0.05 * k, 0.8 * k, sd * 0.7 * k, 0, 0); w.add(p); w.rotation.z = sd * 0.3; w.userData.flap = sd; g.add(w); } break;
      case 'cape': { const c = add('box', 0.9, 0.04, 1.3, 0, 0.05, -0.3); c.userData.cape = 1; break; }
      case 'jetpack': for (const sd of [-1, 1]) { add('cyl', 0.3, 0.8, 0.3, sd * 0.2, 0.45, -0.2); add('cone', 0.25, 0.3, 0.25, sd * 0.2, 0.0, -0.2, new THREE.MeshLambertMaterial({ color: '#ff7a1a', emissive: '#ff7a1a' })).rotation.x = Math.PI; } break;
      case 'guitar': { const gg = add('box', 0.4, 0.06, 1.3, 0.1, 0.1, -0.2); gg.rotation.y = 0.5; add('sphere', 0.6, 0.15, 0.6, 0.2, 0.12, 0.2); break; }
      case 'shell': add('sphere', 1.1, 0.6, 1.2, 0, 0, 0); break;
      case 'rocket': add('cyl', 0.3, 1.2, 0.3, 0, 0.7, -0.2); add('cone', 0.32, 0.4, 0.32, 0, 1.5, -0.2, new THREE.MeshLambertMaterial({ color: '#ffffff' })); break;
      case 'balloon': add('cyl', 0.01, 2.2, 0.01, 0, 1.1, 0, new THREE.MeshLambertMaterial({ color: '#ffffff' })); add('sphere', 0.7, 0.85, 0.7, 0, 2.4, 0).userData.bob = 1; break;
      case 'ufo': add('sphere', 0.8, 0.2, 0.8, 0, 1.5, 0).userData.bob = 1; add('sphere', 0.35, 0.3, 0.35, 0, 1.6, 0, new THREE.MeshLambertMaterial({ color: '#7affd0', emissive: '#2a8a6a' })).userData.bob = 1; break;
      case 'trophy': add('cyl', 0.3, 0.1, 0.3, 0, 0.05, 0); add('cone', 0.4, 0.5, 0.4, 0, 0.4, 0).rotation.x = Math.PI; break;
      case 'egg': add('sphere', 0.6, 0.8, 0.6, 0, 0.4, -0.1); break;
      default: add('box', 0.6, 0.6, 0.6, 0, 0.3, 0);
    }
    return g;
  }
  function bodyMesh(b, m, bw, bh, bl, kind) {
    const g = new THREE.Group(); const isB = kind === 'biped';
    const shell = geo(kind === 'bird' ? 'sphere' : 'box', m, bw * 1.08, bh * (b === 'tshirt' || b === 'hawaii' || b === 'vest' ? 0.75 : 1.06), bl * (isB ? 1.08 : b === 'vest' ? 0.6 : 0.8), 0, b === 'tshirt' ? bh * 0.12 : 0, isB ? 0 : bl * 0.08);
    g.add(shell);
    if (b === 'tux') g.add(geo('box', new THREE.MeshLambertMaterial({ color: '#ffffff' }), bw * 0.4, bh * 0.6, 0.05, 0, 0, isB ? bl * 0.55 : bl * 0.5));
    if (b === 'super' || b === 'hero') g.add(geo('sphere', new THREE.MeshLambertMaterial({ color: '#ffd21a' }), bw * 0.4, bh * 0.4, 0.05, 0, 0, bl * 0.48));
    if (b === 'armor' || b === 'spacesuit') { g.children[0].material = new THREE.MeshPhongMaterial({ color: m.color, shininess: 100 }); }
    if (b === 'hawaii') for (let i = 0; i < 6; i++) g.add(geo('sphere', new THREE.MeshLambertMaterial({ color: '#ffe8a0' }), 0.18, 0.18, 0.05, (i % 3 - 1) * bw * 0.3, (Math.floor(i / 3) - 0.5) * bh * 0.3, bl * (isB ? 0.55 : 0.45)));
    if (b === 'overalls') g.add(geo('box', new THREE.MeshLambertMaterial({ color: '#ffd21a' }), 0.12, 0.12, 0.05, 0, bh * 0.2, bl * 0.48));
    return g;
  }
  function feetMesh(b, m, s) {
    const g = new THREE.Group(); const w = 0.32 * s;
    if (b === 'flippers') g.add(geo('box', m, w * 1.3, 0.06, w * 3, 0, 0, w));
    else if (b === 'skates') { g.add(geo('box', m, w * 1.1, w * 0.8, w * 1.6, 0, w * 0.3, 0)); for (const z of [-1, 1]) g.add(geo('cyl', new THREE.MeshLambertMaterial({ color: '#ffd21a' }), w * 0.4, w * 0.3, w * 0.4, 0, -0.05, z * w * 0.5)); }
    else if (b === 'boots') g.add(geo('box', m, w * 1.2, w * 2, w * 1.4, 0, w * 0.8, w * 0.1));
    else if (b === 'socks') g.add(geo('box', m, w * 1.05, w * 2.4, w * 1.05, 0, w * 1.1, 0));
    else g.add(geo('box', m, w * 1.2, w * 0.7, w * 1.6, 0, w * 0.2, w * 0.15));
    return g;
  }
  function tailMesh(b, m, s) {
    const g = new THREE.Group();
    if (b === 'bow') { g.add(geo('cone', m, 0.2 * s, 0.25 * s, 0.1 * s, -0.12 * s, 0, 0)); g.add(geo('cone', m, 0.2 * s, 0.25 * s, 0.1 * s, 0.12 * s, 0, 0)); g.children[0].rotation.z = Math.PI / 2; g.children[1].rotation.z = -Math.PI / 2; }
    else if (b === 'flame' || b === 'bolt') { const f = geo('cone', new THREE.MeshLambertMaterial({ color: m.color, emissive: m.color, emissiveIntensity: 0.9 }), 0.35 * s, 0.6 * s, 0.35 * s, 0, 0.2 * s, -0.1 * s); g.add(f); f.userData.flicker = 1; }
    else if (b === 'tbell') g.add(geo('cone', m, 0.25 * s, 0.3 * s, 0.25 * s, 0, -0.1 * s, 0));
    else g.add(geo('sphere', m, 0.35 * s, 0.35 * s, 0.35 * s));
    return g;
  }

  // ------------------------- HUMANS -------------------------
  const SKIN = ['#f2d0b0', '#e0b090', '#c08a60', '#8a5a3a', '#5a3a24', '#f8e0d0'];
  const SHIRT = ['#e84a3a', '#3a8ae8', '#f2c83a', '#3ab86a', '#8a4ac8', '#f2f2f2', '#2a2a30', '#ff8a3a', '#e84ab0', '#5ac8c8'];
  H.buildHuman = function (type, r) {
    r = r || Math.random; const pick = a => a[Math.floor(r() * a.length)];
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const skin = H.mat(pick(SKIN)), shirtC = type === 'worker' ? '#ff8a1a' : type === 'farmer' ? '#5a7ac8' : type === 'officer' ? '#2a3a6a' : type === 'shopkeeper' ? '#ffffff' : type === 'beach' ? pick(['#ff5a8a', '#5ad8ff', '#ffd21a']) : pick(SHIRT);
    const shirt = H.mat(shirtC), pants = H.mat(type === 'beach' ? pick(SKIN) : type === 'officer' ? '#1a2244' : pick(['#3a4a6a', '#2a2a30', '#6a5a4a', '#8a8a92', '#4a6a8a']));
    const tall = 0.9 + r() * 0.25, wide = 0.9 + r() * 0.3;
    const legs = [], arms = [];
    for (const sd of [-1, 1]) { const p = new THREE.Group(); p.position.set(sd * 0.17 * wide, 0.9 * tall, 0); const m = new THREE.Mesh(H.G.box, pants); m.scale.set(0.24, 0.9 * tall, 0.26); m.position.y = -0.45 * tall; p.add(m); const sh = new THREE.Mesh(H.G.box, H.mat('#2a2a2a')); sh.scale.set(0.26, 0.12, 0.36); sh.position.set(0, -0.9 * tall + 0.06, 0.05); p.add(sh); rig.add(p); legs.push(p); }
    const torso = new THREE.Mesh(H.G.box, shirt); torso.scale.set(0.62 * wide, 0.7 * tall, 0.34 * wide); torso.position.y = 1.25 * tall; rig.add(torso);
    for (const sd of [-1, 1]) { const p = new THREE.Group(); p.position.set(sd * (0.36 * wide + 0.08), 1.55 * tall, 0); const m = new THREE.Mesh(H.G.box, shirt); m.scale.set(0.16, 0.7 * tall, 0.18); m.position.y = -0.33 * tall; p.add(m); const hd = new THREE.Mesh(H.G.box, skin); hd.scale.set(0.14, 0.14, 0.14); hd.position.y = -0.72 * tall; p.add(hd); rig.add(p); arms.push(p); }
    const head = new THREE.Group(); head.position.y = 1.82 * tall; rig.add(head);
    const hm = new THREE.Mesh(H.G.box, skin); hm.scale.set(0.4, 0.42, 0.4); head.add(hm);
    for (const sd of [-1, 1]) { const e = new THREE.Mesh(H.G.box, H.mat('#111111')); e.scale.set(0.06, 0.07, 0.02); e.position.set(sd * 0.09, 0.03, 0.2); head.add(e); }
    const mouth = new THREE.Mesh(H.G.box, H.mat('#7a2a2a')); mouth.scale.set(0.12, 0.03, 0.02); mouth.position.set(0, -0.1, 0.2); head.add(mouth);
    const hair = pick(['#2a1a10', '#5a3a1a', '#d8b05a', '#1a1a1a', '#8a3a1a', '#c8c8c8']);
    if (type === 'farmer' || type === 'beach') { const h = new THREE.Mesh(H.G.cyl, H.mat('#e8c86a')); h.scale.set(0.8, 0.06, 0.8); h.position.y = 0.24; head.add(h); const t = new THREE.Mesh(H.G.cyl, H.mat('#e8c86a')); t.scale.set(0.38, 0.18, 0.38); t.position.y = 0.32; head.add(t); }
    else if (type === 'worker') { const h = new THREE.Mesh(H.G.sphere, H.mat('#ffd21a')); h.scale.set(0.46, 0.3, 0.46); h.position.y = 0.2; head.add(h); }
    else if (type === 'officer') { const h = new THREE.Mesh(H.G.box, H.mat('#1a2244')); h.scale.set(0.44, 0.14, 0.5); h.position.set(0, 0.26, 0.03); head.add(h); }
    else if (type === 'shopkeeper') { const h = new THREE.Mesh(H.G.box, H.mat(hair)); h.scale.set(0.42, 0.12, 0.42); h.position.y = 0.22; head.add(h); const ap = new THREE.Mesh(H.G.box, H.mat('#3a8a5a')); ap.scale.set(0.5, 0.6, 0.05); ap.position.set(0, 1.1 * tall, 0.18 * wide); rig.add(ap); }
    else if (r() < 0.8) { const h = new THREE.Mesh(H.G.box, H.mat(hair)); h.scale.set(0.42, 0.14 + r() * 0.1, 0.42); h.position.set(0, 0.22, -0.02); head.add(h); if (r() < 0.3) { const p = new THREE.Mesh(H.G.box, H.mat(hair)); p.scale.set(0.4, 0.4, 0.1); p.position.set(0, -0.05, -0.22); head.add(p); } }
    if (type === 'tourist' && r() < 0.6) { const c = new THREE.Mesh(H.G.box, H.mat('#2a2a2a')); c.scale.set(0.2, 0.14, 0.1); c.position.set(0, 1.35 * tall, 0.22); rig.add(c); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { root: g, rig, legs, arms, head, mouth, height: 2 * tall, radius: 0.4 };
  };

  // ------------------------- VEHICLES -------------------------
  H.buildVehicle = function (def, paint) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const col = paint || def.col; const pm = new THREE.MeshPhongMaterial({ color: col, shininess: 70, specular: 0x666666 });
    const dark = H.mat('#1e2024'), glass = new THREE.MeshPhongMaterial({ color: '#9ad0f0', shininess: 120, transparent: true, opacity: 0.7 }), chrome = new THREE.MeshPhongMaterial({ color: '#d8dce0', shininess: 120 });
    const [W, Hh, L] = def.size; const wheels = []; let rotor = null, prop = null;
    const add = (m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(H.G.box, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; body.add(o); return o; };
    const wheel = (x, y, z, r, w) => { const piv = new THREE.Group(); piv.position.set(x, y, z); const wm = new THREE.Mesh(H.G.cyl, dark); wm.scale.set(r * 2, w, r * 2); wm.rotation.z = Math.PI / 2; const sp = new THREE.Group(); sp.add(wm); const hub = new THREE.Mesh(H.G.cyl, chrome); hub.scale.set(r, w + 0.02, r); hub.rotation.z = Math.PI / 2; sp.add(hub); piv.add(sp); body.add(piv); wheels.push({ piv, spin: sp, front: z > 0 }); };
    switch (def.type) {
      case 'car': case 'truck': case 'bus': case 'kart': case 'tractor': case 'digger': {
        const wr = def.bigwheels ? 1.1 : def.type === 'tractor' ? 0.8 : def.type === 'kart' ? 0.3 : def.type === 'bus' || def.type === 'truck' ? 0.6 : 0.45;
        const base = wr * 0.9;
        if (def.type === 'kart') { add(pm, W, 0.3, L, 0, base, 0); add(dark, 0.5, 0.5, 0.5, 0, base + 0.4, -0.3); add(pm, W * 0.9, 0.2, 0.3, 0, base + 0.2, L / 2); }
        else if (def.type === 'tractor') { add(pm, W * 0.7, 1.2, L * 0.6, 0, base + 0.4, 0.4); add(pm, W, 0.3, L, 0, base, 0); add(glass, W * 0.8, 1.2, 1.2, 0, base + 1.4, -0.6); add(pm, W * 0.85, 0.15, 1.4, 0, base + 2.1, -0.6); add(chrome, 0.15, 1.2, 0.15, 0.4, base + 1.4, 0.8); }
        else if (def.type === 'digger') { add(pm, W, 1.4, L * 0.7, 0, base + 0.5, -0.3); add(glass, W * 0.6, 1.4, 1.4, -0.4, base + 2, 0); const arm = new THREE.Group(); arm.position.set(0.6, base + 1.6, 1); const a1 = new THREE.Mesh(H.G.box, pm); a1.scale.set(0.4, 0.4, 3.6); a1.position.z = 1.6; a1.rotation.x = -0.4; arm.add(a1); const bk = new THREE.Mesh(H.G.box, dark); bk.scale.set(1.4, 0.8, 0.8); bk.position.set(0, 1.2, 3.4); arm.add(bk); body.add(arm); g.userData.arm = arm; }
        else {
          const ch = def.type === 'bus' ? Hh - 0.4 : def.type === 'truck' ? Hh * 0.55 : Hh * 0.45;
          add(pm, W, ch, L, 0, base + ch / 2, 0);
          if (def.type === 'bus') { for (let i = 0; i < 6; i++) add(glass, W + 0.02, 0.8, 1.1, 0, base + ch * 0.7, -L / 2 + 1 + i * 1.5); add(glass, W * 0.9, 1, 0.05, 0, base + ch * 0.65, L / 2 + 0.01); }
          else if (def.type === 'truck') { add(pm, W, Hh * 0.45, L * 0.28, 0, base + ch + Hh * 0.22, L * 0.34); add(glass, W * 0.9, Hh * 0.25, 0.05, 0, base + ch + Hh * 0.28, L * 0.48 + 0.01); add(def.id === 'icecream' ? H.mat('#ffffff') : pm, W * 0.98, Hh * 0.42, L * 0.65, 0, base + ch + Hh * 0.21, -L * 0.15); if (def.id === 'firetruck') { add(chrome, 0.3, 0.3, L * 0.7, 0, base + Hh, -L * 0.1); } if (def.id === 'icecream') { const cone = new THREE.Mesh(H.G.cone, H.mat('#e8b06a')); cone.scale.set(0.8, 1.4, 0.8); cone.rotation.x = Math.PI; cone.position.set(0, base + Hh + 0.9, 0); body.add(cone); const sc = new THREE.Mesh(H.G.sphere, H.mat('#ff9ac8')); sc.scale.set(1, 1, 1); sc.position.set(0, base + Hh + 1.7, 0); body.add(sc); } }
          else { const cab = def.id === 'pickup' ? 0.4 : 0.55; add(glass, W * 0.85, Hh * 0.42, L * cab, 0, base + ch + Hh * 0.2, def.id === 'pickup' ? 0.4 : -0.1); add(pm, W * 0.86, 0.08, L * cab * 0.9, 0, base + ch + Hh * 0.42, def.id === 'pickup' ? 0.4 : -0.1); if (def.id === 'police') { add(H.mat('#ffffff'), W + 0.02, ch * 0.5, L * 0.5, 0, base + ch * 0.5, 0); add(H.mat('#ff2a2a', { emissive: '#ff2a2a' }), 0.5, 0.2, 0.3, -0.4, base + ch + Hh * 0.47, -0.1); add(H.mat('#2a6aff', { emissive: '#2a6aff' }), 0.5, 0.2, 0.3, 0.4, base + ch + Hh * 0.47, -0.1); } if (def.id === 'supercar' || def.id === 'hyper') add(pm, W, 0.1, 0.6, 0, base + ch + 0.5, -L / 2 + 0.3); }
          add(H.mat('#fff6c0', { emissive: '#fff6c0', emissiveIntensity: 0.5 }), 0.4, 0.2, 0.05, -W / 2 + 0.35, base + ch * 0.6, L / 2 + 0.01); add(H.mat('#fff6c0', { emissive: '#fff6c0', emissiveIntensity: 0.5 }), 0.4, 0.2, 0.05, W / 2 - 0.35, base + ch * 0.6, L / 2 + 0.01);
          add(H.mat('#ff2a2a', { emissive: '#aa0000' }), 0.4, 0.2, 0.05, -W / 2 + 0.35, base + ch * 0.6, -L / 2 - 0.01); add(H.mat('#ff2a2a', { emissive: '#aa0000' }), 0.4, 0.2, 0.05, W / 2 - 0.35, base + ch * 0.6, -L / 2 - 0.01);
        }
        const wx = W / 2 - (def.type === 'kart' ? 0 : 0.05), wz = L / 2 - wr - 0.2;
        if (def.type === 'tractor') { wheel(-wx, 0.8, -wz, 0.8, 0.6); wheel(wx, 0.8, -wz, 0.8, 0.6); wheel(-wx * 0.8, 0.45, wz, 0.45, 0.35); wheel(wx * 0.8, 0.45, wz, 0.45, 0.35); }
        else { wheel(-wx, wr, wz, wr, 0.35 + wr * 0.2); wheel(wx, wr, wz, wr, 0.35 + wr * 0.2); wheel(-wx, wr, -wz, wr, 0.35 + wr * 0.2); wheel(wx, wr, -wz, wr, 0.35 + wr * 0.2); if (def.type === 'bus' || def.id === 'hauler') { wheel(-wx, wr, -wz + 2 * wr + 0.2, wr, 0.4); wheel(wx, wr, -wz + 2 * wr + 0.2, wr, 0.4); } }
        break;
      }
      case 'moto': case 'bike': { const r = def.type === 'moto' ? 0.42 : 0.36; add(pm, 0.25, 0.4, L * 0.6, 0, r + 0.4, 0); add(dark, 0.3, 0.12, 0.6, 0, r + 0.65, -0.2); add(chrome, 0.7, 0.06, 0.06, 0, r + 0.85, L * 0.32); if (def.type === 'moto') add(pm, 0.4, 0.35, 0.6, 0, r + 0.5, 0.25); wheel(0, r, L / 2 - r, r, 0.12); wheel(0, r, -L / 2 + r, r, 0.12); break; }
      case 'skate': add(pm, W, 0.06, L, 0, 0.15, 0); for (const z of [-0.5, 0.5]) for (const x of [-0.25, 0.25]) { const w = new THREE.Mesh(H.G.cyl, H.mat('#f2f2e0')); w.scale.set(0.14, 0.08, 0.14); w.rotation.z = Math.PI / 2; w.position.set(x, 0.07, z); body.add(w); } break;
      case 'boat': case 'jetski': case 'hover': {
        const hull = new THREE.Mesh(H.G.cone, pm); hull.scale.set(W, L * 0.35, Hh * 0.8); hull.rotation.x = Math.PI / 2; hull.position.set(0, Hh * 0.3, L * 0.32); body.add(hull);
        add(pm, W, Hh * 0.6, L * 0.6, 0, Hh * 0.3, -L * 0.15);
        if (def.type === 'boat') { add(glass, W * 0.8, 0.8, 0.1, 0, Hh * 0.9, 0.4); add(H.mat('#c8b08a'), W * 0.8, 0.1, L * 0.4, 0, Hh * 0.62, -L * 0.15); }
        if (def.type === 'jetski') add(dark, 0.4, 0.2, 0.9, 0, Hh * 0.7, -0.3);
        if (def.type === 'hover') { add(dark, W + 0.4, 0.5, L + 0.2, 0, 0.25, 0); const fan = new THREE.Mesh(H.G.cyl, dark); fan.scale.set(2.2, 0.4, 2.2); fan.rotation.x = Math.PI / 2; fan.position.set(0, Hh, -L / 2); body.add(fan); prop = fan; }
        break;
      }
      case 'sub': { const b = new THREE.Mesh(H.G.capsule, pm); b.scale.set(W, L / 2, W); b.rotation.x = Math.PI / 2; b.position.y = W / 2; body.add(b); add(pm, 0.8, 1.2, 1.6, 0, W + 0.4, 0.4); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(H.G.cyl, glass); p.scale.set(0.5, 0.1, 0.5); p.rotation.z = Math.PI / 2; p.position.set(W / 2, W / 2, 1 - i * 1.2); body.add(p); } const pr = new THREE.Mesh(H.G.box, dark); pr.scale.set(1.6, 0.2, 0.1); pr.position.set(0, W / 2, -L / 2 - 0.3); body.add(pr); prop = pr; break; }
      case 'heli': {
        if (def.saucer) { const s = new THREE.Mesh(H.G.sphere, new THREE.MeshPhongMaterial({ color: col, shininess: 120 })); s.scale.set(W, 1.2, L); s.position.y = 1; body.add(s); const d = new THREE.Mesh(H.G.sphere, new THREE.MeshLambertMaterial({ color: '#7affd0', emissive: '#2a8a6a' })); d.scale.set(2.4, 1.6, 2.4); d.position.y = 1.6; body.add(d); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const l = new THREE.Mesh(H.G.sphere, H.mat('#ffe21a', { emissive: '#ffe21a' })); l.scale.setScalar(0.4); l.position.set(Math.cos(a) * W * 0.45, 0.9, Math.sin(a) * L * 0.45); body.add(l); } rotor = s; break; }
        const cab = new THREE.Mesh(H.G.sphere, pm); cab.scale.set(W, Hh, L * 0.45); cab.position.set(0, 1.4, 0.6); body.add(cab);
        const gl = new THREE.Mesh(H.G.sphere, glass); gl.scale.set(W * 0.9, Hh * 0.7, L * 0.25); gl.position.set(0, 1.7, 1.3); body.add(gl);
        add(pm, 0.4, 0.4, L * 0.55, 0, 1.6, -L * 0.35); add(pm, 0.1, 1.2, 0.6, 0, 2.1, -L * 0.62);
        for (const sd of [-1, 1]) add(dark, 0.12, 0.12, L * 0.5, sd * W * 0.45, 0.06, 0.4);
        const r = new THREE.Group(); r.position.set(0, Hh + 0.6, 0.5); const b1 = new THREE.Mesh(H.G.box, dark); b1.scale.set(10, 0.08, 0.4); r.add(b1); const b2 = b1.clone(); b2.rotation.y = Math.PI / 2; r.add(b2); body.add(r); rotor = r; break;
      }
      case 'plane': {
        const jet = def.id === 'jet';
        const f = new THREE.Mesh(H.G.capsule, pm); f.scale.set(jet ? 1.6 : 1.4, L / 2, jet ? 1.6 : 1.4); f.rotation.x = Math.PI / 2; f.position.y = 1.4; body.add(f);
        add(pm, W, 0.15, jet ? 3 : 1.8, 0, 1.4, jet ? -0.5 : 0.3); add(pm, W * 0.35, 0.1, 1, 0, 1.8, -L / 2 + 0.6); add(pm, 0.1, 1.6, 1.2, 0, 2.4, -L / 2 + 0.6);
        add(glass, 0.9, 0.6, 1.2, 0, 2.1, L / 2 - (jet ? 2.5 : 2));
        if (!jet) { const p = new THREE.Group(); p.position.set(0, 1.4, L / 2 + 0.1); const pb = new THREE.Mesh(H.G.box, dark); pb.scale.set(0.2, 3, 0.1); p.add(pb); body.add(p); prop = p; }
        else for (const sd of [-1, 1]) { const e = new THREE.Mesh(H.G.cyl, dark); e.scale.set(0.8, 2, 0.8); e.rotation.x = Math.PI / 2; e.position.set(sd * 2.4, 1.0, -0.5); body.add(e); }
        wheel(-1.4, 0.4, 0.5, 0.4, 0.2); wheel(1.4, 0.4, 0.5, 0.4, 0.2); wheel(0, 0.35, L / 2 - 1.5, 0.35, 0.2); break;
      }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { root: g, body, wheels, rotor, prop, paintMat: pm };
  };

  // ------------------------- COLLECTIBLES -------------------------
  H.buildCollectible = function (type) {
    const g = new THREE.Group();
    if (type === 'duck') { g.add(H.mesh('sphere', '#ffd21a', 0.9, 0.7, 1.1, 0, 0.35, 0)); g.add(H.mesh('sphere', '#ffd21a', 0.55, 0.55, 0.55, 0, 0.85, 0.3)); g.add(H.mesh('box', '#ff8a1a', 0.25, 0.1, 0.3, 0, 0.82, 0.62)); g.add(H.mesh('sphere', '#111111', 0.1, 0.1, 0.1, 0.18, 0.95, 0.5)); g.add(H.mesh('sphere', '#111111', 0.1, 0.1, 0.1, -0.18, 0.95, 0.5)); }
    else if (type === 'gnome') { g.add(H.mesh('box', '#2a5ad8', 0.6, 0.7, 0.5, 0, 0.35, 0)); g.add(H.mesh('sphere', '#f2d0b0', 0.45, 0.45, 0.45, 0, 0.9, 0)); g.add(H.mesh('cone', '#d8261a', 0.5, 0.8, 0.5, 0, 1.45, 0)); g.add(H.mesh('cone', '#ffffff', 0.4, 0.5, 0.2, 0, 0.6, 0.2)); g.children[3].rotation.x = Math.PI; }
    else if (type === 'statue') { const gm = { emissive: '#8a6a10', emissiveIntensity: 0.5 }; g.add(H.mesh('cyl', '#ffcc33', 1.2, 0.4, 1.2, 0, 0.2, 0, gm)); g.add(H.mesh('box', '#ffcc33', 0.7, 0.6, 1.1, 0, 1.0, 0, gm)); for (const [x, z] of [[-0.25, 0.4], [0.25, 0.4], [-0.25, -0.4], [0.25, -0.4]]) g.add(H.mesh('box', '#ffcc33', 0.15, 0.5, 0.15, x, 0.55, z, gm)); g.add(H.mesh('box', '#ffcc33', 0.45, 0.45, 0.55, 0, 1.5, 0.55, gm)); g.add(H.mesh('cone', '#ffcc33', 0.12, 0.45, 0.12, 0.12, 1.85, 0.4, gm)); g.add(H.mesh('cone', '#ffcc33', 0.12, 0.45, 0.12, -0.12, 1.85, 0.4, gm)); }
    else if (type === 'chest') { g.add(H.mesh('box', '#8a5a2a', 1.4, 0.8, 0.9, 0, 0.4, 0)); const lid = H.mesh('cyl', '#a86a32', 0.9, 1.4, 0.9, 0, 0.8, 0); lid.rotation.z = Math.PI / 2; lid.scale.set(0.9, 1.4, 0.9); g.add(lid); g.add(H.mesh('box', '#ffcc33', 1.45, 0.12, 0.95, 0, 0.6, 0)); g.add(H.mesh('box', '#ffcc33', 0.2, 0.3, 0.1, 0, 0.7, 0.47)); }
    else if (type === 'ufopart') { const t = H.mesh('torus', '#c8d0dc', 1.4, 1.4, 1.4, 0, 0.8, 0, { emissive: '#2a8a6a', emissiveIntensity: 0.6 }); g.add(t); g.add(H.mesh('sphere', '#7affd0', 0.5, 0.5, 0.5, 0, 0.8, 0, { emissive: '#7affd0' })); }
    else if (type === 'keycard') { g.add(H.mesh('box', '#2affd0', 0.8, 0.5, 0.05, 0, 0.8, 0, { emissive: '#2affd0', emissiveIntensity: 0.5 })); }
    else if (type === 'dig') { g.add(H.mesh('box', '#5a3a1a', 2, 0.1, 2, 0, 0.05, 0)); g.add(H.mesh('box', '#d8261a', 0.3, 0.1, 1.6, 0, 0.12, 0)); g.children[1].rotation.y = Math.PI / 4; const c2 = H.mesh('box', '#d8261a', 0.3, 0.1, 1.6, 0, 0.12, 0); c2.rotation.y = -Math.PI / 4; g.add(c2); }
    else if (type === 'coin' || type === 'star' || type === 'ingredient' || type === 'item') { g.add(H.mesh(type === 'star' ? 'ico' : 'cyl', type === 'ingredient' ? '#ff7a3a' : '#ffcc33', 0.9, type === 'coin' ? 0.15 : 0.9, 0.9, 0, 1, 0, { emissive: '#8a6a10', emissiveIntensity: 0.5 })); if (type === 'coin') g.children[0].rotation.x = Math.PI / 2; }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  };
})();
