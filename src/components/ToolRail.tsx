import { BookOpenText, CircleHelp, Clock3, Database, ListTree, Settings2 } from 'lucide-react';

interface ToolRailProps {
  onGoHome: () => void;
}

export default function ToolRail({ onGoHome }: ToolRailProps) {
  return (
    <aside className="tool-rail">
      <button type="button" className="tool-rail__logo" onClick={onGoHome}>
        <span>PP</span>
      </button>

      <div className="tool-rail__group">
        <button type="button" className="tool-rail__button tool-rail__button--active" title="Collections">
          <ListTree size={17} />
        </button>
        <button type="button" className="tool-rail__button" title="Requests">
          <Database size={17} />
        </button>
        <button type="button" className="tool-rail__button" title="History">
          <Clock3 size={17} />
        </button>
        <button type="button" className="tool-rail__button" title="Docs">
          <BookOpenText size={17} />
        </button>
      </div>

      <div className="tool-rail__group tool-rail__group--bottom">
        <button type="button" className="tool-rail__button" title="Settings">
          <Settings2 size={17} />
        </button>
        <button type="button" className="tool-rail__button" title="Help">
          <CircleHelp size={17} />
        </button>
      </div>
    </aside>
  );
}
