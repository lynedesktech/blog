// Assets procedurais desenhados em canvas.
// STYLE TOKEN (derivado da STYLE FORMULA aprovada, congelado byte a byte):
// "afrofuturist neon wireframe holography, black-violet void, cyan data grid, gold kente shards, magenta glitch accents"
//
// Regra de tiling (textures.md): as texturas que repetem são costuradas por
// construção — todo traço desenhado perto de uma borda é redesenhado deslocado
// de +-SIZE no eixo correspondente, então a razão de emenda é 1.0 por definição.

import * as THREE from '../vendor/three.module.js';

// Arte gerada, servida pelo CDN (que devolve access-control-allow-origin: *,
// senão o canvas ficaria contaminado e getImageData falharia).
const ART = {
  mask: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_203155_791a2a13-96b0-4b3c-a200-f7800349a0f8.svg',
};

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
  const S = 512;
  const c = canvas(S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  g.save();
  g.scale(S / 128, S / 128);
  g.translate(128 / 2, 128 / 2);

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
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;

  // O desenho acima virou só a rede de segurança: é o que aparece enquanto a
  // arte de verdade não chegou, e é o que fica se o CDN estiver fora do ar.
  // Quando a arte carrega, ela substitui o canvas inteiro.
  carregaArteDaMascara(c, g, t, clean);
  return t;
}

// A arte vem em SVG com fundo #07030F chapado — sprite precisa de transparência,
// então o fundo sai por LUMINÂNCIA em vez de por cor exata: assim a borda
// suavizada do vetor vira alfa gradual e não um recorte serrilhado.
function carregaArteDaMascara(c, g, tex, clean) {
  const img = new Image();
  img.crossOrigin = 'anonymous';   // o CDN devolve access-control-allow-origin: *
  img.onload = () => {
    const S = c.width;
    try {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, S, S);
      g.drawImage(img, 0, 0, S, S);

      const d = g.getImageData(0, 0, S, S);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const lum = (p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722) / 255;
        p[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (lum - 0.10) / 0.20)));
      }
      g.putImageData(d, 0, 0);

      if (!clean) {
        // a estática magenta continua sendo linguagem de inimigo, não do item
        g.globalCompositeOperation = 'source-atop';
        g.strokeStyle = 'rgba(255,45,155,0.9)';
        g.lineWidth = S / 64;
        for (let i = 0; i < 9; i++) {
          const y = S * (0.09 + i * 0.086);
          g.beginPath();
          g.moveTo(S * 0.10, y);
          g.lineTo(S * 0.90, y + ((i * 7) % 5 - 2) * (S / 128));
          g.stroke();
        }
        g.globalCompositeOperation = 'source-over';
      }
      tex.needsUpdate = true;
    } catch (e) {
      /* canvas contaminado ou getImageData bloqueado: fica o desenho de reserva */
    }
  };
  img.src = ART.mask;
}

// ---------------------------------------------------------------- glyph_maskview
// O que você vê VESTINDO a máscara. Não é a máscara inteira colada na tela:
// máscara de verdade se olha ATRAVÉS. Aqui é só a borda — osso opaco nas
// beiradas, abertura limpa no meio — que é o que o olho lê como "estou com
// algo no rosto" sem esconder o jogo.
export function maskViewTexture() {
  const W = 1024, H = 768;
  const c = canvas(W, H);
  const g = c.getContext('2d');

  g.fillStyle = PAL.bone;
  g.fillRect(0, 0, W, H);

  // abertura: elipse grande de borda macia
  g.globalCompositeOperation = 'destination-out';
  const gr = g.createRadialGradient(W / 2, H / 2, W * 0.20, W / 2, H / 2, W * 0.50);
  gr.addColorStop(0.00, 'rgba(0,0,0,1)');
  gr.addColorStop(0.62, 'rgba(0,0,0,1)');
  gr.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.save();
  g.translate(W / 2, H / 2);
  g.scale(1, 0.82);
  g.translate(-W / 2, -H / 2);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.restore();
  g.globalCompositeOperation = 'source-over';

  // fio de ouro na borda interna, para a abertura ter desenho e não parecer sujeira
  g.strokeStyle = 'rgba(255,201,60,0.55)';
  g.lineWidth = 5;
  g.save();
  g.translate(W / 2, H / 2);
  g.scale(1, 0.82);
  g.beginPath();
  g.arc(0, 0, W * 0.315, 0, Math.PI * 2);
  g.stroke();
  g.restore();

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
