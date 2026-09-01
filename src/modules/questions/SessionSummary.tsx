import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { enviarRespostas, fetchPopulation, type Resposta } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import { border, radius, space } from '../../shared/ui-kit/tokens';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { t } from '../../shared/i18n';
import { Button, Screen } from '../../shared/ui-kit/primitives';

function formatTime(ms: number) {
  const total = Math.round(ms / 1000);
  return total >= 60 ? `${Math.floor(total / 60)}min ${total % 60}s` : `${total}s`;
}

function Metric({ value, label, color }: { value: string; label: string; color: string }) {
  const { palette, type } = usePreferences();
  return (
    <View style={styles.metric}>
      <Text style={[type.title, { color }]}>{value}</Text>
      <Text style={[type.caption, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

type SyncState = 'sending' | 'ok' | 'failed';

export function SessionSummary({
  answers,
  area,
  onRepeat,
  onLeave,
}: {
  answers: Resposta[];
  area: string;
  onRepeat: () => void;
  onLeave: () => void;
}) {
  const { palette, type } = usePreferences();
  const { token } = useAuth();
  const [sync, setSync] = useState<SyncState>(answers.length > 0 ? 'sending' : 'ok');

  const correct = answers.filter((a) => a.correta).length;
  const wrong = answers.length - correct;
  const elapsed = answers.reduce((sum, a) => sum + a.tempoMs, 0);
  const myAccuracy = answers.length > 0 ? correct / answers.length : 0;

  // The population comparison only shows with a large enough sample. Without it,
  // the card explains the absence instead of showing a fragile number.
  const [average, setAverage] = useState<{ accuracy: number; users: number } | null>(null);
  useEffect(() => {
    fetchPopulation(area)
      .then(setAverage)
      .catch(() => setAverage(null));
  }, [area]);

  /**
   * Syncs the batch at the end of the session. Failing here costs the student
   * nothing: clientId makes the resend idempotent, so a later attempt settles it.
   */
  useEffect(() => {
    if (answers.length === 0) return;
    let alive = true;
    (async () => {
      const access = await token();
      if (!access) return alive ? setSync('failed') : undefined;
      try {
        await enviarRespostas(
          access,
          answers.map((a) => ({
            clientId: a.clientId,
            questionId: a.questionId,
            chosen: a.escolha,
            timeMs: a.tempoMs,
          })),
        );
        if (alive) setSync('ok');
      } catch {
        if (alive) setSync('failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, [answers, token]);

  const sending = sync === 'sending';

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.body}>
      <Text style={[type.display, { color: palette.text }]}>{t('summary.title')}</Text>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Metric value={String(correct)} label={t('summary.correct')} color={palette.successText} />
        <Metric
          value={String(wrong)}
          label={t('summary.wrong')}
          color={wrong > 0 ? palette.dangerText : palette.textMuted}
        />
        <Metric value={formatTime(elapsed)} label={t('summary.time')} color={palette.text} />
      </View>

      {average ? (
        <View
          style={[
            styles.card,
            styles.comparison,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={[type.heading, { color: palette.text }]}>{t('summary.youAndOthers')}</Text>
          <View style={styles.row}>
            <Text style={[type.body, { color: palette.textSecondary }]}>{t('summary.you')}</Text>
            <Text style={[type.label, { color: palette.text }]}>
              {Math.round(myAccuracy * 100)}%
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[type.body, { color: palette.textSecondary }]}>
              {t('summary.average')}
            </Text>
            <Text style={[type.label, { color: palette.text }]}>
              {Math.round(average.accuracy * 100)}%
            </Text>
          </View>
          <Text style={[type.micro, { color: palette.textMuted }]}>
            {t('summary.basedOn', { count: average.users })}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            styles.comparison,
            { borderColor: palette.border, borderStyle: 'dashed' },
          ]}>
          <Text style={[type.body, { color: palette.textSecondary }]}>{t('summary.noSample')}</Text>
        </View>
      )}

      <Button
        testID="ten-more"
        label={t('summary.tenMore')}
        onPress={onRepeat}
        disabled={sending}
      />

      {/* Leaving mid-upload would leave Home showing a stale number. */}
      <Button
        testID="change-subject"
        variant="plain"
        label={t('summary.backHome')}
        onPress={onLeave}
        busy={sending}
      />

      {sync === 'failed' && (
        <Text
          testID="sync-pending"
          style={[type.micro, { color: palette.textMuted, textAlign: 'center' }]}>
          {t('summary.waitingForConnection', { total: answers.length })}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xxl, gap: space.xl, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    borderWidth: border.normal,
    borderRadius: radius.xl,
    padding: space.xl,
  },
  comparison: { flexDirection: 'column', gap: space.sm },
  metric: { flex: 1, alignItems: 'center', gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
