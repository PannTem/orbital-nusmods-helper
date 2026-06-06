import { useState, useEffect } from 'react'
import { getUserId } from '../App.jsx'
import { updateUser, getSessionHistory } from '../api.js'
import TimerWidget from '../components/timer/TimerWidget.jsx'
import Leaderboard from '../components/timer/Leaderboard.jsx'

const FACULTIES = ['SOC', 'FOS', 'FOE', 'BIZ', 'LAW', 'MED', 'DEN', 'FASS', 'CDE', 'YST', 'SPH']

function fmt(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${secs}s`
}

function HistoryChart({ userId }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    getSessionHistory(userId, 7)
      .then(setData)
      .catch(() => setData([]))
  }, [userId])

  if (data === null) return null

  // Build full 7-day array with zeros for missing days
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const found = data.find(r => r.day === key)
    days.push({ key, secs: found ? found.seconds : 0, label: d.toLocaleDateString('en-SG', { weekday: 'short' }) })
  }

  const maxSecs = Math.max(...days.map(d => d.secs), 1)

  return (
    <div className="card">
      <h3 style={styles.cardTitle}>Last 7 Days</h3>
      <div style={hst.chart}>
        {days.map(d => (
          <div key={d.key} style={hst.col}>
            <span style={hst.time}>{d.secs > 0 ? fmt(d.secs) : ''}</span>
            <div style={hst.track}>
              <div style={{
                ...hst.bar,
                height: `${(d.secs / maxSecs) * 100}%`,
                background: d.secs > 0 ? 'var(--primary)' : 'var(--border)',
              }} />
            </div>
            <span style={hst.dayLabel}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const hst = {
  chart: { display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  time: { fontSize: 10, color: 'var(--text-muted)', height: 14, textAlign: 'center' },
  track: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', minHeight: 60 },
  bar: { width: '100%', borderRadius: '3px 3px 0 0', transition: 'height .3s', minHeight: 3 },
  dayLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 },
}

export default function Timer() {
  const userId = getUserId()
  const [name,    setName]    = useState(localStorage.getItem('displayName') || '')
  const [faculty, setFaculty] = useState(localStorage.getItem('faculty')     || '')
  const [year,    setYear]    = useState(localStorage.getItem('year')        || '')
  const [course,  setCourse]  = useState(localStorage.getItem('course')      || '')
  const [saved,   setSaved]   = useState(false)

  function saveProfile() {
    localStorage.setItem('displayName', name)
    localStorage.setItem('faculty', faculty)
    localStorage.setItem('year', year)
    localStorage.setItem('course', course)
    updateUser(userId, {
      display_name:  name   || 'Anonymous',
      faculty:       faculty || null,
      year_of_study: year   ? parseInt(year) : null,
      course:        course || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <h1 className="page-title">Study Timer</h1>

      <div style={styles.layout}>
        {/* left: timer + profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TimerWidget userId={userId} />
          <HistoryChart userId={userId} />

          {/* profile card */}
          <div className="card">
            <h3 style={styles.cardTitle}>Your Profile</h3>
            <p style={styles.sub}>Shown anonymously on the leaderboard</p>
            <div style={styles.formGrid}>
              <label style={styles.label}>Display name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Anonymous" />

              <label style={styles.label}>Faculty</label>
              <select value={faculty} onChange={e => setFaculty(e.target.value)}>
                <option value="">— Select —</option>
                {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              <label style={styles.label}>Year of study</label>
              <select value={year} onChange={e => setYear(e.target.value)}>
                <option value="">— Select —</option>
                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>

              <label style={styles.label}>Course</label>
              <input value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <button className="btn-primary" onClick={saveProfile} style={{ marginTop: 16, width: '100%' }}>
              {saved ? '✓ Saved' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* right: leaderboard */}
        <div>
          <Leaderboard userId={userId} />
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: 24,
    alignItems: 'start',
  },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 12px', alignItems: 'center' },
  label: { fontWeight: 500, color: '#374151', fontSize: 13 },
}
