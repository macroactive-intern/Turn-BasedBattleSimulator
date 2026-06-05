'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'

export function BattleLog() {
  const log       = useBattleStore((s) => s.battleState.log)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length])

  return (
    <div className="battle-log">
      <h4 className="log-header">Battle Log</h4>
      <div className="log-entries">
        <AnimatePresence initial={false}>
          {log.map((entry) => (
            <motion.div
              key={entry.id}
              className="log-entry"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0   }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span className="log-turn">T{entry.turnNumber}</span>
              {entry.message}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
