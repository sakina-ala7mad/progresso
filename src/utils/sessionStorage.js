// Session data management utilities

export const createSession = (tag, durationSeconds, startTime) => {
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationFormatted = formatDuration(durationSeconds);
  
  return {
    id: Date.now() + Math.random(),
    tagName: tag.name,
    tagColor: tag.color,
    durationSeconds,
    durationMinutes,
    durationFormatted,
    timestamp: new Date(startTime).toISOString(),
    startTime: new Date(startTime),
    endTime: new Date(startTime.getTime() + durationSeconds * 1000)
  };
};

export const saveSession = (session) => {
  try {
    const existingSessions = getSessions();
    const updatedSessions = [...existingSessions, session];
    localStorage.setItem('focus-sessions', JSON.stringify(updatedSessions));
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
};

export const getSessions = () => {
  try {
    const sessions = localStorage.getItem('focus-sessions');
    return sessions ? JSON.parse(sessions).map(session => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime)
    })) : [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

export const getSessionsByDateRange = (startDate, endDate) => {
  const sessions = getSessions();
  return sessions.filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
};

export const getTodaySessions = () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  return getSessionsByDateRange(startOfDay, endOfDay);
};

export const getWeekSessions = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return getSessionsByDateRange(startOfWeek, endOfWeek);
};

export const getMonthSessions = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  return getSessionsByDateRange(startOfMonth, endOfMonth);
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

export const getTotalDuration = (sessions) => {
  return sessions.reduce((total, session) => total + session.durationSeconds, 0);
};

export const groupSessionsByTag = (sessions) => {
  const grouped = {};
  sessions.forEach(session => {
    if (!grouped[session.tagName]) {
      grouped[session.tagName] = {
        tagName: session.tagName,
        tagColor: session.tagColor,
        totalDuration: 0,
        sessionCount: 0
      };
    }
    grouped[session.tagName].totalDuration += session.durationSeconds;
    grouped[session.tagName].sessionCount += 1;
  });
  return Object.values(grouped);
};

export const getSessionsByDay = (sessions) => {
  const grouped = {};
  sessions.forEach(session => {
    const dateKey = session.startTime.toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: new Date(session.startTime),
        totalDuration: 0,
        sessionCount: 0
      };
    }
    grouped[dateKey].totalDuration += session.durationSeconds;
    grouped[dateKey].sessionCount += 1;
  });
  return Object.values(grouped).sort((a, b) => a.date - b.date);
};

export const getSessionsByWeek = (sessions) => {
  const grouped = {};
  sessions.forEach(session => {
    const weekStart = new Date(session.startTime);
    weekStart.setDate(session.startTime.getDate() - session.startTime.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekKey = weekStart.toDateString();
    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        weekStart,
        totalDuration: 0,
        sessionCount: 0
      };
    }
    grouped[weekKey].totalDuration += session.durationSeconds;
    grouped[weekKey].sessionCount += 1;
  });
  return Object.values(grouped).sort((a, b) => a.weekStart - b.weekStart);
};
