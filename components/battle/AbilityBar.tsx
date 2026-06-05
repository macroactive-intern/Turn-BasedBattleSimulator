'use client'

import { motion } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'

export function AbilityBar() {
  const phase       = useBattleStore((s) => s.battleState.phase)
  const currentTurn = useBattleStore((s) => s.battleState.currentTurn)
  const player      = useBattleStore((s) => s.battleState.player)
  const useAbility  = useBattleStore((s) => s.useAbility)

  if (phase !== 'active' || currentTurn !== 'player') return null

  return (
    <motion.div
      className="ability-bar"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
    >
      <div className="ability-bar-label">
        {player.name}&apos;s turn — choose an ability
      </div>
      <div className="ability-list">
        {player.abilities.map((ability) => {
          const cooldown = player.abilityCooldowns[ability.id] ?? 0
          const canUse   = cooldown === 0 && player.mp >= ability.mpCost
          return (
            <button
              key={ability.id}
              className={`ability-btn ${!canUse ? 'disabled' : ''}`}
              onClick={() => canUse && useAbility(ability.id)}
              disabled={!canUse}
              title={ability.description}
            >
              <span className="ability-name">{ability.name}</span>
              <span className="ability-cost">
                {cooldown > 0
                  ? `CD ${cooldown}`
                  : ability.mpCost > 0
                  ? `${ability.mpCost} MP`
                  : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
