import { useState } from 'react';

export default function Scoreboard({ scoreboard }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(scoreboard || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-8 right-2 z-40 w-7 h-7 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs hover:border-cyan-400 transition" title="Scoreboard">🏆</button>
      {open && (
        <div className="fixed bottom-16 right-2 z-40 w-44 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <div className="text-xs text-white font-bold mb-2">🏆 Scoreboard</div>
          {entries.map(([player, wins], i) => (
            <div key={player} className="flex justify-between text-[10px] py-0.5">
              <span className="text-gray-300">{i === 0 ? '👑 ' : ''}{player}</span>
              <span className="text-yellow-400">{wins} win{wins > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
