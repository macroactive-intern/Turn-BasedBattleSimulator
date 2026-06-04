import type { BattleAction, BattleState } from '@/types/battle'

export interface ReplayStep {
  action: BattleAction
  stateBefore: BattleState
  stateAfter: BattleState
}

export interface BattleReplay {
  id: string
  createdAt: string
  steps: ReplayStep[]
  finalState: BattleState
}

// Returns a new BattleReplay with the step appended and finalState updated.
// Pure: does not mutate the incoming replay or any state objects.
export function recordReplayStep(
  replay: BattleReplay,
  action: BattleAction,
  stateBefore: BattleState,
  stateAfter: BattleState
): BattleReplay {
  const step: ReplayStep = { action, stateBefore, stateAfter }
  return {
    ...replay,
    steps: [...replay.steps, step],
    finalState: stateAfter,
  }
}

// Factory — call once when a battle starts to get the initial replay object.
export function createReplay(initialState: BattleState): BattleReplay {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    steps: [],
    finalState: initialState,
  }
}
