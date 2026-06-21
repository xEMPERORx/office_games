const TABS = ['main.py', 'models/user.py', 'routers/auth.py'];

export default function EditorTabs() {
  return (
    <div className="ide-tabs h-9 bg-ide-bg flex items-end border-b border-ide-border">
      {TABS.map((tab, i) => (
        <div key={tab} className={`px-4 py-1.5 text-xs cursor-pointer border-r border-ide-border ${i === 0 ? 'bg-ide-tabActive text-ide-text border-t-2 border-t-ide-accent' : 'bg-ide-tab text-ide-text opacity-60'}`}>
          <span className="mr-1 text-[10px]">🐍</span>{tab}
        </div>
      ))}
    </div>
  );
}
