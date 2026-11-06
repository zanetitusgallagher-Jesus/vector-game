// Hoofquake — shared helpers. Everything hangs off the global H namespace.
'use strict';
window.H = window.H || {};

H.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
H.lerp = (a, b, t) => a + (b - a) * t;
H.smooth = (e0, e1, x) => { const t = H.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
H.angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
H.dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
H.fmt = n => Math.floor(n).toLocaleString('en-US');

// Seeded RNG (mulberry32) so the world is identical every visit.
H.rng = function (seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  return f;
};

// 2D value noise + fbm
(function () {
  const P = new Uint8Array(512); const r = H.rng(1337);
  for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const V = new Float32Array(256); for (let i = 0; i < 256; i++) V[i] = r() * 2 - 1;
  H.noise = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const X = xi & 255, Y = yi & 255;
    const a = V[P[X + P[Y]]], b = V[P[X + 1 + P[Y]]], c = V[P[X + P[Y + 1]]], d = V[P[X + 1 + P[Y + 1]]];
    return H.lerp(H.lerp(a, b, u), H.lerp(c, d, u), v);
  };
  H.fbm = function (x, y, oct) { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < (oct || 4); i++) { s += H.noise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.03; } return s / n; };
})();

// Geometry merger: bakes thousands of static shapes into one draw call.
H.Merge = class {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  addGeo(geo, matrix, color) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const col = new THREE.Color(color);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(matrix); this.p.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); this.n.push(v.x, v.y, v.z);
      this.c.push(col.r, col.g, col.b);
      if (uv) this.u.push(uv.getX(i), uv.getY(i)); else this.u.push(0, 0);
    }
    if (g !== geo) g.dispose();
  }
  box(x, y, z, w, h, d, color, ry) { // y = bottom
    const m = new THREE.Matrix4().makeRotationY(ry || 0); m.setPosition(x, y + h / 2, z);
    m.scale(new THREE.Vector3(w, h, d)); this.addGeo(H.G.box, m, color);
  }
  shape(geoKey, x, y, z, sx, sy, sz, color, rx, ry, rz) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx, sy, sz));
    this.addGeo(H.G[geoKey], m, color);
  }
  // Walls with world-scaled UVs so window textures tile at a fixed size.
  wallBox(x, y, z, w, h, d, color, tile) {
    const t = tile || 4, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h;
    const col = new THREE.Color(color);
    const quad = (a, b, c, e, nx, nz, uw) => {
      const pts = [a, b, c, a, c, e], uvs = [[0, 0], [uw / t, 0], [uw / t, h / t], [0, 0], [uw / t, h / t], [0, h / t]];
      for (let i = 0; i < 6; i++) { this.p.push(...pts[i]); this.n.push(nx, 0, nz); this.c.push(col.r, col.g, col.b); this.u.push(...uvs[i]); }
    };
    quad([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], 0, 1, w);
    quad([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], 0, -1, w);
    quad([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, d);
    quad([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, d);
  }
  build(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; return mesh;
  }
};

// Spatial hash for static colliders and interactables.
H.Grid = class {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  key(cx, cz) { return cx * 100003 + cz; }
  insert(o, minx, minz, maxx, maxz) {
    const c = this.cell;
    for (let cx = Math.floor(minx / c); cx <= Math.floor(maxx / c); cx++)
      for (let cz = Math.floor(minz / c); cz <= Math.floor(maxz / c); cz++) {
        const k = this.key(cx, cz); let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(o);
      }
  }
  query(x, z, r, out) {
    out.length = 0; const c = this.cell; const seen = H.Grid._seen; H.Grid._stamp++;
    for (let cx = Math.floor((x - r) / c); cx <= Math.floor((x + r) / c); cx++)
      for (let cz = Math.floor((z - r) / c); cz <= Math.floor((z + r) / c); cz++) {
        const a = this.map.get(this.key(cx, cz)); if (!a) continue;
        for (const o of a) if (o._stamp !== H.Grid._stamp) { o._stamp = H.Grid._stamp; out.push(o); }
      }
    return out;
  }
};
H.Grid._stamp = 0; H.Grid._seen = null;

// Shared unit geometries
H.initGeos = function () {
  H.G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 12, 8),
    lowSphere: new THREE.IcosahedronGeometry(0.5, 1),
    ico: new THREE.IcosahedronGeometry(0.5, 0),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    cone: new THREE.ConeGeometry(0.5, 1, 10),
    cone6: new THREE.ConeGeometry(0.5, 1, 6),
    torus: new THREE.TorusGeometry(0.5, 0.12, 8, 20),
    capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
    plane: new THREE.PlaneGeometry(1, 1),
  };
};

// Material cache keyed by color + options, so thousands of meshes share a handful of materials.
H._mats = new Map();
H.mat = function (color, opt) {
  const key = color + (opt ? JSON.stringify(opt) : '');
  let m = H._mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial(Object.assign({ color }, opt || {})); H._mats.set(key, m); }
  return m;
};
H.mesh = function (geoKey, color, sx, sy, sz, x, y, z, opt) {
  const m = new THREE.Mesh(H.G[geoKey], H.mat(color, opt));
  m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
  m.position.set(x || 0, y || 0, z || 0); return m;
};

// Canvas texture helper
H.canvasTex = function (w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
