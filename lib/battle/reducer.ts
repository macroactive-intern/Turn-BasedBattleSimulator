import type {
  Ability,
  ActionRandoms,
  BattleAction,
  BattleLogEntry,
  BattleState,
  Combatant,
  CombatantSide,
  StatusEffectType,
} from '@/types/battle'
import { calculateDamage } from './damage'
import { applyEffect, tickEffects } from './statusEffects'
import { getDefaultPlayerCombatant } from './abilities'

// ─── Constants ────────────────────────────────────────────────────────────────

const CRIT_CHANCE = 0.15
const CRIT_MULTIPLIER = 1.5
const VARIANCE_MIN = 0.85
const VARIANCE_RANGE = 0.30

// Resolved when an ability applies a status effect, since Ability only carries
// the effect type — not its duration or tick value.
const STATUS_DEFAULTS: Record<StatusEffectType, { value: number; turnsRemaining: number }> = {
  poison: { value: 8,  turnsRemaining: 3 },
  burn:   { value: 10, turnsRemaining: 3 },
  stun:   { value: 0,  turnsRemaining: 1 },
  regen:  { value: 15, turnsRemaining: 4 },
  shield: { value: 12, turnsRemaining: 2 },
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function logEntry(state: BattleState, message: string): BattleLogEntry {
  return { id: `${state.turnNumber}-${state.log.length}`, message, turnNumber: state.turnNumber }
}

function addLog(state: BattleState, message: string): BattleState {
  return { ...state, log: [...state.log, logEntry(state, message)] }
}

function firstTurnBySide(player: Combatant, enemy: Combatant): CombatantSide {
  return player.speed >= enemy.speed ? 'player' : 'enemy'
}

// Generates the next `count` upcoming turns via simple alternation.
// Accepts both combatants so speed-weighted extra turns can be wired in later.
function buildTurnQueue(
  current: CombatantSide,
  _player: Combatant,
  _enemy: Combatant,
  count = 3
): CombatantSide[] {
  const queue: CombatantSide[] = []
  let side = current
  for (let i = 0; i < count; i++) {
    side = side === 'player' ? 'enemy' : 'player'
    queue.push(side)
  }
  return queue
}

// Decrements all cooldowns for a combatant, pruning entries that reach 0.
function decrementCooldowns(c: Combatant): Combatant {
  const next: Record<string, number> = {}
  for (const [id, turns] of Object.entries(c.abilityCooldowns)) {
    const remaining = Math.max(0, turns - 1)
    if (remaining > 0) next[id] = remaining
  }
  return { ...c, abilityCooldowns: next }
}

function onCooldown(c: Combatant, abilityId: string): boolean {
  return (c.abilityCooldowns[abilityId] ?? 0) > 0
}

function endBattle(state: BattleState, winner: CombatantSide, message: string): BattleState {
  return { ...addLog(state, message), phase: 'ended', winner }
}

// Shared turn-advance logic: decrements acting-side cooldowns, flips currentTurn,
// rebuilds the 3-turn queue, increments turnNumber.
function doAdvanceTurn(state: BattleState): BattleState {
  const acting = state.currentTurn
  const player  = acting === 'player' ? decrementCooldowns(state.player) : state.player
  const enemy   = acting === 'enemy'  ? decrementCooldowns(state.enemy)  : state.enemy
  const next: CombatantSide = acting === 'player' ? 'enemy' : 'player'
  return {
    ...state,
    player,
    enemy,
    currentTurn: next,
    turnQueue:   buildTurnQueue(next, player, enemy),
    turnNumber:  state.turnNumber + 1,
  }
}

// Applies damage variance and crit from the caller-supplied randoms.
// Returns the updated defender and log-friendly numbers.
function resolveDamage(
  attacker: Combatant,
  defender: Combatant,
  ability: Ability,
  randoms: ActionRandoms
): { updatedDefender: Combatant; finalDamage: number; isCrit: boolean } {
  const base = calculateDamage(attacker, defender, ability)
  if (base === 0) return { updatedDefender: defender, finalDamage: 0, isCrit: false }

  const variance    = VARIANCE_MIN + randoms.damageRoll * VARIANCE_RANGE
  const isCrit      = randoms.critRoll < CRIT_CHANCE
  const finalDamage = Math.max(1, Math.round(base * variance * (isCrit ? CRIT_MULTIPLIER : 1)))
  return {
    updatedDefender: { ...defender, hp: Math.max(0, defender.hp - finalDamage) },
    finalDamage,
    isCrit,
  }
}

// Applies the status effect carried by an ability, using the STATUS_DEFAULTS table.
// Rule: damage > 0  → offensive → apply to the defender.
//       damage === 0 → self-buff → apply to the caster.
function applyAbilityEffect(
  effectType: StatusEffectType,
  caster: Combatant,
  defender: Combatant,
  ability: Ability
): { caster: Combatant; defender: Combatant } {
  const se = { type: effectType, ...STATUS_DEFAULTS[effectType] }
  if (ability.damage > 0) {
    return { caster, defender: applyEffect(defender, se) }
  }
  return { caster: applyEffect(caster, se), defender }
}

// ─── Initial state ────────────────────────────────────────────────────────────

const STUB_COMBATANT: Combatant = {
  name: '', hp: 1, maxHp: 1, mp: 0, maxMp: 0,
  attack: 0, defense: 0, speed: 0,
  abilities: [], statusEffects: [], abilityCooldowns: {},
}

export const initialBattleState: BattleState = {
  phase:        'setup',
  player:       getDefaultPlayerCombatant(),
  enemy:        STUB_COMBATANT,
  currentTurn:  'player',
  turnQueue:    [],
  turnNumber:   0,
  log:          [],
  rngSeed:      0,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {

    // ── START_BATTLE ──────────────────────────────────────────────────────────
    case 'START_BATTLE': {
      const { player, enemy, firstTurn, rngSeed } = action
      const currentTurn = firstTurn ?? firstTurnBySide(player, enemy)
      const turnQueue   = buildTurnQueue(currentTurn, player, enemy)
      const first       = currentTurn === 'player' ? player.name : enemy.name
      let next: BattleState = {
        ...initialBattleState,
        phase: 'active',
        player, enemy,
        currentTurn, turnQueue,
        turnNumber: 1,
        rngSeed,
        log: [],
      }
      return addLog(next, `Battle begins! ${first} acts first.`)
    }

    // ── USE_ABILITY ───────────────────────────────────────────────────────────
    case 'USE_ABILITY': {
      if (state.phase !== 'active' || state.currentTurn !== 'player') return state

      const { abilityId, randoms } = action
      let { player, enemy } = state
      let next = state

      // 1. Tick start-of-turn effects on player
      const { combatant: ticked, logMessages, skippedTurn } = tickEffects(player)
      player = ticked
      next = { ...next, player }
      for (const msg of logMessages) next = addLog(next, msg)

      // 2. Death from DoT
      if (player.hp <= 0) {
        return endBattle(next, 'enemy', `${player.name} was overcome by their wounds!`)
      }

      // 3. Stunned — skip; turn still advances
      if (skippedTurn) return doAdvanceTurn(next)

      // 4. Validate ability
      const ability = player.abilities.find((a) => a.id === abilityId)
      if (!ability)                          return state
      if (player.mp < ability.mpCost)        return state
      if (onCooldown(player, abilityId))     return state

      // 5. Spend MP + set cooldown
      player = {
        ...player,
        mp: player.mp - ability.mpCost,
        abilityCooldowns: ability.cooldown > 0
          ? { ...player.abilityCooldowns, [abilityId]: ability.cooldown }
          : player.abilityCooldowns,
      }

      // 6. Resolve damage (if any)
      if (ability.damage > 0) {
        const shield = enemy.statusEffects.find((e) => e.type === 'shield')
        const { updatedDefender, finalDamage, isCrit } = resolveDamage(player, enemy, ability, randoms)
        enemy = updatedDefender
        const crit = isCrit ? ' Critical hit!' : ''
        next = addLog({ ...next, player, enemy },
          `${player.name} uses ${ability.name} for ${finalDamage} damage!${crit}`)
        if (shield) next = addLog(next, `${enemy.name}'s shield absorbs ${shield.value} damage.`)
      } else {
        next = addLog({ ...next, player }, `${player.name} uses ${ability.name}.`)
      }

      // 7. Apply status effect
      if (ability.effect) {
        const applied = applyAbilityEffect(ability.effect, player, enemy, ability)
        player = applied.caster
        enemy  = applied.defender
        const target = ability.damage > 0 ? enemy.name : player.name
        next = addLog({ ...next, player, enemy }, `${target} is affected by ${ability.effect}!`)
      }

      next = { ...next, player, enemy }

      // 8. Victory check
      if (enemy.hp <= 0) return endBattle(next, 'player', `${enemy.name} was defeated!`)

      return doAdvanceTurn(next)
    }

    // ── ENEMY_TAKE_TURN ───────────────────────────────────────────────────────
    case 'ENEMY_TAKE_TURN': {
      if (state.phase !== 'active') return state

      const { randoms } = action
      let { player, enemy } = state
      let next = state

      // 1. Tick start-of-turn effects on enemy
      const { combatant: ticked, logMessages, skippedTurn } = tickEffects(enemy)
      enemy = ticked
      next = { ...next, enemy }
      for (const msg of logMessages) next = addLog(next, msg)

      // 2. Death from DoT
      if (enemy.hp <= 0) {
        return endBattle(next, 'player', `${enemy.name} was overcome by their wounds!`)
      }

      // 3. Stunned — skip; turn still advances
      if (skippedTurn) return doAdvanceTurn(next)

      // 4. AI — filter usable abilities
      const usable = enemy.abilities.filter(
        (a) => !onCooldown(enemy, a.id) && enemy.mp >= a.mpCost
      )
      if (usable.length === 0) {
        return doAdvanceTurn(addLog(next, `${enemy.name} has no usable abilities and waits.`))
      }

      // 5. AI priority selection
      const enemyHpRatio  = enemy.hp  / enemy.maxHp
      const playerHpRatio = player.hp / player.maxHp

      const regenOption   = usable.find((a) => a.effect === 'regen')
      const highDmgOption = [...usable]
        .filter((a) => a.damage > 0)
        .sort((a, b) => b.damage - a.damage)[0]
      const randomOption  = usable[Math.floor(randoms.effectRoll * usable.length)] ?? usable[0]

      const chosen =
        enemyHpRatio  < 0.3 && regenOption   ? regenOption   :
        playerHpRatio < 0.2 && highDmgOption  ? highDmgOption :
        randomOption

      // Log AI reasoning when a priority rule triggered
      if (enemyHpRatio  < 0.3 && chosen === regenOption) {
        next = addLog(next, `${enemy.name} is critically wounded and seeks recovery!`)
      } else if (playerHpRatio < 0.2 && chosen === highDmgOption) {
        next = addLog(next, `${enemy.name} senses victory and goes for the kill!`)
      }

      // 6. Spend MP + set cooldown
      enemy = {
        ...enemy,
        mp: enemy.mp - chosen.mpCost,
        abilityCooldowns: chosen.cooldown > 0
          ? { ...enemy.abilityCooldowns, [chosen.id]: chosen.cooldown }
          : enemy.abilityCooldowns,
      }

      // 7. Resolve damage (if any)
      if (chosen.damage > 0) {
        const shield = player.statusEffects.find((e) => e.type === 'shield')
        const { updatedDefender, finalDamage, isCrit } = resolveDamage(enemy, player, chosen, randoms)
        player = updatedDefender
        const crit = isCrit ? ' Critical hit!' : ''
        next = addLog({ ...next, player, enemy },
          `${enemy.name} uses ${chosen.name} for ${finalDamage} damage!${crit}`)
        if (shield) next = addLog(next, `${player.name}'s shield absorbs ${shield.value} damage.`)
      } else {
        next = addLog({ ...next, enemy }, `${enemy.name} uses ${chosen.name}.`)
      }

      // 8. Apply status effect
      if (chosen.effect) {
        const applied = applyAbilityEffect(chosen.effect, enemy, player, chosen)
        enemy  = applied.caster
        player = applied.defender
        const target = chosen.damage > 0 ? player.name : enemy.name
        next = addLog({ ...next, player, enemy }, `${target} is affected by ${chosen.effect}!`)
      }

      next = { ...next, player, enemy }

      // 9. Defeat check
      if (player.hp <= 0) return endBattle(next, 'enemy', `${player.name} was defeated!`)

      return doAdvanceTurn(next)
    }

    // ── ADVANCE_TURN ──────────────────────────────────────────────────────────
    case 'ADVANCE_TURN': {
      if (state.phase !== 'active') return state
      return doAdvanceTurn(state)
    }

    // ── RESET_BATTLE ──────────────────────────────────────────────────────────
    case 'RESET_BATTLE':
      return initialBattleState

    // ── LOAD_REPLAY_STATE ─────────────────────────────────────────────────────
    case 'LOAD_REPLAY_STATE':
      return action.state

    default:
      return state
  }
}
