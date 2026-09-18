import React, { useEffect, useMemo, useRef, useState } from 'react'

const TAGS_KEY = 'productivity_timer_tags_v1'
const SESSIONS_KEY = 'productivity_timer_sessions_v1'

const DEFAULT_TAGS = [
  { id: 'reading', name: 'Reading', color: '#B7F3D1' },
  { id: 'studying', name: 'Studying', color: '#F6A8DE' },
  { id: 'working', name: 'Working', color: '#C9B2FF' },
  { id: 'course', name: 'Course', color: '#FFD76B' },
]

const COLOR_SWATCHES = [
  '#B7F3D1', '#F6A8DE', '#C9B2FF', '#FFD76B',
  '#A9DEFF', '#FFB3A7', '#C7E98B', '#D8C2FF',
  '#9FE7E0', '#FFC2D9', '#F5C58C', '#BFCBFF',
]

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function formatDuration(minutes) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  if (m && s) return `${m}m ${s}s`
  if (m) return `${m}m`
  return `${s}s`
}

function parseTimeInput(value) {
  const parts = String(value).trim().split(':').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null
  const [h, m, s] = parts
  if (m > 59 || s > 59) return null
  return Math.floor(h) * 3600 + Math.floor(m) * 60 + Math.floor(s)
}

function normalizeTags(tags) {
  return Array.isArray(tags) && tags.length ? tags : DEFAULT_TAGS
}

function saveSession({ tag, elapsedSeconds }) {
  if (!tag || elapsedSeconds <= 0) return
  const durationMinutes = Math.round((elapsedSeconds / 60) * 100) / 100
  if (durationMinutes <= 0) return
  const sessions = readStorage(SESSIONS_KEY, [])
  const session = {
    tagName: tag.name,
    tagColor: tag.color,
    durationMinutes,
    durationFormatted: formatDuration(durationMinutes),
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([...sessions, session]))
}

function App() {
  const [mode, setMode] = useState('countdown')
  const [tags, setTags] = useState(() => normalizeTags(readStorage(TAGS_KEY, DEFAULT_TAGS)))
  const [selectedTagId, setSelectedTagId] = useState(() => normalizeTags(readStorage(TAGS_KEY, DEFAULT_TAGS))[0].id)
  const [timeInput, setTimeInput] = useState('00:45:00')
  const [seconds, setSeconds] = useState(45 * 60)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [overlay, setOverlay] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState(COLOR_SWATCHES[0])
  const [pomodoroFocus, setPomodoroFocus] = useState('00:25:00')
  const [pomodoroBreak, setPomodoroBreak] = useState('00:05:00')
  const [pomodoroSessions, setPomodoroSessions] = useState(4)
  const [pomodoroIndex, setPomodoroIndex] = useState(0)
  const [pomodoroPhase, setPomodoroPhase] = useState('focus')
  const [pomodoroMessage, setPomodoroMessage] = useState('')

  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)
  const accumulatedRef = useRef(0)
  const runDurationRef = useRef(0)
  const currentSegmentStartRef = useRef(null)
  const modeRef = useRef(mode)
  const secondsRef = useRef(seconds)
  const selectedTagRef = useRef(selectedTagId)
  const tagsRef = useRef(tags)
  const pomodoroPhaseRef = useRef(pomodoroPhase)
  const pomodoroIndexRef = useRef(pomodoroIndex)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { secondsRef.current = seconds }, [seconds])
  useEffect(() => { selectedTagRef.current = selectedTagId }, [selectedTagId])
  useEffect(() => { tagsRef.current = tags }, [tags])
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase }, [pomodoroPhase])
  useEffect(() => { pomodoroIndexRef.current = pomodoroIndex }, [pomodoroIndex])

  useEffect(() => {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
  }, [tags])

  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === selectedTagId) || tags[0],
    [tags, selectedTagId],
  )

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function getElapsedForCurrentRun() {
    const now = Date.now()
    const segment = currentSegmentStartRef.current ? (now - currentSegmentStartRef.current) / 1000 : 0
    return accumulatedRef.current + segment
  }

  function resetRunState() {
    stopInterval()
    startedAtRef.current = null
    accumulatedRef.current = 0
    runDurationRef.current = 0
    currentSegmentStartRef.current = null
    setRunning(false)
    setPaused(false)
  }

  function startTicker() {
    stopInterval()
    currentSegmentStartRef.current = Date.now()
    setRunning(true)
    setPaused(false)
    intervalRef.current = setInterval(() => {
      const currentMode = modeRef.current
      const elapsed = Math.floor(getElapsedForCurrentRun())
      if (currentMode === 'normal') {
        setSeconds(elapsed)
        return
      }

      const configured = runDurationRef.current
      // For countdown/pomodoro, remaining time is derived from the original phase
      // duration and wall-clock elapsed time. This stays correct across pause/resume.
      const remaining = Math.max(0, configured - elapsed)
      setSeconds(remaining)
      if (remaining <= 0) finishCurrentPhase()
    }, 200)
  }

  function beginRun(initialSeconds, nextMode = mode) {
    modeRef.current = nextMode
    secondsRef.current = initialSeconds
    setSeconds(initialSeconds)
    accumulatedRef.current = 0
    runDurationRef.current = initialSeconds
    startedAtRef.current = Date.now()
    startTicker()
  }

  function handleStart() {
    setPomodoroMessage('')
    if (mode === 'normal') {
      beginRun(0, 'normal')
      return
    }
    if (mode === 'countdown') {
      const parsed = parseTimeInput(timeInput)
      if (parsed === null || parsed <= 0) {
        setOverlay('invalid')
        return
      }
      beginRun(parsed, 'countdown')
      return
    }
    startPomodoro()
  }

  function startPomodoro() {
    const focus = parseTimeInput(pomodoroFocus)
    const breakTime = parseTimeInput(pomodoroBreak)
    const count = Number(pomodoroSessions)
    if (!focus || focus <= 0 || !breakTime || breakTime <= 0 || !Number.isInteger(count) || count < 1) {
      setOverlay('invalid')
      return
    }
    setPomodoroIndex(0)
    setPomodoroPhase('focus')
    pomodoroIndexRef.current = 0
    pomodoroPhaseRef.current = 'focus'
    setPomodoroMessage('')
    beginRun(focus, 'pomodoro')
  }

  function finishCurrentPhase() {
    stopInterval()
    const currentMode = modeRef.current
    const currentPhase = pomodoroPhaseRef.current
    const currentIndex = pomodoroIndexRef.current
    const elapsed = getElapsedForCurrentRun()
    const tag = tagsRef.current.find((item) => item.id === selectedTagRef.current) || tagsRef.current[0]

    if (currentMode === 'normal') {
      saveSession({ tag, elapsedSeconds: elapsed })
      setSeconds(Math.floor(elapsed))
      resetRunState()
      setPomodoroMessage('')
      return
    }

    if (currentMode === 'countdown') {
      saveSession({ tag, elapsedSeconds: Math.min(Math.max(0, elapsed), runDurationRef.current) })
      setSeconds(0)
      resetRunState()
      return
    }

    // Pomodoro: only focus phases become history entries.
    if (currentPhase === 'focus') {
      const focusConfigured = parseTimeInput(pomodoroFocus) || 0
      saveSession({ tag, elapsedSeconds: Math.max(0, Math.min(elapsed, focusConfigured)) })
      if (currentIndex + 1 >= Number(pomodoroSessions)) {
        setSeconds(0)
        resetRunState()
        setPomodoroMessage('Finished!')
        return
      }
      const breakSeconds = parseTimeInput(pomodoroBreak) || 0
      setPomodoroPhase('break')
      pomodoroPhaseRef.current = 'break'
      setSeconds(breakSeconds)
      secondsRef.current = breakSeconds
      accumulatedRef.current = 0
      runDurationRef.current = breakSeconds
      currentSegmentStartRef.current = Date.now()
      setRunning(true)
      setPaused(false)
      setPomodoroMessage('Break')
      intervalRef.current = setInterval(() => {
        const elapsedBreak = Math.floor(getElapsedForCurrentRun())
        const remaining = Math.max(0, breakSeconds - elapsedBreak)
        setSeconds(remaining)
        if (remaining <= 0) finishCurrentPhase()
      }, 200)
      return
    }

    const nextIndex = currentIndex + 1
    setPomodoroIndex(nextIndex)
    pomodoroIndexRef.current = nextIndex
    setPomodoroPhase('focus')
    pomodoroPhaseRef.current = 'focus'
    const focusSeconds = parseTimeInput(pomodoroFocus) || 0
    setSeconds(focusSeconds)
    secondsRef.current = focusSeconds
    accumulatedRef.current = 0
    runDurationRef.current = focusSeconds
    currentSegmentStartRef.current = Date.now()
    setRunning(true)
    setPaused(false)
    setPomodoroMessage('')
  }

  function handlePause() {
    if (!running || paused) return
    accumulatedRef.current = getElapsedForCurrentRun()
    stopInterval()
    currentSegmentStartRef.current = null
    setRunning(true)
    setPaused(true)
    setOverlay('paused')
  }

  function resumeFromPause() {
    setOverlay(null)
    setPaused(false)
    currentSegmentStartRef.current = Date.now()
    startTicker()
  }

  function quitRun() {
    const elapsed = paused ? accumulatedRef.current : getElapsedForCurrentRun()
    const tag = tagsRef.current.find((item) => item.id === selectedTagRef.current) || tagsRef.current[0]
    if (modeRef.current === 'pomodoro' && pomodoroPhaseRef.current === 'break') {
      // Breaks are intentionally never saved.
    } else {
      saveSession({ tag, elapsedSeconds: elapsed })
    }
    resetRunState()
    setOverlay(null)
    setPomodoroMessage('')
  }

  function restartRun() {
    setOverlay(null)
    setPomodoroMessage('')
    if (mode === 'normal') beginRun(0, 'normal')
    else if (mode === 'countdown') {
      const parsed = parseTimeInput(timeInput)
      if (parsed && parsed > 0) beginRun(parsed, 'countdown')
      else resetRunState()
    } else {
      startPomodoro()
    }
  }

  function switchMode(nextMode) {
    if (running || paused) {
      setOverlay('switch')
      return
    }
    setMode(nextMode)
    setPomodoroMessage('')
    if (nextMode === 'normal') setSeconds(0)
    else if (nextMode === 'countdown') setSeconds(parseTimeInput(timeInput) || 0)
    else setSeconds(parseTimeInput(pomodoroFocus) || 0)
  }

  function handleCountdownInput(value) {
    setTimeInput(value)
    if (!running && !paused) {
      const parsed = parseTimeInput(value)
      if (parsed !== null) setSeconds(parsed)
    }
  }

  function openNewTag() {
    setEditingId(null)
    setDraftName('')
    setDraftColor(COLOR_SWATCHES[0])
    setEditorOpen(true)
  }

  function openEditTag(tag) {
    setEditingId(tag.id)
    setDraftName(tag.name)
    setDraftColor(tag.color)
    setEditorOpen(true)
  }

  function saveTag() {
    const name = draftName.trim()
    if (!name) return
    if (editingId) {
      setTags((current) => current.map((tag) => tag.id === editingId ? { ...tag, name, color: draftColor } : tag))
    } else {
      const id = makeId('tag')
      setTags((current) => [...current, { id, name, color: draftColor }])
      setSelectedTagId(id)
    }
    setEditorOpen(false)
  }

  useEffect(() => () => stopInterval(), [])

  const displayColor = paused ? '#ef2f2f' : '#111111'
  const pomodoroTotal = Number(pomodoroSessions) || 0
  const actionLabel = running && !paused ? 'Pause' : paused ? 'Resume' : 'Start'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#fbf9ff_44%,#f7f4fb_100%)] px-4 py-8 text-black sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5">
        <header className="w-full max-w-xl text-center">
          <div className="inline-flex rounded-xl border border-violet-200/80 bg-white/75 px-4 py-2 text-sm font-bold tracking-tight shadow-sm backdrop-blur">
            Time Tracker
          </div>
          <p className="mt-2 text-xs text-neutral-500">Part 1 · Timer + tag history</p>
        </header>

        <section className="gloss-panel w-full max-w-xl rounded-3xl p-5 sm:p-7">
          <div className="mb-5 flex w-full gap-2 rounded-xl bg-neutral-100/80 p-1">
            <button className={`mode-button ${mode === 'countdown' ? 'active' : ''}`} onClick={() => switchMode('countdown')}>Countdown</button>
            <button className={`mode-button ${mode === 'pomodoro' ? 'active' : ''}`} onClick={() => switchMode('pomodoro')}>Pomodoro</button>
            <button className={`mode-button ${mode === 'normal' ? 'active' : ''}`} onClick={() => switchMode('normal')}>Normal</button>
          </div>

          {mode === 'countdown' && (
            <div className="space-y-5">
              <div className="text-center">
                <input
                  aria-label="Countdown time"
                  value={timeInput}
                  onChange={(e) => handleCountdownInput(e.target.value)}
                  className="w-full bg-transparent text-center text-5xl font-medium tracking-[0.05em] outline-none sm:text-6xl"
                  style={{ color: displayColor }}
                  disabled={running || paused}
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-neutral-400">hh:mm:ss · directly editable before starting</p>
              </div>
              <TimerTagRow tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} onEdit={openEditTag} onNew={openNewTag} />
            </div>
          )}

          {mode === 'normal' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-5xl font-medium tracking-[0.05em] sm:text-6xl" style={{ color: displayColor }}>{formatTime(seconds)}</div>
                <p className="mt-1 text-xs text-neutral-400">count-up timer</p>
              </div>
              <TimerTagRow tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} onEdit={openEditTag} onNew={openNewTag} />
            </div>
          )}

          {mode === 'pomodoro' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <TimeField label="Focus" value={pomodoroFocus} onChange={setPomodoroFocus} disabled={running || paused} />
                <TimeField label="Break" value={pomodoroBreak} onChange={setPomodoroBreak} disabled={running || paused} />
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="text-xs font-semibold text-neutral-500">Sessions</label>
                <input
                  type="number" min="1" max="99" value={pomodoroSessions}
                  onChange={(e) => setPomodoroSessions(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  disabled={running || paused}
                  className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-center text-sm outline-none focus:border-violet-400"
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold uppercase tracking-wide text-violet-500">{pomodoroPhase === 'focus' ? 'Focus' : 'Break'}</div>
                <div className="mt-1 text-5xl font-medium tracking-[0.05em] sm:text-6xl" style={{ color: displayColor }}>{formatTime(seconds)}</div>
                <div className="mt-1 text-sm font-semibold text-neutral-500">{pomodoroIndex} / {pomodoroTotal}</div>
              </div>
              <TimerTagRow tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} onEdit={openEditTag} onNew={openNewTag} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {!running && !paused && <ActionButton onClick={handleStart} primary>Start</ActionButton>}
            {running && !paused && <ActionButton onClick={handlePause}>Pause</ActionButton>}
            {paused && <ActionButton onClick={resumeFromPause} primary>Resume</ActionButton>}
            {(running || paused) && <ActionButton onClick={() => setOverlay('quit')}>Quit</ActionButton>}
            {(running || paused) && <ActionButton onClick={restartRun}>Restart</ActionButton>}
          </div>

          {pomodoroMessage && <div className="mt-4 text-center text-sm font-bold text-fuchsia-500">{pomodoroMessage}</div>}

          <div className="mt-7 rounded-2xl border border-violet-100 bg-white/65 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Selected tag</p>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: selectedTag?.color }} />
                  {selectedTag?.name}
                </div>
              </div>
              <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => selectedTag && openEditTag(selectedTag)}>Edit tag</button>
            </div>
          </div>
        </section>

        <p className="max-w-xl text-center text-xs leading-5 text-neutral-400">
          Sessions are written to localStorage only when a focus timer completes or is quit after elapsed time. Pomodoro breaks never create history entries.
        </p>
      </div>

      {editorOpen && (
        <Modal title={editingId ? 'Edit tag' : 'New tag'} onClose={() => setEditorOpen(false)}>
          <div className="space-y-4">
            <label className="block text-xs font-bold text-neutral-500">Tag name
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400" />
            </label>
            <div>
              <div className="mb-2 text-xs font-bold text-neutral-500">Choose color</div>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_SWATCHES.map((color) => (
                  <button key={color} aria-label={`Choose ${color}`} onClick={() => setDraftColor(color)} className={`h-7 w-7 rounded-md border-2 ${draftColor === color ? 'border-black' : 'border-white'} shadow-sm`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ActionButton onClick={() => setEditorOpen(false)}>Cancel</ActionButton>
              <ActionButton onClick={saveTag} primary>Save</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {overlay === 'paused' && (
        <Modal title="Timer paused" onClose={() => setOverlay(null)}>
          <div className="space-y-4 text-center">
            <div className="text-4xl font-medium text-red-500">{formatTime(seconds)}</div>
            {mode === 'pomodoro' && <div className="text-xs font-semibold text-neutral-500">Focus {pomodoroIndex} / {pomodoroTotal}</div>}
            <div className="flex justify-center gap-2">
              <ActionButton onClick={resumeFromPause} primary>Resume</ActionButton>
              <ActionButton onClick={() => setOverlay('quit')}>Quit</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {overlay === 'quit' && (
        <Modal title="Quit timer?" onClose={() => setOverlay(null)}>
          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-600">Elapsed focus time will be saved. Pomodoro break time will not be saved.</p>
            <div className="flex justify-center gap-2">
              <ActionButton onClick={() => setOverlay('paused')}>Keep timer</ActionButton>
              <ActionButton onClick={quitRun} primary>Quit & save</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {overlay === 'switch' && (
        <Modal title="Timer is running" onClose={() => setOverlay(null)}>
          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-600">Stop or finish the current timer before changing modes.</p>
            <ActionButton onClick={() => setOverlay(null)} primary>OK</ActionButton>
          </div>
        </Modal>
      )}

      {overlay === 'invalid' && (
        <Modal title="Check timer settings" onClose={() => setOverlay(null)}>
          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-600">Use a valid time in hh:mm:ss. Minutes and seconds must be 00–59, and the duration must be greater than zero.</p>
            <ActionButton onClick={() => setOverlay(null)} primary>OK</ActionButton>
          </div>
        </Modal>
      )}
    </main>
  )
}

function TimerTagRow({ tags, selectedTagId, onSelect, onEdit, onNew }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">Tag</span>
        <button onClick={onNew} className="text-xs font-bold text-violet-600 hover:text-violet-800">+ New tag</button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="group relative">
            <button
              onClick={() => onSelect(tag.id)}
              className={`tag-chip rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedTagId === tag.id ? 'border-black/20 ring-2 ring-violet-200' : 'border-black/10'}`}
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </button>
            <button
              aria-label={`Edit ${tag.name}`}
              onClick={() => onEdit(tag)}
              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border border-white bg-neutral-800 text-[9px] text-white group-hover:flex"
            >✎</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeField({ label, value, onChange, disabled }) {
  return (
    <label className="rounded-2xl border border-violet-100 bg-white/75 p-3">
      <span className="block text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="mt-1 w-full bg-transparent text-center text-lg font-semibold outline-none" inputMode="numeric" />
    </label>
  )
}

function ActionButton({ children, onClick, primary = false }) {
  return <button onClick={onClick} className={`rounded-xl px-5 py-2 text-sm font-bold ${primary ? 'border border-violet-500 bg-violet-500 text-white shadow-sm hover:bg-violet-600' : 'soft-button'}`}>{children}</button>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default App
