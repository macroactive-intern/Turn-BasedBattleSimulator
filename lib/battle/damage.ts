import type { Ability, Combatant } from '@/types/battle'

export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  ability: Ability
): number {
  // Abilities with no damage value are pure healing/status — skip the floor
  if (ability.damage === 0) return 0

  const base = ability.damage + attacker.attack
  let damage = base - defender.defense

  // Shield status effect absorbs a flat amount of the incoming damage
  const shield = defender.statusEffects.find((e) => e.type === 'shield')
  if (shield) {
    damage -= shield.value
  }

  return Math.max(1, damage)
}
