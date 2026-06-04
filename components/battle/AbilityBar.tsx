'use client'

import { motion } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { getAbilitiesForIds } from '@/lib/battle/abilities'
import { isDefeated } from '@/lib/battle/damage'

export function AbilityBar() {
  const phase = useBattleStore((s) => s.state.phase)
  const turnQueue = useBattleStore((s) => s.state.turnQueue)
  const currentTurnIndex = useBattleStore((s) => s.state.currentTurnIndex)
  const combatants = useBattleStore((s) => s.state.combatants)
  const selectedAbilityId = useBattleStore((s) => s.selectedAbilityId)
  const selectAbility = useBattleStore((s) => s.selectAbility)
  const dispatch = useBattleStore((s) => s.dispatch)

  const actorId = turnQueue[currentTurnIndex]
  const actor = combatants.find((c) => c.id === actorId)

  if (phase !== 'player-turn' || !actor || isDefeated(actor)) return null

  const abilities = getAbilitiesForIds(actor.abilities)

  function handleSelect(id: string) {
    const ability = abilities.find((a) => a.id === id)
    if (!ability) return

    if (ability.targetType === 'all-enemies' || ability.targetType === 'all-allies') {
      const targets = ability.targetType === 'all-enemies'
        ? combatants.filter((c) => !c.isPlayer && !isDefeated(c)).map((c) => c.id)
        : combatants.filter((c) => c.isPlayer && !isDefeated(c)).map((c) => c.id)

      if (targets.length === 0) return
      dispatch({ type: 'USE_ABILITY', actorId, targetId: targets[0], abilityId: id })
      selectAbility(null)
      return
    }

    if (ability.targetType === 'self') {
      dispatch({ type: 'USE_ABILITY', actorId, targetId: actorId, abilityId: id })
      selectAbility(null)
      return
    }

    selectAbility(selectedAbilityId === id ? null : id)
  }

  return (
    <motion.div
      className="ability-bar"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
    >
      <div className="ability-bar-label">{actor.name}&apos;s turn — choose an action</div>
      <div className="ability-list">
        <button
          className={`ability-btn attack ${selectedAbilityId === '__attack__' ? 'selected' : ''}`}
          onClick={() => selectAbility(selectedAbilityId === '__attack__' ? null : '__attack__')}
        >
          <span className="ability-name">⚔ Attack</span>
          <span className="ability-cost">—</span>
        </button>

        {abilities.map((ability) => {
          const canUse = actor.mp >= ability.mpCost
          const isSelected = selectedAbilityId === ability.id
          return (
            <button
              key={ability.id}
              className={`ability-btn ${isSelected ? 'selected' : ''} ${!canUse ? 'disabled' : ''}`}
              onClick={() => canUse && handleSelect(ability.id)}
              disabled={!canUse}
              title={ability.description}
            >
              <span className="ability-name">{ability.name}</span>
              <span className="ability-cost">{ability.mpCost > 0 ? `${ability.mpCost} MP` : '—'}</span>
            </button>
          )
        })}
      </div>
      {selectedAbilityId && (
        <p className="targeting-hint">
          {selectedAbilityId === '__attack__'
            ? 'Click an enemy to attack.'
            : `Click a target to use ${abilities.find((a) => a.id === selectedAbilityId)?.name}.`}
        </p>
      )}
    </motion.div>
  )
}
