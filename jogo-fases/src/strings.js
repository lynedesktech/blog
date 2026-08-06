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

  vr_unsupported: 'VR não detectado neste aparelho — o modo navegador tem o jogo completo.',

  how_title: 'COMO JOGAR',
  how_body: [
    'Cada fase é um corredor do sistema de reconhecimento. Espalhados por ele estão PEDAÇOS DO SEU ROSTO. Junte o tanto que o portão do fim pede e ele te reconhece e abre.',
    'Ande com WASD, PULE com espaço e AGACHE com Ctrl (no VR: agache de verdade, o jogo lê a altura do seu capacete).',
    'A MÁSCARA BRANCA é sua escolha o tempo todo. Com ela no rosto o sistema finalmente te enxerga: feixes, câmeras e drones te ignoram e as paredes-scanner abrem.',
    'Mas de máscara você NÃO consegue coletar pedaço nenhum — você não está sendo reconhecido como você. E ela superaquece: só dá pra usar em trechos curtos.',
    'Da fase 3 em diante aparecem drones. Atire neles segurando o clique. Sem máscara você é alvo; de máscara você é invisível para eles.',
    'Tempo acabou ou vidas acabaram: o modelo é lançado do jeito que está e você recomeça a fase.',
  ],

  ctrl_title: 'CONTROLES',
  ctrl_vr: 'VR: analógico esquerdo anda · direito gira · gatilho atira · grip veste a máscara · agache de verdade para passar sob os feixes',
  ctrl_desk: 'PC: WASD anda · ESPAÇO pula · CTRL agacha · clique atira · F veste a máscara',
  ctrl_touch: 'Celular: metade esquerda anda · metade direita olha · botões PULO, AGACHAR e MÁSCARA',
  ctrl_pad: 'Controle: analógico esquerdo anda · direito gira · A pula · RT atira · LB máscara',

  hud_frag: 'ROSTO',
  hud_time: 'TEMPO',
  hud_lives: 'VIDAS',
  hud_mask: 'MÁSCARA',
  hud_masks: 'NA MOCHILA',
  hud_phase: 'FASE',
  hud_obj: 'OBJETIVO',
  hud_boss: 'OLHO CENTRAL',
  hud_overheat: 'SUPERAQUECIDA',

  btn_jump: 'PULO',
  btn_duck: 'AGACHAR',
  btn_mask: 'MÁSCARA',

  obj_collect: 'Recolha os pedaços do seu rosto',
  obj_gate: 'Rosto completo — vá até o portão',
  obj_boss: 'Agache no feixe e atire quando a lente abrir',
  slot_label: 'ENCAIXE A MÁSCARA',
  obj_mask: 'Parede-scanner à frente — vista a máscara (F) para o sistema te reconhecer',

  gate_locked: 'ROSTO INCOMPLETO',
  gate_open: 'RECONHECIDO',

  aya_name: 'AYA',
  aya: {
    start: 'Cada pedaço desses é um dado do seu rosto que o sistema não tem. Junte tudo e ele é obrigado a te reconhecer.',
    first_frag: 'Um pedaço. O portão do fim só abre com o rosto completo.',
    mask_item: 'Uma máscara branca. Guarda contigo — é ela que faz o sistema aceitar que você existe.',
    slot_empty: 'O encaixe está vazio e você não tem máscara nenhuma. Tem uma largada aí atrás; volta e procura.',
    mask_found: 'Encaixou, e ela foi para o seu rosto. Agora aquela parede te deixa passar — não porque você mudou, mas porque parou de parecer você. Foi literalmente assim que a pesquisadora descobriu a falha.',
    mask_on: 'Agora ele te vê. Mas repare: de máscara você não consegue recolher nada. Você não é você para ele.',
    mask_hot: 'A máscara superaqueceu. Tire e espere esfriar.',
    duck: 'Agache. O feixe passa na altura do peito.',
    jump: 'Esse passa rente ao chão. Pula.',
    cam: 'Câmera. Se ela te fixar sem máscara, dispara o alarme.',
    drone: 'Drone-vigia. Segure o tiro nele — ou passe de máscara, que ele nem te vê.',
    scan: 'Parede-scanner. Essa só abre para quem o sistema reconhece. Máscara.',
    gate_ready: 'Rosto completo. O portão vai ter que abrir.',
    hurt: 'Você foi apagado do quadro. Levanta.',
    boss: 'O olho central. Ele varre a sala com o feixe — agache. Quando a lente abrir, atire.',
    win: 'Reconhecida. Foi um trabalho assim, pedaço por pedaço, que fez três gigantes corrigirem seus sistemas.',
  },

  phase_intro: 'FASE',
  phase_done: 'FASE CONCLUÍDA',
  next_in: 'Próxima fase em',

  win_title: 'SISTEMA CORRIGIDO',
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
    'A máscara branca do jogo não é invenção: o software de detecção facial só reconhecia o rosto dela quando ela colocava uma máscara branca por cima. É de onde vem a escolha central daqui — ser visto sendo outra pessoa, ou ser você e ser apagado.',
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
