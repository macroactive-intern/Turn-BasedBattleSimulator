export type StatusEffectType = 'poison' | 'burn' | 'stun' | 'regen' | 'shield'

export interface StatusEffect {
  type: StatusEffectType
  turnsRemaining: number
  value: number
}

export interface Ability {
  id: string
  name: string
  description: string
  damage: number
  mpCost: number
  cooldown: number
  effect?: StatusEffectType
}

export interface Combatant {
  name: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  abilities: Ability[]
  statusEffects: StatusEffect[]
  abilityCooldowns: Record<string, number>
}

export type BattlePhase = 'setup' | 'active' | 'ended'

export type CombatantSide = 'player' | 'enemy'

export interface BattleLogEntry {
  id: string
  message: string
  turnNumber: number
}

export interface BattleState {
  phase: BattlePhase
  player: Combatant
  enemy: Combatant
  currentTurn: CombatantSide
  turnQueue: CombatantSide[]
  turnNumber: number
  winner?: CombatantSide
  log: BattleLogEntry[]
  rngSeed: number
}

// Random values are passed in the action so the reducer stays pure and
// deterministic — replaying the same action sequence reproduces the same outcome.
export interface ActionRandoms {
  damageRoll: number       // 0–1, scales damage variance
  effectRoll: number       // 0–1, determines whether a status effect is applied
  critRoll: number         // 0–1, determines critical hit
}

export type BattleAction =
  | {
      type: 'START_BATTLE'
      player: Combatant
      enemy: Combatant
      firstTurn: CombatantSide
      rngSeed: number
    }
  | {
      type: 'USE_ABILITY'
      side: CombatantSide
      abilityId: string
      randoms: ActionRandoms
    }
  | {
      type: 'ENEMY_TAKE_TURN'
      randoms: ActionRandoms
    }
  | {
      type: 'ADVANCE_TURN'
    }
  | {
      type: 'RESET_BATTLE'
    }
  | {
      type: 'LOAD_REPLAY_STATE'
      state: BattleState
    }
