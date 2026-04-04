import { endpointOrder, endpointRegistry, type EndpointId } from '../data/portfolio';

interface MobileEndpointDockProps {
  activeEndpointId: EndpointId | null;
  onOpenEndpoint: (endpointId: EndpointId) => void;
}

export default function MobileEndpointDock({ activeEndpointId, onOpenEndpoint }: MobileEndpointDockProps) {
  return (
    <nav className="mobile-endpoint-dock" aria-label="Portfolio endpoints">
      {endpointOrder.map((endpointId) => {
        const endpoint = endpointRegistry[endpointId];
        const isActive = activeEndpointId === endpointId;

        return (
          <button
            key={endpointId}
            type="button"
            className={`mobile-endpoint-dock__button${isActive ? ' mobile-endpoint-dock__button--active' : ''}`}
            onClick={() => onOpenEndpoint(endpointId)}>
            <span className="mobile-endpoint-dock__method">{endpoint.method}</span>
            <span className="mobile-endpoint-dock__path">{endpoint.id}</span>
          </button>
        );
      })}
    </nav>
  );
}
