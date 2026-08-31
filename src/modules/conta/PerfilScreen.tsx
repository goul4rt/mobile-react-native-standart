import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { excluirConta, exportarDados } from '../../shared/api/auth';
import { useAuth } from '../../shared/auth/AuthContext';
import { t } from '../../shared/i18n';
import type { IdiomaApp } from '../../shared/i18n';
import { useTema, type Escala, type Idioma, type Tema } from '../../shared/ui-kit/PreferenciasContext';
import { border, radius, space, TOUCH_TARGET } from '../../shared/ui-kit/tokens';

export function PerfilScreen() {
  const { p, type, tema, escala, idioma, idiomaApp, definir } = useTema();
  const { usuario, sair, token, esquecerSessao } = useAuth();
  const [ocupado, setOcupado] = useState(false);
  const [conta, setConta] = useState(false);

  /** LGPD art. 18: portabilidade. O JSON sai pelo compartilhamento do sistema. */
  const baixarDados = async () => {
    setOcupado(true);
    try {
      const acesso = await token();
      if (!acesso) throw new Error('sessão expirada');
      const dados = await exportarDados(acesso);
      await Share.share({ message: JSON.stringify(dados, null, 2) });
    } catch {
      Alert.alert(t('comum.naoDeu'), t('perfil.erroExportar'));
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
      t('perfil.excluirConta'),
      t('perfil.excluirAviso'),
      [
        { text: t('comum.cancelar'), style: 'cancel' },
        {
          text: t('perfil.excluirContinuar'),
          style: 'destructive',
          onPress: () =>
            Alert.alert(t('perfil.excluirCerteza'), t('perfil.excluirUltima'), [
              { text: t('comum.cancelar'), style: 'cancel' },
              {
                text: t('perfil.excluirDefinitivo'),
                style: 'destructive',
                onPress: async () => {
                  setOcupado(true);
                  try {
                    const acesso = await token();
                    if (!acesso) throw new Error('sessão expirada');
                    await excluirConta(acesso);
                    await esquecerSessao();
                  } catch {
                    Alert.alert(t('comum.naoDeu'), t('perfil.erroExcluir'));
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

  if (conta) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.conteudo}>
          <Pressable hitSlop={12} testID="voltar-perfil" onPress={() => setConta(false)}>
            <Text style={[type.label, { color: p.textSecondary }]}>←</Text>
          </Pressable>
          <Text style={[type.title, { color: p.text }]}>{t('perfil.contaEDados')}</Text>

          <View style={[styles.grupo, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Linha rotulo={t('cadastro.nome')} valor={usuario?.name ?? '—'} />
            <Divisor />
            <Linha rotulo={t('cadastro.email')} valor={usuario?.email ?? '—'} />
          </View>

          <Acao
            testID="baixar-dados"
            titulo={t('perfil.baixarDados')}
            descricao={t('perfil.baixarDadosDesc')}
            onPress={baixarDados}
            desabilitado={ocupado}
          />
          <Acao
            testID="excluir-conta"
            titulo={t('perfil.excluirConta')}
            descricao={t('perfil.excluirContaDesc')}
            onPress={excluir}
            desabilitado={ocupado}
            perigo
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={[type.title, { color: p.text }]}>{t('perfil.titulo')}</Text>

        <View style={[styles.cartao, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={[styles.avatar, { backgroundColor: p.primarySubtle }]}>
            <Text style={[type.title, { color: p.primary }]}>
              {(usuario?.name ?? usuario?.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: p.text }]}>{usuario?.name ?? t('perfil.semNome')}</Text>
            <Text style={[type.caption, { color: p.textMuted }]}>{usuario?.email}</Text>
          </View>
        </View>

        <View style={[styles.grupo, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Pressable testID="conta-e-dados" onPress={() => setConta(true)} style={styles.linha}>
            <Text style={[type.body, { color: p.text }]}>{t('perfil.contaEDados')}</Text>
            <Text style={[type.body, { color: p.textMuted }]}>→</Text>
          </Pressable>
          <Divisor />

          <Opcoes<Tema>
            rotulo={t('perfil.tema')}
            valor={tema}
            opcoes={[
              ['claro', t('perfil.temaClaro')],
              ['escuro', t('perfil.temaEscuro')],
              ['sistema', t('perfil.temaSistema')],
            ]}
            onEscolher={(v) => definir('tema', v)}
            prefixoTestID="tema"
          />
          <Divisor />

          {/* O design testou os layouts até 1,3×; as opções param aí. */}
          <Opcoes<Escala>
            rotulo={t('perfil.tamanhoFonte')}
            valor={escala}
            opcoes={[
              ['normal', 'A'],
              ['grande', 'A'],
              ['maior', 'A'],
            ]}
            onEscolher={(v) => definir('escala', v)}
            prefixoTestID="escala"
            tamanhos={[13, 16, 20]}
          />
          <Divisor />

          <Opcoes<IdiomaApp>
            rotulo={t('perfil.idiomaApp')}
            valor={idiomaApp}
            opcoes={[
              ['pt', t('perfil.portugues')],
              ['en', t('perfil.ingles')],
            ]}
            onEscolher={(v) => definir('idiomaApp', v)}
            prefixoTestID="idioma-app"
          />
          <Divisor />

          {/* Língua estrangeira DA PROVA — as 5 questões de inglês ou espanhol
              em Linguagens. Nada a ver com o idioma da interface acima. */}
          <Opcoes<Idioma>
            rotulo={t('perfil.idiomaEstrangeiro')}
            valor={idioma}
            opcoes={[
              ['ingles', t('perfil.ingles')],
              ['espanhol', t('perfil.espanhol')],
            ]}
            onEscolher={(v) => definir('idioma', v)}
            prefixoTestID="idioma"
          />
        </View>

        <Pressable
          testID="sair"
          onPress={sair}
          style={({ pressed }) => [
            styles.sair,
            { borderColor: p.border, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[type.label, { color: p.textSecondary }]}>{t('perfil.sair')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Opcoes<T extends string>({
  rotulo,
  valor,
  opcoes,
  onEscolher,
  prefixoTestID,
  tamanhos,
}: {
  rotulo: string;
  valor: T;
  opcoes: [T, string][];
  onEscolher: (v: T) => void;
  prefixoTestID: string;
  tamanhos?: number[];
}) {
  const { p, type } = useTema();
  return (
    <View style={styles.linha}>
      <Text style={[type.body, { color: p.text, flex: 1 }]}>{rotulo}</Text>
      <View style={styles.opcoes}>
        {opcoes.map(([chave, texto], i) => (
          <Pressable
            key={chave}
            testID={`${prefixoTestID}-${chave}`}
            onPress={() => onEscolher(chave)}
            accessibilityRole="radio"
            accessibilityState={{ selected: valor === chave }}
            hitSlop={6}
            style={styles.opcao}>
            <Text
              style={[
                type.caption,
                {
                  color: valor === chave ? p.primary : p.textMuted,
                  fontFamily: valor === chave ? 'Lexend-SemiBold' : type.caption.fontFamily,
                  ...(tamanhos ? { fontSize: tamanhos[i] } : {}),
                },
              ]}>
              {texto}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  const { p, type } = useTema();
  return (
    <View style={styles.linha}>
      <Text style={[type.body, { color: p.text }]}>{rotulo}</Text>
      <Text style={[type.caption, { color: p.textMuted, flexShrink: 1 }]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function Divisor() {
  const { p } = useTema();
  return <View style={{ height: 1, backgroundColor: p.border }} />;
}

function Acao({
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
  const { p, type } = useTema();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.acao,
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
  conteudo: { padding: space.xxl, gap: space.md, paddingBottom: space.section },
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
  grupo: {
    borderWidth: border.normal,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: space.md,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: TOUCH_TARGET + 8,
  },
  opcoes: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  opcao: { minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  acao: {
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
