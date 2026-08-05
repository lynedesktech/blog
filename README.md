# blog-psy

Blog sobre Joy Buolamwini e justiça algorítmica. Site estático com uma função
serverless.

- Produção: https://blog-one-psi-89.vercel.app
- Projeto na Vercel: `blog` (`prj_CCmIzPDqvWmNFXxMhGSUaS0QrMLV`), time
  `lynedesktechs-projects` (`team_MK6wak2MyxsNbn4Qo0G8yGHR`)

```
index.html              artigo + widget de conversa com a Joy
quiz/index.html         quiz de 5 perguntas, ranking em localStorage
jogo-fases/             "O Corredor Codificado" — three.js r169 + WebXR
  index.html            telas, HUD 2D e ligação com o motor
  src/main.js           motor: física AABB, 5 fases, máscara, chefe
  src/levels.js         dados das fases + construtor de geometria
  src/strings.js        todo o texto visível (trocar de idioma = trocar aqui)
  src/textures.js       texturas procedurais em canvas
  src/audio.js          áudio sintetizado em WebAudio
  vendor/               three.module.js e VRButton.js (three@0.169.0)
api/joy.js              FALTANDO — ver abaixo
```

## De onde veio este repositório

O projeto só existia dentro do deploy da Vercel; não havia repositório. Os
arquivos aqui foram baixados do site no ar em 2026-08-05 e são idênticos ao que
está em produção naquele momento. Os dois arquivos em `vendor/` vieram do pacote
`three@0.169.0` no npm (`three.module.js` bate com os 1.304.820 bytes servidos).

## O que ainda falta

### 1. `api/joy.js` — não está aqui

Roda no servidor e não é servido publicamente, então não deu para baixar do
site. **Não recriar do zero**: o prompt de sistema dele é conteúdo autoral, e
reescrever troca o texto por outro parecido em vez de restaurar o original.

Pegar em: Vercel → projeto `blog` → deployment mais recente → aba **Source** →
`api/joy.js`. Começa com `import Anthropic from "@anthropic-ai/sdk";`.

Contrato que o front-end espera (`index.html`, função `JoyIA`):

```
POST /api/joy
  → { "messages": [ { "role": "user"|"assistant", "content": "..." }, ... ] }
  ← { "resposta": "..." }        em caso de sucesso
  ← { "erro": "..." }            em caso de falha
```

Se a chamada falhar por qualquer motivo, o front-end cai em respostas de
reserva embutidas no `index.html` — ou seja, **o site parece funcionar mesmo
sem o `api/joy.js`**. É por isso que vale conferir a conversa depois de cada
deploy: se a Joy responder só as frases prontas, a função não subiu.

A variável `ANTHROPIC_API_KEY` é configuração do projeto na Vercel e sobrevive
ao redeploy sozinha.

### 2. `package.json` — reconstruído, confira contra o original

O que está aqui foi montado a partir da dependência que o `api/joy.js` importa.
O `"type": "module"` foi acrescentado porque `api/joy.js` usa `import` em um
arquivo `.js`, e sem isso o runtime Node da Vercel derruba a função com
`Cannot use import statement outside a module`. Se o `package.json` original
aparecer na aba Source, use ele no lugar deste.

### 3. As três correções do jogo

Existem versões corrigidas de `jogo-fases/index.html`, `jogo-fases/src/main.js`
e `jogo-fases/src/levels.js` que **não estão neste repositório** — elas estavam
só na máquina do Gabriel. O que está aqui é o que está no ar hoje, ou seja,
ainda com os quatro problemas:

1. **Fases impossíveis de terminar.** Pedaços do rosto nascem sem chão embaixo,
   dentro do curso das prensas ou dentro dos pilares da arena. Como cada fase
   exige 100% dos pedaços, um pedaço perdido trava a fase. Medido em 200 seeds
   × 5 fases: 40% dos carregamentos eram intransponíveis. A correção valida a
   posição contra a geometria e adiciona 2 pedaços de reserva por fase.
2. **Contador travado no 3.** `STR.next_in` é só o prefixo `"Próxima fase em"`;
   quem monta o número é o `main.js`, e ele não conta.
3. **Máscara não coletável.** O pedestal fica a 2,9 m do eixo do corredor com
   raio de coleta de 1,9 m, então quem anda reto nunca encosta. E pegar não faz
   nada, porque `maskHave` já vem `true`.
4. **Dica de fase saindo da AYA**, com o rosto dela na legenda de baixo
   (`#aya2d` hoje mostra só o nome e o texto).

## Publicar

```bash
vercel --prod
```

Só depois que `api/joy.js` estiver no lugar. Publicar sem ele substitui a
produção por uma versão em que a conversa com a Joy cai nas respostas de
reserva — e todo deployment antigo continua servindo de rollback no painel.

## Pendência conhecida

A arte da máscara branca ainda é um desenho em canvas de 128 px
(`jogo-fases/src/textures.js`, função `maskGlyphTexture`). Trocar por imagem
gerada depende de crédito no Higgsfield. Os outros assets do site já vêm do CDN
do Higgsfield, então o padrão já existe.
