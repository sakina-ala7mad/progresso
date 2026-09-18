export default function TimerControls({
    state, onStart, onPause, onResume, onQuit, onReset, onShowPauseModal, mode = "standard"
  }) {
    const primaryBtn = {
      padding: "12px 24px",
      borderRadius: 12,
      border: "none",
      background: "#4ECDC4",
      color: "white",
      cursor: "pointer",
      fontSize: 16,
      fontWeight: 600,
      minWidth: 120
    };

    const secondaryBtn = {
      padding: "12px 24px",
      borderRadius: 12,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
      fontSize: 16,
      fontWeight: 600,
      minWidth: 120
    };

    const quitBtn = {
      padding: "12px 24px",
      borderRadius: 12,
      border: "none",
      background: "#FF6B6B",
      color: "white",
      cursor: "pointer",
      fontSize: 16,
      fontWeight: 600,
      minWidth: 120
    };
  
    return (
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20 }}>
        {state === "idle" && (
          <button style={primaryBtn} onClick={onStart}>
            Start
          </button>
        )}
        {state === "running" && mode !== "countup" && (
          <button style={primaryBtn} onClick={onShowPauseModal}>
            Pause
          </button>
        )}
        {state === "running" && mode === "countup" && (
          <button style={primaryBtn} onClick={onShowPauseModal}>
            Stop
          </button>
        )}
        {state === "paused" && (
          <button style={primaryBtn} onClick={onResume}>
            Resume
          </button>
        )}
        {state === "finished" && (
          <>
            <button style={primaryBtn} onClick={onReset}>
              Continue
            </button>
            <button style={quitBtn} onClick={onQuit}>
              Quit
            </button>
          </>
        )}
      </div>
    );
  }
  