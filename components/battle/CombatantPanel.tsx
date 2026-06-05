'use client'

import { motion } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import type { CombatantSide } from '@/types/battle'

interface CombatantPanelProps {
  side: CombatantSide
}

export function CombatantPanel({ side }: CombatantPanelProps) {
  const combatant    = useBattleStore((s) => s.battleState[side])
  const currentTurn  = useBattleStore((s) => s.battleState.currentTurn)
  const phase        = useBattleStore((s) => s.battleState.phase)

  const isActive  = currentTurn === side && phase === 'active'
  const isDefeated = combatant.hp <= 0

  const hpPct = Math.max(0, (combatant.hp / combatant.maxHp) * 100)
  const mpPct = Math.max(0, (combatant.mp / combatant.maxMp) * 100)
  const hpColor =
    hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444'

  return (
    <motion.div
      className={`combatant-panel ${isActive ? 'active' : ''} ${isDefeated ? 'defeated' : ''} ${side}`}
      animate={
        isActive
          ? { boxShadow: '0 0 0 2px #facc15' }
          : { boxShadow: '0 0 0 0px transparent' }
      }
      transition={{ duration: 0.2 }}
    >
      <div className="combatant-header">
        <span className="combatant-name">{combatant.name}</span>
        {isActive && <span className="turn-indicator">▶</span>}
      </div>

      <div className="bar-row">
        <span className="bar-label">HP</span>
        <div className="bar-track">
          <motion.div
            className="bar-fill"
            style={{ background: hpColor }}
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="bar-value">
          {combatant.hp}/{combatant.maxHp}
        </span>
      </div>

      <div className="bar-row">
        <span className="bar-label">MP</span>
        <div className="bar-track">
          <motion.div
            className="bar-fill mp-fill"
            animate={{ width: `${mpPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="bar-value">
          {combatant.mp}/{combatant.maxMp}
        </span>
      </div>

      {combatant.statusEffects.length > 0 && (
        <div className="status-effects">
          {combatant.statusEffects.map((e) => (
            <span
              key={e.type}
              className={`status-badge status-${e.type}`}
              title={`${e.type} — ${e.turnsRemaining} turn${e.turnsRemaining !== 1 ? 's' : ''} left`}
            >
              {e.type[0].toUpperCase()}{e.turnsRemaining}
            </span>
          ))}
        </div>
      )}

      {isDefeated && <div className="defeated-overlay">KO</div>}
    </motion.div>
  )
}
