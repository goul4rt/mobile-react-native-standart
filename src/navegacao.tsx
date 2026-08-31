import React, { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Abertura } from './modules/conta/Abertura';
import { Cadastro } from './modules/conta/Cadastro';
import { Login } from './modules/conta/Login';
import { PerfilScreen } from './modules/conta/PerfilScreen';
import { EstatisticasScreen } from './modules/estatisticas/EstatisticasScreen';
import { HomeScreen } from './modules/questoes/HomeScreen';
import { SessaoScreen } from './modules/questoes/SessaoScreen';
import { useAuth } from './shared/auth/AuthContext';
import { t } from './shared/i18n';
import { useTema } from './shared/ui-kit/PreferenciasContext';
import { palettes, type } from './shared/ui-kit/tokens';

const Tabs = createBottomTabNavigator();
const Pilha = createNativeStackNavigator();

function tema(escuro: boolean): Theme {
  const p = escuro ? palettes.dark : palettes.light;
  return {
    dark: escuro,
    colors: {
      primary: p.primary,
      background: p.bg,
      card: p.bg,
      text: p.text,
      border: p.border,
      notification: p.danger,
    },
    fonts: {
      regular: { fontFamily: 'PublicSans-Regular', fontWeight: '400' },
      medium: { fontFamily: 'PublicSans-SemiBold', fontWeight: '600' },
      bold: { fontFamily: 'Lexend-Bold', fontWeight: '700' },
      heavy: { fontFamily: 'Lexend-Bold', fontWeight: '700' },
    },
  };
}

/** Ícone por texto: o app ainda não tem jogo de ícones próprio. */
function Icone({ simbolo, cor }: { simbolo: string; cor: string }) {
  return <Text style={{ fontSize: 18, color: cor }}>{simbolo}</Text>;
}

function Nucleo() {
  const { p } = useTema();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.textMuted,
        tabBarStyle: { backgroundColor: p.bg, borderTopColor: p.border },
        tabBarLabelStyle: { fontFamily: type.micro.fontFamily, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="Home"
        options={{
          tabBarLabel: t('home.tab'),
          tabBarIcon: ({ color }) => <Icone simbolo="◧" cor={color} />,
          tabBarButtonTestID: 'tab-home',
        }}>
        {({ navigation }) => (
          <HomeScreen onEstudar={(area) => navigation.navigate('Sessao', { area })} />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="Estatisticas"
        component={EstatisticasScreen}
        options={{
          tabBarLabel: t('estatisticas.titulo'),
          tabBarIcon: ({ color }) => <Icone simbolo="◈" cor={color} />,
          tabBarButtonTestID: 'tab-estatisticas',
        }}
      />
      <Tabs.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: t('perfil.titulo'),
          tabBarIcon: ({ color }) => <Icone simbolo="◍" cor={color} />,
          tabBarButtonTestID: 'tab-perfil',
        }}
      />
    </Tabs.Navigator>
  );
}

/** Sem conta: abertura, cadastro e login vivem numa pilha só. */
function Entrada() {
  const [tela, setTela] = useState<'abertura' | 'cadastro' | 'login'>('abertura');

  if (tela === 'cadastro') {
    return <Cadastro onVoltar={() => setTela('abertura')} onEntrar={() => setTela('login')} />;
  }
  if (tela === 'login') {
    return <Login onVoltar={() => setTela('abertura')} onCriarConta={() => setTela('cadastro')} />;
  }
  return <Abertura onCriarConta={() => setTela('cadastro')} onEntrar={() => setTela('login')} />;
}

export function Navegacao() {
  const { p, escuro, idiomaApp } = useTema();
  const { carregando, usuario } = useAuth();

  if (carregando) {
    return (
      <View style={[styles.centro, { backgroundColor: p.bg }]}>
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={tema(escuro)}>
      <StatusBar barStyle={escuro ? 'light-content' : 'dark-content'} />
      {usuario ? (
        <Pilha.Navigator screenOptions={{ headerShown: false }}>
          {/* key pelo idioma: os rótulos das abas são calculados no registro
              da rota, então trocar de idioma exige remontar o navegador. */}
          <Pilha.Screen key={idiomaApp} name="Núcleo" component={Nucleo} />
          <Pilha.Screen name="Sessao" options={{ presentation: 'fullScreenModal' }}>
            {({ navigation, route }) => (
              <SessaoScreen
                area={(route.params as { area: string }).area}
                onSair={() => navigation.goBack()}
              />
            )}
          </Pilha.Screen>
        </Pilha.Navigator>
      ) : (
        <Entrada />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
