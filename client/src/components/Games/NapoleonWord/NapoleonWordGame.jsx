import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import SettingsMenu from '../SettingsMenu';
import GameRules from '../GameRules.jsx';

export default function NapoleonWordGame({ socket }) {
  const { gameState, playerName } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [word, setWord] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  if (!gameState) return null;
  const { players, scores, phase, round, totalRounds, category, submitted, submissionCount, revealedWords, guesses, currentGuesser, caught, napoleon, winner } = gameState;

  if (winner) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: '#0d0d1a' }}>
        <div className="text-5xl mb-3">🏆</div>
        <div className="text-xl text-white font-bold">{winner === playerName ? 'You are the Napoleon!' : `${winner} wins!`}</div>
        <div className="mt-3 text-sm text-gray-400">Final Scores:</div>
        {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([p, s]) => (
          <div key={p} className="text-xs text-gray-300">{p}: {s} pts</div>
        ))}
      </div>
    );
  }

  const isMyTurn = currentGuesser === playerName;

  function submitWord() {
    if (!word.trim()) return;
    socket.emit('nw_submit', { word: word.trim() });
    setWord('');
  }

  function makeGuess() {
    if (!selectedWord || !selectedPlayer) return;
    socket.emit('nw_guess', { word: selectedWord, guessedPlayer: selectedPlayer });
    setSelectedWord(null);
    setSelectedPlayer(null);
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden rounded-lg p-4" style={{ background: '#0d0d1a' }}>
      {/* Top controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-2">
        <GameRules gameType="napoleonword" />
        <button onClick={() => setShowSettings(true)} className="w-7 h-7 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-400 transition text-xs">⚙</button>
      </div>
      {showSettings && <SettingsMenu socket={socket} onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div className="text-center mb-3">
        <div className="text-xs text-gray-500">Round {round}/{totalRounds}</div>
        <div className="text-lg font-bold text-white mt-1">📌 Category: <span className="text-cyan-300">{category}</span></div>
        <div className="text-[10px] text-gray-500">👑 Napoleon: {napoleon}</div>
      </div>

      {/* Scores */}
      <div className="flex justify-center gap-2 mb-4 flex-wrap">
        {players.map(p => (
          <div key={p} className={`px-2 py-1 rounded-lg border text-[10px] text-center ${p === currentGuesser && phase === 'guess' ? 'border-cyan-400 bg-cyan-400/5' : 'border-gray-700'} ${caught.includes(p) ? 'opacity-40' : ''}`}>
            <div className={`font-bold ${p === napoleon ? 'text-yellow-300' : 'text-gray-300'}`}>{p}{p === napoleon ? ' 👑' : ''}</div>
            <div className="text-yellow-400">{scores[p]} pts</div>
          </div>
        ))}
      </div>

      {/* Submit phase */}
      {phase === 'submit' && (
        <div className="flex flex-col items-center gap-3 flex-1 justify-center">
          {submitted ? (
            <div className="text-center">
              <div className="text-green-400 text-sm">✓ Submitted!</div>
              <div className="text-xs text-gray-500 mt-1">Waiting... ({submissionCount}/{players.length})</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-300">Enter a <span className="text-cyan-300 font-bold">{category}</span> name:</div>
              <div className="flex gap-2">
                <input value={word} onChange={e => setWord(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitWord()} placeholder={`Type a ${category}...`} className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm w-48 outline-none focus:border-cyan-400" />
                <button onClick={submitWord} className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-500 transition">Submit</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guess phase */}
      {phase === 'guess' && (
        <div className="flex flex-col items-center gap-3 flex-1">
          <div className={`text-sm font-bold ${isMyTurn ? 'text-cyan-300 animate-pulse' : 'text-gray-500'}`}>
            {isMyTurn ? '⚡ Your turn to guess!' : `${currentGuesser} is guessing...`}
          </div>

          {/* Words to guess */}
          <div className="flex flex-wrap justify-center gap-2 my-2">
            {revealedWords.map(({ word: w, caught: c, player: p }) => (
              <button key={w} disabled={c || !isMyTurn}
                onClick={() => setSelectedWord(w === selectedWord ? null : w)}
                className={`px-3 py-2 rounded-lg border text-sm transition ${c ? 'border-green-600 bg-green-900/20 text-green-400' : selectedWord === w ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'}`}>
                {w} {c && <span className="text-[9px]">({p})</span>}
              </button>
            ))}
          </div>

          {/* Player select */}
          {isMyTurn && selectedWord && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs text-gray-400">Who wrote "{selectedWord}"?</div>
              <div className="flex gap-2 flex-wrap justify-center">
                {players.filter(p => p !== playerName && !caught.includes(p)).map(p => (
                  <button key={p} onClick={() => setSelectedPlayer(p)}
                    className={`px-3 py-1 rounded-lg border text-xs transition ${selectedPlayer === p ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : 'border-gray-600 text-gray-300 hover:border-gray-400'}`}>
                    {p}
                  </button>
                ))}
              </div>
              {selectedPlayer && <button onClick={makeGuess} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-500 mt-2">Guess: {selectedPlayer}</button>}
            </div>
          )}

          {/* Recent guesses */}
          {guesses.length > 0 && (
            <div className="mt-3 max-h-24 overflow-y-auto w-full max-w-sm">
              {guesses.slice(-5).map((g, i) => (
                <div key={i} className={`text-[10px] py-0.5 ${g.correct ? 'text-green-400' : 'text-red-400'}`}>
                  {g.guesser}: "{g.word}" → {g.guessedPlayer} {g.correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
