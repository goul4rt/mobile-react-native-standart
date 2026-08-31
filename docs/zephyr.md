# Integração com o Zephyr — notas

Versões: React Native 0.87.1, React 19.2.3, `zephyr-metro-plugin@1.2.4`,
`@module-federation/metro`, Node 22, macOS 26 / Xcode 26.

Publicado como `questiona.questiona.questoes` (app.projeto.org). Último deploy:
`https://aroldogooulart-19-questiona-questiona-questoes-314546747-ze.zephyrcloud.app/`
(o `mf-manifest.json` e os quatro bundles respondem 200; a raiz dá 404 porque o
que se publica é o artefato, não um site).

## Módulos federados

Cada módulo do design (§7) vira um expose próprio:

| Expose | Módulo | Por que separado |
|---|---|---|
| `./sessao` | questões | o núcleo: sessão e correção |
| `./home` | questões | entrada do app |
| `./estatisticas` | estatísticas | métrica nova ou gráfico diferente não toca a sessão |
| `./perfil` | conta | isola o risco de LGPD e das regras de loja |

O ganho concreto não é técnico, é de blast radius: mudar um gráfico da aba de
estatísticas publica um bundle que a sessão de questões não carrega. Hoje, com
uma pessoa só, isso é sobretudo disciplina de fronteira — o retorno aparece
quando houver times com donos diferentes, e é por isso que `modules/` nunca
importa de `modules/`.

## O que foi preciso

```bash
npm install --save-dev zephyr-metro-plugin @module-federation/metro \
  @module-federation/metro-plugin-rnc-cli
npm install @module-federation/runtime
```

`metro.config.js` — `withZephyr` embrulha o config e `withModuleFederation`
completa o pipeline:

```js
const zephyrConfig = await withZephyr({ name: 'Gabarita', target: 'ios' })(baseConfig);
return withModuleFederation(zephyrConfig, mfConfig, { flags: { /* ... */ } });
```

`react-native.config.js` — registra o comando que **de fato publica**:

```js
const wrappedFuncPromise = zephyrCommandWrapper(
  commands.bundleMFRemoteCommand.func,
  commands.loadMetroConfig,
  () => updateManifest(global.__METRO_FEDERATION_MANIFEST_PATH, global.__METRO_FEDERATION_CONFIG),
);
```

```bash
react-native bundle-mf-remote --platform ios --dev false
```

## Arestas encontradas

### 1. O caminho "simples" do README do npm não publica — e não avisa

Esta é a mais séria, e me custou horas.

O README do pacote no npm mostra um setup sem Module Federation: só `withZephyr`
no `metro.config.js` e um script com `react-native bundle`. O `TESTING.md` que
acompanha o pacote reforça, mandando conferir "upload logs" e "deployment URL"
depois de um `react-native bundle` comum.

Esse caminho **não publica nada**. E falha do pior jeito possível: com sucesso
aparente. O build autentica, cumprimenta pelo nome, imprime o identificador da
aplicação com número de versão incrementando a cada tentativa, gera o bundle e
termina com código 0.

```
 ZEPHYR   Hi aroldogooulart!
 ZEPHYR   gabarita.mobile-react-native-standart.goul4rt#2
LOG:Writing bundle output to: ios/main.jsbundle
LOG:Done writing bundle output
```

Nenhum upload, nenhuma URL, nenhum aviso. O contador de versão subindo dá a
impressão de que algo foi registrado do lado do servidor.

A causa está no config: `withZephyr` instala `customSerializer: null`.

```js
const z = await withZephyr({ name: 'Gabarita', target: 'ios' })(baseConfig);
z.serializer.customSerializer === null; // true
```

Quem publica é o comando `bundle-mf-remote` do `@module-federation/metro-plugin-rnc-cli`,
embrulhado pelo `zephyrCommandWrapper`. Sem ele não há upload, porque não há o
que subir: o `mf-manifest.json` e os bundles expostos são gerados por aquele
pipeline.

Duas sugestões, em ordem de valor:

1. Fazer `withZephyr` avisar quando termina um build sem serializer de
   federação: *"nenhum artefato para publicar — falta withModuleFederation e o
   comando bundle-mf-remote"*. Um aviso resolveria o problema inteiro.
2. Corrigir o README e o TESTING.md do pacote, que hoje descrevem um fluxo que
   não entrega o que prometem.

### 2. A organização vem do remote git, e o `zephyr.config.js` que corrige isso não está documentado

Sem configuração, o Zephyr monta o identificador como `<app>.<repo>.<org>` lendo
o remote: um repositório em `github.com/goul4rt/mobile-react-native-standart`
publica em `gabarita.mobile-react-native-standart.goul4rt`. Quem criou uma
organização própria no dashboard não encontra os deploys ali, e o dashboard não
dá pista nenhuma: mostra "No projects found" enquanto os builds sobem para outra
org, com sucesso.

A saída existe e não aparece na documentação. Achei lendo os tipos do pacote
(`zephyr-agent/dist/lib/build-context/zephyr-config.d.mts`):

```js
// zephyr.config.js na raiz do projeto
module.exports = {
  org: 'questoes',
  project: 'questiona',
  appName: 'questiona',
};
```

Os três campos sobrescrevem o que vem do git e do `package.json`. A busca por
"zephyr.config.js" na documentação não retorna essa página, e nenhuma mensagem
do build menciona o arquivo. Sugestão: imprimir no primeiro build de um projeto
qual org e projeto foram inferidos, junto do caminho para sobrescrever.

### 3. Repositório git com remote origin é obrigatório, e isso não está na página do Metro

Sem remote configurado:

```
Git repository not found. Zephyr REQUIRES a git repository with remote origin.
Configuration accepted for THIS BUILD ONLY.
```

O build prossegue mas se declara inválido para produção. `git init` local não
basta. Faz sentido — o Zephyr deriva org e projeto dali, e o nome publicado é
`<app>.<repo>.<org>` — mas é um pré-requisito forte que só aparece quando falha.

### 4. Sem TTY, a URL de autenticação nunca é impressa

Em `zephyr-agent/dist/lib/auth/login.mjs`:

```js
authenticationPromptForTerminal(authUrl, interactive = isTTY) {
  if (!interactive) return formatLogMsg('A private authentication link was generated. Waiting for browser authentication.')
  return ['Authentication URL (shown only in this terminal):', authUrl, 'Hit Enter to open it in your browser.'].join('\n')
}
```

Com TTY a URL aparece e o Enter abre o browser. Sem TTY — CI, agente, qualquer
`npm run build > log.txt` — sai só a frase genérica. A URL não vai para stdout,
stderr nem arquivo, e o processo espera um browser que ninguém vai abrir.

A saída documentada para CI é `ZE_SECRET_TOKEN`, mas obtê-lo exige autenticar
antes. Quem começa por um ambiente sem TTY fica sem caminho. Imprimir a URL
também em modo não interativo resolveria.

### 5. Ruído no log

Todo build repete o aviso de `zephyr:dependencies` ausente, mesmo num app sem
remotes, onde a ausência é a configuração correta. E o comando emite
`Validation Warning: Unknown option "server.tls"` duas vezes por execução —
vindo do próprio plugin, não da configuração do projeto.

## O que funcionou bem

- Uma vez no caminho certo, o deploy é rápido e informativo: snapshot em 348 ms,
  6 assets (5,6 MB) em 872 ms, edge em 1081 ms, com a URL no final.
- A autenticação persiste em `~/.zephyr`; só o primeiro build pede login.
- O Metro dev não é afetado: serve o bundle normalmente (4 MB, HTTP 200) mesmo
  sem autenticação. Só a publicação depende do login.
- As mensagens de erro que existem dizem o que fazer, com os comandos prontos
  (o aviso de git lista `git init`, `git remote add`, `git commit`).
- `zephyr-metro-plugin@1.2.4` instalou sem conflito com RN 0.87, apesar de a
  documentação exemplificar 0.80.
- O versionamento imutável é real: cada build vira uma versão com URL própria,
  visível no dashboard.
