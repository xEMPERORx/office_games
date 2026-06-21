import { useState } from 'react';
import { useGame } from '../../context/GameContext';

export default function JoinRoom({ socket }) {
  const { setRoom, setPlayerName, setGameState } = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [gameType, setGameType] = useState('uno');
  const [error, setError] = useState('');

  function handleCreate() {
    if (!name.trim()) return;
    socket.emit('create_room', { playerName: name.trim(), gameType }, (res) => {
      if (res.error) return setError(res.error);
      setPlayerName(name.trim());
      setRoom(res);
    });
  }

  function handleJoin(spectate = false) {
    if (!name.trim() || !code.trim()) return;
    socket.emit('join_room', { roomCode: code.trim().toUpperCase(), playerName: name.trim(), spectate }, (res) => {
      if (res.error) return setError(res.error);
      setPlayerName(name.trim());
      setRoom(res);
      if (res.gameState) setGameState(res.gameState);
    });
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-sm font-mono px-4">
      <div className="text-ide-text opacity-50 text-xs">// Enter credentials to access dev environment</div>
      {error && <div className="text-red-400 text-xs">{error}</div>}
      <input className="bg-ide-active border border-ide-border px-3 py-1.5 rounded text-ide-text w-full max-w-64 outline-none focus:border-ide-accent" placeholder="Username" value={name} onChange={e => setName(e.target.value)} />
      <div className="flex gap-2 w-full max-w-64">
        <input className="bg-ide-active border border-ide-border px-3 py-1.5 rounded text-ide-text flex-1 outline-none focus:border-ide-accent" placeholder="Room code" value={code} onChange={e => setCode(e.target.value)} />
        <button onClick={() => handleJoin(false)} className="bg-ide-accent text-white px-3 py-1.5 rounded text-xs hover:opacity-90">Join</button>
        <button onClick={() => handleJoin(true)} className="bg-gray-700 text-white px-2 py-1.5 rounded text-xs hover:bg-gray-600" title="Watch only">👁️</button>
      </div>
      <div className="text-ide-text opacity-30 text-xs">— or —</div>
      <select value={gameType} onChange={e => setGameType(e.target.value)} className="bg-ide-active border border-ide-border px-3 py-1.5 rounded text-ide-text w-full max-w-64 outline-none">
        <option value="uno">🃏 UNO</option>
        <option value="ludo">🎲 Ludo</option>
        <option value="teenpatti">🂡 Teen Patti</option>
        <option value="napoleon">👑 Napoleon (Cards)</option>
        <option value="explodingkittens">🐱 Exploding Kittens</option>
        <option value="napoleonword">🔤 Napoleon Word Game</option>
      </select>
      <button onClick={handleCreate} className="bg-ide-accent text-white px-4 py-1.5 rounded text-xs hover:opacity-90 w-full max-w-64">Create Room</button>
    </div>
  );
}
