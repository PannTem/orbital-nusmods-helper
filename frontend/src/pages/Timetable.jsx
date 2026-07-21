import { useState, useEffect, useMemo } from 'react'
import { getUserId } from '../App.jsx'
import {
  getTimetable, updateSlot, removeModule,
  generateTimetable, shareTimetable, exportTimetableIcal,
} from '../api.js'
import ModulePanel from '../components/timetable/ModulePanel.jsx'
import TimetableGrid from '../components/timetable/TimetableGrid.jsx'

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#6366f1',
  '#14b8a6', '#ec4899', '#84cc16', '#a78bfa',
]

// ── NUSMods share-URL format ──────────────────────────────────────────────────
// NUSMods encodes a timetable in the query string as
//   https://nusmods.com/timetable/sem-1/share?CS2102=TUT:09,LEC:1
// i.e. MODULE=ABBREV:classNo pairs. This app stores lesson types using NUSMods'
// full names (slots come straight from NUSMods data), so the only translation
// needed is the lesson-type abbreviation.

// Mirrors NUSMods' LESSON_TYPE_ABBREV
// (nusmodifications/nusmods: website/src/utils/timetables/lessonId.ts)
const LESSON_TYPE_ABBREV = {
  'Design Lecture': 'DLEC',
  'Laboratory': 'LAB',
  'Lecture': 'LEC',
  'Packaged Laboratory': 'PLAB',
  'Packaged Lecture': 'PLEC',
  'Packaged Tutorial': 'PTUT',
  'Recitation': 'REC',
  'Sectional Teaching': 'SEC',
  'Seminar-Style Module Class': 'SEM',
  'Tutorial': 'TUT',
  'Tutorial Type 2': 'TUT2',
  'Tutorial Type 3': 'TUT3',
  'Workshop': 'WS',
}
const ABBREV_TO_LESSON_TYPE = Object.fromEntries(
  Object.entries(LESSON_TYPE_ABBREV).map(([full, abbrev]) => [abbrev, full])
)

// Build a NUSMods-style share URL from this app's selections.
function selectionsToNusmodsUrl(selections, sem, origin = 'https://nusmods.com') {
  const parts = []
  for (const [code, lessons] of Object.entries(selections || {})) {
    const pairs = []
    for (const [lessonType, classNo] of Object.entries(lessons || {})) {
      if (classNo === undefined || classNo === null || classNo === '') continue
      const abbrev = LESSON_TYPE_ABBREV[lessonType] || lessonType
      pairs.push(`${abbrev}:${classNo}`)
    }
    if (pairs.length) parts.push(`${code}=${pairs.join(',')}`)
  }
  return `${origin}/timetable/sem-${sem}/share?${parts.join('&')}`
}

// Parse a NUSMods share URL (or just its query string) into flat selections.
function parseNusmodsShareUrl(input) {
  if (!input || typeof input !== 'string') return null

  let sem = null
  const semMatch = input.match(/sem-(\d)/i)
  if (semMatch) sem = parseInt(semMatch[1], 10)

  const qIndex = input.indexOf('?')
  const query = qIndex >= 0 ? input.slice(qIndex + 1) : input

  const selections = []
  const skipped = []

  for (const part of query.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq < 0) continue

    const code = decodeURIComponent(part.slice(0, eq)).toUpperCase().trim()
    const value = part.slice(eq + 1)
    if (!code || !value) continue

    // NUSMods separates lesson types with ',' normally and ';' in TA-mode links
    for (const pair of value.split(/[,;]/)) {
      const colon = pair.indexOf(':')
      if (colon < 0) continue
      const abbrev = pair.slice(0, colon).trim().toUpperCase()
      const classNo = decodeURIComponent(pair.slice(colon + 1)).trim()
      if (!abbrev || !classNo) continue

      const lessonType = ABBREV_TO_LESSON_TYPE[abbrev]
      if (!lessonType) {
        skipped.push(`${code} ${abbrev}`)
        continue
      }
      selections.push({ module_code: code, lesson_type: lessonType, class_no: classNo })
    }
  }

  return { sem, selections, skipped }
}

// ── Preference slider ─────────────────────────────────────────────────────────

function PrefSlider({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ width: 130, fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={0} max={1} step={0.05}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, width: 'auto' }}
      />
      <span style={{ width: 36, fontSize: 12, textAlign: 'right', color: '#64748b', flexShrink: 0 }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

// ── Generate modal ────────────────────────────────────────────────────────────

function GenerateModal({ sem, moduleCodes, prefs, setPrefs, generating, genResults, onGenerate, onApply, onClose }) {
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <h3 style={ms.title}>Auto-Generate Timetable</h3>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={ms.sub}>
          Finding best Sem {sem} timetables for:{' '}
          <strong>{moduleCodes.join(', ')}</strong>
        </p>

        <div style={{ marginBottom: 16 }}>
          <p style={ms.secTitle}>Preference weights</p>
          <PrefSlider label="Latest Start"  value={prefs.latest_start}  onChange={v => setPrefs(p => ({ ...p, latest_start:  v }))} />
          <PrefSlider label="Earliest End"  value={prefs.earliest_end}  onChange={v => setPrefs(p => ({ ...p, earliest_end:  v }))} />
          <PrefSlider label="Lunch Break"   value={prefs.lunch_break}   onChange={v => setPrefs(p => ({ ...p, lunch_break:   v }))} />
          <PrefSlider label="Compact Days"  value={prefs.compact_days}  onChange={v => setPrefs(p => ({ ...p, compact_days:  v }))} />
          <PrefSlider label="Minimal Gaps"     value={prefs.minimal_gaps}     onChange={v => setPrefs(p => ({ ...p, minimal_gaps:     v }))} />
          <PrefSlider label="Minimize Travel"  value={prefs.minimize_travel}  onChange={v => setPrefs(p => ({ ...p, minimize_travel: v }))} />
        </div>

        {/* Day preference */}
        <div style={{ marginBottom: 16 }}>
          <p style={ms.secTitle}>Preferred days (optional)</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(day => {
              const checked = (prefs.preferred_days || []).includes(day)
              return (
                <label
                  key={day}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    cursor: 'pointer', fontSize: 13,
                    padding: '4px 10px', borderRadius: 5,
                    border: `1px solid ${checked ? '#2563eb' : 'var(--border)'}`,
                    background: checked ? '#eff6ff' : 'transparent',
                    color: checked ? '#2563eb' : 'var(--text-muted)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      setPrefs(p => {
                        const prev = p.preferred_days || []
                        const next = e.target.checked
                          ? [...prev, day]
                          : prev.filter(d => d !== day)
                        return {
                          ...p,
                          preferred_days: next,
                          day_preference: next.length > 0
                            ? (p.day_preference > 0 ? p.day_preference : 0.3)
                            : 0.0,
                        }
                      })
                    }}
                    style={{ width: 'auto', cursor: 'pointer', marginRight: 2 }}
                  />
                  {day.slice(0, 3)}
                </label>
              )
            })}
          </div>
          {(prefs.preferred_days || []).length > 0 && (
            <PrefSlider
              label="Day Pref Weight"
              value={prefs.day_preference || 0.0}
              onChange={v => setPrefs(p => ({ ...p, day_preference: v }))}
            />
          )}
        </div>

        <button
          className="btn-primary"
          onClick={onGenerate}
          disabled={generating}
          style={{ width: '100%', marginBottom: 16 }}
        >
          {generating ? 'Searching… (up to 8 s)' : 'Find Top 5 Timetables'}
        </button>

        {genResults !== null && (
          <div>
            <p style={ms.secTitle}>Results</p>
            {genResults.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                No conflict-free timetable found. Try removing a module or check that all modules run in Sem {sem}.
              </p>
            ) : (
              genResults.map((r, i) => (
                <div key={i} style={ms.resultRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={ms.rank}>#{i + 1}</span>
                    <span style={ms.score}>Score {(r.score * 100).toFixed(0)}%</span>
                    <span style={ms.stars}>
                      {'★'.repeat(Math.round(r.score * 5))}
                      {'☆'.repeat(5 - Math.round(r.score * 5))}
                    </span>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => onApply(r)}
                    style={{ padding: '5px 16px', fontSize: 13 }}
                  >
                    Apply
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Share modal ───────────────────────────────────────────────────────────────

function ShareModal({ moduleCodes, selected, setSelected, shareLink, sharing, copied, onShare, onCopy, onClose }) {
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <h3 style={ms.title}>Share Timetable</h3>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={ms.sub}>Choose which modules to include in the shared link:</p>

        <div style={{ marginBottom: 16 }}>
          {moduleCodes.map(code => (
            <label key={code} style={ms.checkRow}>
              <input
                type="checkbox"
                checked={selected.has(code)}
                onChange={e => {
                  setSelected(prev => {
                    const next = new Set(prev)
                    if (e.target.checked) next.add(code)
                    else next.delete(code)
                    return next
                  })
                }}
                style={{ width: 'auto', marginRight: 10, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 14 }}>{code}</span>
            </label>
          ))}
        </div>

        {!shareLink ? (
          <button
            className="btn-primary"
            onClick={onShare}
            disabled={sharing || selected.size === 0}
            style={{ width: '100%' }}
          >
            {sharing ? 'Creating link…' : 'Create Shareable Link'}
          </button>
        ) : (
          <>
            <p style={{ ...ms.secTitle, marginBottom: 8 }}>Share link</p>
            <div style={ms.linkBox}>
              <input value={shareLink} readOnly style={{ flex: 1, fontSize: 12 }} />
              <button
                className="btn-primary"
                onClick={onCopy}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── NUSMods import/export modal ───────────────────────────────────────────────

function NusmodsModal({ exportUrl, hasModules, importText, setImportText,
                        importing, importMsg, copied, onCopy, onImport, onClose }) {
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <h3 style={ms.title}>NUSMods Import / Export</h3>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Export */}
        <p style={ms.secTitle}>Export to NUSMods</p>
        {hasModules ? (
          <>
            <p style={ms.sub}>This link opens your timetable on NUSMods:</p>
            <div style={ms.linkBox}>
              <input value={exportUrl} readOnly style={{ flex: 1, fontSize: 12 }} />
              <button className="btn-primary" onClick={onCopy} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </>
        ) : (
          <p style={{ ...ms.sub, marginBottom: 4 }}>Add some modules first to export.</p>
        )}

        <hr className="divider" style={{ margin: '18px 0' }} />

        {/* Import */}
        <p style={ms.secTitle}>Import from NUSMods</p>
        <p style={ms.sub}>Paste a NUSMods share link. This replaces the timetable for the link's semester.</p>
        <input
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder="https://nusmods.com/timetable/sem-1/share?CS2102=TUT:09,LEC:1"
          style={{ fontSize: 12, marginBottom: 10 }}
        />
        <button
          className="btn-primary"
          onClick={onImport}
          disabled={importing || !importText.trim()}
          style={{ width: '100%' }}
        >
          {importing ? 'Importing…' : 'Import Timetable'}
        </button>
        {importMsg && (
          <p style={{ marginTop: 10, fontSize: 13, color: importMsg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>
            {importMsg}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Timetable() {
  const userId = getUserId()
  const [sem,           setSem]           = useState(2)
  const [selections,    setSelections]    = useState({})
  const [renderedSlots, setRenderedSlots] = useState([])
  const [exams,         setExams]         = useState([])
  const [saving,        setSaving]        = useState(false)

  // generate modal state
  const [showGenModal, setShowGenModal] = useState(false)
  const [prefs,        setPrefs]        = useState({
    latest_start: 0.2, earliest_end: 0.2, lunch_break: 0.2,
    compact_days: 0.2, minimal_gaps: 0.2, minimize_travel: 0.0,
    day_preference: 0.0, preferred_days: [],
  })
  const [generating,  setGenerating]  = useState(false)
  const [genResults,  setGenResults]  = useState(null)

  // share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareSelected,  setShareSelected]  = useState(new Set())
  const [shareLink,      setShareLink]      = useState('')
  const [sharing,        setSharing]        = useState(false)
  const [copied,         setCopied]         = useState(false)

  // nusmods import/export modal state
  const [showNusmodsModal, setShowNusmodsModal] = useState(false)
  const [importText,       setImportText]       = useState('')
  const [importing,        setImporting]        = useState(false)
  const [importMsg,        setImportMsg]        = useState('')
  const [nusCopied,        setNusCopied]        = useState(false)

  const moduleCodes = Object.keys(selections)
  const nusmodsUrl = useMemo(() => selectionsToNusmodsUrl(selections, sem), [selections, sem])

  // Detect manually-selected conflicting slots
  const conflicts = useMemo(() => {
    function toMins(t) { return parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(2, 4)) }
    const byDay = {}
    for (const slot of renderedSlots) {
      if (!byDay[slot.day]) byDay[slot.day] = []
      byDay[slot.day].push(slot)
    }
    const bad = new Set()
    for (const slots of Object.values(byDay)) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const [a, b] = [slots[i], slots[j]]
          if (toMins(a.startTime) < toMins(b.endTime) && toMins(b.startTime) < toMins(a.endTime)) {
            bad.add(a.moduleCode); bad.add(b.moduleCode)
          }
        }
      }
    }
    return [...bad]
  }, [renderedSlots])

  // Detect overlapping exam timings among selected modules
  const examClashes = useMemo(() => {
    const parsed = exams
      .filter(e => e.exam_date)
      .map(e => {
        const start = new Date(e.exam_date).getTime()
        const dur = (e.exam_duration || 0) * 60 * 1000
        return { code: e.module_code, start, end: start + dur }
      })
      .filter(e => !isNaN(e.start))
    const bad = new Set()
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const a = parsed[i], b = parsed[j]
        if (a.start < b.end && b.start < a.end) {
          bad.add(a.code); bad.add(b.code)
        }
      }
    }
    return [...bad]
  }, [exams])

  const moduleColors = Object.fromEntries(
    moduleCodes.map((c, i) => [c, PALETTE[i % PALETTE.length]])
  )

  // Load saved timetable on mount / sem change
  useEffect(() => {
    getTimetable(userId, sem).then(data => {
      const sel = {}
      for (const s of data.selections) {
        sel[s.module_code] = sel[s.module_code] || {}
        sel[s.module_code][s.lesson_type] = s.class_no
      }
      setSelections(sel)
      setRenderedSlots(data.rendered_slots || [])
      setExams(data.exams || [])
    }).catch(() => {})
  }, [sem])

  // ── existing handlers ────────────────────────────────────────────────────────

  async function handleSlotChange(code, lessonType, classNo) {
    setSelections(prev => ({
      ...prev,
      [code]: { ...(prev[code] || {}), [lessonType]: classNo },
    }))
    setSaving(true)
    try {
      await updateSlot(userId, { module_code: code, lesson_type: lessonType, class_no: classNo, sem })
      const data = await getTimetable(userId, sem)
      setRenderedSlots(data.rendered_slots || [])
      setExams(data.exams || [])
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveModule(code) {
    setSelections(prev => {
      const next = { ...prev }
      delete next[code]
      return next
    })
    await removeModule(userId, code, sem)
    const data = await getTimetable(userId, sem)
    setRenderedSlots(data.rendered_slots || [])
    setExams(data.exams || [])
  }

  // ── generate handlers ────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true)
    setGenResults(null)
    try {
      const data = await generateTimetable({
        module_codes: moduleCodes,
        sem,
        preferences: prefs,
        top_n: 5,
      })
      setGenResults(data.timetables)
    } catch {
      setGenResults([])
    } finally {
      setGenerating(false)
    }
  }

  async function applyGenerated(result) {
    const newSel = {}
    for (const s of result.selections) {
      newSel[s.module_code] = newSel[s.module_code] || {}
      newSel[s.module_code][s.lesson_type] = s.class_no
    }
    setSelections(newSel)
    setRenderedSlots(result.rendered_slots)
    setShowGenModal(false)
    setGenResults(null)

    // Persist: clear old selections then write new ones
    setSaving(true)
    try {
      await Promise.all(moduleCodes.map(c => removeModule(userId, c, sem)))
      await Promise.all(
        result.selections.map(s =>
          updateSlot(userId, {
            module_code: s.module_code,
            lesson_type: s.lesson_type,
            class_no:    s.class_no,
            sem,
          })
        )
      )
    } finally {
      setSaving(false)
    }
  }

  // ── share handlers ────────────────────────────────────────────────────────────

  function openShareModal() {
    setShareSelected(new Set(moduleCodes))
    setShareLink('')
    setCopied(false)
    setShowShareModal(true)
  }

  async function handleShare() {
    setSharing(true)
    try {
      const data = await shareTimetable({
        user_id:      userId,
        sem,
        module_codes: [...shareSelected],
      })
      setShareLink(`${window.location.origin}${data.url}`)
    } catch {
      /* silently fail */
    } finally {
      setSharing(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // ── nusmods import/export handlers ─────────────────────────────────────────────

  function openNusmodsModal() {
    setImportText('')
    setImportMsg('')
    setNusCopied(false)
    setShowNusmodsModal(true)
  }

  function copyNusmodsUrl() {
    navigator.clipboard.writeText(nusmodsUrl).then(() => {
      setNusCopied(true)
      setTimeout(() => setNusCopied(false), 2500)
    })
  }

  async function reloadTimetable(targetSem) {
    const data = await getTimetable(userId, targetSem)
    const sel = {}
    for (const s of data.selections) {
      sel[s.module_code] = sel[s.module_code] || {}
      sel[s.module_code][s.lesson_type] = s.class_no
    }
    setSelections(sel)
    setRenderedSlots(data.rendered_slots || [])
    setExams(data.exams || [])
  }

  async function handleNusmodsImport() {
    setImporting(true)
    setImportMsg('')
    try {
      const parsed = parseNusmodsShareUrl(importText)
      if (!parsed || parsed.selections.length === 0) {
        setImportMsg('Could not read any modules from that link.')
        return
      }
      const targetSem = parsed.sem || sem

      // Replace target sem: clear existing modules, then write imported slots
      const current = await getTimetable(userId, targetSem)
      const currentCodes = [...new Set(current.selections.map(s => s.module_code))]
      await Promise.all(currentCodes.map(c => removeModule(userId, c, targetSem)))
      await Promise.all(parsed.selections.map(s =>
        updateSlot(userId, {
          module_code: s.module_code,
          lesson_type: s.lesson_type,
          class_no:    s.class_no,
          sem:         targetSem,
        })
      ))

      setSem(targetSem)
      await reloadTimetable(targetSem)

      const count = new Set(parsed.selections.map(s => s.module_code)).size
      let msg = `✓ Imported ${count} module${count === 1 ? '' : 's'} into Sem ${targetSem}.`
      if (parsed.skipped.length) msg += ` Skipped unknown: ${parsed.skipped.join(', ')}.`
      setImportMsg(msg)
      setImportText('')
    } catch {
      setImportMsg('Import failed. Check the link and try again.')
    } finally {
      setImporting(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      {/* Modals */}
      {showGenModal && (
        <GenerateModal
          sem={sem}
          moduleCodes={moduleCodes}
          prefs={prefs}
          setPrefs={setPrefs}
          generating={generating}
          genResults={genResults}
          onGenerate={handleGenerate}
          onApply={applyGenerated}
          onClose={() => { setShowGenModal(false); setGenResults(null) }}
        />
      )}
      {showShareModal && (
        <ShareModal
          moduleCodes={moduleCodes}
          selected={shareSelected}
          setSelected={setShareSelected}
          shareLink={shareLink}
          sharing={sharing}
          copied={copied}
          onShare={handleShare}
          onCopy={copyLink}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showNusmodsModal && (
        <NusmodsModal
          exportUrl={nusmodsUrl}
          hasModules={moduleCodes.length > 0}
          importText={importText}
          setImportText={setImportText}
          importing={importing}
          importMsg={importMsg}
          copied={nusCopied}
          onCopy={copyNusmodsUrl}
          onImport={handleNusmodsImport}
          onClose={() => setShowNusmodsModal(false)}
        />
      )}

      <div className="no-print" style={styles.topBar}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Timetable Builder</h1>
        <div style={styles.semSwitch}>
          {[1, 2].map(s => (
            <button
              key={s}
              onClick={() => setSem(s)}
              className={sem === s ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '6px 18px' }}
            >
              Sem {s}
            </button>
          ))}
        </div>
        <button
          className="btn-ghost"
          onClick={openNusmodsModal}
          style={{ padding: '6px 14px' }}
        >
          Export to NUSMods
        </button>
        {moduleCodes.length > 0 && (
          <>
            <button
              className="btn-ghost"
              onClick={() => { setGenResults(null); setShowGenModal(true) }}
              style={{ padding: '6px 14px' }}
            >
              Generate
            </button>
            <button
              className="btn-ghost"
              onClick={openShareModal}
              style={{ padding: '6px 14px' }}
            >
              Share
            </button>
          </>
        )}
        {moduleCodes.length > 0 && (
          <>
            <button
              className="btn-ghost no-print"
              onClick={() => exportTimetableIcal(userId, sem)}
              style={{ padding: '6px 14px' }}
            >
              Export .ics
            </button>
            <button
              className="btn-ghost no-print"
              onClick={() => window.print()}
              style={{ padding: '6px 14px' }}
            >
              Print
            </button>
          </>
        )}
        {saving && <span style={styles.saving}>Saving…</span>}
      </div>

      <div style={styles.layout}>
        <div className="no-print" style={styles.panelCol}>
          <ModulePanel
            sem={sem}
            selections={selections}
            onSlotChange={handleSlotChange}
            onRemoveModule={handleRemoveModule}
            moduleColors={moduleColors}
          />
        </div>
        <div className="print-area" style={styles.gridCol}>
          {examClashes.length > 0 && (
            <div style={styles.examClashBanner}>
              ⚠ Exam clash: {examClashes.join(', ')} have overlapping exam timings.
            </div>
          )}
          {conflicts.length > 0 && (
            <div className="no-print" style={styles.conflictBanner}>
              Time conflict: {conflicts.join(', ')} — pick different slots to resolve.
            </div>
          )}
          <TimetableGrid
            renderedSlots={renderedSlots}
            moduleColors={moduleColors}
            conflicts={conflicts}
          />
          {moduleCodes.length === 0 && (
            <p style={styles.hint}>Add modules from the left panel to see them here.</p>
          )}
          {/* colour legend — hidden on screen, shown when printing */}
          <div className="print-legend">
            {moduleCodes.map(code => (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: moduleColors[code], flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  semSwitch: { display: 'flex', gap: 6 },
  saving: { color: '#94a3b8', fontSize: 13 },
  layout: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: 20,
    alignItems: 'start',
  },
  panelCol: {
    position: 'sticky',
    top: 72,
    maxHeight: 'calc(100vh - 90px)',
    overflowY: 'visible',
  },
  gridCol: {},
  hint: { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 14 },
  conflictBanner: {
    background: '#fff1f1', border: '1px solid #fecaca',
    borderRadius: 'var(--radius)', padding: '9px 14px',
    color: '#b91c1c', fontSize: 12, fontWeight: 500,
    marginBottom: 12,
  },
  examClashBanner: {
    background: '#dc2626', border: '1px solid #b91c1c',
    borderRadius: 'var(--radius)', padding: '11px 14px',
    color: '#ffffff', fontSize: 13, fontWeight: 600,
    marginBottom: 12,
  },
}

const ms = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 20,
  },
  box: {
    background: 'white', borderRadius: 'var(--radius)', padding: 24,
    width: '100%', maxWidth: 520,
    maxHeight: '90vh', overflowY: 'auto',
    border: '1px solid var(--border)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  title:    { fontWeight: 700, fontSize: 16 },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 18, color: 'var(--text-subtle)', cursor: 'pointer',
    padding: '4px 8px', borderRadius: 4,
  },
  sub:      { color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 },
  secTitle: {
    fontWeight: 600, fontSize: 11, color: 'var(--text-subtle)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
  },
  resultRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid var(--border-light)',
  },
  rank:  { fontWeight: 700, fontSize: 14, color: 'var(--text)' },
  score: { fontSize: 13, color: 'var(--text-muted)' },
  stars: { color: '#d97706', fontSize: 13 },
  checkRow: {
    display: 'flex', alignItems: 'center',
    padding: '9px 0', cursor: 'pointer',
    borderBottom: '1px solid var(--border-light)',
  },
  linkBox: { display: 'flex', gap: 8, alignItems: 'center' },
}
