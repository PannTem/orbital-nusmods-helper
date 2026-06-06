import { useState, useEffect } from 'react'
import { getLeaderboard, createGroup, joinGroup, getGroup, leaveGroup } from '../../api.js'

const FACULTIES = ['', 'SOC', 'FOS', 'FOE', 'BIZ', 'LAW', 'MED', 'DEN', 'FASS', 'CDE', 'YST', 'SPH']

function fmtH(s) { return s ? `${(s / 3600).toFixed(1)}h` : '0.0h' }

export default function Leaderboard({ userId }) {
  const [faculty, setFaculty] = useState('')
  const [year,    setYear]    = useState('')
  const [course,  setCourse]  = useState('')
  const [board,   setBoard]   = useState([])
  const [groupCode,    setGroupCode]    = useState('')
  const [groupName,    setGroupName]    = useState('')
  const [myGroup,      setMyGroup]      = useState(null)
  const [inviteInput,  setInviteInput]  = useState('')
  const [msg, setMsg] = useState('')

  function loadBoard(f, y, c) {
    getLeaderboard(f || undefined, y ? parseInt(y) : undefined, c || undefined)
      .then(setBoard).catch(() => {})
  }

  useEffect(() => { loadBoard(faculty, year, course) }, [faculty, year, course])

  function handleCreateGroup() {
    if (!groupName.trim()) return
    createGroup(groupName, userId).then(data => {
      setMsg(`Group created! Invite code: ${data.invite_code}`)
      setGroupCode(data.invite_code)
      loadGroup(data.invite_code)
    }).catch(() => setMsg('Failed to create group'))
  }

  function handleJoinGroup() {
    if (!inviteInput.trim()) return
    joinGroup(inviteInput.trim().toUpperCase(), userId).then(() => {
      setGroupCode(inviteInput.trim().toUpperCase())
      loadGroup(inviteInput.trim().toUpperCase())
      setMsg('')
    }).catch(() => setMsg('Group not found'))
  }

  function loadGroup(code) {
    getGroup(code).then(setMyGroup).catch(() => {})
  }

  function handleLeaveGroup() {
    if (!window.confirm(`Leave "${myGroup.group_name}"?`)) return
    leaveGroup(myGroup.invite_code, userId)
      .then(() => { setMyGroup(null); setGroupCode(''); setMsg('') })
      .catch(() => setMsg('Failed to leave group'))
  }

  return (
    <div style={styles.wrapper}>
      {/* global leaderboard */}
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ ...styles.title, marginBottom: 10 }}>Weekly Leaderboard</h3>
          <div style={styles.filterRow}>
            <select value={faculty} onChange={e => setFaculty(e.target.value)} style={{ flex: 1 }}>
              {FACULTIES.map(f => <option key={f} value={f}>{f || 'All faculties'}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} style={{ flex: 1 }}>
              <option value="">All years</option>
              {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
            <input
              value={course}
              onChange={e => setCourse(e.target.value)}
              placeholder="Filter by course…"
              style={{ flex: 2 }}
            />
          </div>
        </div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.th}>
              <td style={{ width: 32 }}>#</td>
              <td>Name</td>
              <td>Faculty</td>
              <td style={{ textAlign: 'right' }}>Hours</td>
            </tr>
          </thead>
          <tbody>
            {board.length === 0 && (
              <tr><td colSpan={4} style={styles.empty}>No data yet — start studying!</td></tr>
            )}
            {board.map((u, i) => (
              <tr key={u.user_id} style={{ ...styles.row, background: u.user_id === userId ? '#f0f5ff' : 'transparent' }}>
                <td style={{ ...styles.rank, fontWeight: i < 3 ? 700 : 400 }}>
                  {i + 1}
                </td>
                <td>{u.display_name}{u.user_id === userId ? ' (you)' : ''}</td>
                <td style={{ color: '#94a3b8' }}>{u.faculty || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                  {fmtH(u.week_seconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* study groups */}
      <div className="card">
        <h3 style={styles.title}>Study Groups</h3>

        {!myGroup && (
          <div style={styles.groupActions}>
            <div style={styles.groupRow}>
              <input placeholder="Group name" value={groupName}
                onChange={e => setGroupName(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-primary" onClick={handleCreateGroup}>Create</button>
            </div>
            <div style={styles.groupRow}>
              <input placeholder="Invite code" value={inviteInput}
                onChange={e => setInviteInput(e.target.value.toUpperCase())} style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={handleJoinGroup}>Join</button>
            </div>
            {msg && <p style={styles.msg}>{msg}</p>}
          </div>
        )}

        {myGroup && (
          <div>
            <div style={styles.groupInfo}>
              <span style={styles.groupName}>{myGroup.group_name}</span>
              <span style={styles.invCode}>Code: <b>{myGroup.invite_code}</b></span>
              <button
                className="btn-ghost"
                onClick={handleLeaveGroup}
                style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px', color: '#ef4444', borderColor: '#fecaca' }}
              >
                Leave
              </button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.th}><td>#</td><td>Member</td><td style={{ textAlign: 'right' }}>Hours this week</td></tr>
              </thead>
              <tbody>
                {(myGroup.leaderboard || []).map((u, i) => (
                  <tr key={u.user_id} style={{ ...styles.row, background: u.user_id === userId ? '#f0f5ff' : 'transparent' }}>
                    <td style={styles.rank}>{i + 1}</td>
                    <td>{u.display_name}{u.user_id === userId ? ' (you)' : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{fmtH(u.week_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 16 },
  boardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filterRow: { display: 'flex', gap: 8, alignItems: 'center' },
  title: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--text)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { color: 'var(--text-subtle)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: 6 },
  row: { borderBottom: '1px solid var(--border-light)' },
  rank: { fontSize: 13, padding: '7px 0', color: 'var(--text-muted)' },
  empty: { textAlign: 'center', color: 'var(--text-subtle)', padding: 20, fontSize: 13 },
  groupActions: { display: 'flex', flexDirection: 'column', gap: 10 },
  groupRow: { display: 'flex', gap: 8 },
  msg: { color: 'var(--primary)', fontSize: 13 },
  groupInfo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  groupName: { fontWeight: 700, fontSize: 14 },
  invCode: { fontSize: 12, color: 'var(--text-muted)' },
}
