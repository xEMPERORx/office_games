import { useState, useEffect } from 'react';

export default function TurnTimer({ endTime }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [endTime]);

  if (remaining <= 0) return null;
  const pct = (remaining / 30) * 100;
  const urgent = remaining <= 5;

  return (
    <div className="absolute top-2 left-2 z-20">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${urgent ? 'bg-red-900/50 border-red-500 text-red-300 animate-pulse' : 'bg-gray-800/80 border-gray-600 text-gray-300'}`}>
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-200 ${urgent ? 'bg-red-500' : 'bg-cyan-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <span>{remaining}s</span>
      </div>
    </div>
  );
}
