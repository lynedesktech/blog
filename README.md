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

## `api/joy.js`

Recuperado da aba Source do deployment `dpl_CshnUbBdNAYnhGyLjUkLiYTpFHgU` e
conferido contra o original colado à mão: mesmo sha256
(`17ff9495228f102120b57393b1bcfac28617fdadece8a3f76e97b4e2f81e38f5`), 5.815
bytes, 122 linhas. O prompt de sistema (`SISTEMA`, linhas 7–40) é conteúdo
autoral e está byte a byte igual ao que estava no ar.

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

## `package.json` — reconstruído, mas validado em produção

O original não foi recuperado. Este foi montado a partir da dependência que o
`api/joy.js` importa, mais `"type": "module"`, que é obrigatório porque
`api/joy.js` usa `import` em um arquivo `.js` — sem ele o runtime Node da Vercel
derruba a função com `Cannot use import statement outside a module`. O deploy
`dpl_7wJg9EZmzy3fyVZdNAm1Aym3zGL1` confirmou que funciona: `GET /api/joy`
responde `405 {"erro":"Use POST."}`, ou seja, a função carrega e roda.

## O que ainda falta: as três correções do jogo

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

O projeto `blog` na Vercel está ligado a este repositório: **todo push na
`main` vira deploy de produção automático**. Não existe mais passo manual.

Consequência prática: nunca dê push na `main` com um arquivo faltando. Foi
assim que a produção ficou sem o `api/joy.js` por uns minutos em 06/08/2026 —
e como o front-end tem respostas de reserva embutidas, o site *parecia*
funcionar. Para mudanças de risco, empurre numa branch primeiro: a Vercel gera
um preview e a produção não é tocada. Todo deployment antigo continua servindo
de rollback no painel.

## Pendência conhecida

A arte da máscara branca ainda é um desenho em canvas de 128 px
(`jogo-fases/src/textures.js`, função `maskGlyphTexture`). Trocar por imagem
gerada depende de crédito no Higgsfield. Os outros assets do site já vêm do CDN
do Higgsfield, então o padrão já existe.
