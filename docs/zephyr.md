# Integração com o Zephyr — notas

Versões: React Native 0.87.1, React 19.2.3, `zephyr-metro-plugin@1.2.4`,
Node 22, macOS 26 / Xcode 26.

## O que foi preciso

Uma dependência e um wrapper no `metro.config.js`:

```bash
npm install --save-dev zephyr-metro-plugin
```

```js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withZephyr } = require('zephyr-metro-plugin');

module.exports = (async () => {
  const baseConfig = mergeConfig(getDefaultConfig(__dirname), {});
  const zephyrConfig = await withZephyr({
    name: 'Gabarita',
    target: process.env.PLATFORM === 'android' ? 'android' : 'ios',
  })(baseConfig);
  return mergeConfig(baseConfig, zephyrConfig);
})();
```

Mais os scripts de bundle, onde o upload acontece:

```json
"build:ios": "PLATFORM=ios NODE_ENV=production react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios"
```

Não há comando de "deploy" separado: o envio é efeito colateral do bundle.

## Arestas encontradas

### 1. O caminho simples não está documentado

A página de Metro da documentação só ensina Module Federation: dois apps, host
e mini app, `@module-federation/metro`, `withModuleFederation`, comando
`bundle-mf-remote`, `zephyr:dependencies` no `package.json`.

Mas `withZephyr` funciona sozinho, sem nada disso — é o que este projeto usa.
Descobri no README do pacote no npm, não na documentação. Para quem só quer
publicar um app React Native pelo Zephyr, o caminho de entrada aparenta ser bem
mais complicado do que é.

### 2. Repositório git com remote origin é obrigatório, e isso não está na página do Metro

Sem remote configurado:

```
Git repository not found. Zephyr REQUIRES a git repository with remote origin.
Manual configuration is NOT recommended and WILL cause errors in production.
Configuration accepted for THIS BUILD ONLY.
```

O build prossegue, mas se declara inválido para produção. `git init` local não
basta — precisa de `remote origin`. Faz sentido (o Zephyr deriva org/projeto
dali), mas é um pré-requisito forte que só aparece quando falha.

### 3. Sem TTY, a URL de autenticação nunca é impressa

Esta é a mais séria. Em `zephyr-agent/dist/lib/auth/login.mjs`:

```js
authenticationPromptForTerminal(authUrl, interactive = isTTY) {
  if (!interactive) return formatLogMsg('A private authentication link was generated. Waiting for browser authentication.')
  return ['Authentication URL (shown only in this terminal):', authUrl, 'Hit Enter to open it in your browser.'].join('\n')
}
```

Com TTY: a URL aparece e o Enter abre o browser. Sem TTY — CI, agente,
terminal com saída redirecionada, qualquer `npm run build:ios > log.txt` — sai
só a frase genérica. A URL não vai para stdout, stderr nem arquivo, e o processo
espera um browser que ninguém vai abrir até encerrar sozinho.

A saída documentada para CI é `ZE_SECRET_TOKEN`, mas obtê-lo exige autenticar
antes. Quem começa por um ambiente sem TTY fica sem caminho.

Sugestão: imprimir a URL também em modo não interativo, ou gravá-la num arquivo
de caminho previsível e citá-lo na mensagem.

### 4. Ruído no log a cada bundle

Todo build repete o aviso de `zephyr:dependencies` ausente, mesmo num app sem
remotes — onde a ausência é a configuração correta.

## O que funcionou bem

- A integração com o Metro é de fato mínima: uma dependência, um wrapper. O
  bundler não é substituído nem reconfigurado.
- O plugin não interfere no desenvolvimento: o Metro dev serve o bundle
  normalmente (4 MB, HTTP 200) mesmo sem autenticação, avisando e seguindo. Só
  o upload depende do login.
- As mensagens de erro dizem o que fazer, com os comandos prontos (o aviso de
  git lista `git init`, `git remote add`, `git commit`).
- A versão do plugin (1.2.4) instalou sem conflito com RN 0.87, mesmo a
  documentação exemplificando 0.80.
