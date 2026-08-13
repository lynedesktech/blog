// Todas as strings visíveis ao jogador. Trocar de idioma = trocar este arquivo.

export const STR = {
  lang: 'pt-BR',

  title: 'O CORREDOR CODIFICADO',
  subtitle: 'Recolha os pedaços do seu rosto até o sistema conseguir te reconhecer.',

  btn_vr: 'ENTRAR EM VR',
  btn_flat: 'JOGAR NO NAVEGADOR',
  btn_how: 'COMO JOGAR',
  btn_back: 'VOLTAR',
  btn_again: 'TENTAR DE NOVO',
  btn_next: 'PRÓXIMA FASE',
  btn_credits: 'SOBRE O TEMA',

  vr_unsupported: 'VR não detectado neste aparelho. O modo navegador tem o jogo completo.',

  how_title: 'COMO JOGAR',
  how_body: [
    'Cada fase é um corredor do sistema de reconhecimento. Espalhados por ele estão PEDAÇOS DO SEU ROSTO. Junte o tanto que o portão do fim pede e ele te reconhece e abre.',
    'Ande com WASD, PULE com espaço e AGACHE com Ctrl (no VR: agache de verdade, o jogo lê a altura do seu capacete).',
    'A MÁSCARA BRANCA aparece logo no início e é sua escolha o tempo todo. Com ela no rosto os feixes deixam passar, os drones não te veem e as paredes-scanner abrem.',
    'Só que a máscara SUPERAQUECE: ela aguenta poucos segundos ligada e depois precisa esfriar. Dá para atravessar um trecho, não a fase inteira.',
    'Da fase 3 em diante aparecem drones. Atire neles segurando o clique. Sem máscara você é alvo; de máscara você é invisível para eles.',
    'Tempo acabou ou vidas acabaram: o modelo é lançado do jeito que está e você recomeça a fase.',
  ],

  ctrl_title: 'CONTROLES',
  ctrl_vr: 'VR: analógico esquerdo anda · direito gira · gatilho atira · grip veste a máscara · agache de verdade sob feixes e tetos baixos',
  ctrl_desk: 'PC: WASD anda · ESPAÇO pula · CTRL agacha · clique atira · F veste a máscara',
  ctrl_touch: 'Celular: metade esquerda anda · metade direita olha · botões PULO, AGACHAR e MÁSCARA',
  ctrl_pad: 'Controle: analógico esquerdo anda · direito gira · A pula · RT atira · LB máscara',

  hud_frag: 'ROSTO',
  hud_hunt: 'CAÇADA',
  hud_time: 'TEMPO',
  hud_lives: 'VIDAS',
  hud_mask: 'MÁSCARA',
  hud_phase: 'FASE',
  hud_obj: 'OBJETIVO',
  hud_boss: 'OLHO CENTRAL',
  hud_overheat: 'SUPERAQUECIDA',

  btn_jump: 'PULO',
  btn_duck: 'AGACHAR',
  btn_mask: 'MÁSCARA',

  obj_collect: 'Recolha os pedaços do seu rosto',
  obj_hunt: 'Máscara {m} · drones derrubados {d}. Use as paredes de cobertura',
  hunt_locked: 'AINDA HÁ ALVOS',
  hunt_retry: 'Você voltou para a entrada. O que você já derrubou continua no chão: a caçada não recomeça.',
  obj_gate: 'Rosto completo: encaixe os pedaços no pedestal',
  ped_label: 'ENCAIXE O ROSTO',
  obj_boss: 'Agache no feixe e atire quando a lente abrir',
  mask_label: 'MÁSCARA BRANCA',
  obj_mask: 'Parede-scanner à frente: vista a máscara para o sistema te reconhecer',

  gate_locked: 'ROSTO INCOMPLETO',
  gate_open: 'RECONHECIDO',

  aya_name: 'AYA',
  aya: {
    start: 'Cada pedaço desses é um dado do seu rosto que o sistema não tem. Junte tudo e ele é obrigado a te reconhecer.',
    first_frag: 'Um pedaço. O portão do fim só abre com o rosto completo.',
    mask_found: 'A máscara branca é sua. Aperte E, ou o botão MÁSCARA, para vestir: com ela no rosto os feixes deixam passar e os drones não te veem, não porque você mudou, mas porque parou de parecer você. Foi assim que a pesquisadora descobriu a falha.',
    mask_on: 'Agora ele te vê. Repare no que isso quer dizer: ele te aceita justamente quando você não está sendo você.',
    vr_pronto: 'Pronto, calibrei na sua altura. O relógio no seu pulso esquerdo mostra tudo: levanta o braço para ver.',
    mask_hot: 'A máscara superaqueceu. Tire e espere esfriar.',
    duck: 'Agache. O feixe passa na altura do peito.',
    jump: 'Esse passa rente ao chão. Pula.',
    cam: 'Câmera. Se ela te fixar sem máscara, dispara o alarme.',
    drone: 'Drone-vigia. Segure o tiro nele, ou passe de máscara, que ele nem te vê.',
    scan: 'Parede-scanner. Essa só abre para quem o sistema reconhece. Máscara.',
    gate_ready: 'Rosto completo. Leva os pedaços até o pedestal e monta a tua cara na frente dele.',
    face_done: 'Pronto. É o teu rosto inteiro ali, montado peça por peça. Agora ele não tem como dizer que não te conhece. A porta abre.',
    hunt: 'Aqui o jogo vira: atire. A máscara está logo à frente; pega, veste no E quando quiser, e derruba os cinco drones usando as paredes de cobertura. A porta abre com tudo feito.',
    hunt_done: 'Todos os drones no chão. Se a máscara já é sua, a porta te espera.',
    hurt: 'Você foi apagado do quadro. Levanta.',
    boss: 'O olho central. Ele varre a sala com o feixe, então agache. Quando a lente abrir, atire.',
    boss_beams: 'São dois feixes: o de cima pede agachar, o rente ao chão pede pulo. Eles giram em sentidos contrários, então olhe qual está vindo.',
    boss_open: 'A lente abriu. É agora — é a única hora em que ele sente.',
    boss_ajuda: 'Ele está chamando reforço. Derrube os drones ou corra deles, mas não perca a abertura da lente.',
    win: 'Reconhecida. Foi um trabalho assim, pedaço por pedaço, que fez três gigantes corrigirem seus sistemas.',
  },

  // ---------------------------------------------------------------- o chefe
  // Ele não xinga: fala como um sistema de auditoria justificando a própria
  // decisão. É o que torna o confronto o assunto do jogo e não só uma luta.
  boss_name: 'OLHO CENTRAL',
  boss: {
    intro: 'CONFIANÇA DA CORRESPONDÊNCIA: 3%. RECOMENDAÇÃO: NEGAR ACESSO.',
    salvo: 'AMOSTRA INSUFICIENTE. COLETANDO À FORÇA.',
    spawn: 'CHAMANDO VERIFICADORES AUXILIARES.',
    half: 'ANOMALIA PERSISTENTE. AUMENTANDO O RIGOR DO FILTRO.',
    low: 'INTEGRIDADE CRÍTICA. O REGISTRO NÃO PODE SER CORRIGIDO.',
    dead: 'MODELO INVALIDADO. REAUDITORIA OBRIGATÓRIA.',
    trancou: 'CÂMARA SELADA. A AUDITADA NÃO SAI ANTES DO VEREDITO.',
  },
  hud_bossbar: 'INTEGRIDADE DO MODELO',

  // ---------------------------------------------------------------- NARRAÇÃO
  // A AYA falava no começo da fase e depois emudecia: as outras falas dela são
  // presas a eventos (achar a máscara, ver um drone, chegar num feixe), e a
  // fase 1 não tem nenhum desses. O jogador atravessava dois minutos de
  // corredor em silêncio.
  //
  // Aqui a história é contada por DISTÂNCIA ANDADA. Cada linha tem um `em`,
  // que é a fração do corredor já percorrida, então o texto acompanha quem
  // joga: quem corre ouve mais junto, quem explora ouve espaçado. É uma fala
  // por capítulo, e os cinco capítulos, na ordem, contam a pesquisa inteira —
  // da primeira palavra à última.
  narrativa: [
    // FASE 1 — o que é este lugar, e o que são os pedaços
    [
      { em: 0.10, t: 'Isto aqui é um sistema de reconhecimento facial visto por dentro. Cada corredor é uma etapa da decisão que ele toma sobre você.' },
      { em: 0.32, t: 'Os pedaços dourados são dados do seu rosto. Enquanto faltarem, para ele você simplesmente não está aqui.' },
      { em: 0.56, t: 'Em 2018, uma pesquisadora do MIT chamada Joy Buolamwini resolveu medir quanto esses sistemas erravam. Ninguém tinha feito essa conta separando as pessoas.' },
      { em: 0.80, t: 'Para homens de pele clara, o erro era quase zero. Para mulheres de pele escura, chegava a 34,7 por cento. Um em cada três rostos.' },
    ],
    // FASE 2 — a máscara branca
    [
      { em: 0.12, t: 'A máscara branca deste corredor não é invenção do jogo. É uma coisa que aconteceu de verdade.' },
      { em: 0.34, t: 'O software do laboratório não achava o rosto da Joy. Ela pegou uma máscara branca de plástico, colocou no rosto, e o sistema detectou na hora.' },
      { em: 0.58, t: 'Pare um segundo no que isso quer dizer: a máquina te aceita justamente quando você deixa de parecer você.' },
      { em: 0.82, t: 'Ela deu nome a isso: o olhar codificado. O ponto cego de quem programou virou o olho do sistema.' },
    ],
    // FASE 3 — o que acontece quando isso sai do laboratório
    [
      { em: 0.12, t: 'Reconhecimento facial não ficou no laboratório. Ele foi para a rua, para a portaria, para a câmera da esquina.' },
      { em: 0.36, t: 'Polícias passaram a usar essas comparações para apontar suspeitos. Uma semelhança calculada por máquina virou motivo de abordagem.' },
      { em: 0.60, t: 'Nos Estados Unidos houve prisões de pessoas inocentes por causa de uma correspondência errada do sistema.' },
      { em: 0.84, t: 'Os casos que vieram a público têm uma coisa em comum: todas as pessoas presas por erro eram negras.' },
    ],
    // FASE 4 — por que o erro passa
    [
      { em: 0.12, t: 'Esta fase tem pressa de propósito. Modelo com prazo de lançamento é modelo testado com pressa.' },
      { em: 0.36, t: 'Testar em todo mundo custa tempo e dinheiro. Testar em quem está na sala é barato e rápido.' },
      { em: 0.60, t: 'Quando a sala inteira se parece com quem programou, o erro só aparece depois. E aparece em cima de quem não estava lá.' },
      { em: 0.84, t: 'A Joy fundou a Liga da Justiça Algorítmica para que esse erro tivesse endereço, nome e alguém para responder por ele.' },
    ],
    // FASE 5 — a auditoria, e o que ela mudou
    [
      { em: 0.08, t: 'Chegamos ao olho central. É ele que decide quem é reconhecido e quem é descartado.' },
      { em: 0.28, t: 'O estudo dela se chama Gender Shades. Ela auditou os sistemas da IBM, da Microsoft e da Face mais mais, e publicou os números com nome e data.' },
      { em: 0.48, t: 'As três empresas corrigiram seus modelos depois disso. Não foi um discurso que mudou o sistema. Foi medida publicada.' },
      { em: 0.68, t: 'É por isso que você atravessou tudo isto recolhendo pedaço por pedaço. Auditar é exatamente isso: juntar prova até não dar mais para negar.' },
    ],
  ],

  phase_intro: 'FASE',
  phase_done: 'FASE CONCLUÍDA',
  next_in: 'Próxima fase em',

  win_title: 'SISTEMA CORRIGIDO',
  vr_ctrl_l: 'ANALÓGICO anda · GRIP máscara',
  vr_ctrl_r: 'GATILHO atira · A pula · ANALÓGICO gira',
  vr_reinicio: 'Você zerou. Aperte o gatilho para jogar de novo.',
  win_body: 'Você atravessou as cinco fases e obrigou o modelo a enxergar o seu rosto.',
  lose_title: 'APAGADO DO QUADRO',
  lose_body: 'O sistema te perdeu. Foi exatamente isso que aconteceu com milhões de pessoas nos modelos auditados em 2018.',

  res_phase: 'FASE ALCANÇADA',
  res_frag: 'PEDAÇOS RECOLHIDOS',
  res_time: 'TEMPO',
  res_drones: 'DRONES DERRUBADOS',
  res_deaths: 'VEZES APAGADO',

  credits_title: 'SOBRE O TEMA',
  credits_body: [
    'Este jogo é uma homenagem ao trabalho de Joy Buolamwini, cientista da computação, poeta do código e fundadora da Algorithmic Justice League.',
    'Em 2018, no estudo Gender Shades, ela e Timnit Gebru auditaram os sistemas comerciais de análise facial da IBM, da Microsoft e da Face++. Para homens de pele clara o erro ficava perto de zero. Para mulheres de pele escura chegava a 34,7%.',
    'A máscara branca do jogo não é invenção: o software de detecção facial só reconhecia o rosto dela quando ela colocava uma máscara branca por cima. É de onde vem a escolha central daqui: ser visto sendo outra pessoa, ou ser você e ser apagado.',
    'A auditoria levou as três empresas a corrigir seus modelos e virou base de políticas públicas sobre reconhecimento facial no mundo inteiro.',
    'A guia AYA é uma personagem fictícia, não é retrato da pesquisadora.',
  ],
  credits_link: 'gendershades.org · ajl.org',

  a11y_shake: 'Tremor de tela',
  a11y_flash: 'Flashes',
  a11y_text: 'Texto grande',
  a11y_snap: 'Giro em passos (VR)',
  a11y_on: 'LIGADO',
  a11y_off: 'DESLIGADO',
};
