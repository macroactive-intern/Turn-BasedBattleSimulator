'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import type { CombatantSide, StatusEffectType } from '@/types/battle'

interface CombatantPanelProps {
  side: CombatantSide
}

const STATUS_ICONS: Record<StatusEffectType, string> = {
  poison:  '☠',
  burn:    '🔥',
  stun:    '⚡',
  regen:   '💚',
  shield:  '🛡',
}

const STATUS_LABELS: Record<StatusEffectType, string> = {
  poison: 'Poison',
  burn:   'Burn',
  stun:   'Stun',
  regen:  'Regen',
  shield: 'Shield',
}

export function CombatantPanel({ side }: CombatantPanelProps) {
  const combatant   = useBattleStore((s) => s.battleState[side])
  const currentTurn = useBattleStore((s) => s.battleState.currentTurn)
  const phase       = useBattleStore((s) => s.battleState.phase)

  const isActive   = currentTurn === side && phase === 'active'
  const isDefeated = combatant.hp <= 0

  const hpPct   = Math.max(0, (combatant.hp / combatant.maxHp) * 100)
  const mpPct   = Math.max(0, (combatant.mp / combatant.maxMp) * 100)
  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444'

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
      {/* Name + active indicator */}
      <div className="combatant-header">
        <span className="combatant-name">{combatant.name}</span>
        <AnimatePresence>
          {isActive && (
            <motion.span
              className="turn-indicator"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              ▶
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* HP bar */}
      <div className="bar-row">
        <span className="bar-label">HP</span>
        <div className="bar-track">
          <motion.div
            className="bar-fill"
            style={{ background: hpColor }}
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
        <span className="bar-value">{combatant.hp}/{combatant.maxHp}</span>
      </div>

      {/* MP bar */}
      <div className="bar-row">
        <span className="bar-label">MP</span>
        <div className="bar-track">
          <motion.div
            className="bar-fill mp-fill"
            animate={{ width: `${mpPct}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
        <span className="bar-value">{combatant.mp}/{combatant.maxMp}</span>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <span className="stat-chip" title="Attack">
          ⚔ {combatant.attack}
        </span>
        <span className="stat-chip" title="Defense">
          🛡 {combatant.defense}
        </span>
        <span className="stat-chip" title="Speed">
          ⚡ {combatant.speed}
        </span>
      </div>

      {/* Status effect icons */}
      {combatant.statusEffects.length > 0 && (
        <div className="status-effects">
          <AnimatePresence>
            {combatant.statusEffects.map((e) => (
              <motion.span
                key={e.type}
                className={`status-badge status-${e.type}`}
                title={`${STATUS_LABELS[e.type]} — ${e.turnsRemaining} turn${e.turnsRemaining !== 1 ? 's' : ''} left (${e.value} per turn)`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2 }}
              >
                {STATUS_ICONS[e.type]}
                <span className="status-turns">{e.turnsRemaining}</span>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      {isDefeated && <div className="defeated-overlay">KO</div>}
    </motion.div>
  )
}
