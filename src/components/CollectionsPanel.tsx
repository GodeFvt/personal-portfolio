import { ChevronDown, ChevronRight, Folder, FolderOpen, Search } from 'lucide-react';
import { endpointRegistry, type EndpointId } from '../data/portfolio';
import { collectionGroups, type CollectionGroupId } from '../lib/runtime';

interface CollectionsPanelProps {
  query: string;
  filteredEndpoints: EndpointId[];
  activeEndpointId: EndpointId | null;
  treeExpanded: boolean;
  expandedGroups: Record<CollectionGroupId, boolean>;
  onQueryChange: (value: string) => void;
  onToggleTree: () => void;
  onToggleGroup: (groupId: CollectionGroupId) => void;
  onOpenEndpoint: (endpointId: EndpointId) => void;
}

export default function CollectionsPanel({
  query,
  filteredEndpoints,
  activeEndpointId,
  treeExpanded,
  expandedGroups,
  onQueryChange,
  onToggleTree,
  onToggleGroup,
  onOpenEndpoint,
}: CollectionsPanelProps) {
  const visibleGroups = collectionGroups
    .map((group) => ({
      ...group,
      endpoints: group.endpoints.filter((endpointId) => filteredEndpoints.includes(endpointId)),
    }))
    .filter((group) => group.endpoints.length > 0);

  return (
    <aside className="collections-panel">
      <div className="collections-panel__header">
        <div>
          <p className="collections-panel__label">Workspace</p>
          <h2>Collections</h2>
        </div>
        <span className="collections-panel__count">API</span>
      </div>

      <div className="collections-search">
        <Search size={15} />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search collections"
        />
      </div>

      <div className="collections-list">
        <div className="tree-root">
          <button type="button" className="tree-folder" onClick={onToggleTree} aria-expanded={treeExpanded}>
            {treeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {treeExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
            <span>portfolio-runtime</span>
          </button>

          {treeExpanded ? (
            <div className="tree-children">
              {visibleGroups.map((group) => (
                <div key={group.id} className="tree-group">
                  <button
                    type="button"
                    className="tree-folder tree-folder--sub"
                    onClick={() => onToggleGroup(group.id)}
                    aria-expanded={expandedGroups[group.id]}>
                    {expandedGroups[group.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    {expandedGroups[group.id] ? <FolderOpen size={14} /> : <Folder size={14} />}
                    <span>{group.label}</span>
                  </button>

                  {expandedGroups[group.id] ? (
                    <div className="tree-children tree-children--nested">
                      {group.endpoints.map((endpointId) => {
                        const endpoint = endpointRegistry[endpointId];
                        const isActive = activeEndpointId === endpointId;

                        return (
                          <button
                            key={endpointId}
                            type="button"
                            className={`tree-leaf${isActive ? ' tree-leaf--active' : ''}`}
                            onClick={() => onOpenEndpoint(endpointId)}>
                            <span className="tree-leaf__branch" />
                            <span className="endpoint-badge">{endpoint.method}</span>
                            <span className="tree-leaf__path">{endpoint.id}</span>
                            <span className="tree-leaf__note">{endpoint.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
