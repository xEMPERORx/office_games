const COLOR_MAP = {
  red: { bg: '#dc2626', glow: 'rgba(220,38,38,0.5)' },
  blue: { bg: '#2563eb', glow: 'rgba(37,99,235,0.5)' },
  green: { bg: '#16a34a', glow: 'rgba(22,163,74,0.5)' },
  yellow: { bg: '#ca8a04', glow: 'rgba(202,138,4,0.5)' },
  wild: { bg: '#7c3aed', glow: 'rgba(124,58,237,0.5)' },
};

const DISPLAY = {
  skip: '⊘', reverse: '⟳', draw2: '+2', wild: '✦', wild_draw4: '+4',
};

export default function UNOCard({ card, onClick, small, faceDown, animating }) {
  if (faceDown) {
    return (
      <div className={`rounded-xl border border-gray-600 flex items-center justify-center ${small ? 'w-7 h-10' : 'w-14 h-20'}`} style={{ background: '#1a1a2e' }}>
        <div className="w-3/4 h-3/4 rounded-lg border border-gray-500" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)' }} />
      </div>
    );
  }

  const color = card.activeColor || card.color;
  const { bg, glow } = COLOR_MAP[color] || COLOR_MAP.wild;
  const label = DISPLAY[card.value] || card.value;

  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border flex flex-col items-center justify-center font-bold select-none transition-all duration-200 hover:-translate-y-2 hover:scale-105 active:scale-95 ${small ? 'w-7 h-10 text-[7px]' : 'w-14 h-20 text-base'} ${animating ? 'animate-cardPlay' : ''}`}
      style={{
        background: '#1a1a2e',
        borderColor: bg,
        boxShadow: `0 0 8px ${glow}, 0 4px 12px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Corner top-left */}
      <span className="absolute top-0.5 left-1 font-black" style={{ color: bg, fontSize: small ? '5px' : '9px' }}>{label}</span>
      {/* Corner bottom-right */}
      <span className="absolute bottom-0.5 right-1 rotate-180 font-black" style={{ color: bg, fontSize: small ? '5px' : '9px' }}>{label}</span>
      {/* Center oval */}
      <div
        className={`rounded-full flex items-center justify-center ${small ? 'w-5 h-7' : 'w-9 h-13'}`}
        style={{ background: `radial-gradient(ellipse, ${bg} 0%, transparent 70%)` }}
      >
        <span className="text-white font-black drop-shadow-lg" style={{ fontSize: small ? '8px' : '18px' }}>
          {label}
        </span>
      </div>
    </button>
  );
}
