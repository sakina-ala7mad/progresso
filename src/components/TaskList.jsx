import React, { useEffect, useState } from "react";
import TaskItem from "./TaskItem";
import sample from "../data/sampleTasks";
import { load, save } from "../utils/storage";

export default function TaskList() {
  const [tasks, setTasks] = useState(() => load("tasks", sample));

  useEffect(() => {
    save("tasks", tasks);
  }, [tasks]);

  function toggleDone(id) {
    // simple toggle example: mark as done by removing or toggling a flag (we'll extend later)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="text-gray-500">No tasks yet — add one!</div>
      ) : (
        tasks.map(task => <TaskItem key={task.id} task={task} onToggleDone={toggleDone} />)
      )}
    </div>
  );
}
