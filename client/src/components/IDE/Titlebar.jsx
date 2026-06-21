export default function Titlebar() {
  return (
    <div className="ide-titlebar h-8 bg-ide-sidebar flex items-center justify-between px-3 select-none border-b border-ide-border text-xs">
      <div className="flex items-center gap-2">
        <span className="text-ide-text opacity-60">⌘</span>
        <span className="text-ide-text opacity-80">File</span>
        <span className="text-ide-text opacity-80">Edit</span>
        <span className="text-ide-text opacity-80">View</span>
        <span className="text-ide-text opacity-80">Run</span>
        <span className="text-ide-text opacity-80">Terminal</span>
        <span className="text-ide-text opacity-80">Help</span>
      </div>
      <span className="text-ide-text opacity-80">main.py — api-service — Visual Studio Code</span>
      <div className="flex gap-3 text-ide-text opacity-60">
        <span>─</span><span>□</span><span>✕</span>
      </div>
    </div>
  );
}
