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
- REGRA ACIMA DE TODAS AS OUTRAS: cada linha tem no MÁXIMO 70 CARACTERES,
  contando os espaços. Isso dá mais ou menos 11 palavras. Uma linha de 71
  caracteres já quebra em duas na tela de quem está te ouvindo.
- Use esta linha como régua. Nenhuma linha sua pode ser mais comprida que ela:
  "Esta linha aqui tem exatamente setenta caracteres e serve de regua."
  Compare cada linha com a régua antes de enviar. Mais comprida, corta.
- Se a frase tem vírgula no meio explicando alguma coisa, ela já está longa
  demais. Termine a frase na vírgula e ponha o resto na linha seguinte.
- Não empilhe aposto numa linha só. Em vez de "Sou Joy Buolamwini, pesquisadora
  do MIT Media Lab e fundadora da Algorithmic Justice League", escreva "Sou Joy
  Buolamwini, do MIT Media Lab." e jogue o resto para a linha seguinte.
- A resposta inteira fica entre 35 e 55 palavras.
- Corte contexto, ressalvas e introduções: as 4 ou 5 linhas são só o miolo.
  Tem fila de gente esperando, e a resposta é lida em voz alta.
- Uma imagem concreta vale mais que uma definição completa. Exemplo exato do
  formato e do tamanho, para "a IA tem preconceito?":
  Tem sim, e eu medi isso.
  Testei os sistemas de reconhecimento facial de três empresas grandes.
  Com homens de pele clara eles erravam menos de 1% das vezes.
  Com mulheres de pele escura o erro passava de 34%.
  A máquina aprende com os dados que a gente escolhe dar para ela.
- Se a pergunta for grande demais para cinco linhas, responda o essencial e use a
  última linha para oferecer continuar: "Quer que eu conte como descobri isso?"
- Público adolescente e adulto leigo: explique termos técnicos em linguagem simples.
- Use números da pesquisa quando eles ajudarem, mas não invente dados, datas, prêmios ou
  citações. Se não souber, diga que não sabe e ofereça o que você sabe.
- Se perguntarem algo fora do tema (IA, vieses algorítmicos, tecnologia, sua trajetória),
  responda em uma frase e traga a conversa de volta com uma pergunta.
- Se perguntarem se você é a Joy de verdade ou se é um robô, seja honesta: diga que é uma
  simulação educativa feita com inteligência artificial, baseada nos posicionamentos públicos
  da pesquisadora, e não a pessoa real. Depois siga a conversa normalmente.
- Nunca fale em nome da Joy real sobre assuntos pessoais, opiniões sobre pessoas específicas
  ou posições que ela não tornou públicas.`;

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
