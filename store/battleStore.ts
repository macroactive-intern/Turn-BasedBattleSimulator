import { create } from 'zustand'
import type { BattleAction, Combatant, CombatantSide } from '@/types/battle'
import { battleReducer, initialBattleState } from '@/lib/battle/reducer'
import { type BattleReplay, createReplay, recordReplayStep } from '@/lib/battle/replayRecorder'

interface BattleStore {
  battleState: ReturnType<typeof battleReducer>
  replay: BattleReplay
  dispatchBattleAction: (action: BattleAction) => void
  startBattle: (player: Combatant, enemy: Combatant) => void
  useAbility: (abilityId: string) => void
  enemyTakeTurn: () => void
  resetBattle: () => void
  saveReplay: () => Promise<void>
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  battleState: initialBattleState,
  replay: createReplay(initialBattleState),

  dispatchBattleAction(action: BattleAction) {
    const stateBefore = get().battleState
    const stateAfter  = battleReducer(stateBefore, action)
    const replay      = recordReplayStep(get().replay, action, stateBefore, stateAfter)
    set({ battleState: stateAfter, replay })
  },

  startBattle(player: Combatant, enemy: Combatant) {
    const firstTurn: CombatantSide = player.speed >= enemy.speed ? 'player' : 'enemy'
    // Fresh replay keyed to the pre-battle initial state
    set({ replay: createReplay(initialBattleState) })
    get().dispatchBattleAction({
      type: 'START_BATTLE',
      player,
      enemy,
      firstTurn,
      rngSeed: Math.random(),
    })
  },

  useAbility(abilityId: string) {
    get().dispatchBattleAction({
      type: 'USE_ABILITY',
      side: 'player',
      abilityId,
      randoms: {
        damageRoll: Math.random(),
        effectRoll: Math.random(),
        critRoll:   Math.random(),
      },
    })
  },

  enemyTakeTurn() {
    get().dispatchBattleAction({
      type: 'ENEMY_TAKE_TURN',
      randoms: {
        damageRoll: Math.random(),
        effectRoll: Math.random(),
        critRoll:   Math.random(),
      },
    })
  },

  resetBattle() {
    set({
      battleState: initialBattleState,
      replay:      createReplay(initialBattleState),
    })
  },

  async saveReplay() {
    const { replay } = get()
    await fetch('/api/replays', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(replay),
    })
  },
}))
