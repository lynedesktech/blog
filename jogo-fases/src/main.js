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
  SPEED: 5.4, CROUCH_SPEED: 2.5, AIR_CTRL: 0.42,
  ACCEL: 46, FRICTION: 13,
  GRAV: 23, JUMP: 8.6,
  COYOTE: 0.12, JUMP_BUF: 0.16,
  TERM_VEL: -32,

  MASK_MAX: 5.5,         // segundos de máscara
  MASK_REGEN: 1.5,       // recarga por segundo com ela fora
  MASK_COOL: 2.5,        // trava depois de superaquecer

  FRAG_R: 1.15,
  MASK_PICK_R: 2.6,      // pedestal: generoso de proposito, e' item de enredo
  GATE_R: 2.0,

  LIVES: 3, INVULN: 1.3, KNOCK: 6,
  SHOT_CD: 0.26, SHOT_RANGE: 26, SHOT_TOL: 0.10,
  DRONE_SIGHT: 15, DRONE_CD: 1.9, DRONE_SHOT: 11, DRONE_HP: 2,
  BOSS_HP: 8, BOSS_SWEEP: 6.0, BOSS_OPEN: 3.2,

  TURN_SPEED: 2.1, SNAP_TURN: Math.PI / 6,
  VR_CROUCH_Y: 1.25,     // abaixo disso, no VR, conta como agachado
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
  panel: CDN + 'ddae4f29-0bbd-41ab-b47b-18d1e5c17bd0.jpg',
  sky: CDN + '796ad1bc-e6e1-4606-a9c6-804dd53c2ac0.jpg',
  ayaVid: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_212107_31ec2646-f050-4da4-baec-602f160a2cf4.mp4',
  door: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_213418_bcd63cc3-9702-4a7e-a2f4-c9c782bf6e5c.png',
  // AYA nova: personagem fictícia, na paleta do jogo (vácuo preto-violeta,
  // luz ciano de um lado, contraluz dourado do outro). A anterior não
  // conversava com o resto da cena.
  aya: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Dh1q30VATNRdqHL0qWXAdgGyv8/hf_20260806_204404_58318017-1aec-4b39-8c99-94a4344ea1c8.png',
};

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
    this.opts = { shake: true, flash: true, bigText: false, sound: true, snapTurn: true };
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
    this.camera.aspect = window.innerWidth / window.innerHeight;
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
    this.sub = this._panel(2.0, 0.34, 1280, 218, 999);
    this.sub.mesh.material.opacity = 0;
    this.banner = this._panel(2.2, 0.52, 1360, 320, 1000);
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

    // tiro (raio curto que aparece por instantes)
    this.shotLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 1),
      new THREE.MeshBasicMaterial({
        map: this.tex.beam, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      })
    );
    this.shotLine.visible = false;
    this.scene.add(this.shotLine);
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
    this._surfaces(lv.blocks, this._texFase(pal.floorImg, this.surf.floor, 7.5), (b) => {
      if (b.kind !== 'floor') return null;
      return ['x', 'z', b.hx * 2, b.hz * 2,
        new THREE.Vector3(b.x, b.y + b.hy + E, b.z), { x: -Math.PI / 2, y: 0 }];
    }, 4.2, 0xe8ecf5);

    // paredes: a face virada para dentro do corredor
    this._surfaces(lv.blocks, this._texFase(pal.wallImg, this.surf.wall, 4.5), (b) => {
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
    }, 4.2, 0xdfe4f0);

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
    ), 3.4, 0x3a3e52);
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
    const cor = (def.pal && def.pal.accent) || COL.mag;
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

      const core = tubo(0.022, 0xffffff, 0.95, true);  // filamento branco
      const mid = tubo(0.075, cor, 0.55, false);       // corpo do feixe
      const halo = tubo(0.24, cor, 0.10, false);       // brilho que sangra
      const bloom = halo;                              // sem camada extra
      g.add(halo, mid, core);

      // poça de luz no chão: radial, não um retângulo de borda dura
      const poca = new THREE.Mesh(
        new THREE.PlaneGeometry(def.w, b.range * 2 + 3.0),
        new THREE.MeshBasicMaterial({
          map: this.tex.dust, color: cor, transparent: true, opacity: 0.13,
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

      g.userData = { core, mid, halo, bloom, poca, fase: Math.random() * 6.28 };
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
      for (const dz of [0.06, -0.06]) {
        const lb = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this._label('SCANNER · SÓ PASSA DE MÁSCARA', '#FF2D9B', 34), transparent: true, depthWrite: false,
        }));
        lb.scale.set(4.6, 1.15, 1);
        lb.position.set(0, sc.h - 1.1, sc.z + dz);
        this.levelRoot.add(lb);
      }
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
    this.droneMeshes = lv.drones.map(() => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({ color: COL.mag, wireframe: true })
      );
      const eye = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.ringM, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      eye.scale.set(1.1, 1.1, 1);
      g.add(body, eye);
      g.userData.body = body;
      this.levelRoot.add(g);
      return g;
    });

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
      map: this._label(STR.gate_locked, '#FF2D9B'), transparent: true, depthWrite: false,
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

    // --- chefe
    this.bossGroup = null;
    if (def.boss) {
      const g = new THREE.Group();
      g.position.set(0, 4.2, lv.end + 6);
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(2.4, 1),
        new THREE.MeshBasicMaterial({ color: COL.mag, wireframe: true })
      );
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x2a0f4a })
      );
      const iris = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.ringM, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      iris.scale.set(4, 4, 1);
      g.add(shell, lens, iris);
      g.userData = { shell, lens, iris };
      this.levelRoot.add(g);
      this.bossGroup = g;
      // feixe rotativo do chefe
      this.bossBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 26, 6),
        new THREE.MeshBasicMaterial({ color: COL.mag })
      );
      this.bossBeam.rotation.z = Math.PI / 2;
      this.bossBeam.visible = false;
      this.levelRoot.add(this.bossBeam);
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


      shotCd: 0, shotVis: 0, shots: [],
      gateOpen: false, done: false,
      boss: def.boss ? { hp: P.BOSS_HP, t: 0, open: false, ang: 0 } : null,
      aya: '', ayaT: 0, said: {},
      shake: 0, hurt: 0, banner: null, objective: '',
    };

    this.pl.pos.set(lv.spawn.x, lv.spawn.y, lv.spawn.z);
    this.pl.vel.set(0, 0, 0);
    this.pl.h = P.STAND_H;
    this.pl.onGround = false;
    this.rig.rotation.set(0, 0, 0);
    this.in.yaw = 0; this.in.pitch = 0;

    this._setObjective(STR.obj_collect);
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

  _label(text, color, size = 60) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.font = `bold ${size}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, 256, 68);
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

    this.controllers = [];
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 1, 6),
        new THREE.MeshBasicMaterial({ color: COL.wire, transparent: true, opacity: 0.55 })
      );
      ray.geometry.translate(0, -0.5, 0);
      ray.geometry.rotateX(-Math.PI / 2);
      ray.scale.z = 5;
      c.add(ray);
      c.addEventListener('selectstart', () => { this.xrTrigger = i; this.activeCtrl = i; });
      c.addEventListener('selectend', () => { if (this.xrTrigger === i) this.xrTrigger = -1; });
      c.addEventListener('squeezestart', () => { this.tap.mask = true; });
      c.addEventListener('connected', () => { if (this.activeCtrl == null) this.activeCtrl = i; });
      this.rig.add(c);
      this.controllers.push(c);
    }
    this.xrTrigger = -1;
    this.activeCtrl = null;

    this.renderer.xr.addEventListener('sessionstart', () => {
      this.reticle.visible = false;
      if (this.mode === 'idle') this.start();
    });
    this.renderer.xr.addEventListener('sessionend', () => { this.reticle.visible = true; });
  }

  // botões de tela (celular)
  press(what) { if (what === 'duck') this.duckBtn = !this.duckBtn; else this.tap[what] = true; }

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

  _pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let trig = false, mx = 0, my = 0;
    for (const gp of pads) {
      if (!gp || (gp.mapping && gp.mapping !== 'standard')) continue;
      const b = gp.buttons, ax = gp.axes || [];
      if (b[7] && b[7].pressed) trig = true;
      if (b[0] && b[0].pressed) { if (!this._padA) { this.tap.jump = true; this._padA = true; } } else this._padA = false;
      if (b[4] && b[4].pressed) { if (!this._padL) { this.tap.mask = true; this._padL = true; } } else this._padL = false;
      this.duckPad = !!(b[1] && b[1].pressed);
      const dz = (v) => (Math.abs(v) > 0.18 ? v : 0);
      mx += dz(ax[0] || 0); my += -dz(ax[1] || 0);
      const rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
      if (rx || ry) this._look(-rx * 0.05, -ry * 0.035);
    }
    this._padMove = { x: mx, y: my };
    return trig;
  }

  _xrSticks(dt) {
    const session = this.renderer.xr.getSession();
    if (!session) return { x: 0, y: 0 };
    let mx = 0, my = 0, turn = 0;
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp || !gp.axes) continue;
      const ax = gp.axes;
      const x = ax.length > 2 ? ax[2] : (ax[0] || 0);
      const y = ax.length > 3 ? ax[3] : (ax[1] || 0);
      const dz = (v) => (Math.abs(v) > 0.20 ? v : 0);
      if (src.handedness === 'right') turn += dz(x);
      else { mx += dz(x); my += -dz(y); }
      if (gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) {
        if (!this._xrA) { this.tap.jump = true; this._xrA = true; }
      } else this._xrA = false;
    }
    if (this.opts.snapTurn) {
      if (Math.abs(turn) > 0.7) {
        if (!this._snapLatch) { this.rig.rotation.y -= Math.sign(turn) * P.SNAP_TURN; this._snapLatch = true; }
      } else this._snapLatch = false;
    } else this.rig.rotation.y -= turn * P.TURN_SPEED * dt;
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

  _say(text, dur) { this.s.aya = text; this.s.ayaT = dur || 4.5; this._subDirty = true; }
  _sayOnce(key, dur) {
    if (!this.s || this.s.said[key]) return;
    this.s.said[key] = true;
    this._say(STR.aya[key] || '', dur);
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

    if (s.left <= 0 && !s.done) this._death(true);
  }

  // --- máscara: a escolha central do jogo ---------------------------------
  _mask(dt) {
    const s = this.s;
    if (!s.maskHave) { s.maskOn = false; return; }
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
  }

  _movers(dt) {
    const lv = this.level;
    for (let i = 0; i < lv.movers.length; i++) {
      const m = lv.movers[i];
      const x = Math.sin(this.s.t * m.speed + m.phase) * m.ax;
      // a caixa é REAPROVEITADA, não recriada: pl.ground guarda a referência do
      // frame anterior e recriar o objeto quebrava o "carregar o jogador".
      if (!m.box) m.box = { x, y: m.y, z: m.z, hx: m.hx, hy: m.hy, hz: m.hz, kind: 'mover', mover: i };
      m.dx = x - m.box.x;
      m.box.x = x;
      if (this.moverMeshes[i]) this.moverMeshes[i].position.set(x, m.y, m.z);
    }
    for (let i = 0; i < lv.crushers.length; i++) {
      const c = lv.crushers[i];
      const k = (Math.sin(this.s.t * c.speed + c.phase) + 1) / 2;
      c.y = c.top - k * c.drop;
      if (this.crushMeshes[i]) this.crushMeshes[i].position.set(c.x, c.y, c.z);
    }
  }

  _player(dt) {
    const s = this.s, pl = this.pl;

    // --- agachar: no VR vale a altura REAL do capacete
    let wantDuck = this.held.has('duck') || this.duckBtn || this.duckPad;
    if (this.renderer.xr.isPresenting) {
      wantDuck = wantDuck || this.camera.position.y < P.VR_CROUCH_Y;
    }
    const targetH = wantDuck ? P.CROUCH_H : (this._canStand() ? P.STAND_H : P.CROUCH_H);
    pl.h += (targetH - pl.h) * Math.min(1, dt * 14);

    // --- direção do andar, projetada no chão
    let fwd = 0, str = 0;
    if (this.held.has('fwd')) fwd += 1;
    if (this.held.has('back')) fwd -= 1;
    if (this.held.has('sright')) str += 1;
    if (this.held.has('sleft')) str -= 1;
    fwd += this.stick.y; str += this.stick.x;
    if (this._padMove) { fwd += this._padMove.y; str += this._padMove.x; }
    if (this.renderer.xr.isPresenting) { const v = this._xrSticks(dt); fwd += v.y; str += v.x; }

    this.camera.getWorldDirection(_v1);
    _v1.y = 0;
    if (_v1.lengthSq() > 1e-6) _v1.normalize(); else _v1.set(0, 0, -1);
    _v2.set(-_v1.z, 0, _v1.x);

    const mag = Math.min(1, Math.hypot(fwd, str));
    _v3.copy(_v1).multiplyScalar(fwd).addScaledVector(_v2, str);
    if (_v3.lengthSq() > 1e-6) _v3.normalize();

    const maxSpd = (pl.h < (P.STAND_H + P.CROUCH_H) / 2 ? P.CROUCH_SPEED : P.SPEED);
    const ctrl = pl.onGround ? 1 : P.AIR_CTRL;
    const wishX = _v3.x * maxSpd * mag, wishZ = _v3.z * maxSpd * mag;
    pl.vel.x += (wishX - pl.vel.x) * Math.min(1, P.ACCEL * ctrl * dt / maxSpd);
    pl.vel.z += (wishZ - pl.vel.z) * Math.min(1, P.ACCEL * ctrl * dt / maxSpd);
    if (!mag && pl.onGround) {
      const f = Math.max(0, 1 - P.FRICTION * dt);
      pl.vel.x *= f; pl.vel.z *= f;
    }

    // --- pulo com coyote time e buffer (§8: entrada perdoa quase-acertos)
    if (this.tap.jump) { this.tap.jump = false; pl.jumpBuf = P.JUMP_BUF; }
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
    this.rig.position.set(pl.pos.x, pl.pos.y, pl.pos.z);
    if (!this.renderer.xr.isPresenting) this.camera.position.set(0, pl.h - P.EYE_OFF, 0);
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
      s.maskHave = true;
      s.maskOn = true;               // já vai para o rosto: é para isso que serve
      s.pegouT = s.t;
      this.sfx.purify();
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
        u.mid.material.opacity = 0.55 * k;
        u.halo.material.opacity = 0.10 * k;
        u.halo.scale.set(k, 1, k);
        u.poca.position.z = b.cz;
        u.poca.material.opacity = 0.13 * k;
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
          if (c.alarm > 1) { c.alarm = 0; this._hit(); }
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
        s.maskOn = true;
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
      d.phase += dt;
      const y = d.y + Math.sin(d.phase * 1.6) * 0.35;
      if (mesh) { mesh.position.set(d.x, y, d.z); mesh.rotation.y += dt * 1.8; }

      const dist = Math.hypot(d.x - _v1.x, y - _v1.y, d.z - _v1.z);
      if (s.maskOn || dist > P.DRONE_SIGHT) continue;
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
      if (!s.maskOn && sh.pos.distanceTo(_v1) < 0.6) { this._hit(); s.shots.splice(i, 1); }
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
      if (i < list.length) { sp.visible = true; sp.position.copy(list[i].pos); }
      else sp.visible = false;
    }
  }

  _shooting(dt) {
    const s = this.s;
    const firing = this.mode === 'playing' && (this.mouseDown || this.xrTrigger >= 0 || this._padTrig);
    // o traço fica visível por um tempinho próprio: apagar no frame seguinte
    // deixava o tiro invisível na prática
    if (s.shotVis > 0) { s.shotVis -= dt; if (s.shotVis <= 0) this.shotLine.visible = false; }
    if (!firing || s.shotCd > 0) return;
    s.shotCd = P.SHOT_CD;
    s.shotVis = 0.07;

    const src = (this.renderer.xr.isPresenting && this.activeCtrl != null) ? this.controllers[this.activeCtrl] : this.camera;
    src.getWorldPosition(_v1);
    src.getWorldQuaternion(_q1);
    _v2.set(0, 0, -1).applyQuaternion(_q1).normalize();

    // acerto por cone: janela generosa, senão mirar em VR vira sofrimento.
    // O alvo escolhido é o de menor ângulo RELATIVO à própria tolerância, para
    // um drone longe e centrado ganhar de um perto e de raspão.
    let hit = null, best = 1, hitD = P.SHOT_RANGE;
    const lv = this.level;
    for (let i = 0; i < lv.drones.length; i++) {
      const d = lv.drones[i];
      if (d.dead) continue;
      _v3.set(d.x - _v1.x, d.y - _v1.y, d.z - _v1.z);
      const dist = _v3.length();
      if (dist > P.SHOT_RANGE) continue;
      _v3.multiplyScalar(1 / dist);
      const ang = Math.acos(Math.max(-1, Math.min(1, _v3.dot(_v2))));
      const tol = Math.max(P.SHOT_TOL, Math.atan(0.5 / dist) * 1.7);
      const score = ang / tol;
      if (score < 1 && score < best) { best = score; hit = { d, i }; hitD = dist; }
    }
    if (this.bossGroup && s.boss && s.boss.open) {
      this.bossGroup.getWorldPosition(_v3);
      _v3.sub(_v1);
      const dist = _v3.length();
      _v3.multiplyScalar(1 / dist);
      if (Math.acos(Math.max(-1, Math.min(1, _v3.dot(_v2)))) < 0.14) {
        s.boss.hp--; hitD = dist;
        this.sfx.corrupt();
        if (s.boss.hp <= 0) this._winGame();
      }
    }

    if (hit) {
      hit.d.hp--;
      this.sfx.purify();
      if (hit.d.hp <= 0) { hit.d.dead = true; s.dronesKilled++; this.sfx.feed(s.dronesKilled); }
    }

    // traço do tiro
    this.shotLine.visible = true;
    _v3.copy(_v1).addScaledVector(_v2, hitD * 0.5);
    this.shotLine.position.copy(_v3);
    this.shotLine.scale.set(1, hitD, 1);
    _v3.copy(_v1).addScaledVector(_v2, hitD);
    this.shotLine.lookAt(_v3);
    this.shotLine.rotateX(Math.PI / 2);
  }

  _boss(dt) {
    const b = this.s.boss;
    b.t += dt;
    const cycle = P.BOSS_SWEEP + P.BOSS_OPEN;
    const k = b.t % cycle;
    b.open = k > P.BOSS_SWEEP;
    if (this.bossGroup) {
      const u = this.bossGroup.userData;
      u.lens.material.color.setHex(b.open ? 0xFFC93C : 0x2a0f4a);
      u.iris.material.opacity = b.open ? 0.95 : 0.35;
      u.shell.rotation.y += dt * 0.5;
      u.shell.rotation.x += dt * 0.25;
    }
    if (!b.open) {
      // feixe rotativo na altura do peito: agacha
      b.ang += dt * 1.5;
      const cz = this.level.end + 6;
      if (this.bossBeam) {
        this.bossBeam.visible = true;
        this.bossBeam.position.set(0, 1.28, cz + 9);
        this.bossBeam.rotation.y = b.ang;
      }
      const pl = this.pl;
      // distância do jogador até a reta do feixe (no plano XZ, altura fixa)
      const dx = pl.pos.x - 0, dz = pl.pos.z - (cz + 9);
      const nx = Math.cos(b.ang), nz = -Math.sin(b.ang);
      const dist = Math.abs(dx * nz - dz * nx);
      if (!this.s.maskOn && dist < 0.45 && 1.28 >= pl.pos.y && 1.28 <= pl.pos.y + pl.h) this._hit();
    } else if (this.bossBeam) this.bossBeam.visible = false;

    if (b.t > cycle && Math.floor(b.t / cycle) !== b.lastCycle) {
      b.lastCycle = Math.floor(b.t / cycle);
      // reanima dois drones a cada ciclo
      let n = 0;
      for (const d of this.level.drones) { if (d.dead && n < 2) { d.dead = false; d.hp = P.DRONE_HP; n++; } }
    }
  }

  _gate() {
    const s = this.s, g = this.level.gate, pl = this.pl;
    // não basta ter os pedaços: eles precisam estar montados no pedestal
    const ready = s.deposto && (!s.boss || s.boss.hp <= 0);
    if (ready !== s.gateOpen) {
      s.gateOpen = ready;
      s.gateT = s.t;                       // marca o instante da destrava
      this.gateLabel.material.map = this._label(ready ? STR.gate_open : STR.gate_locked, ready ? '#00E5FF' : '#FF2D9B');
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
    this._sayOnce('hurt', 4);
    // empurrão para trás, para o jogador sair do perigo
    this.camera.getWorldDirection(_v1);
    this.pl.vel.addScaledVector(_v1.setY(0).normalize(), -P.KNOCK);
    this.pl.vel.y = Math.max(this.pl.vel.y, 3);
    if (s.lives <= 0) this._death(false);
  }

  _death(timeout) {
    if (this.s.done) return;
    this.s.done = true;
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
    g.fillText(`${s.frags}/${s.need}`, 30, 104);

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
    g.fillStyle = '#FFC93C'; g.font = 'bold 28px system-ui, sans-serif';
    g.fillText(STR.aya_name, 24, 42);
    g.fillStyle = '#F3EFE6'; g.font = '29px system-ui, sans-serif';
    this._wrap(g, this.s.aya, 24, 88, canvas.width - 48, 38);
    tex.needsUpdate = true;
  }

  _wrap(g, text, x, y, maxW, lh) {
    const words = String(text).split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    }
    if (line) g.fillText(line, x, yy);
  }

  // ------------------------------------------------------------- laço
  _frame(now) {
    const t = now / 1000;
    if (this._last === undefined) this._last = t;
    let dt = t - this._last;
    this._last = t;
    if (dt > 0.2) dt = 0.2;

    this._padTrig = this._pad();

    if (!this.renderer.xr.isPresenting) {
      const T = P.TURN_SPEED * dt;
      if (this.held.has('lookleft')) this._look(T, 0);
      if (this.held.has('lookright')) this._look(-T, 0);
      this.camera.rotation.set(this.in.pitch, this.in.yaw, 0, 'YXZ');
      if (this.s && this.s.shake > 0 && this.opts.shake) {
        this.camera.rotation.z = Math.sin(t * 47) * 0.022 * this.s.shake;
      }
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

    this.maskView.material.opacity = s && s.maskOn ? 0.90 : 0;
    this.hurt.material.opacity = s ? s.hurt * (this.opts.flash ? 0.5 : 0.2) : 0;
    this.playerLight.intensity = s && s.maskOn ? 2.1 : 2.8;

    // Painéis no mundo SÓ dentro do VR (lá não existe "tela"). No PC/celular o
    // HUD é interface fixa em DOM (index.html), que lê o estado em game.s.
    const inVR = this.renderer.xr.isPresenting;
    if (inVR) {
      this.camera.getWorldPosition(_v1);
      this.camera.getWorldQuaternion(_q1);
      _v2.set(0, 0, -1).applyQuaternion(_q1);
      const yaw = Math.atan2(-_v2.x, -_v2.z);
      for (const [pan, dist, hgt, tilt] of [
        [this.hud, 4.0, -1.42, -0.42], [this.sub, 4.0, -0.88, -0.26], [this.banner, 5.0, 0.65, -0.02],
      ]) {
        pan.mesh.position.set(_v1.x - Math.sin(yaw) * dist, _v1.y + hgt, _v1.z - Math.cos(yaw) * dist);
        pan.mesh.rotation.set(tilt, yaw, 0, 'YXZ');
      }
      this.hud.mesh.visible = true;
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
    }
  }
}

export { LEVELS, P, STR };
