import { describe, it, expect } from 'vitest'
import { battleReducer, initialBattleState } from '@/lib/battle/reducer'
import { createCombatantFromCharacter, getDefaultPlayerCombatant } from '@/lib/battle/abilities'
import { createReplay, recordReplayStep } from '@/lib/battle/replayRecorder'
import type { ActionRandoms, BattleState, Combatant } from '@/types/battle'

// ─── Shared helpers ────────────────────────────────────────────────────────────

// damageRoll=0 → minimum variance (×0.85), critRoll=1 → no crit
const BASE_RANDOMS: ActionRandoms = { damageRoll: 0, effectRoll: 0, critRoll: 1 }

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    name: 'Test',
    hp: 100, maxHp: 100,
    mp: 100, maxMp: 100,
    attack: 0, defense: 0, speed: 10,
    abilities: [], statusEffects: [], abilityCooldowns: {},
    ...overrides,
  }
}

function startBattle(
  player: Combatant,
  enemy: Combatant,
  firstTurn?: 'player' | 'enemy',
): BattleState {
  // Mirror the store's speed-based logic when firstTurn is not specified
  const ft = firstTurn ?? (player.speed >= enemy.speed ? 'player' : 'enemy')
  return battleReducer(initialBattleState, {
    type: 'START_BATTLE', player, enemy, firstTurn: ft, rngSeed: 0,
  })
}

const SCRATCH_ABILITY = {
  id: 'scratch', name: 'Scratch', description: '',
  damage: 5, mpCost: 0, cooldown: 0,
}

// ─── Character loading ─────────────────────────────────────────────────────────

describe('createCombatantFromCharacter', () => {
  it('maps all known fields correctly', () => {
    const c = createCombatantFromCharacter({
      name: 'Warrior', hp: 150, maxHp: 150,
      mp: 40, maxMp: 40,
      attack: 20, defense: 12, speed: 14,
    })
    expect(c.name).toBe('Warrior')
    expect(c.hp).toBe(150)
    expect(c.maxHp).toBe(150)
    expect(c.mp).toBe(40)
    expect(c.attack).toBe(20)
    expect(c.defense).toBe(12)
    expect(c.speed).toBe(14)
    expect(c.statusEffects).toEqual([])
    expect(c.abilityCooldowns).toEqual({})
  })

  it('falls back to defaults when fields are missing', () => {
    const c = createCombatantFromCharacter({})
    expect(c.name).toBe('Unknown')
    expect(c.hp).toBe(100)
    expect(c.mp).toBe(50)
    expect(c.attack).toBe(10)
    expect(c.defense).toBe(5)
    expect(c.speed).toBe(8)
  })

  it('accepts "strength" as an alias for attack', () => {
    const c = createCombatantFromCharacter({ name: 'Brute', strength: 30 })
    expect(c.attack).toBe(30)
  })

  it('accepts "dexterity" as an alias for speed', () => {
    const c = createCombatantFromCharacter({ name: 'Scout', dexterity: 25 })
    expect(c.speed).toBe(25)
  })
})

// ─── Turn order ────────────────────────────────────────────────────────────────

describe('Turn order', () => {
  const abilities = getDefaultPlayerCombatant().abilities

  it('faster player goes first', () => {
    const state = startBattle(
      makeCombatant({ speed: 20, abilities }),
      makeCombatant({ speed: 10, abilities: [SCRATCH_ABILITY] }),
    )
    expect(state.currentTurn).toBe('player')
  })

  it('faster enemy goes first', () => {
    const state = startBattle(
      makeCombatant({ speed: 5,  abilities }),
      makeCombatant({ speed: 15, abilities: [SCRATCH_ABILITY] }),
    )
    expect(state.currentTurn).toBe('enemy')
  })

  it('equal speed — player wins the tie', () => {
    const state = startBattle(
      makeCombatant({ speed: 10, abilities }),
      makeCombatant({ speed: 10, abilities: [SCRATCH_ABILITY] }),
    )
    expect(state.currentTurn).toBe('player')
  })

  it('turn queue shows the next 3 upcoming turns', () => {
    // Player faster → player first → queue: enemy, player, enemy
    const state = startBattle(
      makeCombatant({ speed: 20, abilities }),
      makeCombatant({ speed: 5,  abilities: [SCRATCH_ABILITY] }),
    )
    expect(state.turnQueue).toHaveLength(3)
    expect(state.turnQueue[0]).toBe('enemy')
    expect(state.turnQueue[1]).toBe('player')
    expect(state.turnQueue[2]).toBe('enemy')
  })
})

// ─── Cooldowns ────────────────────────────────────────────────────────────────

describe('Cooldowns', () => {
  // Enemy needs at least one usable ability so ENEMY_TAKE_TURN can advance the turn
  const enemy  = makeCombatant({ name: 'Enemy', hp: 500, maxHp: 500, abilities: [SCRATCH_ABILITY] })
  const player = getDefaultPlayerCombatant()

  it('ability enters cooldown immediately after use', () => {
    const s0 = startBattle(player, enemy)
    // heavy_blow has cooldown:2.
    // doAdvanceTurn runs at end of USE_ABILITY and decrements acting-side (player) cooldowns.
    // So the stored value after use is 2-1 = 1.
    const s1 = battleReducer(s0, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'heavy_blow', randoms: BASE_RANDOMS,
    })
    expect(s1.player.abilityCooldowns['heavy_blow']).toBe(1)
  })

  it('zero-cooldown ability does not appear in cooldowns map', () => {
    const s0 = startBattle(player, enemy)
    const s1 = battleReducer(s0, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(s1.player.abilityCooldowns['basic_strike']).toBeUndefined()
  })

  it('player cooldown decreases only when the player acts (not on enemy turn)', () => {
    const s0 = startBattle(player, enemy)
    // Player uses heavy_blow → cd stored as 1 (set to 2, then decremented in doAdvanceTurn)
    const s1 = battleReducer(s0, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'heavy_blow', randoms: BASE_RANDOMS,
    })
    expect(s1.player.abilityCooldowns['heavy_blow']).toBe(1)

    // Enemy takes a turn — doAdvanceTurn decrements ENEMY cooldowns, not player's
    const s2 = battleReducer(s1, { type: 'ENEMY_TAKE_TURN', randoms: BASE_RANDOMS })
    expect(s2.player.abilityCooldowns['heavy_blow']).toBe(1) // unchanged

    // Player acts again (basic_strike) → doAdvanceTurn decrements player cd → 1-1=0 → pruned
    const s3 = battleReducer(s2, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(s3.player.abilityCooldowns['heavy_blow']).toBeUndefined()
  })

  it('cooldown is pruned (never goes negative) when it reaches 0', () => {
    // Manually inject a cooldown of 1, then advance the player's turn
    const s0 = startBattle(player, enemy)
    const s1: BattleState = {
      ...s0,
      player: { ...s0.player, abilityCooldowns: { heavy_blow: 1 } },
    }
    const s2 = battleReducer(s1, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(s2.player.abilityCooldowns['heavy_blow']).toBeUndefined()
    // No entry should have a value <= 0
    expect(Object.values(s2.player.abilityCooldowns).every((v) => v > 0)).toBe(true)
  })

  it('ability cannot be used while cooldown > 0 — state is returned unchanged', () => {
    // Inject heavy_blow cooldown of 1 so it can't be used
    const s0 = startBattle(player, enemy)
    const s1: BattleState = {
      ...s0,
      player: { ...s0.player, abilityCooldowns: { heavy_blow: 1 } },
    }
    const s2 = battleReducer(s1, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'heavy_blow', randoms: BASE_RANDOMS,
    })
    // Reducer returns the exact same reference when validation fails
    expect(s2).toBe(s1)
  })
})

// ─── Status effects ────────────────────────────────────────────────────────────

describe('Status effects', () => {
  const abilities = getDefaultPlayerCombatant().abilities
  const enemy = makeCombatant({
    name: 'Dummy', hp: 500, maxHp: 500, defense: 0,
    abilities: [SCRATCH_ABILITY],
  })

  function playerWithStatus(
    type: 'poison' | 'burn' | 'regen' | 'stun' | 'shield',
    value: number,
    turnsRemaining: number,
    extra: Partial<Combatant> = {},
  ): BattleState {
    const p = makeCombatant({
      name: 'Hero', hp: 100, maxHp: 100, mp: 100, abilities,
      statusEffects: [{ type, value, turnsRemaining }],
      ...extra,
    })
    return startBattle(p, enemy)
  }

  it('poison deals damage at the start of the player turn', () => {
    const state = playerWithStatus('poison', 8, 3)
    const after = battleReducer(state, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(after.log.some((e) => e.message.includes('poison damage'))).toBe(true)
  })

  it('burn deals damage at the start of the player turn', () => {
    const state = playerWithStatus('burn', 10, 3)
    const after = battleReducer(state, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(after.log.some((e) => e.message.includes('burn damage'))).toBe(true)
  })

  it('regen heals at the start of the player turn', () => {
    const state = playerWithStatus('regen', 15, 4, { hp: 50 })
    const after = battleReducer(state, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(after.log.some((e) => e.message.includes('recovers'))).toBe(true)
  })

  it('shield reduces incoming damage', () => {
    const heavyEnemy = makeCombatant({
      name: 'Enemy', hp: 500, maxHp: 500, attack: 20,
      abilities: [{ id: 'big_hit', name: 'Big Hit', description: '', damage: 20, mpCost: 0, cooldown: 0 }],
    })

    // Player without shield
    const stateNo = startBattle(
      makeCombatant({ name: 'Hero', hp: 100, maxHp: 100, defense: 0, abilities }),
      heavyEnemy, 'enemy',
    )
    const afterNo = battleReducer(stateNo, { type: 'ENEMY_TAKE_TURN', randoms: BASE_RANDOMS })

    // Player with shield (value 12)
    const stateShield = startBattle(
      makeCombatant({
        name: 'Hero', hp: 100, maxHp: 100, defense: 0, abilities,
        statusEffects: [{ type: 'shield', value: 12, turnsRemaining: 2 }],
      }),
      heavyEnemy, 'enemy',
    )
    const afterShield = battleReducer(stateShield, { type: 'ENEMY_TAKE_TURN', randoms: BASE_RANDOMS })

    expect(afterShield.player.hp).toBeGreaterThan(afterNo.player.hp)
  })

  it('stun skips the player turn without executing the ability', () => {
    const state = playerWithStatus('stun', 0, 1)
    const after = battleReducer(state, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    // Turn advanced (stun calls doAdvanceTurn)
    expect(after.turnNumber).toBe(state.turnNumber + 1)
    // Enemy took no damage — ability was not executed
    expect(after.enemy.hp).toBe(state.enemy.hp)
    expect(after.log.some((e) => e.message.includes('stunned'))).toBe(true)
  })

  it('expired status effects are removed after they tick', () => {
    const state = playerWithStatus('poison', 8, 1)
    const after = battleReducer(state, {
      type: 'USE_ABILITY', side: 'player', abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    })
    expect(after.player.statusEffects.some((e) => e.type === 'poison')).toBe(false)
    expect(after.log.some((e) => e.message.includes('wore off'))).toBe(true)
  })
})

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

describe('Enemy AI', () => {
  const playerAbilities = getDefaultPlayerCombatant().abilities

  // Dark Knight abilities (indices 0-3) so effectRoll selects predictably
  const DK_ABILITIES = [
    { id: 'crushing_blow', name: 'Crushing Blow', description: '', damage: 28, mpCost: 10, cooldown: 3 },
    { id: 'shadow_slam',   name: 'Shadow Slam',   description: '', damage: 32, mpCost: 15, cooldown: 4 },
    { id: 'dark_regen',    name: 'Dark Regen',    description: '', damage: 0,  mpCost: 8,  cooldown: 4, effect: 'regen' as const },
    { id: 'stun_strike',   name: 'Stun Strike',   description: '', damage: 7,  mpCost: 10, cooldown: 4, effect: 'stun'  as const },
  ]

  function dkState(enemyHp: number, playerHp: number): BattleState {
    const p = makeCombatant({
      name: 'Hero', hp: playerHp, maxHp: 120, defense: 0, abilities: playerAbilities,
    })
    const e: Combatant = {
      name: 'Dark Knight', hp: enemyHp, maxHp: 160,
      mp: 80, maxMp: 80, attack: 22, defense: 16, speed: 11,
      abilities: DK_ABILITIES, statusEffects: [], abilityCooldowns: {},
    }
    return startBattle(p, e, 'enemy')
  }

  it('uses regen when enemy HP < 30% (regardless of effectRoll)', () => {
    // 47 / 160 = 0.294 < 0.3
    const state = dkState(47, 100)
    // Pass effectRoll that would otherwise choose shadow_slam (index 1)
    const after = battleReducer(state, {
      type: 'ENEMY_TAKE_TURN',
      randoms: { damageRoll: 0, effectRoll: 0.3, critRoll: 1 },
    })
    expect(after.log.some((e) => e.message.includes('Dark Regen'))).toBe(true)
  })

  it('uses highest-damage ability when player HP < 20%', () => {
    // 23 / 120 = 0.192 < 0.2; enemy HP is full so regen rule does not apply
    const state = dkState(160, 23)
    // Shadow Slam (32) beats Crushing Blow (28), so it should be chosen
    const after = battleReducer(state, {
      type: 'ENEMY_TAKE_TURN',
      randoms: { damageRoll: 0, effectRoll: 0.5, critRoll: 1 },
    })
    expect(after.log.some((e) => e.message.includes('Shadow Slam'))).toBe(true)
  })

  it('selects randomly via effectRoll when no priority rule applies', () => {
    const state = dkState(160, 100) // both HP normal — pure random path

    // effectRoll=0 → Math.floor(0 * 4) = 0 → DK_ABILITIES[0] = Crushing Blow
    const after0 = battleReducer(state, {
      type: 'ENEMY_TAKE_TURN',
      randoms: { damageRoll: 0, effectRoll: 0, critRoll: 1 },
    })
    expect(after0.log.some((e) => e.message.includes('Crushing Blow'))).toBe(true)

    // effectRoll=0.99 → Math.floor(0.99 * 4) = 3 → DK_ABILITIES[3] = Stun Strike
    const after3 = battleReducer(state, {
      type: 'ENEMY_TAKE_TURN',
      randoms: { damageRoll: 0, effectRoll: 0.99, critRoll: 1 },
    })
    expect(after3.log.some((e) => e.message.includes('Stun Strike'))).toBe(true)
  })

  it('random selection index is Math.floor(effectRoll * usable.length)', () => {
    const state = dkState(160, 100)

    // effectRoll=0.5 → Math.floor(0.5 * 4) = 2 → DK_ABILITIES[2] = Dark Regen
    const after = battleReducer(state, {
      type: 'ENEMY_TAKE_TURN',
      randoms: { damageRoll: 0, effectRoll: 0.5, critRoll: 1 },
    })
    expect(after.log.some((e) => e.message.includes('Dark Regen'))).toBe(true)
  })
})

// ─── Replay ────────────────────────────────────────────────────────────────────

describe('Replay', () => {
  const player = getDefaultPlayerCombatant()
  const enemy  = makeCombatant({
    name: 'Dummy', hp: 500, maxHp: 500, abilities: [SCRATCH_ABILITY],
  })

  it('recordReplayStep captures action, stateBefore, and stateAfter', () => {
    const s0     = startBattle(player, enemy)
    const replay = createReplay(s0)
    const action = {
      type: 'USE_ABILITY' as const, side: 'player' as const,
      abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    }
    const s1      = battleReducer(s0, action)
    const updated = recordReplayStep(replay, action, s0, s1)

    expect(updated.steps).toHaveLength(1)
    expect(updated.steps[0].action).toEqual(action)
    expect(updated.steps[0].stateBefore).toBe(s0)
    expect(updated.steps[0].stateAfter).toBe(s1)
  })

  it('recordReplayStep is pure — the original replay object is not mutated', () => {
    const s0     = startBattle(player, enemy)
    const replay = createReplay(s0)
    const action = {
      type: 'USE_ABILITY' as const, side: 'player' as const,
      abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    }
    const s1 = battleReducer(s0, action)
    recordReplayStep(replay, action, s0, s1) // discard return value

    expect(replay.steps).toHaveLength(0) // original unchanged
  })

  it('LOAD_REPLAY_STATE restores the provided state exactly', () => {
    const target = startBattle(player, enemy)
    const loaded = battleReducer(initialBattleState, {
      type: 'LOAD_REPLAY_STATE',
      state: target,
    })
    expect(loaded).toBe(target) // same reference
  })

  it('finalState always matches the last stateAfter added', () => {
    const s0     = startBattle(player, enemy)
    let   replay = createReplay(s0)
    const action = {
      type: 'USE_ABILITY' as const, side: 'player' as const,
      abilityId: 'basic_strike', randoms: BASE_RANDOMS,
    }
    const s1 = battleReducer(s0, action)
    replay   = recordReplayStep(replay, action, s0, s1)

    expect(replay.finalState).toBe(s1)
  })
})
