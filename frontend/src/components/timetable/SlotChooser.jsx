import { useState } from 'react'

function formatTime(t) {
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`
}

// Group raw slot array by classNo, returning first occurrence per class
function groupByClass(slots) {
  const map = {}
  for (const s of slots) {
    if (!map[s.classNo]) map[s.classNo] = s
  }
  return Object.values(map)
}

export default function SlotChooser({ moduleCode, lessonType, slots, selectedClassNo, color, onSelect }) {
  const [open, setOpen] = useState(false)
  const classes = groupByClass(slots)
  const current = classes.find(c => c.classNo === selectedClassNo) || classes[0]

  return (
    <div style={styles.container}>
      <div
        style={{ ...styles.header, borderLeft: `3px solid ${color}` }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={styles.lessonType}>{lessonType}</span>
        {current && (
          <span style={styles.current}>
            [{current.classNo}] {current.day.slice(0,3)} {formatTime(current.startTime)}–{formatTime(current.endTime)} · {current.venue}
          </span>
        )}
        <span style={styles.chevron}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={styles.dropdown}>
          {classes.map(c => (
            <div
              key={c.classNo}
              onClick={() => { onSelect(moduleCode, lessonType, c.classNo); setOpen(false) }}
              style={{
                ...styles.option,
                background: c.classNo === selectedClassNo ? '#eff6ff' : 'white',
                fontWeight: c.classNo === selectedClassNo ? 600 : 400,
              }}
            >
              <span style={styles.classNo}>[{c.classNo}]</span>
              <span>{c.day.slice(0,3)} {formatTime(c.startTime)}–{formatTime(c.endTime)}</span>
              <span style={styles.venue}>{c.venue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { marginBottom: 6 },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    background: 'var(--bg)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: 12,
    userSelect: 'none',
  },
  lessonType: { fontWeight: 600, color: 'var(--text)', minWidth: 80 },
  current: { color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chevron: { color: 'var(--text-subtle)', fontSize: 10 },
  dropdown: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    marginTop: 2,
  },
  option: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr auto',
    gap: 8,
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: 12,
    alignItems: 'center',
    borderBottom: '1px solid var(--border-light)',
    transition: 'background .1s',
  },
  classNo: { fontWeight: 600, color: 'var(--primary)' },
  venue: { color: 'var(--text-muted)' },
  size: { color: 'var(--text-subtle)', fontSize: 11 },
}
