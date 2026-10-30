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

function startOfYear(date) {
  const d = new Date(date)
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function monthEnd(year, month) {
  return new Date(year, month + 1, 1)
}

function formatMonthShort(monthIndex) {
  return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(2000, monthIndex, 1))
}

export default function YearlyStats({ sessions, now }) {
  const [yearOffset, setYearOffset] = useState(0)
  const year = now.getFullYear() + yearOffset
  const yearStart = useMemo(() => startOfYear(new Date(year, 0, 1)), [year])
  const yearEnd = useMemo(() => new Date(year + 1, 0, 1), [year])

  const selectedSessions = useMemo(() => sessions.filter((session) => {
    const time = new Date(session.timestamp).getTime()
    return Number.isFinite(time) && time >= yearStart.getTime() && time < yearEnd.getTime()
  }), [sessions, yearStart, yearEnd])

  const lineData = useMemo(() => Array.from({ length: 12 }, (_, month) => {
    const start = new Date(year, month, 1)
    const end = monthEnd(year, month)
    const minutes = selectedSessions.reduce((sum, session) => {
      const t = new Date(session.timestamp).getTime()
      return t >= start.getTime() && t < end.getTime() ? sum + Number(session.durationMinutes || 0) : sum
    }, 0)
    return { date: start.toISOString(), dateKey: `month-${month}`, minutes: Math.round(minutes * 100) / 100, label: formatMonthShort(month) }
  }), [selectedSessions, year])

  const totalMinutes = selectedSessions.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0)
  const tagMap = new Map()
  selectedSessions.forEach((session) => {
    const name = session.tagName || 'Untitled'
    const old = tagMap.get(name)
    tagMap.set(name, { name, value: (old?.value || 0) + Number(session.durationMinutes || 0), color: old?.color || session.tagColor || '#C9B2FF' })
  })
  const chartData = [...tagMap.values()].sort((a, b) => b.value - a.value)
  const barsData = chartData.map((item) => ({ ...item, percent: totalMinutes > 0 ? (item.value / totalMinutes) * 100 : 0 }))

  return (
    <section className="w-full rounded-3xl gloss-panel p-5 sm:p-7">
      <div className="mb-5 text-center"><h2 className="text-2xl font-bold tracking-tight">Yearly</h2><p className="mt-1 text-sm text-neutral-500">{year}</p></div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-bold" onClick={() => setYearOffset((v) => v - 1)}>← Previous year</button>
        <button className="soft-button rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setYearOffset(0)} disabled={yearOffset === 0}>Current year</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-4 text-center shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Total focus</div><div className="mt-1 text-xl font-bold text-violet-600">{formatDuration(totalMinutes)}</div></div>
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-4 text-center shadow-sm"><div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Sessions</div><div className="mt-1 text-xl font-bold text-violet-600">{selectedSessions.length}</div></div>
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-violet-100 bg-white/65 p-3 sm:p-4">
          <div className="mb-2 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold">Monthly focus time</h3><p className="text-xs text-neutral-400">Total focus time for each month · totals are pinned above every point</p></div><span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">12 months</span></div>
          <LineChartComponent data={lineData} todayKey={null} />
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] font-semibold text-neutral-400">{lineData.map((item) => <span key={item.dateKey}>{item.label}</span>)}</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white/65 p-3 sm:p-4">
          <div className="mb-2"><h3 className="text-sm font-bold">Tag usage</h3><p className="text-xs text-neutral-400">Yearly total focus time by tag</p></div>
          <PieChartComponent data={chartData} height={310} />
          {!chartData.length && <p className="pb-4 text-center text-sm text-neutral-400">No sessions recorded in this year.</p>}
          <div className="mt-4 border-t border-violet-100 pt-5"><div className="mb-3"><h3 className="text-sm font-bold">Total by tag</h3><p className="text-xs text-neutral-400">Summed duration and percentage of all focus time this year</p></div>
            {barsData.length ? <div className="space-y-4">{barsData.map((item) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-neutral-700">{item.name}</span></div><div className="shrink-0 text-xs font-bold text-neutral-600">{formatDuration(item.value)} · {item.percent.toFixed(0)}%</div></div><div className="h-3 overflow-hidden rounded-full bg-violet-100/80"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.percent, item.percent > 0 ? 1.5 : 0)}%`, backgroundColor: item.color }} /></div></div>)}</div> : <div className="rounded-2xl border border-dashed border-violet-200 bg-white/50 p-6 text-center text-sm text-neutral-400">No tag totals yet.</div>}
          </div>
        </div>
      </div>
    </section>
  )
}
