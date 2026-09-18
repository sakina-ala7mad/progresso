import { useState, useEffect } from "react";

export default function TimerDisplay({ seconds, isPaused = false, mode = "standard", onTimeChange, isEditable = true }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  
  const getDisplayColor = () => {
    if (isPaused) return "#FF6B6B"; // Red when paused
    return "#000000"; // Black by default for all modes
  };

  const formatTimeString = () => {
    return `${hh}:${mm}:${ss}`;
  };

  const handleClick = () => {
    if (isEditable && mode !== "countup") {
      setIsEditing(true);
      setEditValue(formatTimeString());
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onTimeChange && editValue) {
      const [h, m, s] = editValue.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
        const totalSeconds = h * 3600 + m * 60 + s;
        onTimeChange(totalSeconds);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const handleInputChange = (e) => {
    let value = e.target.value.replace(/[^\d:]/g, '');
    
    // Auto-format as user types
    if (value.length === 2 && !value.includes(':')) {
      value = value + ':';
    } else if (value.length === 5 && value.split(':').length === 2) {
      value = value + ':';
    }
    
    // Limit to HH:MM:SS format
    if (value.length <= 8) {
      setEditValue(value);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      setEditValue(formatTimeString());
    }
  }, [seconds, isEditing]);

  if (isEditing) {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
        <input
          type="text"
          value={editValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          autoFocus
          style={{ 
            textAlign: "center", 
            fontSize: 48, 
            fontWeight: 700,
            color: getDisplayColor(),
            border: "2px solid #4ECDC4",
            borderRadius: 8,
            padding: "8px 16px",
            backgroundColor: "white",
            outline: "none",
            width: "200px"
          }}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={handleClick}
      style={{ 
        textAlign: "center", 
        fontSize: 48, 
        fontWeight: 700,
        color: getDisplayColor(),
        margin: "20px 0",
        cursor: isEditable && mode !== "countup" ? "pointer" : "default",
        padding: "8px 16px",
        borderRadius: 8,
        transition: "background-color 0.2s ease"
      }}
      onMouseEnter={(e) => {
        if (isEditable && mode !== "countup") {
          e.target.style.backgroundColor = "#f8f9fa";
        }
      }}
      onMouseLeave={(e) => {
        if (isEditable && mode !== "countup") {
          e.target.style.backgroundColor = "transparent";
        }
      }}
    >
      {formatTimeString()}
    </div>
  );
}
  