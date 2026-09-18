import { createSession, saveSession } from './sessionStorage';

export const addSampleData = () => {
  const now = new Date();
  
  // Sample tags
  const tags = [
    { name: "Reading", color: "#4CAF50" },
    { name: "Studying", color: "#FF6B6B" },
    { name: "Working", color: "#9C27B0" },
    { name: "Exercise", color: "#2196F3" },
    { name: "Coding", color: "#FF9800" }
  ];

  // Generate sample sessions for the last 30 days
  const sessions = [];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random number of sessions per day (1-5)
    const sessionsPerDay = Math.floor(Math.random() * 5) + 1;
    
    for (let j = 0; j < sessionsPerDay; j++) {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      const duration = Math.floor(Math.random() * 3600) + 300; // 5 minutes to 1 hour
      
      // Random time during the day
      const sessionTime = new Date(date);
      sessionTime.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM to 8 PM
      sessionTime.setMinutes(Math.floor(Math.random() * 60));
      sessionTime.setSeconds(Math.floor(Math.random() * 60));
      
      const session = createSession(tag, duration, sessionTime);
      sessions.push(session);
    }
  }
  
  // Save all sessions
  sessions.forEach(session => {
    saveSession(session);
  });
  
  return sessions.length;
};

export const clearAllData = () => {
  localStorage.removeItem('focus-sessions');
  localStorage.removeItem('productivity-tags');
};
