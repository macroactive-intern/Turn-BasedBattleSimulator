'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import type { CombatantSide } from '@/types/battle'

export function TurnQueue() {
  const currentTurn = useBattleStore((s) => s.battleState.currentTurn)
  const turnQueue   = useBattleStore((s) => s.battleState.turnQueue)
  const turnNumber  = useBattleStore((s) => s.battleState.turnNumber)
  const player      = useBattleStore((s) => s.battleState.player)
  const enemy       = useBattleStore((s) => s.battleState.enemy)

  const nameOf = (side: CombatantSide) =>
    side === 'player' ? player.name : enemy.name

  const upcoming: CombatantSide[] = [currentTurn, ...turnQueue]

  return (
    <div className="turn-queue">
      <span className="turn-number">Round {turnNumber}</span>
      <div className="turn-queue-list">
        <AnimatePresence mode="popLayout">
          {upcoming.map((side, i) => (
            <motion.div
              key={`${side}-${i}`}
              layout
              className={`turn-token ${i === 0 ? 'current' : ''} ${side}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1,  x: 0   }}
              exit={{ opacity: 0,    x: 20   }}
              transition={{ duration: 0.2 }}
            >
              {nameOf(side)[0]}
              <span className="turn-token-name">{nameOf(side)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
