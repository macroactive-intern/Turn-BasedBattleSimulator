'use client'

import { useEffect, useReducer, useState } from 'react'
import { motion } from 'framer-motion'
import { battleReducer, initialBattleState } from '@/lib/battle/reducer'
import type { BattleReplay } from '@/types/battle'

export function ReplayViewer() {
  const [replays, setReplays] = useState<BattleReplay[]>([])
  const [selected, setSelected] = useState<BattleReplay | null>(null)
  const [state, dispatch] = useReducer(battleReducer, initialBattleState)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    fetch('/api/replays')
      .then((r) => r.json())
      .then(setReplays)
      .catch(() => {})
  }, [])

  function loadReplay(replay: BattleReplay) {
    setSelected(replay)
    setPlaying(false)
    dispatch({ type: 'LOAD_REPLAY', replay })
  }

  function step() {
    dispatch({ type: 'REPLAY_STEP' })
  }

  useEffect(() => {
    if (!playing || !selected) return
    if (state.replayStep >= selected.actions.length) {
      setPlaying(false)
      return
    }
    const delay = selected.actions[state.replayStep]?.timestamp ?? 500
    const timer = setTimeout(step, Math.min(delay, 1200))
    return () => clearTimeout(timer)
  }, [playing, state.replayStep, selected])

  const players = state.combatants.filter((c) => c.isPlayer)
  const enemies = state.combatants.filter((c) => !c.isPlayer)
  const totalSteps = selected?.actions.length ?? 0

  return (
    <div className="replay-viewer">
      <h2 className="replay-title">Replay Viewer</h2>

      {replays.length === 0 ? (
        <p className="replay-empty">No replays saved yet. Complete a battle and save it.</p>
      ) : (
        <ul className="replay-list">
          {replays.map((r) => (
            <li key={r.id}>
              <button
                className={`replay-item ${selected?.id === r.id ? 'active' : ''}`}
                onClick={() => loadReplay(r)}
              >
                <span>{new Date(r.date).toLocaleString()}</span>
                <span className={`replay-result ${r.result}`}>{r.result}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="replay-playback">
          <div className="replay-combatants">
            <div className="replay-side">
              {players.map((c) => (
                <div key={c.id} className="replay-stat">
                  <strong>{c.name}</strong> — {c.hp}/{c.maxHp} HP
                </div>
              ))}
            </div>
            <div className="replay-side">
              {enemies.map((c) => (
                <div key={c.id} className="replay-stat">
                  <strong>{c.name}</strong> — {c.hp}/{c.maxHp} HP
                </div>
              ))}
            </div>
          </div>

          <div className="replay-controls">
            <button className="btn" onClick={step} disabled={state.replayStep >= totalSteps}>
              Step
            </button>
            <button
              className="btn"
              onClick={() => setPlaying((p) => !p)}
              disabled={state.replayStep >= totalSteps}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <span className="replay-progress">
              {state.replayStep} / {totalSteps}
            </span>
          </div>

          <div className="replay-log">
            {state.log.slice(-10).map((entry) => (
              <motion.div
                key={entry.id}
                className="log-entry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {entry.message}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
