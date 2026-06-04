'use client'

import { useReducer, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { battleReducer, initialBattleState } from '@/lib/battle/reducer'
import { useBattleStore } from '@/store/battleStore'
import type { Combatant } from '@/types/battle'
import { CombatantPanel } from './CombatantPanel'
import { AbilityBar } from './AbilityBar'
import { TurnQueue } from './TurnQueue'
import { BattleLog } from './BattleLog'

interface BattleScreenProps {
  initialCombatants: Combatant[]
}

export function BattleScreen({ initialCombatants }: BattleScreenProps) {
  const [state, dispatch] = useReducer(battleReducer, initialBattleState)
  const sync = useBattleStore((s) => s.sync)
  const selectAbility = useBattleStore((s) => s.selectAbility)

  useEffect(() => {
    sync(state, dispatch)
  }, [state, dispatch, sync])

  useEffect(() => {
    dispatch({ type: 'START_BATTLE', combatants: initialCombatants })
  }, [])

  // Enemy AI: auto-attack a random player
  useEffect(() => {
    if (state.phase !== 'enemy-turn') return
    const actorId = state.turnQueue[state.currentTurnIndex]
    const actor = state.combatants.find((c) => c.id === actorId)
    if (!actor) return

    const timer = setTimeout(() => {
      const targets = state.combatants.filter((c) => c.isPlayer && c.hp > 0)
      if (targets.length === 0) return
      const target = targets[Math.floor(Math.random() * targets.length)]
      dispatch({ type: 'BASIC_ATTACK', actorId: actor.id, targetId: target.id })
      setTimeout(() => dispatch({ type: 'NEXT_TURN' }), 600)
    }, 900)

    return () => clearTimeout(timer)
  }, [state.phase, state.currentTurnIndex])

  // Auto-advance after animation frame
  useEffect(() => {
    if (state.phase !== 'animating') return
    const timer = setTimeout(() => {
      dispatch({ type: 'NEXT_TURN' })
      selectAbility(null)
    }, 700)
    return () => clearTimeout(timer)
  }, [state.phase])

  const handleSaveReplay = useCallback(async () => {
    if (!state.replay) return
    try {
      await fetch('/api/replays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.replay),
      })
      alert('Replay saved!')
    } catch {
      alert('Failed to save replay.')
    }
  }, [state.replay])

  const players = state.combatants.filter((c) => c.isPlayer)
  const enemies = state.combatants.filter((c) => !c.isPlayer)

  return (
    <div className="battle-screen">
      <TurnQueue />

      <div className="combatants-grid">
        <div className="side player-side">
          <h3 className="side-label">Party</h3>
          {players.map((c) => (
            <CombatantPanel key={c.id} combatantId={c.id} />
          ))}
        </div>
        <div className="side enemy-side">
          <h3 className="side-label">Enemies</h3>
          {enemies.map((c) => (
            <CombatantPanel key={c.id} combatantId={c.id} />
          ))}
        </div>
      </div>

      <AbilityBar />
      <BattleLog />

      <AnimatePresence>
        {(state.phase === 'victory' || state.phase === 'defeat') && (
          <motion.div
            className={`battle-end ${state.phase}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <h2>{state.phase === 'victory' ? '⚔️ Victory!' : '💀 Defeat...'}</h2>
            <div className="end-actions">
              <button className="btn" onClick={handleSaveReplay}>
                Save Replay
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => dispatch({ type: 'RESET' })}
              >
                Restart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
