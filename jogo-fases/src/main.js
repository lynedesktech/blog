// O CORREDOR CODIFICADO: motor.
//
// Primeira pessoa, física de caixas (AABB), 5 fases.
// A escolha central é a MÁSCARA BRANCA: com ela o sistema te enxerga (feixes,
// câmeras, drones e paredes-scanner te ignoram) mas você não consegue recolher
// pedaço nenhum do seu próprio rosto. Sem ela você coleta, mas é alvo.
//
// STYLE FORMULA (aprovada, congelada byte a byte para todo asset deste jogo):
// "Afrofuturist neon holography rendered as glowing emissive wireframe and volumetric light,
//  with sharp faceted low-poly geometry and thin luminous contour lines. Environment is deep
//  black-violet void with cyan #00E5FF data-grid structures; interactive face-shards glow warm
//  gold #FFC93C with woven kente-pattern facets so they contrast the cold room; hazards and
//  corrupted masks are marked with hot magenta #FF2D9B glitch static. Weightless
//  cathedral-of-data mood, cool ambient glow, no cast shadows. High contrast between elements
//  and background, clean readable silhouettes, three-quarter isometric view."

import * as THREE from '../vendor/three.module.js';
import { VRButton } from '../vendor/VRButton.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { STR } from './strings.js';
import { LEVELS, buildLevel } from './levels.js';
import * as TEX from './textures.js';
import { Sfx, TRILHAS } from './audio.js';

// ===========================================================================
// MÉTRICAS DE AGÊNCIA: congeladas antes do conteúdo (§5.3).
// Toda medida de fase em levels.js é calibrada por estes números.
// ===========================================================================
const P = {
  STAND_H: 1.78, CROUCH_H: 1.06, EYE_OFF: 0.14,
  RADIUS: 0.36,
  // ANDAR E PULAR. Foi de 5,4 para 6,6 e continuava devagar: num corredor de
  // 70 m, 6,6 m/s ainda é caminhada apressada. 8,2 m/s é corrida de jogo de
  // tiro, e a aceleração subiu junto para o arranque não ficar mole, que é o
  // que faz parecer devagar mesmo quando a velocidade final está alta.
  // O pulo de 9,6 dá 1,91 m de altura. Conferido contra o cenário: a
  // meia-parede da cobertura tem 2,6 m de topo, então nem assim dá para subir
  // nela, e a parede-scanner é barreira de altura cheia.
  SPEED: 8.2, CROUCH_SPEED: 3.4, AIR_CTRL: 0.58,
  ACCEL: 64, FRICTION: 14,
  GRAV: 23, JUMP: 9.6,
  COYOTE: 0.12, JUMP_BUF: 0.16,
  TERM_VEL: -32,

  MASK_MAX: 5.5,         // segundos de máscara
  MASK_REGEN: 1.5,       // recarga por segundo com ela fora
  MASK_COOL: 2.5,        // trava depois de superaquecer

  FRAG_R: 1.15,
  MASK_PICK_R: 2.6,      // pedestal: generoso de proposito, e' item de enredo
  GATE_R: 2.0,

  LIVES: 3, INVULN: 1.3, KNOCK: 6,

  // ALCANCE DO TIRO. Era 26 m num corredor de 70 m, com bruma que deixa
  // enxergar bem mais que isso: o drone aparecia nítido na tela e o tiro
  // simplesmente não chegava, sem nenhum aviso. Lia como arma quebrada, não
  // como limite de alcance. 55 m cobre o que se vê.
  // SHOT_TOL é o PISO da janela de acerto, em radianos. Estava em 0,10 rad —
  // 5,7° em qualquer distância — e o termo que segue o tamanho do alvo ainda
  // inflava isso em 70%. O resultado é que o tiro acertava sem mira: bastava
  // ter o drone em algum canto da tela. 0,025 rad é 1,4°, uma correção de
  // ponteiro, não um cone.
  // ALCANCE. Foi de 26 (curto demais, o tiro não chegava no que se via) para
  // 55, depois 38, e ainda ficava longe demais. O numero que dá sentido a ele
  // é a VISÃO DO DRONE, que é 13 m: com 20 m o jogador tem vantagem real sobre
  // quem ainda não o viu, sem conseguir limpar o corredor inteiro de longe.
  SHOT_CD: 0.20, SHOT_RANGE: 20, SHOT_TOL: 0.025,

  // DRONES. Antes ficavam PARADOS — o motor só somava um seno em y, então
  // eles balançavam no lugar — e atiravam a cada 1,9 s a partir de 15 m. Alvo
  // imóvel, lento e que só reage de perto não é inimigo, é poste com luz.
  // 30 m de visão era exagero: o drone abria fogo de tão longe que o tiro
  // chegava do nada, vindo de um ponto que mal se distingue na bruma.
  DRONE_SIGHT: 13, DRONE_CD: 1.0, DRONE_SHOT: 17, DRONE_HP: 2,
  DRONE_SPEED: 4.2,      // deslize lateral enquanto ataca
  DRONE_STRAFE: 1.5,     // com que rapidez troca de lado
  DRONE_KEEP: 7,         // distância que tenta manter do jogador
  DRONE_PATROL: 2.4,     // vagar em volta de casa quando não viu ninguém
  // Coleira em RAIO, não por eixo. Com 7 m em x e 7 m em z o drone podia ir
  // parar a 10 m de casa pela diagonal, atravessando para o trecho vizinho.
  DRONE_LEASH: 5.5,
  // CHEFE. Todos estes valores podem ser sobrescritos por fase, em
  // `bossCfg` (levels.js), que é o que o editor edita.
  BOSS_HP: 26, BOSS_SWEEP: 5.5, BOSS_OPEN: 3.2,
  // Comprimento do feixe. Mora aqui porque é usado em DOIS lugares — a malha e
  // o teste de dano — e foi justamente a falta desse número no teste que fazia
  // o feixe machucar fora da arena.
  BOSS_BEAM: 26,
  BOSS_SALVO: 3.4,        // duração da rajada de bolas
  BOSS_BALL_CD: 0.5,      // intervalo entre bolas
  BOSS_BALL_SPD: 13,      // velocidade da bola
  BOSS_BALL_R: 0.85,      // raio de acerto da bola (maior que o tiro de drone)
  BOSS_MOVE: 0.85,        // rapidez do voo em volta da arena
  BOSS_ORBIT: 7.5,        // raio da órbita
  BOSS_SPAWN: 2,          // drones invocados por ciclo
  BOSS_SPAWN_MAX: 6,      // teto de drones vivos que ele mantém em pé

  // GIRO EM VR. O passo era de 30° e só valia UM por toque: para virar 180°
  // eram seis toques, soltando o analógico entre cada um. É isso que dava a
  // sensação de câmera travada. Agora o passo é de 45° e, segurando, ele
  // repete a cada 0,26 s, que é o comportamento normal de VR.
  // 2,4 rad/s = 137 graus por segundo com o analogico encostado. Estava em
  // 3,0, que da 172, e ficou exagerado: a cabeca chegava antes do olho. Este
  // numero manda no giro do analogico no VR, no do controle no totem e nas
  // setas do teclado, entao os tres desaceleram junto.
  TURN_SPEED: 2.4, SNAP_TURN: Math.PI / 4,
  SNAP_REPETE: 0.26,     // segundos entre passos com o analógico segurado
  SNAP_PISCA: 0.09,      // escurecida curta no passo, contra o enjoo
  VR_CROUCH_Y: 1.25,     // reserva, so ate a calibracao medir a pessoa
  VR_OLHO: 1.64,         // altura de olho para a qual o mundo foi desenhado
};

const COL = {
  floor: 0x140a2a, wall: 0x0f0722, ceil: 0x1a0f33,
  wire: 0x00E5FF, gold: 0xFFC93C, mag: 0xFF2D9B, bone: 0xF3EFE6,
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Assets pesados servidos do CDN (imutável, com CORS aberto): o deploy do
// site leva só código; localmente funciona igual, desde que haja internet.
const CDN = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3HBsC4pkD2oWljt5W8Aky7ZDxwD/';
const ASSETS = {
  wall: CDN + 'b0e8c0f8-065e-4073-b662-299921b70594.jpg',
  floor: CDN + 'b2921ab3-5b4b-44aa-b7ae-3c7287a022ba.jpg',
  panel: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/7a3f8125-6930-4a32-86ae-490c5008460c.jpg',
  sky: CDN + '796ad1bc-e6e1-4606-a9c6-804dd53c2ac0.jpg',
  ayaVid: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_212107_31ec2646-f050-4da4-baec-602f160a2cf4.mp4',
  door: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/887ac478-615a-404d-9ef8-258ebfe39f84.jpg',
  // AYA nova: personagem fictícia, na paleta do jogo (vácuo preto-violeta,
  // luz ciano de um lado, contraluz dourado do outro). A anterior não
  // conversava com o resto da cena.
  aya: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_204404_58318017-1aec-4b39-8c99-94a4344ea1c8.png',

  // Chefe e drone, na STYLE FORMULA congelada lá em cima. Gerados em FUNDO
  // PRETO de propósito: os dois entram como sprite em AdditiveBlending, que
  // soma luz em vez de tapar, então o preto simplesmente não aparece. Sai mais
  // barato que pedir recorte com alfa e casa com o resto da cena, que é toda
  // emissiva.
  boss: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/c94cd638-f6e1-4048-bb4f-f9ad8e1ee42b.png',
  drone: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/2dc2e84f-fa66-47ab-8789-cd069e8c7543.png',
};

// MALHAS 3D (GLB). Chefe e drone eram sprites: um retângulo que sempre encara
// a câmera. De perto, ou olhando de lado, o truque aparece — era o "modo
// quadrado". Estes são modelos de verdade, com volume, feitos a partir das
// mesmas imagens.
//
// TAMANHO em METROS, não fator de escala. O gerador não promete escala
// nenhuma: a primeira versão multiplicava por um número chutado e a arma saiu
// ocupando meia tela. Aqui se diz quanto a peça DEVE medir na sua maior
// dimensão, e o código mede a malha e calcula o resto. Também recentra na
// origem, senão o modelo gira em torno de um ponto qualquer.
//
// `rot` é o único ajuste manual que sobra: para que lado a peça aponta.
const MODELS = {
  boss:  {
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260813_174215_a3ea12e3-69d1-496e-8b70-dfa1c6dc046f.glb',
    tam: 5.5,
    // SEM giro: a lente do olho já nasce em +Z, que é o eixo que o `lookAt`
    // aponta ao alvo (ver a nota de convenção no drone, abaixo).
    //
    // Aqui esteve π/2 por um tempo, herdado do drone "por analogia". Era o
    // erro clássico de copiar a conclusão sem copiar a medição: o valor do
    // drone estava certo, a EXPLICAÇÃO dele é que estava errada, e foi a
    // explicação que eu propaguei. Resultado: o chefe encarava de perfil.
    // Medido renderizando os quatro ângulos — só em 0 aparece a íris com
    // pupila. Em π há um bocal magenta pequeno que engana à primeira vista,
    // mas é a traseira.
    rot: [0, 0, 0],
  },
  drone: {
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260813_174221_6812cc27-dc9c-43ec-b14a-95b8f2629fd2.glb',
    tam: 1.3,
    // CONVENÇÃO DO `lookAt` (vale para o chefe também, e é contraintuitiva):
    // em `Object3D.lookAt` o three inverte os argumentos quando o objeto NÃO é
    // câmera nem luz — veja `vendor/three.module.js`, no corpo de lookAt. O
    // efeito é que quem passa a apontar para o alvo é o **+Z** do objeto, não
    // o −Z. Câmera olha para −Z; malha comum encara com +Z.
    //
    // Então o giro aqui existe para levar a frente da malha até +Z. O valor foi
    // MEDIDO: o modelo foi renderizado nos quatro ângulos, visto de uma câmera
    // na posição do jogador, e só em π/2 aparece a lente magenta redonda. Em
    // 3π/2 a silhueta também fica simétrica, mas é a traseira — sem lente.
    rot: [0, Math.PI / 2, 0],
  },
  // MÃO SEGURANDO A ARMA, peça única. Antes era só a pistola flutuando: sem
  // mão, não há ninguém empunhando — e encaixar mão e arma como dois modelos
  // separados nunca fecha o dedo no gatilho. Um viewmodel de FPS é assim
  // mesmo, um objeto só.
  //
  // A mão é de uma mulher negra, de luva: é ela que está sendo auditada no
  // corredor, e é o rosto dela que o sistema se recusa a reconhecer.
  weapon: {
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260813_175504_c77cbc2a-7f66-414d-98be-f368fa4d49e6.glb',
    // DUAS rotações, e a separação entre elas é o ponto.
    //
    // `rot` age DENTRO, antes de tudo: é o que põe a peça de pé, tirando-a da
    // pose em que o gerador a entregou (X −90° derruba o cano de "para cima"
    // para "para a frente").
    //
    // `ajuste` age POR FORA, já no espaço da câmera — e é só aí que os eixos
    // querem dizer o que o nome promete: Y vira para a esquerda/direita, X
    // levanta/abaixa o cano, Z rola a arma. Mexer no Z de dentro, como tentei
    // antes, acontece ANTES do tombo em X e mistura os três: foi por isso que
    // −30° apontou para a esquerda, −120° apontou para a direita, e não havia
    // meio-termo previsível entre os dois.
    //
    // O `ajuste` abaixo NÃO foi deduzido: foi medido na tela, com o afinador
    // do ?dev, até a arma ficar no lugar. Minhas três tentativas de calcular
    // erraram porque eu supunha a pose em que o gerador entrega a malha — e
    // isso não está documentado em lugar nenhum. Números empíricos, e é isso
    // mesmo: quem manda aqui é o que se vê.
    tam: 0.58,
    rot: [-Math.PI / 2, 0, -Math.PI / 6],
    ajuste: [4.10, 2.93, -1.60],
    boca: [-0.02, 0.02, -0.32],
  },
};

// Atalho de teste: ?dronerot=1.57 gira o drone em Y sem editar arquivo. Existe
// porque descobrir "para que lado esta malha nasce virada" só dá para fazer
// vendo a tela — e quem vê a tela é quem está jogando, não quem escreve isto.
// Valores úteis: 0 · 1.57 (¼ de volta) · 3.14 (meia) · 4.71 (¾).
{
  const _p = new URLSearchParams(location.search);
  if (_p.has('dronerot')) {
    const g = parseFloat(_p.get('dronerot'));
    if (Number.isFinite(g)) MODELS.drone.rot = [0, g, 0];
  }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _e1 = new THREE.Euler();

// ===========================================================================
export class Game {
  constructor(host) {
    this.host = host;
    this.sfx = new Sfx();
    // GIRO EM PASSOS desligado por padrao. Ele existe por conforto, e por isso
    // era o padrao, mas saltar de 45 em 45 graus le como camera travada. O
    // giro suave e o padrao agora, com a vinheta fechando enquanto se gira
    // para compensar; quem enjoar liga os passos no menu.
    // giroCabeca: virar o rosto leva o corpo junto, como o analógico. Fica
    // ligado porque é o que faz os dois modos de virar serem um só; quem
    // preferir o pescoço solto desliga no menu.
    this.opts = { shake: true, flash: true, bigText: false, sound: true, snapTurn: false, giroCabeca: true };
    this.onEnd = null; this.onObjective = null; this.onPhase = null;
    this.mode = 'idle';
    this.level = null;
    this._buildRenderer();
    this._buildScene();
    this._buildInput();
    this.pl = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: false, h: P.STAND_H };
    this.s = null;
    this.renderer.setAnimationLoop(this._frame.bind(this));
  }

  // ------------------------------------------------------------- renderer
  _buildRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setSize(window.innerWidth, window.innerHeight);
    r.xr.enabled = true;
    r.xr.setReferenceSpaceType('local-floor');
    r.setClearColor(0x05020c, 1);
    this.host.appendChild(r.domElement);
    this.renderer = r;

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 160);
    this.camera.rotation.order = 'YXZ';

    addEventListener('resize', () => this._resize());
    addEventListener('orientationchange', () => setTimeout(() => this._resize(), 250));
  }

  _resize() {
    const asp = window.innerWidth / window.innerHeight;
    this.camera.aspect = asp;
    // O 75 da PerspectiveCamera e o campo de visao VERTICAL. Num celular em
    // pe o aspect fica em torno de 0,46, e ai o campo HORIZONTAL desabava para
    // uns 39 graus: o corredor sumia dos lados e o chao tomava a tela inteira.
    // Aqui o alvo passa a ser o campo horizontal, com o vertical calculado a
    // partir dele e limitado para nao distorcer.
    const H_ALVO = 88 * Math.PI / 180;
    const vert = 2 * Math.atan(Math.tan(H_ALVO / 2) / asp) * 180 / Math.PI;
    this.camera.fov = Math.max(68, Math.min(78, vert));
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  vrButton() { return VRButton.createButton(this.renderer); }

  // ------------------------------------------------------------- cena base
  _buildScene() {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x05020c);
    s.fog = new THREE.FogExp2(0x07030f, 0.030);
    this.scene = s;

    this.rig = new THREE.Group();
    s.add(this.rig);
    this.rig.add(this.camera);

    this.tex = {
      grid: TEX.floorGridTexture(),
      mask: TEX.maskGlyphTexture(),
      maskClean: TEX.maskGlyphTexture(true),
      dust: TEX.dotTexture('0,229,255'),
      maskView: TEX.maskViewTexture(),
      faceSlot: TEX.faceSlotTexture(),
      beam: TEX.beamTexture(),
      ring: TEX.ringTexture('0,229,255'),
      ringM: TEX.ringTexture('255,45,155'),
      ringG: TEX.ringTexture('255,201,60'),
      face: TEX.faceGlyphTexture('#FFC93C', true, true),
    };

    // Sprites do chefe e do drone, gerados na STYLE FORMULA do jogo.
    const spr = (url) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    this.tex.bossImg = spr(ASSETS.boss);
    this.tex.droneImg = spr(ASSETS.drone);
    // O drone não saiu no centro do quadro. Em vez de gastar outra geração,
    // recorto por UV a região onde ele está: repeat encolhe a janela, offset
    // a desloca (o eixo v conta de baixo para cima, daí a subtração).
    this.tex.droneImg.repeat.set(0.54, 0.54);
    this.tex.droneImg.offset.set(0.24, 0.34);

    this._carregaModelos();

    // Texturas geradas por IA (costuradas pelo pipeline de tiling).
    // Cada placa de superfície mostra o tile UMA vez, então repeat fica em 1 e
    // a emenda só aparece entre placas vizinhas, que é onde ela é invisível.
    const load = (url) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    };
    this.surf = {
      wall: load(ASSETS.wall),
      floor: load(ASSETS.floor),
      panel: load(ASSETS.panel),
      door: load(ASSETS.door),
    };
    this._buildSky();

    this.amb = new THREE.AmbientLight(0x5566ff, 0.75);   // por fase, sobrescrito por pal.ambI
    s.add(this.amb);
    // Alcance de 34 m com decaimento 1,6 deixava tudo além de uns 12 m no
    // breu. Mais forte, mais longe e com queda mais lenta: a sala inteira
    // aparece, não só o pedaço embaixo do pé.
    const key = new THREE.PointLight(0x00e5ff, 2.8, 44, 1.3);
    key.position.set(0, 4, 0);
    this.rig.add(key);                 // luz acompanha o jogador
    this.playerLight = key;

    // grupo que guarda TUDO que pertence à fase atual (some no rebuild)
    this.levelRoot = new THREE.Group();
    s.add(this.levelRoot);

    this._buildHud();
    this._buildOverlays();
    this._buildDust();
  }

  _buildDust() {
    const N = 900;
    const pos = new Float32Array(N * 3);
    const rng = mulberry32(31337);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rng() - 0.5) * 26;
      pos[i * 3 + 1] = rng() * 8;
      pos[i * 3 + 2] = -rng() * 220;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.07, map: this.tex.dust, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.scene.add(this.dust);
  }

  // Fundo do vazio: cilindro grande virado para dentro que acompanha o jogador.
  // Sem fog, com opacidade baixa, para ler como brilho distante e não como parede.
  _buildSky() {
    const t = new THREE.TextureLoader().load(ASSETS.sky);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(6, 1);
    // discreto de propósito: com opacidade alta as silhuetas do panorama viravam
    // "montanhas" chapadas que liam como geometria quebrada
    this.sky = new THREE.Mesh(
      new THREE.CylinderGeometry(70, 70, 60, 28, 1, true),
      new THREE.MeshBasicMaterial({
        map: t, side: THREE.BackSide, transparent: true, opacity: 0.28,
        color: 0x777d99, depthWrite: false, fog: false,
      })
    );
    this.sky.position.y = 14;
    this.scene.add(this.sky);
  }

  // Horizonte por fase. MirroredRepeatWrapping em vez de RepeatWrapping: o
  // espelhamento faz qualquer imagem casar consigo mesma na volta do cilindro,
  // então não existe a emenda vertical que denunciava a repetição. E repeat 3
  // em vez de 6 deixa o panorama em escala maior, menos "papel de parede".
  _trocaHorizonte(url) {
    if (!url || !this.sky) return;
    this._ceus = this._ceus || {};
    const aplica = (t) => {
      if (!this.sky) return;
      this.sky.material.map = t;
      this.sky.material.needsUpdate = true;
    };
    if (this._ceus[url]) { aplica(this._ceus[url]); return; }
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.MirroredRepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(3, 1);
      this._ceus[url] = t;
      aplica(t);
    });
  }

  // AYA falando. O retrato parado dizia "tem alguém aqui"; a boca mexendo diz
  // "essa pessoa está falando COM você". O vídeo entra como VideoTexture no
  // mesmo plano; se falhar, fica o retrato que já estava lá.
  _ayaFalante() {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';   // preciso, senão a textura contamina o canvas
    v.playsInline = true;
    v.muted = true;
    v.loop = false;                // a primeira passada tem voz; depois só a boca
    v.preload = 'auto';
    v.src = ASSETS.ayaVid;
    v.addEventListener('canplay', () => {
      const t = new THREE.VideoTexture(v);
      t.colorSpace = THREE.SRGBColorSpace;
      this.ayaMat.map = t;
      this.ayaMat.needsUpdate = true;
    }, { once: true });
    // terminou a fala: volta a rodar em silêncio, para ela não repetir a frase
    // em loop eterno enquanto você joga
    v.addEventListener('ended', () => {
      v.muted = true;
      v.loop = true;
      v.play().catch(() => {});
    });
    this.ayaVideo = v;
  }

  _panel(w, h, cw, ch, order) {
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })
    );
    mesh.renderOrder = order;
    this.scene.add(mesh);
    return { canvas, tex, mesh, g: canvas.getContext('2d') };
  }

  _buildHud() {
    this.hud = this._panel(1.9, 0.40, 1280, 270, 998);
    // A LEGENDA É PARA SER LIDA DENTRO DO ÓCULOS.
    //
    // Ela era um painel de 2,0 por 0,34 m a QUATRO metros. Isso dá uma letra
    // de 0,45 grau de altura no olho, e 0,45 grau em tela de óculos é meia
    // dúzia de pixels: fica ilegível, e não por falta de resolução da textura,
    // mas por falta de tamanho angular. Agora o painel é mais alto, a letra é
    // maior nele, e ele vive a 2,6 m (ver `_vis`), o que dá 1,2 grau de altura
    // de letra, quase o triplo.
    this.sub = this._panel(1.9, 0.52, 1280, 350, 999);
    this.sub.mesh.material.opacity = 0;
    this.banner = this._panel(2.2, 0.52, 1360, 320, 1000);
    // relogio de pulso (VR): o MESMO canvas do HUD, preso ao controle
    // esquerdo. Levantou o braco, viu tempo, rostos, vidas e mascara.
    this.wrist = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.063),
      new THREE.MeshBasicMaterial({ map: this.hud.tex, transparent: true, depthWrite: false, depthTest: false })
    );
    this.wrist.renderOrder = 1002;
    this.wrist.position.set(0, 0.05, 0.10);
    this.wrist.rotation.x = -0.95;
    this.wrist.visible = false;
    this.banner.mesh.visible = false;

    // AYA: personagem-guia (imagem gerada no Higgsfield). Mesclagem aditiva:
    // o fundo preto do retrato some sozinho e ela lê como holograma no ar.
    this.ayaMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    new THREE.TextureLoader().load(ASSETS.aya,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; this.ayaMat.map = t; this.ayaMat.needsUpdate = true; });
    this._ayaFalante();
    this.ayaGroup = new THREE.Group();
    this.ayaGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), this.ayaMat));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.ringG, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4,
    }));
    halo.scale.set(3.1, 3.1, 1);
    halo.position.y = -0.1;
    this.ayaGroup.add(halo);
    this.scene.add(this.ayaGroup);
  }

  _buildOverlays() {
    // vinheta de dano
    this.hurt = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 3),
      new THREE.MeshBasicMaterial({
        color: COL.mag, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.hurt.position.set(0, 0, -0.9);
    this.hurt.renderOrder = 1010;
    this.camera.add(this.hurt);

    // máscara vestida: overlay em primeira pessoa
    // Era a arte INTEIRA da máscara a 0,82 de opacidade tapando a tela. Agora
    // é só a borda, com abertura limpa no meio: dá pra jogar de máscara.
    this.maskView = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.95),
      new THREE.MeshBasicMaterial({
        map: this.tex.maskView, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
      })
    );
    this.maskView.position.set(0, 0, -0.62);
    this.maskView.renderOrder = 1009;
    this.camera.add(this.maskView);

    // mira
    this.reticle = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.ring, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 0.55,
    }));
    this.reticle.scale.set(0.012, 0.012, 1);
    this.reticle.position.set(0, 0, -0.6);
    this.reticle.renderOrder = 1008;
    this.camera.add(this.reticle);

    // TIRO. Era um plano de 6 cm aceso por 0,07 s — quatro quadros a 60 fps,
    // num traço fino de menos de um pixel a 20 m. Na prática o jogador
    // atirava e não via nada sair. Agora é quase três vezes mais grosso e
    // dura o dobro, apagando aos poucos em vez de sumir de uma vez.
    // PROJÉTIL, não risco.
    //
    // O tiro era um retângulo esticado da arma até o alvo, e isso não tem
    // largura certa: um quad em espaço de mundo fica gordo colado no olho e
    // vira sub-pixel a 20 m. Por isso 30 cm leu como feixe de laser e 9 cm
    // leu como fiapo — os dois estavam certos numa ponta e errados na outra.
    //
    // Agora é uma bala: um ponto luminoso de tamanho fixo que VIAJA da boca do
    // cano até onde o tiro parou. O acerto continua instantâneo — quem viaja é
    // só o desenho, e ele mostra a distância em vez de esticar sobre ela.
    this.shotBala = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.ring, color: 0x00E5FF, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.shotBala.scale.set(0.22, 0.22, 1);
    this.shotBala.visible = false;
    this.scene.add(this.shotBala);

    // Clarão no ponto de impacto. Sem ele não havia como saber se o tiro
    // acertou: o drone só reagia quando morria, no segundo acerto.
    this.shotFlash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.ringM, color: 0x00E5FF, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    this.shotFlash.scale.set(1.6, 1.6, 1);
    this.shotFlash.visible = false;
    this.scene.add(this.shotFlash);

    // ARMA NA MÃO. Não existia nenhuma: o jogador atirava com as mãos vazias e
    // o tiro saía do nada, do meio da tela. Ter um objeto de onde o disparo
    // parte é o que faz o tiro ter origem — e é o que avisa, sem texto, que
    // você está armado.
    this.weapon = this._makeWeapon(true);
    this.camera.add(this.weapon);
    this.weaponKick = 0;
  }

  // ------------------------------------------------------------- construir fase
  _clearLevel() {
    this.levelRoot.traverse((o) => {
      if (o.geometry && o.geometry !== this.boxGeo) o.geometry.dispose?.();
    });
    while (this.levelRoot.children.length) this.levelRoot.remove(this.levelRoot.children[0]);
  }

  _instanced(list, mat, wireMat) {
    if (!list.length) return;
    if (!this.boxGeo) this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const solid = new THREE.InstancedMesh(this.boxGeo, mat, list.length);
    const wire = new THREE.InstancedMesh(this.boxGeo, wireMat, list.length);
    list.forEach((b, i) => {
      _m1.compose(
        _v1.set(b.x, b.y, b.z),
        _q1.identity(),
        _v2.set(b.hx * 2, b.hy * 2, b.hz * 2)
      );
      solid.setMatrixAt(i, _m1);
      _m1.compose(_v1, _q1, _v2.set(b.hx * 2.005, b.hy * 2.005, b.hz * 2.005));
      wire.setMatrixAt(i, _m1);
    });
    solid.instanceMatrix.needsUpdate = true;
    wire.instanceMatrix.needsUpdate = true;
    this.levelRoot.add(solid, wire);
  }

  // Placas de superfície texturizadas.
  // A COLISÃO continua nas caixas grandes de levels.js; aqui só se decide o que
  // o jogador vê. Sem isso, uma laje de 26 m mostraria a textura esticada uma
  // única vez. Tudo sai em InstancedMesh, então centenas de placas = 1 draw call.
  // Textura de superfície da fase atual. Cai na antiga se a fase não declarar
  // uma, e guarda em cache para não rebaixar a mesma imagem a cada troca.
  // As imagens de parede e piso saíram quase pretas do gerador: medido dentro
  // da cena, o piso tem brilho médio 6,7 de 255 e a parede 15,6. O tint do
  // material é uma MULTIPLICAÇÃO, então só sabe escurecer: não existe valor
  // de tint que salve uma textura preta. E as superfícies são
  // MeshBasicMaterial, que não recebe luz nenhuma. Por isso mexer em
  // AmbientLight não clareava as salas. O brilho é aplicado no pixel, uma
  // única vez, na hora de carregar.
  _texFase(url, reserva, ganho = 1) {
    if (!url) return reserva;
    this._texCache = this._texCache || {};
    const chave = url + '|' + ganho;
    if (!this._texCache[chave]) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 512;
      const g2 = cv.getContext('2d');
      g2.fillStyle = '#20232e';        // enquanto a imagem não chega
      g2.fillRect(0, 0, 512, 512);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        g2.drawImage(img, 0, 0, 512, 512);
        try {
          if (ganho <= 1) { t.needsUpdate = true; return; }
          const d = g2.getImageData(0, 0, 512, 512);
          const px = d.data;
          // ganho com joelho: multiplica, mas comprime perto do topo, para a
          // textura clarear sem virar um chapado branco sem desenho
          for (let i = 0; i < px.length; i += 4) {
            for (let k = 0; k < 3; k++) {
              const v = (px[i + k] / 255) * ganho;
              px[i + k] = Math.round(255 * (v / (1 + v * 0.55)));
            }
          }
          g2.putImageData(d, 0, 0);
        } catch (e) {
          // canvas sujo por CORS: fica a imagem crua, escura mas válida
        }
        t.needsUpdate = true;
      };
      img.src = url;
      this._texCache[chave] = t;
    }
    return this._texCache[chave];
  }

  _surfaces(blocks, tex, pick, tile = 4.2, tint = 0xffffff) {
    if (!this.planeGeo) this.planeGeo = new THREE.PlaneGeometry(1, 1);
    const inst = [];
    for (const b of blocks) {
      const f = pick(b);
      if (!f) continue;
      const [au, av, uLen, vLen, pos, rot] = f;
      const nu = Math.max(1, Math.round(uLen / tile));
      const nv = Math.max(1, Math.round(vLen / tile));
      const su = uLen / nu, sv = vLen / nv;
      for (let iu = 0; iu < nu; iu++) {
        for (let iv = 0; iv < nv; iv++) {
          const ou = -uLen / 2 + su * (iu + 0.5);
          const ov = -vLen / 2 + sv * (iv + 0.5);
          const p = pos.clone();
          p[au] += ou; p[av] += ov;
          inst.push({ p, rot, su, sv });
        }
      }
    }
    if (!inst.length) return;
    const mesh = new THREE.InstancedMesh(
      this.planeGeo,
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, color: tint }),
      inst.length
    );
    inst.forEach((o, k) => {
      _e1.set(o.rot.x, o.rot.y, 0, 'YXZ');
      _q1.setFromEuler(_e1);
      // Cada placa mostra a MESMA imagem, carimbada a cada 4,2 m corredor
      // afora: era isso que lia como "a mesma sala repetida", não a emenda
      // do tiling. Espelhar a placa em u e/ou v pela posição dá 4 orientações
      // da mesma textura e quebra o padrão, de graça: nenhuma imagem nova,
      // nenhum draw call a mais, ainda um InstancedMesh só.
      const h = Math.abs(Math.round(o.p.x * 7.3 + o.p.y * 3.1 + o.p.z * 11.7));
      const fu = (h & 1) ? -1 : 1;
      const fv = (h & 2) ? -1 : 1;
      _m1.compose(o.p, _q1, _v2.set(o.su * fu, o.sv * fv, 1));
      mesh.setMatrixAt(k, _m1);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.levelRoot.add(mesh);
  }

  _buildSurfaces(lv) {
    const E = 0.02;   // desloca a placa para fora da caixa, evita z-fighting

    // Chão, parede e teto são MeshBasicMaterial, ou seja, material SEM
    // iluminação: AmbientLight e a luz que acompanha o jogador não encostam
    // neles (só a porta de ferro, que é Lambert). Quem decide o brilho das
    // salas é este tint aqui e a densidade da bruma, e mais nada.
    // O cenário continua sendo fundo: os feixes são aditivos e os coletáveis
    // têm halo, então seguem brilhando mais que a parede. Mas estava escuro
    // demais para ler o corredor, principalmente em tela de celular.
    // pisos: face de cima
    const pal = lv.def.pal || {};
    this._surfaces(lv.blocks, this._texFase(pal.floorImg, this.surf.floor), (b) => {
      if (b.kind !== 'floor') return null;
      return ['x', 'z', b.hx * 2, b.hz * 2,
        new THREE.Vector3(b.x, b.y + b.hy + E, b.z), { x: -Math.PI / 2, y: 0 }];
    }, 2.6, 0x5f6675);

    // paredes: a face virada para dentro do corredor
    this._surfaces(lv.blocks, this._texFase(pal.wallImg, this.surf.wall), (b) => {
      if (b.kind !== 'wall') return null;
      if (b.hx < b.hz) {           // parede fina em X -> encara o eixo X
        const s = b.x > 0 ? -1 : 1;
        return ['z', 'y', b.hz * 2, b.hy * 2,
          new THREE.Vector3(b.x + s * (b.hx + E), b.y, b.z),
          { x: 0, y: s > 0 ? Math.PI / 2 : -Math.PI / 2 }];
      }
      const s = b.z > 0 ? -1 : 1;  // parede fina em Z -> encara o eixo Z
      return ['x', 'y', b.hx * 2, b.hy * 2,
        new THREE.Vector3(b.x, b.y, b.z + s * (b.hz + E)),
        { x: 0, y: s > 0 ? 0 : Math.PI }];
    }, 4.2, 0x7c8494);

    // tetos baixos e pilares: face de baixo, com a textura de painel/aviso
    this._surfaces(lv.blocks, this.surf.panel, (b) => {
      if (b.kind !== 'ceil' && b.kind !== 'pillar') return null;
      return ['x', 'z', b.hx * 2, b.hz * 2,
        new THREE.Vector3(b.x, b.y - b.hy - E, b.z), { x: Math.PI / 2, y: 0 }];
    }, 3.0, 0xccd2e2);

    // TETO GERAL: fecha o corredor por cima, sem ele, o vazio aparecia acima
    // das paredes como buracos e formas soltas
    const H = lv.def.h;
    const tops = lv.decor.filter((d) => !d.edge)
      .map((d) => ({ x: d.x, y: 0, z: d.z, hx: d.w / 2 + 0.8, hy: 0, hz: d.d / 2, kind: 'top' }));
    this._surfaces(tops, this.surf.panel, (b) => (
      ['x', 'z', b.hx * 2, b.hz * 2,
        new THREE.Vector3(b.x, H - E, b.z), { x: Math.PI / 2, y: 0 }]
    ), 3.4, 0x3d4252);
  }

  loadPhase(i) {
    // fase nova: solta dedo e mouse, mas NÃO o teclado (ver _releaseTouch)
    this._releaseTouch();
    this._clearLevel();
    const def = LEVELS[i];
    const lv = buildLevel(def, mulberry32(1000 + i * 77));
    this.level = lv;

    // --- geometria em instâncias: o corredor inteiro sai em poucos draw calls
    const byKind = { floor: [], wall: [], other: [] };
    for (const b of lv.blocks) (byKind[b.kind] || byKind.other).push(b);
    const mk = (c) => new THREE.MeshBasicMaterial({ color: c });
    const wk = (c, o) => new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o });
    this._instanced(byKind.floor, mk(COL.floor), wk(COL.wire, 0.30));
    this._instanced(byKind.wall, mk(COL.wall), wk(COL.wire, 0.18));
    this._instanced(byKind.other, mk(COL.ceil), wk(COL.gold, 0.28));
    this._buildSurfaces(lv);

    // --- feixes
    // Feixes. Antes eram tres cilindros opacos empilhados e um retangulo chapado
    // no chao: lia como cano de plastico rosa, nao como luz. Agora e' luz de
    // verdade: tudo em AdditiveBlending, que soma com o que esta atras em vez
    // de tapar, com nucleo quente, duas camadas de brilho, poca de luz radial no
    // chao e emissores nas duas paredes.
    // O feixe NÃO usa o accent da fase. Usava, e dava colisão de cor: na
    // fase 3 o accent é ciano, igual às paredes e às fitas de luz dela, e o
    // feixe sumia; nas fases 4 e 5 o accent é dourado, a mesma cor dos
    // pedaços do rosto e do halo da máscara, ou seja, o que MATA tinha a cor
    // do que se COLETA. Perigo tem uma cor só no jogo inteiro, e é o magenta.
    const cor = COL.mag;
    this.beamMeshes = lv.beams.map((b) => {
      const g = new THREE.Group();
      g.position.set(0, b.y, b.z);

      // Quatro camadas aditivas com fog DESLIGADO lavavam a tela: aditivo soma
      // brilho, e sem fog um feixe a 40 m rendia igual a um a 2 m. Agora são
      // três, mais fracas, e só o filamento ignora a bruma.
      const tubo = (r, c, op, semFog) => {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r, def.w, 10, 1, true),
          new THREE.MeshBasicMaterial({
            color: c, transparent: true, opacity: op, depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide, fog: !semFog,
          })
        );
        m.rotation.z = Math.PI / 2;
        return m;
      };

      const core = tubo(0.032, 0xffffff, 0.95, true);  // filamento branco
      const mid = tubo(0.115, cor, 0.72, false);       // corpo do feixe
      const halo = tubo(0.34, cor, 0.17, false);       // brilho que sangra
      const bloom = halo;                              // sem camada extra
      g.add(halo, mid, core);

      // RISCO NO CHÃO, embaixo do feixe e andando junto com ele. O corpo do
      // feixe ocupa cerca de 1% da tela, medido: um fio a 20 m de distância
      // dentro da bruma. O chão ocupa metade da tela. Então quem avisa onde
      // a linha que mata está AGORA é o chão, não o fio.
      const risco = new THREE.Mesh(
        new THREE.PlaneGeometry(def.w, 1.1),
        new THREE.MeshBasicMaterial({
          map: this.tex.dust, color: cor, transparent: true, opacity: 0.60,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
        })
      );
      risco.rotation.x = -Math.PI / 2;
      risco.position.y = -b.y + 0.05;   // o grupo está na altura do feixe
      g.add(risco);

      // poça de luz no chão: radial, não um retângulo de borda dura
      const poca = new THREE.Mesh(
        new THREE.PlaneGeometry(def.w, b.range * 2 + 3.0),
        new THREE.MeshBasicMaterial({
          map: this.tex.dust, color: cor, transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
        })
      );
      poca.rotation.x = -Math.PI / 2;
      poca.position.set(0, 0.03, b.z);
      this.levelRoot.add(poca);

      // emissores: dizem de onde a luz sai, e dão escala ao corredor
      for (const lado of [-1, 1]) {
        const em = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.22, 0.30, 8),
          new THREE.MeshBasicMaterial({ color: cor, fog: false })
        );
        em.rotation.z = Math.PI / 2;
        em.position.x = lado * (def.w / 2 + 0.05);
        g.add(em);
      }

      g.userData = { core, mid, halo, bloom, poca, risco, fase: Math.random() * 6.28 };
      this.levelRoot.add(g);
      return g;
    });

    // --- paredes-scanner (com placa dizendo o que ela é)
    this.scanMeshes = lv.scanners.map((sc) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(sc.w, sc.h),
        new THREE.MeshBasicMaterial({ color: COL.mag, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      m.position.set(0, sc.h / 2, sc.z);
      this.levelRoot.add(m);
      // UM rótulo só. Eram dois, a 6 cm de cada lado da parede, na intenção de
      // "ler dos dois lados" — mas Sprite SEMPRE vira para a câmera, então os
      // dois apareciam juntos, 12 cm afastados, e o texto lia fantasmado.
      const lb = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._label('SCANNER · SÓ PASSA DE MÁSCARA', '#FF2D9B', 34), transparent: true, depthWrite: false,
      }));
      lb.scale.set(4.6, 1.15, 1);
      lb.position.set(0, sc.h - 1.1, sc.z);
      this.levelRoot.add(lb);
      return m;
    });

    // --- câmeras
    this.camMeshes = lv.cams.map((c) => {
      const g = new THREE.Group();
      g.position.set(c.x, c.y, c.z);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.35, 0.6),
        new THREE.MeshBasicMaterial({ color: 0x2a2050, wireframe: true })
      );
      g.add(body);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(c.range * Math.tan(c.cone), c.range, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: COL.mag, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
      );
      cone.rotation.z = Math.PI / 2;
      cone.position.x = -c.range / 2;
      g.add(cone);
      g.userData.cone = cone;
      this.levelRoot.add(g);
      return g;
    });

    // --- drones
    // A malha saiu daqui para um método próprio porque o chefe INVOCA drones
    // durante a luta: antes a lista de malhas era criada uma vez, do tamanho
    // da lista de drones, e quem nascesse depois ficava invisível.
    this.droneMeshes = lv.drones.map(() => this._makeDroneMesh());

    // --- plataformas móveis e prensas
    this.moverMeshes = lv.movers.map((m) => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(m.hx * 2, m.hy * 2, m.hz * 2),
        new THREE.MeshBasicMaterial({ color: COL.gold, transparent: true, opacity: 0.75 })
      );
      this.levelRoot.add(box);
      return box;
    });
    this.crushMeshes = lv.crushers.map((c) => {
      // preenchimento sólido + wireframe: só wireframe sumia contra a parede
      const g = new THREE.Group();
      const geo = new THREE.BoxGeometry(c.hx * 2, 1.6, c.hz * 2);
      g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COL.mag, transparent: true, opacity: 0.35 })));
      g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.6 })));
      this.levelRoot.add(g);
      return g;
    });

    // --- pedaços de rosto
    this.fragMeshes = lv.frags.map((f) => {
      const g = new THREE.Group();
      g.position.set(f.x, f.y, f.z);
      const body = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.26, 0),
        new THREE.MeshBasicMaterial({ color: COL.gold, wireframe: true })
      );
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.face, transparent: true, depthWrite: false,
      }));
      spr.scale.set(0.55, 0.55, 1);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.ringG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
      }));
      halo.scale.set(1.5, 1.5, 1);
      g.add(body, spr, halo);
      g.userData.body = body;
      this.levelRoot.add(g);
      return g;
    });

    // --- A MÁSCARA BRANCA. Uma por fase, largada no corredor: você acha,
    // encosta, e o poder de atravessar os feixes é seu. Sem pedestal, sem
    // encaixe, sem mochila. Tinha um "ENCAIXE A MÁSCARA" no meio do caminho
    // que era um segundo passo inventado por mim: quem achava a máscara ficava
    // com ela parada no inventário até topar com o encaixe, e nas fases onde os
    // dois não se encontravam o poder simplesmente nunca chegava.
    //
    // Item CLARO, com nome e halo dourado de coisa-boa: nada da estática
    // magenta dos inimigos.
    this.maskItemMeshes = (lv.maskItems || []).map((mi) => {
      const g2 = new THREE.Group();
      g2.position.set(mi.x, mi.y, mi.z);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.maskClean, transparent: true, depthWrite: false,
      }));
      sp.scale.set(0.8, 0.8, 1);
      const ha = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.ringG, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.7,
      }));
      ha.scale.set(1.9, 1.9, 1);
      const lb = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._label(STR.mask_label, '#FFC93C', 44), transparent: true, depthWrite: false,
      }));
      lb.scale.set(2.4, 0.55, 1);
      lb.position.y = 0.85;
      g2.add(ha, sp, lb);
      g2.userData = { sp, ha, lb };
      this.levelRoot.add(g2);
      return g2;
    });

    // --- PORTA de reconhecimento
    // Era um anel chapado flutuando no meio do corredor: não lia como saída,
    // lia como decoração. Agora é uma porta que fecha o corredor de parede a
    // parede e ABRE, com as duas folhas correndo para os lados e a luz do outro
    // lado vazando pela fresta que cresce.
    const gate = new THREE.Group();
    gate.position.set(lv.gate.x, 0, lv.gate.z);
    const DW = def.w, DH = def.h, meia = DW / 2;

    const painel = () => new THREE.MeshLambertMaterial({ map: this.surf.door, color: 0x98a0ad });

    // luz do outro lado: fica ATRÁS das folhas, então só se vê pelo que abriu
    this.gateGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(DW, DH),
      new THREE.MeshBasicMaterial({
        color: COL.mag, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      })
    );
    this.gateGlow.position.set(0, DH / 2, -0.28);
    gate.add(this.gateGlow);

    // as duas folhas
    this.gateLeaves = [-1, 1].map((lado) => {
      const folha = new THREE.Mesh(new THREE.BoxGeometry(meia, DH, 0.32), painel());
      folha.position.set(lado * meia / 2, DH / 2, 0);
      // fresta luminosa na borda interna de cada folha
      const fresta = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, DH * 0.98),
        new THREE.MeshBasicMaterial({
          color: COL.mag, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
        })
      );
      fresta.position.set(-lado * meia / 2, 0, 0.17);
      folha.add(fresta);
      folha.userData.fresta = fresta;
      gate.add(folha);
      return folha;
    });

    // batentes: dão espessura e dizem que a porta está encaixada na parede
    for (const lado of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, DH, 0.6), painel());
      b.position.set(lado * (meia + 0.25), DH / 2, 0);
      gate.add(b);
    }
    const verga = new THREE.Mesh(new THREE.BoxGeometry(DW + 1.0, 0.6, 0.6), painel());
    verga.position.set(0, DH - 0.3, 0);
    gate.add(verga);

    this.gateLabel = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._label(def.hunt ? STR.hunt_locked : STR.gate_locked, '#FF2D9B'), transparent: true, depthWrite: false,
    }));
    this.gateLabel.scale.set(3.2, 0.8, 1);
    this.gateLabel.position.set(0, DH - 0.85, 0.4);
    gate.add(this.gateLabel);

    this.levelRoot.add(gate);
    this.gateGroup = gate;
    this.gateW = meia;

    // --- PEDESTAL DO ROSTO: uma máscara de tamanho de gente, vazia, na frente
    // da porta. Os pedaços que você recolhe SÃO do seu rosto, então montá-los
    // aqui é remontar a sua cara para a máquina, e é isso que destranca o
    // ferro. Antes bastava encostar num anel, o que não dizia nada.
    this.facePed = null; this.faceMask = null; this.faceHalo = null; this.faceLabel = null;
    if (!def.hunt) {
    const ped = new THREE.Group();
    ped.position.set(0, 0, lv.gate.z + 4.5);

    const plinto = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.05, 1.0, 12),
      new THREE.MeshLambertMaterial({ map: this.surf.door, color: 0x7c8492 })
    );
    plinto.position.y = 0.5;
    ped.add(plinto);

    // o rosto: começa apagado e vai acendendo conforme você junta os pedaços
    this.faceMask = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({
        map: this.tex.faceSlot, transparent: true, opacity: 0.16,
        color: 0x3a3350, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    this.faceMask.position.y = 1.85;
    ped.add(this.faceMask);

    this.faceHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({
        map: this.tex.ringG, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      })
    );
    this.faceHalo.position.y = 1.85;
    ped.add(this.faceHalo);

    this.faceLabel = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._label(STR.ped_label, '#FFC93C', 44), transparent: true, depthWrite: false,
    }));
    this.faceLabel.scale.set(2.6, 0.6, 1);
    this.faceLabel.position.y = 2.95;
    ped.add(this.faceLabel);

    this.levelRoot.add(ped);
    this.facePed = ped;
    }

    // --- chefe
    this.bossGroup = null;
    if (def.boss) {
      const g = new THREE.Group();
      g.position.set(0, 4.2, lv.end + 6);
      // O corpo é a arte gerada, em sprite. Antes era um icosaedro de arame com
      // uma bola escura dentro: lia como "bola magenta", não como um olho que
      // te julga. O sprite sempre encara a câmera, que é o que se quer de um
      // olho — ele nunca aparece de costas.
      // corpo = malha 3D de verdade, com volume. O sprite anterior era um
      // retângulo que sempre encarava a câmera: de lado, o truque aparecia.
      const corpo = new THREE.Group();
      this._anexaModelo('boss', corpo);
      const iris = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.ringM, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      iris.scale.set(4.4, 4.4, 1);
      g.add(corpo, iris);
      g.userData = { corpo, iris };
      // nome flutuando sobre ele: sem isso o chefe é "aquela bola magenta"
      const nome = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._label(STR.boss_name, '#FF2D9B', 40), transparent: true, depthWrite: false,
      }));
      nome.scale.set(5.2, 1.3, 1);
      nome.position.y = 3.4;
      g.add(nome);

      this.levelRoot.add(g);
      this.bossGroup = g;

      // Comprimento medido na arena, não fixo. Com 26 m num salão de 26×30 os
      // cantos ficavam FORA do alcance: dava para estacionar na quina e trocar
      // tiro sem nunca precisar agachar. O feixe agora é a diagonal do salão,
      // então varre até o canto mais distante.
      this.arenaLen = (def.segs.find((sg) => sg.t === 'arena') || { len: 30 }).len;
      this.bossBeamLen = Math.max(P.BOSS_BEAM, Math.hypot(def.w, this.arenaLen));

      // DOIS feixes rotativos, não um. O de cima corre na altura do peito e
      // pede agachar; o de baixo raspa o chão e pede pulo. Giram em sentidos
      // opostos e com velocidades diferentes de propósito: assim a resposta
      // muda a cada passagem em vez de virar um ritmo decorado.
      const fazFeixe = (y, cor) => {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, this.bossBeamLen, 6),
          new THREE.MeshBasicMaterial({ color: cor })
        );
        m.rotation.z = Math.PI / 2;
        m.visible = false;
        m.userData.y = y;
        this.levelRoot.add(m);
        return m;
      };
      this.bossBeam = fazFeixe(1.28, COL.mag);      // peito: agacha
      this.bossBeamLow = fazFeixe(0.34, 0xff7a3a);  // chão: pula

      // LIMIAR DA ARENA, criado junto com a fase e não só na hora de selar.
      // É a separação que faltava entre o corredor e a luta: uma superfície
      // magenta pulsando devagar, visível de longe, que diz "a partir daqui é
      // outra coisa". Ao entrar, ela fecha atrás e fica opaca.
      this.bossDoor = new THREE.Mesh(
        new THREE.PlaneGeometry(def.w, def.h),
        new THREE.MeshBasicMaterial({
          color: COL.mag, transparent: true, opacity: 0.10,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      this.bossDoor.position.set(0, def.h / 2, lv.end + this.arenaLen - 1.2);
      this.levelRoot.add(this.bossDoor);
    }

    // estado da fase
    this.s = {
      phase: i, t: 0, left: def.time,
      frags: 0, need: def.need, deaths: this.s ? this.s.deaths : 0,
      dronesKilled: this.s ? this.s.dronesKilled : 0,
      lives: P.LIVES, invuln: 0,
      // false de proposito: a mascara branca e' ACHADA no corredor. Antes era
      // `!!def.mask`, ou seja, ja vinha no bolso, e a cena de achar a mascara
      // (que e' o assunto do jogo inteiro) nunca acontecia.
      maskHave: false, maskOn: false, maskHeat: 0, maskLock: 0,
      pegouT: null,               // animação de quem acabou de pegar a máscara
      deposto: false, depT: null, // rosto entregue no pedestal


      morto: false,
      hunt: !!def.hunt, masksGot: 0, masksTotal: (lv.maskItems || []).length,
      shotCd: 0, flashVis: 0, shots: [], bala: null,
      gateOpen: false, done: false,
      // `bossCfg` na fase sobrescreve qualquer número do chefe (é o que o
      // editor mexe); o que não vier de lá cai no padrão de P.
      boss: def.boss ? (() => {
        const c = def.bossCfg || {};
        const hp = c.hp != null ? c.hp : P.BOSS_HP;
        return {
          hp, maxHp: hp, t: 0, open: false, ang: 0, angLow: 0, orbit: 0,
          fase: 'varredura', ballCd: 0, lastCycle: -1, marco: 0,
          sweep: c.sweep != null ? c.sweep : P.BOSS_SWEEP,
          salvo: c.salvo != null ? c.salvo : P.BOSS_SALVO,
          open_t: c.open != null ? c.open : P.BOSS_OPEN,
          ballCdMax: c.ballCd != null ? c.ballCd : P.BOSS_BALL_CD,
          ballSpd: c.ballSpd != null ? c.ballSpd : P.BOSS_BALL_SPD,
          move: c.move != null ? c.move : P.BOSS_MOVE,
          orbitR: c.orbit != null ? c.orbit : P.BOSS_ORBIT,
          spawn: c.spawn != null ? c.spawn : P.BOSS_SPAWN,
          spawnMax: c.spawnMax != null ? c.spawnMax : P.BOSS_SPAWN_MAX,
        };
      })() : null,
      aya: '', ayaT: 0, said: {},
      narrI: 0,                   // qual linha da narrativa da fase vem agora
      shake: 0, hurt: 0, banner: null, objective: '',
    };

    this.pl.pos.set(lv.spawn.x, lv.spawn.y, lv.spawn.z);
    this.pl.vel.set(0, 0, 0);
    this.pl.h = P.STAND_H;
    this.pl.onGround = false;
    this.rig.rotation.set(0, 0, 0);
    this.in.yaw = 0; this.in.pitch = 0;

    if (def.hunt) { this._huntObjective(); this._sayOnce('hunt', 7); }
    else this._setObjective(STR.obj_collect);
    this._banner(`${STR.phase_intro} ${i + 1}`, def.sub);
    this._say(i === 0 ? STR.aya.start : def.sub, 6);
    if (def.boss) this._sayOnce('boss', 9);
    // a guia se posta ao lado da entrada de cada fase
    this.ayaGroup.position.set(-def.w / 2 + 1.4, 2.4, -6);
    // Identidade da fase: cor do ar, cor da luz e alcance da vista. É o que faz
    // cinco corredores da mesma geometria pararem de ler como a mesma sala.
    const pal = def.pal;
    if (pal) {
      this.scene.fog.color.setHex(pal.fog);
      this.scene.fog.density = pal.fogD;
      this.scene.background.setHex(pal.fog);
      if (this.amb) { this.amb.color.setHex(pal.amb); this.amb.intensity = pal.ambI; }
      if (this.sky) {
        this.sky.material.color.setHex(pal.sky);
        this._trocaHorizonte(pal.skyImg);
      }
    }

    // a fase do chefe troca a trilha: e' o unico ponto do jogo onde a pressao
    // vira o assunto, e a musica precisa dizer isso antes do jogador ler nada
    this.sfx.musicStart(def.boss ? TRILHAS.auditoria : TRILHAS.corredor);
    if (this.onPhase) this.onPhase(i + 1, LEVELS.length);
  }

  // Etiqueta de texto em textura. A proporção do canvas é 4:1 e tem que
  // continuar sendo: todos os sprites que consomem isto usam escala 4:1
  // (4,6×1,15 · 3,2×0,8 · 0,34×0,085), então mexer aqui esticaria o texto lá.
  // Este ponto está dentro de alguma parede? (o chão não conta: drones voam
  // sobre ele). `folga` afasta o corpo do drone da superfície.
  // ==========================================================================
  // MODELOS GLB. Baixam em paralelo com o resto e podem chegar DEPOIS da fase
  // começar — um download de malha não pode segurar o jogo. Quem precisa de um
  // modelo pede aqui: se já chegou, recebe na hora; se não, entra na fila e é
  // servido quando chegar.
  // ==========================================================================
  _carregaModelos() {
    this.modelos = {};
    this.filaModelo = {};
    const loader = new GLTFLoader();
    for (const [nome, def] of Object.entries(MODELS)) {
      loader.load(def.url, (gltf) => {
        const raiz = gltf.scene;
        // O jogo inteiro é MeshBasicMaterial: o brilho é aplicado no pixel, não
        // calculado por luz (ver _surfaces). Um material PBR aqui ficaria escuro
        // e azulado, fora do acabamento chapado e emissivo de tudo em volta.
        raiz.traverse((o) => {
          if (!o.isMesh) return;
          const m = o.material;
          o.material = new THREE.MeshBasicMaterial({
            map: m && m.map ? m.map : null,
            color: m && !m.map && m.color ? m.color : 0xffffff,
            transparent: false,
          });
        });
        this.modelos[nome] = raiz;
        for (const f of this.filaModelo[nome] || []) f(raiz);
        this.filaModelo[nome] = [];
      }, undefined, (e) => console.warn('[modelo] falhou:', nome, e));
    }
  }

  _anexaModelo(nome, grupo, aoChegar) {
    const def = MODELS[nome];
    if (!def) return;
    const por = (raiz) => {
      const m = raiz.clone(true);

      // Mede a malha e resolve escala e centro a partir do tamanho real. Sem
      // isto o tamanho vira adivinhação: a arma nasceu com meia tela de
      // largura e girando em torno de um ponto fora dela.
      const cx = new THREE.Box3().setFromObject(m);
      const tam = cx.getSize(new THREE.Vector3());
      const maior = Math.max(tam.x, tam.y, tam.z) || 1;
      const k = (def.tam || 1) / maior;
      m.scale.setScalar(k);
      // recentra: o pivô passa a ser o meio da peça
      const centro = cx.getCenter(new THREE.Vector3()).multiplyScalar(k);
      m.position.set(-centro.x, -centro.y, -centro.z);

      // A rotação vai num grupo POR FORA, senão ela giraria antes da
      // recentragem e o modelo sairia deslocado.
      let alvo = m;
      if (def.rot) {
        const giro = new THREE.Group();
        giro.rotation.set(def.rot[0], def.rot[1], def.rot[2]);
        giro.add(m);
        alvo = giro;
      }
      if (def.pos) alvo.position.set(def.pos[0], def.pos[1], def.pos[2]);

      grupo.add(alvo);
      grupo.userData.malha = alvo;
      if (aoChegar) aoChegar(alvo);
    };
    if (this.modelos && this.modelos[nome]) por(this.modelos[nome]);
    else {
      this.filaModelo = this.filaModelo || {};
      (this.filaModelo[nome] = this.filaModelo[nome] || []).push(por);
    }
  }

  _dentroSolido(x, y, z, folga = 0.45) {
    for (const b of this.level.blocks) {
      if (b.kind === 'floor') continue;
      if (Math.abs(x - b.x) <= b.hx + folga &&
          Math.abs(y - b.y) <= b.hy + folga &&
          Math.abs(z - b.z) <= b.hz + folga) return true;
    }
    return false;
  }

  // Até onde o tiro viaja antes de encontrar sólido. Serve ao DESENHO do
  // traço: sem isto, um tiro que não acerta nada era riscado até o alcance
  // máximo — 38 m atravessando parede e cenário, o que lia como "o tiro vai
  // longe demais". Agora ele para onde pararia de verdade.
  _alcanceLivre(o, d, max) {
    const passo = 0.35;
    for (let t = passo; t < max; t += passo) {
      if (this._dentroSolido(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t, 0)) return t;
    }
    return max;
  }

  // Há parede entre estes dois pontos? Amostragem ao longo do segmento: é
  // barata e suficiente, porque a parede mais fina do jogo tem 55 cm e o passo
  // é de 35 cm. Roda uma vez por disparo, não por alvo.
  _bloqueado(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    const n = Math.min(120, Math.ceil(dist / 0.35));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this._dentroSolido(ax + dx * t, ay + dy * t, az + dz * t, 0)) return true;
    }
    return false;
  }

  // Arma de primeira pessoa, em geometria — nada de asset externo. Segue a
  // regra visual do jogo: corpo escuro facetado, contorno ciano luminoso, um
  // anel dourado na boca. `depthTest: false` porque, encostado no rosto da
  // câmera, qualquer parede próxima a cortaria pela metade.
  // `principal` marca a arma da CÂMERA, distinguindo-a das cópias presas aos
  // controles de VR. A distinção nasceu de um bug: sem ela, as cópias de VR
  // sobrescreviam as referências guardadas aqui.
  _makeWeapon(principal) {
    const g = new THREE.Group();
    const mkMat = (c, wire) => new THREE.MeshBasicMaterial({
      color: c, wireframe: !!wire, depthTest: false, transparent: true,
    });
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.24), mkMat(0x140a2a));
    corpo.position.set(0, 0, 0);
    const arestas = new THREE.LineSegments(
      new THREE.EdgesGeometry(corpo.geometry),
      new THREE.LineBasicMaterial({ color: COL.wire, depthTest: false, transparent: true, opacity: 0.9 })
    );
    const cano = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.20, 8), mkMat(0x2a2050));
    cano.rotation.x = Math.PI / 2;
    cano.position.set(0, 0.006, -0.20);
    const punho = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.06), mkMat(0x1a1030));
    punho.position.set(0, -0.085, 0.05);
    punho.rotation.x = -0.18;
    // anel na boca: a única parte quente da arma
    const boca = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.ringG, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, opacity: 0.85,
    }));
    boca.scale.set(0.10, 0.10, 1);
    boca.position.set(0, 0.006, -0.30);
    // NÃO existe clarão de boca. Ele existiu em três versões — dourada, ciano
    // e (por multiplicação de textura) verde — e em todas ficou estranho, pela
    // mesma razão de fundo: é um sprite preso a um ponto FIXO do grupo, e a
    // boca do cano do modelo não está nesse ponto. Acertar isso exigiria mais
    // um número medido à mão, para ganhar um efeito que o traço do tiro e o
    // clarão de impacto já entregam. Removido de propósito.

    // A peça de geometria é RESERVA: ela existe para a arma aparecer desde o
    // primeiro quadro, sem esperar o download do GLB. Quando o modelo chega,
    // ela some e ele assume.
    // O anel dourado entra na RESERVA, não solto no grupo: ele existia para
    // marcar a boca da arma de geometria, que não tem emissor desenhado. O
    // modelo tem o seu, então o anel some junto com a reserva — solto, virava
    // uma auréola boiando ao lado da mão, sem explicação nenhuma.
    const reserva = new THREE.Group();
    reserva.add(corpo, arestas, cano, punho, boca);
    // Grupo de ajuste: fica POR FORA do modelo, então sua rotação é a última a
    // ser aplicada e acontece no espaço da câmera. É o que o afinador mexe.
    const modelo = new THREE.Group();
    const aj = MODELS.weapon.ajuste;
    if (aj) modelo.rotation.set(aj[0], aj[1], aj[2]);
    if (principal) this.armaAjuste = modelo;
    this._anexaModelo('weapon', modelo, (malha) => {
      reserva.visible = false;
      if (principal) this.armaMalha = malha;

      // BOCA DO CANO, medida em vez de escrita à mão.
      //
      // O traço do tiro saía da origem do grupo, que cai na altura do punho —
      // o disparo brotava do meio da mão. A alternativa seria mais um número
      // ajustado no olho, como o `boca` que já tentei antes e nunca encaixou.
      //
      // Aqui a caixa envolvente do modelo é levada para o espaço do grupo, e a
      // boca é o ponto MAIS À FRENTE dela (menor z), no centro em x e y. Se o
      // modelo mudar de tamanho, de pose ou de arma, o ponto acompanha sozinho.
      g.updateMatrixWorld(true);
      const cx = new THREE.Box3().setFromObject(malha);
      cx.applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).invert());
      g.userData.bocaLocal = new THREE.Vector3(
        (cx.min.x + cx.max.x) / 2,
        (cx.min.y + cx.max.y) / 2,
        cx.min.z
      );
    });

    g.add(reserva, modelo);
    // Posição na câmera, também medida com o afinador.
    g.position.set(0.14, -0.25, -0.40);
    g.rotation.set(0.04, -0.10, 0.03);
    g.renderOrder = 1005;
    g.traverse((o) => { o.renderOrder = 1005; });
    g.userData = { base: g.position.z };
    return g;
  }

  // Aqui morava o _makeHand, que desenhava uma mão de sete caixas por
  // controle. Removido: no óculos ela é o objeto mais perto do olho e o mais
  // grosseiro da cena, e ficava feia justamente por isso. Mão só a direita, e
  // ela é a arma.

  _makeDroneMesh() {
    const g = new THREE.Group();
    const corpo = new THREE.Group();

    // CONTORNO. O drone é escuro e sumia no cenário — em corredor de luz
    // magenta ele virava mais uma mancha. A solução é a clássica de silhueta:
    // uma cópia da malha um pouco maior, desenhada só pelas FACES DE DENTRO
    // (BackSide), o que deixa aparecer apenas uma borda em volta.
    //
    // A cor é laranja, e isso é decisão de leitura: ciano é o sistema, dourado
    // é o que se coleta, magenta são os feixes. Sem cor própria, o inimigo se
    // confunde com o perigo do cenário. Agora ele tem a dele.
    this._anexaModelo('drone', corpo, (malha) => {
      const borda = malha.clone(true);
      borda.traverse((o) => {
        if (!o.isMesh) return;
        o.material = new THREE.MeshBasicMaterial({
          color: 0xFF6A3A, side: THREE.BackSide, depthWrite: false,
        });
      });
      borda.scale.multiplyScalar(1.09);
      corpo.add(borda);
    });

    // SEM anel de "te vi". Ele existiu para avisar que o drone te detectou,
    // mas em cima do contorno laranja virava só mais um halo — e halo é
    // exatamente o que polui esta cena, que já é toda emissiva. O aviso agora
    // vem do próprio corpo: quando ele te vê, ELE VIRA E TE ENCARA, e isso é
    // legível de longe sem acrescentar luz nenhuma à tela.
    g.add(corpo);
    g.userData.corpo = corpo;
    this.levelRoot.add(g);
    return g;
  }

  // Põe um drone NOVO no mundo, dado e malha juntos. Sem isto o chefe só
  // conseguia ressuscitar drones já existentes — e a fase 5 não tem nenhum
  // trecho de drones, então o reforço dele nunca acontecia de fato.
  _spawnDrone(x, y, z) {
    const lv = this.level;
    lv.drones.push({ x, y, z, hp: P.DRONE_HP, cd: 0.8, phase: Math.random() * 6.28,
                     home: { x, y, z }, dead: false });
    this.droneMeshes.push(this._makeDroneMesh());
  }

  _label(text, color, size = 60) {
    const W = 1024, H = 256;                 // era 512×128; o dobro só para nitidez
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    // Os chamadores calibraram `size` na régua antiga (512 de largura), então
    // ele é convertido antes de qualquer medida.
    let px = size * (W / 512);

    // Texto largo demais era CORTADO nas duas pontas, porque o alinhamento é
    // central: "SCANNER · SÓ PASSA DE MÁSCARA" a 34 px pedia ~580 px num canvas
    // de 512 e aparecia como "ANNER · SÓ PASSA DE MÁSCAR". O mesmo acontecia
    // com a etiqueta do controle direito em VR. Agora a fonte encolhe até
    // caber, com 6% de margem de cada lado — encolher é feio, cortar é pior.
    const medir = () => { g.font = `bold ${px}px system-ui, sans-serif`; return g.measureText(text).width; };
    const max = W * 0.88;
    while (medir() > max && px > 10) px -= 1;

    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, W / 2, H * 0.53);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ------------------------------------------------------------- entrada
  _buildInput() {
    this.in = { yaw: 0, pitch: 0 };
    this.stick = { x: 0, y: 0 };
    this.held = new Set();
    this.tap = { jump: false, mask: false };
    this.mouseDown = false;
    this.duckBtn = false;
    this._snapLatch = false;
    this.touchMove = -1; this.touchLook = -1;
    const el = this.renderer.domElement;

    const HOLD = {
      KeyW: 'fwd', KeyS: 'back', KeyA: 'sleft', KeyD: 'sright',
      ArrowUp: 'fwd', ArrowDown: 'back', ArrowLeft: 'lookleft', ArrowRight: 'lookright',
      ControlLeft: 'duck', ControlRight: 'duck', KeyC: 'duck', ShiftLeft: 'duck',
      Space: 'jumpHold',
    };
    const TAP = { Space: 'jump', KeyF: 'mask', KeyQ: 'mask', KeyE: 'mask' };
    addEventListener('keydown', (e) => {
      if (e.repeat) { if (HOLD[e.code]) e.preventDefault(); return; }
      if (HOLD[e.code]) { this.held.add(HOLD[e.code]); e.preventDefault(); }
      if (TAP[e.code]) { this.tap[TAP[e.code]] = true; e.preventDefault(); }
    });
    addEventListener('keyup', (e) => { if (HOLD[e.code]) this.held.delete(HOLD[e.code]); });
    addEventListener('blur', () => this._releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._releaseAll(); });

    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      if (e.button === 2) { this.tap.mask = true; return; }
      this.mouseDown = true;
      if (!this.renderer.xr.isPresenting && document.pointerLockElement !== el) {
        if (el.requestPointerLock) el.requestPointerLock();
        else { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; }
      }
    });
    addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      this.mouseDown = false; this.dragging = false;
    });
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      if (document.pointerLockElement === el) this._look(e.movementX * -0.0022, e.movementY * -0.0022);
      else if (this.dragging) {
        this._look((e.clientX - this.lastX) * 0.004, (e.clientY - this.lastY) * 0.004);
        this.lastX = e.clientX; this.lastY = e.clientY;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== el) this.mouseDown = false;
    });

    // Um dedo que sai da tela sem gerar touchend (o iOS engole o evento quando
    // um gesto do sistema entra no meio, e a morte reconstrói a fase bem nessa
    // hora) deixava o identificador preso e o controle morto. Antes de aceitar
    // um toque novo, confere quem ainda está de fato na tela.
    const vivos = (e) => {
      let m = false, l = false;
      for (const t of e.touches) {
        if (t.identifier === this.touchMove) m = true;
        if (t.identifier === this.touchLook) l = true;
      }
      if (!m && this.touchMove >= 0) { this.touchMove = -1; this.stick.x = 0; this.stick.y = 0; }
      if (!l && this.touchLook >= 0) { this.touchLook = -1; this.mouseDown = false; }
    };

    el.addEventListener('touchstart', (e) => {
      vivos(e);
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth / 2 && this.touchMove < 0) {
          this.touchMove = t.identifier; this.moveOx = t.clientX; this.moveOy = t.clientY;
        } else if (this.touchLook < 0) {
          this.touchLook = t.identifier; this.lastX = t.clientX; this.lastY = t.clientY;
          this.mouseDown = true;
        }
      }
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchMove) {
          const R = 68;
          this.stick.x = Math.max(-1, Math.min(1, (t.clientX - this.moveOx) / R));
          this.stick.y = Math.max(-1, Math.min(1, (this.moveOy - t.clientY) / R));
        } else if (t.identifier === this.touchLook) {
          this._look((t.clientX - this.lastX) * 0.005, (t.clientY - this.lastY) * 0.005);
          this.lastX = t.clientX; this.lastY = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const soltaDedos = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchMove) { this.touchMove = -1; this.stick.x = 0; this.stick.y = 0; }
        if (t.identifier === this.touchLook) { this.touchLook = -1; this.mouseDown = false; }
      }
    };
    const endTouch = (e) => { soltaDedos(e); e.preventDefault(); };
    el.addEventListener('touchend', endTouch, { passive: false });
    el.addEventListener('touchcancel', endTouch, { passive: false });
    // E também na janela, em modo passivo: se o dedo terminar em cima de um
    // botão da HUD, o touchend não chega no canvas e o identificador ficava
    // preso. Aqui NÃO se chama preventDefault, senão os botões das telas de
    // menu deixariam de virar clique.
    addEventListener('touchend', soltaDedos, { passive: true });
    addEventListener('touchcancel', soltaDedos, { passive: true });

    // ---- vinheta de conforto (VR) -------------------------------------
    // Locomocao por analogico e a causa numero um de enjoo em VR: os olhos
    // veem movimento e o ouvido interno nao sente nada. A vinheta estreita a
    // visao periferica enquanto voce anda, que e onde esse conflito mais
    // pesa, e abre de novo quando voce para.
    {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const g2 = cv.getContext('2d');
      const grad = g2.createRadialGradient(128, 128, 60, 128, 128, 128);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 256, 256);
      const tx = new THREE.CanvasTexture(cv);
      this.vinheta = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4),
        new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false })
      );
      this.vinheta.position.z = -0.45;
      this.vinheta.renderOrder = 999;
      // A vinheta e filha da CAMERA e so isso. Eu tinha escrito
      // `this.scene.add(this.camera)` aqui, e isso arrancava a camera do rig
      // (linha 153: this.rig.add(this.camera)). O rig e o que a locomocao move
      // e onde os controles vivem, entao tirar a camera dele quebrava de uma
      // vez a cabeca, o andar e os menus dentro do VR.
      this.camera.add(this.vinheta);
    }

    // Aqui existia uma SEGUNDA moldura de máscara, branca, que eu tinha posto
    // porque dentro do óculos não aparecia nenhum sinal da máscara no rosto.
    // O diagnóstico estava errado: o sinal já existia (`maskView`, a arte da
    // máscara de verdade, com o fio dourado), só que desenhado FORA do campo
    // de visão do aparelho. Ver `_ajustaMascaraVR`. Com aquilo consertado esta
    // moldura só empilharia duas bordas uma na outra, então saiu.

    this.controllers = [];
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      // Aqui saía um cilindro ciano de cinco metros de cada controle, o
      // "raio" de apontar. Ele nasceu para mostrar onde a arma mira, mas
      // dentro do óculos vira o contrário: duas listras azuis atravessando o
      // corredor inteiro, sempre no campo de visão, tampando o cenário e
      // apontando também com a mão que não atira. A arma já mostra a direção
      // pelo próprio cano, e o tiro deixa um traço. As linhas saíram.
      c.addEventListener('selectstart', () => { this.xrTrigger = i; this.activeCtrl = i; });
      c.addEventListener('selectend', () => { if (this.xrTrigger === i) this.xrTrigger = -1; });
      c.addEventListener('squeezestart', () => { this.tap.mask = true; });
      // etiqueta flutuando sobre o controle: sem ela ninguem descobre que o
      // grip veste a mascara e o gatilho atira
      const et = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this._label(i === 0 ? STR.vr_ctrl_l : STR.vr_ctrl_r, '#00E5FF', 30),
        transparent: true, depthWrite: false, depthTest: false, opacity: 0.95,
      }));
      et.scale.set(0.34, 0.085, 1);
      et.position.set(0, 0.09, 0);
      c.add(et);
      c.userData.etiqueta = et;

      // A ARMA NA MÃO, em VR. Mesma peça do modo tela, só que presa ao
      // controle e em escala de mão: o disparo passa a sair de onde a pessoa
      // está apontando de verdade, não de um ponto invisível.
      // sem `principal`: esta é uma cópia, não pode roubar as referências que
      // o afinador usa
      // UMA ARMA SÓ, na direita. A esquerda é mão limpa: é ela que aperta o
      // grip para vestir a máscara.
      //
      // O gatilho esquerdo continua atirando, mas o tiro sai da mão ARMADA,
      // não da vazia. Era esse o defeito antes: os dois gatilhos disparavam,
      // e o da esquerda disparava de uma mão sem cano, sem coice e sem nada
      // saindo de lugar nenhum, o que se lê como "a esquerda não atira".
      const arma = this._makeWeapon(false);
      arma.position.set(0, -0.01, -0.03);
      arma.rotation.set(0, 0, 0);
      arma.userData.base = arma.position.z;
      arma.visible = i !== 0;      // palpite até o aparelho informar o lado
      c.add(arma);
      c.userData.arma = arma;

      // Aqui eu desenhava uma mão de caixas em cada controle. Ficou feia: o
      // resto da cena é geometria de aresta fina, e uma mão de sete blocos no
      // meio do campo de visão, a meio metro do olho, é o objeto mais próximo
      // e mais grosseiro da tela inteira. O que se vê agora é o que já
      // funcionava: a arma na mão direita, e nada na esquerda.

      c.addEventListener('connected', (e) => {
        if (this.activeCtrl == null) this.activeCtrl = i;
        const hand = e.data && e.data.handedness;
        c.userData.hand = hand;
        // a arma vai na mão do gatilho: a direita, quando o aparelho informa
        if (c.userData.arma) c.userData.arma.visible = hand !== 'left';
        if (hand !== 'left') { this.weaponVR = c.userData.arma; this.maoArmada = i; }
        if (hand && c.userData.etiqueta) {
          c.userData.etiqueta.material.map =
            this._label(hand === 'left' ? STR.vr_ctrl_l : STR.vr_ctrl_r, '#00E5FF', 30);
        }
      });
      this.rig.add(c);
      this.controllers.push(c);
    }
    this.xrTrigger = -1;
    this.activeCtrl = null;

    if (this.renderer.xr.setFramebufferScaleFactor) this.renderer.xr.setFramebufferScaleFactor(0.92);
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.reticle.visible = false;
      // foveation maxima: borda do olho renderiza mais leve, quadro estavel.
      // Taxa de quadros caindo e' a dor de cabeca que nenhuma vinheta cura.
      if (this.renderer.xr.setFoveation) this.renderer.xr.setFoveation(1);
      this._calibraVR();
      if (this.mode === 'idle') this.start();
    });
    this.renderer.xr.addEventListener('sessionend', () => { this.reticle.visible = true; });
  }

  // ------------------------------------------------------------- VR: calibra
  // O jogo foi desenhado para olho a 1,64 m. VR_CROUCH_Y era 1,25 m fixo, e
  // isso e' de quem tem 1,78 m: para alguem de 1,55 m agachar significa
  // encolher 20 cm, e para alguem de 1,90 m significa um agachamento de 53 cm
  // que ninguem aguenta repetir. Crianca baixa ficava agachada o tempo todo.
  //
  // Aqui a altura REAL do capacete e medida no primeiro segundo em pe, e daí
  // saem duas coisas: o limite de agachar, que passa a ser uma fracao da
  // altura da pessoa, e a escala do rig, que faz o mundo ter o mesmo tamanho
  // relativo para todo mundo.
  _calibraVR() {
    this.vrAltura = null;
    this.vrYOff = 0;
    this._neutro = null;   // o "reto" do giro pelo rosto se refaz a cada sessão
    this.rig.scale.setScalar(1);
    // A amostragem acontece DENTRO do _frame (setAnimationLoop): dentro de
    // sessao imersiva o requestAnimationFrame da janela nao dispara no Quest,
    // entao a versao anterior nunca terminava de medir no aparelho de verdade.
    this._vrCal = { maior: 0, quadros: 0 };
  }

  _vrCalibraPasso() {
    const c = this._vrCal;
    if (!c || !this.renderer.xr.isPresenting) return;
    const y = this.camera.position.y;
    if (y > 0.6 && y < 2.4) { c.maior = Math.max(c.maior, y); c.quadros++; }
    if (c.quadros < 90) return;
    this._vrCal = null;
    this.vrAltura = c.maior;
    // DESLOCAMENTO, nao escala. A versao anterior escalava o rig, e escala
    // multiplica o movimento fisico da cabeca: quem tem 1,40 m mexia 10 cm e
    // o mundo via 11,7. Era essa a imprecisao no rastreamento. Subir ou
    // descer o "chao" leva o olho a altura de projeto mantendo o 1:1.
    this.vrYOff = Math.max(-0.45, Math.min(0.45, P.VR_OLHO - c.maior));
    this._say(STR.aya.vr_pronto || '', 4);
  }

  // limite de agachar: fracao da altura medida, e nao um numero fixo
  get vrLimiteAgachar() {
    return this.vrAltura ? this.vrAltura * 0.78 : P.VR_CROUCH_Y;
  }

  // botões de tela (celular)
  press(what) { if (what === 'duck') this.duckBtn = !this.duckBtn; else this.tap[what] = true; }

  // desligar o som tem que calar a AYA junto, senão a voz continua falando
  // sozinha com o resto do jogo mudo
  // cala a que está tocando E esvazia a fila: desligar o som ou trocar de fase
  // não pode deixar uma frase guardada para entrar depois
  calaVoz() {
    this._naFila = null;
    if (this._voz) { try { this._voz.pause(); } catch (e) {} this._voz = null; }
  }

  // Solta só o que é DEDO e MOUSE. É isto que roda ao trocar de fase e ao
  // morrer: um dedo que estava na tela no instante da morte deixava
  // `touchMove` preso num identificador que nunca mais volta, e como o
  // touchstart só aceita um dedo novo quando `touchMove < 0`, o lado
  // esquerdo da tela parava de responder para sempre.
  //
  // O TECLADO fica de fora de propósito. Quem morre segurando o W continua
  // com o W fisicamente apertado, e o keyup só vai chegar quando a pessoa
  // soltar. Limpar `held` aqui, como eu estava fazendo, matava o W até a
  // pessoa soltar e apertar de novo: virava "morri e travei" no PC.
  _releaseTouch() {
    this.mouseDown = false; this.dragging = false; this.duckBtn = false;
    this.touchMove = -1; this.touchLook = -1;
    this.stick.x = 0; this.stick.y = 0;
    this.tap.jump = false; this.tap.mask = false;
  }

  // Zera tudo, teclado incluído. Só para blur e aba escondida, onde o keyup
  // realmente nunca vai chegar.
  _releaseAll() {
    this.held.clear();
    this.mouseDown = false; this.dragging = false; this.duckBtn = false;
    this.touchMove = -1; this.touchLook = -1;
    this.stick.x = 0; this.stick.y = 0;
    this.tap.jump = false; this.tap.mask = false;
  }

  _look(dx, dy) {
    if (this.renderer.xr.isPresenting) return;
    this.in.yaw += dx;
    this.in.pitch = Math.max(-1.3, Math.min(1.3, this.in.pitch + dy));
  }

  _pad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let trig = false, mx = 0, my = 0;
    for (const gp of pads) {
      if (!gp || (gp.mapping && gp.mapping !== 'standard')) continue;
      const b = gp.buttons, ax = gp.axes || [];
      if (b[7] && b[7].pressed) trig = true;
      if (b[0] && b[0].pressed) { if (!this._padA) { this.tap.jump = true; this._padA = true; } } else this._padA = false;
      if (b[4] && b[4].pressed) { if (!this._padL) { this.tap.mask = true; this._padL = true; } } else this._padL = false;
      this.duckPad = !!(b[1] && b[1].pressed);
      // Mesma correcao do analogico do VR, aplicada aqui: a zona morta
      // reescala em vez de cortar, entao o giro nasce do zero em vez de
      // comecar num tranco de 18% da velocidade.
      const ZM = 0.14;
      const dz = (v) => {
        const a = Math.abs(v);
        if (a <= ZM) return 0;
        return Math.sign(v) * ((a - ZM) / (1 - ZM));
      };
      mx += dz(ax[0] || 0); my += -dz(ax[1] || 0);
      const rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
      // Este giro NAO usava dt: era um tanto fixo por quadro, entao girava o
      // dobro num aparelho de 120 Hz e a metade quando a taxa caia. Agora e
      // por segundo, igual em qualquer tela, com a mesma curva do VR.
      if (rx || ry) {
        const cur = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.35);
        const passo = dt || 1 / 60;
        this._look(-cur(rx) * P.TURN_SPEED * passo, -cur(ry) * P.TURN_SPEED * 0.62 * passo);
      }
    }
    this._padMove = { x: mx, y: my };
    return trig;
  }

  // A MÁSCARA ESTAVA DESENHADA FORA DO CAMPO DE VISÃO.
  //
  // O overlay da máscara é um plano de 2,6 por 1,95 m preso à câmera a 62 cm
  // do olho, e a arte só tem tinta na BEIRADA dele: o meio é a abertura por
  // onde se joga. Numa tela de computador, com uns 70 graus de campo, a
  // beirada cai dentro do quadro e a máscara aparece. Num óculos não: o plano
  // ocupa 129 graus na horizontal e 115 na vertical, e um Quest enxerga por
  // volta de 110 por 96. A borda inteira ficava para fora do que o olho
  // alcança. Não era "falta indicação de máscara": a indicação existia e era
  // desenhada onde ninguém pode ver.
  //
  // A correção não pode ser um número escolhido no olho, porque cada aparelho
  // tem um campo diferente. O próprio aparelho informa o dele na matriz de
  // projeção do olho, e dela saem as tangentes do tronco. O plano é então
  // dimensionado para o campo real, com 8% de sobra para a borda encostar
  // mesmo na beirada, e afastado para 3 m: a 62 cm cada olho vê a moldura num
  // lugar diferente (6 cm de distância entre eles é muito, tão perto), e a
  // 3 m essa diferença some.
  _ajustaMascaraVR() {
    const cam = this.renderer.xr.getCamera && this.renderer.xr.getCamera();
    const olho = cam && cam.cameras && cam.cameras.length ? cam.cameras[0] : cam;
    if (!olho || !olho.projectionMatrix) return false;
    const e = olho.projectionMatrix.elements;
    if (!e[0] || !e[5]) return false;
    // tronco possivelmente assimétrico: fico com o menor lado, que é o que
    // garante a borda visível nas duas direções
    const tanX = Math.min((1 + e[8]) / e[0], (1 - e[8]) / e[0]);
    const tanY = Math.min((1 + e[9]) / e[5], (1 - e[9]) / e[5]);
    if (!(tanX > 0.1) || !(tanY > 0.1)) return false;
    const D = 3.0, SOBRA = 1.08;
    this.maskView.position.z = -D;
    this.maskView.scale.set((D * tanX * SOBRA) / 1.3, (D * tanY * SOBRA) / 0.975, 1);
    return true;
  }

  // UM giro só, dentro do óculos.
  //
  // Havia dois jeitos de virar a câmera no VR e eles eram duas coisas
  // diferentes: o analógico girava o corpo (o rig) e a cabeça girava só a
  // cabeça, com o pescoço no fim do curso. Virar 90 graus com o analógico e
  // virar 90 graus com o pescoço davam resultados que não combinavam, e era
  // preciso escolher um dos dois no meio da partida.
  //
  // Daqui para a frente todo giro passa por esta função, venha do analógico,
  // do passo (snap) ou da cabeça. E ela gira em volta da CABEÇA, não da
  // origem do rig. O rig nasce no chão entre os pés; quem joga de pé um metro
  // fora do centro do quarto era jogado num arco a cada giro, e arco é
  // movimento lateral que o corpo não sente. Girando em volta do próprio
  // ponto de vista o mundo só roda, e nada empurra.
  //
  // A compensação vai por `_moveAxis`, e não somando na posição direto: a
  // correção pode chegar a alguns centímetros por quadro, e sem colisão isso
  // atravessa parede.
  _gira(rad) {
    if (!rad) return;
    const a = this.rig.rotation.y, b = a + rad;
    const hx = this.camera.position.x, hz = this.camera.position.z;
    this.rig.rotation.y = b;
    if (!this.renderer.xr.isPresenting) return;
    if (hx * hx + hz * hz < 1e-6) return;
    const sa = Math.sin(a), ca = Math.cos(a), sb = Math.sin(b), cb = Math.cos(b);
    this._moveAxis('x', (hx * ca + hz * sa) - (hx * cb + hz * sb));
    this._moveAxis('z', (-hx * sa + hz * ca) - (-hx * sb + hz * cb));
  }

  // A CABEÇA VIRA COMO O ANALÓGICO.
  //
  // O rosto passa a ser um analógico: virado além da folga, o mundo roda para
  // aquele lado. Voltou o rosto para o meio, para na hora, igual a soltar o
  // analógico. Não há mais dois jeitos de virar, há um só, com dois jeitos de
  // pedir.
  //
  // O ângulo do rosto vem do rastreamento, e o rastreamento mede em relação à
  // SALA, não ao corpo dentro do jogo: girar o rig não muda esse número. Ou
  // seja, o giro não se cancela sozinho, e é isso que o faz funcionar como um
  // analógico em vez de "endireitar o pescoço".
  //
  // Só que um zero preso à sala tem um jeito feio de quebrar: quem se plantar
  // de lado em relação ao ponto onde a sessão começou fica com o rosto torto o
  // tempo todo, e aí o mundo roda para sempre, sem nada que a pessoa possa
  // fazer. Por isso o zero é MÓVEL: enquanto o rosto está dentro da folga ele
  // fica parado, e quando passa da folga ele começa a perseguir o rosto
  // devagar, com uns dois segundos de atraso. Uma virada de rosto decidida
  // gira o mundo; um rosto torto o tempo todo vira o novo "reto" em poucos
  // segundos e o giro para. Não existe caso em que ele roda sem fim.
  //
  // A folga de 15 graus é o que separa "olhar para o lado" de "virar para o
  // lado". Sem ela o cenário rodava a cada olhada, que é enjoo puro. E o teto
  // fica em pouco mais da metade do analógico: giro que a pessoa não pediu com
  // o dedo tem que ser sempre mais manso que o que ela pediu.
  //
  // FLUIDEZ. A velocidade não é aplicada crua. Ela passa por um amortecedor de
  // uns dois décimos de segundo, e é isso que faz o corpo ACOMPANHAR o rosto
  // em vez de dar partida e freada: o rastreamento de cabeça treme, e uma
  // conta que responde direto a ele treme junto. Com o amortecedor o giro
  // nasce do zero, cresce enquanto o rosto vai virando e morre devagar quando
  // ele volta, sem nenhum degrau na entrada nem na saída da folga.
  _giroCabeca(dt) {
    if (!this.renderer.xr.isPresenting || !this.opts.giroCabeca) return;
    if (this.opts.snapTurn) return;   // quem escolheu passos não quer giro contínuo nenhum
    _v1.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    _v1.y = 0;
    if (_v1.lengthSq() < 1e-6) return;
    const rosto = Math.atan2(-_v1.x, -_v1.z);
    if (this._neutro == null) this._neutro = rosto;
    let d = rosto - this._neutro;
    while (d > Math.PI) d -= 2 * Math.PI;      // pelo caminho curto
    while (d < -Math.PI) d += 2 * Math.PI;
    const folga = 0.26;                        // 15 graus
    const sobra = Math.abs(d) - folga;
    // o zero persegue o rosto devagar, e só quando ele está fora da folga:
    // é o que impede o giro sem fim de quem fica plantado de lado
    if (sobra > 0) this._neutro += d * Math.min(1, dt / 3.5);
    const alvo = sobra > 0 ? Math.sign(d) * Math.min(sobra * 1.9, P.TURN_SPEED * 0.55) : 0;
    this._velCab = (this._velCab || 0) + (alvo - (this._velCab || 0)) * Math.min(1, dt * 5.5);
    if (Math.abs(this._velCab) < 0.002) { this._velCab = 0; return; }
    this._gira(this._velCab * dt);
    this._giroVel = Math.max(this._giroVel || 0, Math.abs(this._velCab));   // a vinheta conta este giro
  }

  _xrSticks(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return { x: 0, y: 0 };
    let mx = 0, my = 0, turn = 0, aApertado = false, bApertado = false;
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp || !gp.axes) continue;
      const ax = gp.axes;
      const x = ax.length > 2 ? ax[2] : (ax[0] || 0);
      const y = ax.length > 3 ? ax[3] : (ax[1] || 0);
      // Zona morta de 0,30 com o valor CRU: assim que o analogico passava do
      // limiar o giro ja comecava em 30% da velocidade, um tranco. Agora a
      // zona morta e menor e o que sobra e reescalado de 0 a 1, entao o giro
      // nasce do zero e cresce junto com o dedo. Isso e' o que faz ele ler
      // como linear em vez de degrau.
      const ZM = 0.16;
      const dz = (v) => {
        const a = Math.abs(v);
        if (a <= ZM) return 0;
        return Math.sign(v) * ((a - ZM) / (1 - ZM));
      };
      // O MAIOR sinal vence, nada de somar. Somar era o bug do giro para um
      // lado so: rastreamento de mao e eixo com drift tambem se apresentam
      // como 'right', e um drift de +0,8 somado ao seu -1,0 dava -0,2, que
      // nunca cruzava o limiar do snap. Para a esquerda girava, para a
      // direita o drift anulava.
      if (src.handedness === 'right') {
        const v = dz(x);
        if (Math.abs(v) > Math.abs(turn)) turn = v;
      } else {
        const vx = dz(x), vy = -dz(y);
        if (Math.abs(vx) > Math.abs(mx)) mx = vx;
        if (Math.abs(vy) > Math.abs(my)) my = vy;
      }
      if (gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) aApertado = true;
      // B/Y agacha. Antes so dava para agachar AGACHANDO de verdade, o que
      // e' bonito de demonstrar e cansativo de jogar: quem esta sentado, ou
      // quem tem o teto do quarto baixo, simplesmente nao passava por baixo
      // de feixe nenhum.
      if (gp.buttons && gp.buttons[5] && gp.buttons[5].pressed) bApertado = true;
    }
    // latch do pulo fora do laco: dentro, o segundo controle sobrescrevia o
    // estado do primeiro e comia o aperto do botao A
    if (aApertado) {
      if (!this._xrA) { this.tap.jump = true; this._xrA = true; }
    } else this._xrA = false;
    // agachar e' liga-desliga, nao segurar: segurar um botao agachado durante
    // um corredor inteiro cansa a mao e nao ha nada que peca isso.
    if (bApertado) {
      if (!this._xrB) { this.press('duck'); this._xrB = true; }
    } else this._xrB = false;
    if (this.opts.snapTurn) {
      // o latch guarda a DIRECAO: virar para o lado oposto destrava na hora,
      // mesmo que algum eixo preso mantenha o modulo acima do limiar
      const dir = Math.abs(turn) > 0.7 ? Math.sign(turn) : 0;
      this._snapT = (this._snapT || 0) - dt;
      // Passo novo quando MUDA de direcao (resposta imediata) ou quando o
      // tempo de repeticao venceu com o analogico ainda segurado. Sem a
      // repeticao era um passo por toque, e virar de costas exigia seis
      // toques com solta entre eles.
      if (dir !== 0 && (dir !== this._snapDir || this._snapT <= 0)) {
        this._gira(-dir * P.SNAP_TURN);
        this._snapT = P.SNAP_REPETE;
        this._pisca = P.SNAP_PISCA;   // escurece por um instante: corta o enjoo do salto
      }
      if (dir === 0) this._snapT = 0;
      this._snapDir = dir;
    } else {
      // curva suave: o comeco do curso do analogico gira devagar, para mirar,
      // e o fim gira rapido, para se virar. Reta pura fica nervosa no meio.
      const g = Math.sign(turn) * Math.pow(Math.abs(turn), 1.35);
      this._gira(-g * P.TURN_SPEED * dt);
      this._giroVel = Math.abs(g) * P.TURN_SPEED;   // a vinheta usa isto
    }
    if (this.opts.snapTurn) this._giroVel = 0;
    return { x: mx, y: my };
  }

  // ------------------------------------------------------------- ciclo
  start(phase = 0) {
    this.mode = 'playing';
    this.sfx.init(); this.sfx.resume(); this.sfx.droneStart();
    // a trilha entra aqui porque start() vem de um clique, sem gesto do
    // usuário o navegador barra qualquer áudio
    this.sfx.musicStart(TRILHAS.corredor);
    // start() vem de um clique, então aqui o navegador deixa tocar com som
    if (this.ayaVideo) {
      this.ayaVideo.muted = false;
      this.ayaVideo.currentTime = 0;
      this.ayaVideo.play().catch(() => { this.ayaVideo.muted = true; this.ayaVideo.play().catch(() => {}); });
    }
    this.totalDeaths = 0;
    this.s = null;
    this.loadPhase(phase);
  }

  stop() { this.mode = 'idle'; this.sfx.droneStop(); this.sfx.musicStop(); if (this.ayaVideo) this.ayaVideo.pause(); }

  _say(text, dur) {
    this.s.aya = text; this.s.ayaT = dur || 4.5; this._subDirty = true;
    this._fala(text);
  }

  // ---- a voz da AYA -----------------------------------------------------
  // Ela sempre teve fala escrita e nunca teve VOZ: o jogador estava correndo,
  // desviando de feixe, e a explicação passava como legenda no rodapé, que é
  // exatamente onde ninguém olha no meio da ação. Agora a mesma frase sai
  // falada.
  //
  // O áudio vem de /api/voz, o mesmo endereço que dá voz à Joy no blog, e por
  // isso não precisa de chave nenhuma aqui dentro. As falas dela são um
  // conjunto FIXO, então o pedido é GET e a resposta fica guardada no CDN: a
  // primeira pessoa que ouvir cada frase paga por ela, todas as outras pegam
  // de graça.
  //
  // Nada disso é essencial: sem internet, sem chave ou com o som desligado, o
  // jogo continua igual, só com a legenda, como era antes.
  _fala(texto) {
    if (!texto || !this.sfx.enabled) return;
    if (this._vozMorta) return;                 // já respondeu que não dá
    if (texto === this._vozUltima) return;      // não repete a mesma linha
    this._vozUltima = texto;

    // A AYA FALAVA POR CIMA DELA MESMA.
    //
    // Quem calava a fala anterior era `if (this._voz) pause()`, e `this._voz`
    // só era preenchido DEPOIS que o play() resolvia, ou seja, depois do áudio
    // baixar. Duas falas dentro dessa janela, que é o caso comum (a narração
    // entra e um evento acontece logo em seguida), viam `this._voz` vazio, não
    // calavam ninguém, e as duas tocavam juntas.
    //
    // Agora o áudio é guardado ANTES do play, então sempre há quem calar. E
    // cada pedido leva um número: se o play() de um áudio velho resolver
    // depois que outra fala já começou, ele se cala sozinho. Era essa corrida
    // que sobrava.
    // E ELA PASSA A ESPERAR A VEZ, em vez de cortar.
    //
    // Calar a anterior no meio tira a sobreposição e cria outra coisa ruim: a
    // frase morre pela metade, e duas metades emendadas soam quase como duas
    // falas juntas. Aqui a nova fica na FILA e entra quando a de agora
    // terminar. A fila guarda UMA, a mais recente: se três eventos
    // acontecerem juntos, ouve-se o que está tocando e depois o mais novo,
    // nunca uma pilha de frases velhas atrasadas.
    if (this._voz && !this._voz.paused && !this._voz.ended) { this._naFila = texto; return; }
    this._toca(texto);
  }

  _toca(texto) {
    const a = new Audio('/api/voz?texto=' + encodeURIComponent(texto));
    a.volume = 0.95;
    const meu = this._vozN = (this._vozN || 0) + 1;
    this._voz = a;
    const acabou = () => {
      if (this._voz !== a) return;
      this._voz = null;
      const proxima = this._naFila;
      this._naFila = null;
      if (proxima) this._toca(proxima);
    };
    // Sem chave configurada o endpoint responde 503 e não adianta insistir a
    // cada fala; qualquer outra falha (rede caindo) apenas silencia esta.
    a.addEventListener('error', () => {
      const st = a.error && a.error.code;
      if (st === 4) { this._vozMorta = true; this._naFila = null; }
      acabou();
    });
    a.addEventListener('ended', acabou);
    a.play().then(() => {
      // se outra fala tomou a frente enquanto esta carregava, esta nasceu velha
      if (meu !== this._vozN) { try { a.pause(); } catch (e) {} }
    }).catch(() => acabou());
  }
  _sayOnce(key, dur) {
    if (!this.s || this.s.said[key]) return;
    this.s.said[key] = true;
    this._say(STR.aya[key] || '', dur);
  }

  // objetivo vivo da cacada: mostra o placar de mascaras e drones
  _huntObjective() {
    const s = this.s, lv = this.level;
    const mortos = lv.drones.filter((d) => d.dead).length;
    this._setObjective(STR.obj_hunt
      .replace('{m}', s.masksGot + '/' + s.masksTotal)
      .replace('{d}', mortos + '/' + lv.drones.length));
  }

  _setObjective(t) {
    if (!this.s || this.s.objective === t) return;
    this.s.objective = t;
    if (this.onObjective) this.onObjective(t);
  }

  _banner(title, sub) {
    // título e texto ficam no estado: o HUD de tela (PC/celular) lê daqui
    this.s.banner = { t: 0, title, sub };
    const { g, canvas, tex } = this.banner;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = 'rgba(5,2,12,0.9)'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.strokeStyle = '#FFC93C'; g.lineWidth = 5;
    g.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    g.textAlign = 'center';
    g.fillStyle = '#FFC93C'; g.font = 'bold 88px system-ui, sans-serif';
    g.fillText(title, canvas.width / 2, 130);
    g.fillStyle = '#cfd8e3'; g.font = '40px system-ui, sans-serif';
    this._wrap(g, sub, canvas.width / 2, 208, canvas.width - 110, 50);
    tex.needsUpdate = true;
    this.banner.mesh.visible = true;
  }

  // ------------------------------------------------------------- física
  _aabb(o) {
    const p = this.pl.pos, h = this.pl.h, r = P.RADIUS;
    o.minx = p.x - r; o.maxx = p.x + r;
    o.miny = p.y; o.maxy = p.y + h;
    o.minz = p.z - r; o.maxz = p.z + r;
    return o;
  }

  _solids() {
    const out = this._solidBuf || (this._solidBuf = []);
    out.length = 0;
    for (const b of this.level.blocks) out.push(b);
    for (const m of this.level.movers) if (m.box) out.push(m.box);
    // parede-scanner só é sólida para quem o sistema NÃO reconhece
    if (!this.s.maskOn) {
      for (const sc of this.level.scanners) {
        out.push({ x: 0, y: this.level.def.h / 2, z: sc.z, hx: sc.w / 2, hy: sc.h / 2, hz: 0.25, kind: 'scan' });
      }
    }
    return out;
  }

  _moveAxis(axis, d) {
    if (!d) return;
    const p = this.pl.pos;
    p[axis] += d;
    const a = this._aabb(this._a || (this._a = {}));
    for (const b of this._solids()) {
      if (a.maxx <= b.x - b.hx || a.minx >= b.x + b.hx) continue;
      if (a.maxy <= b.y - b.hy || a.miny >= b.y + b.hy) continue;
      if (a.maxz <= b.z - b.hz || a.minz >= b.z + b.hz) continue;
      if (axis === 'y') {
        if (d < 0) { p.y = b.y + b.hy; this.pl.vel.y = 0; this.pl.onGround = true; this.pl.ground = b; }
        else { p.y = b.y - b.hy - this.pl.h; this.pl.vel.y = 0; }
      } else if (axis === 'x') {
        p.x = d > 0 ? b.x - b.hx - P.RADIUS : b.x + b.hx + P.RADIUS;
        this.pl.vel.x = 0;
      } else {
        p.z = d > 0 ? b.z - b.hz - P.RADIUS : b.z + b.hz + P.RADIUS;
        this.pl.vel.z = 0;
      }
      this._aabb(a);
    }
  }

  // Só dá para levantar se houver espaço acima (senão o jogador atravessa o teto).
  _canStand() {
    const p = this.pl.pos;
    const a = { minx: p.x - P.RADIUS, maxx: p.x + P.RADIUS, miny: p.y, maxy: p.y + P.STAND_H, minz: p.z - P.RADIUS, maxz: p.z + P.RADIUS };
    for (const b of this._solids()) {
      if (a.maxx <= b.x - b.hx || a.minx >= b.x + b.hx) continue;
      if (a.maxy <= b.y - b.hy || a.miny >= b.y + b.hy) continue;
      if (a.maxz <= b.z - b.hz || a.minz >= b.z + b.hz) continue;
      return false;
    }
    return true;
  }

  // ------------------------------------------------------------- simulação
  _step(dt) {
    const s = this.s, pl = this.pl, lv = this.level;
    s.t += dt;
    if (!s.done) s.left = Math.max(0, s.left - dt);
    if (s.ayaT > 0) { s.ayaT -= dt; if (s.ayaT <= 0) { s.aya = ''; this._subDirty = true; } }
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.4);
    if (s.hurt > 0) s.hurt = Math.max(0, s.hurt - dt * 1.8);
    if (s.invuln > 0) s.invuln -= dt;
    if (s.shotCd > 0) s.shotCd -= dt;
    if (s.banner) { s.banner.t += dt; if (s.banner.t > 2.6) { s.banner = null; this.banner.mesh.visible = false; } }

    this._mask(dt);
    this._movers(dt);
    this._player(dt);
    this._pickups();
    this._hazards(dt);
    this._drones(dt);
    this._shooting(dt);
    if (s.boss) this._boss(dt);
    this._gate();
    this._narra();

    if (s.left <= 0 && !s.done) this._death(true);
  }

  // --- máscara: a escolha central do jogo ---------------------------------
  _mask(dt) {
    const s = this.s;
    if (!s.maskHave) { s.maskOn = false; return; }
    const estava = s.maskOn;
    if (this.tap.mask) {
      this.tap.mask = false;
      if (s.maskLock <= 0) {
        s.maskOn = !s.maskOn;
        this.sfx.purify();
        if (s.maskOn) this._sayOnce('mask_on', 6);
      }
    }
    if (s.maskLock > 0) { s.maskLock -= dt; s.maskOn = false; }
    if (s.maskOn) {
      s.maskHeat += dt;
      if (s.maskHeat >= P.MASK_MAX) {
        s.maskHeat = P.MASK_MAX; s.maskOn = false; s.maskLock = P.MASK_COOL;
        this._sayOnce('mask_hot', 5);
        this.sfx.corrupt();
        this._say(STR.aya.mask_hot, 4);
      }
    } else {
      s.maskHeat = Math.max(0, s.maskHeat - P.MASK_REGEN * dt);
    }
    if (estava && !s.maskOn) this._saiDoScanner();
  }

  // TIRAR A MÁSCARA DENTRO DA PAREDE ATIRAVA O JOGADOR PARA CIMA.
  //
  // A parede-scanner só é sólida para quem o sistema não reconhece: de máscara
  // ela deixa passar, e é assim que a fase 2 funciona. Só que nada impedia
  // tirar a máscara com o corpo NO MEIO dela, e aí a parede aparecia em volta
  // de um jogador que já estava dentro. Quem resolvia isso era a colisão do
  // quadro seguinte, no eixo Y, descendo: a regra dela é "pousou em cima do
  // bloco", então ela punha o jogador no TOPO da parede. A parede vai do chão
  // ao teto, e era esse o arremesso.
  //
  // Vale para os dois jeitos de a máscara sair, o botão e o superaquecimento,
  // e o segundo não dá para proibir: a máscara acaba onde ela acabar.
  //
  // A saída é pela face mais perto em Z, que é a espessura da parede (meio
  // metro). O jogador é cuspido para o lado de onde veio ou para o de lá,
  // o que estiver mais perto, que é o que a leitura da cena pede: a parede
  // rejeitou você.
  _saiDoScanner() {
    const lv = this.level, p = this.pl.pos;
    if (!lv || !lv.scanners || !lv.scanners.length) return;
    const r = P.RADIUS, alto = this.pl.h;
    for (const sc of lv.scanners) {
      const hz = 0.25;
      if (Math.abs(p.z - sc.z) >= hz + r) continue;
      if (Math.abs(p.x) >= sc.w / 2 + r) continue;
      const meio = lv.def.h / 2, hy = sc.h / 2;   // a mesma caixa que `_solids` monta
      if (p.y >= meio + hy || p.y + alto <= meio - hy) continue;
      const fora = hz + r + 0.02;
      p.z = p.z < sc.z ? sc.z - fora : sc.z + fora;
      this.pl.vel.z = 0;
      this.sfx.corrupt();
      return;
    }
  }

  _movers(dt) {
    const lv = this.level;
    for (let i = 0; i < lv.movers.length; i++) {
      const m = lv.movers[i];
      // cx = centro do vaivém. Era fixo no meio do corredor, então uma
      // plataforma posta à mão na lateral pulava para o centro sozinha.
      const x = (m.cx || 0) + Math.sin(this.s.t * m.speed + m.phase) * m.ax;
      // a caixa é REAPROVEITADA, não recriada: pl.ground guarda a referência do
      // frame anterior e recriar o objeto quebrava o "carregar o jogador".
      if (!m.box) m.box = { x, y: m.y, z: m.z, hx: m.hx, hy: m.hy, hz: m.hz, kind: 'mover', mover: i };
      m.dx = x - m.box.x;
      m.box.x = x;
      if (this.moverMeshes[i]) this.moverMeshes[i].position.set(x, m.y, m.z);
    }
    for (let i = 0; i < lv.crushers.length; i++) {
      const c = lv.crushers[i];
      // Ciclo de PRENSA, nao de pendulo: 15% do tempo despencando, 20%
      // esmagada no chao, 65% subindo devagar. O seno antigo descia tao
      // manso quanto subia e nao assustava ninguem.
      const u = ((this.s.t * c.speed + c.phase) / (Math.PI * 2)) % 1;
      let k;
      if (u < 0.15) k = (u / 0.15) * (u / 0.15);          // queda acelerando
      else if (u < 0.35) k = 1;                            // esmaga
      else k = 1 - (u - 0.35) / 0.65;                      // sobe devagar
      c.y = c.top - k * c.drop;
      if (this.crushMeshes[i]) this.crushMeshes[i].position.set(c.x, c.y, c.z);
    }
  }

  _player(dt) {
    const s = this.s, pl = this.pl;
    // Morto: o corpo cai e para. Antes o `_player` continuava lendo o teclado
    // e o analógico depois da morte, e o golpe fatal ainda dava um empurrão
    // para cima: você era lançado e ficava andando solto pelos 2,4 s de
    // "APAGADO DO QUADRO", como se nada tivesse acontecido.
    const morto = !!s.morto;

    // --- agachar: no VR vale a altura REAL do capacete
    let wantDuck = this.held.has('duck') || this.duckBtn || this.duckPad;
    // Agachar pelo BOTAO e agachar de VERDADE sao coisas diferentes dentro do
    // oculos. Quem agacha de verdade ja teve a visao abaixada pelo proprio
    // capacete; quem apertou o botao nao teve nada acontecendo, e era por isso
    // que agachar no VR so deixava lento, sem nenhum sinal na tela.
    const agachouNoBotao = wantDuck;
    if (this.renderer.xr.isPresenting) {
      wantDuck = wantDuck || this.camera.position.y < this.vrLimiteAgachar;
    }
    this._duckVirtual = agachouNoBotao;
    const targetH = wantDuck ? P.CROUCH_H : (this._canStand() ? P.STAND_H : P.CROUCH_H);
    pl.h += (targetH - pl.h) * Math.min(1, dt * 14);

    // --- direção do andar, projetada no chão
    let fwd = 0, str = 0;
    if (!morto) {
      if (this.held.has('fwd')) fwd += 1;
      if (this.held.has('back')) fwd -= 1;
      if (this.held.has('sright')) str += 1;
      if (this.held.has('sleft')) str -= 1;
      fwd += this.stick.y; str += this.stick.x;
      if (this._padMove) { fwd += this._padMove.y; str += this._padMove.x; }
      if (this.renderer.xr.isPresenting) {
        const v = this._xrSticks(dt); fwd += v.y; str += v.x;
        this._giroCabeca(dt);   // depois do analógico: os dois somam no mesmo giro
      }
    }

    this.camera.getWorldDirection(_v1);
    _v1.y = 0;
    if (_v1.lengthSq() > 1e-6) _v1.normalize(); else _v1.set(0, 0, -1);
    _v2.set(-_v1.z, 0, _v1.x);

    const mag = Math.min(1, Math.hypot(fwd, str));
    _v3.copy(_v1).multiplyScalar(fwd).addScaledVector(_v2, str);
    if (_v3.lengthSq() > 1e-6) _v3.normalize();

    let maxSpd = (pl.h < (P.STAND_H + P.CROUCH_H) / 2 ? P.CROUCH_SPEED : P.SPEED);
    // Em VR a mesma velocidade que e boa no monitor da enjoo: o corpo esta
    // parado e os olhos veem 5,4 m/s, que e ritmo de corrida.
    if (this.renderer.xr.isPresenting) maxSpd *= 0.62;
    const ctrl = pl.onGround ? 1 : P.AIR_CTRL;
    const wishX = _v3.x * maxSpd * mag, wishZ = _v3.z * maxSpd * mag;
    pl.vel.x += (wishX - pl.vel.x) * Math.min(1, P.ACCEL * ctrl * dt / maxSpd);
    pl.vel.z += (wishZ - pl.vel.z) * Math.min(1, P.ACCEL * ctrl * dt / maxSpd);
    if (!mag && pl.onGround) {
      const f = Math.max(0, 1 - P.FRICTION * dt);
      pl.vel.x *= f; pl.vel.z *= f;
    }
    // morto freia no ar também: o corpo cai onde foi atingido, não desliza
    if (morto) {
      const f = Math.max(0, 1 - 7 * dt);
      pl.vel.x *= f; pl.vel.z *= f;
    }

    // --- pulo com coyote time e buffer (§8: entrada perdoa quase-acertos)
    if (this.tap.jump) { this.tap.jump = false; if (!morto) pl.jumpBuf = P.JUMP_BUF; }
    if (pl.jumpBuf > 0) pl.jumpBuf -= dt;
    if (pl.onGround) pl.coyote = P.COYOTE; else if (pl.coyote > 0) pl.coyote -= dt;
    if (pl.jumpBuf > 0 && pl.coyote > 0) {
      pl.vel.y = P.JUMP; pl.jumpBuf = 0; pl.coyote = 0; pl.onGround = false;
      this.sfx.lock();
    }

    // --- gravidade e resolução por eixo
    pl.vel.y = Math.max(P.TERM_VEL, pl.vel.y - P.GRAV * dt);
    const wasGround = pl.onGround;
    pl.onGround = false;
    if (pl.ground && pl.ground.kind === 'mover' && wasGround) {
      const mv = this.level.movers[pl.ground.mover];
      if (mv) pl.pos.x += mv.dx;
    }
    pl.ground = null;

    this._moveAxis('x', pl.vel.x * dt);
    this._moveAxis('z', pl.vel.z * dt);
    this._moveAxis('y', pl.vel.y * dt);

    // caiu no vazio
    if (pl.pos.y < -12) this._death(false);

    // o rig segue os pés do jogador; a câmera fica na altura do olho
    // No oculos, o agachar do botao vira uma descida do rig: e o mundo que
    // sobe em volta de voce, que e' a unica forma honesta de mostrar isso sem
    // mexer na cabeca de quem esta jogando. Suavizado, senao e um solavanco.
    const alvoDuck = (this.renderer.xr.isPresenting && this._duckVirtual)
      ? (P.STAND_H - P.CROUCH_H) : 0;
    this._duckOff = (this._duckOff || 0) + (alvoDuck - (this._duckOff || 0)) * Math.min(1, dt * 9);
    this.rig.position.set(pl.pos.x,
      pl.pos.y + (this.renderer.xr.isPresenting ? (this.vrYOff || 0) - this._duckOff : 0), pl.pos.z);
    if (!this.renderer.xr.isPresenting) this.camera.position.set(0, pl.h - P.EYE_OFF, 0);
  }

  // A HISTÓRIA, contada enquanto se anda.
  //
  // As falas da AYA eram todas presas a eventos — achar a máscara, encostar
  // num feixe, ver um drone. A fase 1 não tem nenhum deles, então ela dava bom
  // dia e sumia: dois minutos de corredor em silêncio.
  //
  // Aqui a próxima linha entra quando o jogador passa da fração de corredor
  // que ela pede. Duas regras a mantêm fora do caminho: nunca fala por cima de
  // outra fala (espera a legenda anterior sair), e nunca volta atrás, porque o
  // índice só avança.
  _narra() {
    const s = this.s, lv = this.level;
    const roteiro = (STR.narrativa || [])[s.phase];
    if (!roteiro || s.narrI >= roteiro.length) return;
    if (s.ayaT > 0) return;                       // tem legenda na tela agora

    const total = Math.abs(lv.end) || 1;
    const andado = Math.min(1, Math.max(0, -this.pl.pos.z / total));
    const proxima = roteiro[s.narrI];
    if (andado < proxima.em) return;

    s.narrI++;
    // 4,5 s por linha, mais um tempinho proporcional ao tamanho do texto: as
    // falas longas desta narração não cabem na duração fixa das falas curtas
    // de evento.
    this._say(proxima.t, 4.5 + proxima.t.length * 0.035);
  }

  _pickups() {
    const s = this.s, lv = this.level, pl = this.pl;
    _v1.set(pl.pos.x, pl.pos.y + pl.h * 0.6, pl.pos.z);

    // Pedaços do rosto: dá para recolher de máscara também. Antes a máscara
    // bloqueava a coleta e o jogador ficava travado sem entender por quê,
    // ainda mais agora que ela vai para o rosto assim que você a pega. O
    // custo da máscara continua sendo o superaquecimento.
    for (let i = 0; i < lv.frags.length; i++) {
      const f = lv.frags[i];
      if (f.taken) continue;
      const d = Math.hypot(f.x - _v1.x, f.y - _v1.y, f.z - _v1.z);
      if (d > P.FRAG_R) continue;
      f.taken = true;
      s.frags++;
      if (this.fragMeshes[i]) this.fragMeshes[i].visible = false;
      this.sfx.feed(s.frags);
      this._sayOnce('first_frag', 4);
      if (s.frags >= s.need) { this._setObjective(STR.obj_gate); this._sayOnce('gate_ready', 5); }
    }

    // A MÁSCARA BRANCA: achou, encostou, o poder é seu. O raio de coleta é o
    // mesmo P.MASK_PICK_R do resto do jogo (2,6 m) e não 1,7: com 1,7 dava para
    // passar raspando ao lado da máscara sem pegar, e ela é o item que decide
    // se a fase tem saída ou não.
    const itens = lv.maskItems || [];
    for (let i = 0; i < itens.length; i++) {
      const mi = itens[i];
      if (mi.taken) continue;
      if (Math.hypot(mi.x - _v1.x, mi.y - _v1.y, mi.z - _v1.z) > P.MASK_PICK_R) continue;
      mi.taken = true;
      s.maskHave = true;             // o PODER e seu; vestir e decisao sua, no botao
      s.pegouT = s.t;
      s.masksGot++;
      this.sfx.purify();
      if (s.hunt) { this._huntObjective(); this.sfx.feed(s.masksGot); }
      this._sayOnce('mask_found', 8);
    }

    // ---- pedestal do rosto
    if (this.faceMask && !s.deposto) {
      const cheio = s.need ? Math.min(1, s.frags / s.need) : 0;
      if (s.depT == null) {
        // o rosto no pedestal acende na medida do que você já juntou
        this.faceMask.material.opacity = 0.16 + cheio * 0.5;
        this.faceMask.material.color.setHex(cheio >= 1 ? 0xFFC93C : 0x6a6390);
        this.faceHalo.material.opacity = cheio >= 1 ? 0.25 + Math.sin(s.t * 3) * 0.10 : 0;
        const pp = this.facePed.position;
        if (cheio >= 1 && Math.hypot(pp.x - pl.pos.x, pp.z - pl.pos.z) < 2.6) {
          s.depT = s.t;
          this.sfx.lock();
        }
      } else {
        const a = Math.min(1, (s.t - s.depT) / 1.6);
        this.faceMask.material.opacity = 0.66 + a * 0.34;
        this.faceMask.material.color.setHex(0xFFFFFF);
        this.faceMask.scale.setScalar(1 + a * 0.25);
        this.faceHalo.material.opacity = 0.25 + a * 0.65;
        this.faceHalo.scale.setScalar(1 + a * 0.6);
        if (a >= 1) {
          s.depT = null;
          s.deposto = true;
          this.sfx.pulse();
          this._sayOnce('face_done', 7);
        }
      }
    }

    // a máscara pegada cresce e some no lugar em que estava: sem isso ela
    // simplesmente pisca para fora da tela e o momento não acontece
    if (s.pegouT != null) {
      const a = Math.min(1, (s.t - s.pegouT) / 0.8);
      for (let i = 0; i < this.maskItemMeshes.length; i++) {
        const g2 = this.maskItemMeshes[i];
        if (!g2 || !g2.visible || !itens[i] || !itens[i].taken) continue;
        g2.userData.sp.scale.setScalar(0.8 * (1 + a * 0.9));
        g2.userData.sp.material.opacity = 1 - a;
        g2.userData.ha.scale.setScalar(1.9 * (1 + a));
        g2.userData.ha.material.opacity = 0.7 * (1 - a);
        g2.userData.lb.material.opacity = 1 - a;
        if (a >= 1) g2.visible = false;
      }
      if (a >= 1) s.pegouT = null;
    }
  }

  _hazards(dt) {
    const s = this.s, lv = this.level, pl = this.pl;

    // Movimento dos feixes e das câmeras roda SEMPRE, com a máscara eles só
    // deixam de te ver, não congelam no lugar.
    for (let i = 0; i < lv.beams.length; i++) {
      const b = lv.beams[i];
      b.cz = b.z + Math.sin(s.t * b.speed + b.phase) * b.range;
      // A fala existia em strings.js e NADA a disparava: a AYA nunca ensinava
      // a agachar nem a pular. Ensina no lugar certo, que e' chegando no feixe.
      if (Math.abs(pl.pos.z - b.cz) < 9) this._sayOnce(b.kind === 'low' ? 'duck' : 'jump', 5);
      const bm = this.beamMeshes[i];
      if (bm) {
        bm.position.z = b.cz;
        // pulso: luz viva respira. sem isso o feixe parece um adesivo colado.
        const u = bm.userData;
        const k = 0.82 + Math.sin(s.t * 5.5 + u.fase) * 0.18;
        // Estes numeros TEM que bater com os da criacao do feixe: aqui era
        // 0,55 / 0,10 / 0,13, os valores antigos, e o pulso apagava a cada
        // frame o corpo que o feixe tinha ganhado.
        u.mid.material.opacity = 0.72 * k;
        u.halo.material.opacity = 0.17 * k;
        u.halo.scale.set(k, 1, k);
        u.poca.position.z = b.cz;
        u.poca.material.opacity = 0.18 * k;
        if (u.risco) u.risco.material.opacity = 0.60 * k;
      }
    }
    for (let i = 0; i < lv.cams.length; i++) {
      const c = lv.cams[i];
      // c.ang é a direção do eixo do cone no plano XZ (0 = +x). O mesh gira
      // com rotation.y = PI - dir porque o cone local aponta para -x.
      c.dir = c.ang + Math.sin(s.t * c.speed + c.phase) * c.sweep;
      if (this.camMeshes[i]) this.camMeshes[i].rotation.y = Math.PI - c.dir;
      if (this.camMeshes[i]) this.camMeshes[i].userData.cone.material.opacity = s.maskOn ? 0.03 : 0.10;
    }

    if (s.maskOn) {
      // o sistema te reconhece: nada de sensor te enxerga
      for (const c of lv.cams) c.alarm = Math.max(0, c.alarm - dt);
    } else {
      // --- feixes de varredura
      for (const b of lv.beams) {
        if (Math.abs(pl.pos.z - b.cz) > 0.30 + P.RADIUS) continue;
        if (b.y >= pl.pos.y && b.y <= pl.pos.y + pl.h) this._hit();
      }
      // --- câmeras: dentro do alcance E dentro do cone (por produto escalar,
      // sem malabarismo de atan2: a versão angular apontava o cone pra parede)
      for (const c of lv.cams) {
        const vx = pl.pos.x - c.x, vz = pl.pos.z - c.z;
        const d = Math.hypot(vx, vz);
        if (d > c.range || d < 0.001) { c.alarm = Math.max(0, c.alarm - dt); continue; }
        const cosang = (vx * Math.cos(c.dir) + vz * Math.sin(c.dir)) / d;
        if (cosang > Math.cos(c.cone)) {
          c.alarm += dt;
          this._sayOnce('cam', 5);
          if (c.alarm > 1) {
            // Alarme disparado. Antes: c.alarm = 0 e dano na hora, o que com
            // invulnerabilidade de 1,3 s virava um liquidificador: a camera
            // rebatia a cada 1,3 s e comia as tres vidas em 8 s de fase,
            // medido com um bot andando em linha reta. Agora a camera que
            // acertou entra em recarga de 3 s. E na CACADA ela nao machuca:
            // vigia e cenario, monstro e o drone.
            c.alarm = -3;
            if (s.hunt) this.sfx.corrupt();
            else this._hit();
          }
        } else c.alarm = Math.max(0, c.alarm - dt);
      }
    }

    // --- prensas machucam com ou sem máscara (é máquina, não é sensor)
    for (const c of lv.crushers) {
      if (Math.abs(pl.pos.x - c.x) > c.hx + P.RADIUS) continue;
      if (Math.abs(pl.pos.z - c.z) > c.hz + P.RADIUS) continue;
      if (c.y - 0.8 < pl.pos.y + pl.h && c.y + 0.8 > pl.pos.y) this._hit();
    }

    // dicas contextuais
    for (const b of lv.beams) {
      if (Math.abs(pl.pos.z - b.z) < 7) this._sayOnce(b.kind === 'low' ? 'duck' : 'jump', 4);
    }
    for (const sc of lv.scanners) {
      const dz = pl.pos.z - sc.z;   // > 0 = ainda não chegou nela
      if (dz > 0 && dz < 16 && s.maskHave && !s.maskOn && !s.done) {
        // Diz o QUE fazer e o PORQUÊ, no momento em que a informação serve.
        // O pedestal sozinho entregava o item sem nunca explicar para quê.
        this._setObjective(STR.obj_mask);
      }
      if (Math.abs(dz) >= 7) continue;
      this._sayOnce('scan', 5);
      // Rede de segurança: a parede-scanner é sólida para quem não está de
      // máscara. Chegar aqui sem ela, por ter passado reto pela máscara larga-
      // da atrás, era beco sem saída, sem nada na tela explicando o porquê.
      if (!s.maskHave) {
        s.maskHave = true;
        for (const mi of (lv.maskItems || [])) mi.taken = true;
        for (const g2 of this.maskItemMeshes) if (g2) g2.visible = false;
        this.sfx.purify();
        this._sayOnce('mask_found', 7);
      }
    }
  }

  _drones(dt) {
    const s = this.s, lv = this.level, pl = this.pl;
    _v1.set(pl.pos.x, pl.pos.y + pl.h * 0.7, pl.pos.z);
    for (let i = 0; i < lv.drones.length; i++) {
      const d = lv.drones[i];
      const mesh = this.droneMeshes[i];
      if (d.dead) { if (mesh) mesh.visible = false; continue; }
      if (!d.home) d.home = { x: d.x, y: d.y, z: d.z };
      d.phase += dt;
      const px = d.x, py = d.y, pz = d.z;   // de onde ele saiu neste quadro

      const dist = Math.hypot(d.x - _v1.x, d.y - _v1.y, d.z - _v1.z);

      // LINHA DE VISÃO. Eles enxergavam e atiravam ATRAVÉS de parede: o teste
      // era só distância. Com isso, a meia-parede — que existe justamente para
      // ser cobertura — não protegia de nada.
      //
      // O traçado é caro para rodar por drone a cada quadro, então o resultado
      // fica guardado e é refeito 5 vezes por segundo. Um drone leva no máximo
      // 0,2 s para perceber que você se escondeu, o que é justo dos dois lados.
      d.losT = (d.losT || 0) - dt;
      if (d.losT <= 0) {
        d.losT = 0.2;
        d.los = dist < P.DRONE_SIGHT &&
          !this._bloqueado(d.x, d.y, d.z, _v1.x, _v1.y, _v1.z);
      }
      const vendo = !s.maskOn && dist < P.DRONE_SIGHT && d.los;

      if (vendo) {
        // CAÇA. Mantém a distância de tiro e circula o jogador. O deslize
        // lateral é o que obriga a acompanhar a mira: contra um alvo parado,
        // atirar é clicar uma vez e esperar.
        const dx = _v1.x - d.x, dz = _v1.z - d.z;
        const dh = Math.hypot(dx, dz) || 1;
        const aprox = (dh - P.DRONE_KEEP) * 0.9;                  // + aproxima, − recua
        const lado = Math.sin(d.phase * P.DRONE_STRAFE) * P.DRONE_SPEED;
        d.x += ((dx / dh) * aprox + (-dz / dh) * lado) * dt;
        d.z += ((dz / dh) * aprox + (dx / dh) * lado) * dt;
        d.y += (_v1.y + 0.7 - d.y) * 1.4 * dt;                    // encara na altura do rosto
      } else {
        // PATRULHA. Vagar devagar em volta de onde nasceu, com uma mola
        // puxando de volta: sem ela o drone iria embora somando senos.
        d.x += Math.cos(d.phase * 0.7) * P.DRONE_PATROL * dt;
        d.z += Math.sin(d.phase * 0.45) * P.DRONE_PATROL * dt;
        d.x += (d.home.x - d.x) * 0.4 * dt;
        d.z += (d.home.z - d.z) * 0.4 * dt;
        d.y += (d.home.y - d.y) * 0.8 * dt;
      }

      // COLEIRA EM RAIO. O drone não sabe onde estão as paredes; em vez de dar
      // colisão a cada um (e pagar isso por quadro), ele fica preso a um
      // círculo em volta de onde nasceu, mais a largura do corredor.
      //
      // Antes o limite era por eixo — 7 m em x E 7 m em z — o que pela
      // diagonal permitia 10 m de casa: era assim que eles escapavam para o
      // trecho vizinho. Puxar o vetor inteiro de volta resolve, e de quebra o
      // drone desliza pela borda em vez de travar na quina do retângulo.
      const hw = lv.def.w / 2 - 1.0;
      const ex = d.x - d.home.x, ez = d.z - d.home.z;
      const fora = Math.hypot(ex, ez);
      if (fora > P.DRONE_LEASH) {
        const f = P.DRONE_LEASH / fora;
        d.x = d.home.x + ex * f;
        d.z = d.home.z + ez * f;
      }
      d.x = Math.max(-hw, Math.min(hw, d.x));
      d.y = Math.max(1.3, Math.min(lv.def.h - 0.8, d.y));

      // PAREDE É PAREDE, também para eles. Se o passo terminou dentro de um
      // sólido, ele é desfeito um eixo por vez — assim o drone DESLIZA pela
      // parede em vez de travar na quina, e só volta ao ponto anterior quando
      // nenhum dos dois eixos serve.
      if (this._dentroSolido(d.x, d.y, d.z)) {
        if (!this._dentroSolido(px, d.y, d.z)) d.x = px;
        else if (!this._dentroSolido(d.x, d.y, pz)) d.z = pz;
        else { d.x = px; d.y = py; d.z = pz; }
      }

      const y = d.y + Math.sin(d.phase * 2.4) * 0.22;
      if (mesh) {
        mesh.position.set(d.x, y, d.z);
        // Agora que é malha 3D, ele APONTA: encara quem está caçando, e vaga
        // girando devagar quando não viu ninguém. É informação de graça — dá
        // para saber se você foi visto olhando para onde ele está virado.
        // Vendo você, ele encara. Sem ver: fica na direção que o editor
        // escolheu (`yaw`), ou gira devagar se ninguém escolheu nenhuma — que
        // é o jeito de quem está só patrulhando.
        if (vendo) { _v2.set(_v1.x, y, _v1.z); mesh.lookAt(_v2); }
        else if (d.yaw != null) mesh.rotation.y = d.yaw;
        else mesh.rotation.y += dt * 0.7;
        const c = mesh.userData.corpo;
        if (c) c.rotation.z = Math.sin(d.phase * 1.3) * 0.13;   // inclina no voo
      }

      if (!vendo) continue;
      this._sayOnce('drone', 5);
      d.cd -= dt;
      if (d.cd <= 0) {
        d.cd = P.DRONE_CD;
        _v2.set(_v1.x - d.x, _v1.y - y, _v1.z - d.z).normalize();
        s.shots.push({ pos: new THREE.Vector3(d.x, y, d.z), vel: _v2.clone().multiplyScalar(P.DRONE_SHOT), t: 0 });
      }
    }

    // projéteis dos drones
    for (let i = s.shots.length - 1; i >= 0; i--) {
      const sh = s.shots[i];
      sh.t += dt;
      sh.pos.addScaledVector(sh.vel, dt);
      if (sh.t > 3) { s.shots.splice(i, 1); continue; }
      // parede segura tiro: e o que faz as meias-paredes serem COBERTURA
      let naParede = false;
      for (const b2 of lv.blocks) {
        if (b2.kind === 'floor') continue;
        if (Math.abs(sh.pos.x - b2.x) <= b2.hx && Math.abs(sh.pos.y - b2.y) <= b2.hy &&
            Math.abs(sh.pos.z - b2.z) <= b2.hz) { naParede = true; break; }
      }
      if (naParede) { s.shots.splice(i, 1); continue; }
      // bola do chefe tem raio de acerto próprio, maior que o tiro de drone
      if (!s.maskOn && sh.pos.distanceTo(_v1) < (sh.hit || 0.6)) { this._hit(); s.shots.splice(i, 1); }
    }
    this._syncShots();
  }

  _syncShots() {
    if (!this.shotPool) {
      this.shotPool = [];
      for (let i = 0; i < 24; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.tex.ringM, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        sp.scale.set(0.4, 0.4, 1);
        sp.visible = false;
        this.scene.add(sp);
        this.shotPool.push(sp);
      }
    }
    const list = this.s.shots;
    for (let i = 0; i < this.shotPool.length; i++) {
      const sp = this.shotPool[i];
      if (i < list.length) {
        sp.visible = true;
        sp.position.copy(list[i].pos);
        // `r` só existe nas bolas do chefe: elas são maiores e mais lentas,
        // para dar para ver chegando e desviar
        const r = list[i].r || 0.4;
        sp.scale.set(r, r, 1);
      } else sp.visible = false;
    }
  }

  // O CONTROLE QUE ESTÁ COM A ARMA. Normalmente o direito, mas o aparelho é
  // quem diz de que lado cada controle está, e enquanto ele não disser vale o
  // palpite feito na montagem. Fora do óculos não existe controle nenhum.
  _ctrlArmado() {
    if (!this.renderer.xr.isPresenting || !this.controllers) return null;
    if (this.maoArmada != null && this.controllers[this.maoArmada]) return this.controllers[this.maoArmada];
    return this.controllers.find((c) => c.userData.arma && c.userData.arma.visible) ||
           (this.activeCtrl != null ? this.controllers[this.activeCtrl] : null);
  }

  _shooting(dt) {
    const s = this.s;
    const firing = this.mode === 'playing' && !s.morto && (this.mouseDown || this.xrTrigger >= 0 || this._padTrig);
    // o traço fica visível por um tempinho próprio: apagar no frame seguinte
    // deixava o tiro invisível na prática
    // a bala em voo: anda da boca do cano até o impacto e acende o clarão lá
    if (s.bala) {
      s.bala.t += dt;
      const k = Math.min(1, s.bala.t / s.bala.dur);
      this.shotBala.visible = true;
      this.shotBala.position.copy(s.bala.de).lerp(s.bala.ate, k);
      if (k >= 1) {
        this.shotBala.visible = false;
        this.shotFlash.visible = true;
        this.shotFlash.position.copy(s.bala.ate);
        this.shotFlash.material.color.setHex(s.bala.cor);
        s.flashVis = 0.18;
        s.bala = null;
      }
    }

    // coice da arma
    if (this.weapon) {
      const w = this.weapon;
      this.weaponKick = Math.max(0, this.weaponKick - dt * 7);
      w.position.z = w.userData.base + this.weaponKick * 0.05;
      w.rotation.x = 0.04 + this.weaponKick * 0.28;
      // em VR a arma vai na MÃO, presa ao controle: a da câmera some
      w.visible = !this.renderer.xr.isPresenting;
    }
    // o coice vai na arma da mão armada, que é a única que existe
    if (this.renderer.xr.isPresenting) {
      const c = this._ctrlArmado();
      const a = c && c.userData.arma;
      if (a) {
        a.position.z = a.userData.base + this.weaponKick * 0.05;
        a.rotation.x = this.weaponKick * 0.28;
      }
    }
    if (s.flashVis > 0) {
      s.flashVis -= dt;
      const k = Math.max(0, s.flashVis / 0.22);
      this.shotFlash.material.opacity = k;
      this.shotFlash.scale.setScalar(0.7 + (1 - k) * 2.2);   // o clarão se abre
      if (s.flashVis <= 0) this.shotFlash.visible = false;
    }
    if (!firing || s.shotCd > 0) return;
    s.shotCd = P.SHOT_CD;
    this.weaponKick = 1;

    // Quem mira é a mão que segura a arma, tenha sido qual gatilho for. Com
    // uma arma só, deixar o tiro sair do controle que apertou faria a mão
    // vazia mirar, que é o que ninguém entende.
    const ctrl = this._ctrlArmado();
    const src = ctrl || this.camera;
    src.getWorldPosition(_v1);
    src.getWorldQuaternion(_q1);
    _v2.set(0, 0, -1).applyQuaternion(_q1).normalize();

    // acerto por cone: janela generosa, senão mirar em VR vira sofrimento.
    // O alvo escolhido é o de menor ângulo RELATIVO à própria tolerância, para
    // um drone longe e centrado ganhar de um perto e de raspão.
    // o traço começa parando na parede; se um drone for acertado, encurta até ele
    let hit = null, best = 1, hitD = this._alcanceLivre(_v1, _v2, P.SHOT_RANGE);
    const lv = this.level;
    for (let i = 0; i < lv.drones.length; i++) {
      const d = lv.drones[i];
      if (d.dead) continue;
      _v3.set(d.x - _v1.x, d.y - _v1.y, d.z - _v1.z);
      const dist = _v3.length();
      if (dist > P.SHOT_RANGE) continue;
      _v3.multiplyScalar(1 / dist);
      const ang = Math.acos(Math.max(-1, Math.min(1, _v3.dot(_v2))));
      // A janela acompanha o TAMANHO REAL do drone na tela (raio ~0,45 m), sem
      // inflar: acertar passa a ser pôr a mira em cima dele. O fator 1,15 é a
      // única folga, e existe para o VR, onde apontar com o braço nunca é tão
      // preciso quanto com o mouse.
      const tol = Math.max(P.SHOT_TOL, Math.atan(0.45 / dist) * 1.15);
      const score = ang / tol;
      if (score < 1 && score < best) { best = score; hit = { d, i }; hitD = dist; }
    }

    // PAREDE SEGURA O TIRO. O alvo era escolhido só por ângulo e distância, e
    // o traço atravessava a geometria: dava para matar drone através da
    // meia-parede — e, pior, através da parede do corredor, sem nem ver o
    // alvo. Uma checagem por disparo, no alvo já escolhido.
    if (hit && this._bloqueado(_v1.x, _v1.y, _v1.z, hit.d.x, hit.d.y, hit.d.z)) hit = null;

    // O clarão não acende mais aqui: quem o acende é a CHEGADA da bala, senão
    // o impacto apareceria antes do projétil sair do cano.
    let acertouChefe = false;
    if (this.bossGroup && s.boss && s.boss.open) {
      this.bossGroup.getWorldPosition(_v3);
      _v3.sub(_v1);
      const dist = _v3.length();
      _v3.multiplyScalar(1 / dist);
      if (Math.acos(Math.max(-1, Math.min(1, _v3.dot(_v2)))) < 0.14) {
        s.boss.hp--; hitD = dist;
        acertouChefe = true;
        this.sfx.corrupt();
        if (s.boss.hp <= 0) this._winGame();
      }
    }

    if (hit) {
      hit.d.hp--;
      this.sfx.purify();
      if (hit.d.hp <= 0) {
        hit.d.dead = true; s.dronesKilled++; this.sfx.feed(s.dronesKilled);
        if (s.hunt) {
          this._huntObjective();
          if (this.level.drones.every((d) => d.dead)) this._sayOnce('hunt_done', 6);
        }
      }
    }

    // TRAÇO DO TIRO, saindo da BOCA DA ARMA.
    //
    // Ele nascia no olho da câmera, ou seja, no meio da tela: o disparo
    // aparecia do nada, sem relação com a arma que está na mão. Agora a ponta
    // de partida é a boca do cano.
    //
    // O ALVO continua sendo decidido pela mira, não pela arma. É de propósito:
    // se a direção saísse do cano, acertar dependeria de onde o modelo está
    // posicionado na tela, e mirar viraria adivinhação. O traço é só a
    // representação — quem manda é o centro da tela.
    const alvo = _v3.copy(_v1).addScaledVector(_v2, hitD);
    const origem = new THREE.Vector3();
    // o traço sai da BOCA do cano da arma que está na mão, e não da origem do
    // controle, que é um ponto invisível dentro do punho
    const w = ctrl ? ctrl.userData.arma : this.weapon;
    if (w && w.visible && w.userData.bocaLocal) {
      // ponto medido na malha: a ponta do cano, não a origem do grupo
      origem.copy(w.userData.bocaLocal);
      w.localToWorld(origem);
    } else if (w && w.visible) {
      w.getWorldPosition(origem);
    } else {
      origem.copy(_v1);                 // VR, ou antes do modelo carregar
    }

    // COMPRIMENTO DO RASTRO — separado do alcance da arma.
    //
    // Antes o risco ia da boca do cano até onde o tiro pararia. Com 38 m isso
    // era uma faixa atravessando a fase; mesmo com 20 m continua um feixe
    // aceso de ponta a ponta, e foi por isso que baixar o alcance não resolveu:
    // eu estava mexendo no numero errado.
    //
    // Agora o rastro é curto e sai do cano, como um projétil deixando um
    // risco atrás de si. Quem informa ONDE o tiro chegou é o clarão de
    // impacto, que já acende no alvo. O alcance segue sendo 20 m para efeito
    // de acerto — só o desenho encurtou.
    // A bala leva o mesmo tempo por metro em qualquer distância, com um mínimo
    // para o tiro de perto não ser instantâneo demais para o olho ver.
    const dist = origem.distanceTo(alvo);
    s.bala = {
      de: origem.clone(),
      ate: alvo.clone(),
      t: 0,
      dur: Math.max(0.05, dist * 0.007),
      // a cor do impacto diz o que foi atingido: ciano em drone, dourado no
      // chefe, cinza em parede
      cor: hit ? 0x00E5FF : (acertouChefe ? 0xFFC93C : 0x8fa0b4),
    };
  }

  // ==========================================================================
  // O CHEFE. Ciclo de três estágios que se repete até ele cair:
  //
  //   VARREDURA  dois feixes girando (um pede agachar, o outro pular)
  //   RAJADA     bolas miradas em você, feixes desligados
  //   ABERTO     a lente abre: é a ÚNICA janela em que ele toma dano
  //
  // Ele voa o tempo todo, e a cada abertura chama reforço. Antes era um alvo
  // parado com 8 de vida que só varria um feixe: dava para vencer sem sair do
  // lugar.
  // ==========================================================================
  _boss(dt) {
    const b = this.s.boss, pl = this.pl, lv = this.level;

    // centro da arena: é onde os feixes pivotam e em volta de que ele voa
    const arenaZ = lv.end + this.arenaLen / 2;
    const bocaZ = lv.end + this.arenaLen;        // onde a arena começa

    // ====================================================================
    // DORMENTE ATÉ VOCÊ ENTRAR.
    //
    // O chefe começava a lutar no instante em que a fase carregava: varria
    // feixes e cuspia bolas enquanto o jogador ainda estava 40 m atrás, no
    // corredor, recolhendo os pedaços. A luta acontecia sozinha, e o jogador
    // só apanhava de longe sem entender de onde vinha.
    //
    // Agora ele só acorda quando o jogador cruza a boca da arena. Antes disso
    // fica lá no fundo, respirando devagar, visível como ameaça — que é o que
    // dá à entrada o peso de uma porta.
    // ====================================================================
    if (!b.trancado && pl.pos.z > bocaZ) {
      b.dormindo = true;
      if (this.bossBeam) this.bossBeam.visible = false;
      if (this.bossBeamLow) this.bossBeamLow.visible = false;
      if (this.bossGroup) {
        // flutua no fundo, lente apagada, sem orbitar
        b.orbit += dt * 0.12;
        this.bossGroup.position.set(0, 4.2 + Math.sin(b.orbit) * 0.5, arenaZ);
        const u = this.bossGroup.userData;
        u.corpo.rotation.y += dt * 0.12;
        u.iris.material.color.setHex(0xFF2D9B);
        u.iris.material.opacity = 0.16;
        u.iris.scale.set(3.4, 3.4, 1);
      }
      // limiar aceso como aviso: "a luta é depois desta linha"
      if (this.bossDoor) {
        this.bossDoor.visible = true;
        this.bossDoor.material.opacity = 0.10 + Math.sin(this.s.t * 1.6) * 0.04;
      }
      return;
    }
    b.dormindo = false;
    b.t += dt;

    // ------------------------------------------------------------- a tranca
    // Ao entrar, a câmara sela atrás. Antes dava para ficar no corredor
    // atirando de longe: o chefe varria uma sala vazia enquanto o jogador
    // resolvia a luta de fora, sem nunca precisar desviar de nada.
    //
    // O bloqueio é um limite no z do jogador, não um bloco de colisão novo:
    // acrescentar sólido à fase depois de montada mexeria com a física de
    // todo mundo, e aqui basta impedir a volta.
    if (!b.trancado && pl.pos.z < bocaZ - 2.5) {
      b.trancado = true;
      this._say(STR.boss.trancou, 4.5);
      this.sfx.pulse();
      // o limiar já existe desde o começo da fase; aqui ele SELA
      if (this.bossDoor) {
        this.bossDoor.material.opacity = 0.34;
        this.bossDoor.visible = true;
      }
    }
    if (b.trancado && b.hp > 0 && pl.pos.z > bocaZ - 1.4) {
      pl.pos.z = bocaZ - 1.4;
      if (pl.vel.z > 0) pl.vel.z = 0;
    }
    if (b.hp <= 0 && this.bossDoor) this.bossDoor.visible = false;

    const ciclo = b.sweep + b.salvo + b.open_t;
    const k = b.t % ciclo;
    b.fase = k < b.sweep ? 'varredura' : k < b.sweep + b.salvo ? 'rajada' : 'aberto';
    b.open = b.fase === 'aberto';

    // ------------------------------------------------------------------ voo
    // Fica mais rápido conforme apanha: metade da vida, meia volta a mais.
    const raiva = 1 + (1 - b.hp / b.maxHp) * 1.2;
    b.orbit += dt * b.move * raiva;
    if (this.bossGroup) {
      const alt = 4.2 + Math.sin(b.orbit * 1.7) * 1.0 - (b.open ? 1.3 : 0);
      this.bossGroup.position.set(
        Math.cos(b.orbit) * b.orbitR,
        alt,
        arenaZ + Math.sin(b.orbit) * b.orbitR * 0.55
      );
      // A leitura do estágio é toda pela LENTE: magenta apertada enquanto ele
      // varre, dourada e aberta quando dá para machucá-lo. Quem está no meio
      // da luta não lê barra: lê cor.
      // ELE ENCARA VOCÊ. Antes só girava sozinho (`rotation.y += dt`), como
      // enfeite rodando: um olho que não olha para ninguém. Agora a frente da
      // malha acompanha o jogador o tempo todo — é o que faz a sala inteira
      // parecer vigiada, e é a leitura de que ele SABE onde você está.
      _v3.set(pl.pos.x, this.bossGroup.position.y, pl.pos.z);
      this.bossGroup.lookAt(_v3);
      const u = this.bossGroup.userData;
      u.corpo.rotation.x = Math.sin(b.t * 0.7) * 0.12;   // respiração
      u.corpo.rotation.z = Math.sin(b.t * 0.45) * 0.08;
      const pulso = b.open ? 1.10 + Math.sin(b.t * 8) * 0.045 : 1;
      u.corpo.scale.setScalar(pulso);
      u.iris.material.color.setHex(b.open ? 0xFFC93C : 0xFF2D9B);
      u.iris.material.opacity = b.open ? 0.95 : 0.30;
      const ir = b.open ? 6.6 : 4.4;
      u.iris.scale.set(ir, ir, 1);
    }

    // ------------------------------------------------------------- varredura
    // Fala ao TROCAR de estágio, nunca a cada quadro: a legenda é o aviso de
    // que a regra mudou.
    if (b.fase !== b.faseAnt) {
      b.faseAnt = b.fase;
      if (b.fase === 'varredura') this._sayOnce('boss_beams', 6);
      if (b.fase === 'rajada') this._say(STR.boss.salvo, 3.5);
    }

    const feixes = b.fase === 'varredura';
    if (feixes) {
      // sentidos opostos e velocidades diferentes: a resposta muda a cada
      // passagem em vez de virar um ritmo decorado
      b.ang += dt * 1.5 * raiva;
      b.angLow -= dt * 1.05 * raiva;

      const golpe = (mesh, ang) => {
        if (!mesh) return;
        const y = mesh.userData.y;
        mesh.visible = true;
        mesh.position.set(0, y, arenaZ);
        mesh.rotation.y = ang;
        const dx = pl.pos.x, dz = pl.pos.z - arenaZ;
        const nx = Math.cos(ang), nz = -Math.sin(ang);
        // PERPENDICULAR: o quanto você está fora da linha.
        // AO LONGO: onde você está dentro dela. A segunda faltava, e sem ela o
        // teste é contra uma reta INFINITA — que, girando, passa por todo
        // ponto do plano e machucava até quem estava fora da arena.
        const perp = Math.abs(dx * nz - dz * nx);
        const along = Math.abs(dx * nx + dz * nz);
        if (!this.s.maskOn && perp < 0.45 && along <= this.bossBeamLen / 2 &&
            y >= pl.pos.y && y <= pl.pos.y + pl.h) this._hit();
      };
      golpe(this.bossBeam, b.ang);
      golpe(this.bossBeamLow, b.angLow);
    } else {
      if (this.bossBeam) this.bossBeam.visible = false;
      if (this.bossBeamLow) this.bossBeamLow.visible = false;
    }

    // ---------------------------------------------------------------- rajada
    if (b.fase === 'rajada' && this.bossGroup) {
      b.ballCd -= dt;
      if (b.ballCd <= 0) {
        b.ballCd = b.ballCdMax;
        this.bossGroup.getWorldPosition(_v3);
        _v1.set(pl.pos.x, pl.pos.y + pl.h * 0.6, pl.pos.z).sub(_v3).normalize();
        // entra na MESMA lista dos tiros de drone: já colide com parede e com
        // o jogador. `r` e `hit` só engordam a bola, que é mais lenta e maior
        // para dar para desviar.
        this.s.shots.push({
          pos: _v3.clone(), vel: _v1.clone().multiplyScalar(b.ballSpd), t: 0,
          r: 1.1, hit: P.BOSS_BALL_R,
        });
        this.sfx.corrupt();
      }
    }

    // ---------------------------------------------------------------- aberto
    const nCiclo = Math.floor(b.t / ciclo);
    if (b.open && nCiclo !== b.lastCycle) {
      b.lastCycle = nCiclo;
      this._sayOnce('boss_open', 3.5);
      // REFORÇO. Primeiro reanima o que já morreu; se não houver ninguém para
      // reanimar, invoca gente nova em volta da arena. A fase 5 não tem trecho
      // de drones, então sem a invocação o reforço nunca acontecia.
      let n = 0;
      for (const d of lv.drones) {
        if (n >= b.spawn) break;
        if (d.dead) { d.dead = false; d.hp = P.DRONE_HP; n++; }
      }
      const vivos = lv.drones.filter((d) => !d.dead).length;
      for (let i = n; i < b.spawn && vivos + (i - n) < b.spawnMax; i++) {
        const a = b.orbit + i * 2.1;
        this._spawnDrone(Math.cos(a) * 6, 2.4 + (i % 2) * 0.9, arenaZ + Math.sin(a) * 5);
        n++;
      }
      if (n) this._say(STR.boss.spawn, 4);
    }

    // ------------------------------------------------------- falas por marco
    // Uma fala por faixa de vida, e só uma vez: `marco` guarda a última dita.
    const frac = b.hp / b.maxHp;
    if (frac <= 0.5 && b.marco < 1) { b.marco = 1; this._say(STR.boss.half, 4.5); }
    if (frac <= 0.2 && b.marco < 2) { b.marco = 2; this._say(STR.boss.low, 4.5); }
  }

  _gate() {
    const s = this.s, g = this.level.gate, pl = this.pl;
    // não basta ter os pedaços: eles precisam estar montados no pedestal
    const ready = s.hunt
      ? (s.masksGot >= s.masksTotal && this.level.drones.every((d) => d.dead))
      : (s.deposto && (!s.boss || s.boss.hp <= 0));
    if (ready !== s.gateOpen) {
      s.gateOpen = ready;
      s.gateT = s.t;                       // marca o instante da destrava
      this.gateLabel.material.map = this._label(ready ? STR.gate_open : (s.hunt ? STR.hunt_locked : STR.gate_locked), ready ? '#00E5FF' : '#FF2D9B');
      this.gateLabel.material.needsUpdate = true;
      if (ready) this.sfx.pulse();         // o baque de destravar
    }

    // Abertura: 1,4 s de folhas correndo para os lados. A fresta vira uma
    // fenda de luz que cresce, então a porta ABRE em vez de sumir.
    if (this.gateLeaves) {
      const alvo = s.gateOpen ? 1 : 0;
      const a = alvo === 0 ? 0 : Math.min(1, (s.t - (s.gateT || 0)) / 1.4);
      const e = a * a * (3 - 2 * a);       // suaviza início e fim
      const cor = s.gateOpen ? 0x00E5FF : 0xFF2D9B;
      for (let i = 0; i < 2; i++) {
        const folha = this.gateLeaves[i];
        const lado = i === 0 ? -1 : 1;
        folha.position.x = lado * (this.gateW / 2 + e * this.gateW);
        folha.userData.fresta.material.color.setHex(cor);
        folha.userData.fresta.material.opacity = 0.9 * (1 - e * 0.7);
      }
      this.gateGlow.material.color.setHex(cor);
      this.gateGlow.material.opacity = 0.35 + e * 0.5;
    }
    if (!ready || s.done) return;
    if (Math.hypot(pl.pos.x - g.x, pl.pos.z - g.z) < P.GATE_R && Math.abs(pl.pos.y - 0) < 4) {
      s.done = true;
      this.sfx.win();
      if (s.phase + 1 >= LEVELS.length) this._winGame();
      else this._contagem(s);
    }
  }

  // Contagem regressiva de verdade, 3 → 2 → 1. Antes era a string fixa
  // `${STR.next_in} 3`: o banner nascia escrito "3" e ficava assim os 2,6 s
  // inteiros até a fase trocar, então parecia travado, porque estava.
  // Cada passo cria um objeto de banner NOVO, que é o que faz o HUD 2D
  // (que compara por identidade) redesenhar a cada segundo.
  _contagem(s) {
    let n = 3;
    this._banner(STR.phase_done, `${STR.next_in} ${n}`);
    const passo = () => {
      // se o jogador morreu, reiniciou ou trocou de fase, este relógio é de
      // uma partida que não existe mais
      if (this.mode !== 'playing' || this.s !== s) return;
      n--;
      if (n > 0) {
        this._banner(STR.phase_done, `${STR.next_in} ${n}`);
        this._proxT = setTimeout(passo, 1000);
      } else {
        this.loadPhase(s.phase + 1);
      }
    };
    clearTimeout(this._proxT);
    this._proxT = setTimeout(passo, 1000);
  }

  _hit() {
    const s = this.s;
    if (s.invuln > 0 || s.done) return;
    s.lives--; s.invuln = P.INVULN; s.hurt = 1;
    if (this.opts.shake) s.shake = 1;
    this.sfx.corrupt();
    if (s.lives <= 0) { this._death(false); return; }
    this._sayOnce('hurt', 4);
    // empurrão para trás, para o jogador sair do perigo. Só em golpe que NÃO
    // mata: no golpe fatal isso jogava o corpo para cima e ele ficava boiando.
    // Em VR o empurrao sai: mover a pessoa sem ela ter mandado e das piores
    // coisas que existem para enjoo. No monitor ele fica, porque ajuda a sair
    // do perigo e ali nao incomoda.
    if (!this.renderer.xr.isPresenting) {
      this.camera.getWorldDirection(_v1);
      this.pl.vel.addScaledVector(_v1.setY(0).normalize(), -P.KNOCK);
      this.pl.vel.y = Math.max(this.pl.vel.y, 3);
    }
  }

  _death(timeout) {
    if (this.s.done) return;
    // Na cacada, morrer pelas vidas NAO zera o progresso: recomecar os cinco
    // drones e as tres mascaras do zero a cada tres erros transformava a fase
    // em raiva. Voce volta a entrada, as vidas voltam, e o que ja caiu
    // continua caido. So o tempo esgotado reseta tudo.
    if (this.s.hunt && !timeout) {
      this.s.deaths++;
      this.sfx.fail();
      this._banner(STR.lose_title, STR.hunt_retry || STR.lose_body);
      const lv = this.level;
      this.pl.pos.set(lv.spawn.x, lv.spawn.y, lv.spawn.z);
      this.pl.vel.set(0, 0, 0);
      this.s.lives = P.LIVES;
      this.s.invuln = 2.5;
      return;
    }
    this.s.done = true;
    this.s.morto = true;      // congela o corpo até a fase recarregar
    this.s.deaths++;
    this.sfx.fail();
    this._banner(STR.lose_title, STR.lose_body);
    setTimeout(() => { if (this.mode === 'playing') this.loadPhase(this.s.phase); }, 2400);
  }

  _winGame() {
    if (this.mode !== 'playing') return;
    this.mode = 'over';
    this.sfx.droneStop(); this.sfx.win();
    this._say(STR.aya.win, 10);
    // Em VR a tela de resultado e' DOM e nao existe dentro do oculos: quem
    // zerava ficava preso num mundo parado, sem menu e sem saida. O banner
    // (que E' desenhado no mundo) segura o resultado, e o gatilho recomeca.
    if (this.renderer.xr.isPresenting) {
      this._overT = performance.now();
      this._banner(STR.win_title, STR.vr_reinicio || STR.win_body);
      if (this.s) this.s.banner = { t: -1e9, title: STR.win_title, sub: '' };
    }
    if (this.onEnd) this.onEnd({
      won: true, phase: LEVELS.length, frags: this.s.frags,
      deaths: this.s.deaths, drones: this.s.dronesKilled, time: Math.round(this.s.left),
    });
  }

  // ------------------------------------------------------------- HUD
  _drawHud() {
    const s = this.s, { g, canvas, tex } = this.hud;
    const W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(5,2,12,0.72)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,229,255,0.45)'; g.lineWidth = 4;
    g.strokeRect(2, 2, W - 4, H - 4);

    // rosto montado
    g.textAlign = 'left';
    g.fillStyle = '#8fb6c8'; g.font = '24px system-ui, sans-serif';
    g.fillText(STR.hud_frag, 30, 40);
    g.fillStyle = s.frags >= s.need ? '#00E5FF' : '#FFC93C';
    g.font = 'bold 60px system-ui, sans-serif';
    g.fillText(s.hunt
      ? `${s.masksGot}/${s.masksTotal} · ${this.level.drones.filter((d) => d.dead).length}/${this.level.drones.length}`
      : `${s.frags}/${s.need}`, 30, 104);

    // tempo
    g.textAlign = 'center';
    g.fillStyle = '#8fb6c8'; g.font = '24px system-ui, sans-serif';
    g.fillText(STR.hud_time, W * 0.40, 40);
    g.fillStyle = s.left < 20 ? '#FF2D9B' : '#F3EFE6';
    g.font = 'bold 60px system-ui, sans-serif';
    g.fillText(`${Math.floor(s.left / 60)}:${String(Math.floor(s.left % 60)).padStart(2, '0')}`, W * 0.40, 104);

    // vidas
    g.fillStyle = '#8fb6c8'; g.font = '24px system-ui, sans-serif';
    g.fillText(STR.hud_lives, W * 0.62, 40);
    for (let i = 0; i < P.LIVES; i++) {
      g.beginPath(); g.arc(W * 0.62 - 40 + i * 40, 84, 14, 0, Math.PI * 2);
      if (i < s.lives) { g.fillStyle = '#FF2D9B'; g.fill(); }
      else { g.strokeStyle = '#4a4258'; g.lineWidth = 3; g.stroke(); }
    }

    // máscara
    g.textAlign = 'right';
    g.fillStyle = '#8fb6c8'; g.font = '24px system-ui, sans-serif';
    g.fillText(STR.hud_mask, W - 30, 40);
    const bw = 250, bx = W - 30 - bw;
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(bx, 60, bw, 30);
    const heat = s.maskHeat / P.MASK_MAX;
    g.fillStyle = !s.maskHave ? '#3a3350' : s.maskLock > 0 ? '#FF2D9B' : s.maskOn ? '#F3EFE6' : '#00E5FF';
    g.fillRect(bx, 60, bw * (1 - heat), 30);
    g.fillStyle = '#8fa0b4'; g.font = '20px system-ui, sans-serif';
    g.fillText(!s.maskHave ? 'SEM'
      : s.maskLock > 0 ? STR.hud_overheat : (s.maskOn ? 'NO ROSTO' : 'GUARDADA'), W - 30, 112);

    // quadros por segundo, canto de cima. Sem isto nao ha como alguem dizer
    // "esta a 60?" sem chutar, nem ver o guarda de desempenho agindo.
    if (this._pf) {
      const f = Math.round(this._pf.fps);
      g.textAlign = 'right';
      g.fillStyle = f >= 58 ? '#6BCB77' : (f >= 45 ? '#FFC93C' : '#FF5A6E');
      g.font = 'bold 22px system-ui, sans-serif';
      g.fillText(f + ' fps' + (this._pf.grau ? ' · leve ' + this._pf.grau : ''), W - 30, 34);
    }

    // faixa do objetivo
    g.fillStyle = 'rgba(255,201,60,0.14)'; g.fillRect(0, H - 74, W, 74);
    g.textAlign = 'left';
    g.fillStyle = '#FFC93C'; g.font = 'bold 25px system-ui, sans-serif';
    g.fillText(`${STR.hud_phase} ${s.phase + 1}/${LEVELS.length}`, 30, H - 28);
    g.fillStyle = '#F3EFE6'; g.font = '25px system-ui, sans-serif';
    g.fillText(s.objective, 210, H - 28);
    tex.needsUpdate = true;
  }

  _drawSub() {
    const { g, canvas, tex } = this.sub;
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.s || !this.s.aya) { tex.needsUpdate = true; return; }
    g.fillStyle = 'rgba(5,2,12,0.88)'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.strokeStyle = 'rgba(255,201,60,0.6)'; g.lineWidth = 4;
    g.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    g.textAlign = 'left';
    g.fillStyle = '#FFC93C'; g.font = 'bold 38px system-ui, sans-serif';
    g.fillText(STR.aya_name, 28, 56);
    // A LETRA É A MAIOR QUE COUBER.
    //
    // Um corpo fixo grande resolve a legibilidade das falas curtas, que são a
    // maioria, e corta a mais longa do jogo pela metade: com 52 px ela pede
    // sete linhas num painel que tem espaço para cinco. Um corpo fixo pequeno
    // não corta nada e não se lê. Então o tamanho é escolhido por medida: o
    // maior que fizer o texto inteiro caber, com piso em 30 px para não virar
    // formiga.
    const topo = 118, larg = canvas.width - 56, fundo = canvas.height - 14;
    let corpo = 52, linhas = [];
    for (; corpo >= 30; corpo -= 2) {
      g.font = corpo + 'px system-ui, sans-serif';
      linhas = this._quebra(g, this.s.aya, larg);
      if (topo + (linhas.length - 1) * corpo * 1.24 <= fundo) break;
    }
    g.fillStyle = '#F3EFE6';
    linhas.forEach((l, i) => g.fillText(l, 28, topo + i * corpo * 1.24));
    tex.needsUpdate = true;
  }

  // quebra em linhas SEM desenhar: é o que deixa medir antes de escolher o
  // tamanho da letra
  _quebra(g, text, maxW) {
    const out = [];
    let line = '';
    for (const w of String(text).split(' ')) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) { out.push(line); line = w; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  _wrap(g, text, x, y, maxW, lh) {
    this._quebra(g, text, maxW).forEach((l, i) => g.fillText(l, x, y + i * lh));
  }

  // ---------------------------------------------------- 60 quadros de piso
  // Abaixo de 60 quadros por segundo o VR passa de desconfortavel a doloroso:
  // a imagem chega atrasada em relacao ao movimento da cabeca, e nenhuma
  // vinheta conserta isso. So que eu nao tenho como saber daqui qual e o
  // aparelho de quem joga: um celular de 2019 e um Quest 3 nao aguentam a
  // mesma coisa. Entao o jogo mede a si mesmo e desce a qualidade sozinho
  // ate alcancar o piso, em degraus, comecando pelo que custa caro e vale
  // pouco.
  //
  // Degraus, do primeiro ao ultimo:
  //   1. congela o video da AYA, que e' um video decodificando e virando
  //      textura a cada quadro, o item mais caro da cena por larga margem
  //   2. resolucao em 1,2 (fora do VR) ou 0,85 no oculos
  //   3. resolucao em 1,0 / 0,75
  //   4. resolucao em 0,8 / 0,65
  //
  // Se sobrar folga por seis segundos seguidos, sobe um degrau de volta.
  _perf(dt) {
    if (!this._pf) this._pf = { jan: [], grau: 0, baixo: 0, alto: 0, fps: 60 };
    const pf = this._pf;
    if (dt > 0 && dt < 0.5) {
      pf.jan.push(dt);
      if (pf.jan.length > 45) pf.jan.shift();
    }
    if (pf.jan.length < 20) return;
    const media = pf.jan.reduce((a, b) => a + b, 0) / pf.jan.length;
    pf.fps = 1 / media;

    const ALVO = 60;
    if (pf.fps < ALVO - 2) { pf.baixo += dt; pf.alto = 0; } else
    if (pf.fps > ALVO + 10) { pf.alto += dt; pf.baixo = 0; } else { pf.baixo = 0; pf.alto = 0; }

    if (pf.baixo > 1.5 && pf.grau < 3) { pf.grau++; pf.baixo = 0; this._aplicaGrau(); }
    else if (pf.alto > 6 && pf.grau > 0) { pf.grau--; pf.alto = 0; this._aplicaGrau(); }
  }

  _aplicaGrau() {
    const g = this._pf.grau;
    // 1. o video da AYA para de virar textura. Ela continua ali, com o rosto
    //    parado no ultimo quadro: perde a boca mexendo, mantem a presenca.
    if (this.ayaVideo) {
      if (g >= 1) { try { this.ayaVideo.pause(); } catch (e) {} }
      else if (this.mode === 'playing') { this.ayaVideo.play().catch(() => {}); }
    }
    // 2 a 4. resolucao de renderizacao
    const plano = [1.5, 1.2, 1.0, 0.8][g];
    const oculos = [0.92, 0.85, 0.75, 0.65][g];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, plano));
    if (this.renderer.xr.setFramebufferScaleFactor) {
      this.renderer.xr.setFramebufferScaleFactor(oculos);
    }
  }

  // ------------------------------------------------------------- laço
  _frame(now) {
    const t = now / 1000;
    if (this._last === undefined) this._last = t;
    let dt = t - this._last;
    this._last = t;
    if (dt > 0.2) dt = 0.2;

    this._perf(dt);
    this._padTrig = this._pad(dt);
    this._vrCalibraPasso();
    // fim de jogo dentro do oculos: gatilho recomeca (2 s de guarda para o
    // tiro que matou o chefe nao reiniciar sem querer)
    if (this.mode === 'over' && this.renderer.xr.isPresenting &&
        this.xrTrigger >= 0 && performance.now() - (this._overT || 0) > 2000) {
      this.xrTrigger = -1;
      this.start(0);
    }

    if (!this.renderer.xr.isPresenting) {
      const T = P.TURN_SPEED * dt;
      if (this.held.has('lookleft')) this._look(T, 0);
      if (this.held.has('lookright')) this._look(-T, 0);
      this.camera.rotation.set(this.in.pitch, this.in.yaw, 0, 'YXZ');
      if (this.s && this.s.shake > 0 && this.opts.shake) {
        this.camera.rotation.z = Math.sin(t * 47) * 0.022 * this.s.shake;
      }
    }

    // vinheta acompanha a velocidade: fechada andando, aberta parado
    if (this.vinheta) {
      const emVR = this.renderer.xr.isPresenting;
      // Conta o SUBIR E CAIR junto com o andar. A vinheta media so a
      // velocidade horizontal, e pulo e queda sao dos momentos que mais
      // embrulham o estomago em VR, porque o mundo se move na vertical e o
      // corpo continua parado no chao do quarto. Com o pulo mais alto isso
      // pesou mais ainda. O vertical entra com peso 0,7: ele e' curto, mas e'
      // intenso.
      const vh = this.pl ? Math.hypot(this.pl.vel.x, this.pl.vel.z) : 0;
      const vv = this.pl ? Math.abs(this.pl.vel.y) * 0.7 : 0;
      // GIRAR SUAVE enjoa mais que ANDAR: os olhos veem o mundo rodar e o
      // ouvido interno jura que a cabeca esta parada. Como o giro suave virou
      // o padrao, ele entra na conta da vinheta com peso alto. Sem isto, o
      // giro linear que ele pediu sairia mais bonito e mais enjoativo.
      const vg = (this._giroVel || 0) * 1.1;
      const v = Math.max(vh, vv, vg);
      // A velocidade de andar subiu de 5,4 para 6,6, e vista periferica em
      // movimento e' de onde vem o enjoo: a vinheta fecha um pouco mais e
      // comeca mais cedo para compensar o passo mais rapido.
      // A conta era por um divisor fixo: com a velocidade em 8,2 m/s ela
      // batia no teto assim que voce saia do lugar e ficava la, e andar pelo
      // jogo inteiro virou olhar por um tubo. Isso atrapalha justamente o que
      // ele reclamou, que e' olhar em volta. Agora a escala e RELATIVA a
      // velocidade maxima e o teto caiu de 0,80 para 0,55: ainda fecha a
      // periferia, mas sobra periferia para fechar.
      const frac = Math.min(1, Math.max(0, (v - 1.0) / Math.max(1, P.SPEED - 1.0)));
      let alvo = emVR ? 0.55 * frac : 0;
      // durante o passo do giro ela fecha quase de vez, por um instante. O
      // olho perde a referencia periferica bem no momento em que o mundo
      // salta, que e' o truque padrao de conforto em VR.
      if (this._pisca > 0) { this._pisca -= dt; if (emVR) alvo = 0.95; }
      const m = this.vinheta.material;
      // fecha rapido, abre devagar: fechar tem que acompanhar o salto
      const vel = alvo > m.opacity ? 22 : 6;
      m.opacity += (alvo - m.opacity) * Math.min(1, dt * vel);
      this.vinheta.visible = m.opacity > 0.01;
    }


    if (this.mode === 'playing' && this.level) {
      this._acc = (this._acc || 0) + dt;
      const STEP = 1 / 60;
      let guard = 0;
      while (this._acc >= STEP && guard++ < 6) { this._step(STEP); this._acc -= STEP; }
      if (guard >= 6) this._acc = 0;
    } else {
      this.tap.jump = false; this.tap.mask = false;
    }

    this.rig.updateMatrixWorld(true);
    this._vis(t, dt);
    this.renderer.render(this.scene, this.camera);
  }

  _vis(t, dt) {
    const s = this.s;
    if (this.fragMeshes) {
      for (const m of this.fragMeshes) {
        if (!m.visible) continue;
        m.userData.body.rotation.y += dt * 1.4;
        m.userData.body.rotation.x += dt * 0.8;
        m.position.y += Math.sin(t * 2 + m.position.z) * 0.0035;
      }
    }
    // a máscara larga no corredor balança de leve: parada ela some no cenário
    if (this.maskItemMeshes) {
      for (const g2 of this.maskItemMeshes) {
        if (g2 && g2.visible) g2.position.y += Math.sin(t * 1.7) * 0.004;
      }
    }
    // a porta não gira (o anel girava); ela respira enquanto está travada,
    // para continuar chamando atenção do outro lado do corredor
    if (this.gateGlow && this.s && !this.s.gateOpen) {
      this.gateGlow.material.opacity = 0.30 + Math.sin(this.s.t * 2.4) * 0.10;
    }
    if (this.scanMeshes) {
      for (const m of this.scanMeshes) {
        m.material.opacity = s && s.maskOn ? 0.06 : 0.32 + Math.sin(t * 4) * 0.08;
      }
    }
    this.dust.rotation.y = t * 0.008;

    // o fundo do vazio acompanha o jogador, como um skybox
    if (this.sky) {
      this.camera.getWorldPosition(_v3);
      this.sky.position.set(_v3.x, _v3.y + 12, _v3.z);
      this.sky.rotation.y = t * 0.004;
    }

    // AYA: acesa enquanto fala, brasa fraca no resto do tempo
    if (this.ayaGroup) {
      this.camera.getWorldPosition(_v3);
      this.ayaGroup.lookAt(_v3.x, this.ayaGroup.position.y, _v3.z);
      const target = s && s.aya ? 0.62 : 0.16;
      this.ayaMat.opacity += (target + Math.sin(t * 2.1) * 0.05 - this.ayaMat.opacity) * Math.min(1, dt * 4);
    }

    // A MÁSCARA NO ROSTO, dentro do óculos.
    //
    // A arte da máscara sempre esteve aqui, e no monitor ela aparece. No
    // aparelho, não: ela é uma borda desenhada na beirada de um plano que fica
    // fora do que o olho enxerga (a conta está em `_ajustaMascaraVR`). Ou seja,
    // o jogo mostrava a máscara para um lugar onde ninguém olha.
    //
    // Ajustado o tamanho, ela ganha aqui o que faltava para não ser só
    // decoração: pulsa devagar enquanto aguenta e vira vermelha quando está
    // perto de superaquecer, então dá para saber que ela vai acabar sem ler
    // número nenhum no pulso.
    if (this.renderer.xr.isPresenting) {
      if (!this._mascaraOk) this._mascaraOk = this._ajustaMascaraVR();
      const quente = s && s.maskHeat > P.MASK_MAX * 0.62;
      const pulso = 0.88 + Math.sin(t * (quente ? 9 : 2.2)) * (quente ? 0.10 : 0.05);
      const mv = this.maskView.material;
      mv.opacity += ((s && s.maskOn ? pulso : 0) - mv.opacity) * Math.min(1, dt * 9);
      mv.color.setHex(quente && s && s.maskOn ? 0xFF8A96 : 0xFFFFFF);
    } else {
      if (this._mascaraOk) {           // saiu do óculos: devolve o tamanho de tela
        this._mascaraOk = false;
        this.maskView.scale.set(1, 1, 1);
        this.maskView.position.z = -0.62;
        this.maskView.material.color.setHex(0xFFFFFF);
      }
      this.maskView.material.opacity = s && s.maskOn ? 0.90 : 0;
    }
    this.hurt.material.opacity = s ? s.hurt * (this.opts.flash ? 0.5 : 0.2) : 0;
    this.playerLight.intensity = s && s.maskOn ? 2.1 : 2.8;

    // Painéis no mundo SÓ dentro do VR (lá não existe "tela"). No PC/celular o
    // HUD é interface fixa em DOM (index.html), que lê o estado em game.s.
    const inVR = this.renderer.xr.isPresenting;
    if (inVR) {
      this.camera.getWorldPosition(_v1);
      this.camera.getWorldQuaternion(_q1);
      _v2.set(0, 0, -1).applyQuaternion(_q1);
      let yaw = Math.atan2(-_v2.x, -_v2.z);
      // O PAINEL NÃO GIRA COM A CABEÇA.
      //
      // Ele seguia o rosto com 0,2 s de atraso, o que na prática é grudado: o
      // texto virava junto com a cabeça, sempre na frente, e não havia para
      // onde olhar que ele não estivesse. Agora existe uma folga de 17 graus
      // em que ele fica PARADO no mundo, e só depois disso ele é arrastado,
      // devagar, ficando sempre na beirada dessa folga. Olhar para o lado
      // passa a deixar o texto para trás, que é o que se espera de uma coisa
      // pendurada no cenário, e virar de verdade traz o texto junto.
      if (this._hudYaw === undefined) this._hudYaw = yaw;
      let dy = yaw - this._hudYaw;
      if (dy > Math.PI) dy -= 2 * Math.PI;
      if (dy < -Math.PI) dy += 2 * Math.PI;
      const FOLGA = 0.30;
      if (Math.abs(dy) > FOLGA) {
        const alvo = this._hudYaw + (dy - Math.sign(dy) * FOLGA);
        this._hudYaw += (alvo - this._hudYaw) * Math.min(1, dt * 3);
      }
      yaw = this._hudYaw;
      // o status agora mora no pulso; flutuando ficam so legenda e banner
      for (const [pan, dist, hgt, tilt] of [
        [this.sub, 2.6, -0.55, -0.16], [this.banner, 3.4, 0.55, -0.02],
      ]) {
        pan.mesh.position.set(_v1.x - Math.sin(yaw) * dist, _v1.y + hgt, _v1.z - Math.cos(yaw) * dist);
        pan.mesh.rotation.set(tilt, yaw, 0, 'YXZ');
      }
      this.hud.mesh.visible = false;
      if (this.wrist && !this.wrist.visible) {
        const alvo = this.controllers.find((c) => c.userData.hand === 'left') || this.controllers[0];
        if (alvo) { alvo.add(this.wrist); this.wrist.visible = true; }
      }
      // etiquetas dos controles: 40 s na cara, depois somem sozinhas
      this._vrT = (this._vrT || 0) + dt;
      const opEt = this._vrT < 40 ? 0.95 : Math.max(0, 0.95 - (this._vrT - 40) * 0.5);
      for (const c of this.controllers) {
        if (c.userData.etiqueta) {
          c.userData.etiqueta.material.opacity = opEt;
          c.userData.etiqueta.visible = opEt > 0.02;
        }
      }
      this.sub.mesh.visible = true;
      this.sub.mesh.material.opacity = s && s.aya ? 0.98 : 0;
      this.banner.mesh.visible = !!(s && s.banner);
      this._hudT = (this._hudT || 0) + dt;
      if (this._hudT > 0.1) { this._hudT = 0; if (this.s) this._drawHud(); }
      if (this._subDirty) { this._subDirty = false; this._drawSub(); }
    } else {
      this.hud.mesh.visible = false;
      this.sub.mesh.visible = false;
      this.banner.mesh.visible = false;
      if (this.wrist) this.wrist.visible = false;
      this._vrT = 0;
    }
  }
}

export { LEVELS, P, STR };
