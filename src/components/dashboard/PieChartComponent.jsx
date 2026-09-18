import React from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

function formatDuration(minutes) {
  const totalSeconds = Math.max(0, Math.round(Number(minutes || 0) * 60))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  if (m) return `${m}m`
  return `${totalSeconds}s`
}

function outsideLabel({ cx, cy, midAngle, outerRadius, percent, name, value, index }) {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 26
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const textAnchor = x >= cx ? 'start' : 'end'
  const safePercent = Math.round((percent || 0) * 100)
  return (
    <g>
      <line
        x1={cx + (outerRadius - 2) * Math.cos(-midAngle * RADIAN)}
        y1={cy + (outerRadius - 2) * Math.sin(-midAngle * RADIAN)}
        x2={cx + (outerRadius + 16) * Math.cos(-midAngle * RADIAN)}
        y2={cy + (outerRadius + 16) * Math.sin(-midAngle * RADIAN)}
        stroke="#a78bfa"
        strokeWidth={1.2}
      />
      <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" className="fill-neutral-700 text-[10px] font-semibold">
        {safePercent}% — {formatDuration(value)} {name}
      </text>
    </g>
  )
}

export default function PieChartComponent({ data, height = 300 }) {
  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl bg-violet-50/60 text-sm text-neutral-400">
        No sessions recorded today.
      </div>
    )
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 70, bottom: 20, left: 70 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="36%"
            outerRadius="76%"
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
            labelLine={false}
            label={outsideLabel}
            isAnimationActive
          >
            {data.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value) => [formatDuration(value), 'Focus']} contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff', background: 'rgba(255,255,255,.96)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
