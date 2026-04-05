// src/components/Dashboard.tsx
import { useState } from 'react';

export function Dashboard() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Math Homework', due: 'Feb 23', done: false },
    { id: 2, title: 'History Essay', due: 'Feb 25', done: true },
  ]);

  const toggleDone = (id: number) => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id} className="mb-2 flex justify-between items-center">
            <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
              {task.title} - due {task.due}
            </span>
            <button
              onClick={() => toggleDone(task.id)}
              className="px-2 py-1 bg-blue-500 text-white rounded"
            >
              {task.done ? 'Undo' : 'Done'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}