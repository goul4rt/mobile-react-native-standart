/**
 * Recuperação de falha: com a API fora, a tela não pode virar beco sem saída.
 * O E2E cobre o estado de erro; aqui fica o retry, que é lógica de componente.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { EscolhaArea } from '../src/modules/questoes/EscolhaArea';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View, useSafeAreaInsets: () => ({}) };
});

function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'children' in node) {
    return `${textOf((node as { children: unknown }).children)} `;
  }
  return '';
}

test('falhou e voltou: o botão recarrega sem reiniciar o app', async () => {
  const areas = [{ code: 'MT', label: 'Matemática e suas Tecnologias', total: 665, years: [2023] }];
  const fetchMock = jest
    .fn()
    .mockRejectedValueOnce(new Error('Network request failed'))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ areas }) });
  (globalThis as any).fetch = fetchMock;

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<EscolhaArea onEscolher={() => {}} />);
  });

  expect(textOf(tree.toJSON())).toContain('Sem internet.');

  const [botao] = tree.root.findAll(
    (n) => n.props?.testID === 'tentar-de-novo' && typeof n.props?.onPress === 'function',
  );
  expect(botao).toBeDefined();

  await act(async () => botao.props.onPress());

  const texto = textOf(tree.toJSON());
  expect(texto).toContain('Matemática e suas Tecnologias');
  expect(texto).not.toContain('Sem internet.');
  expect(fetchMock).toHaveBeenCalledTimes(2);

  act(() => tree.unmount());
});
