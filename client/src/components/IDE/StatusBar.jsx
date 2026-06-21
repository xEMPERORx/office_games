export default function StatusBar() {
  return (
    <div className="ide-statusbar h-6 bg-ide-statusbar flex items-center justify-between px-3 text-[11px] text-white select-none">
      <div className="flex items-center gap-3">
        <span>⎇ develop</span>
        <span>✓ 0</span>
        <span>⚠ 0</span>
      </div>
      <div className="flex items-center gap-3">
        <span>Ln 87, Col 4</span>
        <span>UTF-8</span>
        <span>Python 3.11</span>
        <span>🐍 venv</span>
      </div>
    </div>
  );
}
