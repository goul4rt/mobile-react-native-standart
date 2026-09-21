import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchTaxonomy, type DisciplineResumo, type SkillResumo, type TopicResumo } from '../../shared/api/client';
import { usePreferences } from '../../shared/preferences/PreferencesContext';
import { border, radius, space, TOUCH_TARGET } from '../../shared/ui-kit/tokens';
import { subjectLabel, t } from '../../shared/i18n';
import { BackButton, Button, Centered, Screen } from '../../shared/ui-kit/primitives';

export function SubjectFilterScreen({
  area,
  onIniciar,
  onVoltar,
}: {
  area: string;
  /**
   * Sem nada escolhido, a sessão cobre a área inteira, todos os anos.
   * Habilidade e disciplina/tema são alternativos: escolher um limpa o outro
   * (são duas taxonomias diferentes sobre a mesma área, não se combinam).
   */
  onIniciar: (
    skill: string | undefined,
    ano: number | undefined,
    discipline: string | undefined,
    topic: string | undefined,
  ) => void;
  onVoltar: () => void;
}) {
  const { palette, type } = usePreferences();

  const [skills, setSkills] = useState<SkillResumo[] | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplineResumo[]>([]);
  const [temas, setTemas] = useState<TopicResumo[]>([]);
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [selecionada, setSelecionada] = useState<string | undefined>(undefined);
  const [ano, setAno] = useState<number | undefined>(undefined);
  const [discipline, setDiscipline] = useState<string | undefined>(undefined);
  const [topic, setTopic] = useState<string | undefined>(undefined);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Só a primeira carga esvazia `skills` (tela inteira de loading). Trocar o
  // ano depois disso atualiza a contagem no lugar, sem a lista sumir.
  const cargaInicial = React.useRef(true);

  const carregar = React.useCallback(
    (anoAtual: number | undefined) => {
      setError(false);
      if (cargaInicial.current) setSkills(null);
      fetchTaxonomy(anoAtual)
        .then((tax) => {
          setSkills(tax.skills.filter((s) => s.area === area));
          setDisciplinas(tax.disciplines.filter((d) => d.area === area));
          setTemas(tax.topics.filter((tp) => tp.area === area));
          setAnosDisponiveis(tax.areas.find((a) => a.code === area)?.years ?? []);
          cargaInicial.current = false;
        })
        .catch(() => setError(true));
    },
    [area],
  );

  useEffect(() => {
    carregar(ano);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `carregar` só muda com `area`.
  }, [ano]);

  const totalArea = skills?.reduce((soma, s) => soma + s.total, 0) ?? 0;
  // Disciplina/tema são alternativos à habilidade: quando ativos, a contagem
  // de "todas as habilidades" precisa refletir o escopo escolhido, não a
  // área inteira — senão o número na tela nunca muda ao trocar de tema.
  const totalExibido = topic
    ? (temas.find((tm) => tm.code === topic)?.total ?? 0)
    : discipline
      ? (disciplinas.find((d) => d.code === discipline)?.total ?? 0)
      : totalArea;

  const selecionarHabilidade = (skill: string | undefined) => {
    setSelecionada(skill);
    setDiscipline(undefined);
    setTopic(undefined);
  };

  const selecionarDisciplina = (codigo: string) => {
    setDiscipline(codigo);
    setTopic(undefined);
    setSelecionada(undefined);
  };

  const limparDisciplina = () => {
    setDiscipline(undefined);
    setTopic(undefined);
  };

  if (error) {
    return (
      <Centered>
        <Text style={[type.heading, { color: palette.text, textAlign: 'center' }]}>
          {t('common.offline')}
        </Text>
        <Button
          testID="try-again"
          label={t('common.tryAgain')}
          onPress={() => carregar(ano)}
          style={{ marginTop: space.xl, paddingHorizontal: space.xl }}
        />
      </Centered>
    );
  }

  if (!skills) {
    return (
      <Centered>
        <ActivityIndicator color={palette.primary} />
      </Centered>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.navo}>
        <BackButton onPress={onVoltar} />
        <Pressable
          testID="open-filters"
          onPress={() => setFiltrosAbertos(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.botaoFiltro,
            {
              borderColor: ano || discipline ? palette.primary : palette.border,
              backgroundColor:
                ano || discipline ? palette.primarySubtle : pressed ? palette.surfaceAlt : palette.surface,
            },
          ]}>
          <Text style={[type.label, { color: ano || discipline ? palette.primary : palette.textSecondary }]}>
            {ano
              ? String(ano)
              : (disciplinas.find((d) => d.code === discipline)?.label ?? t('filter.filters'))}
          </Text>
        </Pressable>
      </View>
      <View style={styles.topo}>
        <Text style={[type.title, { color: palette.text }]}>{t('filter.title')}</Text>
        <Text style={[type.caption, { color: palette.textMuted }]}>{subjectLabel(area)}</Text>
      </View>

      <ScrollView
        style={styles.rolagem}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        // Bug conhecido da RN no Android 10+ (facebook/react-native#33172): o
        // bounce nativo nas bordas pode inverter a direção do scroll de forma
        // imprevisível. Sem efeito visual perdido — só o glow do overscroll.
        overScrollMode="never">
        <Linha
          testID="skill-all"
          titulo={t('filter.allSkills')}
          legenda={t('filter.allSkillsDesc', { total: totalExibido })}
          selecionada={selecionada === undefined}
          onPress={() => selecionarHabilidade(undefined)}
        />

        {skills.length === 0 && (
          <Text style={[type.caption, { color: palette.textMuted, marginTop: space.lg }]}>
            {t('filter.empty')}
          </Text>
        )}

        {skills.map((s) => (
          <Linha
            key={s.skill}
            testID={`skill-${s.skill}`}
            titulo={t('filter.skillLabel', { n: s.skill.replace('H', '') })}
            legenda={t('filter.questionsCount', { total: s.total })}
            selecionada={selecionada === s.skill}
            onPress={() => selecionarHabilidade(s.skill)}
          />
        ))}
      </ScrollView>

      <View style={[styles.rodape, { borderTopColor: palette.border }]}>
        <Button
          testID="start-session"
          label={t('filter.start')}
          onPress={() => onIniciar(selecionada, ano, discipline, topic)}
        />
      </View>

      <FiltersModal
        visible={filtrosAbertos}
        anos={anosDisponiveis}
        anoSelecionado={ano}
        onSelecionarAno={setAno}
        disciplinas={disciplinas}
        temas={temas}
        disciplinaSelecionada={discipline}
        temaSelecionado={topic}
        onSelecionarDisciplina={selecionarDisciplina}
        onLimparDisciplina={limparDisciplina}
        onSelecionarTema={setTopic}
        onFechar={() => setFiltrosAbertos(false)}
      />
    </Screen>
  );
}

/** Filtro avançado clássico: folha de baixo com os critérios além de habilidade. */
function FiltersModal({
  visible,
  anos,
  anoSelecionado,
  onSelecionarAno,
  disciplinas,
  temas,
  disciplinaSelecionada,
  temaSelecionado,
  onSelecionarDisciplina,
  onLimparDisciplina,
  onSelecionarTema,
  onFechar,
}: {
  visible: boolean;
  anos: number[];
  anoSelecionado: number | undefined;
  onSelecionarAno: (ano: number | undefined) => void;
  disciplinas: DisciplineResumo[];
  temas: TopicResumo[];
  disciplinaSelecionada: string | undefined;
  temaSelecionado: string | undefined;
  onSelecionarDisciplina: (codigo: string) => void;
  onLimparDisciplina: () => void;
  onSelecionarTema: (codigo: string | undefined) => void;
  onFechar: () => void;
}) {
  const { palette, type } = usePreferences();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar} testID="filters-backdrop" />
      <View style={[styles.folha, { backgroundColor: palette.bg }]}>
        <View style={styles.folhaTopo}>
          <Text style={[type.title, { color: palette.text }]}>{t('filter.filters')}</Text>
          <Pressable testID="close-filters" hitSlop={12} onPress={onFechar} accessibilityRole="button">
            <Text style={[type.label, { color: palette.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        {/* Limitada e com scroll próprio: com todos os anos do acervo (15+
            chips), o conteúdo passa da altura da tela e derrubava o botão de
            aplicar pra fora — ele fica fixo abaixo, fora do scroll. */}
        <ScrollView style={styles.folhaRolagem} showsVerticalScrollIndicator={false}>
          <Text style={[type.micro, { color: palette.textMuted, marginTop: space.lg }]}>
            {t('filter.yearSection')}
          </Text>
          <View style={styles.chips}>
            <Chip
              testID="year-all"
              label={t('filter.allYears')}
              selecionado={anoSelecionado === undefined}
              onPress={() => onSelecionarAno(undefined)}
            />
            {anos.map((a) => (
              <Chip
                key={a}
                testID={`year-${a}`}
                label={String(a)}
                selecionado={anoSelecionado === a}
                onPress={() => onSelecionarAno(a)}
              />
            ))}
          </View>

          <Text style={[type.micro, { color: palette.textMuted, marginTop: space.xl }]}>
            {t('filter.disciplineSection')}
          </Text>
          <View style={styles.chips}>
            <Chip
              testID="discipline-all"
              label={t('filter.allDisciplines')}
              selecionado={disciplinaSelecionada === undefined}
              onPress={onLimparDisciplina}
            />
            {disciplinas.map((d) => (
              <Chip
                key={d.code}
                testID={`discipline-${d.code}`}
                label={d.label}
                selecionado={disciplinaSelecionada === d.code}
                onPress={() => onSelecionarDisciplina(d.code)}
              />
            ))}
          </View>

          {disciplinaSelecionada && (
            <>
              <Text style={[type.micro, { color: palette.textMuted, marginTop: space.xl }]}>
                {t('topicFilter.topicSection')}
              </Text>
              <View style={styles.chips}>
                <Chip
                  testID="topic-all"
                  label={t('topicFilter.allTopics')}
                  selecionado={temaSelecionado === undefined}
                  onPress={() => onSelecionarTema(undefined)}
                />
                {temas
                  .filter((tm) => tm.discipline === disciplinaSelecionada)
                  .map((tm) => (
                    <Chip
                      key={tm.code}
                      testID={`topic-${tm.code}`}
                      label={tm.label}
                      selecionado={temaSelecionado === tm.code}
                      onPress={() => onSelecionarTema(tm.code)}
                    />
                  ))}
              </View>
            </>
          )}
        </ScrollView>

        <Button
          testID="apply-filters"
          label={t('filter.apply')}
          onPress={onFechar}
          style={{ marginTop: space.lg }}
        />
      </View>
    </Modal>
  );
}

function Chip({
  testID,
  label,
  selecionado,
  onPress,
}: {
  testID: string;
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  const { palette, type } = usePreferences();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selecionado ? palette.primary : pressed ? palette.surfaceAlt : palette.surface,
          borderColor: selecionado ? palette.primary : palette.border,
        },
      ]}>
      <Text style={[type.caption, { color: selecionado ? palette.onPrimary : palette.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Linha({
  testID,
  titulo,
  legenda,
  selecionada,
  onPress,
}: {
  testID: string;
  titulo: string;
  legenda: string;
  selecionada: boolean;
  onPress: () => void;
}) {
  const { palette, type } = usePreferences();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionada }}
      style={({ pressed }) => [
        styles.linha,
        {
          backgroundColor: selecionada ? palette.primarySubtle : palette.surface,
          borderColor: selecionada ? palette.primary : pressed ? palette.textMuted : palette.border,
        },
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.heading, { color: palette.text }]}>{titulo}</Text>
        <Text style={[type.caption, { color: palette.textMuted }]}>{legenda}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
  },
  topo: { paddingHorizontal: space.xxl, marginTop: space.sm },
  botaoFiltro: {
    borderWidth: border.normal,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sem isso, o ScrollView (no meio de outros dois irmãos numa coluna) mede
  // altura pelo conteúdo em vez do espaço disponível: o scroll por wheel do
  // mouse (que depende dos limites nativos medidos) fica errático.
  rolagem: { flex: 1 },
  lista: { padding: space.xxl, paddingTop: space.lg, gap: space.md, paddingBottom: space.section },
  linha: {
    borderWidth: border.normal,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rodape: { borderTopWidth: 1, padding: space.lg, paddingHorizontal: space.xxl },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  folha: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xxl,
    paddingBottom: space.section,
  },
  folhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // flexShrink: sem isso, o View de dentro não recua e a folha estoura o
  // maxHeight em vez de rolar — o botão de aplicar ficava fora da tela.
  folhaRolagem: { flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  chip: {
    borderWidth: border.normal,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
});
