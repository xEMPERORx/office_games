import { useState } from 'react';
import { GAME_RULES } from './rulesData';

export default function GameRules({ gameType, inline }) {
  const [open, setOpen] = useState(false);
  const rules = GAME_RULES[gameType];
  if (!rules) return null;

  if (inline) {
    return (
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 text-xs max-w-sm">
        <div className="font-bold text-white mb-1">{rules.emoji} {rules.name} <span className="text-gray-500">({rules.players} players)</span></div>
        <div className="text-gray-400 mb-2 italic">{rules.summary}</div>
        <ul className="space-y-0.5 text-gray-300">
          {rules.rules.map((r, i) => <li key={i} className="leading-tight">{r.startsWith('  ') ? <span className="ml-3 text-gray-500">{r.trim()}</span> : `• ${r}`}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-7 h-7 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-xs text-gray-400 hover:text-white hover:border-cyan-400 transition" title="How to play">
        ?
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold text-white mb-1">{rules.emoji} {rules.name}</div>
            <div className="text-xs text-gray-400 mb-1">{rules.players} players</div>
            <div className="text-sm text-cyan-300 mb-3 italic">{rules.summary}</div>
            <div className="text-xs text-gray-300 space-y-1.5">
              {rules.rules.map((r, i) => (
                <div key={i} className={r.startsWith('  ') ? 'ml-4 text-gray-500' : 'flex gap-1.5'}>
                  {r.startsWith('  ') ? r.trim() : <><span className="text-cyan-400">•</span> {r}</>}
                </div>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 rounded-lg bg-gray-700 text-white text-xs font-bold hover:bg-gray-600 transition">Got it!</button>
          </div>
        </div>
      )}
    </>
  );
}
