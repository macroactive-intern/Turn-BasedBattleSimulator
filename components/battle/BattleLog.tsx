'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'

type LogCategory =
  | 'start' | 'damage' | 'crit' | 'poison' | 'burn'
  | 'regen'  | 'stun'   | 'shield' | 'effect' | 'wore-off'
  | 'ai'     | 'defeat' | 'default'

function classify(message: string): LogCategory {
  const m = message.toLowerCase()
  if (m.includes('battle begins'))           return 'start'
  if (m.includes('critical hit'))            return 'crit'
  if (m.includes('poison damage'))           return 'poison'
  if (m.includes('burn damage'))             return 'burn'
  if (m.includes('recovers') && m.includes('hp')) return 'regen'
  if (m.includes('stunned') || m.includes('skips their turn')) return 'stun'
  if (m.includes('shield absorbs'))          return 'shield'
  if (m.includes('affected by'))             return 'effect'
  if (m.includes('wore off'))                return 'wore-off'
  if (m.includes('wounded') || m.includes('senses victory') || m.includes('no usable')) return 'ai'
  if (m.includes('defeated') || m.includes('overcome')) return 'defeat'
  if (m.includes('damage'))                  return 'damage'
  return 'default'
}

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
              className={`log-entry log-${classify(entry.message)}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1,  x: 0   }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
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
