import type { Combatant, StatusEffect, StatusEffectId, BattleLogEntry } from '@/types/battle'

export function tickStatusEffects(
  combatant: Combatant,
  turnNumber: number
): { updated: Combatant; logEntries: Omit<BattleLogEntry, 'id'>[] } {
  const logEntries: Omit<BattleLogEntry, 'id'>[] = []
  let { hp, mp } = combatant
  const remaining: StatusEffect[] = []

  for (const effect of combatant.statusEffects) {
    switch (effect.id) {
      case 'poison': {
        const dmg = Math.round(combatant.maxHp * 0.05 * effect.magnitude)
        hp = Math.max(0, hp - dmg)
        logEntries.push({
          turn: turnNumber,
          actorId: combatant.id,
          actorName: combatant.name,
          message: `${combatant.name} takes ${dmg} poison damage.`,
          type: 'effect',
        })
        break
      }
      case 'burn': {
        const dmg = Math.round(combatant.maxHp * 0.08 * effect.magnitude)
        hp = Math.max(0, hp - dmg)
        logEntries.push({
          turn: turnNumber,
          actorId: combatant.id,
          actorName: combatant.name,
          message: `${combatant.name} takes ${dmg} burn damage.`,
          type: 'effect',
        })
        break
      }
      case 'regen': {
        const amt = Math.round(combatant.maxHp * 0.06 * effect.magnitude)
        hp = Math.min(combatant.maxHp, hp + amt)
        logEntries.push({
          turn: turnNumber,
          actorId: combatant.id,
          actorName: combatant.name,
          message: `${combatant.name} recovers ${amt} HP from regeneration.`,
          type: 'effect',
        })
        break
      }
    }

    const newDuration = effect.duration - 1
    if (newDuration > 0) {
      remaining.push({ ...effect, duration: newDuration })
    } else {
      logEntries.push({
        turn: turnNumber,
        actorId: combatant.id,
        actorName: combatant.name,
        message: `${combatant.name}'s ${effect.name} wore off.`,
        type: 'system',
      })
    }
  }

  return {
    updated: { ...combatant, hp, mp, statusEffects: remaining },
    logEntries,
  }
}

export function hasStatus(combatant: Combatant, effectId: StatusEffectId): boolean {
  return combatant.statusEffects.some((e) => e.id === effectId)
}

export function applyStatus(combatant: Combatant, effect: StatusEffect): Combatant {
  const idx = combatant.statusEffects.findIndex((e) => e.id === effect.id)
  if (idx >= 0) {
    const next = [...combatant.statusEffects]
    next[idx] = { ...effect, duration: Math.max(next[idx].duration, effect.duration) }
    return { ...combatant, statusEffects: next }
  }
  return { ...combatant, statusEffects: [...combatant.statusEffects, effect] }
}
