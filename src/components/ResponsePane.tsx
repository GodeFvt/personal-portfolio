import type { LucideIcon } from 'lucide-react';
import { Check, Code2, Copy, Eye, FileJson2 } from 'lucide-react';
import type { EndpointDefinition } from '../data/portfolio';
import type { ResponsePaneTab } from '../lib/runtime';
import HeadersViewer from './HeadersViewer';
import JsonViewer from './JsonViewer';
import PreviewPane from './preview/PreviewPane';

interface ResponsePaneProps {
  endpoint: EndpointDefinition;
  headers: Record<string, string>;
  responseJson: string;
  responseBytes: number;
  responsePaneTab: ResponsePaneTab;
  latencyMs: number;
  copied: boolean;
  isLoading: boolean;
  onCopy: () => void;
  onChangeTab: (tab: ResponsePaneTab) => void;
}

const responsePaneLabels: Array<{ id: ResponsePaneTab; label: string; icon: LucideIcon }> = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'json', label: 'JSON', icon: FileJson2 },
  { id: 'headers', label: 'Headers', icon: Code2 },
];

export default function ResponsePane({
  endpoint,
  headers,
  responseJson,
  responseBytes,
  responsePaneTab,
  latencyMs,
  copied,
  isLoading,
  onCopy,
  onChangeTab,
}: ResponsePaneProps) {
  return (
    <section className="response-pane">
      <div className="response-pane__header">
        <div>
          <p className="response-pane__eyebrow">Response</p>
          <h2 className="response-pane__title">
            200 OK <span>{latencyMs} ms</span>
          </h2>
        </div>

        <div className="response-pane__actions">
          <span className="response-pane__meta">{responseBytes} bytes</span>
          <button type="button" className="topbar-icon-button" onClick={onCopy} aria-label="Copy response">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="response-pane__tabs">
        {responsePaneLabels.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              className={`pane-tab pane-tab--icon${responsePaneTab === tab.id ? ' pane-tab--active' : ''}`}
              onClick={() => onChangeTab(tab.id)}>
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="response-pane__body">
        {responsePaneTab === 'preview' ? (
          <div className="response-pane__preview">
            <PreviewPane endpointId={endpoint.id} />
          </div>
        ) : responsePaneTab === 'json' ? (
          <JsonViewer content={responseJson} />
        ) : (
          <HeadersViewer headers={headers} />
        )}
      </div>

      {isLoading ? (
        <div className="response-pane__loading">
          <div className="response-pane__loading-bar" />
          <p>Resolving {endpoint.id} from portfolio collections...</p>
        </div>
      ) : null}
    </section>
  );
}
