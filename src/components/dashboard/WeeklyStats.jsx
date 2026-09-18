import React, { useMemo, useState } from 'react'
import PieChartComponent from './PieChartComponent'
import LineChartComponent from './LineChartComponent'

function formatDuration(minutes) {
  const totalSeconds = Math.max(0, Math.round(Number(minutes || 0) * 60))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  if (m && s) return `${m}m ${s}s`
  if (m) return `${m}m`
  return `${s}s`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date) {
  const d = startOfDay(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(date) {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export default function WeeklyStats({ sessions, now }) {
  const [weekOffset, setWeekOffset] = useState(0)

  const week = useMemo(() => {
    const currentStart = startOfDay(now)
    currentStart.setDate(currentStart.getDate() - 6)
    currentStart.setDate(currentStart.getDate() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(currentStart)
      d.setDate(currentStart.getDate() + index)
      return d
    })
  }, [now, weekOffset])

  const weekEnd = week[6]
  const weekStart = week[0]
  const selectedSessions = useMemo(() => sessions.filter((session) => {
    const time = new Date(session.timestamp).getTime()
    return Number.isFinite(time) && time >= weekStart.getTime() && time < weekEnd.getTime() + 86400000
  }), [sessions, weekStart, weekEnd])

  const dayMap = new Map(week.map((d) => [dayKey(d), { date: d, minutes: 0 }]))
  selectedSessions.forEach((session) => {
    const item = dayMap.get(dayKey(new Date(session.timestamp)))
    if (item) item.minutes += Number(session.durationMinutes || 0)
  })

  const todayKey = dayKey(now)
  const lineData = week.map((d) => ({
    date: d.toISOString(),
    dateKey: dayKey(d),
    minutes: Math.round((dayMap.get(dayKey(d))?.minutes || 0) * 100) / 100,
  }))

  const totalMinutes = selectedSessions.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0)
  const tagMap = new Map()
  selectedSessions.forEach((session) => {
    const name = session.tagName || 'Untitled'
    const old = tagMap.get(name)
    tagMap.set(name, {
      name,
      value: (old?.value || 0) + Number(session.durationMinutes || 0),
      color: old?.color || session.tagColor || '#C9B2FF',
    })
  })
  const chartData = [...tagMap.values()].sort((a, b) => b.value - a.value)
  const barsData = chartData.map((item) => ({ ...item, percent: totalMinutes > 0 ? (item.value / totalMinutes) * 100 : 0 }))

  const range = `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`
  const isCurrentWeek = weekOffset === 0

  return (
    <section className="w-full rounded-3xl gloss-panel p-5 sm:p-7">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Weekly</h2>
        <p className="mt-1 text-sm text-neutral-500">{range}</p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          className="soft-button rounded-lg px-3 py-1.5 text-xs font-bold"
          onClick={() => setWeekOffset((value) => value - 1)}
          aria-label="View previous week"
        >
          ← Previous week
        </button>
        <button
          className="soft-button rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setWeekOffset(0)}
          disabled={isCurrentWeek}
        >
          Current week
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-4 text-center shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Total focus</div>
          <div className="mt-1 text-xl font-bold text-violet-600">{formatDuration(totalMinutes)}</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-4 text-center shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Sessions</div>
          <div className="mt-1 text-xl font-bold text-violet-600">{selectedSessions.length}</div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-violet-100 bg-white/65 p-3 sm:p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Daily focus time</h3>
              <p className="text-xs text-neutral-400">Dates are shown as MM/DD · totals are pinned above each point</p>
            </div>
            <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">7 days</span>
          </div>
          <LineChartComponent data={lineData} todayKey={isCurrentWeek ? todayKey : null} />
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] font-semibold text-neutral-400">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-violet-800 bg-violet-500" />Today</span>
            <span>Previous days/weeks stay available with Previous week</span>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white/65 p-3 sm:p-4">
          <div className="mb-2">
            <h3 className="text-sm font-bold">Tag usage</h3>
            <p className="text-xs text-neutral-400">Weekly total focus time by tag</p>
          </div>
          <PieChartComponent data={chartData} height={310} />
          {!chartData.length && <p className="pb-4 text-center text-sm text-neutral-400">No sessions recorded in this week.</p>}

          <div className="mt-4 border-t border-violet-100 pt-5">
            <div className="mb-3">
              <h3 className="text-sm font-bold">Total by tag</h3>
              <p className="text-xs text-neutral-400">Summed duration and percentage of all focus time this week</p>
            </div>
            {!barsData.length ? (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-white/50 p-6 text-center text-sm text-neutral-400">No tag totals yet.</div>
            ) : (
              <div className="space-y-4">
                {barsData.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-xs font-bold text-neutral-700">{item.name}</span>
                      </div>
                      <div className="shrink-0 text-xs font-bold text-neutral-600">{formatDuration(item.value)} · {item.percent.toFixed(0)}%</div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-violet-100/80">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.percent, item.percent > 0 ? 1.5 : 0)}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
