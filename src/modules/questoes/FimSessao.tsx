import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enviarRespostas, fetchPopulation, type Resposta } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { useTema } from '../../shared/ui-kit/PreferenciasContext';
import { t } from '../../shared/i18n';

function formatTime(ms: number) {
  const total = Math.round(ms / 1000);
  return total >= 60 ? `${Math.floor(total / 60)}min ${total % 60}s` : `${total}s`;
}

function Metrica({ valor, rotulo, cor }: { valor: string; rotulo: string; cor: string }) {
  const { p, type } = useTema();
  return (
    <View style={styles.metrica}>
      <Text style={[type.title, { color: cor }]}>{valor}</Text>
      <Text style={[type.caption, { color: p.textMuted }]}>{rotulo}</Text>
    </View>
  );
}

export function FimSessao({
  respostas,
  area,
  onRepetir,
  onSair,
}: {
  respostas: Resposta[];
  area: string;
  onRepetir: () => void;
  onSair: () => void;
}) {
  const { p, type } = useTema();
  const { token } = useAuth();
  const [sincronizacao, setSincronizacao] = useState<'enviando' | 'ok' | 'falhou'>(
    respostas.length > 0 ? 'enviando' : 'ok',
  );

  const acertos = respostas.filter((r) => r.correta).length;
  const erros = respostas.length - acertos;
  const tempo = respostas.reduce((soma, r) => soma + r.tempoMs, 0);
  const minhaTaxa = respostas.length > 0 ? acertos / respostas.length : 0;

  // A comparação com a população só aparece com amostra suficiente. Sem ela, o
  // cartão explica a ausência em vez de mostrar um número frágil.
  const [media, setMedia] = useState<{ accuracy: number; users: number } | null>(null);
  useEffect(() => {
    fetchPopulation(area)
      .then(setMedia)
      .catch(() => setMedia(null));
  }, [area]);

  /**
   * Sincroniza o lote ao fim da sessão. Falhar aqui não custa nada ao aluno: o
   * clientId torna o reenvio idempotente, então uma tentativa futura resolve.
   */
  useEffect(() => {
    if (respostas.length === 0) return;
    let vivo = true;
    (async () => {
      const t = await token();
      if (!t) return vivo ? setSincronizacao('falhou') : undefined;
      try {
        await enviarRespostas(
          t,
          respostas.map((r) => ({
            clientId: r.clientId,
            questionId: r.questionId,
            chosen: r.escolha,
            timeMs: r.tempoMs,
          })),
        );
        if (vivo) setSincronizacao('ok');
      } catch {
        if (vivo) setSincronizacao('falhou');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [respostas, token]);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: p.bg }]} edges={['top', 'bottom']}>
      <View style={styles.conteudo}>
        <Text style={[type.display, { color: p.text }]}>{t('fim.titulo')}</Text>

        <View style={[styles.cartao, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Metrica valor={String(acertos)} rotulo={t('fim.acertos')} cor={p.successText} />
          <Metrica valor={String(erros)} rotulo={t('fim.erros')} cor={erros > 0 ? p.dangerText : p.textMuted} />
          <Metrica valor={formatTime(tempo)} rotulo={t('fim.tempo')} cor={p.text} />
        </View>

        {media ? (
          <View style={[styles.cartao, styles.comparacao, { backgroundColor: p.surface, borderColor: p.border }]}>
            <Text style={[type.heading, { color: p.text }]}>{t('fim.voceEOsOutros')}</Text>
            <View style={styles.linha}>
              <Text style={[type.body, { color: p.textSecondary }]}>{t('fim.voce')}</Text>
              <Text style={[type.label, { color: p.text }]}>{Math.round(minhaTaxa * 100)}%</Text>
            </View>
            <View style={styles.linha}>
              <Text style={[type.body, { color: p.textSecondary }]}>{t('fim.media')}</Text>
              <Text style={[type.label, { color: p.text }]}>{Math.round(media.accuracy * 100)}%</Text>
            </View>
            <Text style={[type.micro, { color: p.textMuted }]}>
              Base de {media.users} {media.users === 1 ? 'pessoa' : 'pessoas'}.
            </Text>
          </View>
        ) : (
          <View style={[styles.cartao, styles.comparacao, { borderColor: p.border, borderStyle: 'dashed' }]}>
            <Text style={[type.body, { color: p.textSecondary }]}>
              {t('fim.semAmostra')}
            </Text>
          </View>
        )}

        <Pressable
          onPress={onRepetir}
          disabled={sincronizacao === 'enviando'}
          testID="mais-dez"
          style={({ pressed }) => [
            styles.botao,
            { backgroundColor: pressed ? p.primaryPressed : p.primary },
          ]}>
          <Text style={[type.label, { color: p.onPrimary }]}>{t('fim.maisDez')}</Text>
        </Pressable>

        {/* Sair enquanto o lote sobe deixaria a home com número velho. */}
        <Pressable
          onPress={onSair}
          disabled={sincronizacao === 'enviando'}
          testID="trocar-area"
          style={[styles.botaoPlano, { opacity: sincronizacao === 'enviando' ? 0.5 : 1 }]}>
          {sincronizacao === 'enviando' ? (
            <ActivityIndicator color={p.textSecondary} />
          ) : (
            <Text style={[type.label, { color: p.textSecondary }]}>{t('fim.voltarHome')}</Text>
          )}
        </Pressable>

        {sincronizacao === 'falhou' && (
          <Text
            testID="sync-pendente"
            style={[type.micro, { color: p.textMuted, textAlign: 'center' }]}>
            {t('fim.aguardandoConexao', { total: respostas.length })}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flex: 1, padding: space.xxl, gap: space.xl, justifyContent: 'center' },
  cartao: {
    flexDirection: 'row',
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.xl,
  },
  comparacao: { flexDirection: 'column', gap: space.sm },
  metrica: { flex: 1, alignItems: 'center', gap: space.xs },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botaoPlano: { height: 44, alignItems: 'center', justifyContent: 'center' },
  botao: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
