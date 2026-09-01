# Flows Maestro

```bash
npm run e2e           # todos, exceto o offline
npm run e2e:offline   # com a API parada
```

Precisa de: simulador aberto, Metro rodando (`npm start`) e a API local em
`localhost:3000`. Sem a API, só o `offline.yaml` faz sentido.

## Dependência de ordem

Só `onboarding` e `full-cycle` usam `clearState: true`. Os outros abrem com
`clearState: false` e assumem uma sessão já criada, então **dependem de um deles
ter passado antes**. Quando o onboarding falha, os cinco restantes falham em
cascata com "O que você quer estudar hoje não está visível" — o que parece cinco
defeitos e é um só.

Ao investigar uma falha, rode o flow isolado antes de acreditar no número:

```bash
maestro test .maestro/onboarding.yaml
```

## Duas armadilhas do iOS que já custaram caro aqui

**O teclado cobre o que está abaixo do campo.** `hideKeyboard` nem sempre basta:
se o elemento seguinte fica na parte de baixo da tela, use `scrollUntilVisible`
antes de tocar ou asserir. Foi o que quebrou o toque no checkbox de consentimento.

**`testID` em `<Text>` aninhado dentro de `<Text>` não existe.** O iOS renderiza
o parágrafo como um único nó e os filhos somem da árvore de acessibilidade —
`accessible={false}` no pai não muda isso. Se um elemento precisa ser tocado ou
verificado, ele tem que ser um `Pressable` de verdade, não um `<Text>` com
`onPress` dentro de outro texto. Isso vale para o app, não só para o teste: o
que não está na árvore também não existe para o VoiceOver.

Para ver o que o Maestro enxerga de fato:

```bash
maestro hierarchy | grep -oE '"resource-id" : "[^"]+"' | sort -u
```
