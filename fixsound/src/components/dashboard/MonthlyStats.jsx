import React, { useMemo, useState } from 'react'
import PieChartComponent from './PieChartComponent'
import LineChartComponent from './LineChartComponent'

function formatDuration(minutes) {
  const totalMinutes = Math.max(0, Math.round(Number(minutes || 0)))
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }
  return `${totalMinutes}m`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfMonth(date) {
  const d = startOfMonth(date)
  d.setMonth(d.getMonth() + 1)
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

function formatMonth(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

export default function MonthlyStats({ sessions, now }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const selectedMonth = useMemo(() => {
    const d = startOfMonth(now)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [now, monthOffset])

  const monthEnd = endOfMonth(selectedMonth)
  const selectedSessions = useMemo(() => sessions.filter((session) => {
    const time = new Date(session.timestamp).getTime()
    return Number.isFinite(time) && time >= selectedMonth.getTime() && time < monthEnd.getTime()
  }), [sessions, selectedMonth, monthEnd])

  const weeks = useMemo(() => {
    const first = new Date(selectedMonth)
    const last = new Date(monthEnd)
    const result = []
    let cursor = new Date(first)
    while (cursor < last && result.length < 5) {
      const weekStart = new Date(cursor)
      const weekEnd = new Date(cursor)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const clippedEnd = weekEnd < last ? weekEnd : last
      result.push({ start: weekStart, end: clippedEnd })
      cursor = weekEnd
    }
    return result
  }, [selectedMonth, monthEnd])

  const lineData = weeks.map((week, index) => {
    const minutes = selectedSessions.reduce((sum, session) => {
      const t = new Date(session.timestamp).getTime()
      return t >= week.start.getTime() && t < week.end.getTime() ? sum + Number(session.durationMinutes || 0) : sum
    }, 0)
    return {
      date: week.start.toISOString(),
      dateKey: `week-${index}`,
      minutes: Math.round(minutes * 100) / 100,
      label: formatShortDate(week.start),
    }
  })

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

  return (
    <section className="w-full rounded-3xl gloss-panel p-5 sm:p-7">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Monthly</h2>
        <p className="mt-1 text-sm text-neutral-500">{formatMonth(selectedMonth)}</p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-bold" onClick={() => setMonthOffset((v) => v - 1)}>← Previous month</button>
        <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setMonthOffset(0)} disabled={monthOffset === 0}>Current month</button>
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
              <h3 className="text-sm font-bold">Weekly focus time</h3>
              <p className="text-xs text-neutral-400">Five weekly periods inside this month · totals are pinned above each point</p>
            </div>
            <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">5 weeks</span>
          </div>
          <LineChartComponent data={lineData} todayKey={null} />
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] font-semibold text-neutral-400">
            {lineData.map((item, index) => <span key={item.dateKey}>W{index + 1}: {item.label}</span>)}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white/65 p-3 sm:p-4">
          <div className="mb-2">
            <h3 className="text-sm font-bold">Tag usage</h3>
            <p className="text-xs text-neutral-400">Monthly total focus time by tag</p>
          </div>
          <PieChartComponent data={chartData} height={310} />
          {!chartData.length && <p className="pb-4 text-center text-sm text-neutral-400">No sessions recorded in this month.</p>}
          <div className="mt-4 border-t border-violet-100 pt-5">
            <div className="mb-3"><h3 className="text-sm font-bold">Total by tag</h3><p className="text-xs text-neutral-400">Summed duration and percentage of all focus time this month</p></div>
            {barsData.length ? <div className="space-y-4">{barsData.map((item) => (
              <div key={item.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-neutral-700">{item.name}</span></div><div className="shrink-0 text-xs font-bold text-neutral-600">{formatDuration(item.value)} · {item.percent.toFixed(0)}%</div></div>
                <div className="h-3 overflow-hidden rounded-full bg-violet-100/80"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.percent, item.percent > 0 ? 1.5 : 0)}%`, backgroundColor: item.color }} /></div>
              </div>
            ))}</div> : <div className="rounded-2xl border border-dashed border-violet-200 bg-white/50 p-6 text-center text-sm text-neutral-400">No tag totals yet.</div>}
          </div>
        </div>
      </div>
    </section>
  )
}
