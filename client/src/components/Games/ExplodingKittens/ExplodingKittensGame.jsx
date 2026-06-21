import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import CardTable, { PlayerSeat } from '../CardTable';
import SettingsMenu from '../SettingsMenu';

const CARD_ICONS = {
  exploding_kitten: '💣', defuse: '🔧', attack: '⚔️', skip: '🚫',
  favor: '🎁', shuffle: '🔀', see_future: '🔮', nope: '✋',
  cat_taco: '🌮', cat_melon: '🍈', cat_potato: '🥔', cat_beard: '🧔', cat_rainbow: '🌈',
};
const CARD_COLORS = {
  exploding_kitten: '#ef4444', defuse: '#22c55e', attack: '#f97316', skip: '#3b82f6',
  favor: '#a855f7', shuffle: '#06b6d4', see_future: '#8b5cf6', nope: '#64748b',
  cat_taco: '#ca8a04', cat_melon: '#16a34a', cat_potato: '#a16207', cat_beard: '#7c3aed', cat_rainbow: '#ec4899',
};

export default function ExplodingKittensGame({ socket }) {
  const { gameState, playerName } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [defusePos, setDefusePos] = useState(0);

  if (!gameState) return null;
  const { players, hand, deckSize, discardTop, currentPlayer, alivePlayers, handCounts, turnsRemaining, winner, pendingAction, lastAction } = gameState;

  const isMyTurn = currentPlayer === playerName;
  const mustGiveFavor = pendingAction?.type === 'favor' && pendingAction.from === playerName;

  function playCard(cardId) {
    const card = hand.find(c => c.id === cardId);
    if (!card) return;
    if (card.type.startsWith('cat_')) {
      const sel = [...selectedCards];
      if (sel.includes(cardId)) { setSelectedCards(sel.filter(id => id !== cardId)); return; }
      sel.push(cardId);
      setSelectedCards(sel);
      if (sel.length === 2) {
        const c1 = hand.find(c => c.id === sel[0]);
        const c2 = hand.find(c => c.id === sel[1]);
        if (c1.type === c2.type) { setTargetPlayer('picking'); } else { setSelectedCards([]); }
      }
      return;
    }
    if (card.type === 'favor') { setSelectedCards([cardId]); setTargetPlayer('picking'); return; }
    socket.emit('ek_play_card', { cardId });
    setSelectedCards([]);
  }

  function confirmTarget(target) {
    if (selectedCards.length === 2) {
      socket.emit('ek_play_card', { cardId: selectedCards[0], cardId2: selectedCards[1], targetPlayerId: target });
    } else {
      socket.emit('ek_play_card', { cardId: selectedCards[0], targetPlayerId: target });
    }
    setSelectedCards([]); setTargetPlayer(null);
  }

  return (
    <CardTable
      players={players}
      currentPlayer={currentPlayer}
      playerName={playerName}
      topRight={
        <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-400 transition">⚙</button>
      }
      renderPlayerSeat={(p, isTurn) => {
        const alive = alivePlayers.includes(p);
        return <PlayerSeat name={p} isActive={isTurn && alive} avatar={alive ? '🐱' : '💀'} subtitle={alive ? `${handCounts[p] || 0} cards` : 'dead'} />;
      }}
      renderCenter={() => (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-5">
            {/* Draw pile */}
            <button onClick={() => socket.emit('ek_draw_card')} disabled={!isMyTurn || !!pendingAction} className="flex flex-col items-center group disabled:opacity-30">
              <div className="w-13 h-18 rounded-xl border-2 border-gray-600 bg-gray-800 flex items-center justify-center text-xl group-hover:border-cyan-400 transition">🃏</div>
              <span className="text-[9px] text-gray-500 mt-1">Deck ({deckSize})</span>
            </button>
            {/* Discard */}
            {discardTop && (
              <div className="flex flex-col items-center">
                <div className="w-13 h-18 rounded-xl border-2 flex flex-col items-center justify-center" style={{ borderColor: CARD_COLORS[discardTop.type], background: '#1a1a2e' }}>
                  <span className="text-xl">{CARD_ICONS[discardTop.type]}</span>
                </div>
                <span className="text-[9px] text-gray-500 mt-1">Discard</span>
              </div>
            )}
          </div>

          {/* Status */}
          {winner ? (
            <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/40 animate-pulse">
              <span className="text-yellow-300 font-bold text-sm">🐱 {winner === playerName ? 'You survived' : `${winner} survived`}! Next round in 5s...</span>
            </div>
          ) : (
            <div className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
              {isMyTurn ? `⚡ YOUR TURN ${turnsRemaining > 1 ? `(${turnsRemaining} draws)` : ''}` : `${currentPlayer}'s turn`}
            </div>
          )}
          {lastAction && <div className="text-[10px] text-gray-500">{lastAction.player} used {lastAction.type.replace('_', ' ')}</div>}

          {/* Defuse UI */}
          {pendingAction?.type === 'defuse' && currentPlayer === playerName && (
            <div className="flex items-center gap-2 p-2 border border-red-500 rounded-lg bg-red-500/10">
              <span className="text-xs text-red-300">💣 Insert bomb:</span>
              <input type="number" min={0} max={deckSize} value={defusePos} onChange={e => setDefusePos(+e.target.value)} className="w-10 h-6 bg-gray-800 border border-gray-600 rounded text-center text-white text-xs" />
              <button onClick={() => socket.emit('ek_defuse', { insertPosition: defusePos })} className="px-2 py-1 rounded text-xs font-bold bg-green-600 text-white">Defuse</button>
            </div>
          )}

          {/* Favor prompt */}
          {mustGiveFavor && <div className="text-xs text-purple-300 animate-pulse">Pick a card to give away</div>}

          {/* Target picker */}
          {targetPlayer === 'picking' && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-400">Target:</span>
              {alivePlayers.filter(p => p !== playerName).map(p => (
                <button key={p} onClick={() => confirmTarget(p)} className="px-2 py-1 rounded text-xs bg-purple-600 text-white hover:bg-purple-500">{p}</button>
              ))}
              <button onClick={() => { setTargetPlayer(null); setSelectedCards([]); }} className="px-2 py-1 rounded text-xs bg-gray-600 text-white">✕</button>
            </div>
          )}
        </div>
      )}
      renderHand={() => (
        <div className="flex justify-center gap-1 flex-wrap">
          {hand.map(card => {
            const selected = selectedCards.includes(card.id);
            return (
              <button key={card.id}
                onClick={() => mustGiveFavor ? socket.emit('ek_give_favor', { cardId: card.id }) : (isMyTurn && !pendingAction) ? playCard(card.id) : null}
                className={`w-11 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all hover:-translate-y-1 ${selected ? '-translate-y-2 ring-2 ring-cyan-400' : ''}`}
                style={{ background: '#1a1a2e', borderColor: CARD_COLORS[card.type] || '#4a5568' }}>
                <span className="text-lg">{CARD_ICONS[card.type]}</span>
                <span className="text-[6px] text-gray-400 leading-tight">{card.type.replace('cat_', '')}</span>
              </button>
            );
          })}
        </div>
      )}
      renderOverlay={() => showSettings ? <SettingsMenu socket={socket} onClose={() => setShowSettings(false)} /> : null}
    />
  );
}
