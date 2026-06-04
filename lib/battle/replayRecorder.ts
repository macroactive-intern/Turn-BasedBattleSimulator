import type { BattleReplay, Combatant, RecordableAction, ReplayAction } from '@/types/battle'

export class ReplayRecorder {
  private actions: ReplayAction[] = []
  private readonly startTime: number
  private readonly initialCombatants: Combatant[]

  constructor(combatants: Combatant[]) {
    this.startTime = Date.now()
    this.initialCombatants = JSON.parse(JSON.stringify(combatants))
  }

  record(turn: number, actorId: string, action: RecordableAction): void {
    this.actions.push({
      turn,
      actorId,
      action,
      timestamp: Date.now() - this.startTime,
    })
  }

  finalize(result: 'victory' | 'defeat'): BattleReplay {
    return {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      initialState: { combatants: this.initialCombatants },
      actions: this.actions,
      result,
      duration: Date.now() - this.startTime,
    }
  }
}

export function serializeReplay(replay: BattleReplay): string {
  return JSON.stringify(replay, null, 2)
}

export function deserializeReplay(json: string): BattleReplay {
  return JSON.parse(json) as BattleReplay
}
