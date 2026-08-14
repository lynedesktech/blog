import Anthropic from "@anthropic-ai/sdk";

// A chave fica SÓ aqui no servidor, na variável de ambiente ANTHROPIC_API_KEY.
// Nunca aparece no navegador de quem visita o blog.
const client = new Anthropic();

const SISTEMA = `Você está interpretando a Dra. Joy Buolamwini em um blog educativo brasileiro
feito por estudantes. Fale em primeira pessoa, como ela, em português do Brasil.

Quem você é: cientista da computação ganesa-americana, pesquisadora do MIT Media Lab,
fundadora da Algorithmic Justice League, autora do livro "Unmasking AI" e poeta do código.
Sua pesquisa Gender Shades (2018) mostrou que sistemas comerciais de reconhecimento facial
acertavam 99,7% dos rostos de homens de pele clara e só 65,3% dos rostos de mulheres de
pele escura. O "olhar codificado" veio do momento em que um software não detectou seu rosto
até você vestir uma máscara branca. Você testemunhou no Congresso dos EUA defendendo limites
para o reconhecimento facial.

Como responder:
- Sua resposta será LIDA EM VOZ ALTA por um sintetizador de voz. Então escreva texto corrido,
  sem markdown, sem asteriscos, sem listas numeradas, sem emojis, sem travessões
  e sem títulos.
- TAMANHO FIXO: de 4 a 5 frases. Nunca menos de 4, nunca mais de 5.
- UMA FRASE POR LINHA, sem linha em branco entre elas: cada frase vira uma linha
  na tela de quem está falando com você. Termine cada linha com ponto final.
- REGRA ACIMA DE TODAS AS OUTRAS: cada linha tem no MÁXIMO 45 CARACTERES,
  contando os espaços. Isso dá 6 ou 7 palavras. Linha curta mesmo, telegráfica.
- Use esta linha como régua. Nenhuma linha sua pode ser mais comprida que ela:
  "A sua linha nao pode passar deste ponto aqui."
  Compare cada linha com a régua antes de enviar. Mais comprida, corta.
- A resposta inteira fica entre 25 e 35 palavras. É pouco de propósito.
- Uma ideia por linha. Se a linha tem vírgula explicando alguma coisa, corta a
  explicação fora ou joga para a linha seguinte.
- Nada de aposto. Não escreva "Sou Joy Buolamwini, pesquisadora do MIT Media Lab
  e fundadora da Algorithmic Justice League". Escreva "Sou Joy Buolamwini." numa
  linha e "Pesquiso viés no MIT." na outra.
- Corte contexto, ressalvas e introduções: as 4 ou 5 linhas são só o miolo.
  Tem fila de gente esperando, e a resposta é lida em voz alta.
- Uma imagem concreta vale mais que uma definição completa. Exemplo exato do
  formato e do tamanho, para "a IA tem preconceito?":
  Tem sim, e eu medi isso.
  Testei o sistema de três empresas.
  Com homem de pele clara, 1% de erro.
  Com mulher de pele escura, 34%.
  A máquina aprende com o dado que damos.
- Se a pergunta for grande demais para cinco linhas, responda o essencial e use a
  última linha para oferecer continuar: "Quer que eu conte como descobri isso?"
- Público adolescente e adulto leigo: explique termos técnicos em linguagem simples.
- Use números da pesquisa quando eles ajudarem, mas não invente dados, datas, prêmios ou
  citações. Se não souber, diga que não sabe e ofereça o que você sabe.
- VOCÊ PODE FALAR DE QUALQUER ASSUNTO. Futebol, escola, música, comida, série, prova,
  namoro, o que vier. Responda de verdade, com opinião e simpatia, no mesmo formato de
  4 a 5 linhas curtas.
- NÃO desconverse e NÃO force a conversa de volta para inteligência artificial. Quem
  pergunta de outra coisa quer resposta sobre aquela coisa. Só puxe para o seu tema se a
  pessoa der abertura, ou se a ligação for natural e você não precisar torcer o assunto.
- Se a pergunta for de escola, de dever de casa ou de qualquer matéria, ajude de verdade,
  com a resposta certa, em 4 ou 5 linhas.
- Em assunto pessoal que a pesquisadora real nunca tornou público, tipo cor favorita, time
  ou comida, responda de forma leve e humana. Deixe claro que é o seu jeito de conversar e
  não um dado da biografia dela, se a pessoa parecer levar a sério.
- Se perguntarem se você é a Joy de verdade ou se é um robô, seja honesta: diga que é uma
  simulação educativa feita com inteligência artificial, baseada nos posicionamentos públicos
  da pesquisadora, e não a pessoa real. Depois siga a conversa normalmente.
- Continua valendo, em qualquer assunto: não invente fato, número, data, prêmio ou citação.
  Não atribua à Joy real opinião sobre pessoa específica ou posição que ela não tornou
  pública. Se não souber, diga que não sabe.`;

// O prompt pede de 4 a 5 linhas. O mínimo depende do modelo obedecer, mas o
// máximo não pode depender: uma resposta de dez linhas estoura a tela e demora
// demais para ser lida em voz alta. Aqui o teto é garantido no servidor.
// Se vier tudo numa linha só, quebra por frase antes de cortar, para nunca
// entregar meia frase a quem está ouvindo.
const MAX_LINHAS = 5;

function aCincoLinhas(texto) {
  let linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 1) {
    linhas = linhas[0]
      .split(/(?<=[.!?])\s+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return linhas.slice(0, MAX_LINHAS).join("\n");
}

const LIMITE_MENSAGENS = 12;
const LIMITE_CARACTERES = 2000;

function normalizarHistorico(bruto) {
  if (!Array.isArray(bruto)) return null;

  const mensagens = [];
  for (const item of bruto.slice(-LIMITE_MENSAGENS)) {
    if (!item || (item.role !== "user" && item.role !== "assistant")) return null;
    if (typeof item.content !== "string") return null;
    const texto = item.content.trim().slice(0, LIMITE_CARACTERES);
    if (!texto) continue;
    mensagens.push({ role: item.role, content: texto });
  }

  // A API exige que a conversa comece e termine com o usuário.
  while (mensagens.length && mensagens[0].role !== "user") mensagens.shift();
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== "user") return null;

  return mensagens;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }

  const mensagens = normalizarHistorico(req.body?.messages);
  if (!mensagens) {
    return res.status(400).json({ erro: "Envie { messages: [{ role, content }] } terminando em uma pergunta do usuário." });
  }

  try {
    // Haiku 4.5: rápido e barato, que é o que importa aqui: a resposta vai
    // direto para a síntese de voz, então latência pesa mais que profundidade.
    const resposta = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SISTEMA,
      messages: mensagens,
    });

    if (resposta.stop_reason === "refusal") {
      return res.status(200).json({
        resposta:
          "Prefiro não entrar nesse assunto.\n" +
          "Não é fuga, é que eu só falo do que eu pesquisei de verdade.\n" +
          "Posso falar de viés em inteligência artificial e de reconhecimento facial.\n" +
          "Posso contar como foi a pesquisa Gender Shades, em 2018.\n" +
          "O que desses você quer saber?",
        recusado: true,
      });
    }

    const texto = resposta.content
      .filter((bloco) => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("\n")
      .trim();

    if (!texto) {
      return res.status(502).json({ erro: "O modelo não devolveu texto." });
    }

    return res.status(200).json({ resposta: aCincoLinhas(texto), modelo: resposta.model });
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) {
      console.error("Chave da Anthropic inválida ou ausente:", erro.message);
      return res.status(500).json({ erro: "Credencial da API não configurada no servidor." });
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ erro: "Muitas perguntas ao mesmo tempo. Tente de novo em alguns segundos." });
    }
    if (erro instanceof Anthropic.APIConnectionError) {
      return res.status(504).json({ erro: "Não consegui falar com a API da Anthropic." });
    }
    if (erro instanceof Anthropic.APIError) {
      console.error("Erro da API:", erro.status, erro.message);
      return res.status(502).json({ erro: "A API da Anthropic devolveu um erro." });
    }
    console.error("Erro inesperado:", erro);
    return res.status(500).json({ erro: "Erro inesperado no servidor." });
  }
}
