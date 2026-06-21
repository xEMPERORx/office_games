const FILES = [
  { name: 'app', type: 'folder', children: [
    { name: '__init__.py', type: 'file' },
    { name: 'main.py', type: 'file', active: true },
    { name: 'config.py', type: 'file' },
    { name: 'models', type: 'folder', children: [
      { name: 'user.py', type: 'file' },
      { name: 'schemas.py', type: 'file' },
    ]},
    { name: 'routers', type: 'folder', children: [
      { name: 'auth.py', type: 'file' },
      { name: 'users.py', type: 'file' },
      { name: 'health.py', type: 'file' },
    ]},
    { name: 'services', type: 'folder', children: [
      { name: 'database.py', type: 'file' },
      { name: 'cache.py', type: 'file' },
    ]},
  ]},
  { name: 'tests', type: 'folder', children: [
    { name: 'test_users.py', type: 'file' },
    { name: 'conftest.py', type: 'file' },
  ]},
  { name: 'requirements.txt', type: 'file' },
  { name: 'Dockerfile', type: 'file' },
  { name: '.env', type: 'file' },
];

function FileTree({ items, depth = 0 }) {
  return items.map((item, i) => (
    <div key={i}>
      <div className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer text-xs opacity-80 ${item.active ? 'bg-ide-active text-white' : 'hover:bg-ide-active text-ide-text'}`} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        <span className="text-[10px]">{item.type === 'folder' ? '📁' : item.name.endsWith('.py') ? '🐍' : '📄'}</span>
        <span>{item.name}</span>
      </div>
      {item.children && <FileTree items={item.children} depth={depth + 1} />}
    </div>
  ));
}

export default function Sidebar() {
  return (
    <div className="ide-sidebar w-48 bg-ide-sidebar border-r border-ide-border flex flex-col overflow-y-auto">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-ide-text opacity-50 font-semibold">Explorer</div>
      <div className="px-3 py-1 text-[10px] text-ide-text opacity-40 uppercase">api-service</div>
      <FileTree items={FILES} />
    </div>
  );
}
