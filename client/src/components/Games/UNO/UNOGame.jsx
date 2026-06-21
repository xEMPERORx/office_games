import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import UNOCard from './UNOCard';
import SettingsMenu from '../SettingsMenu';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const AVATARS = ['🎮', '🕹️', '🃏', '🎲', '🎯', '🏆', '⚡', '🔥', '🌟', '💎'];

// Simple sound player using Web Audio API
function playSound(type) {
  if (window.__soundMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    if (type === 'play') {
      osc.frequency.value = 520;
      osc.type = 'sine';
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'draw') {
      osc.frequency.value = 300;
      osc.type = 'triangle';
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'uno') {
      osc.frequency.value = 800;
      osc.type = 'square';
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) { /* ignore audio errors */ }
}

export default function UNOGame({ socket }) {
  const { gameState, playerName } = useGame();
  const [colorPicker, setColorPicker] = useState(null);
  const [animatingCard, setAnimatingCard] = useState(null);
  const [unoCalled, setUnoCalled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!gameState) return null;
  const { hand, topCard, currentPlayer, handCounts, players, winner, direction } = gameState;

  const isMyTurn = currentPlayer === playerName;
  const opponents = players.filter(p => p !== playerName);
  const showUnoButton = isMyTurn && hand && hand.length === 2 && !unoCalled;

  function playCard(card) {
    if (!isMyTurn) return;
    if (card.color === 'wild') {
      setColorPicker(card.id);
      return;
    }
    setAnimatingCard(card.id);
    playSound('play');
    setTimeout(() => {
      socket.emit('play_card', { cardId: card.id });
      setAnimatingCard(null);
    }, 250);
  }

  function pickColor(color) {
    playSound('play');
    setAnimatingCard(colorPicker);
    setTimeout(() => {
      socket.emit('play_card', { cardId: colorPicker, chosenColor: color });
      setColorPicker(null);
      setAnimatingCard(null);
    }, 250);
  }

  function drawCard() {
    playSound('draw');
    socket.emit('draw_card');
  }

  function callUno() {
    playSound('uno');
    socket.emit('call_uno');
    setUnoCalled(true);
    setTimeout(() => setUnoCalled(false), 3000);
  }

  const opponentPositions = getArcPositions(opponents.length);

  return (
    <div className="relative flex flex-col h-full overflow-hidden rounded-lg" style={{ background: '#0d0d1a' }}>
      {/* Felt texture overlay */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a3e 0%, #0a0a1a 100%)', backgroundSize: '100% 100%' }} />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\'/%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23ffffff\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />

      {/* Content */}
      <div className="relative flex flex-col h-full z-10">

        {/* Settings gear icon */}
        <button onClick={() => setShowSettings(true)} className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-400 transition">
          ⚙
        </button>

        {showSettings && <SettingsMenu socket={socket} onClose={() => setShowSettings(false)} />}

        {/* Opponents in arc */}
        <div className="relative h-[35%] w-full min-h-[120px]">
          {opponents.map((p, i) => {
            const pos = opponentPositions[i];
            const isTurn = p === currentPlayer;
            const avatar = AVATARS[players.indexOf(p) % AVATARS.length];
            return (
              <div key={p} className="absolute flex flex-col items-center transition-all duration-300" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, 0)' }}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-300 ${isTurn ? 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.6)] scale-110' : 'border-gray-600 bg-gray-800/80'}`}>
                  {avatar}
                </div>
                {/* Name */}
                <span className={`text-[10px] mt-1 font-bold ${isTurn ? 'text-cyan-300' : 'text-gray-400'}`}>{p}</span>
                {/* Fanned cards */}
                <div className="flex mt-1 -space-x-3">
                  {Array.from({ length: Math.min(handCounts[p] || 0, 5) }).map((_, ci) => (
                    <UNOCard key={ci} faceDown small />
                  ))}
                </div>
                <span className="text-[9px] text-gray-500">{handCounts[p]}</span>
              </div>
            );
          })}
        </div>

        {/* Center: direction + discard + draw */}
        <div className="flex items-center justify-center gap-8 py-3">
          <span className="text-3xl select-none" style={{ color: 'rgba(34,211,238,0.4)' }}>{direction === 1 ? '↻' : '↺'}</span>

          <div className="flex flex-col items-center">
            <UNOCard card={topCard} />
            <span className="text-[9px] text-gray-500 mt-1">Discard</span>
          </div>

          <button onClick={drawCard} disabled={!isMyTurn} className="flex flex-col items-center group disabled:opacity-30 transition">
            <div className="relative">
              <UNOCard faceDown />
              <div className="absolute inset-0 rounded-xl bg-cyan-400/0 group-hover:bg-cyan-400/10 transition" />
            </div>
            <span className="text-[9px] text-gray-500 mt-1">Draw</span>
          </button>

          <span className="text-3xl select-none" style={{ color: 'rgba(34,211,238,0.4)' }}>{direction === 1 ? '↻' : '↺'}</span>
        </div>

        {/* Turn indicator + UNO button */}
        <div className="flex items-center justify-center gap-4 py-1">
          {winner ? (
            <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/40 animate-pulse">
              <span className="text-yellow-300 font-bold text-sm">🎉 {winner === playerName ? 'You won' : `${winner} won`}! New round in 5s...</span>
            </div>
          ) : (
            <div className={`text-sm font-bold transition-all duration-300 ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
              {isMyTurn ? '⚡ YOUR TURN' : `${currentPlayer}'s turn`}
            </div>
          )}
          {showUnoButton && (
            <button onClick={callUno} className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-red-500 to-yellow-500 text-white animate-bounce shadow-[0_0_12px_rgba(239,68,68,0.5)]">
              🔥 UNO!
            </button>
          )}
        </div>

        {/* Player hand */}
        <div className="flex justify-center items-end pb-3 pt-1 flex-wrap gap-1 mt-auto">
          {hand && hand.map((card, i) => (
            <div
              key={card.id}
              className={`transition-all duration-200 ${animatingCard === card.id ? 'opacity-0 -translate-y-20 scale-75' : ''}`}
              style={{ transform: animatingCard === card.id ? undefined : `rotate(${(i - (hand.length - 1) / 2) * 1.5}deg)` }}
            >
              <UNOCard card={card} onClick={() => playCard(card)} animating={animatingCard === card.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Color picker modal */}
      {colorPicker !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 shadow-2xl">
            <div className="text-sm text-white mb-3 text-center font-bold">Pick a color</div>
            <div className="flex gap-3">
              {COLORS.map(c => (
                <button key={c} onClick={() => pickColor(c)} className={`w-12 h-12 rounded-full border-2 border-white/20 hover:scale-110 hover:border-white/60 transition-all shadow-lg`} style={{ background: c === 'red' ? '#dc2626' : c === 'blue' ? '#2563eb' : c === 'green' ? '#16a34a' : '#ca8a04', boxShadow: `0 0 12px ${c === 'red' ? 'rgba(220,38,38,0.5)' : c === 'blue' ? 'rgba(37,99,235,0.5)' : c === 'green' ? 'rgba(22,163,74,0.5)' : 'rgba(202,138,4,0.5)'}` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getArcPositions(count) {
  if (count === 0) return [];
  if (count === 1) return [{ x: '50%', y: '25%' }];
  const positions = [];
  const spread = Math.min(70, 30 + count * 15);
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const offset = -spread / 2 + step * i;
    const x = 50 + offset;
    const y = 10 + Math.abs(offset) * 0.15;
    positions.push({ x: `${x}%`, y: `${y}%` });
  }
  return positions;
}
