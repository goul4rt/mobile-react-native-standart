import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AREA_LABEL,
  fetchMinhasEstatisticas,
  fetchTaxonomy,
  type AreaResumo,
  type MinhasEstatisticas,
} from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, palettes, radius, space, type } from '../../shared/ui-kit/tokens';

export function HomeScreen({ onEstudar }: { onEstudar: (area: string) => void }) {
  const dark = useColorScheme() === 'dark';
  const p = dark ? palettes.dark : palettes.light;
  const { usuario, token } = useAuth();

  const [areas, setAreas] = useState<AreaResumo[] | null>(null);
  const [minhas, setMinhas] = useState<MinhasEstatisticas | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    const t = await token();
    const [taxonomia, estatisticas] = await Promise.all([
      fetchTaxonomy().catch(() => null),
      t ? fetchMinhasEstatisticas(t).catch(() => null) : Promise.resolve(null),
    ]);
    if (!taxonomia) return setErro(true);
    setAreas(taxonomia);
    setMinhas(estatisticas);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const acertoPorArea = new Map(
    (minhas?.byArea ?? []).map((a) => [a.area, { total: a.total, correct: a.correct }]),
  );

  // "Continuar de onde parou" é a área mais respondida — a que o aluno já
  // escolheu com os dedos, não a que a gente acha que ele deveria estudar.
  const continuar = [...acertoPorArea.entries()].sort((a, b) => b[1].total - a[1].total)[0];

  const semana = minhas?.weekly?.[0];
  const primeiroNome = usuario?.name?.split(' ')[0];

  if (erro) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: p.bg }]} edges={['top']}>
        <Text style={[type.heading, { color: p.text, textAlign: 'center' }]}>
          Sem internet.{'\n'}Tudo salvo aqui — sincronizamos depois.
        </Text>
        <Pressable
          testID="tentar-de-novo"
          onPress={carregar}
          style={({ pressed }) => [
            styles.botao,
            { backgroundColor: pressed ? p.primaryPressed : p.primary, marginTop: space.xl },
          ]}>
          <Text style={[type.label, { color: p.onPrimary }]}>Tentar de novo</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!areas) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: p.bg }]} edges={['top']}>
        <ActivityIndicator color={p.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={carregar} tintColor={p.primary} />
        }>
        <Text style={[type.title, { color: p.text }]}>
          {primeiroNome ? `Oi, ${primeiroNome}` : 'Oi'}
        </Text>

        {continuar && (
          <Pressable
            testID="continuar"
            onPress={() => onEstudar(continuar[0])}
            style={({ pressed }) => [
              styles.destaque,
              { backgroundColor: pressed ? p.primaryPressed : p.primary },
            ]}>
            <Text style={[type.micro, { color: p.onPrimary, opacity: 0.8 }]}>
              CONTINUAR DE ONDE PAROU
            </Text>
            <Text style={[type.heading, { color: p.onPrimary, marginTop: space.xs }]}>
              {AREA_LABEL[continuar[0]] ?? continuar[0]}
            </Text>
            <Text style={[type.caption, { color: p.onPrimary, opacity: 0.85 }]}>
              {continuar[1].total} respondidas ·{' '}
              {Math.round((continuar[1].correct / continuar[1].total) * 100)}% de acerto
            </Text>
          </Pressable>
        )}

        <Text style={[type.micro, { color: p.textMuted, marginTop: space.xl }]}>
          ESTUDAR POR ÁREA
        </Text>
        <View style={{ gap: space.md, marginTop: space.md }}>
          {areas.map((area) => {
            const meu = acertoPorArea.get(area.code);
            return (
              <Pressable
                key={area.code}
                testID={`area-${area.code}`}
                onPress={() => onEstudar(area.code)}
                style={({ pressed }) => [
                  styles.cartao,
                  { backgroundColor: p.surface, borderColor: pressed ? p.primary : p.border },
                ]}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: p.text }]}>
                    {AREA_LABEL[area.code] ?? area.label}
                  </Text>
                  <Text style={[type.caption, { color: p.textMuted }]}>
                    {meu
                      ? `${Math.round((meu.correct / meu.total) * 100)}% de acerto · ${meu.total} respondidas`
                      : `${area.total} questões`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {semana && semana.total > 0 && (
          <View style={[styles.resumo, { backgroundColor: p.surfaceAlt }]}>
            <Text style={[type.micro, { color: p.textMuted }]}>ESTA SEMANA</Text>
            <Text style={[type.body, { color: p.text }]}>
              {semana.total} {semana.total === 1 ? 'questão' : 'questões'} ·{' '}
              {Math.round((semana.correct / semana.total) * 100)}% de acerto
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  conteudo: { padding: space.xxl, paddingBottom: space.section },
  destaque: { borderRadius: radius.xl, padding: space.xl, marginTop: space.xl },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  resumo: { borderRadius: radius.lg, padding: space.lg, marginTop: space.xl, gap: space.xs },
  botao: {
    height: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
