import React, { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EscolhaArea } from './src/modules/questoes/EscolhaArea';
import { SessaoScreen } from './src/modules/questoes/SessaoScreen';

function App() {
  const dark = useColorScheme() === 'dark';
  // ponytail: duas telas, um estado. Vira react-navigation quando entrar a
  // terceira (abas do design).
  const [area, setArea] = useState<string | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {area ? (
        <SessaoScreen area={area} onSair={() => setArea(null)} />
      ) : (
        <EscolhaArea onEscolher={setArea} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
