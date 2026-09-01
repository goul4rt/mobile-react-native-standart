import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navegacao } from './src/navigation';
import { AuthProvider } from './src/shared/auth/AuthContext';
import { PreferencesProvider } from './src/shared/preferences/PreferencesContext';

function App() {
  return (
    <SafeAreaProvider>
      {/* Preferências por fora: a barra de status e o tema da navegação
          precisam do tema escolhido, não do que o sistema diz. */}
      <PreferencesProvider>
        <AuthProvider>
          <Navegacao />
        </AuthProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

export default App;
