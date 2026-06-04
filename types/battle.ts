export type StatusEffectId = 'poison' | 'burn' | 'stun' | 'silence' | 'regen' | 'shield'

export interface StatusEffect {
  id: StatusEffectId
  name: string
  duration: number
  magnitude: number
}

export interface Combatant {
  id: string
  name: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  isPlayer: boolean
  statusEffects: StatusEffect[]
  abilities: string[]
}

export type AbilityTargetType =
  | 'single-enemy'
  | 'all-enemies'
  | 'single-ally'
  | 'all-allies'
  | 'self'

export interface AbilityEffect {
  type: 'damage' | 'heal' | 'status' | 'mp-restore'
  formula?: 'physical' | 'magic'
  baseValue?: number
  statusEffect?: StatusEffectId
  statusDuration?: number
  statusMagnitude?: number
}

export interface Ability {
  id: string
  name: string
  description: string
  mpCost: number
  targetType: AbilityTargetType
  effects: AbilityEffect[]
  animationType: 'slash' | 'magic' | 'heal' | 'status'
}

export type BattlePhase =
  | 'idle'
  | 'player-turn'
  | 'enemy-turn'
  | 'animating'
  | 'victory'
  | 'defeat'
  | 'replay'

export interface BattleLogEntry {
  id: string
  turn: number
  actorId: string
  actorName: string
  message: string
  type: 'action' | 'effect' | 'system'
}

export interface ReplayAction {
  turn: number
  actorId: string
  action: RecordableAction
  timestamp: number
}

export interface BattleReplay {
  id: string
  date: string
  initialState: { combatants: Combatant[] }
  actions: ReplayAction[]
  result: 'victory' | 'defeat'
  duration: number
}

export type RecordableAction =
  | { type: 'USE_ABILITY'; actorId: string; targetId: string; abilityId: string }
  | { type: 'BASIC_ATTACK'; actorId: string; targetId: string }

export type BattleAction =
  | { type: 'START_BATTLE'; combatants: Combatant[] }
  | { type: 'BASIC_ATTACK'; actorId: string; targetId: string }
  | { type: 'USE_ABILITY'; actorId: string; targetId: string; abilityId: string }
  | { type: 'NEXT_TURN' }
  | { type: 'LOAD_REPLAY'; replay: BattleReplay }
  | { type: 'REPLAY_STEP' }
  | { type: 'RESET' }

export interface BattleState {
  phase: BattlePhase
  combatants: Combatant[]
  turnQueue: string[]
  currentTurnIndex: number
  turnNumber: number
  log: BattleLogEntry[]
  replay: BattleReplay | null
  replayStep: number
  startTime: number | null
}
