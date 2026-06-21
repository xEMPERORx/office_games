import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import CardTable, { PlayerSeat } from '../CardTable';
import SettingsMenu from '../SettingsMenu';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: '#ef4444', diamonds: '#ef4444', clubs: '#d4d4d4', spades: '#d4d4d4' };
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

export default function NapoleonGame({ socket }) {
  const { gameState, playerName } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [bidVal, setBidVal] = useState(3);
  const [bidSuit, setBidSuit] = useState('spades');
  const [allyCard, setAllyCard] = useState({ suit: 'spades', value: 'A' });

  if (!gameState) return null;
  const { players, hand, phase, napoleon, trumpSuit, bidAmount, ally, currentPlayer, currentTrick, tricks, passedPlayers, winner, leadSuit } = gameState;

  const isMyTurn = currentPlayer === playerName;

  function doBid() { socket.emit('nap_bid', { amount: bidVal, trumpSuit: bidSuit }); }
  function doPass() { socket.emit('nap_pass'); }
  function doPickAlly() { socket.emit('nap_pick_ally', { cardSuit: allyCard.suit, cardValue: allyCard.value }); }
  function playCard(cardId) { socket.emit('nap_play_card', { cardId }); }

  return (
    <CardTable
      players={players}
      currentPlayer={currentPlayer}
      playerName={playerName}
      topRight={
        <>
          {napoleon && <span className="text-[9px] text-gray-400 self-center">👑{napoleon} | Trump:<span style={{ color: SUIT_COLORS[trumpSuit] }}>{SUIT_SYMBOLS[trumpSuit] || '?'}</span> | Bid:{bidAmount}</span>}
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-400 transition">⚙</button>
        </>
      }
      renderPlayerSeat={(p, isTurn) => (
        <PlayerSeat name={p} isActive={isTurn} avatar={p === napoleon ? '👑' : '🃏'} subtitle={`${tricks[p]} tricks`}>
          {passedPlayers.includes(p) && <span className="text-[8px] text-gray-600">passed</span>}
        </PlayerSeat>
      )}
      renderCenter={() => (
        <div className="flex flex-col items-center gap-2">
          {winner && (
            <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/40 animate-pulse mb-2">
              <span className="text-yellow-300 font-bold text-sm">👑 {winner === playerName ? 'Your team won' : `${winner}'s team won`}! Next round in 5s...</span>
            </div>
          )}
          {/* Bidding phase */}
          {phase === 'bidding' && (
            <div className="flex flex-col items-center gap-2">
              <div className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
                {isMyTurn ? 'Your bid:' : `${currentPlayer} bidding...`}
              </div>
              {isMyTurn && (
                <div className="flex gap-2 items-center">
                  <input type="number" min={bidAmount + 1} max={13} value={bidVal} onChange={e => setBidVal(+e.target.value)} className="w-12 h-7 bg-gray-800 border border-gray-600 rounded text-center text-white text-xs" />
                  <select value={bidSuit} onChange={e => setBidSuit(e.target.value)} className="h-7 bg-gray-800 border border-gray-600 rounded text-white text-xs px-1">
                    {SUITS.map(s => <option key={s} value={s}>{SUIT_SYMBOLS[s]}</option>)}
                  </select>
                  <button onClick={doBid} className="px-2 py-1 rounded text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500">Bid</button>
                  <button onClick={doPass} className="px-2 py-1 rounded text-xs font-bold bg-gray-600 text-white hover:bg-gray-500">Pass</button>
                </div>
              )}
            </div>
          )}

          {/* Pick ally phase */}
          {phase === 'pickAlly' && napoleon === playerName && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-cyan-300 font-bold">Name ally card:</span>
              <div className="flex gap-2 items-center">
                <select value={allyCard.value} onChange={e => setAllyCard(a => ({ ...a, value: e.target.value }))} className="h-7 bg-gray-800 border border-gray-600 rounded text-white text-xs px-1">
                  {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={allyCard.suit} onChange={e => setAllyCard(a => ({ ...a, suit: e.target.value }))} className="h-7 bg-gray-800 border border-gray-600 rounded text-white text-xs px-1">
                  {SUITS.map(s => <option key={s} value={s}>{SUIT_SYMBOLS[s]}</option>)}
                </select>
                <button onClick={doPickAlly} className="px-2 py-1 rounded text-xs font-bold bg-purple-600 text-white hover:bg-purple-500">Confirm</button>
              </div>
            </div>
          )}
          {phase === 'pickAlly' && napoleon !== playerName && (
            <span className="text-sm text-gray-500">Napoleon picking ally...</span>
          )}

          {/* Playing phase - current trick */}
          {phase === 'playing' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {currentTrick.map(({ player, card }) => (
                  <div key={card.id} className="flex flex-col items-center">
                    <div className="w-11 h-16 rounded-lg border flex flex-col items-center justify-center" style={{ background: '#1a1a2e', borderColor: SUIT_COLORS[card.suit] }}>
                      <span className="text-xs font-black" style={{ color: SUIT_COLORS[card.suit] }}>{card.value}</span>
                      <span className="text-sm" style={{ color: SUIT_COLORS[card.suit] }}>{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                    <span className="text-[7px] text-gray-500">{player}</span>
                  </div>
                ))}
              </div>
              <div className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
                {isMyTurn ? '⚡ YOUR TURN' : `${currentPlayer}'s turn`}
                {leadSuit && <span className="ml-2 text-gray-400 text-xs">(lead: <span style={{ color: SUIT_COLORS[leadSuit] }}>{SUIT_SYMBOLS[leadSuit]}</span>)</span>}
              </div>
            </div>
          )}
        </div>
      )}
      renderHand={() => (
        <div className="flex justify-center gap-1 flex-wrap">
          {hand && hand.map(card => (
            <button key={card.id} onClick={() => phase === 'playing' && isMyTurn && playCard(card.id)} disabled={phase !== 'playing' || !isMyTurn}
              className="w-11 h-16 rounded-lg border flex flex-col items-center justify-center transition-all hover:-translate-y-2 disabled:hover:translate-y-0 disabled:opacity-50"
              style={{ background: '#1a1a2e', borderColor: SUIT_COLORS[card.suit], boxShadow: `0 0 4px ${SUIT_COLORS[card.suit]}22` }}>
              <span className="text-xs font-black" style={{ color: SUIT_COLORS[card.suit] }}>{card.value}</span>
              <span className="text-sm" style={{ color: SUIT_COLORS[card.suit] }}>{SUIT_SYMBOLS[card.suit]}</span>
            </button>
          ))}
        </div>
      )}
      renderOverlay={() => showSettings ? <SettingsMenu socket={socket} onClose={() => setShowSettings(false)} /> : null}
    />
  );
}
