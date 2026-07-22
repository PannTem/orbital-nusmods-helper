import { useState, useEffect, useRef } from 'react'
import { getUserId } from '../App.jsx'
import {
  searchUsers, sendFriendRequest, acceptFriendRequest,
  removeFriend, getFriends,
} from '../api.js'

function formatStudy(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m this week`
  if (m > 0) return `${m}m this week`
  return 'No study time this week'
}

function Avatar({ src, name }) {
  if (src) return <img src={src} alt="" style={styles.avatar} />
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return <div style={{ ...styles.avatar, ...styles.avatarFallback }}>{initial}</div>
}

export default function Friends() {
  const userId = getUserId()
  const [data, setData]         = useState({ friends: [], incoming: [], outgoing: [] })
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef()

  function reload() {
    getFriends(userId).then(setData).catch(() => {})
  }
  useEffect(reload, [])

  // Debounced user search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try { setResults(await searchUsers(query.trim(), userId)) }
      catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const friendIds   = new Set(data.friends.map(f => f.user_id))
  const outgoingIds = new Set(data.outgoing.map(f => f.user_id))
  const incomingIds = new Set(data.incoming.map(f => f.user_id))

  async function handleAdd(id)    { await sendFriendRequest(userId, id); reload() }
  async function handleAccept(id) { await acceptFriendRequest(userId, id); reload() }
  async function handleRemove(id) { await removeFriend(userId, id); reload() }

  function searchButton(u) {
    if (friendIds.has(u.user_id))
      return <span style={styles.pill}>Friends</span>
    if (outgoingIds.has(u.user_id))
      return <button className="btn-ghost" onClick={() => handleRemove(u.user_id)}>Cancel</button>
    if (incomingIds.has(u.user_id))
      return <button className="btn-primary" onClick={() => handleAccept(u.user_id)}>Accept</button>
    return <button className="btn-primary" onClick={() => handleAdd(u.user_id)}>Add</button>
  }

  return (
    <div className="page">
      <h1 className="page-title">Friends</h1>

      {/*Find people*/}
      <div className="card" style={styles.section}>
        <label className="label">Find people</label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or email"
        />
        {query.trim() && (
          <div style={styles.list}>
            {searching && <div style={styles.muted}>Searching…</div>}
            {!searching && results.length === 0 && <div style={styles.muted}>No users found.</div>}
            {results.map(u => (
              <div key={u.user_id} style={styles.row}>
                <Avatar src={u.picture} name={u.display_name} />
                <div style={styles.rowInfo}>
                  <div style={styles.name}>{u.display_name}</div>
                  <div style={styles.sub}>
                    {[u.faculty, u.year_of_study && `Year ${u.year_of_study}`].filter(Boolean).join(' · ') || u.email}
                  </div>
                </div>
                {searchButton(u)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {data.incoming.length > 0 && (
        <div className="card" style={styles.section}>
          <label className="label">Friend requests</label>
          <div style={styles.list}>
            {data.incoming.map(u => (
              <div key={u.user_id} style={styles.row}>
                <Avatar src={u.picture} name={u.display_name} />
                <div style={styles.rowInfo}>
                  <div style={styles.name}>{u.display_name}</div>
                  <div style={styles.sub}>
                    {[u.faculty, u.year_of_study && `Year ${u.year_of_study}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={styles.actions}>
                  <button className="btn-primary" onClick={() => handleAccept(u.user_id)}>Accept</button>
                  <button className="btn-ghost" onClick={() => handleRemove(u.user_id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent requests */}
      {data.outgoing.length > 0 && (
        <div className="card" style={styles.section}>
          <label className="label">Sent requests</label>
          <div style={styles.list}>
            {data.outgoing.map(u => (
              <div key={u.user_id} style={styles.row}>
                <Avatar src={u.picture} name={u.display_name} />
                <div style={styles.rowInfo}>
                  <div style={styles.name}>{u.display_name}</div>
                  <div style={styles.sub}>Pending</div>
                </div>
                <button className="btn-ghost" onClick={() => handleRemove(u.user_id)}>Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="card" style={styles.section}>
        <label className="label">My friends ({data.friends.length})</label>
        {data.friends.length === 0 ? (
          <div style={styles.muted}>No friends yet. Search above to add some.</div>
        ) : (
          <div style={styles.list}>
            {data.friends.map(u => (
              <div key={u.user_id} style={styles.row}>
                <Avatar src={u.picture} name={u.display_name} />
                <div style={styles.rowInfo}>
                  <div style={styles.name}>{u.display_name}</div>
                  <div style={styles.sub}>{formatStudy(u.week_seconds)}</div>
                </div>
                <button className="btn-ghost" onClick={() => handleRemove(u.user_id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  section: { marginBottom: 16, maxWidth: 620 },
  list: { display: 'flex', flexDirection: 'column', marginTop: 10 },
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0', borderTop: '1px solid var(--border)',
  },
  rowInfo: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, fontSize: 14, color: 'var(--text)' },
  sub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  actions: { display: 'flex', gap: 6 },
  avatar: { width: 38, height: 38, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' },
  avatarFallback: {
    display: 'grid', placeItems: 'center', background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15,
  },
  pill: {
    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
    padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6,
  },
  muted: { fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' },
}
