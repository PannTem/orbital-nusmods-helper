import { useState } from 'react'
import { getCourseInfo, searchModules } from '../api.js'

const WORKLOAD_LABELS = ['Lecture', 'Tutorial', 'Lab', 'Project', 'Prep']

// ── Module search + fetch panel ───────────────────────────────────────────────

function ModuleSelector({ label, data, loading, error, onSelect }) {
  const [query, setQuery] = useState('')
  const [sugg,  setSugg]  = useState([])

  async function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    if (q.length >= 2) {
      try { setSugg((await searchModules(q)).slice(0, 6)) }
      catch { setSugg([]) }
    } else {
      setSugg([])
    }
  }

  function pick(code) {
    setQuery(code)
    setSugg([])
    onSelect(code)
  }

  function handleBlur() { setTimeout(() => setSugg([]), 150) }

  return (
    <div style={s.selectorWrap}>
      <p style={s.selectorLabel}>{label}</p>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. CS2040S"
          style={s.input}
        />
        {sugg.length > 0 && (
          <div style={s.dropdown}>
            {sugg.map(m => (
              <div key={m.moduleCode} style={s.dropItem} onMouseDown={() => pick(m.moduleCode)}>
                <span style={s.dropCode}>{m.moduleCode}</span>
                <span style={s.dropTitle}>{m.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {loading && <p style={s.muted}>Analyzing…</p>}
      {error   && <p style={s.errTxt}>{error}</p>}
      {data && (
        <div style={s.modHeader}>
          <span style={s.modCode}>{data.module}</span>
          <span style={s.modTitle}>{data.title}</span>
          <span style={s.modMc}>{data.module_credits} MCs · {data.department}</span>
        </div>
      )}
    </div>
  )
}

// ── Single stat row used in comparison table ──────────────────────────────────

function Stat({ label, a, b }) {
  return (
    <div style={s.statRow}>
      <div style={s.statA}>{a ?? <span style={s.na}>N/A</span>}</div>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statB}>{b ?? <span style={s.na}>N/A</span>}</div>
    </div>
  )
}

function colorFor(score, maxGood) {
  if (score == null) return 'var(--text-muted)'
  return score <= maxGood * 0.4 ? '#16a34a' : score <= maxGood * 0.7 ? '#d97706' : '#dc2626'
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Compare() {
  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loadA, setLoadA] = useState(false)
  const [loadB, setLoadB] = useState(false)
  const [errA,  setErrA]  = useState('')
  const [errB,  setErrB]  = useState('')

  async function fetchA(code) {
    setLoadA(true); setErrA(''); setDataA(null)
    try { setDataA(await getCourseInfo(code.toUpperCase().trim())) }
    catch { setErrA('Not found or no data.') }
    finally { setLoadA(false) }
  }

  async function fetchB(code) {
    setLoadB(true); setErrB(''); setDataB(null)
    try { setDataB(await getCourseInfo(code.toUpperCase().trim())) }
    catch { setErrB('Not found or no data.') }
    finally { setLoadB(false) }
  }

  const showTable = dataA || dataB

  function diffCell(valA, valB, lowerIsBetter = false) {
    if (valA == null || valB == null) return null
    const diff = valA - valB
    if (Math.abs(diff) < 0.01) return null
    const better = lowerIsBetter ? diff < 0 : diff > 0
    return (
      <span style={{ fontSize: 11, color: better ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
        {better ? ' ▲' : ' ▼'}{Math.abs(diff).toFixed(2)}
      </span>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Compare Modules</h1>
      <p style={s.sub}>
        Pick two modules to compare difficulty, recommendation, GPA data, and workload side-by-side.
        Modules are analysed on first search and cached; subsequent comparisons are instant.
      </p>

      <div style={s.selectorRow}>
        <ModuleSelector label="Module A" data={dataA} loading={loadA} error={errA} onSelect={fetchA} />
        <div style={s.vs}>vs</div>
        <ModuleSelector label="Module B" data={dataB} loading={loadB} error={errB} onSelect={fetchB} />
      </div>

      {showTable && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={s.tableHeader}>
            <div style={s.colA}>{dataA ? <span style={s.headCode}>{dataA.module}</span> : '—'}</div>
            <div style={s.colLabel} />
            <div style={s.colB}>{dataB ? <span style={s.headCode}>{dataB.module}</span> : '—'}</div>
          </div>

          {/* Difficulty */}
          <div style={s.statRow}>
            <div style={s.statA}>
              {dataA?.difficulty_score != null
                ? <><span style={{ fontWeight: 700, color: colorFor(dataA.difficulty_score, 5) }}>{dataA.difficulty_score.toFixed(1)}</span>{diffCell(dataA.difficulty_score, dataB?.difficulty_score, true)}</>
                : <span style={s.na}>N/A</span>}
            </div>
            <div style={s.statLabel}>Difficulty (1–5)</div>
            <div style={s.statB}>
              {dataB?.difficulty_score != null
                ? <><span style={{ fontWeight: 700, color: colorFor(dataB.difficulty_score, 5) }}>{dataB.difficulty_score.toFixed(1)}</span>{diffCell(dataB.difficulty_score, dataA?.difficulty_score, true)}</>
                : <span style={s.na}>N/A</span>}
            </div>
          </div>

          {/* Recommendation */}
          <div style={s.statRow}>
            <div style={s.statA}>
              {dataA?.recommend_score != null
                ? <><span style={{ fontWeight: 700, color: (dataA.recommend_score * 100) >= 70 ? '#16a34a' : '#d97706' }}>{(dataA.recommend_score * 100).toFixed(0)}%</span>{diffCell(dataA.recommend_score, dataB?.recommend_score)}</>
                : <span style={s.na}>N/A</span>}
            </div>
            <div style={s.statLabel}>Recommendation</div>
            <div style={s.statB}>
              {dataB?.recommend_score != null
                ? <><span style={{ fontWeight: 700, color: (dataB.recommend_score * 100) >= 70 ? '#16a34a' : '#d97706' }}>{(dataB.recommend_score * 100).toFixed(0)}%</span>{diffCell(dataB.recommend_score, dataA?.recommend_score)}</>
                : <span style={s.na}>N/A</span>}
            </div>
          </div>

          <Stat
            label="Expected GPA"
            a={dataA?.expected_gpa != null && <span style={{ fontWeight: 700 }}>{dataA.expected_gpa.toFixed(2)}</span>}
            b={dataB?.expected_gpa != null && <span style={{ fontWeight: 700 }}>{dataB.expected_gpa.toFixed(2)}</span>}
          />
          <Stat
            label="Actual GPA"
            a={dataA?.actual_gpa != null && <span style={{ fontWeight: 700 }}>{dataA.actual_gpa.toFixed(2)}</span>}
            b={dataB?.actual_gpa != null && <span style={{ fontWeight: 700 }}>{dataB.actual_gpa.toFixed(2)}</span>}
          />
          <Stat
            label="Reviews"
            a={dataA?.comment_count != null && `${dataA.comment_count}`}
            b={dataB?.comment_count != null && `${dataB.comment_count}`}
          />
          <Stat
            label="Credits (MCs)"
            a={dataA?.module_credits}
            b={dataB?.module_credits}
          />

          {/* Workload breakdown */}
          <div style={s.sectionLabel}>Weekly Workload (hrs)</div>
          {WORKLOAD_LABELS.map((lbl, i) => (
            <Stat
              key={lbl}
              label={lbl}
              a={dataA?.workload?.[i] != null ? dataA.workload[i] : null}
              b={dataB?.workload?.[i] != null ? dataB.workload[i] : null}
            />
          ))}
          <Stat
            label="Total hrs/wk"
            a={dataA?.workload ? dataA.workload.reduce((a, b) => a + (b || 0), 0).toFixed(0) : null}
            b={dataB?.workload ? dataB.workload.reduce((a, b) => a + (b || 0), 0).toFixed(0) : null}
          />

          {/* Prerequisites */}
          {(dataA?.prerequisite || dataB?.prerequisite) && (
            <>
              <div style={s.sectionLabel}>Prerequisite</div>
              <div style={s.statRow}>
                <div style={{ ...s.statA, fontSize: 12, color: 'var(--text-muted)' }}>{dataA?.prerequisite || '—'}</div>
                <div style={s.statLabel} />
                <div style={{ ...s.statB, fontSize: 12, color: 'var(--text-muted)' }}>{dataB?.prerequisite || '—'}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  sub: { color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, maxWidth: 600, lineHeight: 1.6 },
  selectorRow: {
    display: 'grid', gridTemplateColumns: '1fr 40px 1fr',
    gap: 12, alignItems: 'start',
  },
  selectorWrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  selectorLabel: { fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { padding: '9px 12px', fontSize: 14, borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', width: '100%' },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: 'white', border: '1px solid var(--border)', borderTop: 'none',
    borderRadius: '0 0 6px 6px', zIndex: 50,
  },
  dropItem: { padding: '9px 12px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' },
  dropCode: { fontWeight: 700, color: 'var(--primary)', fontSize: 13, minWidth: 75, flexShrink: 0 },
  dropTitle: { fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  errTxt: { color: '#dc2626', fontSize: 13 },
  modHeader: { display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 },
  modCode: { fontWeight: 700, fontSize: 14, color: 'var(--primary)' },
  modTitle: { fontWeight: 600, fontSize: 13, color: 'var(--text)' },
  modMc: { fontSize: 12, color: 'var(--text-muted)' },
  vs: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 34, fontWeight: 700, color: 'var(--text-muted)', fontSize: 14 },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '1fr 140px 1fr',
    paddingBottom: 12, marginBottom: 4,
    borderBottom: '2px solid var(--border)',
  },
  colA: { textAlign: 'right', paddingRight: 16 },
  colLabel: {},
  colB: { textAlign: 'left', paddingLeft: 16 },
  headCode: { fontWeight: 800, fontSize: 18, color: 'var(--primary)' },
  statRow: {
    display: 'grid', gridTemplateColumns: '1fr 140px 1fr',
    padding: '9px 0', borderBottom: '1px solid var(--border-light)',
    alignItems: 'center',
  },
  statA: { textAlign: 'right', paddingRight: 16, fontSize: 14 },
  statLabel: { textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statB: { textAlign: 'left', paddingLeft: 16, fontSize: 14 },
  na: { color: 'var(--text-subtle)', fontSize: 13 },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    paddingTop: 14, paddingBottom: 4,
  },
}
