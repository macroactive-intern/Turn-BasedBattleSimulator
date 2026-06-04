import type { Combatant } from '@/types/battle'

export function calculatePhysicalDamage(
  attacker: Combatant,
  defender: Combatant,
  multiplier = 1
): number {
  const base = Math.max(1, attacker.attack * multiplier - defender.defense * 0.5)
  const variance = 0.9 + Math.random() * 0.2
  return Math.round(base * variance)
}

export function calculateMagicDamage(power: number, defender: Combatant): number {
  const base = Math.max(1, power - defender.defense * 0.25)
  const variance = 0.85 + Math.random() * 0.3
  return Math.round(base * variance)
}

export function calculateHeal(power: number): number {
  const variance = 0.9 + Math.random() * 0.2
  return Math.round(power * variance)
}

export function clampHp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value))
}

export function isDefeated(combatant: Combatant): boolean {
  return combatant.hp <= 0
}
