import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navegacao } from './src/navegacao';
import { AuthProvider } from './src/shared/auth/AuthContext';
import { PreferenciasProvider } from './src/shared/ui-kit/PreferenciasContext';

function App() {
  return (
    <SafeAreaProvider>
      {/* Preferências por fora: a barra de status e o tema da navegação
          precisam do tema escolhido, não do que o sistema diz. */}
      <PreferenciasProvider>
        <AuthProvider>
          <Navegacao />
        </AuthProvider>
      </PreferenciasProvider>
    </SafeAreaProvider>
  );
}

export default App;
