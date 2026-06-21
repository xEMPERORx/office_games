import { useState } from 'react';
import { useGame } from '../../context/GameContext';

const GAMES = ['uno', 'ludo', 'teenpatti', 'napoleon', 'explodingkittens', 'napoleonword'];

export default function SettingsMenu({ socket, onClose }) {
  const { room, playerName, setRoom, setGameState } = useGame();
  const isHost = room && room.players[0] === playerName;
  const [switchGame, setSwitchGame] = useState('');

  function restartGame() { socket.emit('restart_game'); onClose(); }
  function leaveRoom() { socket.emit('leave_room'); setGameState(null); setRoom(null); onClose(); }
  function voteSwitchGame() { if (switchGame) { socket.emit('vote_switch', { gameType: switchGame }); onClose(); } }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-sm text-white font-bold mb-4 text-center">⚙️ Menu</div>
        <div className="flex flex-col gap-2">
          {isHost && (
            <button onClick={restartGame} className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition">🔄 Restart Game</button>
          )}
          {/* Game switch vote */}
          <div className="flex gap-1">
            <select value={switchGame} onChange={e => setSwitchGame(e.target.value)} className="flex-1 h-8 bg-gray-800 border border-gray-600 rounded text-white text-xs px-2">
              <option value="">Switch game...</option>
              {GAMES.filter(g => g !== room?.gameType).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button onClick={voteSwitchGame} disabled={!switchGame} className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition">Vote</button>
          </div>
          <button onClick={leaveRoom} className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition">🚪 Leave Room</button>
          <button onClick={onClose} className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition mt-1">✕ Close</button>
        </div>
        {!isHost && <p className="text-[10px] text-gray-500 mt-3 text-center">Only host can restart</p>}
        <p className="text-[9px] text-gray-600 mt-2 text-center">Ctrl+B = Boss Key (hide game)</p>
      </div>
    </div>
  );
}
