# Vocabulário do projeto

Onde cada conceito vive e por que tem o nome que tem. Este arquivo existe no
lugar de uma pasta `types/`: tipo mora junto da regra que o usa, e o que faltava
era um índice, não uma gaveta.

O código é escrito em inglês. As exceções abaixo são deliberadas.

## Domínio

| Conceito | Nome no código | Onde vive |
|---|---|---|
| Prova do ENEM | — | conteúdo, não entidade |
| Área de conhecimento (CH, CN, LC, MT) | `area` | `shared/api/client.ts` |
| Competência (H1–H30) | `skill` | idem |
| Questão | `Question` | `@gabarita/questions-core` |
| Resposta escolhida | `Answer` | idem |
| Correção | `grade()` | idem |
| Tentativa registrada | `attempt` | API, tabela `attempts` |
| Sessão de estudo | `SessionScreen` | `modules/questions/` |

`area` e `skill` ficam em inglês, mas `CH`/`CN`/`LC`/`MT` e `H1`–`H30` são os
códigos oficiais do INEP: não se traduzem, e mudá-los quebraria o cruzamento com
os microdados.

## Por que `questions-core` é um pacote separado

`Question`, `Answer` e `grade()` moram fora do app porque **app e API precisam
concordar sobre eles**. A mesma função corrige no aparelho (feedback instantâneo,
funciona offline) e no servidor (`POST /v1/attempts`), para não existirem duas
verdades sobre "acertou". Esse é o caso legítimo de tipo compartilhado: o tipo
viaja com a regra que o usa, não sozinho numa pasta.

## Estrutura

```
src/
  modules/questions/   sessão, resultado, escolha de área
  modules/stats/       gráficos e comparação com a população
  modules/account/     onboarding, perfil, exportação e exclusão
  shared/ui-kit/       tokens e primitivas (Screen, Card, Button, Centered)
  shared/rich-text/    markdown das questões: parser puro + renderização
  shared/preferences/  tema, escala, idiomas + migração da v1.0
  shared/api/          cliente HTTP
  shared/auth/         sessão persistida e renovada
  shared/i18n/         strings de interface, pt e en
```

Regra de import: nada em `modules/` importa de outro `modules/`, só de
`shared/`. É o que permite os quatro remotes de Module Federation
(`./session`, `./home`, `./stats`, `./profile`) serem separáveis de verdade.

## Valores que viraram contrato

Coisas que **não podem** ser renomeadas sem migração, porque já existem fora do
código:

| Valor | Onde | Por quê |
|---|---|---|
| `@gabarita/sessao` | AsyncStorage | guarda o token de quem já está logado; renomear desloga a base instalada |
| `@gabarita/preferencias` | AsyncStorage | formato da v1.0; lido pelo adapter em `preferences/migrate.ts` |
| `enunciado_incompleto`, `imagem_nao_carrega`, `gabarito_errado`, `alternativa_faltando`, `outro` | corpo de `POST /v1/reports` | validados pela API e já gravados no banco |
| `com.gabarita` | `applicationId` Android | trocar transforma atualização em app novo |

O prefixo `gabarita` é o nome antigo do projeto. Ele sobrevive nesses quatro
lugares porque o custo de mudar é real e o ganho é cosmético.

## Preferências e a migração

`preferences/migrate.ts` traduz o formato gravado pela v1.0 (`tema: 'claro'`)
para o atual (`theme: 'light'`). Sem ele, quem instalou o APK publicado perderia
tema, tamanho de texto e idioma sem nenhum erro visível: o app leria `'claro'`,
não reconheceria, e cairia no padrão. O adapter é puro e testado em
`__tests__/preferences-migrate.test.ts`.

Qualquer valor persistido que mude de nome no futuro passa por lá.

## Dois idiomas, dois sentidos

- `appLanguage` (`pt` | `en`) — idioma da **interface**.
- `examLanguage` (`en` | `es`) — língua estrangeira das **questões de Linguagens**.

São coisas diferentes e já foram confundidas. A prova traz inglês e espanhol; o
aluno escolhe qual das cinco questões vê, independentemente do idioma do app.
