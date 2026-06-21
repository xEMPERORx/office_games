import { useState, useEffect } from 'react';

export default function SoundToggle() {
  const [muted, setMuted] = useState(() => localStorage.getItem('sound_muted') === 'true');

  useEffect(() => {
    localStorage.setItem('sound_muted', muted);
    window.__soundMuted = muted;
  }, [muted]);

  return (
    <button onClick={() => setMuted(!muted)} className="fixed bottom-8 right-10 z-40 w-7 h-7 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs hover:border-cyan-400 transition" title={muted ? 'Unmute' : 'Mute'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
