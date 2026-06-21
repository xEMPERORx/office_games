import { createContext, useContext, useState } from 'react';

const GameContext = createContext();

export function GameProvider({ children }) {
  const [room, setRoom] = useState(null); // { roomCode, players, gameType }
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);

  return (
    <GameContext.Provider value={{ room, setRoom, playerName, setPlayerName, gameState, setGameState, messages, setMessages }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
