import React, { useState, useEffect } from 'react';
import { getTodaySessions, getTotalDuration, groupSessionsByTag, formatDuration } from '../../utils/sessionStorage';
import PieChartComponent from './PieChartComponent';
import LineChartComponent from './LineChartComponent';

const TodayStats = () => {
  const [sessions, setSessions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activeCardTab, setActiveCardTab] = useState({ left: 'timeline', right: 'pie' });

  useEffect(() => {
    const loadTodayData = () => {
      const todaySessions = getTodaySessions();
      setSessions(todaySessions);

      // Prepare chart data
      const groupedByTag = groupSessionsByTag(todaySessions);
      const totalDuration = getTotalDuration(todaySessions);
      
      const chartData = groupedByTag.map(tag => ({
        tagName: tag.tagName,
        tagColor: tag.tagColor,
        value: tag.totalDuration,
        formattedDuration: formatDuration(tag.totalDuration),
        percentage: totalDuration > 0 ? Math.round((tag.totalDuration / totalDuration) * 100) : 0
      }));

      setChartData(chartData);
    };

    loadTodayData();
    
    // Refresh data every minute to keep it current
    const interval = setInterval(loadTodayData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const totalDuration = getTotalDuration(sessions);
  const totalSessions = sessions.length;
  const today = new Date();

  const renderLeftCardContent = () => {
    if (activeCardTab.left === 'timeline') {
      return sessions.length > 0 ? (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {sessions
            .sort((a, b) => b.startTime - a.startTime)
            .map((session, index) => (
              <div 
                key={session.id} 
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: session.tagColor }}
                />
                <span className="font-medium text-gray-800">
                  {formatDuration(session.durationSeconds)}
                </span>
                <span className="text-gray-600 capitalize">
                  {session.tagName}
                </span>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">⏰</div>
          <p className="text-gray-500 text-sm">No sessions today</p>
        </div>
      );
    } else if (activeCardTab.left === 'line') {
      // For today, we'll show hourly data
      const hourlyData = [];
      for (let i = 0; i < 24; i++) {
        const hourSessions = sessions.filter(session => 
          new Date(session.startTime).getHours() === i
        );
        hourlyData.push({
          hour: i,
          totalDuration: getTotalDuration(hourSessions),
          formattedDuration: formatDuration(getTotalDuration(hourSessions))
        });
      }
      
      return sessions.length > 0 ? (
        <div className="h-48">
          <LineChartComponent 
            data={hourlyData} 
            title=""
            height={180}
            dataKey="totalDuration"
          />
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📈</div>
          <p className="text-gray-500 text-sm">No data to display</p>
        </div>
      );
    }
  };

  const renderRightCardContent = () => {
    if (activeCardTab.right === 'pie') {
      return sessions.length > 0 ? (
        <>
          <div className="mb-4">
            <PieChartComponent 
              data={chartData} 
              title=""
              height={200}
            />
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.tagColor }}
                />
                <span className="text-gray-700">
                  {item.percentage}% — {item.formattedDuration} {item.tagName}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-500 text-sm">No data to display</p>
        </div>
      );
    } else if (activeCardTab.right === 'timeline') {
      return sessions.length > 0 ? (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {sessions
            .sort((a, b) => b.startTime - a.startTime)
            .map((session, index) => (
              <div 
                key={session.id} 
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: session.tagColor }}
                />
                <span className="font-medium text-gray-800">
                  {formatDuration(session.durationSeconds)}
                </span>
                <span className="text-gray-600 capitalize">
                  {session.tagName}
                </span>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">⏰</div>
          <p className="text-gray-500 text-sm">No sessions today</p>
        </div>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {today.toLocaleDateString('en-US', { 
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit' 
            }).replace(/\//g, '/')}
          </h2>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800">
              {formatDuration(totalDuration)}
            </div>
            <div className="text-sm text-gray-600">
              {totalSessions} times
            </div>
          </div>
        </div>

        {/* Left Card Tabs */}
        <div className="flex mb-4">
          <button
            onClick={() => setActiveCardTab(prev => ({ ...prev, left: 'timeline' }))}
            className={`px-3 py-1 text-xs rounded-l-lg ${
              activeCardTab.left === 'timeline' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveCardTab(prev => ({ ...prev, left: 'line' }))}
            className={`px-3 py-1 text-xs rounded-r-lg ${
              activeCardTab.left === 'line' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Line Chart
          </button>
        </div>

        {renderLeftCardContent()}

        <div className="flex gap-2 mt-4">
          <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Edit
          </button>
          <button className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
            Delete
          </button>
          <button className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* Right Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {today.toLocaleDateString('en-US', { 
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit' 
            }).replace(/\//g, '/')}
          </h2>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800">
              {formatDuration(totalDuration)}
            </div>
            <div className="text-sm text-gray-600">
              {totalSessions} times
            </div>
          </div>
        </div>

        {/* Right Card Tabs */}
        <div className="flex mb-4">
          <button
            onClick={() => setActiveCardTab(prev => ({ ...prev, right: 'pie' }))}
            className={`px-3 py-1 text-xs rounded-l-lg ${
              activeCardTab.right === 'pie' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setActiveCardTab(prev => ({ ...prev, right: 'timeline' }))}
            className={`px-3 py-1 text-xs rounded-r-lg ${
              activeCardTab.right === 'timeline' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Timeline
          </button>
        </div>

        {renderRightCardContent()}

        <div className="flex gap-2 mt-4">
          <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Edit
          </button>
          <button className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
            Delete
          </button>
          <button className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodayStats;
