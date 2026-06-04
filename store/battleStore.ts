import { create } from 'zustand'
import type { BattleAction, BattleState } from '@/types/battle'
import { initialBattleState } from '@/lib/battle/reducer'

interface BattleStore {
  state: BattleState
  dispatch: (action: BattleAction) => void
  selectedAbilityId: string | null
  selectAbility: (id: string | null) => void
  sync: (state: BattleState, dispatch: (action: BattleAction) => void) => void
}

export const useBattleStore = create<BattleStore>((set) => ({
  state: initialBattleState,
  dispatch: () => {},
  selectedAbilityId: null,
  selectAbility: (id) => set({ selectedAbilityId: id }),
  sync: (state, dispatch) => set({ state, dispatch }),
}))
