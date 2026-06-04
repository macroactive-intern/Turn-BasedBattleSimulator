import type { Ability } from '@/types/battle'

export const ABILITIES: Record<string, Ability> = {
  slash: {
    id: 'slash',
    name: 'Slash',
    description: 'A powerful physical strike dealing 1.5× attack damage.',
    mpCost: 0,
    targetType: 'single-enemy',
    effects: [{ type: 'damage', formula: 'physical', baseValue: 1.5 }],
    animationType: 'slash',
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Hurls a ball of fire at an enemy, dealing magic damage and burning.',
    mpCost: 15,
    targetType: 'single-enemy',
    effects: [
      { type: 'damage', formula: 'magic', baseValue: 40 },
      { type: 'status', statusEffect: 'burn', statusDuration: 3, statusMagnitude: 1 },
    ],
    animationType: 'magic',
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    description: 'Freezing winds strike all enemies.',
    mpCost: 25,
    targetType: 'all-enemies',
    effects: [{ type: 'damage', formula: 'magic', baseValue: 25 }],
    animationType: 'magic',
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    description: 'Restores HP to an ally.',
    mpCost: 12,
    targetType: 'single-ally',
    effects: [{ type: 'heal', baseValue: 50 }],
    animationType: 'heal',
  },
  regen: {
    id: 'regen',
    name: 'Regenerate',
    description: 'Applies a regeneration effect for 4 turns.',
    mpCost: 10,
    targetType: 'single-ally',
    effects: [
      { type: 'status', statusEffect: 'regen', statusDuration: 4, statusMagnitude: 1 },
    ],
    animationType: 'heal',
  },
  poison_dart: {
    id: 'poison_dart',
    name: 'Poison Dart',
    description: 'Deals minor damage and poisons the target for 3 turns.',
    mpCost: 8,
    targetType: 'single-enemy',
    effects: [
      { type: 'damage', formula: 'physical', baseValue: 0.5 },
      { type: 'status', statusEffect: 'poison', statusDuration: 3, statusMagnitude: 1 },
    ],
    animationType: 'status',
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    description: 'Surrounds self with a protective shield for 2 turns.',
    mpCost: 10,
    targetType: 'self',
    effects: [
      { type: 'status', statusEffect: 'shield', statusDuration: 2, statusMagnitude: 1 },
    ],
    animationType: 'heal',
  },
  mp_drain: {
    id: 'mp_drain',
    name: 'MP Drain',
    description: 'Drains 20 MP from target and restores own MP.',
    mpCost: 5,
    targetType: 'single-enemy',
    effects: [{ type: 'mp-restore', baseValue: -20 }],
    animationType: 'magic',
  },
}

export function getAbility(id: string): Ability | undefined {
  return ABILITIES[id]
}

export function getAbilitiesForIds(ids: string[]): Ability[] {
  return ids.map((id) => ABILITIES[id]).filter(Boolean)
}
