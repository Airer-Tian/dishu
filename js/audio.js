(function () {
  const AudioManager = {
    ctx: null,
    muted: localStorage.getItem('ddsh_muted') === '1',
    init: function () {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    },
    ensure: function () {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone: function (freq, dur, type, gain, when, slideTo) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + (when || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.2, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    },
    play: function (name) {
      if (this.muted) return;
      this.ensure();
      if (!this.ctx) return;
      switch (name) {
        case 'hit':
          this.tone(660, 0.12, 'sine', 0.25);
          this.tone(990, 0.12, 'triangle', 0.15, 0.04);
          break;
        case 'gold':
          this.tone(523, 0.12, 'triangle', 0.22);
          this.tone(659, 0.12, 'triangle', 0.22, 0.1);
          this.tone(784, 0.28, 'triangle', 0.22, 0.2);
          break;
        case 'miss':
          this.tone(240, 0.18, 'sine', 0.15, 0, 140);
          break;
        case 'click':
          this.tone(500, 0.06, 'square', 0.08);
          break;
        case 'pop':
          this.tone(420, 0.07, 'sine', 0.08);
          break;
        case 'win':
          this.tone(523, 0.16, 'triangle', 0.22);
          this.tone(659, 0.16, 'triangle', 0.22, 0.14);
          this.tone(784, 0.16, 'triangle', 0.22, 0.28);
          this.tone(1046, 0.32, 'triangle', 0.22, 0.42);
          break;
        case 'fail':
          this.tone(392, 0.2, 'sine', 0.18, 0, 300);
          this.tone(300, 0.3, 'sine', 0.18, 0.2, 200);
          break;
      }
    },
    toggleMute: function () {
      this.muted = !this.muted;
      localStorage.setItem('ddsh_muted', this.muted ? '1' : '0');
      return this.muted;
    }
  };
  window.AudioManager = AudioManager;
})();