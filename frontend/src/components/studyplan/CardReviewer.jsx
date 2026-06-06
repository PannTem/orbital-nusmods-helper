import { useState } from 'react'
import { reviewCard } from '../../api.js'

const QUALITY_LABELS = [
  { q: 0, label: 'Blackout',     color: '#ef4444', desc: 'Complete blank' },
  { q: 1, label: 'Wrong',        color: '#f97316', desc: 'Wrong, but familiar' },
  { q: 2, label: 'Almost',       color: '#f59e0b', desc: 'Wrong, easy in hindsight' },
  { q: 3, label: 'Hard',         color: '#eab308', desc: 'Correct but difficult' },
  { q: 4, label: 'Good',         color: '#22c55e', desc: 'Correct with hesitation' },
  { q: 5, label: 'Perfect',      color: '#10b981', desc: 'Effortless' },
]

export default function CardReviewer({ cards, onReviewed }) {
  const [idx, setIdx]         = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]       = useState(false)

  if (cards.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>No cards due today</p>
        <p style={styles.emptySub}>Come back tomorrow for your next review session.</p>
      </div>
    )
  }

  if (done || idx >= cards.length) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>Session complete</p>
        <p style={styles.emptySub}>Reviewed {cards.length} card{cards.length > 1 ? 's' : ''}.</p>
        <button className="btn-ghost" onClick={onReviewed} style={{ marginTop: 12 }}>
          Back to schedule
        </button>
      </div>
    )
  }

  const card = cards[idx]

  async function handleRate(quality) {
    setSubmitting(true)
    await reviewCard(card.id, quality)
    setSubmitting(false)
    setRevealed(false)
    if (idx + 1 >= cards.length) setDone(true)
    else setIdx(i => i + 1)
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.progress}>
        Card {idx + 1} of {cards.length}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(idx / cards.length) * 100}%` }} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.meta}>
          <span style={styles.moduleTag}>{card.module_code}</span>
          <span style={styles.examDate}>Exam: {card.exam_date}</span>
          <span style={styles.reps}>Rep #{card.repetitions}</span>
        </div>

        <div style={styles.topic}>{card.topic}</div>

        {!revealed ? (
          <button
            className="btn-ghost"
            style={styles.revealBtn}
            onClick={() => setRevealed(true)}
          >
            Tap to reveal / mark reviewed
          </button>
        ) : (
          <div style={styles.ratingSection}>
            <p style={styles.ratingLabel}>How well did you recall it?</p>
            <div style={styles.ratingGrid}>
              {QUALITY_LABELS.map(({ q, label, color, desc }) => (
                <button
                  key={q}
                  disabled={submitting}
                  onClick={() => handleRate(q)}
                  style={{ ...styles.ratingBtn, background: color + '14' }}
                  title={desc}
                >
                  <span style={{ ...styles.ratingNum, color }}>{q}</span>
                  <span style={styles.ratingLbl}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 16 },
  progress: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#64748b' },
  progressBar: { flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#2563eb', borderRadius: 3, transition: 'width .3s' },
  card: {
    background: 'white',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    minHeight: 260,
  },
  meta: { display: 'flex', gap: 10, alignItems: 'center', alignSelf: 'stretch' },
  moduleTag: { background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  examDate: { color: 'var(--text-muted)', fontSize: 12 },
  reps: { color: 'var(--text-subtle)', fontSize: 12, marginLeft: 'auto' },
  topic: { fontSize: 24, fontWeight: 700, textAlign: 'center', color: 'var(--text)', lineHeight: 1.35 },
  revealBtn: { padding: '10px 28px', fontSize: 14 },
  ratingSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' },
  ratingLabel: { color: 'var(--text-muted)', fontSize: 13 },
  ratingGrid: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  ratingBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '9px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    minWidth: 56,
  },
  ratingNum: { fontSize: 18, fontWeight: 700 },
  ratingLbl: { fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 8 },
  emptyText: { fontWeight: 600, fontSize: 16, color: 'var(--text)' },
  emptySub: { color: 'var(--text-muted)', fontSize: 13 },
}
