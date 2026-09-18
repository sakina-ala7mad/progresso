import React, { useState } from "react";

export default function TimerSetup({ defaultSeconds, onChange, mode = "standard", pomodoroSettings, onPomodoroChange }) {
  const [hours, setHours] = useState(Math.floor(defaultSeconds / 3600));
  const [minutes, setMinutes] = useState(Math.floor((defaultSeconds % 3600) / 60));
  const [seconds, setSeconds] = useState(defaultSeconds % 60);

  // Update local state when defaultSeconds changes
  React.useEffect(() => {
    setHours(Math.floor(defaultSeconds / 3600));
    setMinutes(Math.floor((defaultSeconds % 3600) / 60));
    setSeconds(defaultSeconds % 60);
  }, [defaultSeconds]);

  const updateTime = (h, m, s) => {
    const totalSeconds = h * 3600 + m * 60 + s;
    onChange(totalSeconds);
  };

  if (mode === "pomodoro") {
    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const parseTime = (timeString) => {
      const [h, m, s] = timeString.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };

    return (
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: 20, 
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Focus time:</label>
            <input
              type="text"
              value={formatTime(pomodoroSettings.focusTime)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.match(/^\d{2}:\d{2}:\d{2}$/)) {
                  onPomodoroChange({
                    ...pomodoroSettings,
                    focusTime: parseTime(value)
                  });
                }
              }}
              style={{ 
                padding: 8, 
                borderRadius: 8, 
                border: "1px solid #ccc",
                fontSize: 16,
                width: "100px",
                textAlign: "center"
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Break time:</label>
            <input
              type="text"
              value={formatTime(pomodoroSettings.breakTime)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.match(/^\d{2}:\d{2}:\d{2}$/)) {
                  onPomodoroChange({
                    ...pomodoroSettings,
                    breakTime: parseTime(value)
                  });
                }
              }}
              style={{ 
                padding: 8, 
                borderRadius: 8, 
                border: "1px solid #ccc",
                fontSize: 16,
                width: "100px",
                textAlign: "center"
              }}
            />
          </div>
        </div>
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          backgroundColor: "#f8f9fa", 
          borderRadius: 8 
        }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
            Sessions completed: {pomodoroSettings.currentSession}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {pomodoroSettings.currentSession} / {pomodoroSettings.totalSessions}
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Total Sessions:</label>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <button 
              onClick={() => onPomodoroChange({
                ...pomodoroSettings,
                totalSessions: Math.max(1, pomodoroSettings.totalSessions - 1)
              })}
              style={{ 
                padding: "6px 12px", 
                borderRadius: 6, 
                border: "1px solid #ddd",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600
              }}
            >-</button>
            <span style={{ fontSize: 18, fontWeight: 600, minWidth: "30px" }}>{pomodoroSettings.totalSessions}</span>
            <button 
              onClick={() => onPomodoroChange({
                ...pomodoroSettings,
                totalSessions: Math.min(10, pomodoroSettings.totalSessions + 1)
              })}
              style={{ 
                padding: "6px 12px", 
                borderRadius: 6, 
                border: "1px solid #ddd",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600
              }}
            >+</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
        <input
          type="number"
          min="0"
          max="23"
          value={hours}
          onChange={(e) => {
            const h = Math.max(0, Math.min(23, Number(e.target.value || 0)));
            setHours(h);
            updateTime(h, minutes, seconds);
          }}
          style={{ 
            width: 60, 
            padding: 8, 
            borderRadius: 8, 
            border: "1px solid #ccc",
            fontSize: 16,
            textAlign: "center"
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 600 }}>:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={(e) => {
            const m = Math.max(0, Math.min(59, Number(e.target.value || 0)));
            setMinutes(m);
            updateTime(hours, m, seconds);
          }}
          style={{ 
            width: 60, 
            padding: 8, 
            borderRadius: 8, 
            border: "1px solid #ccc",
            fontSize: 16,
            textAlign: "center"
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 600 }}>:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={seconds}
          onChange={(e) => {
            const s = Math.max(0, Math.min(59, Number(e.target.value || 0)));
            setSeconds(s);
            updateTime(hours, minutes, s);
          }}
          style={{ 
            width: 60, 
            padding: 8, 
            borderRadius: 8, 
            border: "1px solid #ccc",
            fontSize: 16,
            textAlign: "center"
          }}
        />
      </div>
    </div>
  );
}
