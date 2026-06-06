import { useState, useEffect, useRef } from 'react'
import { startSession, stopSession, getTimerStats } from '../../api.js'

function fmt(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function fmtH(secs) {
  const h = (secs / 3600).toFixed(1)
  return `${h}h`
}

export default function TimerWidget({ userId }) {
  const [running, setRunning]     = useState(false)
  const [elapsed, setElapsed]     = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [stats, setStats]         = useState({ today_seconds: 0, week_seconds: 0 })
  const interval = useRef(null)

  function loadStats() {
    getTimerStats(userId).then(setStats).catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  function startTimer() {
    startSession(userId).then(data => {
      setSessionId(data.session_id)
      setStartedAt(data.start_time)
      setRunning(true)
      setElapsed(0)
      interval.current = setInterval(() => setElapsed(e => e + 1), 1000)
    })
  }

  function stopTimer() {
    clearInterval(interval.current)
    setRunning(false)
    const endTime = new Date().toISOString()
    stopSession(sessionId, endTime).then(() => loadStats())
  }

  useEffect(() => () => clearInterval(interval.current), [])

  return (
    <div style={styles.widget}>
      <div style={styles.display}>{fmt(elapsed)}</div>

      <div style={styles.controls}>
        {!running ? (
          <button className="btn-primary" style={styles.bigBtn} onClick={startTimer}>
            Start
          </button>
        ) : (
          <button className="btn-danger" style={styles.bigBtn} onClick={stopTimer}>
            Stop
          </button>
        )}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Today</div>
          <div style={styles.statValue}>{fmtH(stats.today_seconds)}</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>This week</div>
          <div style={styles.statValue}>{fmtH(stats.week_seconds)}</div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  widget: {
    background: 'white',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  display: {
    fontSize: 64,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text)',
    letterSpacing: -2,
  },
  controls: {},
  bigBtn: { padding: '10px 36px', fontSize: 15 },
  statsRow: { display: 'flex', gap: 32, borderTop: '1px solid var(--border)', paddingTop: 16, width: '100%', justifyContent: 'center' },
  statBox: { textAlign: 'center' },
  statLabel: { fontSize: 11, color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 2 },
}
