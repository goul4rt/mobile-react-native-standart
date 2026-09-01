import { parsePreferences } from '../src/shared/preferences/migrate';

describe('parsePreferences', () => {
  it('traduz o formato gravado pela v1.0', () => {
    // Exatamente o que o app publicado escreveu no AsyncStorage.
    const v1 = '{"tema":"claro","escala":"grande","idioma":"espanhol","idiomaApp":"pt"}';

    expect(parsePreferences(v1)).toEqual({
      theme: 'light',
      textScale: 'large',
      examLanguage: 'es',
      appLanguage: 'pt',
    });
  });

  it('cobre todos os valores antigos, não só os do caminho feliz', () => {
    const tema = (v: string) => parsePreferences(`{"tema":"${v}"}`).theme;
    expect([tema('claro'), tema('escuro'), tema('sistema')]).toEqual(['light', 'dark', 'system']);

    const escala = (v: string) => parsePreferences(`{"escala":"${v}"}`).textScale;
    expect([escala('normal'), escala('grande'), escala('maior')]).toEqual([
      'normal',
      'large',
      'xlarge',
    ]);

    const idioma = (v: string) => parsePreferences(`{"idioma":"${v}"}`).examLanguage;
    expect([idioma('ingles'), idioma('espanhol')]).toEqual(['en', 'es']);
  });

  it('lê o formato novo sem alterar', () => {
    const v2 = '{"theme":"dark","textScale":"xlarge","examLanguage":"en","appLanguage":"en"}';
    expect(parsePreferences(v2)).toEqual({
      theme: 'dark',
      textScale: 'xlarge',
      examLanguage: 'en',
      appLanguage: 'en',
    });
  });

  it('descarta valor irreconhecível sem derrubar os outros', () => {
    expect(parsePreferences('{"tema":"roxo","escala":"grande"}')).toEqual({ textScale: 'large' });
  });

  it('sobrevive a storage vazio, nulo ou corrompido', () => {
    expect(parsePreferences(null)).toEqual({});
    expect(parsePreferences('')).toEqual({});
    expect(parsePreferences('não é json')).toEqual({});
    expect(parsePreferences('"uma string"')).toEqual({});
    expect(parsePreferences('null')).toEqual({});
  });

  it('o formato novo ganha do antigo se os dois estiverem no mesmo objeto', () => {
    const misto = '{"tema":"claro","theme":"dark"}';
    expect(parsePreferences(misto).theme).toBe('dark');
  });
});
