'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'

export function AbilityBar() {
  const phase       = useBattleStore((s) => s.battleState.phase)
  const currentTurn = useBattleStore((s) => s.battleState.currentTurn)
  const player      = useBattleStore((s) => s.battleState.player)
  const useAbility  = useBattleStore((s) => s.useAbility)

  const isPlayerTurn = phase === 'active' && currentTurn === 'player'

  return (
    <div className="ability-bar">
      <div className="ability-bar-label">
        {isPlayerTurn
          ? `${player.name}'s turn — choose an ability`
          : phase === 'ended'
          ? 'Battle over'
          : 'Waiting for enemy…'}
      </div>

      <div className="ability-list">
        {player.abilities.map((ability) => {
          const cooldown       = player.abilityCooldowns[ability.id] ?? 0
          const onCooldown     = cooldown > 0
          const insufficientMp = player.mp < ability.mpCost
          const disabled       = !isPlayerTurn || onCooldown || insufficientMp

          return (
            <button
              key={ability.id}
              className={`ability-btn ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && useAbility(ability.id)}
              disabled={disabled}
            >
              {/* Cooldown overlay */}
              <AnimatePresence>
                {onCooldown && (
                  <motion.div
                    className="ability-cd-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="ability-cd-count">{cooldown}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="ability-name">{ability.name}</span>

              <div className="ability-meta">
                {ability.damage > 0 && (
                  <span className="ability-damage">⚔ {ability.damage}</span>
                )}
                <span className={`ability-mp ${insufficientMp ? 'ability-mp-low' : ''}`}>
                  {ability.mpCost > 0 ? `${ability.mpCost} MP` : 'Free'}
                </span>
              </div>

              <span className="ability-desc">{ability.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
