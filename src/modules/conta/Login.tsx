import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../shared/auth/AuthContext';
import { palettes, radius, space, TOUCH_TARGET, type } from '../../shared/ui-kit/tokens';
import { Campo } from './Campo';

export function Login({ onVoltar, onCriarConta }: { onVoltar: () => void; onCriarConta: () => void }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const { entrar } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeEnviar = email.includes('@') && senha.length > 0 && !enviando;

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: p.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          // Sem isto o teclado cobre o botão de enviar e o formulário fica
          // impossível de submeter sem fechar o teclado na mão.
          automaticallyAdjustKeyboardInsets>
          <Pressable hitSlop={12} onPress={onVoltar} testID="voltar" style={styles.voltar}>
            <Text style={[type.label, { color: p.textSecondary }]}>←</Text>
          </Pressable>

          <Text style={[type.title, { color: p.text, marginBottom: space.xl }]}>Entrar</Text>

          <View style={{ gap: space.lg }}>
            <Campo
              rotulo="E-mail"
              testID="campo-email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Campo
              rotulo="Senha"
              testID="campo-senha"
              placeholder="sua senha"
              value={senha}
              onChangeText={setSenha}
              segredo
              autoCapitalize="none"
            />
          </View>

          {!!erro && (
            <Text style={[type.caption, { color: p.dangerText, marginTop: space.md }]}>{erro}</Text>
          )}

          <Pressable
            testID="enviar-login"
            disabled={!podeEnviar}
            onPress={enviar}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.botao,
              { backgroundColor: podeEnviar ? (pressed ? p.primaryPressed : p.primary) : p.surfaceAlt },
            ]}>
            {enviando ? (
              <ActivityIndicator color={p.onPrimary} />
            ) : (
              <Text style={[type.label, { color: podeEnviar ? p.onPrimary : p.textMuted }]}>Entrar</Text>
            )}
          </Pressable>

          <Pressable onPress={onCriarConta} testID="ir-para-cadastro" style={styles.botaoPlano}>
            <Text style={[type.caption, { color: p.textSecondary }]}>Criar uma conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { padding: space.xxl, gap: space.md, paddingBottom: space.section },
  voltar: { width: TOUCH_TARGET, height: TOUCH_TARGET, justifyContent: 'center' },
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
  },
  botaoPlano: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
