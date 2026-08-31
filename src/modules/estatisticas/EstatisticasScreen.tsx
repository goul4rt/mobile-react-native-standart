import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchMinhasEstatisticas,
  fetchPopulacaoPorArea,
  type EstatisticaPopulacao,
  type MinhasEstatisticas,
} from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { BarraAcerto, ComparacaoArea, LinhaEvolucao } from './graficos';
import { useTema } from '../../shared/ui-kit/PreferenciasContext';
import { rotuloArea, t } from '../../shared/i18n';

type Aba = 'voce' | 'outros';

function formatarTempo(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function EstatisticasScreen() {
  const { p, type } = useTema();
  const { token } = useAuth();

  const [aba, setAba] = useState<Aba>('voce');
  const [minhas, setMinhas] = useState<MinhasEstatisticas | null>(null);
  const [populacao, setPopulacao] = useState<EstatisticaPopulacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const t = await token();
    if (!t) return;
    const [meu, geral] = await Promise.all([
      fetchMinhasEstatisticas(t).catch(() => null),
      fetchPopulacaoPorArea().catch(() => []),
    ]);
    setMinhas(meu);
    setPopulacao(geral);
    setCarregando(false);
  }, [token]);

  // Recarrega ao voltar pra aba: os números mudaram se houve sessão no meio.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  if (carregando) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: p.bg }]} edges={['top']}>
        <ActivityIndicator color={p.primary} />
      </SafeAreaView>
    );
  }

  const respondidas = minhas?.overall.total ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top']}>
      <Text style={[type.title, { color: p.text, paddingHorizontal: space.xxl }]}>{t('estatisticas.titulo')}</Text>

      <View style={[styles.abas, { borderBottomColor: p.border }]}>
        {(
          [
            ['voce', t('estatisticas.abaVoce')],
            ['outros', t('estatisticas.abaOutros')],
          ] as const
        ).map(([chave, rotulo]) => (
          <Pressable
            key={chave}
            testID={`aba-${chave}`}
            onPress={() => setAba(chave)}
            style={[styles.aba, aba === chave && { borderBottomColor: p.primary }]}>
            <Text style={[type.label, { color: aba === chave ? p.text : p.textMuted }]}>
              {rotulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={carregar} tintColor={p.primary} />
        }>
        {respondidas === 0 ? (
          <View style={[styles.vazio, { borderColor: p.border }]}>
            <Text style={[type.body, { color: p.textSecondary }]}>
              {t('estatisticas.vazio')}
            </Text>
          </View>
        ) : aba === 'voce' ? (
          <>
            <Secao titulo={t('estatisticas.acertoPorArea')}>
              <View style={{ gap: space.lg }}>
                {minhas!.byArea.map((a) => (
                  <BarraAcerto
                    key={a.area}
                    rotulo={rotuloArea(a.area)}
                    acertos={a.correct}
                    total={a.total}
                  />
                ))}
              </View>
            </Secao>

            <Secao titulo={t('estatisticas.evolucao')}>
              <LinhaEvolucao
                pontos={[...minhas!.weekly]
                  .reverse()
                  .map((s) => ({
                    rotulo: new Date(s.week).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    }),
                    valor: s.total > 0 ? s.correct / s.total : 0,
                  }))}
              />
            </Secao>

            <View style={styles.numeros}>
              <Numero valor={formatarTempo(minhas!.overall.avg_time_ms)} rotulo={t('estatisticas.tempoMedio')} />
              <Numero valor={String(respondidas)} rotulo={t('estatisticas.questoesRespondidas')} />
              <Numero
                valor={`${Math.round((minhas!.overall.correct / respondidas) * 100)}%`}
                rotulo={t('estatisticas.deAcerto')}
              />
            </View>
          </>
        ) : (
          <>
            {minhas!.byArea.map((minha) => {
              const geral = populacao.find((g) => g.area === minha.area);
              if (!geral) {
                return (
                  <View
                    key={minha.area}
                    style={[styles.vazio, { borderColor: p.border, marginBottom: space.lg }]}>
                    <Text style={[type.heading, { color: p.text, marginBottom: space.xs }]}>
                      {rotuloArea(minha.area)}
                    </Text>
                    <Text style={[type.caption, { color: p.textSecondary }]}>
                      Ainda faltam respostas de outros alunos pra comparar. A comparação abre quando
                      a amostra for suficiente.
                    </Text>
                  </View>
                );
              }
              return (
                <View key={minha.area} style={{ marginBottom: space.xl }}>
                  <ComparacaoArea
                    rotulo={rotuloArea(minha.area)}
                    voce={minha.total > 0 ? minha.correct / minha.total : null}
                    media={geral.accuracy}
                    usuarios={geral.users}
                  />
                </View>
              );
            })}
            <Text style={[type.micro, { color: p.textMuted }]}>
              {t('estatisticas.rodapeComparacao')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { p, type } = useTema();
  return (
    <View style={{ marginBottom: space.section }}>
      <Text style={[type.micro, { color: p.textMuted, marginBottom: space.md }]}>
        {titulo.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  const { p, type } = useTema();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
      <Text style={[type.title, { color: p.text }]}>{valor}</Text>
      <Text style={[type.micro, { color: p.textMuted, textAlign: 'center' }]}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  abas: { flexDirection: 'row', borderBottomWidth: 1, marginTop: space.lg },
  aba: {
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderBottomWidth: border.strong,
    borderBottomColor: 'transparent',
  },
  conteudo: { padding: space.xxl },
  numeros: { flexDirection: 'row', gap: space.md },
  vazio: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, padding: space.lg },
});
