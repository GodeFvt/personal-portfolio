import { Plus, X } from 'lucide-react';
import { endpointRegistry, type EndpointId } from '../data/portfolio';

interface RequestTabsStripProps {
  openTabs: EndpointId[];
  activeEndpointId: EndpointId | null;
  onOpenEndpoint: (endpointId: EndpointId) => void;
  onCloseTab: (endpointId: EndpointId) => void;
}

export default function RequestTabsStrip({
  openTabs,
  activeEndpointId,
  onOpenEndpoint,
  onCloseTab,
}: RequestTabsStripProps) {
  return (
    <section className="request-tabs-strip">
      {openTabs.length === 0 ? (
        <div className="tab-empty">
          <span>No request tab open.</span>
          <button type="button" className="tab-empty__button" onClick={() => onOpenEndpoint('/me')}>
            <Plus size={14} />
            <span>Open /me</span>
          </button>
        </div>
      ) : (
        openTabs.map((endpointId) => {
          const endpoint = endpointRegistry[endpointId];
          const isActive = activeEndpointId === endpointId;

          return (
            <button
              key={endpointId}
              type="button"
              className={`request-tab${isActive ? ' request-tab--active' : ''}`}
              onClick={() => onOpenEndpoint(endpointId)}>
              <span className="request-tab__method">{endpoint.method}</span>
              <span className="request-tab__path">{endpoint.id}</span>
              <span
                className="request-tab__close"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(endpointId);
                }}>
                <X size={12} />
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}
