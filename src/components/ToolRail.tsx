import { BookOpenText, CircleHelp, Clock3, Database, ListTree, Settings2 } from 'lucide-react';

interface ToolRailProps {
  activePanel: 'workspace' | 'collections';
  onGoHome: () => void;
  onShowWorkspace: () => void;
  onShowCollections: () => void;
}

export default function ToolRail({
  activePanel,
  onGoHome,
  onShowWorkspace,
  onShowCollections,
}: ToolRailProps) {
  return (
    <aside className="tool-rail">
      <button type="button" className="tool-rail__logo" onClick={onGoHome}>
        <span>PP</span>
      </button>

      <div className="tool-rail__group">
        <button
          type="button"
          className={`tool-rail__button${activePanel === 'collections' ? ' tool-rail__button--active' : ''}`}
          title="Collections"
          onClick={onShowCollections}>
          <ListTree size={17} />
          <span className="tool-rail__button-label">Collections</span>
        </button>
        <button
          type="button"
          className={`tool-rail__button${activePanel === 'workspace' ? ' tool-rail__button--active' : ''}`}
          title="Workspace"
          onClick={onShowWorkspace}>
          <Database size={17} />
          <span className="tool-rail__button-label">Workspace</span>
        </button>
        <button type="button" className="tool-rail__button" title="History">
          <Clock3 size={17} />
          <span className="tool-rail__button-label">History</span>
        </button>
        <button type="button" className="tool-rail__button" title="Docs">
          <BookOpenText size={17} />
          <span className="tool-rail__button-label">Docs</span>
        </button>
      </div>

      <div className="tool-rail__group tool-rail__group--bottom">
        <button type="button" className="tool-rail__button" title="Settings">
          <Settings2 size={17} />
          <span className="tool-rail__button-label">Settings</span>
        </button>
        <button type="button" className="tool-rail__button" title="Help">
          <CircleHelp size={17} />
          <span className="tool-rail__button-label">Help</span>
        </button>
      </div>
    </aside>
  );
}
