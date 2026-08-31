# Gabarita

App de estudo por questões do ENEM: responde, corrige na hora e compara o
desempenho com o dos outros. React Native com Metro, deploy pelo Zephyr Cloud.

## Rodar

```bash
npm install
cd ios && pod install && cd ..
npm start                      # Metro
npm run ios                    # ou: npm run android
```

O app consome uma API de questões em `http://localhost:3000` (`src/shared/api/client.ts`).
No emulador Android o host vira `10.0.2.2` automaticamente.

## Estrutura

```
src/
  modules/questoes/   sessão, fim de sessão, escolha de área, renderizador
  shared/ui-kit/      tokens de cor, tipografia, espaçamento
  shared/api/         cliente HTTP
```

As fronteiras entre `modules/` são rígidas de propósito: nada em `modules/`
importa de outro `modules/`, só de `shared/`. É o que permite cada pasta virar
um remote de Module Federation depois sem refatoração.

## Onde o Zephyr entra

**Ele não substitui o Metro — embrulha o resultado dele.**

O pipeline de um app React Native, sem Zephyr:

```
código → Metro (resolve, transforma, empacota) → main.jsbundle → app nativo → loja
```

O Metro é o bundler: resolve os imports, roda as transformações de Babel e
cospe um arquivo JS único mais os assets. Ele não sabe o que acontece depois.

Com Zephyr, entra um passo entre o bundle e a distribuição:

```
código → Metro → bundle → Zephyr Cloud (versão imutável + CDN) → app busca a versão
```

Na prática são duas peças. `withZephyr` embrulha o config do Metro e
`withModuleFederation` monta o artefato publicável:

```js
// metro.config.js
const zephyrConfig = await withZephyr({ name: 'Gabarita', target: 'ios' })(baseConfig);
module.exports = withModuleFederation(zephyrConfig, mfConfig, { flags: { /* ... */ } });
```

E a publicação sai de um comando próprio, registrado em `react-native.config.js`:

```bash
npm run deploy:ios      # react-native bundle-mf-remote --platform ios --dev false
```

O Metro continua fazendo todo o trabalho de bundling. O Zephyr se pendura no
fim: pega o bundle e os assets, versiona de forma imutável, sobe pro edge e
devolve uma URL daquela versão. Cada build vira uma versão que existe pra sempre
e pode ser promovida entre ambientes ou revertida.

> `react-native bundle` comum **não publica**, mesmo com `withZephyr` no config:
> ele autentica, gera o bundle e termina com código 0 sem subir nada. O detalhe
> está em [`docs/zephyr.md`](docs/zephyr.md).

**Por que isso importa num app nativo.** O ciclo normal de correção em mobile é
build → submissão → revisão da loja → adoção do usuário: dias. Como o bundle JS
é um arquivo baixável, o Zephyr permite trocar a versão do JS sem passar pela
loja (OTA), respeitando a regra da Apple e do Google de que só o JS muda, nunca
o binário nativo.

**Onde eu usaria num projeto real.** Três coisas, nesta ordem de valor:

1. *Preview por branch.* Cada PR gera uma versão com URL própria. QA e produto
   abrem o app apontando pra aquela versão, sem TestFlight e sem esperar build
   nativo.
2. *Rollback de JS em minutos.* Bug em produção que está no JS deixa de ser um
   hotfix submetido à loja e vira apontar o ambiente pra versão anterior.
3. *Module Federation, quando houver times.* Aí cada domínio (questões, conta,
   estatísticas) vira um remote com deploy próprio, e o Zephyr resolve qual
   versão de cada remote o host carrega por ambiente. Enquanto for uma pessoa
   só, isso é complexidade sem retorno — as fronteiras de pasta acima já deixam
   o caminho aberto.

O que eu **não** usaria: substituir o versionamento nativo. O binário continua
seguindo o ciclo da loja, e mudança que toca código nativo não é OTA.

Notas sobre a integração e as arestas encontradas: [`docs/zephyr.md`](docs/zephyr.md).

## Deploy

```bash
npm run deploy:ios       # ou deploy:android
```

Última versão publicada:
`https://aroldogooulart-10-gabarita-mobile-react-native-st-ed44fc6da-ze.zephyrcloud.app/`

Exige repositório git com `remote origin` — o Zephyr deriva org e projeto dali,
e o app é publicado como `<app>.<repo>.<org>`.

## Testes

```bash
npm test
```

Cobrem os cinco estados da sessão (lendo / marcada / acertou / errou / sem
comentário), o fim de sessão e o caso offline.

E2E no simulador, com a API rodando:

```bash
npm run e2e
```

- `sessao.yaml` — escolher área, marcar, trocar de ideia, responder, virar de
  questão e sair. Garante que marcar não responde.
- `sessao-completa.yaml` — as 10 questões até a tela de resultado.
- `reportar.yaml` — reportar problema numa questão.

Com a API derrubada, `npm run e2e:offline` confere que o app avisa e oferece
"Tentar de novo" em vez de virar beco sem saída.
