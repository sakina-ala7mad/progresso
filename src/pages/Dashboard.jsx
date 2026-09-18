import React, { useEffect, useMemo, useState } from 'react'
import TodayStats from '../components/dashboard/TodayStats'

const SESSIONS_KEY = 'productivity_timer_sessions_v1'

function readSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function sameLocalDay(timestamp, reference = new Date()) {
  const date = new Date(timestamp)
  return date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate()
}

export default function Dashboard() {
  const [sessions, setSessions] = useState(readSessions)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const refresh = () => {
      setSessions(readSessions())
      setNow(new Date())
    }
    window.addEventListener('storage', refresh)
    const timer = window.setInterval(refresh, 1000)
    return () => {
      window.removeEventListener('storage', refresh)
      window.clearInterval(timer)
    }
  }, [])

  const todaySessions = useMemo(
    () => sessions.filter((session) => sameLocalDay(session.timestamp, now)).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [sessions, now],
  )

  const dateLabel = now.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })

  return (
    <div className="w-full max-w-xl">
      <TodayStats sessions={todaySessions} dateLabel={`Today: ${dateLabel}`} />
    </div>
  )
}
