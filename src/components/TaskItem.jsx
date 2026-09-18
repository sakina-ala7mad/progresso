import React from "react";

export default function TaskItem({ task, onToggleDone }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border">
      <div>
        <div className="font-medium">{task.title}</div>
        <div className="text-xs text-gray-500">{task.category} • {task.priority} • {task.size}</div>
      </div>
      <div className="flex items-center gap-2">
        {task.timed && <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700">⏱</span>}
        <button onClick={() => onToggleDone(task.id)} className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">
          Toggle
        </button>
      </div>
    </div>
  );
}
