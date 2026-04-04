import { Plus, Sparkles } from 'lucide-react';

interface EmptyWorkspaceProps {
  onOpenDefault: () => void;
}

export default function EmptyWorkspace({ onOpenDefault }: EmptyWorkspaceProps) {
  return (
    <section className="empty-workspace">
      <div className="empty-workspace__icon">
        <Sparkles size={22} />
      </div>
      <h2>No open request</h2>
      <p>Open one of the five portfolio endpoints from the collections panel to start exploring the data.</p>
      <button type="button" className="solid-button" onClick={onOpenDefault}>
        <Plus size={15} />
        <span>Open /me</span>
      </button>
    </section>
  );
}
