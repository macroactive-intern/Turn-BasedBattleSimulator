'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import {
  createCombatantFromCharacter,
  getDefaultPlayerCombatant,
  getEnemyRoster,
} from '@/lib/battle/abilities'
import type { Combatant } from '@/types/battle'
import rawCharacters from '@/data/characters.json'
import { CombatantPanel } from './CombatantPanel'
import { AbilityBar } from './AbilityBar'
import { TurnQueue } from './TurnQueue'
import { BattleLog } from './BattleLog'
import { ReplayViewer } from './ReplayViewer'

// Build player list from JSON at module load, fall back to default if empty
const jsonPlayers = (rawCharacters as Record<string, unknown>[]).filter(
  (c) => c['isPlayer'] !== false
)
const PLAYERS: Combatant[] =
  jsonPlayers.length > 0
    ? jsonPlayers.map(createCombatantFromCharacter)
    : [getDefaultPlayerCombatant()]

const ENEMIES: Combatant[] = getEnemyRoster()

export function BattleScreen() {
  const { battleState, startBattle, enemyTakeTurn, resetBattle, saveReplay } = useBattleStore()

  const [selectedPlayer, setSelectedPlayer] = useState<Combatant>(PLAYERS[0])
  const [selectedEnemy, setSelectedEnemy]   = useState<Combatant>(ENEMIES[0])
  const [showReplay, setShowReplay]         = useState(false)
  const [saveStatus, setSaveStatus]         = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (battleState.phase === 'active' && battleState.currentTurn === 'enemy') {
      const t = setTimeout(enemyTakeTurn, 800)
      return () => clearTimeout(t)
    }
  }, [battleState.phase, battleState.currentTurn])

  async function handleSaveReplay() {
    setSaveStatus('saving')
    try {
      await saveReplay()
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  function handleReset() {
    resetBattle()
    setShowReplay(false)
    setSaveStatus('idle')
  }

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (battleState.phase === 'setup') {
    return (
      <div className="setup-screen">
        <h1 className="setup-title">Turn-Based Battle</h1>

        <div className="setup-grid">
          <section className="setup-section">
            <h2 className="setup-section-title">Your Fighter</h2>
            <div className="character-grid">
              {PLAYERS.map((p, i) => (
                <motion.button
                  key={i}
                  className={`character-card ${selectedPlayer.name === p.name ? 'selected' : ''}`}
                  onClick={() => setSelectedPlayer(p)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="card-name">{p.name}</span>
                  <span className="card-hp">HP {p.maxHp} · MP {p.maxMp}</span>
                  <span className="card-stats">
                    ATK {p.attack} · DEF {p.defense} · SPD {p.speed}
                  </span>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">Your Enemy</h2>
            <div className="character-grid">
              {ENEMIES.map((e, i) => (
                <motion.button
                  key={i}
                  className={`character-card enemy-card ${selectedEnemy.name === e.name ? 'selected' : ''}`}
                  onClick={() => setSelectedEnemy(e)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="card-name">{e.name}</span>
                  <span className="card-hp">HP {e.maxHp} · MP {e.maxMp}</span>
                  <span className="card-stats">
                    ATK {e.attack} · DEF {e.defense} · SPD {e.speed}
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        </div>

        <motion.button
          className="btn start-btn"
          onClick={() => startBattle(selectedPlayer, selectedEnemy)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Start Battle
        </motion.button>
      </div>
    )
  }

  // ── Battle + ended screen ─────────────────────────────────────────────────
  return (
    <div className="battle-screen">
      <TurnQueue />

      <div className="combatants-grid">
        <CombatantPanel side="player" />
        <CombatantPanel side="enemy" />
      </div>

      {battleState.phase === 'active' && <AbilityBar />}

      <BattleLog />

      <AnimatePresence>
        {battleState.phase === 'ended' && (
          <motion.div
            className="battle-end-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="battle-end-card"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1,   y: 0  }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <h2 className={battleState.winner === 'player' ? 'victory-text' : 'defeat-text'}>
                {battleState.winner === 'player' ? 'Victory!' : 'Defeat...'}
              </h2>
              <p className="winner-label">
                {battleState.winner === 'player'
                  ? battleState.player.name
                  : battleState.enemy.name}{' '}
                wins
              </p>

              <div className="end-actions">
                <button
                  className="btn"
                  onClick={handleSaveReplay}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                >
                  {saveStatus === 'saving' ? 'Saving…'
                    : saveStatus === 'saved' ? 'Saved!'
                    : saveStatus === 'error' ? 'Retry Save'
                    : 'Save Replay'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowReplay((v) => !v)}>
                  {showReplay ? 'Hide Replay' : 'View Replay'}
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                  Play Again
                </button>
              </div>

              {showReplay && <ReplayViewer />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
