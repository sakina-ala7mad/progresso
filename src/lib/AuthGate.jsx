import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hasSupabaseConfig, supabase } from './supabaseClient'

const LEGACY_KEYS = new Set(['focus-sessions', 'productivity-tags'])
const isAppKey = (key) => key.startsWith('productivity_') || LEGACY_KEYS.has(key)
const PENDING_SYNC_KEY = '__progresso_pending_sync_v1'
const CACHE_READY_PREFIX = '__progresso_cloud_cache_v1:'

function readPendingChanges() {
  try {
    const rows = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]')
    return new Map(Array.isArray(rows) ? rows : [])
  } catch {
    return new Map()
  }
}

function savePendingChanges(changes) {
  try { localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([...changes.entries()])) } catch {}
}

function readLocalSnapshot() {
  const snapshot = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && isAppKey(key)) snapshot[key] = localStorage.getItem(key) ?? ''
  }
  return snapshot
}

function normalizeSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('The backup should be a JSON object exported from Progresso.')
  }
  const output = {}
  for (const [key, rawValue] of Object.entries(input)) {
    if (!isAppKey(key)) continue
    output[key] = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue)
  }
  return output
}

function countRows(snapshot) {
  const parse = (key) => {
    try { return JSON.parse(snapshot[key] || 'null') } catch { return null }
  }
  const notes = parse('productivity_notes_workspace_v1')
  return {
    sessions: Array.isArray(parse('productivity_timer_sessions_v1')) ? parse('productivity_timer_sessions_v1').length : 0,
    tags: Array.isArray(parse('productivity_timer_tags_v1')) ? parse('productivity_timer_tags_v1').length : 0,
    habits: Array.isArray(parse('productivity_habits_v1')) ? parse('productivity_habits_v1').length : 0,
    notes: Array.isArray(notes?.notes) ? notes.notes.length : 0,
    folders: Array.isArray(notes?.folders) ? notes.folders.length : 0,
    keys: Object.keys(snapshot).length,
  }
}

function applyRemoteSnapshot(rows, pending = new Map()) {
  const wanted = new Set(rows.map((row) => row.storage_key))
  for (const row of rows) {
    if (!pending.has(row.storage_key)) localStorage.setItem(row.storage_key, row.value)
  }
  for (const key of Object.keys(readLocalSnapshot())) {
    if (!wanted.has(key) && !pending.has(key)) localStorage.removeItem(key)
  }
  for (const [key, change] of pending) {
    if (change.value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, change.value)
  }
  window.dispatchEvent(new Event('productivity:sessions-updated'))
}

async function fetchCloudRows(userId) {
  const { data, error } = await supabase
    .from('app_storage')
    .select('storage_key,value,updated_at')
    .eq('user_id', userId)
  if (error) throw error
  return data || []
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dataState, setDataState] = useState('loading')
  const [candidate, setCandidate] = useState(null)
  const [syncStatus, setSyncStatus] = useState('Synced')
  const [cloudVersion, setCloudVersion] = useState(0)
  const userId = session?.user?.id || null
  const initializedUser = useRef(null)
  const remoteValues = useRef(new Map())
  const pendingChanges = useRef(new Map())
  const syncTimer = useRef(null)
  const suppressLocalEvents = useRef(false)

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setAuthReady(true)
      return undefined
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message)
      setSession(data?.session || null)
      setAuthReady(true)
    }).catch((sessionError) => {
      setError(sessionError.message || 'Could not check your sign-in status.')
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const flushPending = useCallback(async () => {
    if (!userId || !supabase) return false
    if (!pendingChanges.current.size) return true
    const changes = [...pendingChanges.current.entries()]
    setSyncStatus('Syncing…')
    try {
      const changedRows = changes
        .filter(([, change]) => change.value !== null)
        .map(([storage_key, change]) => ({ user_id: userId, storage_key, value: change.value }))
      if (changedRows.length) {
        const { error: upsertError } = await supabase
          .from('app_storage')
          .upsert(changedRows, { onConflict: 'user_id,storage_key' })
        if (upsertError) throw upsertError
        for (const row of changedRows) remoteValues.current.set(row.storage_key, row.value)
      }
      for (const [storageKey, change] of changes.filter(([, item]) => item.value === null)) {
        const { error: deleteError } = await supabase
          .from('app_storage')
          .delete()
          .eq('user_id', userId)
          .eq('storage_key', storageKey)
        if (deleteError) throw deleteError
        remoteValues.current.delete(storageKey)
      }
      for (const [key, change] of changes) {
        if (pendingChanges.current.get(key) === change) pendingChanges.current.delete(key)
      }
      savePendingChanges(pendingChanges.current)
      setSyncStatus(pendingChanges.current.size ? 'Syncing…' : 'Synced')
      return true
    } catch (syncError) {
      savePendingChanges(pendingChanges.current)
      setSyncStatus(navigator.onLine ? 'Waiting to sync' : 'Offline · saved on this device')
      return false
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !supabase || initializedUser.current === userId) return
    let cancelled = false
    initializedUser.current = userId
    setDataState('loading')
    setError('')
    pendingChanges.current = readPendingChanges()
    fetchCloudRows(userId).then((rows) => {
      if (cancelled) return
      remoteValues.current = new Map(rows.map((row) => [row.storage_key, row.value]))
      const pending = pendingChanges.current
      if (rows.length || pending.size) {
        applyRemoteSnapshot(rows, pending)
        localStorage.setItem(`${CACHE_READY_PREFIX}${userId}`, '1')
        setDataState('ready')
        if (pending.size) void flushPending()
      } else {
        setCandidate(readLocalSnapshot())
        setDataState('import')
      }
    }).catch((loadError) => {
      if (cancelled) return
      const hasCloudCache = localStorage.getItem(`${CACHE_READY_PREFIX}${userId}`) === '1'
      if (hasCloudCache) {
        pendingChanges.current = readPendingChanges()
        setSyncStatus(navigator.onLine ? 'Waiting to sync' : 'Offline · saved on this device')
        setDataState('ready')
      } else {
        initializedUser.current = null
        setError(`Connect to the internet once to load your Progresso data. ${loadError.message}`)
        setDataState('error')
      }
    })
    return () => { cancelled = true }
  }, [userId, flushPending])

  useEffect(() => {
    if (dataState !== 'ready' || !userId || !supabase) return undefined
    const originalSet = Storage.prototype.setItem
    const originalRemove = Storage.prototype.removeItem
    const queueChange = (key, value) => {
      if (!isAppKey(key) || suppressLocalEvents.current) return
      pendingChanges.current.set(key, { value })
      savePendingChanges(pendingChanges.current)
      setSyncStatus('Syncing…')
      if (syncTimer.current) clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(flushPending, 350)
    }
    Storage.prototype.setItem = function (key, value) {
      const result = originalSet.call(this, key, value)
      if (this === window.localStorage) queueChange(String(key), String(value))
      return result
    }
    Storage.prototype.removeItem = function (key) {
      const result = originalRemove.call(this, key)
      if (this === window.localStorage) queueChange(String(key), null)
      return result
    }
    const receiveRemote = async () => {
      try {
        if (!(await flushPending())) return
        const rows = await fetchCloudRows(userId)
        const next = new Map(rows.map((row) => [row.storage_key, row.value]))
        const previous = remoteValues.current
        const cloudChanged = next.size !== previous.size || [...next].some(([key, value]) => previous.get(key) !== value)
        suppressLocalEvents.current = true
        for (const [key, value] of next) {
          if (!pendingChanges.current.has(key) && localStorage.getItem(key) !== value) {
            originalSet.call(localStorage, key, value)
            if (key === 'productivity_timer_sessions_v1') window.dispatchEvent(new Event('productivity:sessions-updated'))
          }
        }
        for (const key of remoteValues.current.keys()) {
          if (!next.has(key) && !pendingChanges.current.has(key)) originalRemove.call(localStorage, key)
        }
        suppressLocalEvents.current = false
        remoteValues.current = next
        if (cloudChanged) setCloudVersion((version) => version + 1)
        localStorage.setItem(`${CACHE_READY_PREFIX}${userId}`, '1')
        setSyncStatus(pendingChanges.current.size ? 'Syncing…' : 'Synced')
      } catch (syncError) {
        suppressLocalEvents.current = false
        setSyncStatus(navigator.onLine ? 'Waiting to sync' : 'Offline · saved on this device')
      }
    }
    const onStorage = (event) => {
      if (event.key && isAppKey(event.key)) queueChange(event.key, event.newValue)
    }
    const onFocus = () => { void receiveRemote() }
    const onOnline = () => { void receiveRemote() }
    const onOffline = () => setSyncStatus('Offline · saved on this device')
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const poll = setInterval(() => { void receiveRemote() }, 15000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(poll)
      if (syncTimer.current) clearTimeout(syncTimer.current)
      Storage.prototype.setItem = originalSet
      Storage.prototype.removeItem = originalRemove
    }
  }, [dataState, flushPending, userId])

  const counts = useMemo(() => candidate ? countRows(candidate) : null, [candidate])

  async function submitAuth(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = authMode === 'sign-up'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) throw result.error
      if (authMode === 'sign-up' && !result.data.session) {
        setMessage('Check your email to confirm the account, then come back here and sign in.')
      } else {
        setMessage('Signed in. Loading your Progresso data…')
      }
    } catch (authError) {
      setError(authError.message || 'Could not complete sign-in.')
    } finally {
      setBusy(false)
    }
  }

  async function selectBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const parsed = JSON.parse(await file.text())
      const normalized = normalizeSnapshot(parsed)
      if (!Object.keys(normalized).length) throw new Error('No Progresso storage keys were found in that file.')
      setCandidate(normalized)
    } catch (fileError) {
      setError(fileError.message || 'Could not read that backup file.')
    }
  }

  async function importCandidate() {
    if (!userId || !supabase || !candidate || !Object.keys(candidate).length) return
    setBusy(true)
    setError('')
    try {
      const rows = Object.entries(candidate).map(([storage_key, value]) => ({ user_id: userId, storage_key, value }))
      const { error: importError } = await supabase.from('app_storage').upsert(rows, { onConflict: 'user_id,storage_key' })
      if (importError) throw importError
      const imported = rows.map((row) => ({ storage_key: row.storage_key, value: row.value }))
      remoteValues.current = new Map(imported.map((row) => [row.storage_key, row.value]))
      applyRemoteSnapshot(imported)
      localStorage.setItem(`${CACHE_READY_PREFIX}${userId}`, '1')
      pendingChanges.current = new Map()
      savePendingChanges(pendingChanges.current)
      setDataState('ready')
      setSyncStatus('Synced')
    } catch (importError) {
      setError(`Import did not finish. Your backup file is still unchanged. ${importError.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    await supabase.auth.signOut()
    initializedUser.current = null
    remoteValues.current = new Map()
    pendingChanges.current = new Map()
    setDataState('loading')
    setBusy(false)
  }

  if (!hasSupabaseConfig || !supabase) {
    return <SetupMessage text="The local Supabase settings are missing. Add the project URL and publishable key to .env.local, then restart the app." />
  }
  if (!authReady) return <SetupMessage text="Checking your Progresso account…" />

  if (!session) {
    return <div className="min-h-screen bg-gradient-to-br from-violet-100 via-rose-50 to-amber-100 px-4 py-10 text-neutral-800">
      <section className="mx-auto max-w-md rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center"><div className="text-4xl">⏱️</div><h1 className="mt-2 text-2xl font-extrabold">Progresso</h1><p className="mt-1 text-sm text-neutral-500">Sign in to keep your data with you across devices.</p></div>
        <form onSubmit={submitAuth} className="space-y-4">
          <label className="block text-sm font-semibold">Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-violet-500" /></label>
          <label className="block text-sm font-semibold">Password<input type="password" required minLength={6} autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-violet-500" /></label>
          <button disabled={busy} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : authMode === 'sign-up' ? 'Create my account' : 'Sign in'}</button>
        </form>
        <button type="button" onClick={() => { setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setMessage('') }} className="mt-4 w-full text-sm font-semibold text-violet-700">{authMode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
        {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  }

  if (dataState === 'loading') return <SetupMessage text="Loading your cloud data…" />
  if (dataState === 'error') return <div className="min-h-screen bg-violet-50 p-6"><section className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow"><h1 className="text-xl font-bold">Could not open Progresso</h1><p className="mt-3 text-sm text-red-700">{error}</p><button onClick={() => { initializedUser.current = null; setError(''); setDataState('loading') }} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">Try again</button></section></div>

  if (dataState === 'import') {
    return <div className="min-h-screen bg-gradient-to-br from-violet-100 via-rose-50 to-amber-100 px-4 py-10 text-neutral-800">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-extrabold">Bring your existing data to the cloud</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Your Supabase account is ready, but it has no Progresso records yet. Choose the data from this browser or your fresh JSON backup. Nothing uploads until you press the import button.</p>
        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <div className="font-bold">This browser{counts?.keys ? ` · ${counts.keys} storage items` : ''}</div>
          {counts && <p className="mt-1 text-xs leading-5 text-neutral-600">{counts.sessions} sessions · {counts.tags} tags · {counts.habits} habits · {counts.notes} notes · {counts.folders} folders</p>}
          <button disabled={!counts?.keys || busy} onClick={importCandidate} className="mt-3 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Import these records to my Supabase account</button>
        </div>
        <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
          <label className="block font-bold">Or choose a backup file<input type="file" accept=".json,application/json" onChange={selectBackup} className="mt-2 block w-full text-sm" /></label>
          {candidate && <p className="mt-2 text-xs text-neutral-600">Selected data: {counts?.sessions} sessions · {counts?.tags} tags · {counts?.habits} habits · {counts?.notes} notes · {counts?.folders} folders</p>}
          {candidate && <button disabled={busy} onClick={importCandidate} className="mt-3 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Import selected backup to my Supabase account</button>}
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} onClick={signOut} className="mt-5 text-sm font-semibold text-neutral-500">Sign out</button>
      </section>
    </div>
  }

  return <div className="authenticated-app">
    <div className="account-controls" aria-live="polite">
      {syncStatus !== 'Synced' && <span className="sync-status">{syncStatus}</span>}
      <button disabled={busy} onClick={signOut} className="account-signout">Sign out</button>
    </div>
    {error && <div role="status" className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">{error}</div>}
    <div key={cloudVersion}>{children}</div>
  </div>
}

function SetupMessage({ text }) {
  return <div className="flex min-h-screen items-center justify-center bg-violet-50 px-6 text-center"><div className="max-w-md rounded-2xl bg-white p-6 text-sm text-neutral-700 shadow">{text}</div></div>
}
