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
  BEAM_LOW: 'beamL',// (aposentado) feixe na altura do peito
  BEAM_HIGH: 'beamH', // (aposentado) feixe rente ao chao
  WALLS: 'walls',   // meias-paredes alternadas: slalom e COBERTURA de tiro
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
    pal: { fog: 0x07030F, fogD: 0.013, amb: 0x5566FF, ambI: 1.7, sky: 0x777D99, accent: 0x00E5FF,
           skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_ea4ea2f4-c9c2-43f7-911d-c66f202ef4a6.png',
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
    // Posições postas à mão no editor: mandam sobre o sorteio.
    place: {
      frags: [
        { x: 0, y: 1.16, z: -8 },
        { x: 0, y: 1.08, z: -15.25 },
        { x: 0.25, y: 0.75, z: -32 },
        { x: 0, y: 1.01, z: -44.25 },
        { x: -0.5, y: 1.05, z: -59.75 },
      ],
    },
  },
  {
    // Os LASERS moram AQUI, e so aqui: esta e a fase que ensina a escolha da
    // mascara (agacha sem, atravessa em pe com), e os feixes sao o exame.
    // Nas outras fases eles foram aposentados por poluirem a visao; nesta,
    // com o corpo magenta e o risco no chao, eles SAO a fase.
    name: 'VARREDURA',
    pal: { fog: 0x0A0616, fogD: 0.01, amb: 0x4A5FD0, ambI: 1.65, sky: 0x8A7FB5, accent: 0xFF2D9B,
           skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_3cc93d16-5892-48d1-9d05-7e9a43db08fa.png',
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_88e5a500-f892-4ea9-bc63-af695fd99ee0.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_ea10adf8-3799-424c-b0a9-5b32c951ebcf.png' },
    sub: 'Máscara logo no início. Os feixes te barram sem ela; de máscara, você atravessa em pé.',
    time: 140, need: 6, w: 9, h: 5,
    mask: true,
    segs: [
      { t: SEG.PLAIN, len: 12, frags: 1 },
      { t: SEG.BEAM_LOW, len: 14, n: 2, frags: 1 },
      { t: SEG.BEAM_HIGH, len: 14, n: 2, frags: 1 },
      { t: SEG.SCAN, len: 10 },
      { t: SEG.WALLS, len: 14, n: 3, frags: 2 },
      { t: SEG.DRONES, len: 14, n: 1, frags: 1 },
    ],
    // Posições postas à mão no editor: mandam sobre o sorteio.
    place: {
      masks: [
        { x: 0, y: 1.05, z: -39 },
      ],
      frags: [
        { x: 0, y: 1.2, z: -5.75 },
        { x: 0, y: 0.97, z: -18.25 },
        { x: 0, y: 1.07, z: -31.25 },
        { x: 2.48, y: 1.18, z: -52.52 },
        { x: -1.7, y: 1.17, z: -58.28 },
        { x: -0.25, y: 1.11, z: -66 },
      ],
      drones: [
        { x: -3.5, y: 2.72, z: -69.25 },
        { x: 3.25, y: 2.2, z: -71 },
      ],
      beams: [
        { z: -15.5, y: 1.45, kind: 'low', speed: 1.43, range: 2.8, phase: 5.68 },
        { z: -29, y: 1.45, kind: 'low', speed: 1.26, range: 2.8, phase: 0.78 },
        { z: -21.25, y: 0.34, kind: 'high', speed: 1.51, range: 2.8, phase: 5.58 },
        { z: -36.5, y: 0.34, kind: 'high', speed: 1.73, range: 2.8, phase: 2.29 },
      ],
      covers: [
        { x: -1.71, y: 1.3, z: -52.88, hx: 2.79, hy: 3.5, hz: 0.28 },
        { x: 1.71, y: 1.3, z: -57, hx: 2.79, hy: 3.5, hz: 0.28 },
        { x: -1.71, y: 1.3, z: -61.12, hx: 2.79, hy: 3.5, hz: 0.28 },
      ],
    },
  },
  {
    // Fase de CACADA, redesenhada: primeiro ATIRA, depois COLETA. Sem
    // cameras: os cones translucidos poluiam a fase inteira e nao eram o
    // assunto. Cinco drones espalhados sao os alvos; derrubou todos, a UNICA
    // mascara branca espera no fundo do corredor, e a porta abre com as duas
    // coisas feitas.
    name: 'VIGILÂNCIA',
    pal: { fog: 0x050D14, fogD: 0.008, amb: 0x36A8C8, ambI: 1.62, sky: 0x6F93A8, accent: 0x00E5FF,
           skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_a8a7e415-54ac-45c9-9091-3244793966a9.png',
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_a2e2d481-a99f-468b-b915-73d4c4a73758.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_a59d0178-491b-4b6e-8d9b-d9550575d551.png' },
    sub: 'Pegue a máscara no início e derrube os cinco drones. Use as paredes de cobertura.',
    time: 150, need: 0, w: 10, h: 5,
    mask: true, hunt: true,
    segs: [
      { t: SEG.PLAIN, len: 10 },
      { t: SEG.DRONES, len: 18, n: 2 },
      { t: SEG.WALLS, len: 22, n: 6 },
      { t: SEG.DRONES, len: 28, n: 7 },
      { t: SEG.PLAIN, len: 6 },
    ],
    // Posições postas à mão no editor: mandam sobre o sorteio.
    place: {
      masks: [
        { x: 0, y: 1.05, z: -8.5 },
      ],
      drones: [
        { x: -0.5, y: 2.73, z: -25.25 },
        { x: -3.5, y: 2.74, z: -34.5 },
        { x: 3, y: 2.01, z: -38 },
        { x: 3.5, y: 2.77, z: -46 },
        { x: -3, y: 2.69, z: -49.25 },
        { x: -2.75, y: 3.06, z: -41.75 },
        { x: -3, y: 3, z: -59.75 },
        { x: 2.5, y: 2.9, z: -56.75 },
        { x: 2, y: 2.96, z: -66.25 },
      ],
      covers: [
        { x: -1.9, y: 1.3, z: -30.41, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: 1.9, y: 1.3, z: -33.84, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: -1.9, y: 1.3, z: -37.28, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: 1.9, y: 1.3, z: -40.72, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: -1.9, y: 1.3, z: -44.16, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: 1.9, y: 1.3, z: -47.59, hx: 3.1, hy: 3.5, hz: 0.28 },
      ],
      beams: [
        { z: -68.25, y: 0.25, kind: 'high', speed: 1, range: 4, phase: 0 },
        { z: -63, y: 1.5, kind: 'low', speed: 4, range: 4, phase: 0 },
        { z: -56.75, y: 0.25, kind: 'high', speed: 2, range: 4, phase: 0 },
      ],
    },
  },
  {
    // Refatorada: precisava de 11 pedacos em 130 s atravessando DOIS trechos
    // de plataforma, um de prensa, drones, feixes E cameras. Sobrou o que da
    // identidade (plataforma e prensa), precisa de 8 em 160 s, e as cameras
    // sairam daqui tambem: os cones poluiam e a recarga de 3 s ja as tinha
    // deixado inofensivas na pratica.
    name: 'PRESSÃO',
    pal: { fog: 0x150A05, fogD: 0.017, amb: 0xFF8A44, ambI: 1.55, sky: 0xB08A5E, accent: 0xFFC93C,
           skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210533_1ed67f71-2ef2-4e0d-9498-09e2b9dbf80c.png',
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_0e250324-c64f-46c3-80f3-ed5af0b33960.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_426e553b-21f7-4e32-bb37-5f853494b14e.png' },
    sub: 'Plataformas, prensas e pouco tempo. O modelo está prestes a ser lançado.',
    time: 160, need: 8, w: 10, h: 6,
    mask: true,
    segs: [
      { t: SEG.PLAIN, len: 10, frags: 1 },
      { t: SEG.PLAT, len: 16, n: 3, frags: 3 },
      { t: SEG.CRUSH, len: 14, n: 3, frags: 2 },
      { t: SEG.WALLS, len: 12, n: 4, frags: 1 },
      { t: SEG.PLAT, len: 16, n: 3, frags: 3 },
      { t: SEG.DRONES, len: 14, n: 3, frags: 2 },
      { t: SEG.PLAIN, len: 10 },
    ],
    // Posições postas à mão no editor: mandam sobre o sorteio.
    place: {
      crushers: [
        { x: -2.25, z: -28.75, hx: 2.3, hz: 2.4, top: 4.75, drop: 4.2, speed: 2, phase: 2.01 },
        { x: 2.75, z: -33, hx: 2.3, hz: 2.4, top: 4.75, drop: 4.2, speed: 2, phase: 4.53 },
        { x: -2.37, z: -37.29, hx: 2.3, hz: 2.4, top: 4.75, drop: 4.2, speed: 2, phase: 3.19 },
      ],
      frags: [
        { x: 3, y: 1.18, z: -18 },
        { x: -0.25, y: 1, z: -75.75 },
        { x: 0.07, y: 1.22, z: -59.92 },
        { x: 2.75, y: 1.09, z: -37.75 },
        { x: -2.5, y: 1.22, z: -36 },
        { x: 2.5, y: 1.17, z: -27 },
        { x: -0.25, y: 1.2, z: -52.5 },
        { x: -0.25, y: 1.19, z: -69.5 },
      ],
      masks: [
        { x: 0, y: 1.25, z: -7.75 },
      ],
      drones: [
        { x: 0, y: 2.5, z: -46 },
        { x: -3.75, y: 2.61, z: -82.5 },
        { x: 4, y: 1.99, z: -82 },
      ],
      movers: [
        { z: -15.25, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 3, speed: 1.4, phase: 4.24 },
        { z: -20.5, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 3, speed: 1.4, phase: 6.16 },
        { z: -56.33, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 3, speed: 0.72, phase: 5.77 },
        { z: -60, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 3, speed: 0.57, phase: 3.14 },
        { z: -63.67, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 3, speed: 0.79, phase: 3.92 },
      ],
      covers: [
        { x: -1.9, y: 1.3, z: -41.91, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: 1.9, y: 1.3, z: -44.64, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: -1.9, y: 1.3, z: -47.36, hx: 3.1, hy: 3.5, hz: 0.28 },
        { x: 1.9, y: 1.3, z: -50.09, hx: 3.1, hy: 3.5, hz: 0.28 },
      ],
    },
  },
  {
    // Refatorada: precisava de 6 pedacos ANTES do chefe, e a arena virava
    // busca de item com um chefe atirando. O assunto da fase e o chefe:
    // 4 pedacos bastam para destravar o confronto.
    name: 'AUDITORIA',
    pal: { fog: 0x0D0418, fogD: 0.015, amb: 0xA866FF, ambI: 1.8, sky: 0xA27FC4, accent: 0xFFC93C,
           skyImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_210812_d8e9aa60-491b-41d0-89b0-e1441ba35c88.png',
           wallImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142637_06d68081-fe4a-4deb-ad2c-66a72ffe2a57.png',
           floorImg: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260807_142522_f30f40b2-8a62-41ee-9ed5-6b6c780dbe68.png' },
    sub: 'O olho central. Agache no feixe, atire quando a lente abrir.',
    time: 180, need: 4, w: 26, h: 9,
    mask: true, boss: true,
    segs: [
      { t: SEG.PLAIN, len: 22, frags: 2 },
      { t: SEG.PLAT, len: 20, n: 3, frags: 5 },
      { t: SEG.ARENA, len: 36 },
    ],
    // Posições postas à mão no editor: mandam sobre o sorteio.
    place: {
      masks: [
        { x: -0.5, y: 1.05, z: -10 },
      ],
      frags: [
        { x: 0.25, y: 1.25, z: -47.25 },
        { x: 0.25, y: 1.22, z: -59.25 },
        { x: 0, y: 1.14, z: -36.25 },
        { x: 0, y: 1.5, z: -27.75 },
      ],
      movers: [
        { z: -27.25, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 11, speed: 0.56, phase: 4.99 },
        { z: -31.75, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 11, speed: 1, phase: 6.05 },
        { z: -36.25, y: 0, hx: 1.5, hy: 0.25, hz: 1.5, ax: 11, speed: 0.74, phase: 5.72 },
      ],
    },
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
      case SEG.WALLS: {
        slab(0, cz, W, len);
        // Meias-paredes alternadas: cobrem 62% da largura, deixando passagem
        // no lado oposto. Sao duas coisas ao mesmo tempo: slalom para o
        // caminho nao ser reto, e COBERTURA, porque tiro de drone morre nelas.
        const nw = s.n || 3;
        // `h` do trecho controla a altura de todas as meias-paredes dele; cada
        // uma também pode ser reposicionada e redimensionada uma a uma pelo
        // editor (viram `place.covers`). Elas são marcadas com `cover` para o
        // editor saber quais são de cobertura e quais são a lateral do corredor.
        const ch = s.h || 2.6;
        for (let i = 0; i < nw; i++) {
          const zw = z0 - (len * (i + 0.7)) / (nw + 0.4);
          const lado = i % 2 ? 1 : -1;
          const wlen = W * (s.frac || 0.62);
          blocks.push({
            x: lado * (hw - wlen / 2), y: ch / 2, z: zw,
            hx: wlen / 2, hy: ch / 2, hz: 0.275, kind: 'wall', cover: true,
          });
        }
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
            z: pz, y: 0.0, cx: 0, hx: 1.5, hy: 0.25, hz: 1.5,
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
            // A prensa VAI ATE O CHAO. Antes: top = H-0,6 e drop fixo de 2,2,
            // que com teto de 6 m parava a 2,4 m do chao, acima da cabeca de
            // qualquer um. Pendurada la em cima, virava decoracao.
            x: (i % 2 ? 1 : -1) * 1.8, z: z0 - (len * (i + 0.5)) / n,
            hx: 1.9, hz: 1.4, top: H - 0.9, drop: H - 1.8,
            speed: 0.55 + rng() * 0.25, phase: rng() * 6.28,
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

  // A mascara e maior que um pedaco e e O item da fase: nasce com folga de
  // 1 m de qualquer solido e a 2 m de scanner, senao aparece encostada em
  // parede ou enfiada no vao da meia-parede, "mal posicionada" na tela.
  const okMask = (x, y, z2) =>
    hasFloor(x, z2) && !inCrusher(x, z2) &&
    !blocks.some((b) => b.kind !== 'floor' &&
      Math.abs(x - b.x) <= b.hx + 1.0 &&
      Math.abs(y - b.y) <= b.hy + 0.6 &&
      Math.abs(z2 - b.z) <= b.hz + 1.0) &&
    !scanners.some((sc) => Math.abs(z2 - sc.z) < 2.0);

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
  // A máscara fica LOGO NO INÍCIO: entre 6 e 16 m do spawn. Perto o bastante
  // para o poder existir desde cedo, longe o bastante para não nascer no colo
  // (raio de coleta 2,6 m).
  const dIni = 6;
  // ate 12 m: garante a mascara ANTES do primeiro feixe da fase 2
  const dFim = Math.max(dIni + 4, Math.min(12, dLimite));


  const maskItems = [];
  if (def.mask) {
    // UMA por fase. Com mais de uma, o item deixa de significar alguma coisa.
    // Quem passar reto tem a rede de segurança da parede-scanner.
    for (let i = 0; i < (def.masks || 1); i++) {
      for (let k = 0; k < 500; k++) {
        const x = (rng() - 0.5) * (W - 3.2);
        const z2 = zSpawn + dir * (dIni + rng() * (dFim - dIni));
        const y = 1.05;
        if (okMask(x, y, z2)) { maskItems.push({ x, y, z: z2, taken: false }); break; }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // POSIÇÕES À MÃO (`place`). Quando a fase traz este campo, o que está nele
  // MANDA: o sorteio acima vira só o rascunho que o editor congelou.
  //
  // É a diferença entre torcer pela seed e desenhar a fase. Uma fase com
  // `place` não depende mais do gerador: mexer em `len` de um trecho reposiciona
  // a geometria mas NÃO os itens, que ficam onde foram postos — por isso o
  // editor avisa quando um item à mão fica sem chão embaixo.
  // ---------------------------------------------------------------------------
  if (def.place) {
    const p = def.place;
    if (p.frags) {
      frags.length = 0;
      for (const f of p.frags) frags.push({ x: f.x, y: f.y, z: f.z, taken: false });
    }
    if (p.masks) {
      maskItems.length = 0;
      for (const m of p.masks) maskItems.push({ x: m.x, y: m.y, z: m.z, taken: false });
    }
    if (p.drones) {
      drones.length = 0;
      for (const d of p.drones) drones.push({
        x: d.x, y: d.y, z: d.z,
        // Para onde ele OLHA enquanto não viu ninguém, em radianos. Só existe
        // se o editor tiver definido: sem isso o drone volta a girar devagar,
        // que é o comportamento de quem está só patrulhando.
        ...(d.yaw != null ? { yaw: d.yaw } : {}),
        hp: d.hp != null ? d.hp : 2,
        cd: d.cd != null ? d.cd : 1.5,
        phase: d.phase != null ? d.phase : 0,
        home: null, dead: false,
      });
    }
    if (p.crushers) {
      crushers.length = 0;
      for (const c of p.crushers) crushers.push({
        x: c.x, z: c.z,
        hx: c.hx != null ? c.hx : 1.9, hz: c.hz != null ? c.hz : 1.4,
        top: c.top != null ? c.top : H - 0.9, drop: c.drop != null ? c.drop : H - 1.8,
        speed: c.speed != null ? c.speed : 0.65, phase: c.phase != null ? c.phase : 0,
      });
    }
    if (p.beams) {
      beams.length = 0;
      for (const b of p.beams) beams.push({
        z: b.z, y: b.y,
        // 'low' = na altura do peito (agacha) · 'high' = rente ao chão (pula).
        // Os nomes são herdados e enganam; o que vale é o y.
        kind: b.kind || (b.y < 0.9 ? 'high' : 'low'),
        w: b.w != null ? b.w : W,
        phase: b.phase != null ? b.phase : 0,
        speed: b.speed != null ? b.speed : 1.2,
        range: b.range != null ? b.range : 4,
      });
    }

    // MEIAS-PAREDES à mão. Diferente das paredes avulsas, estas SUBSTITUEM as
    // de cobertura geradas — são um punhado por fase e mexer em uma delas é o
    // ajuste fino de onde dá para se proteger do tiro.
    if (p.covers) {
      for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].cover) blocks.splice(i, 1);
      for (const c of p.covers) blocks.push({
        x: c.x, y: c.y, z: c.z, hx: c.hx, hy: c.hy, hz: c.hz,
        kind: 'wall', cover: true,
      });
    }

    // PAREDES à mão são ACRESCENTADAS, não substituem. As paredes geradas
    // incluem as laterais de todo trecho: trocar o conjunto por uma lista fixa
    // abriria o corredor no primeiro ajuste de `len`. Aqui você só soma
    // cobertura nova, e ela é marcada com `hand` para o editor saber quais são
    // suas — as outras pertencem ao trecho.
    if (p.walls) {
      for (const w of p.walls) blocks.push({
        x: w.x, y: w.y, z: w.z,
        hx: w.hx, hy: w.hy, hz: w.hz,
        kind: w.kind || 'wall', hand: true,
      });
    }

    if (p.movers) {
      movers.length = 0;
      for (const m of p.movers) movers.push({
        z: m.z, y: m.y != null ? m.y : 0,
        cx: m.cx != null ? m.cx : 0,      // centro do vaivém, não mais só o meio
        hx: m.hx != null ? m.hx : 1.5, hy: m.hy != null ? m.hy : 0.25, hz: m.hz != null ? m.hz : 1.5,
        ax: m.ax != null ? m.ax : (W - 4) / 2,
        speed: m.speed != null ? m.speed : 0.7, phase: m.phase != null ? m.phase : 0,
      });
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
