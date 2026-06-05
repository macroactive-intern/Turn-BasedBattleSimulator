'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import type { CombatantSide } from '@/types/battle'

export function TurnQueue() {
  const currentTurn = useBattleStore((s) => s.battleState.currentTurn)
  const turnQueue   = useBattleStore((s) => s.battleState.turnQueue)
  const player      = useBattleStore((s) => s.battleState.player)
  const enemy       = useBattleStore((s) => s.battleState.enemy)
  const turnNumber  = useBattleStore((s) => s.battleState.turnNumber)

  const nameOf = (side: CombatantSide) =>
    side === 'player' ? player.name : enemy.name

  // Current turn is always #1; show up to 3 total
  const upcoming: CombatantSide[] = [currentTurn, ...turnQueue].slice(0, 3)

  return (
    <div className="turn-queue">
      <span className="turn-number">Round {turnNumber}</span>
      <span className="turn-queue-divider" />
      <span className="turn-queue-label">Next turns:</span>
      <ol className="turn-queue-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {upcoming.map((side, i) => (
            <motion.li
              key={`${side}-${turnNumber}-${i}`}
              layout
              className={`turn-token ${side} ${i === 0 ? 'current' : ''}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1,  x: 0   }}
              exit={{ opacity: 0,    x: 16   }}
              transition={{ duration: 0.2 }}
            >
              <span className="turn-token-index">{i + 1}.</span>
              <span className="turn-token-name">{nameOf(side)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  )
}
