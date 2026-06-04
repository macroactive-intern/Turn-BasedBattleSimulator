import type {
  BattleAction,
  BattleLogEntry,
  BattleState,
  Combatant,
} from '@/types/battle'
import {
  calculateHeal,
  calculateMagicDamage,
  calculatePhysicalDamage,
  clampHp,
  isDefeated,
} from './damage'
import { applyStatus, hasStatus, tickStatusEffects } from './statusEffects'
import { getAbility } from './abilities'

function uid(): string {
  return crypto.randomUUID()
}

function buildTurnQueue(combatants: Combatant[]): string[] {
  return combatants
    .filter((c) => !isDefeated(c))
    .sort((a, b) => b.speed - a.speed)
    .map((c) => c.id)
}

function addLog(
  state: BattleState,
  message: string,
  actorId: string,
  actorName: string,
  type: BattleLogEntry['type'] = 'action'
): BattleState {
  const entry: BattleLogEntry = { id: uid(), turn: state.turnNumber, actorId, actorName, message, type }
  return { ...state, log: [...state.log, entry] }
}

function updateCombatant(state: BattleState, updated: Combatant): BattleState {
  return {
    ...state,
    combatants: state.combatants.map((c) => (c.id === updated.id ? updated : c)),
  }
}

function checkOutcome(combatants: Combatant[]): 'victory' | 'defeat' | null {
  if (combatants.filter((c) => !c.isPlayer).every(isDefeated)) return 'victory'
  if (combatants.filter((c) => c.isPlayer).every(isDefeated)) return 'defeat'
  return null
}

function applyBasicAttack(
  state: BattleState,
  actorId: string,
  targetId: string
): BattleState {
  const actor = state.combatants.find((c) => c.id === actorId)
  const target = state.combatants.find((c) => c.id === targetId)
  if (!actor || !target || isDefeated(actor) || isDefeated(target)) return state

  if (hasStatus(actor, 'stun')) {
    return addLog(state, `${actor.name} is stunned and cannot act!`, actorId, actor.name, 'effect')
  }

  const dmg = calculatePhysicalDamage(actor, target)
  const updatedTarget = { ...target, hp: clampHp(target.hp - dmg, target.maxHp) }
  let next = updateCombatant(state, updatedTarget)
  next = addLog(next, `${actor.name} attacks ${target.name} for ${dmg} damage!`, actorId, actor.name)

  if (isDefeated(updatedTarget)) {
    next = addLog(next, `${updatedTarget.name} is defeated!`, 'system', 'System', 'system')
  }
  return next
}

function applyAbility(
  state: BattleState,
  actorId: string,
  targetId: string,
  abilityId: string
): BattleState {
  const actor = state.combatants.find((c) => c.id === actorId)
  const ability = getAbility(abilityId)
  if (!actor || !ability || isDefeated(actor)) return state

  if (hasStatus(actor, 'silence') && ability.mpCost > 0) {
    return addLog(state, `${actor.name} is silenced and cannot use abilities!`, actorId, actor.name, 'effect')
  }
  if (actor.mp < ability.mpCost) {
    return addLog(state, `${actor.name} doesn't have enough MP for ${ability.name}!`, actorId, actor.name, 'system')
  }

  // For all-enemies, iterate each enemy; otherwise use targetId
  const targets: string[] =
    ability.targetType === 'all-enemies'
      ? state.combatants.filter((c) => !c.isPlayer && !isDefeated(c)).map((c) => c.id)
      : ability.targetType === 'all-allies'
      ? state.combatants.filter((c) => c.isPlayer && !isDefeated(c)).map((c) => c.id)
      : [targetId]

  let actorUpdated = { ...actor, mp: actor.mp - ability.mpCost }
  let next = state

  for (const tid of targets) {
    const target = next.combatants.find((c) => c.id === tid)
    if (!target) continue
    let targetUpdated = { ...target }

    for (const effect of ability.effects) {
      switch (effect.type) {
        case 'damage': {
          const dmg =
            effect.formula === 'physical'
              ? calculatePhysicalDamage(actorUpdated, targetUpdated, effect.baseValue ?? 1)
              : calculateMagicDamage(effect.baseValue ?? 30, targetUpdated)
          targetUpdated = { ...targetUpdated, hp: clampHp(targetUpdated.hp - dmg, targetUpdated.maxHp) }
          next = addLog(
            next,
            `${actor.name} uses ${ability.name} on ${target.name} for ${dmg} damage!`,
            actorId,
            actor.name
          )
          break
        }
        case 'heal': {
          const amt = calculateHeal(effect.baseValue ?? 30)
          targetUpdated = { ...targetUpdated, hp: clampHp(targetUpdated.hp + amt, targetUpdated.maxHp) }
          next = addLog(
            next,
            `${actor.name} uses ${ability.name} on ${target.name}, restoring ${amt} HP!`,
            actorId,
            actor.name
          )
          break
        }
        case 'status': {
          if (effect.statusEffect) {
            const se = {
              id: effect.statusEffect,
              name: effect.statusEffect,
              duration: effect.statusDuration ?? 2,
              magnitude: effect.statusMagnitude ?? 1,
            } as const
            targetUpdated = applyStatus(targetUpdated, se)
            next = addLog(
              next,
              `${target.name} is afflicted with ${effect.statusEffect}!`,
              actorId,
              actor.name,
              'effect'
            )
          }
          break
        }
        case 'mp-restore': {
          const amt = effect.baseValue ?? 20
          targetUpdated = { ...targetUpdated, mp: clampHp(targetUpdated.mp + amt, targetUpdated.maxMp) }
          if (amt < 0) {
            actorUpdated = { ...actorUpdated, mp: clampHp(actorUpdated.mp + Math.abs(amt), actorUpdated.maxMp) }
          }
          break
        }
      }
    }

    next = updateCombatant(next, targetUpdated)
    if (isDefeated(targetUpdated)) {
      next = addLog(next, `${targetUpdated.name} is defeated!`, 'system', 'System', 'system')
    }
  }

  next = updateCombatant(next, actorUpdated)
  return next
}

export const initialBattleState: BattleState = {
  phase: 'idle',
  combatants: [],
  turnQueue: [],
  currentTurnIndex: 0,
  turnNumber: 0,
  log: [],
  replay: null,
  replayStep: 0,
  startTime: null,
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'START_BATTLE': {
      const queue = buildTurnQueue(action.combatants)
      const first = action.combatants.find((c) => c.id === queue[0])
      const phase = first?.isPlayer ? 'player-turn' : 'enemy-turn'
      let next: BattleState = {
        ...initialBattleState,
        phase,
        combatants: action.combatants,
        turnQueue: queue,
        currentTurnIndex: 0,
        turnNumber: 1,
        startTime: Date.now(),
      }
      next = addLog(next, 'Battle begins!', 'system', 'System', 'system')
      next = addLog(next, `${first?.name ?? 'Unknown'}'s turn.`, 'system', 'System', 'system')
      return next
    }

    case 'BASIC_ATTACK': {
      let next = applyBasicAttack(state, action.actorId, action.targetId)
      const outcome = checkOutcome(next.combatants)
      if (outcome) {
        next = addLog(next, outcome === 'victory' ? 'Victory!' : 'Defeat...', 'system', 'System', 'system')
        return { ...next, phase: outcome }
      }
      return { ...next, phase: 'animating' }
    }

    case 'USE_ABILITY': {
      let next = applyAbility(state, action.actorId, action.targetId, action.abilityId)
      const outcome = checkOutcome(next.combatants)
      if (outcome) {
        next = addLog(next, outcome === 'victory' ? 'Victory!' : 'Defeat...', 'system', 'System', 'system')
        return { ...next, phase: outcome }
      }
      return { ...next, phase: 'animating' }
    }

    case 'NEXT_TURN': {
      const alive = new Set(state.combatants.filter((c) => !isDefeated(c)).map((c) => c.id))
      const validQueue = state.turnQueue.filter((id) => alive.has(id))

      let nextIndex = (state.currentTurnIndex + 1) % Math.max(validQueue.length, 1)
      const isNewRound = nextIndex === 0

      let next: BattleState = { ...state, turnQueue: validQueue, currentTurnIndex: nextIndex }

      if (isNewRound) {
        next = { ...next, turnNumber: next.turnNumber + 1 }
        for (const c of next.combatants.filter((c) => !isDefeated(c))) {
          const { updated, logEntries } = tickStatusEffects(c, next.turnNumber)
          next = updateCombatant(next, updated)
          for (const entry of logEntries) {
            next = { ...next, log: [...next.log, { ...entry, id: uid() }] }
          }
        }
      }

      const outcome = checkOutcome(next.combatants)
      if (outcome) {
        next = addLog(next, outcome === 'victory' ? 'Victory!' : 'Defeat...', 'system', 'System', 'system')
        return { ...next, phase: outcome }
      }

      const nextActorId = validQueue[nextIndex]
      const nextActor = next.combatants.find((c) => c.id === nextActorId)
      const phase = nextActor?.isPlayer ? 'player-turn' : 'enemy-turn'
      next = addLog(next, `${nextActor?.name ?? 'Unknown'}'s turn.`, 'system', 'System', 'system')
      return { ...next, phase }
    }

    case 'LOAD_REPLAY': {
      return {
        ...initialBattleState,
        phase: 'replay',
        combatants: action.replay.initialState.combatants,
        turnQueue: buildTurnQueue(action.replay.initialState.combatants),
        replay: action.replay,
        replayStep: 0,
        turnNumber: 1,
      }
    }

    case 'REPLAY_STEP': {
      if (!state.replay || state.replayStep >= state.replay.actions.length) return state
      const ra = state.replay.actions[state.replayStep]
      let next = state
      if (ra.action.type === 'BASIC_ATTACK') {
        next = applyBasicAttack(state, ra.action.actorId, ra.action.targetId)
      } else if (ra.action.type === 'USE_ABILITY') {
        next = applyAbility(state, ra.action.actorId, ra.action.targetId, ra.action.abilityId)
      }
      return { ...next, phase: 'replay', replayStep: state.replayStep + 1 }
    }

    case 'RESET':
      return initialBattleState

    default:
      return state
  }
}
