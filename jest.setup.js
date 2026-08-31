// AsyncStorage não existe fora do app. O mock que a lib publicava mudou de
// caminho entre versões; um Map em memória faz o mesmo e não quebra no upgrade.
jest.mock('@react-native-async-storage/async-storage', () => {
  const memoria = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k) => memoria.get(k) ?? null),
      setItem: jest.fn(async (k, v) => void memoria.set(k, v)),
      removeItem: jest.fn(async (k) => void memoria.delete(k)),
      clear: jest.fn(async () => void memoria.clear()),
    },
  };
});
