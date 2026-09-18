import React, { useEffect, useMemo, useRef, useState } from 'react'
import Dashboard from './pages/Dashboard'

const TAGS_KEY = 'productivity_timer_tags_v1'
const SESSIONS_KEY = 'productivity_timer_sessions_v1'
const TIMER_STATE_KEY = 'productivity_timer_active_v2'

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

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
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

function createSession({ tag, elapsedSeconds, timestamp = new Date().toISOString() }) {
  if (!tag || elapsedSeconds <= 0) return null
  const durationMinutes = Math.round((elapsedSeconds / 60) * 100) / 100
  if (durationMinutes <= 0) return null
  return {
    id: makeId('session'),
    tagName: tag.name,
    tagColor: tag.color,
    durationMinutes,
    durationFormatted: formatDuration(durationMinutes),
    timestamp,
  }
}

function appendSession(session) {
  if (!session) return
  const sessions = readStorage(SESSIONS_KEY, [])
  writeStorage(SESSIONS_KEY, [...sessions, session])
}

function getStoredTimer() {
  const stored = readStorage(TIMER_STATE_KEY, null)
  if (!stored || !stored.active) return null
  return stored
}

function getElapsedFromStored(stored, now = Date.now()) {
  if (!stored) return 0
  const activeMs = stored.running && stored.segmentStartedAt ? Math.max(0, now - stored.segmentStartedAt) : 0
  return Math.max(0, (stored.accumulatedSeconds || 0) + activeMs / 1000)
}

function buildTimerSnapshot({
  mode, running, paused, phase, pomodoroIndex, pomodoroSessions, configuredSeconds,
  accumulatedSeconds, segmentStartedAt, selectedTagId, startedAt, runId,
  pomodoroFocus, pomodoroBreak, countdownInput,
}) {
  return {
    version: 2,
    active: running || paused,
    mode,
    running,
    paused,
    phase,
    pomodoroIndex,
    pomodoroSessions,
    configuredSeconds,
    accumulatedSeconds,
    segmentStartedAt,
    selectedTagId,
    startedAt,
    runId,
    pomodoroFocus,
    pomodoroBreak,
    countdownInput,
    savedAt: Date.now(),
  }
}

function App() {
  const [page, setPage] = useState('timer')
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
  const [history, setHistory] = useState(() => readStorage(SESSIONS_KEY, []))

  const intervalRef = useRef(null)
  const modeRef = useRef(mode)
  const secondsRef = useRef(seconds)
  const selectedTagRef = useRef(selectedTagId)
  const tagsRef = useRef(tags)
  const pomodoroPhaseRef = useRef(pomodoroPhase)
  const pomodoroIndexRef = useRef(pomodoroIndex)
  const runningRef = useRef(running)
  const pausedRef = useRef(paused)
  const accumulatedRef = useRef(0)
  const configuredSecondsRef = useRef(seconds)
  const segmentStartedAtRef = useRef(null)
  const startedAtRef = useRef(null)
  const runIdRef = useRef(null)
  const lastSavedRunIdRef = useRef(null)
  const pomodoroFocusRef = useRef(pomodoroFocus)
  const pomodoroBreakRef = useRef(pomodoroBreak)
  const pomodoroSessionsRef = useRef(pomodoroSessions)
  const timeInputRef = useRef(timeInput)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { secondsRef.current = seconds }, [seconds])
  useEffect(() => { selectedTagRef.current = selectedTagId }, [selectedTagId])
  useEffect(() => { tagsRef.current = tags }, [tags])
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase }, [pomodoroPhase])
  useEffect(() => { pomodoroIndexRef.current = pomodoroIndex }, [pomodoroIndex])
  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { pomodoroFocusRef.current = pomodoroFocus }, [pomodoroFocus])
  useEffect(() => { pomodoroBreakRef.current = pomodoroBreak }, [pomodoroBreak])
  useEffect(() => { pomodoroSessionsRef.current = pomodoroSessions }, [pomodoroSessions])
  useEffect(() => { timeInputRef.current = timeInput }, [timeInput])

  useEffect(() => {
    writeStorage(TAGS_KEY, tags)
  }, [tags])

  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === selectedTagId) || tags[0],
    [tags, selectedTagId],
  )

  function refreshHistory() {
    setHistory(readStorage(SESSIONS_KEY, []))
  }

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function getElapsedForCurrentRun() {
    const segment = segmentStartedAtRef.current ? (Date.now() - segmentStartedAtRef.current) / 1000 : 0
    return Math.max(0, accumulatedRef.current + segment)
  }

  function saveActiveCheckpoint() {
    if (!runningRef.current && !pausedRef.current) return
    writeStorage(TIMER_STATE_KEY, buildTimerSnapshot({
      mode: modeRef.current,
      running: runningRef.current,
      paused: pausedRef.current,
      phase: pomodoroPhaseRef.current,
      pomodoroIndex: pomodoroIndexRef.current,
      pomodoroSessions: pomodoroSessionsRef.current,
      configuredSeconds: configuredSecondsRef.current,
      accumulatedSeconds: accumulatedRef.current,
      segmentStartedAt: segmentStartedAtRef.current,
      selectedTagId: selectedTagRef.current,
      startedAt: startedAtRef.current,
      runId: runIdRef.current,
      pomodoroFocus: pomodoroFocusRef.current,
      pomodoroBreak: pomodoroBreakRef.current,
      countdownInput: timeInputRef.current,
    }))
  }

  function clearActiveCheckpoint() {
    try { localStorage.removeItem(TIMER_STATE_KEY) } catch {}
  }

  function saveElapsedSession(elapsedSeconds, tag = tagsRef.current.find((item) => item.id === selectedTagRef.current) || tagsRef.current[0]) {
    if (!runIdRef.current || lastSavedRunIdRef.current === runIdRef.current) return
    const session = createSession({ tag, elapsedSeconds })
    if (!session) return
    appendSession(session)
    lastSavedRunIdRef.current = runIdRef.current
    refreshHistory()
  }

  function resetRunState() {
    stopInterval()
    clearActiveCheckpoint()
    accumulatedRef.current = 0
    configuredSecondsRef.current = 0
    segmentStartedAtRef.current = null
    startedAtRef.current = null
    runIdRef.current = null
    setRunning(false)
    setPaused(false)
    runningRef.current = false
    pausedRef.current = false
  }

  function updateLiveDisplay() {
    if (!runningRef.current) return
    const elapsed = getElapsedForCurrentRun()
    const currentMode = modeRef.current
    if (currentMode === 'normal') {
      setSeconds(Math.floor(elapsed))
      saveActiveCheckpoint()
      return
    }

    const remaining = Math.max(0, configuredSecondsRef.current - elapsed)
    setSeconds(remaining)
    saveActiveCheckpoint()
    if (remaining <= 0) finishCurrentPhase()
  }

  function startTicker() {
    stopInterval()
    if (!segmentStartedAtRef.current) segmentStartedAtRef.current = Date.now()
    intervalRef.current = setInterval(updateLiveDisplay, 100)
    updateLiveDisplay()
  }

  function beginRun(initialSeconds, nextMode = mode, options = {}) {
    const newRun = options.newRun !== false
    modeRef.current = nextMode
    if (newRun) {
      runIdRef.current = makeId('run')
      lastSavedRunIdRef.current = null
      accumulatedRef.current = 0
      startedAtRef.current = Date.now()
    }
    configuredSecondsRef.current = initialSeconds
    segmentStartedAtRef.current = Date.now()
    setSeconds(initialSeconds)
    secondsRef.current = initialSeconds
    setRunning(true)
    setPaused(false)
    runningRef.current = true
    pausedRef.current = false
    saveActiveCheckpoint()
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
    if (pomodoroPhase === 'break') {
      startPomodoroBreak()
      return
    }
    if (pomodoroPhase === 'focus' && pomodoroIndex > 0) {
      startPomodoroFocus()
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
    pomodoroIndexRef.current = 0
    setPomodoroPhase('focus')
    pomodoroPhaseRef.current = 'focus'
    setPomodoroMessage('Focus')
    beginRun(focus, 'pomodoro')
  }

  function startPomodoroBreak() {
    const breakSeconds = parseTimeInput(pomodoroBreak)
    if (!breakSeconds || breakSeconds <= 0) {
      setOverlay('invalid')
      return
    }
    setPomodoroMessage('Break')
    beginRun(breakSeconds, 'pomodoro', { newRun: true })
  }

  function startPomodoroFocus() {
    const focusSeconds = parseTimeInput(pomodoroFocus)
    if (!focusSeconds || focusSeconds <= 0) {
      setOverlay('invalid')
      return
    }
    setPomodoroPhase('focus')
    pomodoroPhaseRef.current = 'focus'
    setPomodoroMessage('Focus')
    beginRun(focusSeconds, 'pomodoro', { newRun: true })
  }

  function finishCurrentPhase() {
    stopInterval()
    const currentMode = modeRef.current
    const currentPhase = pomodoroPhaseRef.current
    const currentIndex = pomodoroIndexRef.current
    const elapsed = getElapsedForCurrentRun()
    const tag = tagsRef.current.find((item) => item.id === selectedTagRef.current) || tagsRef.current[0]

    if (currentMode === 'normal') {
      saveElapsedSession(elapsed, tag)
      setSeconds(Math.floor(elapsed))
      resetRunState()
      return
    }

    if (currentMode === 'countdown') {
      saveElapsedSession(Math.min(Math.max(0, elapsed), configuredSecondsRef.current), tag)
      setSeconds(0)
      resetRunState()
      return
    }

    if (currentPhase === 'focus') {
      const focusConfigured = parseTimeInput(pomodoroFocusRef.current) || 0
      saveElapsedSession(Math.max(0, Math.min(elapsed, focusConfigured)), tag)
      if (currentIndex + 1 >= Number(pomodoroSessionsRef.current)) {
        setSeconds(0)
        resetRunState()
        setPomodoroMessage('Finished!')
        setPomodoroPhase('focus')
        pomodoroPhaseRef.current = 'focus'
        return
      }
      // The break is deliberately NOT started automatically. The user must press Start Break.
      setPomodoroPhase('break')
      pomodoroPhaseRef.current = 'break'
      setSeconds(parseTimeInput(pomodoroBreakRef.current) || 0)
      secondsRef.current = parseTimeInput(pomodoroBreakRef.current) || 0
      setRunning(false)
      setPaused(false)
      runningRef.current = false
      pausedRef.current = false
      accumulatedRef.current = 0
      segmentStartedAtRef.current = null
      configuredSecondsRef.current = parseTimeInput(pomodoroBreakRef.current) || 0
      clearActiveCheckpoint()
      setPomodoroMessage('Break ready — press Start Break')
      return
    }

    // Break completed: wait for the user to start the next focus session too.
    const nextIndex = currentIndex + 1
    setPomodoroIndex(nextIndex)
    pomodoroIndexRef.current = nextIndex
    setPomodoroPhase('focus')
    pomodoroPhaseRef.current = 'focus'
    const focusSeconds = parseTimeInput(pomodoroFocusRef.current) || 0
    setSeconds(focusSeconds)
    secondsRef.current = focusSeconds
    setRunning(false)
    setPaused(false)
    runningRef.current = false
    pausedRef.current = false
    accumulatedRef.current = 0
    segmentStartedAtRef.current = null
    configuredSecondsRef.current = focusSeconds
    clearActiveCheckpoint()
    setPomodoroMessage('Focus ready — press Start Focus')
  }

  function handlePause() {
    if (!runningRef.current || pausedRef.current) return
    accumulatedRef.current = getElapsedForCurrentRun()
    stopInterval()
    segmentStartedAtRef.current = null
    setRunning(true)
    setPaused(true)
    runningRef.current = true
    pausedRef.current = true
    saveActiveCheckpoint()
    setOverlay('paused')
  }

  function resumeFromPause() {
    setOverlay(null)
    setPaused(false)
    pausedRef.current = false
    setRunning(true)
    runningRef.current = true
    segmentStartedAtRef.current = Date.now()
    saveActiveCheckpoint()
    startTicker()
  }

  function quitRun() {
    const elapsed = pausedRef.current ? accumulatedRef.current : getElapsedForCurrentRun()
    const tag = tagsRef.current.find((item) => item.id === selectedTagRef.current) || tagsRef.current[0]
    if (!(modeRef.current === 'pomodoro' && pomodoroPhaseRef.current === 'break')) {
      saveElapsedSession(elapsed, tag)
    }
    resetRunState()
    setOverlay(null)
    setPomodoroMessage('')
    refreshHistory()
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
    if (runningRef.current || pausedRef.current) {
      setOverlay('switch')
      return
    }
    setMode(nextMode)
    modeRef.current = nextMode
    setPomodoroMessage('')
    if (nextMode === 'normal') setSeconds(0)
    else if (nextMode === 'countdown') setSeconds(parseTimeInput(timeInput) || 0)
    else {
      setPomodoroIndex(0)
      setPomodoroPhase('focus')
      setSeconds(parseTimeInput(pomodoroFocus) || 0)
    }
  }

  function handleCountdownInput(value) {
    setTimeInput(value)
    timeInputRef.current = value
    if (!runningRef.current && !pausedRef.current) {
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

  function deleteTag(tag) {
    if (tagsRef.current.length <= 1) {
      window.alert('You need to keep at least one tag.')
      return
    }
    const confirmed = window.confirm(`Delete the tag \"${tag.name}\"? Existing history will stay unchanged.`)
    if (!confirmed) return
    const remaining = tagsRef.current.filter((item) => item.id !== tag.id)
    setTags(remaining)
    if (selectedTagRef.current === tag.id) setSelectedTagId(remaining[0].id)
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

  function recoverTimer(stored) {
    if (!stored) return
    const restoredMode = stored.mode || 'countdown'
    const restoredPhase = stored.phase || 'focus'
    const restoredIndex = Number.isInteger(stored.pomodoroIndex) ? stored.pomodoroIndex : 0
    const restoredSessions = Number.isInteger(stored.pomodoroSessions) ? stored.pomodoroSessions : 4
    const elapsed = getElapsedFromStored(stored)
    const remaining = restoredMode === 'normal' ? elapsed : Math.max(0, (stored.configuredSeconds || 0) - elapsed)

    setMode(restoredMode)
    modeRef.current = restoredMode
    setSelectedTagId(stored.selectedTagId || selectedTagRef.current)
    selectedTagRef.current = stored.selectedTagId || selectedTagRef.current
    setPomodoroFocus(stored.pomodoroFocus || pomodoroFocusRef.current)
    setPomodoroBreak(stored.pomodoroBreak || pomodoroBreakRef.current)
    setPomodoroSessions(restoredSessions)
    pomodoroSessionsRef.current = restoredSessions
    setPomodoroIndex(restoredIndex)
    pomodoroIndexRef.current = restoredIndex
    setPomodoroPhase(restoredPhase)
    pomodoroPhaseRef.current = restoredPhase
    setTimeInput(stored.countdownInput || timeInputRef.current)
    timeInputRef.current = stored.countdownInput || timeInputRef.current

    runIdRef.current = stored.runId || makeId('run')
    startedAtRef.current = stored.startedAt || Date.now()
    accumulatedRef.current = stored.accumulatedSeconds || 0
    configuredSecondsRef.current = stored.configuredSeconds || 0
    segmentStartedAtRef.current = stored.running ? (stored.segmentStartedAt || Date.now()) : null

    if (stored.running) {
      if (remaining <= 0 && restoredMode !== 'normal') {
        // Complete a recovered countdown immediately; this also protects against a refresh exactly at zero.
        setSeconds(0)
        runningRef.current = true
        pausedRef.current = false
        setRunning(true)
        setPaused(false)
        finishCurrentPhase()
        return
      }
      setSeconds(remaining)
      setRunning(true)
      setPaused(false)
      runningRef.current = true
      pausedRef.current = false
      setPomodoroMessage(restoredMode === 'pomodoro' ? (restoredPhase === 'break' ? 'Break' : 'Focus') : '')
      startTicker()
    } else {
      setSeconds(remaining)
      setRunning(true)
      setPaused(true)
      runningRef.current = true
      pausedRef.current = true
      setPomodoroMessage(restoredMode === 'pomodoro' ? (restoredPhase === 'break' ? 'Break' : 'Focus') : '')
      setOverlay('recovered')
    }
  }

  useEffect(() => {
    const stored = getStoredTimer()
    if (stored) recoverTimer(stored)
    refreshHistory()
    const onStorage = (event) => {
      if (event.key === SESSIONS_KEY) refreshHistory()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      stopInterval()
    }
    // Initial recovery intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const saveBeforeLeave = () => {
      // First checkpoint the exact current position, then also write a completed/quit-like
      // session when possible. This protects data when the page is closed unexpectedly.
      if (runningRef.current || pausedRef.current) {
        const elapsed = pausedRef.current ? accumulatedRef.current : getElapsedForCurrentRun()
        const tag = tagsRef.current.find((item) => item.id === selectedTagRef.current) || tagsRef.current[0]
        if (!(modeRef.current === 'pomodoro' && pomodoroPhaseRef.current === 'break')) saveElapsedSession(elapsed, tag)
        clearActiveCheckpoint()
      }
    }
    window.addEventListener('pagehide', saveBeforeLeave)
    window.addEventListener('beforeunload', saveBeforeLeave)
    return () => {
      window.removeEventListener('pagehide', saveBeforeLeave)
      window.removeEventListener('beforeunload', saveBeforeLeave)
    }
  }, [])

  const displayColor = paused ? '#ef2f2f' : '#111111'
  const pomodoroTotal = Number(pomodoroSessions) || 0
  let actionLabel = 'Start'
  if (mode === 'pomodoro' && !running && !paused) {
    if (pomodoroMessage.includes('Break ready')) actionLabel = 'Start Break'
    else if (pomodoroMessage.includes('Focus ready')) actionLabel = 'Start Focus'
  } else if (running && !paused) actionLabel = 'Pause'
  else if (paused) actionLabel = 'Resume'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#fbf9ff_44%,#f7f4fb_100%)] px-4 py-8 text-black sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5">
        <header className="w-full max-w-xl text-center">
          <div className="inline-flex rounded-xl border border-violet-200/80 bg-white/75 px-4 py-2 text-sm font-bold tracking-tight shadow-sm backdrop-blur">
            Time Tracker
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button className={`mode-button ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>Dashboard</button>
            <button className={`mode-button ${page === 'timer' ? 'active' : ''}`} onClick={() => setPage('timer')}>Timer</button>
            <button className={`mode-button ${page === 'history' ? 'active' : ''}`} onClick={() => { setPage('history'); refreshHistory() }}>History</button>
          </div>
        </header>

        {page === 'dashboard' ? (
          <Dashboard />
        ) : page === 'timer' ? (
          <section className="gloss-panel w-full max-w-xl rounded-3xl p-5 sm:p-7">
            <div className="mb-5 flex w-full gap-2 rounded-xl bg-neutral-100/80 p-1">
              <button className={`mode-button ${mode === 'countdown' ? 'active' : ''}`} onClick={() => switchMode('countdown')}>Countdown</button>
              <button className={`mode-button ${mode === 'pomodoro' ? 'active' : ''}`} onClick={() => switchMode('pomodoro')}>Pomodoro</button>
              <button className={`mode-button ${mode === 'normal' ? 'active' : ''}`} onClick={() => switchMode('normal')}>Normal</button>
            </div>

            {mode === 'countdown' && (
              <div className="space-y-5">
                <div className="text-center">
                  <input aria-label="Countdown time" value={running || paused ? formatTime(seconds) : timeInput} onChange={(e) => handleCountdownInput(e.target.value)} className="w-full bg-transparent text-center text-5xl font-medium tracking-[0.05em] outline-none sm:text-6xl" style={{ color: displayColor }} disabled={running || paused} inputMode="numeric" />
                  <p className="mt-1 text-xs text-neutral-400">hh:mm:ss · directly editable before starting</p>
                </div>
                <TimerTagRow tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} onEdit={openEditTag} onDelete={deleteTag} onNew={openNewTag} />
              </div>
            )}

            {mode === 'normal' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="text-5xl font-medium tracking-[0.05em] sm:text-6xl" style={{ color: displayColor }}>{formatTime(seconds)}</div>
                  <p className="mt-1 text-xs text-neutral-400">count-up timer</p>
                </div>
                <TimerTagRow tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} onEdit={openEditTag} onDelete={deleteTag} onNew={openNewTag} />
              </div>
            )}

            {mode === 'pomodoro' && (
              <div className={`space-y-5 rounded-2xl p-3 transition-colors ${pomodoroPhase === 'break' ? 'bg-amber-50/80 ring-1 ring-amber-200' : ''}`}>
                <div className="grid grid-cols-2 gap-3">
                  <TimeField label="Focus" value={pomodoroFocus} onChange={setPomodoroFocus} disabled={running || paused} />
                  <TimeField label="Break" value={pomodoroBreak} onChange={setPomodoroBreak} disabled={running || paused} />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <label className="text-xs font-semibold text-neutral-500">Sessions</label>
                  <input type="number" min="1" max="99" value={pomodoroSessions} onChange={(e) => setPomodoroSessions(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} disabled={running || paused} className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-center text-sm outline-none focus:border-violet-400" />
                </div>
                <div className="text-center">
                  <div className={`text-xs font-bold uppercase tracking-wide ${pomodoroPhase === 'break' ? 'text-amber-600' : 'text-violet-500'}`}>{pomodoroPhase === 'focus' ? 'Focus' : 'Break'}</div>
                  <div className="mt-1 text-5xl font-medium tracking-[0.05em] sm:text-6xl" style={{ color: displayColor }}>{formatTime(seconds)}</div>
                  <div className="mt-1 text-sm font-semibold text-neutral-500">{pomodoroIndex} / {pomodoroTotal}</div>
                  {pomodoroPhase === 'break' && <div className="mt-2 text-xs font-semibold text-amber-700">Break timer is waiting — it will not start automatically.</div>}
                </div>
                <TimerTagRow tags={tags} selectedTagId={selectedTagId} onSelect={setSelectedTagId} onEdit={openEditTag} onDelete={deleteTag} onNew={openNewTag} />
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {!running && !paused && <ActionButton onClick={handleStart} primary>{actionLabel}</ActionButton>}
              {running && !paused && <ActionButton onClick={handlePause}>Pause</ActionButton>}
              {paused && <ActionButton onClick={resumeFromPause} primary>Resume</ActionButton>}
              {(running || paused) && <ActionButton onClick={() => setOverlay('quit')}>Quit</ActionButton>}
              {(running || paused) && <ActionButton onClick={restartRun}>Restart</ActionButton>}
            </div>

            {pomodoroMessage && <div className={`mt-4 text-center text-sm font-bold ${pomodoroPhase === 'break' ? 'text-amber-600' : 'text-fuchsia-500'}`}>{pomodoroMessage}</div>}

            <div className="mt-7 rounded-2xl border border-violet-100 bg-white/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Selected tag</p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold"><span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: selectedTag?.color }} />{selectedTag?.name}</div>
                </div>
                <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => selectedTag && openEditTag(selectedTag)}>Edit tag</button>
              </div>
            </div>
          </section>
        ) : (
          <HistoryPage history={history} onRefresh={refreshHistory} />
        )}
      </div>

      {editorOpen && <Modal title={editingId ? 'Edit tag' : 'New tag'} onClose={() => setEditorOpen(false)}><div className="space-y-4"><label className="block text-xs font-bold text-neutral-500">Tag name<input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400" /></label><div><div className="mb-2 text-xs font-bold text-neutral-500">Choose color</div><div className="grid grid-cols-6 gap-2">{COLOR_SWATCHES.map((color) => <button key={color} aria-label={`Choose ${color}`} onClick={() => setDraftColor(color)} className={`h-7 w-7 rounded-md border-2 ${draftColor === color ? 'border-black' : 'border-white'} shadow-sm`} style={{ backgroundColor: color }} />)}</div></div><div className="flex justify-end gap-2 pt-2"><ActionButton onClick={() => setEditorOpen(false)}>Cancel</ActionButton><ActionButton onClick={saveTag} primary>Save</ActionButton></div></div></Modal>}

      {overlay === 'paused' && <Modal title="Timer paused" onClose={() => setOverlay(null)}><div className="space-y-4 text-center"><div className="text-4xl font-medium text-red-500">{formatTime(seconds)}</div>{mode === 'pomodoro' && <div className="text-xs font-semibold text-neutral-500">{pomodoroPhase === 'break' ? 'Break' : 'Focus'} · {pomodoroIndex} / {pomodoroTotal}</div>}<div className="flex justify-center gap-2"><ActionButton onClick={resumeFromPause} primary>Resume</ActionButton><ActionButton onClick={() => setOverlay('quit')}>Quit</ActionButton></div></div></Modal>}
      {overlay === 'quit' && <Modal title="Quit timer?" onClose={() => setOverlay(null)}><div className="space-y-4 text-center"><p className="text-sm text-neutral-600">Elapsed focus time will be saved. Pomodoro break time will not be saved.</p><div className="flex justify-center gap-2"><ActionButton onClick={() => setOverlay('paused')}>Keep timer</ActionButton><ActionButton onClick={quitRun} primary>Quit & save</ActionButton></div></div></Modal>}
      {overlay === 'switch' && <Modal title="Timer is running" onClose={() => setOverlay(null)}><div className="space-y-4 text-center"><p className="text-sm text-neutral-600">Stop or finish the current timer before changing modes.</p><ActionButton onClick={() => setOverlay(null)} primary>OK</ActionButton></div></Modal>}
      {overlay === 'invalid' && <Modal title="Check timer settings" onClose={() => setOverlay(null)}><div className="space-y-4 text-center"><p className="text-sm text-neutral-600">Use a valid time in hh:mm:ss. Minutes and seconds must be 00–59, and the duration must be greater than zero.</p><ActionButton onClick={() => setOverlay(null)} primary>OK</ActionButton></div></Modal>}
      {overlay === 'recovered' && <Modal title="Timer recovered" onClose={() => setOverlay(null)}><div className="space-y-4 text-center"><p className="text-sm text-neutral-600">Your timer was restored from the last saved checkpoint. The elapsed time was preserved across the refresh or page interruption.</p><ActionButton onClick={resumeFromPause} primary>Continue</ActionButton><ActionButton onClick={() => setOverlay('quit')}>Quit</ActionButton></div></Modal>}
    </main>
  )
}

function HistoryPage({ history, onRefresh }) {
  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const totalMinutes = sorted.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0)
  return (
    <section className="gloss-panel w-full max-w-xl rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Session History</h1><p className="mt-1 text-xs text-neutral-500">Every saved focus session, newest first.</p></div>
        <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={onRefresh}>Refresh</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-3 text-center"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Sessions</div><div className="mt-1 text-xl font-bold text-violet-600">{sorted.length}</div></div>
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-3 text-center"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Total Focus</div><div className="mt-1 text-xl font-bold text-violet-600">{formatDuration(totalMinutes)}</div></div>
      </div>
      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {!sorted.length && <div className="rounded-2xl border border-dashed border-violet-200 bg-white/50 p-8 text-center text-sm text-neutral-400">No sessions recorded yet.</div>}
        {sorted.map((session) => <div key={session.id || `${session.timestamp}-${session.tagName}-${session.durationMinutes}`} className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/70 p-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: session.tagColor }} /><span className="truncate text-sm font-bold">{session.tagName}</span></div><div className="mt-1 text-xs text-neutral-400">{new Date(session.timestamp).toLocaleString()}</div></div><div className="shrink-0 text-sm font-bold">{session.durationFormatted || formatDuration(session.durationMinutes)}</div></div>)}
      </div>
    </section>
  )
}

function TimerTagRow({ tags, selectedTagId, onSelect, onEdit, onDelete, onNew }) {
  return <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-neutral-400">Tag</span><button onClick={onNew} className="text-xs font-bold text-violet-600 hover:text-violet-800">+ New tag</button></div><div className="flex flex-wrap justify-center gap-2">{tags.map((tag) => <div key={tag.id} className="group relative"><button onClick={() => onSelect(tag.id)} className={`tag-chip rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedTagId === tag.id ? 'border-black/20 ring-2 ring-violet-200' : 'border-black/10'}`} style={{ backgroundColor: tag.color }}>{tag.name}</button><div className="absolute -right-1.5 -top-1.5 hidden gap-0.5 group-hover:flex"><button aria-label={`Edit ${tag.name}`} onClick={() => onEdit(tag)} className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-neutral-800 text-[9px] text-white">✎</button><button aria-label={`Delete ${tag.name}`} onClick={() => onDelete(tag)} className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-red-500 text-[9px] text-white">×</button></div></div>)}</div></div>
}

function TimeField({ label, value, onChange, disabled }) {
  return <label className="rounded-2xl border border-violet-100 bg-white/75 p-3"><span className="block text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="mt-1 w-full bg-transparent text-center text-lg font-semibold outline-none" inputMode="numeric" /></label>
}

function ActionButton({ children, onClick, primary = false }) {
  return <button onClick={onClick} className={`rounded-xl px-5 py-2 text-sm font-bold ${primary ? 'border border-violet-500 bg-violet-500 text-white shadow-sm hover:bg-violet-600' : 'soft-button'}`}>{children}</button>
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={title}><div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">×</button></div>{children}</div></div>
}

export default App
