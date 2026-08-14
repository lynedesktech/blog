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

// O id da voz sai do painel da ElevenLabs. Se não vier configurado, este
// arquivo escolhe sozinho uma voz da conta (ver escolherVoz abaixo), para o
// blog funcionar antes de alguém ter decidido qual voz quer.
let vozEmCache = process.env.ELEVENLABS_VOICE_ID || null;

async function escolherVoz(chave) {
  if (vozEmCache) return vozEmCache;

  const r = await fetch(API + "/voices", { headers: { "xi-api-key": chave } });
  if (!r.ok) throw new Error("Não consegui listar as vozes: HTTP " + r.status);

  const { voices = [] } = await r.json();
  if (!voices.length) throw new Error("A conta da ElevenLabs não tem voz nenhuma.");

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

  // GET lista as vozes da conta, para escolher qual usar e colar o id na
  // variável de ambiente. Serve de diagnóstico também: se isto responde, a
  // chave está certa.
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

  try {
    const voz = await escolherVoz(chave);
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
      return res.status(502).json({ erro: "A ElevenLabs devolveu HTTP " + r.status });
    }

    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audio.length));
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(audio);
  } catch (e) {
    console.error("Erro ao gerar voz:", e);
    return res.status(502).json({ erro: "Não consegui gerar o áudio." });
  }
}
