// Hoofquake — fully synthesized sound effects (WebAudio, no audio files).
'use strict';
H.Audio = {
  ctx: null, master: null, vol: 0.6, engines: new Map(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  // envelope helper
  env(node, t, a, peak, dec) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); node.connect(g); return g; },
  osc(type, f0, f1, dur, peak, delay, out, vib) {
    if (!this.ctx) return; const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) { const l = this.ctx.createOscillator(); const lg = this.ctx.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const g = this.env(o, t, Math.min(0.03, dur * 0.2), peak || 0.3, dur); g.connect(out || this.master); o.start(t); o.stop(t + dur + 0.1);
  },
  noise(dur, peak, f, q, delay, type, f1) {
    if (!this.ctx) return; const t = this.ctx.currentTime + (delay || 0);
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = this.ctx.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f || 1000, t); fl.Q.value = q || 1;
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(fl); const g = this.env(fl, t, 0.01, peak || 0.3, dur); g.connect(this.master); s.start(t); s.stop(t + dur + 0.1);
  },
  voice(v, pitchMul) {
    if (!this.ctx) return; const [t, f0] = v; const f = f0 * (pitchMul || 1) * (0.92 + Math.random() * 0.16);
    switch (t) {
      case 'bleat': this.osc('sawtooth', f, f * 0.8, 0.55, 0.22, 0, null, [28, f * 0.08]); this.osc('square', f * 2, f * 1.7, 0.5, 0.05, 0, null, [28, f * 0.1]); break;
      case 'baa': this.osc('sawtooth', f, f * 0.85, 0.7, 0.2, 0, null, [12, f * 0.05]); break;
      case 'moo': this.osc('sawtooth', f * 0.8, f * 1.1, 0.35, 0.22); this.osc('sawtooth', f * 1.1, f * 0.85, 0.8, 0.22, 0.3); break;
      case 'oink': this.osc('square', f, f * 0.6, 0.12, 0.15); this.osc('square', f * 1.1, f * 0.6, 0.12, 0.15, 0.16); this.noise(0.2, 0.08, 600, 3); break;
      case 'neigh': this.osc('sawtooth', f * 1.6, f * 0.8, 0.9, 0.18, 0, null, [22, f * 0.2]); break;
      case 'bark': this.noise(0.12, 0.25, f * 2, 2); this.osc('square', f * 1.5, f, 0.12, 0.2); this.osc('square', f * 1.5, f, 0.12, 0.18, 0.2); break;
      case 'meow': this.osc('triangle', f * 0.8, f * 1.3, 0.25, 0.2); this.osc('triangle', f * 1.3, f * 0.7, 0.35, 0.2, 0.22); break;
      case 'squeak': this.osc('sine', f, f * 1.6, 0.12, 0.2); this.osc('sine', f * 1.2, f * 1.8, 0.1, 0.15, 0.14); break;
      case 'cluck': for (let i = 0; i < 3; i++) this.osc('square', f, f * 0.7, 0.07, 0.12, i * 0.11); this.osc('square', f * 1.4, f * 0.8, 0.3, 0.14, 0.35); break;
      case 'roar': case 'growl': this.noise(1.0, 0.35, f * 4, 1, 0, 'lowpass', f * 2); this.osc('sawtooth', f, f * 0.6, 1.0, 0.25, 0, null, [9, f * 0.15]); break;
      case 'dinoroar': this.noise(1.6, 0.45, 900, 1, 0, 'lowpass', 200); this.osc('sawtooth', f * 1.8, f * 0.6, 1.5, 0.3, 0, null, [7, f * 0.3]); this.osc('square', f, f * 0.5, 1.5, 0.12); break;
      case 'howl': this.osc('sine', f * 0.8, f * 1.4, 0.6, 0.22, 0, null, [5, 8]); this.osc('sine', f * 1.4, f * 0.9, 1.2, 0.2, 0.55, null, [5, 8]); break;
      case 'grunt': this.osc('sawtooth', f, f * 0.7, 0.25, 0.25); this.noise(0.2, 0.15, 400); break;
      case 'hiss': this.noise(0.8, 0.25, 4000, 1, 0, 'highpass'); break;
      case 'trumpet': this.osc('sawtooth', f, f * 2.2, 0.25, 0.25); this.osc('sawtooth', f * 2.2, f * 1.8, 0.9, 0.25, 0.22, null, [14, 20]); break;
      case 'snort': this.noise(0.25, 0.3, 500, 2); this.noise(0.3, 0.25, 400, 2, 0.3); break;
      case 'chuff': this.noise(0.15, 0.2, 900, 3); this.osc('square', f, f * 0.7, 0.12, 0.1); break;
      case 'screech': this.osc('sawtooth', f * 1.4, f * 0.9, 0.6, 0.15, 0, null, [30, f * 0.05]); this.noise(0.5, 0.1, f * 2, 4, 0, 'bandpass'); break;
      case 'hoot': this.osc('sine', f, f * 0.95, 0.25, 0.25); this.osc('sine', f, f * 0.9, 0.45, 0.25, 0.35); break;
      case 'squawk': this.osc('square', f, f * 1.4, 0.15, 0.15); this.osc('square', f * 1.4, f * 0.9, 0.25, 0.15, 0.15); break;
      case 'honk': this.osc('square', f, f * 0.9, 0.3, 0.15); this.osc('square', f * 1.01, f * 0.9, 0.3, 0.12); break;
      case 'hum': this.osc('sine', f, f, 0.8, 0.2, 0, null, [4, 6]); break;
      case 'grumble': this.osc('sawtooth', f, f * 0.8, 0.9, 0.18, 0, null, [18, 25]); this.noise(0.7, 0.1, 500); break;
      case 'yip': this.osc('triangle', f, f * 1.5, 0.1, 0.2); this.osc('triangle', f * 1.1, f * 1.6, 0.1, 0.2, 0.15); break;
      case 'chomp': this.noise(0.08, 0.35, 2000, 2); this.noise(0.08, 0.35, 1500, 2, 0.15); break;
      case 'robot': for (let i = 0; i < 4; i++) this.osc('square', f * (1 + (i % 2) * 0.5), null, 0.08, 0.12, i * 0.09); break;
      case 'blorp': this.osc('sine', f, f * 3, 0.2, 0.3); this.osc('sine', f * 2, f * 0.5, 0.25, 0.25, 0.2); break;
      default: this.osc('triangle', f, f * 0.8, 0.3, 0.2);
    }
  },
  sfx(name, vol) {
    if (!this.ctx) return; const v = vol === undefined ? 1 : vol;
    switch (name) {
      case 'thud': this.osc('sine', 140, 50, 0.18, 0.4 * v); this.noise(0.08, 0.2 * v, 600); break;
      case 'bonk': this.osc('triangle', 380, 120, 0.15, 0.3 * v); this.noise(0.05, 0.2 * v, 2500); break;
      case 'smash': this.noise(0.35, 0.35 * v, 3000, 1, 0, 'lowpass', 400); this.osc('square', 200, 60, 0.15, 0.15 * v); break;
      case 'glass': for (let i = 0; i < 5; i++) this.osc('sine', 2000 + Math.random() * 3000, null, 0.15, 0.06 * v, i * 0.03); this.noise(0.3, 0.2 * v, 5000, 1, 0, 'highpass'); break;
      case 'boom': this.noise(1.4, 0.7 * v, 1200, 1, 0, 'lowpass', 60); this.osc('sine', 90, 30, 1.0, 0.6 * v); break;
      case 'coin': this.osc('square', 988, null, 0.08, 0.12 * v); this.osc('square', 1319, null, 0.25, 0.12 * v, 0.07); break;
      case 'cash': this.osc('square', 1568, null, 0.08, 0.1); this.osc('square', 2093, null, 0.2, 0.1, 0.08); this.noise(0.15, 0.1, 6000, 1, 0.05, 'highpass'); break;
      case 'buy': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, null, 0.18, 0.18, i * 0.07)); break;
      case 'fail': [392, 330, 262].forEach((f, i) => this.osc('sawtooth', f, f * 0.97, 0.25, 0.12, i * 0.18)); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.osc('square', f, null, 0.16, 0.1, i * 0.09)); break;
      case 'unlock': [440, 554, 659, 880, 1109, 1319].forEach((f, i) => this.osc('triangle', f, null, 0.3, 0.16, i * 0.06)); this.noise(0.6, 0.06, 8000, 1, 0.1, 'highpass'); break;
      case 'checkpoint': this.osc('sine', 880, null, 0.1, 0.2); this.osc('sine', 1320, null, 0.2, 0.2, 0.08); break;
      case 'jump': this.osc('square', 220, 440, 0.1, 0.06 * v); break;
      case 'land': this.noise(0.1, 0.12 * v, 500); break;
      case 'splash': this.noise(0.6, 0.35 * v, 2500, 1, 0, 'lowpass', 400); break;
      case 'swoosh': this.noise(0.25, 0.2 * v, 800, 2, 0, 'bandpass', 3000); break;
      case 'lick': this.noise(0.15, 0.2, 3000, 3, 0, 'bandpass', 1200); this.osc('sine', 600, 300, 0.1, 0.1); break;
      case 'throw': this.noise(0.2, 0.25, 600, 2, 0, 'bandpass', 2500); break;
      case 'scream': { const f = 500 + Math.random() * 500; this.osc('sawtooth', f, f * 1.4, 0.5, 0.12 * v, 0, null, [11, 40]); this.osc('square', f * 1.5, f * 1.9, 0.5, 0.04 * v, 0, null, [11, 50]); break; }
      case 'ouch': { const f = 220 + Math.random() * 200; this.osc('sawtooth', f * 1.4, f, 0.25, 0.12 * v); break; }
      case 'horn': this.osc('square', 392, null, 0.4, 0.12 * v); this.osc('square', 494, null, 0.4, 0.1 * v); break;
      case 'laser': this.osc('sawtooth', 1800, 200, 0.3, 0.15); break;
      case 'fire': this.noise(0.5, 0.3, 1200, 1, 0, 'lowpass', 300); break;
      case 'spit': this.noise(0.15, 0.25, 2000, 2); break;
      case 'zap': this.osc('square', 80, 1200, 0.25, 0.15); this.noise(0.25, 0.15, 5000, 1, 0, 'highpass'); break;
      case 'teleport': this.osc('sine', 200, 2000, 0.3, 0.2); this.osc('sine', 2000, 200, 0.3, 0.15, 0.25); break;
      case 'thunder': this.noise(2.5, 0.5 * v, 400, 1, 0, 'lowpass', 60); break;
      case 'click': this.osc('square', 1200, null, 0.03, 0.08); break;
      case 'dig': this.noise(0.2, 0.25, 700, 1); this.noise(0.2, 0.25, 600, 1, 0.25); break;
      case 'reel': for (let i = 0; i < 6; i++) this.osc('square', 1400, null, 0.02, 0.05, i * 0.04); break;
      case 'bounce': this.osc('sine', 200, 600, 0.2, 0.2 * v); break;
      case 'ding': this.osc('sine', 1760, null, 0.6, 0.15); break;
      case 'ufo': this.osc('sine', 300, 1200, 1.2, 0.15, 0, null, [8, 200]); break;
    }
  },
  // Continuous engine tone for the driven vehicle
  engine(on, rpm, kind) {
    if (!this.ctx) return;
    if (!this.eng && on) {
      const o = this.ctx.createOscillator(); o.type = kind === 'heli' ? 'square' : 'sawtooth';
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(this.master); o.start();
      this.eng = { o, f, g };
    }
    if (!this.eng) return; rpm = rpm || 0; const t = this.ctx.currentTime;
    this.eng.g.gain.setTargetAtTime(on ? 0.07 : 0, t, 0.1);
    this.eng.o.frequency.setTargetAtTime(kind === 'bike' || kind === 'skate' ? 30 : 45 + rpm * 120, t, 0.08);
    this.eng.f.frequency.setTargetAtTime(300 + rpm * 900, t, 0.1);
  },
};
