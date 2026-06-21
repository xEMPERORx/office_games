import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import CardTable, { PlayerSeat } from '../CardTable';
import SettingsMenu from '../SettingsMenu';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: '#ef4444', diamonds: '#ef4444', clubs: '#d4d4d4', spades: '#d4d4d4' };

export default function TeenPattiGame({ socket }) {
  const { gameState, playerName } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [betAmount, setBetAmount] = useState(null);

  if (!gameState) return null;
  const { players, hand, status, chips, pot, currentBet, currentPlayer, activePlayers, winner, isSeen } = gameState;

  const isMyTurn = currentPlayer === playerName;
  const myStatus = status[playerName];
  const minBet = isSeen ? currentBet * 2 : currentBet;
  const maxBet = minBet * 2;

  function seeCards() { socket.emit('tp_see'); }
  function placeBet() { socket.emit('tp_bet', { amount: betAmount || minBet }); setBetAmount(null); }
  function fold() { socket.emit('tp_fold'); }
  function showAgainst(target) { socket.emit('tp_show', { targetPlayer: target }); }

  return (
    <CardTable
      players={players}
      currentPlayer={currentPlayer}
      playerName={playerName}
      topRight={
        <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-400 transition">⚙</button>
      }
      renderPlayerSeat={(p, isTurn) => {
        const folded = status[p] === 'folded';
        return (
          <PlayerSeat name={p} isActive={isTurn && !folded} avatar={folded ? '💀' : status[p] === 'blind' ? '🙈' : '👁️'} subtitle={`${chips[p]}💰`}>
            {isMyTurn && isSeen && p !== playerName && !folded && activePlayers.length > 1 && (
              <button onClick={() => showAgainst(p)} className="mt-1 text-[8px] px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-500">Show</button>
            )}
          </PlayerSeat>
        );
      }}
      renderCenter={() => (
        <div className="flex flex-col items-center gap-2">
          {winner && (
            <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/40 animate-pulse mb-2">
              <span className="text-yellow-300 font-bold text-sm">💰 {winner === playerName ? 'You won' : `${winner} won`} the pot! New round in 5s...</span>
            </div>
          )}
          <div className="px-6 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
            <span className="text-xs text-gray-400">Pot </span>
            <span className="text-2xl font-black text-yellow-400">{pot}</span>
            <span className="text-xs text-gray-500 ml-3">Bet: {currentBet}</span>
          </div>
          <div className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
            {isMyTurn ? '⚡ YOUR TURN' : `${currentPlayer}'s turn`}
          </div>
        </div>
      )}
      renderHand={() => (
        <div className="flex flex-col items-center gap-3">
          {/* Cards */}
          <div className="flex justify-center gap-3">
            {hand ? hand.map(card => (
              <div key={card.id} className="w-16 h-24 rounded-xl border flex flex-col items-center justify-center transition-all hover:-translate-y-1" style={{ background: '#1a1a2e', borderColor: SUIT_COLORS[card.suit], boxShadow: `0 0 8px ${SUIT_COLORS[card.suit]}33` }}>
                <span className="text-lg font-black" style={{ color: SUIT_COLORS[card.suit] }}>{card.value}</span>
                <span className="text-xl" style={{ color: SUIT_COLORS[card.suit] }}>{SUIT_SYMBOLS[card.suit]}</span>
              </div>
            )) : [0,1,2].map(i => (
              <div key={i} className="w-16 h-24 rounded-xl border border-gray-600 flex items-center justify-center" style={{ background: '#1a1a2e' }}>
                <span className="text-2xl">🂠</span>
              </div>
            ))}
          </div>
          {/* Controls */}
          {myStatus !== 'folded' && (
            <div className="flex justify-center gap-2 flex-wrap">
              {!isSeen && <button onClick={seeCards} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition">👁️ See</button>}
              {isMyTurn && (
                <>
                  <input type="range" min={minBet} max={maxBet} value={betAmount || minBet} onChange={e => setBetAmount(+e.target.value)} className="w-20 h-1 accent-cyan-400 self-center" />
                  <span className="text-[10px] text-gray-400 self-center w-6">{betAmount || minBet}</span>
                  <button onClick={placeBet} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition">Bet</button>
                  <button onClick={fold} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition">Fold</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      renderOverlay={() => showSettings ? <SettingsMenu socket={socket} onClose={() => setShowSettings(false)} /> : null}
    />
  );
}
