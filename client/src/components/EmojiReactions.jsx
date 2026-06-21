const QUICK_EMOJIS = ['😂', '🔥', '💀', '👏', '😭', '🎉'];

export default function EmojiReactions({ emojis, socket }) {
  return (
    <>
      {/* Quick emoji bar */}
      <div className="absolute bottom-2 left-2 flex gap-1 z-20">
        {QUICK_EMOJIS.map(e => (
          <button key={e} onClick={() => socket.emit('emoji_reaction', { emoji: e })} className="w-7 h-7 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center text-sm hover:scale-125 hover:bg-gray-700 transition-all">
            {e}
          </button>
        ))}
      </div>

      {/* Floating emojis */}
      {emojis.map(({ id, player, emoji }) => (
        <div key={id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 animate-emojiFloat">
          <div className="text-4xl">{emoji}</div>
          <div className="text-[8px] text-center text-gray-400">{player}</div>
        </div>
      ))}
    </>
  );
}
