import { createContext, useContext, useState, type ReactNode } from 'react';

import type { WorkoutPlan } from '@/types';

// Holds the plan the user is about to / currently performing, so the Today
// screen can hand a plan to the /workout player route without serializing it
// through navigation params.
interface WorkoutSessionValue {
  activePlan: WorkoutPlan | null;
  setActivePlan: (plan: WorkoutPlan | null) => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionValue | null>(null);

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  return (
    <WorkoutSessionContext.Provider value={{ activePlan, setActivePlan }}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession(): WorkoutSessionValue {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error('useWorkoutSession must be used within WorkoutSessionProvider');
  return ctx;
}
