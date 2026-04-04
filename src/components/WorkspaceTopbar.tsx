import { Menu, Search } from 'lucide-react';

interface WorkspaceTopbarProps {
  query: string;
  status: string;
  onQueryChange: (value: string) => void;
  onToggleCollections: () => void;
}

export default function WorkspaceTopbar({
  query,
  status,
  onQueryChange,
  onToggleCollections,
}: WorkspaceTopbarProps) {
  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__left">
        <button
          type="button"
          className="topbar-icon-button"
          onClick={onToggleCollections}
          aria-label="Toggle collections panel">
          <Menu size={18} />
        </button>

        <div className="workspace-brand">
          <span className="workspace-brand__name">Phuttinan Workspace</span>
          <span className="workspace-brand__subtitle">portfolio runtime</span>
        </div>
      </div>

      <label className="command-bar" htmlFor="workspace-search">
        <Search size={16} />
        <input
          id="workspace-search"
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search requests and collections"
        />
        <span className="command-bar__hint">Ctrl K</span>
      </label>

      <div className="workspace-topbar__right">
        <span className="live-pill">{status}</span>
      </div>
    </header>
  );
}
