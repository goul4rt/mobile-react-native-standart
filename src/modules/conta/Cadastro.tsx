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
import { border, palettes, radius, space, TOUCH_TARGET, type } from '../../shared/ui-kit/tokens';
import { Campo } from './Campo';

const SENHA_MINIMA = 8;

export function Cadastro({ onVoltar, onEntrar }: { onVoltar: () => void; onEntrar: () => void }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const { registrar } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // O botão só liga com o aceite marcado: consentimento é ato, não default.
  const podeEnviar = aceite && email.includes('@') && senha.length >= SENHA_MINIMA && !enviando;

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await registrar(email.trim(), senha, nome.trim() || undefined);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: p.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.tela}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          // Sem isto o teclado cobre o botão de enviar e o formulário fica
          // impossível de submeter sem fechar o teclado na mão.
          automaticallyAdjustKeyboardInsets>
          <Pressable hitSlop={12} onPress={onVoltar} testID="voltar" style={styles.voltar}>
            <Text style={[type.label, { color: p.textSecondary }]}>←</Text>
          </Pressable>

          <Text style={[type.title, { color: p.text, marginBottom: space.xl }]}>Criar conta</Text>

          <View style={{ gap: space.lg }}>
            <Campo
              rotulo="Nome"
              testID="campo-nome"
              placeholder="Como quer ser chamado"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />
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
              placeholder={`mínimo ${SENHA_MINIMA} caracteres`}
              value={senha}
              onChangeText={setSenha}
              segredo
              autoCapitalize="none"
            />
          </View>

          <Pressable
            testID="aceite"
            onPress={() => setAceite((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aceite }}
            style={styles.aceite}>
            <View
              style={[
                styles.caixinha,
                {
                  borderColor: aceite ? p.primary : p.border,
                  backgroundColor: aceite ? p.primary : 'transparent',
                },
              ]}>
              {aceite && <Text style={[type.caption, { color: p.onPrimary }]}>✓</Text>}
            </View>
            <Text style={[type.caption, { color: p.textSecondary, flex: 1 }]}>
              Li e aceito os Termos de Uso e a Política de Privacidade.
            </Text>
          </Pressable>

          {!!erro && (
            <Text style={[type.caption, { color: p.dangerText, marginTop: space.md }]}>{erro}</Text>
          )}

          <Pressable
            testID="enviar-cadastro"
            disabled={!podeEnviar}
            onPress={enviar}
            accessibilityRole="button"
            accessibilityState={{ disabled: !podeEnviar }}
            style={({ pressed }) => [
              styles.botao,
              {
                backgroundColor: podeEnviar ? (pressed ? p.primaryPressed : p.primary) : p.surfaceAlt,
              },
            ]}>
            {enviando ? (
              <ActivityIndicator color={p.onPrimary} />
            ) : (
              <Text style={[type.label, { color: podeEnviar ? p.onPrimary : p.textMuted }]}>
                Criar conta
              </Text>
            )}
          </Pressable>

          {!aceite && (
            <Text style={[type.micro, { color: p.textMuted, textAlign: 'center' }]}>
              O botão ativa quando o aceite é marcado.
            </Text>
          )}

          <Pressable onPress={onEntrar} testID="ir-para-login" style={styles.botaoPlano}>
            <Text style={[type.caption, { color: p.textSecondary }]}>Já tenho conta</Text>
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
  aceite: { flexDirection: 'row', gap: space.md, alignItems: 'center', marginTop: space.lg },
  caixinha: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
  },
  botaoPlano: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
