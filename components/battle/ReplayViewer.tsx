'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import type { BattleReplay } from '@/lib/battle/replayRecorder'
import type { BattleAction, BattleState } from '@/types/battle'

function describeAction(action: BattleAction): string {
  switch (action.type) {
    case 'START_BATTLE':    return `Battle started — ${action.player.name} vs ${action.enemy.name}`
    case 'USE_ABILITY':     return `Player used ${action.abilityId}`
    case 'ENEMY_TAKE_TURN': return 'Enemy took their turn'
    case 'ADVANCE_TURN':    return 'Turn advanced'
    case 'RESET_BATTLE':    return 'Battle reset'
    default:                return action.type
  }
}

function filenameToLabel(filename: string): string {
  const ts = parseInt(filename.replace('.json', ''), 10)
  return !isNaN(ts) && ts > 0 ? new Date(ts).toLocaleString() : filename
}

function ReplayHpRow({ label, state }: { label: string; state: BattleState }) {
  const player = state.player
  const enemy  = state.enemy
  const hpPct  = (c: typeof player) => Math.max(0, (c.hp / c.maxHp) * 100)
  return (
    <div className="replay-combatants">
      <div className="replay-stat">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{player.name}</div>
        <div className="replay-hp-track">
          <div className="replay-hp-fill" style={{ width: `${hpPct(player)}%` }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{player.hp}/{player.maxHp} HP</div>
      </div>
      <div className="replay-stat">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{enemy.name}</div>
        <div className="replay-hp-track">
          <div className="replay-hp-fill replay-hp-fill-enemy" style={{ width: `${hpPct(enemy)}%` }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{enemy.hp}/{enemy.maxHp} HP</div>
      </div>
      {label && <div style={{ fontSize: 11, color: 'var(--text-muted)', gridColumn: '1 / -1' }}>{label}</div>}
    </div>
  )
}

export function ReplayViewer() {
  const dispatch = useBattleStore((s) => s.dispatchBattleAction)

  const [filenames, setFilenames] = useState<string[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [replay, setReplay]       = useState<BattleReplay | null>(null)
  const [stepIndex, setStepIndex] = useState(-1) // -1 = show initial state
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    fetch('/api/replays')
      .then((r) => r.json())
      .then((d: { filenames?: string[] }) => setFilenames(d.filenames ?? []))
      .catch(() => {})
  }, [])

  async function selectReplay(filename: string) {
    if (filename === selected && replay) return
    setIsPlaying(false)
    setLoading(true)
    setSelected(filename)
    setStepIndex(-1)
    setReplay(null)
    try {
      const id  = filename.replace(/\.json$/, '')
      const res = await fetch(`/api/replays/${id}`)
      const data = await res.json() as BattleReplay
      setReplay(data)
      if (data.steps.length > 0) {
        dispatch({ type: 'LOAD_REPLAY_STATE', state: data.steps[0].stateBefore })
      }
    } finally {
      setLoading(false)
    }
  }

  const goTo = useCallback((idx: number) => {
    if (!replay) return
    const clamped = Math.max(-1, Math.min(idx, replay.steps.length - 1))
    setStepIndex(clamped)
    const state = clamped < 0
      ? replay.steps[0].stateBefore
      : replay.steps[clamped].stateAfter
    dispatch({ type: 'LOAD_REPLAY_STATE', state })
  }, [replay, dispatch])

  // Autoplay: advance one step every 900ms
  useEffect(() => {
    if (!isPlaying || !replay) return
    const id = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1
        if (next >= replay.steps.length) {
          setIsPlaying(false)
          return prev
        }
        dispatch({ type: 'LOAD_REPLAY_STATE', state: replay.steps[next].stateAfter })
        return next
      })
    }, 900)
    return () => clearInterval(id)
  }, [isPlaying, replay, dispatch])

  const totalSteps   = replay?.steps.length ?? 0
  const currentStep  = replay && stepIndex >= 0 ? replay.steps[stepIndex] : null
  const displayState = currentStep?.stateAfter ?? (replay?.steps[0]?.stateBefore ?? null)
  const atEnd        = stepIndex >= totalSteps - 1

  return (
    <div className="replay-viewer">
      <h2 className="replay-title">Replay Viewer</h2>

      {filenames.length === 0 ? (
        <p className="replay-empty">No replays saved yet. Finish a battle and save one.</p>
      ) : (
        <ul className="replay-list">
          {filenames.map((f) => (
            <li key={f}>
              <button
                className={`replay-item ${selected === f ? 'active' : ''}`}
                onClick={() => selectReplay(f)}
              >
                <span>{filenameToLabel(f)}</span>
                <span className="replay-result">
                  {loading && selected === f ? 'Loading…' : '▶ View'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {replay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* HP snapshot of current state */}
            {displayState && <ReplayHpRow label="" state={displayState} />}

            {/* Navigation controls */}
            <div className="replay-controls">
              <button
                className="btn btn-secondary"
                onClick={() => { setIsPlaying(false); goTo(stepIndex - 1) }}
                disabled={stepIndex < 0}
              >
                ← Prev
              </button>

              <button
                className="btn"
                onClick={() => {
                  if (atEnd) { goTo(-1); setIsPlaying(false) }
                  else setIsPlaying((p) => !p)
                }}
              >
                {atEnd ? '↺ Restart' : isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => { setIsPlaying(false); goTo(stepIndex + 1) }}
                disabled={atEnd}
              >
                Next →
              </button>

              <span className="replay-progress">
                {stepIndex < 0 ? 'Start' : `Step ${stepIndex + 1}`} / {totalSteps}
              </span>
            </div>

            {/* Action description for current step */}
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                className="replay-action"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1,  y: 0  }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {currentStep
                  ? describeAction(currentStep.action)
                  : 'Initial state — press Next or Play to step through'}
              </motion.p>
            </AnimatePresence>

            {/* Last few log entries from this state */}
            {displayState && displayState.log.length > 0 && (
              <div className="replay-log">
                {displayState.log.slice(-6).map((e) => (
                  <div key={e.id}>
                    <span className="log-turn">T{e.turnNumber}</span>
                    {e.message}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
