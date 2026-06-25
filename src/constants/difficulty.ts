import type { DifficultyFeedback } from '@/types';

export const DIFFICULTY_OPTIONS: { value: DifficultyFeedback; label: string }[] = [
  { value: 'too_easy', label: '😴 Too easy' },
  { value: 'just_right', label: '💪 Just right' },
  { value: 'too_hard', label: '🥵 Too hard' },
];
