import type { Ability, Combatant } from '@/types/battle'

// ─── Player abilities ────────────────────────────────────────────────────────

export const BASIC_STRIKE: Ability = {
  id: 'basic_strike',
  name: 'Basic Strike',
  description: 'A quick, reliable attack.',
  damage: 10,
  mpCost: 0,
  cooldown: 0,
}

export const HEAVY_BLOW: Ability = {
  id: 'heavy_blow',
  name: 'Heavy Blow',
  description: 'A slow but devastating strike.',
  damage: 22,
  mpCost: 8,
  cooldown: 2,
}

export const POISON_SLASH: Ability = {
  id: 'poison_slash',
  name: 'Poison Slash',
  description: 'A blade coated in venom. Deals damage and poisons the target.',
  damage: 8,
  mpCost: 10,
  cooldown: 3,
  effect: 'poison',
}

export const GUARD: Ability = {
  id: 'guard',
  name: 'Guard',
  description: 'Raise your defense, absorbing incoming damage for several turns.',
  damage: 0,
  mpCost: 6,
  cooldown: 3,
  effect: 'shield',
}

export const PLAYER_ABILITIES: Ability[] = [
  BASIC_STRIKE,
  HEAVY_BLOW,
  POISON_SLASH,
  GUARD,
]

// ─── Enemy abilities ─────────────────────────────────────────────────────────

const SCRATCH: Ability = {
  id: 'scratch',
  name: 'Scratch',
  description: 'A frantic claw attack.',
  damage: 8,
  mpCost: 0,
  cooldown: 0,
}

const CRUSHING_BLOW: Ability = {
  id: 'crushing_blow',
  name: 'Crushing Blow',
  description: 'A heavy, bone-rattling strike.',
  damage: 28,
  mpCost: 10,
  cooldown: 3,
}

const VENOM_BITE: Ability = {
  id: 'venom_bite',
  name: 'Venom Bite',
  description: 'Injects a paralysing venom that poisons the target.',
  damage: 5,
  mpCost: 8,
  cooldown: 3,
  effect: 'poison',
}

const EMBER: Ability = {
  id: 'ember',
  name: 'Ember',
  description: 'A scorching burst that leaves the target burning.',
  damage: 9,
  mpCost: 8,
  cooldown: 3,
  effect: 'burn',
}

const STUN_STRIKE: Ability = {
  id: 'stun_strike',
  name: 'Stun Strike',
  description: 'A concussive blow that stuns the target for one turn.',
  damage: 7,
  mpCost: 10,
  cooldown: 4,
  effect: 'stun',
}

const DARK_REGEN: Ability = {
  id: 'dark_regen',
  name: 'Dark Regen',
  description: 'Channels dark energy to regenerate HP over several turns.',
  damage: 0,
  mpCost: 8,
  cooldown: 4,
  effect: 'regen',
}

const SHADOW_SLAM: Ability = {
  id: 'shadow_slam',
  name: 'Shadow Slam',
  description: 'A fearsome shadow-infused smash.',
  damage: 32,
  mpCost: 15,
  cooldown: 4,
}

// ─── Enemy roster ─────────────────────────────────────────────────────────────

function makeEnemy(
  name: string,
  hp: number,
  mp: number,
  attack: number,
  defense: number,
  speed: number,
  abilities: Ability[]
): Combatant {
  return {
    name,
    hp,
    maxHp: hp,
    mp,
    maxMp: mp,
    attack,
    defense,
    speed,
    abilities,
    statusEffects: [],
    abilityCooldowns: {},
  }
}

const ENEMY_ROSTER: Combatant[] = [
  makeEnemy('Goblin Raider',  65,  30, 12,  4, 20, [SCRATCH, VENOM_BITE]),
  makeEnemy('Stone Brute',   220,  20, 30, 22,  5, [SCRATCH, CRUSHING_BLOW]),
  makeEnemy('Venom Spider',   80,  60, 10,  8, 15, [SCRATCH, VENOM_BITE]),
  makeEnemy('Fire Imp',       70,  65, 14,  6, 17, [SCRATCH, EMBER]),
  makeEnemy('Dark Knight',   160,  80, 22, 16, 11, [CRUSHING_BLOW, SHADOW_SLAM, DARK_REGEN, STUN_STRIKE]),
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDefaultPlayerCombatant(): Combatant {
  return {
    name: 'Hero',
    hp: 120,
    maxHp: 120,
    mp: 60,
    maxMp: 60,
    attack: 15,
    defense: 10,
    speed: 12,
    abilities: PLAYER_ABILITIES,
    statusEffects: [],
    abilityCooldowns: {},
  }
}

export function getEnemyRoster(): Combatant[] {
  // Return fresh copies so callers can mutate freely
  return ENEMY_ROSTER.map((e) => ({
    ...e,
    statusEffects: [],
    abilityCooldowns: {},
  }))
}

// Accepts loose JSON from characters.json — handles both naming conventions
// (attack/strength, speed/dexterity) and falls back to safe defaults.
export function createCombatantFromCharacter(
  character: Record<string, unknown>
): Combatant {
  const num = (keys: string[], fallback: number): number => {
    for (const key of keys) {
      const v = character[key]
      if (typeof v === 'number' && isFinite(v)) return v
    }
    return fallback
  }

  const str = (keys: string[], fallback: string): string => {
    for (const key of keys) {
      const v = character[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return fallback
  }

  const hp = num(['hp', 'maxHp'], 100)
  const mp = num(['mp', 'maxMp'], 50)

  return {
    name:    str(['name'], 'Unknown'),
    hp:      num(['hp'], hp),
    maxHp:   num(['maxHp', 'hp'], hp),
    mp:      num(['mp'], mp),
    maxMp:   num(['maxMp', 'mp'], mp),
    attack:  num(['attack', 'strength'], 10),
    defense: num(['defense'], 5),
    speed:   num(['speed', 'dexterity'], 8),
    abilities: PLAYER_ABILITIES,
    statusEffects: [],
    abilityCooldowns: {},
  }
}
