// Assets procedurais desenhados em canvas.
// STYLE TOKEN (derivado da STYLE FORMULA aprovada, congelado byte a byte):
// "afrofuturist neon wireframe holography, black-violet void, cyan data grid, gold kente shards, magenta glitch accents"
//
// Regra de tiling (textures.md): as texturas que repetem são costuradas por
// construção — todo traço desenhado perto de uma borda é redesenhado deslocado
// de +-SIZE no eixo correspondente, então a razão de emenda é 1.0 por definição.

import * as THREE from '../vendor/three.module.js';

const PAL = {
  void: '#07030f',
  cyan: '#00E5FF',
  cyanDim: '#0a5c6b',
  gold: '#FFC93C',
  goldDim: '#6b5416',
  magenta: '#FF2D9B',
  bone: '#F3EFE6',
};

function canvas(size, h) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = h || size;
  return c;
}

function tex(c, { repeat = 1, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Desenha uma linha e suas cópias envolventes, garantindo a costura.
function wrapLine(g, x1, y1, x2, y2, S) {
  for (const dx of [-S, 0, S]) {
    for (const dy of [-S, 0, S]) {
      g.beginPath();
      g.moveTo(x1 + dx, y1 + dy);
      g.lineTo(x2 + dx, y2 + dy);
      g.stroke();
    }
  }
}

// ---------------------------------------------------------------- tex_floorgrid
export function floorGridTexture() {
  const S = 512;
  const c = canvas(S);
  const g = c.getContext('2d');

  g.fillStyle = PAL.void;
  g.fillRect(0, 0, S, S);

  // malha de dados fina
  g.strokeStyle = 'rgba(0,229,255,0.16)';
  g.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const p = (i * S) / 8;
    wrapLine(g, p, -S, p, S * 2, S);
    wrapLine(g, -S, p, S * 2, p, S);
  }

  // malha mestra
  g.strokeStyle = 'rgba(0,229,255,0.42)';
  g.lineWidth = 2.5;
  wrapLine(g, 0, -S, 0, S * 2, S);
  wrapLine(g, -S, 0, S * 2, 0, S);

  // trama kente em ouro: barras curtas alternadas nos cruzamentos
  g.strokeStyle = 'rgba(255,201,60,0.30)';
  g.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = (i * S) / 4 + S / 8;
      const y = (j * S) / 4 + S / 8;
      if ((i + j) % 2 === 0) wrapLine(g, x - 18, y, x + 18, y, S);
      else wrapLine(g, x, y - 18, x, y + 18, S);
    }
  }

  // poeira de dados
  g.fillStyle = 'rgba(0,229,255,0.20)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.51) % S;
    const y = (i * 74.31) % S;
    g.fillRect(x, y, 1.5, 1.5);
  }

  return tex(c, { repeat: 14 });
}

// ---------------------------------------------------------------- tex_kente
export function kenteBandTexture() {
  const S = 256;
  const c = canvas(S);
  const g = c.getContext('2d');

  g.fillStyle = '#0d0618';
  g.fillRect(0, 0, S, S);

  // faixas horizontais douradas
  const bands = [
    [0.06, 10, 'rgba(255,201,60,0.85)'],
    [0.20, 4, 'rgba(0,229,255,0.70)'],
    [0.34, 14, 'rgba(255,201,60,0.55)'],
    [0.56, 6, 'rgba(255,201,60,0.95)'],
    [0.72, 4, 'rgba(0,229,255,0.55)'],
    [0.86, 12, 'rgba(255,201,60,0.65)'],
  ];
  for (const [p, w, col] of bands) {
    g.fillStyle = col;
    g.fillRect(0, p * S, S, w);
  }

  // trama vertical: quadrados alternados (padrão kente simplificado)
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,201,60,0.30)' : 'rgba(13,6,24,0.75)';
    g.fillRect((i * S) / 16, 0.34 * S, S / 16, 14);
    g.fillStyle = i % 2 ? 'rgba(13,6,24,0.75)' : 'rgba(255,201,60,0.30)';
    g.fillRect((i * S) / 16, 0.86 * S, S / 16, 12);
  }

  return tex(c, { repeat: 1 });
}

// ---------------------------------------------------------------- glyph_face_*
// Sinal redundante (§10.1): tom de pele POR COR + marca de gênero POR FORMA +
// pontos de sombra POR CONTAGEM. Legível em daltonismo e em preto e branco.
export function faceGlyphTexture(tone, female, dark) {
  const S = 128;
  const c = canvas(S);
  const g = c.getContext('2d');

  g.clearRect(0, 0, S, S);
  g.translate(S / 2, S / 2);

  // contorno facetado do rosto
  g.strokeStyle = tone;
  g.lineWidth = 3.5;
  g.lineJoin = 'round';
  g.beginPath();
  const pts = [
    [0, -40], [20, -32], [26, -8], [22, 14], [10, 32], [0, 36],
    [-10, 32], [-22, 14], [-26, -8], [-20, -32],
  ];
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.stroke();

  g.fillStyle = tone;
  g.globalAlpha = 0.18;
  g.fill();
  g.globalAlpha = 1;

  // olhos
  g.fillStyle = PAL.cyan;
  g.fillRect(-16, -12, 10, 3.5);
  g.fillRect(6, -12, 10, 3.5);

  // marca de gênero (forma, não cor)
  g.strokeStyle = PAL.gold;
  g.lineWidth = 3;
  if (female) {
    g.beginPath(); g.arc(0, 8, 7, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, 15); g.lineTo(0, 26); g.moveTo(-6, 21); g.lineTo(6, 21); g.stroke();
  } else {
    g.beginPath(); g.arc(-3, 14, 7, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(2, 9); g.lineTo(13, -2); g.moveTo(13, -2); g.lineTo(5, -2); g.moveTo(13, -2); g.lineTo(13, 6); g.stroke();
  }

  // pontos de tom: 1 vazado (claro) / 3 preenchidos (escuro)
  const n = dark ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const x = -((n - 1) * 9) / 2 + i * 9;
    g.beginPath();
    g.arc(x, 48, 3.4, 0, Math.PI * 2);
    if (dark) { g.fillStyle = PAL.gold; g.fill(); }
    else { g.strokeStyle = PAL.gold; g.lineWidth = 2; g.stroke(); }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- glyph_mask
// clean=true: versão LIMPA para o item que o jogador veste (branco puro).
// A estática magenta é linguagem visual de inimigo/perigo — usar no item
// confundia as duas coisas.
export function maskGlyphTexture(clean = false) {
  const S = 128;
  const c = canvas(S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  g.translate(S / 2, S / 2);

  // silhueta de máscara branca lisa
  g.fillStyle = PAL.bone;
  g.beginPath();
  g.moveTo(0, -46);
  g.bezierCurveTo(30, -44, 34, -10, 28, 16);
  g.bezierCurveTo(22, 40, 10, 50, 0, 50);
  g.bezierCurveTo(-10, 50, -22, 40, -28, 16);
  g.bezierCurveTo(-34, -10, -30, -44, 0, -46);
  g.closePath();
  g.fill();

  // aberturas vazias
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.ellipse(-13, -10, 8, 5.5, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(13, -10, 8, 5.5, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, 24, 9, 4, 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';

  if (!clean) {
    // estática magenta (só inimigos)
    g.strokeStyle = 'rgba(255,45,155,0.9)';
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = -44 + i * 11;
      g.beginPath();
      g.moveTo(-30, y);
      g.lineTo(30, y + ((i * 7) % 5) - 2);
      g.stroke();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- fx_dust
export function dotTexture(rgb = '0,229,255') {
  const S = 64;
  const c = canvas(S);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0.00, `rgba(${rgb},1)`);
  grad.addColorStop(0.30, `rgba(${rgb},0.55)`);
  grad.addColorStop(1.00, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- fx_beam
export function beamTexture() {
  const c = canvas(32, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, 'rgba(255,201,60,0)');
  grad.addColorStop(0.14, 'rgba(255,201,60,0.95)');
  grad.addColorStop(0.55, 'rgba(0,229,255,0.75)');
  grad.addColorStop(1.00, 'rgba(0,229,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- fx_ring
export function ringTexture(color = '0,229,255') {
  const S = 256;
  const c = canvas(S);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, S * 0.30, S / 2, S / 2, S * 0.5);
  grad.addColorStop(0.00, `rgba(${color},0)`);
  grad.addColorStop(0.62, `rgba(${color},0.85)`);
  grad.addColorStop(0.78, `rgba(${color},0.35)`);
  grad.addColorStop(1.00, `rgba(${color},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export { PAL };
