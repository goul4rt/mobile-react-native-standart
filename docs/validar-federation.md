# Como validar (e demonstrar) o Module Federation

Roteiro em quatro passos. Cada um produz uma saída verificável no terminal — a
ideia é que a demonstração seja medida, não afirmada.

## 1. O que é exposto

```bash
sed -n '/exposes:/,/},/p' metro.config.js
```

Quatro remotes, um por domínio:

| Expose | Arquivo |
|---|---|
| `./session` | `src/modules/questions/SessionScreen.tsx` |
| `./home` | `src/modules/questions/HomeScreen.tsx` |
| `./stats` | `src/modules/stats/StatsScreen.tsx` |
| `./profile` | `src/modules/account/ProfileScreen.tsx` |

O que torna a separação real não é esta lista, é a regra de import: nada em
`modules/` importa de outro `modules/`, só de `shared/`. Para conferir:

```bash
grep -rn "from '\.\./\(questions\|stats\|account\)/" src/modules | grep -v "^src/modules/\([a-z]*\)/[^:]*:.*'\.\./\1/"
```

Sem saída significa que nenhum módulo depende de outro.

## 2. Publicar

```bash
npm run deploy:android      # ou deploy:ios
```

O que a saída prova, na ordem:

- `ZEPHYR Hi <usuário>!` — autenticou
- `questiona.questiona.questoes#N` — app.projeto.org, com versão incremental
- quatro `Writing bundle output to: dist/android/exposed/*.bundle` — um por expose
- `Done writing MF Manifest to: dist/android/mf-manifest.json`
- `(N/12 assets uploaded ...)` — **a linha que importa**, veja o passo 4
- a URL imutável daquela versão

## 3. O manifesto

```bash
python3 -c "
import json; d = json.load(open('dist/android/mf-manifest.json'))
print(d['name'])
[print(' ', e['name'], '->', e['assets']['js']['sync'][0]) for e in d['exposes']]
"
```

Cada expose vira um artefato próprio, com URL própria e versão imutável.

## 4. O isolamento, medido

Rode o deploy **duas vezes seguidas, sem alterar nada**:

```bash
npm run deploy:android && npm run deploy:android
```

| Execução | Assets enviados | Volume |
|---|---|---|
| primeira  | 10/12 | ~25.000 kb |
| segunda   | **1/12** | **0,10 kb** |

O Zephyr deduplica por conteúdo: o que já está na edge não sobe de novo. É aí
que o isolamento aparece de forma verificável.

### O que NÃO funciona como demonstração

Comparar o hash dos bundles locais entre builds. **O build do Metro com Module
Federation não é determinístico**: dois builds do mesmo código produzem hashes
diferentes nos quatro bundles, e o `session.bundle` chegou a variar 415 KB entre
execuções idênticas. Medido assim:

```bash
shasum -a 256 dist/android/exposed/*.bundle > /tmp/h1.txt
npm run deploy:android >/dev/null 2>&1
shasum -a 256 dist/android/exposed/*.bundle > /tmp/h2.txt
diff /tmp/h1.txt /tmp/h2.txt    # difere, mesmo sem tocar no código
```

O isolamento existe, mas quem o entrega é o Zephyr no upload, não o bundler na
saída.

## O limite honesto

Este app **expõe** remotes, não os **consome**. O ganho central de Module
Federation — trocar a versão de um remote sem rebuildar o host — não é
demonstrável aqui, porque não existe um host carregando `./stats` de uma versão
específica. O que existe é a separação pronta para isso: quatro artefatos
publicáveis de forma independente e a disciplina de imports que os mantém
separáveis.

Dizer esse limite vale mais do que fingir que rodar o app demonstra federação:
o app roda igual com ou sem ela.
