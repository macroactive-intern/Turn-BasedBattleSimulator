'use client'

import { motion } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { getAbility } from '@/lib/battle/abilities'
import { isDefeated } from '@/lib/battle/damage'

interface CombatantPanelProps {
  combatantId: string
}

export function CombatantPanel({ combatantId }: CombatantPanelProps) {
  const combatant = useBattleStore((s) => s.state.combatants.find((c) => c.id === combatantId))
  const phase = useBattleStore((s) => s.state.phase)
  const turnQueue = useBattleStore((s) => s.state.turnQueue)
  const currentTurnIndex = useBattleStore((s) => s.state.currentTurnIndex)
  const selectedAbilityId = useBattleStore((s) => s.selectedAbilityId)
  const selectAbility = useBattleStore((s) => s.selectAbility)
  const dispatch = useBattleStore((s) => s.dispatch)
  const actorId = useBattleStore((s) => s.state.turnQueue[s.state.currentTurnIndex])

  if (!combatant) return null

  const isActive = turnQueue[currentTurnIndex] === combatantId
  const defeated = isDefeated(combatant)

  const isTargetable = (() => {
    if (phase !== 'player-turn' || !selectedAbilityId) return false
    if (selectedAbilityId === '__attack__') return !combatant.isPlayer && !defeated
    const ability = getAbility(selectedAbilityId)
    if (!ability) return false
    if (ability.targetType === 'single-enemy') return !combatant.isPlayer && !defeated
    if (ability.targetType === 'single-ally') return combatant.isPlayer && !defeated
    if (ability.targetType === 'self') return combatant.id === actorId
    return false
  })()

  function handleClick() {
    if (!isTargetable || !combatant) return
    if (selectedAbilityId === '__attack__') {
      dispatch({ type: 'BASIC_ATTACK', actorId, targetId: combatant.id })
    } else if (selectedAbilityId) {
      dispatch({ type: 'USE_ABILITY', actorId, targetId: combatant.id, abilityId: selectedAbilityId })
    }
    selectAbility(null)
  }

  const hpPct = Math.max(0, (combatant.hp / combatant.maxHp) * 100)
  const mpPct = Math.max(0, (combatant.mp / combatant.maxMp) * 100)
  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444'

  return (
    <motion.div
      className={`combatant-panel ${isActive ? 'active' : ''} ${defeated ? 'defeated' : ''} ${isTargetable ? 'targetable' : ''}`}
      onClick={handleClick}
      animate={isActive ? { boxShadow: '0 0 0 2px #facc15' } : { boxShadow: '0 0 0 0px transparent' }}
      whileHover={isTargetable ? { scale: 1.03 } : {}}
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
        <span className="bar-value">{combatant.hp}/{combatant.maxHp}</span>
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
        <span className="bar-value">{combatant.mp}/{combatant.maxMp}</span>
      </div>

      {combatant.statusEffects.length > 0 && (
        <div className="status-effects">
          {combatant.statusEffects.map((e) => (
            <span key={e.id} className={`status-badge status-${e.id}`} title={`${e.name} (${e.duration}t)`}>
              {e.name[0].toUpperCase()}{e.duration}
            </span>
          ))}
        </div>
      )}

      {defeated && <div className="defeated-overlay">KO</div>}
    </motion.div>
  )
}
