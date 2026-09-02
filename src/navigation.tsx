import React, { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Welcome } from './modules/account/Welcome';
import { SignUp } from './modules/account/SignUp';
import { Login } from './modules/account/Login';
import { ProfileScreen } from './modules/account/ProfileScreen';
import { StatsScreen } from './modules/stats/StatsScreen';
import { HomeScreen } from './modules/questions/HomeScreen';
import { SessionScreen } from './modules/questions/SessionScreen';
import { useAuth } from './shared/auth/AuthContext';
import { t } from './shared/i18n';
import { usePreferences } from './shared/preferences/PreferencesContext';
import { palettes, type } from './shared/ui-kit/tokens';

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function tema(isDark: boolean): Theme {
  const palette = isDark ? palettes.dark : palettes.light;
  return {
    dark: isDark,
    colors: {
      primary: palette.primary,
      background: palette.bg,
      card: palette.bg,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
    fonts: {
      regular: { fontFamily: 'PublicSans-Regular', fontWeight: '400' },
      medium: { fontFamily: 'PublicSans-SemiBold', fontWeight: '600' },
      bold: { fontFamily: 'Lexend-Bold', fontWeight: '700' },
      heavy: { fontFamily: 'Lexend-Bold', fontWeight: '700' },
    },
  };
}

/** Text as icon: the app has no icon set of its own yet. */
function Icon({ simbolo, color }: { simbolo: string; color: string }) {
  return <Text style={{ fontSize: 18, color: color }}>{simbolo}</Text>;
}

function Core() {
  const { palette } = usePreferences();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: { backgroundColor: palette.bg, borderTopColor: palette.border },
        tabBarLabelStyle: { fontFamily: type.micro.fontFamily, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="Home"
        options={{
          tabBarLabel: t('home.tab'),
          tabBarIcon: ({ color }) => <Icon simbolo="◧" color={color} />,
          tabBarButtonTestID: 'tab-home',
        }}>
        {({ navigation }) => (
          <HomeScreen onStudy={(area) => navigation.navigate('Session', { area })} />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="Estatisticas"
        component={StatsScreen}
        options={{
          tabBarLabel: t('stats.title'),
          tabBarIcon: ({ color }) => <Icon simbolo="◈" color={color} />,
          tabBarButtonTestID: 'tab-stats',
        }}
      />
      <Tabs.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile.title'),
          tabBarIcon: ({ color }) => <Icon simbolo="◍" color={color} />,
          tabBarButtonTestID: 'tab-profile',
        }}
      />
    </Tabs.Navigator>
  );
}

/** Signed out: welcome, sign-up and login live in a single stack. */
function FadeIn() {
  const [screen, setScreen] = useState<'welcome' | 'signUp' | 'login'>('welcome');

  if (screen === 'signUp') {
    return <SignUp onVoltar={() => setScreen('welcome')} onEntrar={() => setScreen('login')} />;
  }
  if (screen === 'login') {
    return <Login onVoltar={() => setScreen('welcome')} onCriarConta={() => setScreen('signUp')} />;
  }
  return <Welcome onCriarConta={() => setScreen('signUp')} onEntrar={() => setScreen('login')} />;
}

export function Navegacao() {
  const { palette, isDark, appLanguage } = usePreferences();
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={[styles.centro, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={tema(isDark)}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Keyed by language: tab labels are computed when the route is
              registered, so switching languages requires remounting. */}
          <Stack.Screen key={appLanguage} name="Core" component={Core} />
          <Stack.Screen name="Session" options={{ presentation: 'fullScreenModal' }}>
            {({ navigation, route }) => (
              <SessionScreen
                area={(route.params as { area: string }).area}
                onSair={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      ) : (
        <FadeIn />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
