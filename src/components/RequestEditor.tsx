import { ChevronDown, Play } from 'lucide-react';
import type { EndpointDefinition } from '../data/portfolio';

interface RequestEditorProps {
  endpoint: EndpointDefinition;
  isLoading: boolean;
  onSend: () => void;
}

export default function RequestEditor({ endpoint, isLoading, onSend }: RequestEditorProps) {
  return (
    <section className="request-editor">
      <div className="request-editor__mobile-brand">
        <div>
          <span className="request-editor__mobile-kicker">Phuttinan Workspace</span>
          <strong>{endpoint.label}</strong>
        </div>
        <span className="request-editor__mobile-method">{endpoint.method}</span>
      </div>

      <div className="request-editor__row">
        <div className="request-method-select">
          <span>{endpoint.method}</span>
          <ChevronDown size={14} />
        </div>

        <div className="request-url">
          <span className="request-url__host">portfolio.local</span>
          <span className="request-url__path">{endpoint.id}</span>
        </div>

        <button type="button" className="send-button" onClick={onSend}>
          <Play size={15} />
          <span>{isLoading ? 'Sending...' : 'Send'}</span>
        </button>
      </div>

      <div className="request-editor__meta">
        <span>{endpoint.label}</span>
        <span>{endpoint.summary}</span>
      </div>
    </section>
  );
}
