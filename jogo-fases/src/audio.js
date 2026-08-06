// Áudio 100% sintetizado em WebAudio (nenhum arquivo, nenhum download).
// STYLE TOKEN: "afrofuturist neon wireframe holography, black-violet void, cyan data grid, gold kente shards, magenta glitch accents"
// Traduzido para som: senóides limpas e frias para o sistema, tríades quentes de
// triângulo para o ouro dos rostos, ruído filtrado sujo para a estática magenta.

// Trilha de fundo. É a única coisa aqui que não é sintetizada: música com
// forma (motivo que volta, tensão que sobe) não sai de três osciladores.
// Fica em <audio> e não no grafo do WebAudio de propósito — assim toca sem
// depender de CORS e sem baixar o arquivo inteiro antes de começar.
export const TRILHAS = {
  corredor: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_203156_675ced0c-fc38-4d9f-84cb-4d24f932a630.m4a',
  auditoria: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_204307_c5a30154-6e19-42a4-bd93-5960f743e204.m4a',
};

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.droneNodes = null;
    this.music = null;
    this.musicVol = 0.34;   // atrás dos efeitos, nunca por cima
  }

  // ------------------------------------------------------------ trilha
  // Precisa vir de um gesto do usuário, igual ao init() — navegador nenhum
  // deixa tocar áudio sozinho.
  musicStart(url) {
    if (!url) return;
    if (this.music && this.music.dataset.src === url) { this._musicPlay(); return; }
    this.musicStop();
    const a = new Audio();
    a.src = url;
    a.dataset.src = url;
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    a.crossOrigin = 'anonymous';
    this.music = a;
    this._musicPlay();
  }

  _musicPlay() {
    const a = this.music;
    if (!a) return;
    const alvo = this.enabled ? this.musicVol : 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* autoplay barrado: silêncio, não erro */ });
    // fade-in curto para a faixa não entrar dando um tapa
    const t0 = performance.now();
    const sobe = () => {
      if (this.music !== a) return;
      const k = Math.min(1, (performance.now() - t0) / 1200);
      a.volume = alvo * k;
      if (k < 1) requestAnimationFrame(sobe);
    };
    requestAnimationFrame(sobe);
  }

  musicStop() {
    if (!this.music) return;
    try { this.music.pause(); } catch (e) { /* já parada */ }
    this.music = null;
  }

  // Precisa de um gesto do usuário — chamado no clique de "jogar".
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.5 : 0;
    // o botão SOM da tela inicial também manda na trilha
    if (this.music) this.music.volume = on ? this.musicVol : 0;
  }

  _env(node, t0, a, d, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g);
    g.connect(this.master);
    return g;
  }

  _tone(freq, t0, dur, type = 'sine', peak = 0.25, glideTo = null) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    this._env(o, t0, Math.min(0.02, dur * 0.3), dur, peak);
    o.start(t0);
    o.stop(t0 + dur + 0.08);
  }

  _noise(t0, dur, f0, f1, peak = 0.2) {
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 1;
    for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823 - 1; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    src.connect(bp);
    this._env(bp, t0, 0.01, dur, peak);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------ sfx_lock
  lock() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this._tone(520, t, 0.10, 'sine', 0.16, 880);
  }

  // ------------------------------------------------------------ sfx_feed
  feed(step = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const base = 220 * Math.pow(2, (step % 5) / 12);
    this._tone(base, t, 0.40, 'triangle', 0.22);
    this._tone(base * 1.5, t + 0.02, 0.35, 'triangle', 0.14);
    this._tone(base * 0.5, t, 0.28, 'sine', 0.28);
  }

  // ------------------------------------------------------------ sfx_purify
  purify() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.26, 3200, 500, 0.18);
    this._tone(660, t + 0.20, 0.22, 'sine', 0.18);
  }

  // ------------------------------------------------------------ sfx_corrupt
  corrupt() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this._tone(180, t, 0.45, 'square', 0.16, 90);
    this._tone(186, t, 0.45, 'square', 0.14, 92);
    this._noise(t, 0.30, 900, 180, 0.12);
  }

  // ------------------------------------------------------------ sfx_pulse
  pulse() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this._tone(140, t, 0.70, 'sine', 0.34, 42);
    this._noise(t, 0.55, 2600, 260, 0.16);
    this._tone(880, t, 0.18, 'triangle', 0.12, 1320);
  }

  // ------------------------------------------------------------ sfx_win
  win() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [0, 2, 4, 7, 9, 12].forEach((semi, i) => {
      this._tone(330 * Math.pow(2, semi / 12), t + i * 0.13, 0.55, 'triangle', 0.22);
    });
  }

  // ------------------------------------------------------------ sfx_fail
  fail() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this._tone(220, t, 1.4, 'sawtooth', 0.16, 82);
    this._tone(224, t, 1.4, 'sawtooth', 0.14, 80);
  }

  // ------------------------------------------------------------ amb_drone
  droneStart() {
    if (!this.ctx || this.droneNodes) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 3);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const oscs = [55, 55.4, 82.5].map((f) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(lp);
      o.start(t);
      return o;
    });
    lp.connect(g);
    g.connect(this.master);
    this.droneNodes = { oscs, g };
  }

  droneStop() {
    if (!this.droneNodes) return;
    const t = this.ctx.currentTime;
    this.droneNodes.g.gain.cancelScheduledValues(t);
    this.droneNodes.g.gain.setValueAtTime(this.droneNodes.g.gain.value || 0.0001, t);
    this.droneNodes.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    this.droneNodes.oscs.forEach((o) => o.stop(t + 1));
    this.droneNodes = null;
  }
}
