import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { excluirConta, exportarDados } from '../../shared/api/auth';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, palettes, radius, space, TOUCH_TARGET, type } from '../../shared/ui-kit/tokens';

export function PerfilScreen() {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const { usuario, sair, token, esquecerSessao } = useAuth();
  const [ocupado, setOcupado] = useState(false);

  /** LGPD art. 18: portabilidade. O JSON sai pelo compartilhamento do sistema. */
  const baixarDados = async () => {
    setOcupado(true);
    try {
      const t = await token();
      if (!t) throw new Error('sessão expirada');
      const dados = await exportarDados(t);
      await Share.share({ message: JSON.stringify(dados, null, 2) });
    } catch {
      Alert.alert('Não deu', 'Não conseguimos preparar seus dados agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  };

  /**
   * Exclusão em dois passos e com o que será apagado escrito na tela, como as
   * lojas exigem e a LGPD espera. Sem isso, é só um botão perigoso.
   */
  const excluir = () => {
    Alert.alert(
      'Excluir conta',
      'Isso não tem volta. Serão apagados de forma permanente:\n\n' +
        '• seu cadastro e dados pessoais\n' +
        '• todo o histórico de respostas\n' +
        '• suas estatísticas e comparações\n\n' +
        'Seus dados saem dos nossos servidores em até 30 dias. Respostas já usadas em médias ficam anônimas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tem certeza?', 'Última confirmação: a conta será excluída agora.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Excluir definitivamente',
                style: 'destructive',
                onPress: async () => {
                  setOcupado(true);
                  try {
                    const t = await token();
                    if (!t) throw new Error('sessão expirada');
                    await excluirConta(t);
                    await esquecerSessao();
                  } catch {
                    Alert.alert('Não deu', 'Não conseguimos excluir agora. Tente de novo.');
                  } finally {
                    setOcupado(false);
                  }
                },
              },
            ]),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={[type.title, { color: p.text }]}>Perfil</Text>

        <View style={[styles.cartao, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={[styles.avatar, { backgroundColor: p.primary }]}>
            <Text style={[type.title, { color: p.onPrimary }]}>
              {(usuario?.name ?? usuario?.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: p.text }]}>{usuario?.name ?? 'Sem nome'}</Text>
            <Text style={[type.caption, { color: p.textMuted }]}>{usuario?.email}</Text>
          </View>
        </View>

        <Text style={[type.micro, { color: p.textMuted, marginTop: space.xl }]}>CONTA E DADOS</Text>

        <Item
          testID="baixar-dados"
          titulo="Baixar meus dados"
          descricao="Suas respostas e estatísticas em JSON, como garante a LGPD."
          onPress={baixarDados}
          desabilitado={ocupado}
        />
        <Item
          testID="excluir-conta"
          titulo="Excluir conta"
          descricao="Apaga cadastro, histórico e estatísticas de forma permanente."
          onPress={excluir}
          desabilitado={ocupado}
          perigo
        />

        <Pressable
          testID="sair"
          onPress={sair}
          style={({ pressed }) => [
            styles.sair,
            { borderColor: p.border, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[type.label, { color: p.textSecondary }]}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({
  titulo,
  descricao,
  onPress,
  testID,
  perigo,
  desabilitado,
}: {
  titulo: string;
  descricao: string;
  onPress: () => void;
  testID: string;
  perigo?: boolean;
  desabilitado?: boolean;
}) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: p.surface,
          borderColor: pressed ? (perigo ? p.danger : p.primary) : p.border,
          opacity: desabilitado ? 0.5 : 1,
        },
      ]}>
      <Text style={[type.heading, { color: perigo ? p.dangerText : p.text }]}>{titulo}</Text>
      <Text style={[type.caption, { color: p.textMuted }]}>{descricao}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: space.xxl, gap: space.md },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
    marginTop: space.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    borderWidth: border.normal,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.xs,
    minHeight: TOUCH_TARGET,
  },
  sair: {
    borderWidth: border.normal,
    borderRadius: radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xl,
  },
});
