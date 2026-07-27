import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserId } from '../App.jsx'
import { updateUser, syncAchievements, getAchievements } from '../api.js'

const FACULTIES = [
  'Computing', 'Engineering', 'Science', 'Arts & Social Sciences',
  'Business', 'Law', 'Medicine', 'Design & Engineering', 'Music',
]

export default function Profile() {
  const navigate = useNavigate()
  const userId = getUserId()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [displayName, setDisplayName] = useState(user.display_name || user.name || '')
  const [faculty, setFaculty]         = useState(user.faculty || '')
  const [year, setYear]               = useState(user.year_of_study || '')
  const [course, setCourse]           = useState(user.course || '')
  const [hoursPrivate, setHoursPrivate] = useState(user.hours_private || false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [achievements, setAchievements] = useState([])

  // On every profile visit: award any newly-earned achievements, then load them.
  useEffect(() => {
    if (!userId) return
    syncAchievements(userId)
      .catch(() => {})                     // sync failure shouldn't block display
      .then(() => getAchievements(userId))
      .then(d => setAchievements(d.achievements || []))
      .catch(() => {})
  }, [userId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateUser(userId, {
        display_name: displayName,
        faculty,
        year_of_study: year ? parseInt(year) : null,
        course,
        hours_private: hoursPrivate,
      })
      // Update localStorage with new display name
      const updated = { ...user, display_name: displayName, faculty, year_of_study: year, course, hours_private: hoursPrivate }
      localStorage.setItem('user', JSON.stringify(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>

        <div style={styles.avatarRow}>
          {user.picture && <img src={user.picture} alt="avatar" style={styles.avatar} />}
          <div>
            <div style={styles.name}>{user.name}</div>
            <div style={styles.email}>{user.email}</div>
          </div>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Faculty</label>
            <select value={faculty} onChange={e => setFaculty(e.target.value)}>
              <option value="">Select faculty</option>
              {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Year of Study</label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="">Select year</option>
              {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Course</label>
            <input
              value={course}
              onChange={e => setCourse(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>

          <label style={styles.toggleRow}>
            <input
              type="checkbox"
              checked={hoursPrivate}
              onChange={e => setHoursPrivate(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <span>
              <span style={styles.toggleLabel}>Keep my study hours private</span>
              <span style={styles.toggleHint}>Hides your weekly hours from leaderboards and friends.</span>
            </span>
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>

        {achievements.length > 0 && (
          <div style={styles.achievements}>
            <div style={styles.achTitle}>
              Achievements ({achievements.filter(a => a.earned).length}/{achievements.length})
            </div>
            <div style={styles.achGrid}>
              {achievements.map(a => (
                <div
                  key={a.id}
                  title={a.description}
                  style={{ ...styles.badge, ...(a.earned ? styles.badgeEarned : styles.badgeLocked) }}
                >
                  <div style={{ ...styles.badgeIcon, color: a.earned ? undefined : '#475569' }}>
                    {a.earned ? a.icon : '☆'}
                  </div>
                  <div style={styles.badgeName}>{a.name}</div>
                  <div style={styles.badgeDesc}>{a.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    maxWidth: 480,
    margin: '40px auto',
    padding: '0 20px',
  },
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  back: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'flex-start',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
  },
  name: {
    color: 'white',
    fontWeight: 600,
    fontSize: 18,
  },
  email: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
  },
  toggleLabel: {
    display: 'block',
    color: 'white',
    fontSize: 14,
    fontWeight: 500,
  },
  toggleHint: {
    display: 'block',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  achievements: {
    borderTop: '1px solid #334155',
    paddingTop: 20,
  },
  achTitle: {
    color: 'white',
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  achGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 10,
  },
  badge: {
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
  },
  badgeEarned: {
    background: '#0f2942',
    border: '1px solid #2563eb',
  },
  badgeLocked: {
    background: '#1a2332',
    border: '1px solid #334155',
    opacity: 0.55,
  },
  badgeIcon: {
    fontSize: 22,
    marginBottom: 4,
    lineHeight: 1,
  },
  badgeName: {
    color: 'white',
    fontWeight: 600,
    fontSize: 13,
  },
  badgeDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
}
