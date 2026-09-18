import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LineChartComponent = ({ data, title, height = 300, dataKey = 'totalDuration' }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-sm text-gray-600">
            Duration: {data.formattedDuration}
          </p>
          <p className="text-sm text-gray-600">
            Sessions: {data.sessionCount}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatXAxisLabel = (tickItem) => {
    if (dataKey === 'totalDuration') {
      // For daily data
      return new Date(tickItem).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      // For weekly data
      return new Date(tickItem).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatYAxisLabel = (value) => {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxisLabel}
            stroke="#666"
            fontSize={10}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            tickFormatter={formatYAxisLabel}
            stroke="#666"
            fontSize={10}
            tick={{ fontSize: 10 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke="#4ECDC4" 
            strokeWidth={2}
            dot={{ fill: '#4ECDC4', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#4ECDC4', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
