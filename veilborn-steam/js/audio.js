'use strict';
// ============================================================
//  VEILBORN - tiny procedural audio (no files needed)
// ============================================================
const AUDIO = {
  ctx: null, master: null, mode: null, timer: null, muted: false, step: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      const drone = (f, type, vol) => { const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
        o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 400; g.gain.value = vol; o.connect(lp); lp.connect(g); g.connect(this.master); o.start(); };
      drone(55, 'sawtooth', 0.05); drone(55.4, 'sawtooth', 0.05); drone(82.4, 'sine', 0.06);
    } catch (e) { this.ctx = null; }
  },
  tone(f, dur, type, vol, slide) {
    if (!this.ctx || this.muted) return; const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  sfx(n) {
    switch (n) {
      case 'jump': this.tone(260, 0.12, 'sine', 0.1, 520); break;
      case 'cast': this.tone(520, 0.18, 'triangle', 0.1, 260); break;
      case 'hit': this.tone(180, 0.12, 'square', 0.08, 90); break;
      case 'hurt': this.tone(140, 0.3, 'sawtooth', 0.16, 50); break;
      case 'pick': this.tone(660, 0.15, 'sine', 0.14); setTimeout(() => this.tone(990, 0.25, 'sine', 0.14), 90); break;
      case 'power': this.tone(220, 0.5, 'sine', 0.18, 880); break;
      case 'boss': this.tone(60, 1.2, 'sawtooth', 0.25, 40); break;
      case 'die': this.tone(300, 0.7, 'sawtooth', 0.15, 40); break;
      case 'ui': this.tone(500, 0.06, 'square', 0.06); break;
    }
  },
  music(mode) {
    this.mode = mode; if (this.timer) return;
    const notes = [220, 261.6, 293.7, 329.6, 392, 261.6, 196, 246.9]; // A minor-ish, eerie
    this.timer = setInterval(() => {
      if (!this.ctx || this.muted) return; this.step++;
      const boss = this.mode === 'boss';
      if (boss) { this.tone(55, 0.22, 'sawtooth', 0.12); if (this.step % 2 === 0) this.tone(notes[(this.step * 3) % 8] * 2, 0.18, 'square', 0.04); }
      else if (this.step % 3 === 0) this.tone(notes[(this.step * 5) % 8] * 2, 1.4, 'sine', 0.05);
    }, 480);
  }
};
