// Dados das fases + construtor de geometria.
//
// As fases são descritas como uma SEQUÊNCIA DE TRECHOS, não como uma lista de
// caixas soltas: assim o corredor sempre fecha, nunca sobra buraco de colisão e
// dá pra reequilibrar uma fase mexendo em um número (§9.5 — balanço vive em dado).
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

export const LEVELS = [
  {
    name: 'CORREDOR',
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
    sub: 'Os feixes te apagam. A máscara te faz passar — mas de máscara você não coleta.',
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

  // Altura baixa e fixa: na altura do peito em toda situação — dentro do túnel
  // baixo, sobre plataforma e no meio do pulo. Antes subiam até 2,3 m e podiam
  // nascer DENTRO do bloco do teto baixo, incoletáveis.
  const dropFrags = (n, z0, len) => {
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      frags.push({
        x: (rng() - 0.5) * (W - 3),
        y: 1.0 + rng() * 0.4,
        z: z0 - len * t,
        taken: false,
      });
    }
  };

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
        // vão livre de 1,45 m contra corpo agachado de 1,06 m: folga real (§8) —
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

    if (s.frags) dropFrags(s.frags, z0, len);
    z = z1;
  }

  // fecha o fundo e a entrada
  wall(0, H / 2, z - 0.4, W + 1.6, H, 0.8);
  wall(0, H / 2, 0.4, W + 1.6, H, 0.8);

  // Trava de sanidade (§7.1): se a fase pedir mais pedaços do que existem no
  // mapa, o portão nunca abriria e nenhum teste apontaria o erro.
  if (def.need > frags.length) def = { ...def, need: frags.length };

  return {
    def, blocks, frags, beams, cams, drones, movers, crushers, scanners, decor,
    end: z, gate: { x: 0, y: 1.6, z: z + 2.6 },
    spawn: { x: 0, y: 0.1, z: -2 },
  };
}
