import { useEffect, useRef } from 'react';

export default function GameLog({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="absolute bottom-16 left-2 w-48 max-h-28 overflow-y-auto rounded-lg bg-black/60 border border-gray-700 p-2 z-10 backdrop-blur-sm">
      <div className="text-[8px] text-gray-500 mb-1 font-bold uppercase">Game Log</div>
      {logs.slice(-20).map((log, i) => (
        <div key={i} className="text-[9px] text-gray-400 py-0.5 border-b border-gray-800 last:border-0">{log}</div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
