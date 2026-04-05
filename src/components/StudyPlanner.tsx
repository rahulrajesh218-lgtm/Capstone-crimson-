// src/components/StudyPlanner.tsx
import { useState } from 'react';

export function StudyPlanner() {
  const [sessions, setSessions] = useState<{ id: number; subject: string; date: string }[]>([]);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');

  const addSession = () => {
    if (!subject || !date) return;
    setSessions([...sessions, { id: Date.now(), subject, date }]);
    setSubject('');
    setDate('');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Study Planner</h2>
      <div className="mb-4 flex gap-2">
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject"
          className="border p-2"
        />
        <input
          value={date}
          onChange={e => setDate(e.target.value)}
          type="date"
          className="border p-2"
        />
        <button onClick={addSession} className="px-4 py-2 bg-blue-500 text-white rounded">
          Add
        </button>
      </div>
      <ul>
        {sessions.map(session => (
          <li key={session.id}>
            {session.subject} - {session.date}
          </li>
        ))}
      </ul>
    </div>
  );
}