// Voz da Joy pela ElevenLabs.
//
// A voz do navegador (speechSynthesis) muda de aparelho para aparelho e em
// muitos deles sai robótica. Aqui o áudio vem pronto do servidor, igual em
// qualquer celular e em qualquer computador da escola.
//
// A chave fica SÓ aqui, na variável de ambiente ELEVENLABS_API_KEY, e nunca
// aparece no navegador de quem visita o blog.
//
// Sem a chave configurada, este endpoint responde 503 e o blog volta sozinho
// para a voz do navegador. O blog não quebra, só fica com a voz antiga.

const API = "https://api.elevenlabs.io/v1";

// Modelo: o flash é o mais rápido que fala português. Latência importa mais
// que sutileza aqui, porque tem gente esperando na frente do totem.
const MODELO = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

const LIMITE_CARACTERES = 700;   // a resposta da Joy tem 5 linhas curtas

// Voz padrão: a Lily.
//
// A escolha não foi no gosto. Medi a frequência de base da AYA, a guia do
// jogo, no vídeo dela: 205 Hz. Depois gerei a mesma frase em português com as
// seis vozes femininas disponíveis e medi cada uma. Lily deu 205 Hz cravado,
// Alice 213, Jessica 232, Sarah 229, Matilda 254, Bella 276. A voz do blog
// ficou sendo a que mais se aproxima da voz do jogo.
//
// As vozes brasileiras da conta (Carla, Roberta, Michelle) soariam melhor,
// mas são "library voices" e o plano free não libera elas pela API. Assinando
// um plano pago, basta colar o id de uma delas em ELEVENLABS_VOICE_ID.
const VOZ_PADRAO = "pFZP5JQG7iQjIQuC4Bku";   // Lily

let vozEmCache = process.env.ELEVENLABS_VOICE_ID || null;

async function escolherVoz(chave) {
  if (vozEmCache) return vozEmCache;

  // A padrão só vale se a conta realmente tiver ela.
  const r = await fetch(API + "/voices", { headers: { "xi-api-key": chave } });
  if (!r.ok) throw new Error("Não consegui listar as vozes: HTTP " + r.status);

  const { voices = [] } = await r.json();
  if (!voices.length) throw new Error("A conta da ElevenLabs não tem voz nenhuma.");

  if (voices.some((v) => v.voice_id === VOZ_PADRAO)) {
    vozEmCache = VOZ_PADRAO;
    return vozEmCache;
  }

  // Preferência: voz feminina, e de preferência marcada como multilíngue.
  const nota = (v) => {
    const g = (v.labels && (v.labels.gender || v.labels.Gender)) || "";
    const idiomas = JSON.stringify(v.labels || {}) + " " + (v.description || "");
    let n = 0;
    if (/female|feminin/i.test(g)) n += 10;
    if (/multiling|portug|brazil/i.test(idiomas)) n += 5;
    if (v.category === "premade") n += 1;
    return n;
  };
  const melhor = voices.slice().sort((a, b) => nota(b) - nota(a))[0];
  vozEmCache = melhor.voice_id;
  return vozEmCache;
}

export default async function handler(req, res) {
  const chave = process.env.ELEVENLABS_API_KEY;
  if (!chave) {
    // 503 e não 500: não é defeito, é chave que falta. O blog trata como
    // "usa a voz do navegador" e segue.
    return res.status(503).json({ erro: "ELEVENLABS_API_KEY não configurada." });
  }

  // GET com ?texto= devolve o áudio. Parece detalhe, mas não é: com POST o
  // CDN da Vercel não guarda nada e cada visitante que clicar na mesma
  // pergunta sugerida gasta caracteres de novo. Sendo GET, a segunda pessoa
  // em diante recebe o áudio da borda, de graça. Com 10 mil caracteres por
  // mês no plano free, isso é a diferença entre durar a feira inteira e
  // acabar no primeiro intervalo.
  if (req.method === "GET" && (req.query?.texto || "").trim()) {
    return gerar(res, chave, String(req.query.texto).trim().slice(0, LIMITE_CARACTERES),
                 req.query.voz ? String(req.query.voz) : null);
  }

  // GET ?cota=1 diz quanto ainda sobra no mês.
  //
  // Existe porque a pergunta "quanto tempo isso dura?" não tem resposta fixa:
  // depende de quantas perguntas as pessoas fizerem. O plano free dá 10 mil
  // créditos por mês, e cada resposta da Joy gasta por volta de 320
  // caracteres. O que este endereço faz é trocar a estimativa pelo número
  // real, a qualquer momento, sem precisar entrar no painel da ElevenLabs.
  //
  // A conta de quantas respostas ainda cabem é a PESSIMISTA, de um crédito
  // por caractere. Os modelos flash costumam custar metade disso, então o
  // número que aparece aqui é o piso, não o teto.
  if (req.method === "GET" && req.query?.cota) {
    try {
      const r = await fetch(API + "/user/subscription", { headers: { "xi-api-key": chave } });
      if (!r.ok) return res.status(502).json({ erro: "HTTP " + r.status + " ao ler a cota." });
      const s = await r.json();
      const limite = s.character_limit || 0;
      const usados = s.character_count || 0;
      const restam = Math.max(0, limite - usados);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        plano: s.tier || null,
        limiteDoMes: limite,
        jaUsados: usados,
        restam,
        zeraEm: s.next_character_count_reset_unix
          ? new Date(s.next_character_count_reset_unix * 1000).toISOString().slice(0, 10)
          : null,
        umaRespostaDaJoy: 320,
        respostasQueAindaCabem: Math.floor(restam / 320),
        observacao: "Conta pessimista, de 1 credito por caractere. No flash costuma ser metade.",
      });
    } catch (e) {
      return res.status(502).json({ erro: e.message });
    }
  }

  // GET sem texto lista as vozes da conta, para escolher qual usar e colar o
  // id na variável de ambiente. Serve de diagnóstico também: se isto
  // responde, a chave está certa.
  if (req.method === "GET") {
    try {
      const r = await fetch(API + "/voices", { headers: { "xi-api-key": chave } });
      if (!r.ok) return res.status(502).json({ erro: "HTTP " + r.status + " ao listar vozes." });
      const { voices = [] } = await r.json();
      return res.status(200).json({
        usando: await escolherVoz(chave),
        vozes: voices.map((v) => ({
          id: v.voice_id,
          nome: v.name,
          rotulos: v.labels || {},
        })),
      });
    } catch (e) {
      return res.status(502).json({ erro: e.message });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erro: "Use POST." });
  }

  const texto = String(req.body?.texto || "").trim().slice(0, LIMITE_CARACTERES);
  if (!texto) return res.status(400).json({ erro: "Envie { texto }." });
  return gerar(res, chave, texto, null);
}

async function gerar(res, chave, texto, vozPedida) {
  try {
    const voz = vozPedida || (await escolherVoz(chave));
    const r = await fetch(
      API + "/text-to-speech/" + voz + "?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: { "xi-api-key": chave, "content-type": "application/json" },
        body: JSON.stringify({
          text: texto,
          model_id: MODELO,
          language_code: "pt",
          voice_settings: {
            // Estabilidade alta deixa a leitura firme, sem a variação de
            // entonação que soa teatral quando a frase é curta.
            stability: 0.55,
            similarity_boost: 0.8,
            speed: 1.0,
          },
        }),
      }
    );

    if (!r.ok) {
      const detalhe = await r.text().catch(() => "");
      console.error("ElevenLabs:", r.status, detalhe.slice(0, 300));
      // 401 chave errada, 402 sem crédito, 429 rápido demais. Nos três casos
      // não adianta o blog insistir: ele repassa como 503 e volta para a voz
      // do navegador até a página ser recarregada.
      const desistir = r.status === 401 || r.status === 402 || r.status === 429;
      return res.status(desistir ? 503 : 502)
                .json({ erro: "A ElevenLabs devolveu HTTP " + r.status });
    }

    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audio.length));
    // s-maxage é o que faz o CDN da Vercel guardar e servir sem gastar
    // caracteres de novo. Uma semana: a resposta para a mesma pergunta não
    // muda, e se mudar é só trocar o texto.
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    return res.status(200).send(audio);
  } catch (e) {
    console.error("Erro ao gerar voz:", e);
    return res.status(502).json({ erro: "Não consegui gerar o áudio." });
  }
}
