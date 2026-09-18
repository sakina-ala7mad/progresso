import React, { useEffect, useMemo, useState } from 'react'
import TodayStats from '../components/dashboard/TodayStats'
import WeeklyStats from '../components/dashboard/WeeklyStats'

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

function sameLocalDay(timestamp, reference) {
  const date = new Date(timestamp)
  return date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate()
}

export default function Dashboard() {
  const [sessions, setSessions] = useState(readSessions)
  const [now, setNow] = useState(() => new Date())
  const [tab, setTab] = useState('today')

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
    () => sessions
      .filter((session) => sameLocalDay(session.timestamp, now))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [sessions, now],
  )

  const dateLabel = now.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
  const tabs = [
    ['today', 'Today'],
    ['weekly', 'Weekly'],
    ['monthly', 'Monthly'],
    ['yearly', 'Yearly'],
  ]

  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-violet-100 bg-white/70 p-1.5 shadow-sm">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-w-[88px] flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${tab === id ? 'bg-violet-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-violet-50 hover:text-violet-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'today' && <TodayStats sessions={todaySessions} dateLabel={`Today: ${dateLabel}`} />}
      {tab === 'weekly' && <WeeklyStats sessions={sessions} now={now} />}
      {tab === 'monthly' && <DashboardFutureTab title="Monthly" />}
      {tab === 'yearly' && <DashboardFutureTab title="Yearly" />}
    </div>
  )
}

function DashboardFutureTab({ title }) {
  return (
    <section className="gloss-panel w-full rounded-3xl p-6 text-center sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">This dashboard period will be built after Weekly is tested and approved.</p>
    </section>
  )
}
