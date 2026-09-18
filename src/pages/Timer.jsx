import { useEffect, useRef, useState } from "react";
import TimerDisplay from "../components/timer/TimerDisplay";
import TimerControls from "../components/timer/TimerControls";
import TimerSetup from "../components/timer/TimerSetup";
import TagManager from "../components/timer/TagManager";
import Modal from "../components/timer/Modal";
import { createSession, saveSession } from "../utils/sessionStorage";

export default function Timer() {
  const [mode, setMode] = useState("standard"); // standard, pomodoro, countup
  const [total, setTotal] = useState(45 * 60);   // default 45 min
  const [left, setLeft] = useState(total);
  const [state, setState] = useState("idle");    // idle | running | paused | finished
  const [selectedTag, setSelectedTag] = useState(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const tickRef = useRef(null);

  // Pomodoro specific state
  const [pomodoroState, setPomodoroState] = useState({
    currentSession: 0,
    totalSessions: 3,
    isFocusTime: true,
    focusTime: 25 * 60,
    breakTime: 10 * 60
  });

  // Countup timer state
  const [countupTime, setCountupTime] = useState(0);

  // If total changes while idle, sync "left"
  useEffect(() => {
    if (state === "idle") {
      if (mode === "pomodoro") {
        setLeft(pomodoroState.isFocusTime ? pomodoroState.focusTime : pomodoroState.breakTime);
      } else {
        setLeft(total);
      }
    }
  }, [total, state, mode, pomodoroState]);

  useEffect(() => {
    if (state !== "running") return;

    tickRef.current = setInterval(() => {
      if (mode === "countup") {
        setCountupTime((s) => s + 1);
      } else {
        setLeft((s) => {
          if (s <= 1) {
            clearInterval(tickRef.current);
            tickRef.current = null;
            
            if (mode === "pomodoro") {
              handlePomodoroComplete();
            } else {
              // Save session when timer finishes naturally
              if (sessionStartTime && selectedTag) {
                const sessionDuration = Math.floor((new Date() - sessionStartTime) / 1000);
                if (sessionDuration > 0) {
                  const session = createSession(selectedTag, sessionDuration, sessionStartTime);
                  saveSession(session);
                }
              }
              setState("finished");
            }
            return 0;
          }
          return s - 1;
        });
      }
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state, mode]);

  const handlePomodoroComplete = () => {
    if (pomodoroState.isFocusTime) {
      // Save focus session when completed
      if (sessionStartTime && selectedTag) {
        const sessionDuration = Math.floor((new Date() - sessionStartTime) / 1000);
        if (sessionDuration > 0) {
          const session = createSession(selectedTag, sessionDuration, sessionStartTime);
          saveSession(session);
        }
      }
      
      // Focus time completed, start break
      setPomodoroState(prev => ({
        ...prev,
        isFocusTime: false,
        currentSession: prev.currentSession + 1
      }));
      setLeft(pomodoroState.breakTime);
      setState("idle");
      setSessionStartTime(new Date()); // Start timing the break
    } else {
      // Break completed, check if more sessions
      if (pomodoroState.currentSession < pomodoroState.totalSessions) {
        setPomodoroState(prev => ({
          ...prev,
          isFocusTime: true
        }));
        setLeft(pomodoroState.focusTime);
        setState("idle");
        setSessionStartTime(new Date()); // Start timing the next focus session
      } else {
        // All sessions completed
        setState("finished");
        setSessionStartTime(null);
      }
    }
  };

  const start = () => {
    if (mode === "countup") {
      setCountupTime(0);
    } else if (left <= 0) {
      if (mode === "pomodoro") {
        setLeft(pomodoroState.isFocusTime ? pomodoroState.focusTime : pomodoroState.breakTime);
      } else {
        setLeft(total);
      }
    }
    setSessionStartTime(new Date());
    setState("running");
  };

  const pause = () => {
    setState("paused");
    setShowPauseModal(false);
  };

  const resume = () => {
    setState("running");
    setShowPauseModal(false);
  };

  const quit = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    
    // Save session if it was running and has a tag
    if (sessionStartTime && selectedTag && state === "running") {
      const sessionDuration = Math.floor((new Date() - sessionStartTime) / 1000);
      if (sessionDuration > 0) {
        const session = createSession(selectedTag, sessionDuration, sessionStartTime);
        saveSession(session);
      }
    }
    
    setState("idle");
    setSessionStartTime(null);
    if (mode === "countup") {
      setCountupTime(0);
    } else if (mode === "pomodoro") {
      setLeft(pomodoroState.isFocusTime ? pomodoroState.focusTime : pomodoroState.breakTime);
    } else {
      setLeft(total);
    }
    setShowPauseModal(false);
  };

  const reset = () => {
    // Save session if it was running and has a tag
    if (sessionStartTime && selectedTag && state === "running") {
      const sessionDuration = Math.floor((new Date() - sessionStartTime) / 1000);
      if (sessionDuration > 0) {
        const session = createSession(selectedTag, sessionDuration, sessionStartTime);
        saveSession(session);
      }
    }
    
    setSessionStartTime(null);
    if (mode === "countup") {
      setCountupTime(0);
    } else if (mode === "pomodoro") {
      setPomodoroState(prev => ({
        ...prev,
        currentSession: 0,
        isFocusTime: true
      }));
      setLeft(pomodoroState.focusTime);
    } else {
      setLeft(total);
    }
    setState("idle");
  };

  const getModeIcon = (modeName) => {
    switch (modeName) {
      case "standard": return "⏳";
      case "pomodoro": return "🕐";
      case "countup": return "⏱️";
      default: return "⏳";
    }
  };

  const getModeColor = (modeName) => {
    return mode === modeName ? "#4ECDC4" : "#ddd";
  };

  return (
    <div style={{ 
      background: "#ffffff", 
      padding: 32, 
      borderRadius: 20, 
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      maxWidth: 600,
      width: "90%",
      margin: "0 auto",
      textAlign: "center",
      minHeight: "70vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      {/* Mode Selector */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: 20, 
        marginBottom: 30 
      }}>
        {["standard", "pomodoro", "countup"].map((modeName) => (
          <button
            key={modeName}
            onClick={() => setMode(modeName)}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: getModeColor(modeName),
              cursor: "pointer",
              fontSize: 24,
              transition: "all 0.3s ease"
            }}
          >
            {getModeIcon(modeName)}
          </button>
        ))}
      </div>

      {/* Timer Setup */}
      <TimerSetup 
        defaultSeconds={total} 
        onChange={setTotal} 
        mode={mode}
        pomodoroSettings={pomodoroState}
        onPomodoroChange={setPomodoroState}
      />

      {/* Timer Display */}
      <TimerDisplay 
        seconds={mode === "countup" ? countupTime : left} 
        isPaused={state === "paused"}
        mode={mode}
        onTimeChange={setTotal}
        isEditable={state === "idle"}
      />

      {/* Tag Display */}
      <div style={{ marginBottom: 20 }}>
        {selectedTag ? (
          <div
            onClick={() => setShowTagManager(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: 20,
              backgroundColor: selectedTag.color + "20",
              border: `2px solid ${selectedTag.color}`,
              cursor: "pointer",
              gap: 8
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: selectedTag.color
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 600 }}>{selectedTag.name}</span>
          </div>
        ) : (
          <button
            onClick={() => setShowTagManager(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "2px dashed #ddd",
              background: "white",
              cursor: "pointer",
              fontSize: 16,
              color: "#666"
            }}
          >
            + Select Tag
          </button>
        )}
      </div>

      {/* Pomodoro Info */}
      {mode === "pomodoro" && (
        <div style={{ 
          marginBottom: 20, 
          padding: 16, 
          backgroundColor: "#f8f9fa", 
          borderRadius: 12 
        }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
            {pomodoroState.isFocusTime ? "Focus Time" : "Break Time"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            Session {pomodoroState.currentSession}/{pomodoroState.totalSessions}
          </div>
        </div>
      )}

      {/* Controls */}
      <TimerControls
        state={state}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onQuit={quit}
        onReset={reset}
        onShowPauseModal={() => setShowPauseModal(true)}
        mode={mode}
      />

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onTagSelect={(tag) => {
          setSelectedTag(tag);
          setShowTagManager(false);
        }}
        selectedTag={selectedTag}
      />

      {/* Pause Modal */}
      <Modal isOpen={showPauseModal} onClose={() => setShowPauseModal(false)}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 600 }}>
            {mode === "countup" ? "Timer Stopped" : "Timer Paused"}
          </h3>
          {mode !== "countup" && (
            <div style={{ fontSize: 16, color: "#666", marginBottom: 20 }}>
              Pause {pauseCount}/5
            </div>
          )}
        </div>
        
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button
            onClick={resume}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: "#4ECDC4",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
              minWidth: 120
            }}
          >
            {mode === "countup" ? "Continue" : "Resume"}
          </button>
          <button
            onClick={quit}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: "#FF6B6B",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
              minWidth: 120
            }}
          >
            Quit
          </button>
        </div>
      </Modal>
    </div>
  );
}


