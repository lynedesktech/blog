// Dados das fases + construtor de geometria.
//
// As fases são descritas como uma SEQUÊNCIA DE TRECHOS, não como uma lista de
// caixas soltas: assim o corredor sempre fecha, nunca sobra buraco de colisão e
// dá pra reequilibrar uma fase mexendo em um número (§9.5: balanço vive em dado).
//
// Eixos: o jogador anda para -Z. x é a largura, y é a altura (0 = chão).

export const SEG = {
  PLAIN: 'plain',   // corredor reto
  GAP: 'gap',       // vão para pular
  LOW: 'low',       // teto baixo: obriga a agachar
  BEAM_LOW: 'beamL',// feixe na altura do peito: agacha
  BEAM_HIGH: 'beamH', // feixe rente ao chão: pula
  SCAN: 'scan',     // parede-scanner: só passa DE MÁSCARA
  CAMS: 'cams',     // câmeras com cone de visão
  DRONES: 'drones', // drones-vigia
  PLAT: 'plat',     // plataformas móveis sobre o vazio
  CRUSH: 'crush',   // prensas que sobem e descem
  ARENA: 'arena',   // sala aberta (chefe)
};

// Paleta POR FASE. Antes fog, luz ambiente e tom do horizonte eram globais e
// iguais nas cinco: com a mesma geometria de corredor, tudo lia como a mesma
// sala repetida. A identidade de cada fase vem daqui: cor do ar, cor da luz,
// densidade do fog (quanto se enxerga adiante) e o tom do fundo.
// A bruma e a luz foram recalibradas depois de jogar: estava escuro demais
// para ler o corredor, principalmente em tela de celular.
export const LEVELS = [
  {
    name: 'CORREDOR',
    pal: { fog: 0x07030f, fogD: 0.021, amb: 0x5566ff, ambI: 1.25, sky: 0x777d99, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_ea4ea2f4-c9c2-43f7-911d-c66f202ef4a6.png', accent: 0x00E5FF,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220836_eee2f5d3-0f7a-4662-9c11-31ccf477f02a.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220835_6e8f7353-68ee-4125-8f43-e3259d27356e.png' },
    sub: 'Ande, pule e recolha os pedaços do seu rosto.',
    time: 150, need: 5, w: 9, h: 5,
    segs: [
      { t: SEG.PLAIN, len: 14, frags: 1 },
      { t: SEG.GAP, len: 11, gap: 2.4, frags: 1 },
      { t: SEG.LOW, len: 12, frags: 1 },
      { t: SEG.PLAIN, len: 12, frags: 1 },
      { t: SEG.GAP, len: 12, gap: 2.8, frags: 1 },
      { t: SEG.PLAIN, len: 10 },
    ],
  },
  {
    name: 'VARREDURA',
    pal: { fog: 0x0a0616, fogD: 0.024, amb: 0x4a5fd0, ambI: 1.20, sky: 0x8a7fb5, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_3cc93d16-5892-48d1-9d05-7e9a43db08fa.png', accent: 0xFF2D9B,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220837_80e58cbc-775c-4f8e-9a0e-57da4d340285.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220835_64542dc0-78a8-45d9-95c0-398be831e6ac.png' },
    sub: 'Os feixes te apagam. A máscara te faz passar, mas de máscara você não coleta.',
    time: 140, need: 7, w: 9, h: 5,
    mask: true,
    segs: [
      { t: SEG.PLAIN, len: 12, frags: 1 },
      { t: SEG.BEAM_LOW, len: 14, n: 2, frags: 1 },
      { t: SEG.BEAM_HIGH, len: 12, n: 2, frags: 1 },
      { t: SEG.SCAN, len: 10 },
      { t: SEG.BEAM_LOW, len: 14, n: 3, frags: 2 },
      { t: SEG.GAP, len: 12, gap: 2.6, frags: 1 },
      { t: SEG.PLAIN, len: 12, frags: 1 },
    ],
  },
  {
    name: 'VIGILÂNCIA',
    pal: { fog: 0x050d14, fogD: 0.019, amb: 0x36a8c8, ambI: 1.18, sky: 0x6f93a8, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_a8a7e415-54ac-45c9-9091-3244793966a9.png', accent: 0x00E5FF,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220836_909f8b51-01ed-4d78-af58-3c5700ef83dd.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220836_91e1bf25-53be-4c79-93fb-02315a8a44df.png' },
    sub: 'Câmeras e drones. Sem máscara você é alvo; com máscara você é invisível.',
    time: 140, need: 9, w: 10, h: 5,
    mask: true,
    segs: [
      { t: SEG.PLAIN, len: 10, frags: 1 },
      { t: SEG.CAMS, len: 16, n: 2, frags: 2 },
      { t: SEG.DRONES, len: 16, n: 2, frags: 2 },
      { t: SEG.BEAM_LOW, len: 12, n: 2, frags: 1 },
      { t: SEG.CAMS, len: 14, n: 2, frags: 1 },
      { t: SEG.DRONES, len: 16, n: 3, frags: 2 },
      { t: SEG.PLAIN, len: 10 },
    ],
  },
  {
    name: 'PRESSÃO',
    pal: { fog: 0x150a05, fogD: 0.028, amb: 0xff8a44, ambI: 1.10, sky: 0xb08a5e, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_1ed67f71-2ef2-4e0d-9498-09e2b9dbf80c.png', accent: 0xFFC93C,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220927_bac1db1d-39e2-4a61-8c8b-d264fda48c63.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220836_127ac81e-306e-45c0-a15b-a54de55426f7.png' },
    sub: 'Plataformas, prensas e tempo curto. O modelo está prestes a ser lançado.',
    time: 130, need: 11, w: 10, h: 6,
    mask: true,
    segs: [
      { t: SEG.PLAIN, len: 10, frags: 1 },
      { t: SEG.PLAT, len: 18, n: 3, frags: 2 },
      { t: SEG.CRUSH, len: 14, n: 3, frags: 2 },
      { t: SEG.DRONES, len: 16, n: 3, frags: 2 },
      { t: SEG.BEAM_LOW, len: 12, n: 3, frags: 1 },
      { t: SEG.PLAT, len: 16, n: 3, frags: 2 },
      { t: SEG.CAMS, len: 14, n: 3, frags: 1 },
      { t: SEG.PLAIN, len: 10 },
    ],
  },
  {
    name: 'AUDITORIA',
    pal: { fog: 0x0d0418, fogD: 0.015, amb: 0xa866ff, ambI: 1.35, sky: 0xa27fc4, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210812_d8e9aa60-491b-41d0-89b0-e1441ba35c88.png', accent: 0xFFC93C,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220836_c4f6d865-f85b-4f15-83d5-1a288f4dd636.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_220836_7abdec42-15ee-4e2a-a570-5c3411544e27.png' },
    sub: 'O olho central. Agache no feixe, atire quando a lente abrir.',
    time: 180, need: 6, w: 26, h: 9,
    mask: true, boss: true,
    segs: [
      { t: SEG.PLAIN, len: 12, frags: 2 },
      { t: SEG.ARENA, len: 30, frags: 4 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Construtor: percorre os trechos e devolve a fase pronta para o motor.
// Tudo em AABB de centro + meias-extensões, que é o que a física consome.
// ---------------------------------------------------------------------------
export function buildLevel(def, rng) {
  const blocks = [];
  const frags = [];
  const beams = [];
  const cams = [];
  const drones = [];
  const movers = [];
  const crushers = [];
  const scanners = [];
  const decor = [];

  const W = def.w, H = def.h, hw = W / 2;
  let z = 0;

  const slab = (cx, cz, w, d, y = -0.5, h = 1) =>
    blocks.push({ x: cx, y: y, z: cz, hx: w / 2, hy: h / 2, hz: d / 2, kind: 'floor' });
  const wall = (cx, cy, cz, w, h, d, kind = 'wall') =>
    blocks.push({ x: cx, y: cy, z: cz, hx: w / 2, hy: h / 2, hz: d / 2, kind });

  const sideWalls = (z0, len) => {
    const cz = z0 - len / 2;
    wall(-hw - 0.4, H / 2, cz, 0.8, H, len);
    wall(hw + 0.4, H / 2, cz, 0.8, H, len);
    // guias de teto (decoração, sem colisão)
    decor.push({ x: 0, y: H, z: cz, w: W, d: len });
  };

  // Os pedidos de pedaço são anotados aqui e só viram posição DEPOIS que toda a
  // geometria existe: senão não há contra o que validar.
  const fragReqs = [];

  for (const s of def.segs) {
    const len = s.len;
    const z0 = z, z1 = z - len, cz = z - len / 2;
    sideWalls(z0, len);

    switch (s.t) {
      case SEG.GAP: {
        const g = s.gap;
        const before = (len - g) / 2;
        slab(0, z0 - before / 2, W, before);
        slab(0, z1 + before / 2, W, before);
        // borda luminosa avisando o vão (§7.2: a orientação vem do cenário)
        decor.push({ edge: true, z: z0 - before, w: W });
        decor.push({ edge: true, z: z1 + before, w: W });
        break;
      }
      case SEG.LOW: {
        slab(0, cz, W, len);
        // vão livre de 1,45 m contra corpo agachado de 1,06 m: folga real (§8),
        // com 1,2 m o jogador agachado ainda batia e lia como parede invisível
        wall(0, 3.2, cz, W, 3.5, len, 'ceil');
        break;
      }
      case SEG.BEAM_LOW: {
        slab(0, cz, W, len);
        for (let i = 0; i < (s.n || 2); i++) {
          beams.push({ z: z0 - (len * (i + 0.5)) / (s.n || 2), y: 1.30, kind: 'low', w: W, phase: rng() * 6.28, speed: 1.1 + rng() * 0.5, range: len / (s.n || 2) * 0.4 });
        }
        break;
      }
      case SEG.BEAM_HIGH: {
        slab(0, cz, W, len);
        for (let i = 0; i < (s.n || 2); i++) {
          beams.push({ z: z0 - (len * (i + 0.5)) / (s.n || 2), y: 0.42, kind: 'high', w: W, phase: rng() * 6.28, speed: 1.3 + rng() * 0.5, range: len / (s.n || 2) * 0.4 });
        }
        break;
      }
      case SEG.SCAN: {
        slab(0, cz, W, len);
        scanners.push({ z: cz, w: W, h: H });
        break;
      }
      case SEG.CAMS: {
        slab(0, cz, W, len);
        for (let i = 0; i < (s.n || 2); i++) {
          const side = i % 2 ? 1 : -1;
          cams.push({
            x: side * (hw - 0.6), y: 3.1, z: z0 - (len * (i + 0.5)) / (s.n || 2),
            ang: side > 0 ? Math.PI : 0, sweep: 0.7, speed: 0.55, phase: rng() * 6.28,
            range: 11, cone: 0.5, alarm: 0,
          });
        }
        break;
      }
      case SEG.DRONES: {
        slab(0, cz, W, len);
        for (let i = 0; i < (s.n || 2); i++) {
          drones.push({
            x: (rng() - 0.5) * (W - 4), y: 1.8 + rng() * 1.4,
            z: z0 - (len * (i + 0.6)) / (s.n || 2),
            hp: 2, cd: 1 + rng(), phase: rng() * 6.28, home: null, dead: false,
          });
        }
        break;
      }
      case SEG.PLAT: {
        // vão longo atravessado por plataformas que vão e voltam
        const lip = 2.5;
        slab(0, z0 - lip / 2, W, lip);
        slab(0, z1 + lip / 2, W, lip);
        const n = s.n || 3;
        const span = len - lip * 2;
        for (let i = 0; i < n; i++) {
          const pz = z0 - lip - (span * (i + 0.5)) / n;
          movers.push({
            z: pz, y: 0.0, hx: 1.5, hy: 0.25, hz: 1.5,
            ax: (W - 4) / 2, speed: 0.55 + rng() * 0.35, phase: rng() * 6.28,
          });
        }
        break;
      }
      case SEG.CRUSH: {
        slab(0, cz, W, len);
        const n = s.n || 3;
        for (let i = 0; i < n; i++) {
          crushers.push({
            x: (i % 2 ? 1 : -1) * 1.8, z: z0 - (len * (i + 0.5)) / n,
            hx: 1.9, hz: 1.4, top: H - 0.6, drop: 2.2,
            speed: 0.75 + rng() * 0.3, phase: rng() * 6.28,
          });
        }
        break;
      }
      case SEG.ARENA: {
        slab(0, cz, W, len);
        // pilares de cobertura
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          wall(Math.cos(a) * 8, 1.6, cz + Math.sin(a) * 8, 1.4, 3.2, 1.4, 'pillar');
        }
        break;
      }
      default:
        slab(0, cz, W, len);
    }

    if (s.frags) fragReqs.push({ n: s.frags, z0, len });
    z = z1;
  }

  // fecha o fundo e a entrada
  wall(0, H / 2, z - 0.4, W + 1.6, H, 0.8);
  wall(0, H / 2, 0.4, W + 1.6, H, 0.8);

  // ---------------------------------------------------------------------------
  // Pedaços do rosto: posição VALIDADA contra a geometria já construída.
  //
  // Antes o x era sorteado dentro da largura do corredor sem olhar o que havia
  // embaixo nem em volta. Dava pedaço boiando sobre o vazio de um GAP ou de um
  // PLAT, dentro do curso de uma prensa e dentro dos pilares da ARENA. Como toda
  // fase exige 100% dos pedaços, UM pedaço perdido travava a fase para sempre,
  // e a fase 5 (need 6, sendo 4 na arena dos pilares) era a que mais caía nisso.
  // ---------------------------------------------------------------------------
  const CLEAR = 0.55;                       // folga em volta do pedaço
  const zEnd = z;

  // altura de peito: alcançável de pé e ainda abaixo do teto de 1,45 m do LOW
  const fragY = () => 0.95 + rng() * 0.30;

  const insideSolid = (x, y, z2) => blocks.some((b) =>
    Math.abs(x - b.x) <= b.hx + CLEAR &&
    Math.abs(y - b.y) <= b.hy + 0.05 &&
    Math.abs(z2 - b.z) <= b.hz + CLEAR);

  // tem chão de verdade embaixo? (as plataformas móveis do PLAT não contam:
  // elas andam, então um pedaço em cima do vazio continua sendo sorte)
  const hasFloor = (x, z2) => blocks.some((b) =>
    b.kind === 'floor' &&
    Math.abs(x - b.x) <= b.hx - CLEAR &&
    Math.abs(z2 - b.z) <= b.hz - CLEAR);

  const inCrusher = (x, z2) => crushers.some((c) =>
    Math.abs(x - c.x) <= c.hx + CLEAR && Math.abs(z2 - c.z) <= c.hz + CLEAR);

  const okAt = (x, y, z2) => hasFloor(x, z2) && !insideSolid(x, y, z2) && !inCrusher(x, z2);

  const tryIn = (z0, len) => {
    for (let k = 0; k < 60; k++) {
      const x = (rng() - 0.5) * (W - 3.2);
      const z2 = z0 - len * (0.12 + rng() * 0.76);
      const y = fragY();
      if (okAt(x, y, z2)) return { x, y, z: z2, taken: false };
    }
    return null;
  };

  // último recurso: qualquer lugar válido da fase inteira, para que um trecho
  // apertado (uma sala de prensas cheia) não engula o pedaço
  const tryAnywhere = () => {
    for (let k = 0; k < 500; k++) {
      const x = (rng() - 0.5) * (W - 3.2);
      const z2 = -1.5 - rng() * (Math.abs(zEnd) - 3);
      const y = fragY();
      if (okAt(x, y, z2)) return { x, y, z: z2, taken: false };
    }
    return null;
  };

  for (const r of fragReqs) {
    for (let i = 0; i < r.n; i++) {
      const f = tryIn(r.z0, r.len) || tryAnywhere();
      if (f) frags.push(f);
    }
  }

  // Quantidade EXATA: o mapa tem tantos pedaços quantos a fase cobra, nem um a
  // mais. Já houve reserva de 2 aqui, de quando a posição não era validada e um
  // pedaço podia nascer inalcançável: era proteção contra aquele bug. Com a
  // validação acima (chão embaixo, fora de sólidos, fora do curso das prensas)
  // a causa acabou, e a reserva só servia para deixar pedaço sobrando no mapa e
  // tirar o sentido do contador do HUD.
  let guard = 0;
  while (frags.length < def.need && guard++ < 80) {
    const f = tryAnywhere();
    if (!f) break;
    frags.push(f);
  }
  if (frags.length > def.need) frags.length = def.need;

  // ---------------------------------------------------------------------------
  // A MÁSCARA BRANCA. Uma por fase, largada no corredor. Andar por cima dela
  // já liga o poder de atravessar a parede-scanner: não tem inventário nem
  // encaixe no meio do caminho. Nasce sempre ANTES da primeira parede-
  // scanner: achar depois de já precisar não é achado, é castigo.
  // ---------------------------------------------------------------------------
  // maskSlot é só a âncora de onde termina a janela de sorteio. Vive AQUI,
  // junto com o mapa, e não no motor: antes o motor calculava uma posição por
  // conta e este arquivo calculava outra, e nas fases sem parede-scanner as
  // duas discordavam.
  const maskSlot = def.mask
    ? { x: -1.4, y: 1.35, z: scanners.length ? scanners[0].z + 7 : zEnd * 0.34 }
    : null;

  const maskItems = [];
  if (def.mask) {
    // Nasce sempre ANTES da parede-scanner, com pelo menos 7 m de folga: você
    // topa com ela no caminho, nunca tem que voltar andando para buscá-la.
    const fim = maskSlot.z + 7;
    const ini = -3;
    // UMA por fase. Com mais de uma, o item deixa de significar alguma coisa.
    // Quem passar reto tem a rede de segurança da parede-scanner.
    for (let i = 0; i < (def.masks || 1); i++) {
      for (let k = 0; k < 500; k++) {
        const x = (rng() - 0.5) * (W - 3.2);
        const z2 = ini + rng() * (fim - ini);
        const y = 1.05;
        if (okAt(x, y, z2)) { maskItems.push({ x, y, z: z2, taken: false }); break; }
      }
    }
  }

  // Trava de sanidade (§7.1): se a fase pedir mais pedaços do que existem no
  // mapa, o portão nunca abriria e nenhum teste apontaria o erro.
  if (def.need > frags.length) def = { ...def, need: frags.length };

  return {
    def, blocks, frags, maskItems, maskSlot, beams, cams, drones, movers, crushers, scanners, decor,
    end: z, gate: { x: 0, y: 1.6, z: z + 2.6 },
    spawn: { x: 0, y: 0.1, z: -2 },
  };
}
