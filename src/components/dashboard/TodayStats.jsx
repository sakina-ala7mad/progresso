import React from 'react'
import PieChartComponent from './PieChartComponent'

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

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getSessionTimes(session) {
  // The stored timestamp represents the completion/quit time. Derive the start
  // from the exact stored duration so old sessions remain compatible.
  const endMs = new Date(session.timestamp).getTime()
  const durationMs = Math.max(0, Number(session.durationMinutes || 0) * 60 * 1000)
  const startMs = endMs - durationMs
  return { start: new Date(startMs), end: new Date(endMs) }
}

export default function TodayStats({ sessions, dateLabel }) {
  const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.durationMinutes || 0), 0)
  const byTag = new Map()

  sessions.forEach((session) => {
    const key = session.tagName || 'Untitled'
    const previous = byTag.get(key)
    byTag.set(key, {
      name: key,
      value: (previous?.value || 0) + Number(session.durationMinutes || 0),
      color: session.tagColor || '#C9B2FF',
    })
  })

  const chartData = [...byTag.values()].sort((a, b) => b.value - a.value)
  const barsData = chartData.map((item) => ({
    ...item,
    percent: totalMinutes > 0 ? (item.value / totalMinutes) * 100 : 0,
  }))

  return (
    <section className="gloss-panel w-full rounded-3xl p-5 sm:p-7">
      <div className="mb-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-neutral-500">{dateLabel}</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-4 text-center shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Total duration</div>
          <div className="mt-1 text-xl font-bold text-violet-600">{formatDuration(totalMinutes)}</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-4 text-center shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Sessions</div>
          <div className="mt-1 text-xl font-bold text-violet-600">{sessions.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white/65 p-3 sm:p-4">
        <div className="mb-2 text-center sm:text-left">
          <h2 className="text-sm font-bold">Today’s focus</h2>
          <p className="text-xs text-neutral-400">Total focus time by tag</p>
        </div>

        <PieChartComponent data={chartData} />

        {/* Timeline */}
        <div className="mt-4">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-bold">Timeline</h2>
              <p className="text-xs text-neutral-400">Every focus session recorded today</p>
            </div>
            <span className="text-[11px] font-semibold text-neutral-400">{sessions.length} session{sessions.length === 1 ? '' : 's'}</span>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {!sessions.length && (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-white/50 p-8 text-center text-sm text-neutral-400">
                Start a timer to create today’s first session.
              </div>
            )}
            {sessions.map((session) => {
              const { start, end } = getSessionTimes(session)
              return (
                <div
                  key={session.id || `${session.timestamp}-${session.tagName}-${session.durationMinutes}`}
                  className="rounded-2xl border border-violet-100 bg-white/80 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: session.tagColor || '#C9B2FF' }} />
                      <span className="truncate text-sm font-bold">{session.tagName || 'Untitled'}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                      {session.durationFormatted || formatDuration(session.durationMinutes)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-neutral-400">
                    <span>{formatTime(start)} – {formatTime(end)}</span>
                    <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overall tag bars */}
        <div className="mt-5 border-t border-violet-100 pt-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold">Total by tag</h2>
            <p className="text-xs text-neutral-400">All of today’s sessions combined</p>
          </div>

          {!barsData.length ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white/50 p-6 text-center text-sm text-neutral-400">
              No tag totals yet.
            </div>
          ) : (
            <div className="space-y-4">
              {barsData.map((item) => (
                <div key={item.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-xs font-bold text-neutral-700">{item.name}</span>
                    </div>
                    <div className="shrink-0 text-xs font-bold text-neutral-600">
                      {formatDuration(item.value)} · {item.percent.toFixed(0)}%
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-violet-100/80">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percent, item.percent > 0 ? 1.5 : 0)}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
