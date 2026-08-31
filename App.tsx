import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navegacao } from './src/navegacao';
import { AuthProvider } from './src/shared/auth/AuthContext';

function App() {
  const dark = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <Navegacao />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
