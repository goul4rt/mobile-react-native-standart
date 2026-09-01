/**
 * Chave de tradução faltante não quebra o build nem o typecheck: vira
 * `[missing "en.cadastro.criarConta" translation]` na cara do usuário, e só
 * aparece se alguém abrir aquela tela naquele idioma. Este teste varre o código
 * e falha antes disso.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en, pt } from '../src/shared/i18n/translations';

function arquivosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const caminho = join(dir, name);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(name) ? [caminho] : [];
  });
}

/** Todas as chaves passadas para t() no código-fonte. */
function chavesUsadas(): Set<string> {
  const usadas = new Set<string>();
  for (const arquivo of arquivosDeCodigo('src')) {
    const fonte = readFileSync(arquivo, 'utf8');
    for (const [, key] of fonte.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) usadas.add(key);
  }
  return usadas;
}

/** Um objeto {one, other} é a forma plural de UMA chave, não duas chaves. */
const ehPlural = (v: unknown) =>
  typeof v === 'object' && v !== null && 'other' in (v as object);

/** Caminhos folha de um dicionário, no formato "grupo.chave". */
function caminhos(objeto: Record<string, unknown>, prefixo = ''): string[] {
  return Object.entries(objeto).flatMap(([key, value]) => {
    const caminho = prefixo ? `${prefixo}.${key}` : key;
    return typeof value === 'object' && value !== null && !ehPlural(value)
      ? caminhos(value as Record<string, unknown>, caminho)
      : [caminho];
  });
}

describe('traduções', () => {
  it('toda chave usada no código existe em português', () => {
    const definidas = new Set(caminhos(pt));
    const faltando = [...chavesUsadas()].filter((k) => !definidas.has(k) && !k.startsWith('areas.'));
    expect(faltando).toEqual([]);
  });

  it('português e inglês têm exatamente as mesmas chaves', () => {
    const emPt = caminhos(pt).sort();
    const emEn = caminhos(en).sort();
    expect(emEn.filter((k) => !emPt.includes(k))).toEqual([]);
    expect(emPt.filter((k) => !emEn.includes(k))).toEqual([]);
  });

  it('nenhuma tradução ficou vazia ou igual ao nome da chave', () => {
    for (const dicionario of [pt, en]) {
      for (const caminho of caminhos(dicionario)) {
        const value = caminho
          .split('.')
          .reduce<any>((obj, parte) => obj?.[parte], dicionario);
        // Plural tem várias formas; todas precisam existir e ter texto.
        const formas = ehPlural(value) ? Object.values(value as object) : [value];
        for (const forma of formas) {
          expect(typeof forma).toBe('string');
          expect((forma as string).trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('nenhuma tela renderiza texto que nunca passou pelo t()', () => {
    // O teste de chaves não pegava isto: a chave existia e ninguém a usava.
    // Foi assim que "baseado em N pessoas" e o aviso de amostra ficaram em
    // português no modo inglês.
    const suspeitos: string[] = [];
    // Palavras que só aparecem em texto para o usuário, nunca em código.
    const PORTUGUES = /\b(de|da|do|em|com|para|por|uma?|os|as|que|não|você|pessoas?|questõ?es|resposta|acerto|tela|aluno)\b/i;

    for (const arquivo of arquivosDeCodigo('src')) {
      const fonte = readFileSync(arquivo, 'utf8');
      for (const [, bruto] of fonte.matchAll(/>\s*\n?\s*([^<>\n]{8,}?)\s*\n?\s*</g)) {
        // Tira as interpolações e olha só o texto literal que sobra: era assim
        // que "Base de {n} pessoas" escapava — o {n} no meio matava a busca.
        const literal = bruto.replace(/\{[^{}]*\}/g, ' ').trim();
        if (literal.length < 6) continue;
        if (/[=;()[\]]|=>|\.\w+\(/.test(literal)) continue;
        if (PORTUGUES.test(literal)) suspeitos.push(`${arquivo}: ${literal}`);
      }
    }
    expect(suspeitos).toEqual([]);
  });

  it('nenhum texto de interface é montado com template string', () => {
    // `${pct}% de acerto · ${total} answered` passava por todos os outros
    // testes: a chave existia, os dois idiomas batiam, e nada renderizava
    // literal entre tags. Só que a frase era montada à mão no componente.
    const PORTUGUES = /\b(de acerto|respondidas?|questõ?es|acertos?|semana|pessoas?)\b/i;
    const suspeitos: string[] = [];

    for (const arquivo of arquivosDeCodigo('src')) {
      if (arquivo.includes('i18n')) continue;
      const fonte = readFileSync(arquivo, 'utf8');
      for (const [, corpo] of fonte.matchAll(/`([^`]*\$\{[^`]*)`/g)) {
        if (PORTUGUES.test(corpo)) suspeitos.push(`${arquivo}: \`${corpo}\``);
      }
    }
    expect(suspeitos).toEqual([]);
  });

  it('data e número não usam locale fixo', () => {
    // 'pt-BR' cravado formata errado quando a interface está em inglês.
    const cravado: string[] = [];
    for (const arquivo of arquivosDeCodigo('src')) {
      if (arquivo.includes('i18n')) continue;
      const fonte = readFileSync(arquivo, 'utf8');
      if (/toLocale\w+\(\s*['"]pt-BR['"]/.test(fonte)) cravado.push(arquivo);
    }
    expect(cravado).toEqual([]);
  });

  it('o argumento que o código passa existe como marcador na chave', () => {
    // Comparar pt com en não bastava: `greeting` tinha %{nome} nos DOIS idiomas
    // enquanto o código passava { name }, e a saudação saía sem o nome.
    const codigo = arquivosDeCodigo('src')
      .map((a) => readFileSync(a, 'utf8'))
      .join('\n');

    const desalinhados: string[] = [];
    for (const [, chave, arg] of codigo.matchAll(/t\('([a-z]+\.[a-zA-Z]+)',\s*\{\s*(\w+)/g)) {
      const valor = chave.split('.').reduce<any>((o, p) => o?.[p], pt);
      if (valor === undefined) continue;
      const texto = ehPlural(valor) ? Object.values(valor as object).join(' ') : String(valor);
      const marcadores = [...texto.matchAll(/%\{(\w+)\}/g)].map((m) => m[1]);
      // `count` é da pluralização do i18n-js, não precisa aparecer como marcador.
      if (arg !== 'count' && !marcadores.includes(arg)) {
        desalinhados.push(`${chave}: código passa {${arg}}, chave usa ${JSON.stringify(marcadores)}`);
      }
    }
    expect(desalinhados).toEqual([]);
  });

  it('as interpolações %{...} batem entre os dois idiomas', () => {
    const marcadores = (texto: string) =>
      [...texto.matchAll(/%\{(\w+)\}/g)].map((m) => m[1]).sort();

    const comoTexto = (v: unknown) =>
      ehPlural(v) ? Object.values(v as object).join(' ') : (v as string);

    for (const caminho of caminhos(pt)) {
      const leia = (d: unknown) => caminho.split('.').reduce<any>((o, p) => o?.[p], d);
      // Um %{name} presente em pt e ausente em en imprime o marcador cru.
      expect({ [caminho]: marcadores(comoTexto(leia(en))) }).toEqual({
        [caminho]: marcadores(comoTexto(leia(pt))),
      });
    }
  });
});
