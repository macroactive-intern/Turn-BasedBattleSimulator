import type { Combatant, StatusEffect, StatusEffectType } from '@/types/battle'

export function applyEffect(combatant: Combatant, effect: StatusEffect): Combatant {
  // Replace any existing effect of the same type, then append the new one
  const filtered = combatant.statusEffects.filter((e) => e.type !== effect.type)
  return { ...combatant, statusEffects: [...filtered, effect] }
}

export function tickEffects(combatant: Combatant): {
  combatant: Combatant
  logMessages: string[]
  skippedTurn: boolean
} {
  const logMessages: string[] = []
  let skippedTurn = false
  let hp = combatant.hp
  const remaining: StatusEffect[] = []

  for (const effect of combatant.statusEffects) {
    switch (effect.type) {
      case 'poison':
      case 'burn':
        hp = Math.max(0, hp - effect.value)
        logMessages.push(`${combatant.name} takes ${effect.value} ${effect.type} damage.`)
        break

      case 'regen': {
        const gained = Math.min(effect.value, combatant.maxHp - hp)
        hp = hp + gained
        logMessages.push(`${combatant.name} recovers ${gained} HP from regeneration.`)
        break
      }

      case 'stun':
        skippedTurn = true
        logMessages.push(`${combatant.name} is stunned and skips their turn.`)
        break

      case 'shield':
        // Passive — absorbed in calculateDamage; just tick the duration below
        break
    }

    const newRemaining = effect.turnsRemaining - 1
    if (newRemaining > 0) {
      remaining.push({ ...effect, turnsRemaining: newRemaining })
    } else {
      logMessages.push(`${combatant.name}'s ${effect.type} wore off.`)
    }
  }

  return {
    combatant: { ...combatant, hp, statusEffects: remaining },
    logMessages,
    skippedTurn,
  }
}

export function hasStatusEffect(combatant: Combatant, type: StatusEffectType): boolean {
  return combatant.statusEffects.some((e) => e.type === type)
}
