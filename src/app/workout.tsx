import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setLastDifficulty } from '@/lib/feedback';
import { useProgress } from '@/providers/ProgressProvider';
import { useWorkoutSession } from '@/providers/WorkoutSessionProvider';
import { DIFFICULTY_OPTIONS } from '@/constants/difficulty';
import type { DifficultyFeedback, WorkoutPlan } from '@/types';

type Segment =
  | { kind: 'work'; name: string; blockTitle: string; reps?: number; durationSeconds?: number; setLabel?: string }
  | { kind: 'rest'; seconds: number };

/** Flatten a plan into an ordered list of work/rest segments. */
function buildSegments(plan: WorkoutPlan): Segment[] {
  const segs: Segment[] = [];
  for (const block of plan.blocks) {
    for (const ex of block.exercises) {
      const sets = ex.sets ?? 1;
      for (let s = 0; s < sets; s++) {
        segs.push({
          kind: 'work',
          name: ex.name,
          blockTitle: block.title,
          reps: ex.reps,
          durationSeconds: ex.durationSeconds,
          setLabel: sets > 1 ? `Set ${s + 1} of ${sets}` : undefined,
        });
        if (ex.restSeconds && s < sets - 1) segs.push({ kind: 'rest', seconds: ex.restSeconds });
      }
    }
  }
  return segs;
}

function tick(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

export default function WorkoutPlayer() {
  const router = useRouter();
  const theme = useTheme();
  const { activePlan, setActivePlan } = useWorkoutSession();
  const { recordCompletion } = useProgress();

  const segments = useMemo(() => (activePlan ? buildSegments(activePlan) : []), [activePlan]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'active' | 'done'>('active');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const startRef = useRef(Date.now());

  const current = segments[index];

  const advance = useCallback(() => {
    tick();
    if (index + 1 >= segments.length) setPhase('done');
    else setIndex(index + 1);
  }, [index, segments.length]);

  // Reset the timer whenever the segment changes (rest + timed work auto-count).
  useEffect(() => {
    const seg = segments[index];
    if (seg?.kind === 'rest') setRemaining(seg.seconds);
    else if (seg?.kind === 'work' && seg.durationSeconds) setRemaining(seg.durationSeconds);
    else setRemaining(null);
    setPaused(false);
  }, [index, segments]);

  // Countdown loop for timed segments.
  useEffect(() => {
    if (remaining === null || paused || phase !== 'active') return;
    if (remaining <= 0) {
      advance();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused, phase, advance]);

  const quit = useCallback(() => {
    setActivePlan(null);
    router.back();
  }, [router, setActivePlan]);

  const finish = useCallback(
    async (fb: DifficultyFeedback) => {
      if (!activePlan) return;
      setSaving(true);
      try {
        await setLastDifficulty(fb);
        const minutes = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
        await recordCompletion(activePlan.title, minutes);
        setActivePlan(null);
        router.replace('/(tabs)');
      } finally {
        setSaving(false);
      }
    },
    [activePlan, recordCompletion, router, setActivePlan],
  );

  if (!activePlan) return <Redirect href="/(tabs)" />;

  const isDone = phase === 'done' || !current;
  const progress = segments.length ? (isDone ? 1 : index / segments.length) : 1;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header: progress + close */}
        <View style={styles.header}>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[styles.progressFill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]}
            />
          </View>
          <Pressable onPress={quit} hitSlop={12} accessibilityLabel="Close workout">
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        </View>

        {isDone ? (
          <View style={styles.body}>
            <ThemedText type="title" style={styles.center}>
              Workout complete 🎉
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {activePlan.title}
            </ThemedText>
            <ThemedText type="smallBold" style={[styles.center, styles.feedbackPrompt]}>
              How did that feel?
            </ThemedText>
            <View style={styles.feedbackCol}>
              {DIFFICULTY_OPTIONS.map((opt) => (
                <PrimaryButton
                  key={opt.value}
                  variant="secondary"
                  title={opt.label}
                  loading={saving}
                  onPress={() => finish(opt.value)}
                />
              ))}
            </View>
          </View>
        ) : current.kind === 'work' ? (
          <View style={styles.body}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {current.blockTitle.toUpperCase()}
              {current.setLabel ? ` · ${current.setLabel}` : ''}
            </ThemedText>
            <ThemedText type="title" style={styles.center}>
              {current.name}
            </ThemedText>

            {current.durationSeconds ? (
              <>
                <ThemedText style={[styles.timer, { color: theme.accent }]}>
                  {remaining ?? current.durationSeconds}s
                </ThemedText>
                <View style={styles.row}>
                  <PrimaryButton
                    variant="secondary"
                    title={paused ? 'Resume' : 'Pause'}
                    style={styles.flex}
                    onPress={() => setPaused((p) => !p)}
                  />
                  <PrimaryButton title="Skip" style={styles.flex} onPress={advance} />
                </View>
              </>
            ) : (
              <>
                <ThemedText type="subtitle" style={styles.center}>
                  {current.reps ? `${current.reps} reps` : 'Go!'}
                </ThemedText>
                <PrimaryButton title="Done — next" onPress={advance} />
              </>
            )}
          </View>
        ) : (
          <View style={styles.body}>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.center}>
              Rest
            </ThemedText>
            <ThemedText style={[styles.timer, { color: theme.accent }]}>{remaining ?? 0}s</ThemedText>
            <View style={styles.row}>
              <PrimaryButton
                variant="secondary"
                title="+15s"
                style={styles.flex}
                onPress={() => setRemaining((r) => (r ?? 0) + 15)}
              />
              <PrimaryButton title="Skip rest" style={styles.flex} onPress={advance} />
            </View>
          </View>
        )}

        {!isDone && (
          <ThemedView type="backgroundElement" style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              {index + 1} / {segments.length}
            </ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: Spacing.three },
  center: { textAlign: 'center' },
  timer: { fontSize: 72, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
  feedbackPrompt: { marginTop: Spacing.four },
  feedbackCol: { gap: Spacing.two },
  footer: { alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Spacing.three },
});
