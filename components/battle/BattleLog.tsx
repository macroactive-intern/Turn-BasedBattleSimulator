'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import type { BattleLogEntry } from '@/types/battle'

function entryColor(type: BattleLogEntry['type']): string {
  if (type === 'effect') return '#f59e0b'
  if (type === 'system') return '#94a3b8'
  return '#e2e8f0'
}

export function BattleLog() {
  const log = useBattleStore((s) => s.state.log)
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
              style={{ color: entryColor(entry.type) }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="log-turn">T{entry.turn}</span>
              {entry.message}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
