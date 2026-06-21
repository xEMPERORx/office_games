import { useEffect, useState, useCallback } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { useSocket } from './hooks/useSocket';
import { ToastProvider, useToast } from './components/Toast';
import Titlebar from './components/IDE/Titlebar';
import Sidebar from './components/IDE/Sidebar';
import EditorTabs from './components/IDE/EditorTabs';
import StatusBar from './components/IDE/StatusBar';
import JoinRoom from './components/Lobby/JoinRoom';
import ChatPanel from './components/Lobby/ChatPanel';
import UNOGame from './components/Games/UNO/UNOGame';
import LudoGame from './components/Games/Ludo/LudoGame';
import TeenPattiGame from './components/Games/TeenPatti/TeenPattiGame';
import NapoleonGame from './components/Games/Napoleon/NapoleonGame';
import ExplodingKittensGame from './components/Games/ExplodingKittens/ExplodingKittensGame';
import NapoleonWordGame from './components/Games/NapoleonWord/NapoleonWordGame';
import GameRules from './components/Games/GameRules';
import BossKey from './components/BossKey';
import EmojiReactions from './components/EmojiReactions';
import Scoreboard from './components/Scoreboard';
import TurnTimer from './components/TurnTimer';
import SoundToggle from './components/SoundToggle';

const GAME_COMPONENTS = {
  uno: UNOGame,
  ludo: LudoGame,
  teenpatti: TeenPattiGame,
  napoleon: NapoleonGame,
  explodingkittens: ExplodingKittensGame,
  napoleonword: NapoleonWordGame,
};

function AppContent() {
  const socket = useSocket();
  const { room, setRoom, gameState, setGameState, playerName } = useGame();
  const toast = useToast();
  const [bossMode, setBossMode] = useState(false);
  const [gameLogs, setGameLogs] = useState([]);
  const [scoreboard, setScoreboard] = useState({});
  const [timerEnd, setTimerEnd] = useState(null);
  const [emojis, setEmojis] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on('player_joined', ({ playerName: p, players }) => { setRoom(prev => prev ? { ...prev, players } : prev); toast(`${p} joined`); });
    socket.on('player_left', ({ playerName: p, players }) => { setRoom(prev => prev ? { ...prev, players } : prev); toast(`${p} left`); });
    socket.on('player_disconnected', ({ playerName: p }) => toast(`${p} disconnected (60s to reconnect)`));
    socket.on('game_started', (state) => { setGameState(state); setGameLogs([]); });
    socket.on('game_state_update', (state) => setGameState(state));
    socket.on('game_over', ({ winner }) => { setGameState(prev => ({ ...prev, winner })); toast(winner === playerName ? '🎉 You won this round!' : `${winner} wins this round!`, 'success'); });
    socket.on('round_start', () => setGameState(prev => prev?.winner ? { ...prev, winner: null } : prev));
    socket.on('left_room', () => { setRoom(null); setGameState(null); });
    socket.on('game_error', (msg) => toast(msg, 'error'));
    socket.on('game_log', (msg) => setGameLogs(prev => [...prev.slice(-50), msg]));
    socket.on('scoreboard_update', (sb) => setScoreboard(sb));
    socket.on('turn_timer', ({ endTime }) => setTimerEnd(endTime));
    socket.on('emoji_reaction', ({ player, emoji }) => {
      const id = Date.now() + Math.random();
      setEmojis(prev => [...prev, { id, player, emoji }]);
      setTimeout(() => setEmojis(prev => prev.filter(e => e.id !== id)), 2000);
    });
    socket.on('game_switched', ({ gameType }) => { setRoom(prev => prev ? { ...prev, gameType } : prev); setGameState(null); toast(`Game switched to ${gameType}!`); });
    socket.on('uno_called', ({ player }) => toast(`🔥 ${player} called UNO!`));
    socket.on('ek_player_eliminated', ({ player }) => toast(`💀 ${player} exploded!`, 'error'));

    return () => {
      ['player_joined','player_left','player_disconnected','game_started','game_state_update','game_over','round_start','left_room','game_error','game_log','scoreboard_update','turn_timer','emoji_reaction','game_switched','uno_called','ek_player_eliminated'].forEach(e => socket.off(e));
    };
  }, [socket, setRoom, setGameState, toast, playerName]);

  // Boss Key: Ctrl+B
  useEffect(() => {
    const handler = (e) => { if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setBossMode(v => !v); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (bossMode) return <BossKey onExit={() => setBossMode(false)} />;

  const GameComponent = room ? GAME_COMPONENTS[room.gameType] : null;

  return (
    <div className="h-screen flex flex-col bg-ide-bg">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <EditorTabs />
          <div className="flex flex-1 overflow-hidden relative">
            <div className="flex-1 overflow-auto p-2 md:p-4 relative">
              {!room ? <JoinRoom socket={socket} /> : !gameState ? <Lobby socket={socket} /> : GameComponent ? <GameComponent socket={socket} gameLogs={gameLogs} /> : null}
              {/* Floating UI */}
              {gameState && timerEnd && <TurnTimer endTime={timerEnd} />}
              {gameState && <EmojiReactions emojis={emojis} socket={socket} />}
            </div>
            {room && <ChatPanel socket={socket} />}
          </div>
        </div>
      </div>
      <StatusBar />
      {room && gameState && <Scoreboard scoreboard={scoreboard} />}
      <SoundToggle />
    </div>
  );
}

function Lobby({ socket }) {
  const { room, playerName } = useGame();
  const isHost = room.players[0] === playerName;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-sm font-mono">
      <div className="text-ide-text opacity-50 text-xs">// Waiting for players...</div>
      <div className="text-ide-accent text-lg">Room: {room.roomCode}</div>
      <div className="text-xs text-gray-400 mb-1">Game: <span className="text-cyan-300">{room.gameType}</span></div>
      <GameRules gameType={room.gameType} inline />
      <div className="text-ide-text text-xs">
        {room.players.map((p, i) => <div key={p} className="py-0.5">{i === 0 ? '👑 ' : '  '}{p}</div>)}
      </div>
      <div className="flex gap-2">
        {isHost && (
          <>
            <button onClick={() => socket.emit('start_game')} disabled={room.players.length < 2} className="bg-ide-accent text-white px-4 py-1.5 rounded text-xs hover:opacity-90 disabled:opacity-40">Start Game</button>
            <button onClick={() => socket.emit('add_bot')} disabled={room.players.length >= 10} className="bg-gray-700 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-600 disabled:opacity-40">+ Add Bot</button>
          </>
        )}
      </div>
      {!isHost && <div className="text-ide-text opacity-40 text-xs">Waiting for host to start...</div>}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ToastProvider>
  );
}
