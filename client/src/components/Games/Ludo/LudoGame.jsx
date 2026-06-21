import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import SettingsMenu from '../SettingsMenu';

const COLOR_STYLES = {
  red: { bg: '#dc2626', glow: 'rgba(220,38,38,0.5)' },
  blue: { bg: '#2563eb', glow: 'rgba(37,99,235,0.5)' },
  green: { bg: '#16a34a', glow: 'rgba(22,163,74,0.5)' },
  yellow: { bg: '#ca8a04', glow: 'rgba(202,138,4,0.5)' },
};

export default function LudoGame({ socket }) {
  const { gameState, playerName } = useGame();
  const [showSettings, setShowSettings] = useState(false);

  if (!gameState) return null;
  const { players, playerColors, tokens, currentPlayer, lastRoll, mustMove, winner } = gameState;

  const isMyTurn = currentPlayer === playerName;
  const myColor = playerColors[playerName];
  const myTokens = tokens[playerName] || [];

  function rollDice() {
    socket.emit('roll_dice');
  }

  function moveToken(tokenId) {
    socket.emit('move_token', { tokenId });
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden rounded-lg p-4" style={{ background: '#0d0d1a' }}>
      <button onClick={() => setShowSettings(true)} className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-400 transition">⚙</button>
      {showSettings && <SettingsMenu socket={socket} onClose={() => setShowSettings(false)} />}

      {/* Players info */}
      <div className="flex justify-center gap-4 mb-4">
        {players.map(p => {
          const c = COLOR_STYLES[playerColors[p]];
          const isTurn = p === currentPlayer;
          const finished = tokens[p].filter(t => t.state === 'finished').length;
          return (
            <div key={p} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${isTurn ? 'scale-110' : 'opacity-70'}`} style={{ borderColor: c.bg, background: isTurn ? c.bg + '22' : 'transparent', boxShadow: isTurn ? `0 0 12px ${c.glow}` : 'none', color: c.bg }}>
              {p} {p === playerName ? '(you)' : ''} — {finished}/4 ✓
            </div>
          );
        })}
      </div>

      {/* Board visualization - simplified token view */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-6">
          {players.map(p => {
            const c = COLOR_STYLES[playerColors[p]];
            return (
              <div key={p} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: c.bg }}>{playerColors[p]}</span>
                <div className="grid grid-cols-2 gap-2">
                  {tokens[p].map(token => {
                    const isClickable = isMyTurn && mustMove && p === playerName && token.state !== 'finished';
                    return (
                      <button
                        key={token.id}
                        onClick={() => isClickable && moveToken(token.id)}
                        disabled={!isClickable}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${isClickable ? 'animate-pulse cursor-pointer hover:scale-110' : ''}`}
                        style={{
                          borderColor: c.bg,
                          background: token.state === 'finished' ? c.bg : token.state === 'active' ? c.bg + '44' : '#1a1a2e',
                          color: token.state === 'finished' ? '#fff' : c.bg,
                          boxShadow: isClickable ? `0 0 10px ${c.glow}` : 'none',
                        }}
                      >
                        {token.state === 'home' ? '🏠' : token.state === 'finished' ? '✓' : token.position >= 100 ? `H${token.position - 100 + 1}` : token.position}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dice + Controls */}
      <div className="flex flex-col items-center gap-3 mt-4">
        {winner ? (
          <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/40 animate-pulse">
            <span className="text-yellow-300 font-bold text-sm">🎉 {winner === playerName ? 'You won' : `${winner} won`}! New round in 5s...</span>
          </div>
        ) : (
          <div className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
            {isMyTurn ? (mustMove ? 'Pick a token to move' : 'Roll the dice!') : `${currentPlayer}'s turn`}
          </div>
        )}

        <div className="flex items-center gap-4">
          {lastRoll && (
            <div className="w-12 h-12 rounded-xl bg-gray-800 border-2 border-cyan-400 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_10px_rgba(34,211,238,0.4)]">
              {lastRoll}
            </div>
          )}
          <button onClick={rollDice} disabled={!isMyTurn || mustMove} className="px-5 py-2 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg">
            🎲 Roll
          </button>
        </div>
      </div>
    </div>
  );
}
