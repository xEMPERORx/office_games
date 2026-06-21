// Shared card table layout - realistic casino table with wood border, leather rim, and felt surface

export default function CardTable({ players, currentPlayer, playerName, renderPlayerSeat, renderCenter, renderHand, renderOverlay, topRight }) {
  const opponents = players.filter(p => p !== playerName);
  const positions = getCircularPositions(opponents.length);

  return (
    <div className="relative flex flex-col h-full overflow-hidden rounded-xl" style={{ background: '#1a0e08' }}>
      {/* Wood grain border */}
      <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg, #3d2510 0%, #2a1a0c 50%, #3d2510 100%)', padding: '6px' }}>
        <div className="absolute inset-0 rounded-xl opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 11px)' }} />
      </div>

      {/* Leather rim */}
      <div className="absolute inset-[6px] rounded-lg" style={{ background: 'linear-gradient(180deg, #2a1f15 0%, #1a130d 50%, #2a1f15 100%)', padding: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.05)' }}>
        {/* Leather stitch pattern */}
        <div className="absolute inset-0 rounded-lg opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(200,150,50,0.3) 8px, rgba(200,150,50,0.3) 9px)' }} />
      </div>

      {/* Felt surface */}
      <div className="absolute inset-[10px] rounded-lg overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a3a2a 0%, #0f2a1a 40%, #0a1f12 70%, #061208 100%)' }}>
        {/* Felt texture dots */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'0.5\' fill=\'%23fff\'/%3E%3C/svg%3E")', backgroundSize: '4px 4px' }} />
        {/* Spotlight from above */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
        {/* Edge shadow for depth */}
        <div className="absolute inset-0 rounded-lg" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,0,0,0.3)' }} />
      </div>

      {/* Top right controls */}
      {topRight && <div className="absolute top-4 right-4 z-20 flex gap-2">{topRight}</div>}

      {/* Content layer */}
      <div className="absolute inset-[10px] rounded-lg flex flex-col z-10">
        {/* Opponents around the table */}
        <div className="relative flex-1 min-h-[42%]">
          {opponents.map((p, i) => {
            const pos = positions[i];
            return (
              <div key={p} className="absolute transition-all duration-500" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, 0)' }}>
                {renderPlayerSeat(p, p === currentPlayer)}
              </div>
            );
          })}
        </div>

        {/* Center area */}
        <div className="flex items-center justify-center py-2 relative">
          {/* Center table marker ring */}
          <div className="absolute w-48 h-32 rounded-[50%] border border-yellow-900/20" />
          {renderCenter()}
        </div>

        {/* Hand area */}
        <div className="mt-auto pb-3 pt-1">
          {renderHand()}
        </div>
      </div>

      {/* Modal overlays */}
      {renderOverlay && renderOverlay()}
    </div>
  );
}

function getCircularPositions(count) {
  if (count === 0) return [];
  if (count === 1) return [{ x: '50%', y: '30%' }];
  if (count === 2) return [{ x: '30%', y: '25%' }, { x: '70%', y: '25%' }];
  const positions = [];
  const totalArc = Math.min(82, 35 + count * 12);
  const step = count > 1 ? totalArc / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const offset = -totalArc / 2 + step * i;
    const x = 50 + offset;
    const y = 6 + Math.pow(Math.abs(offset), 1.2) * 0.08;
    positions.push({ x: `${Math.max(8, Math.min(92, x))}%`, y: `${Math.max(5, Math.min(45, y))}%` });
  }
  return positions;
}

// Reusable player seat badge with table chip style
export function PlayerSeat({ name, isActive, avatar, subtitle, children }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg border-2 shadow-lg transition-all duration-500 ${isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] scale-110' : 'border-gray-600/60 bg-gray-900/60 shadow-black/30'}`}
        style={isActive ? { background: 'radial-gradient(circle, #1a2a1a 0%, #0a1a0a 100%)' } : { background: 'rgba(10,10,20,0.7)' }}>
        {avatar || '🎮'}
      </div>
      <span className={`text-[10px] mt-1 font-bold truncate max-w-[72px] drop-shadow ${isActive ? 'text-yellow-300' : 'text-gray-400'}`}>{name}</span>
      {subtitle && <span className="text-[9px] text-gray-500 drop-shadow">{subtitle}</span>}
      {children}
    </div>
  );
}
