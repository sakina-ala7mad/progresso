import React from 'react'
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatDuration(minutes) {
  const totalMinutes = Math.max(0, Number(minutes || 0))
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60)
    const m = Math.round(totalMinutes % 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.round(totalMinutes)}m`
}

function formatAxisDate(value) {
  const d = new Date(value)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatPinned(minutes) {
  if (!minutes) return '0m'
  return formatDuration(minutes)
}

export default function LineChartComponent({ data, height = 280, todayKey }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 28, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eadcff" />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 11, fill: '#737373', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#a3a3a3' }}
            tickLine={false}
            axisLine={false}
            width={38}
            tickFormatter={(v) => `${Math.round(v)}m`}
          />
          <Tooltip
            labelFormatter={(value) => `Date: ${formatAxisDate(value)}`}
            formatter={(value) => [formatDuration(value), 'Focus time']}
            contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff', background: 'rgba(255,255,255,.97)' }}
            labelStyle={{ fontWeight: 700, color: '#525252' }}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={(props) => {
              const active = props.payload?.dateKey === todayKey
              return <circle cx={props.cx} cy={props.cy} r={active ? 6 : 4.5} fill="#8b5cf6" stroke={active ? '#4d267e' : '#ffffff'} strokeWidth={active ? 2.5 : 2} />
            }}
            activeDot={{ r: 7 }}
          >
            <LabelList
              dataKey="minutes"
              position="top"
              offset={8}
              formatter={formatPinned}
              fill="#4d267e"
              fontSize={10}
              fontWeight={700}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
