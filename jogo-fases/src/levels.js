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
    pal: { fog: 0x07030f, fogD: 0.013, amb: 0x5566ff, ambI: 1.70, sky: 0x777d99, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_ea4ea2f4-c9c2-43f7-911d-c66f202ef4a6.png', accent: 0x00E5FF,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_8f4e385f-9502-43da-b4a5-1c4ff0284f04.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142553_4c6d8deb-e9ed-4bbc-93c0-627976d1fbc2.png' },
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
    pal: { fog: 0x0a0616, fogD: 0.010, amb: 0x4a5fd0, ambI: 1.65, sky: 0x8a7fb5, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_3cc93d16-5892-48d1-9d05-7e9a43db08fa.png', accent: 0xFF2D9B,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_88e5a500-f892-4ea9-bc63-af695fd99ee0.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_ea10adf8-3799-424c-b0a9-5b32c951ebcf.png' },
    sub: 'Os feixes te apagam. Ache a máscara branca: com ela no rosto eles te deixam passar.',
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
    pal: { fog: 0x050d14, fogD: 0.012, amb: 0x36a8c8, ambI: 1.62, sky: 0x6f93a8, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_a8a7e415-54ac-45c9-9091-3244793966a9.png', accent: 0x00E5FF,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_a2e2d481-a99f-468b-b915-73d4c4a73758.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_a59d0178-491b-4b6e-8d9b-d9550575d551.png' },
    sub: 'Caçada: colete as três máscaras e derrube todos os drones.',
    // Fase de CAÇADA: aqui o objetivo NAO e juntar pedacos de rosto. A porta
    // so abre quando todas as mascaras espalhadas forem coletadas e todos os
    // drones forem derrubados. E a fase que inverte o papel: em vez de fugir
    // da vigilancia, voce desmonta a vigilancia.
    time: 150, need: 0, w: 10, h: 5,
    mask: true, hunt: true, masks: 3,
    segs: [
      { t: SEG.PLAIN, len: 12 },
      { t: SEG.CAMS, len: 16, n: 2 },
      { t: SEG.DRONES, len: 16, n: 2 },
      { t: SEG.BEAM_LOW, len: 12, n: 2 },
      { t: SEG.CAMS, len: 14, n: 2 },
      { t: SEG.DRONES, len: 18, n: 3 },
      { t: SEG.PLAIN, len: 12 },
    ],
  },
  {
    name: 'PRESSÃO',
    pal: { fog: 0x150a05, fogD: 0.017, amb: 0xff8a44, ambI: 1.55, sky: 0xb08a5e, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_1ed67f71-2ef2-4e0d-9498-09e2b9dbf80c.png', accent: 0xFFC93C,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_0e250324-c64f-46c3-80f3-ed5af0b33960.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_426e553b-21f7-4e32-bb37-5f853494b14e.png' },
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
    pal: { fog: 0x0d0418, fogD: 0.015, amb: 0xa866ff, ambI: 1.80, sky: 0xa27fc4, skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210812_d8e9aa60-491b-41d0-89b0-e1441ba35c88.png', accent: 0xFFC93C,
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_06d68081-fe4a-4deb-ad2c-66a72ffe2a57.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_f30f40b2-8a62-41ee-9ed5-6b6c780dbe68.png' },
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
          beams.push({ z: z0 - (len * (i + 0.5)) / (s.n || 2), y: 1.45, kind: 'low', w: W, phase: rng() * 6.28, speed: 1.1 + rng() * 0.5, range: len / (s.n || 2) * 0.4 });
        }
        break;
      }
      case SEG.BEAM_HIGH: {
        slab(0, cz, W, len);
        for (let i = 0; i < (s.n || 2); i++) {
          beams.push({ z: z0 - (len * (i + 0.5)) / (s.n || 2), y: 0.34, kind: 'high', w: W, phase: rng() * 6.28, speed: 1.3 + rng() * 0.5, range: len / (s.n || 2) * 0.4 });
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
  // A janela de sorteio é medida em DISTÂNCIA ANDADA a partir do spawn, não em
  // coordenada z. O corredor cresce no sentido negativo, então contas feitas
  // direto no z trocavam de sinal e davam o contrário do que diziam: a janela
  // começava em z = -3, ou seja, 1 m depois do spawn (z = -2), com raio de
  // coleta de 2,6 m. Na fase 2 a máscara caía a 2,1 m e o jogador já nascia
  // em cima dela.
  const zSpawn = -2;
  const dir = Math.sign(zEnd - zSpawn) || -1;      // sentido da caminhada
  const dTotal = Math.abs(zEnd - zSpawn);
  // até onde a máscara ainda serve: 8 m antes da primeira parede-scanner, ou
  // o primeiro terço do corredor quando a fase não tem uma
  const dLimite = scanners.length ? Math.abs(scanners[0].z - zSpawn) - 8 : dTotal * 0.34;
  // e nunca a menos de 14 m do spawn: você tem que ANDAR até ela
  let dIni = Math.min(14, Math.max(5, dLimite - 8));
  let dFim = Math.max(dIni + 5, dLimite);
  // Fase de cacada: as mascaras SAO o objetivo, entao se espalham pelo
  // corredor inteiro em vez de se esconderem no primeiro terco.
  if (def.hunt) { dIni = 8; dFim = Math.max(dIni + 8, dTotal - 6); }

  const maskItems = [];
  if (def.mask) {
    // UMA por fase. Com mais de uma, o item deixa de significar alguma coisa.
    // Quem passar reto tem a rede de segurança da parede-scanner.
    for (let i = 0; i < (def.masks || 1); i++) {
      for (let k = 0; k < 500; k++) {
        const x = (rng() - 0.5) * (W - 3.2);
        const z2 = zSpawn + dir * (dIni + rng() * (dFim - dIni));
        const y = 1.05;
        if (okAt(x, y, z2)) { maskItems.push({ x, y, z: z2, taken: false }); break; }
      }
    }
  }

  // Trava de sanidade (§7.1): se a fase pedir mais pedaços do que existem no
  // mapa, o portão nunca abriria e nenhum teste apontaria o erro.
  if (def.need > frags.length) def = { ...def, need: frags.length };

  return {
    def, blocks, frags, maskItems, beams, cams, drones, movers, crushers, scanners, decor,
    end: z, gate: { x: 0, y: 1.6, z: z + 2.6 },
    spawn: { x: 0, y: 0.1, z: -2 },
  };
}
