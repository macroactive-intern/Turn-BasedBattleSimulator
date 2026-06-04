'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { isDefeated } from '@/lib/battle/damage'

export function TurnQueue() {
  const turnQueue = useBattleStore((s) => s.state.turnQueue)
  const currentTurnIndex = useBattleStore((s) => s.state.currentTurnIndex)
  const combatants = useBattleStore((s) => s.state.combatants)
  const turnNumber = useBattleStore((s) => s.state.turnNumber)

  const orderedIds = [...turnQueue.slice(currentTurnIndex), ...turnQueue.slice(0, currentTurnIndex)]

  return (
    <div className="turn-queue">
      <span className="turn-number">Round {turnNumber}</span>
      <div className="turn-queue-list">
        <AnimatePresence mode="popLayout">
          {orderedIds.map((id, i) => {
            const c = combatants.find((x) => x.id === id)
            if (!c || isDefeated(c)) return null
            return (
              <motion.div
                key={id}
                layout
                className={`turn-token ${i === 0 ? 'current' : ''} ${c.isPlayer ? 'player' : 'enemy'}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                {c.name[0]}
                <span className="turn-token-name">{c.name}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
