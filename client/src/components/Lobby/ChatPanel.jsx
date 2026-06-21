import { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';

export default function ChatPanel({ socket }) {
  const { messages, setMessages, playerName, room } = useGame();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat_message', handler);
    return () => socket.off('chat_message', handler);
  }, [socket, setMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit('chat_message', { message: input.trim() });
    setInput('');
  }

  return (
    <div className="w-64 bg-ide-bg border-l border-ide-border flex flex-col">
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-ide-text opacity-50 border-b border-ide-border flex items-center gap-2">
        <span>Terminal</span>
        {room && <span className="ml-auto text-ide-accent">{room.roomCode}</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-xs space-y-0.5">
        {messages.map((msg, i) => (
          <div key={i} className="text-ide-text">
            <span className="opacity-50">&gt; </span>
            <span className="text-green-400">{msg.playerName}</span>
            <span className="opacity-50">: </span>
            <span>{msg.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="border-t border-ide-border flex">
        <span className="text-ide-text opacity-50 px-2 py-1.5 text-xs">&gt;</span>
        <input className="flex-1 bg-transparent outline-none text-xs text-ide-text py-1.5 pr-2" placeholder="type here..." value={input} onChange={e => setInput(e.target.value)} />
      </form>
    </div>
  );
}
