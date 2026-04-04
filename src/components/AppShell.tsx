import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { endpointOrder, endpointRegistry, identity, type EndpointId } from '../data/portfolio';
import {
  buildRuntimeResponse,
  type CollectionGroupId,
  isEndpointId,
  type RequestLog,
  type ResponsePaneTab,
} from '../lib/runtime';
import CollectionsPanel from './CollectionsPanel';
import EmptyWorkspace from './EmptyWorkspace';
import MobileEndpointDock from './MobileEndpointDock';
import RequestEditor from './RequestEditor';
import RequestTabsStrip from './RequestTabsStrip';
import ResponsePane from './ResponsePane';
import ToolRail from './ToolRail';
import WorkspaceTopbar from './WorkspaceTopbar';

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeEndpointId = isEndpointId(location.pathname) ? location.pathname : null;
  const activeEndpoint = activeEndpointId ? endpointRegistry[activeEndpointId] : null;

  const [openTabs, setOpenTabs] = useState<EndpointId[]>(['/me', '/project']);
  const [responsePaneTab, setResponsePaneTab] = useState<ResponsePaneTab>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRun, setLastRun] = useState<RequestLog | null>(null);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [treeExpanded, setTreeExpanded] = useState(true);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<CollectionGroupId, boolean>>({
    profile: true,
    work: true,
    contact: true,
  });
  const [query, setQuery] = useState('');

  const timerRef = useRef<number | null>(null);
  const copyRef = useRef<number | null>(null);
  const requestCountRef = useRef(0);

  useEffect(() => {
    if (activeEndpointId) {
      setOpenTabs((current) => (current.includes(activeEndpointId) ? current : [...current, activeEndpointId]));
    }
  }, [activeEndpointId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (copyRef.current) {
        window.clearTimeout(copyRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 860px)');
    const syncMobileLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncMobileLayout();
    mediaQuery.addEventListener('change', syncMobileLayout);

    return () => mediaQuery.removeEventListener('change', syncMobileLayout);
  }, []);

  useEffect(() => {
    if (!activeEndpoint) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    const latency = activeEndpoint.baseLatency + Math.floor(Math.random() * 40);
    timerRef.current = window.setTimeout(() => {
      requestCountRef.current += 1;
      setLastRun({
        id: requestCountRef.current,
        endpointId: activeEndpoint.id,
        latency,
        executedAt: new Date().toISOString(),
      });
      setIsLoading(false);
    }, latency);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [activeEndpoint]);

  const handleOpenEndpoint = (endpointId: EndpointId) => {
    setOpenTabs((current) => (current.includes(endpointId) ? current : [...current, endpointId]));
    navigate(endpointId);
  };

  const handleCloseTab = (endpointId: EndpointId) => {
    setOpenTabs((current) => {
      const tabIndex = current.indexOf(endpointId);
      const nextTabs = current.filter((tab) => tab !== endpointId);

      if (activeEndpointId === endpointId) {
        const fallback = nextTabs[Math.max(0, tabIndex - 1)] ?? nextTabs[0] ?? '/';
        navigate(fallback);
      }

      return nextTabs;
    });
  };

  const triggerRequest = () => {
    if (!activeEndpoint) {
      return;
    }

    setIsLoading(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    const latency = activeEndpoint.baseLatency + 26 + Math.floor(Math.random() * 46);
    timerRef.current = window.setTimeout(() => {
      requestCountRef.current += 1;
      setLastRun({
        id: requestCountRef.current,
        endpointId: activeEndpoint.id,
        latency,
        executedAt: new Date().toISOString(),
      });
      setIsLoading(false);
    }, latency);
  };

  const runtimeResponse = activeEndpoint ? buildRuntimeResponse(activeEndpoint, lastRun) : null;
  const responseJson = runtimeResponse ? JSON.stringify(runtimeResponse, null, 2) : '';
  const responseBytes = responseJson ? new TextEncoder().encode(responseJson).length : 0;

  const copyResponse = async () => {
    if (!responseJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(responseJson);
      setCopied(true);
      if (copyRef.current) {
        window.clearTimeout(copyRef.current);
      }
      copyRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const filteredEndpoints = endpointOrder.filter((endpointId) => {
    const endpoint = endpointRegistry[endpointId];
    const text = `${endpoint.id} ${endpoint.label} ${endpoint.summary}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const handleToggleCollections = () => {
    if (isMobileLayout) {
      return;
    }

    setCollectionsOpen((current) => !current);
  };

  const shouldRenderCollections = !isMobileLayout && collectionsOpen;
  const activeRailPanel = collectionsOpen ? 'collections' : 'workspace';

  return (
    <div className="app-shell">
      <div className={`studio${shouldRenderCollections ? '' : ' studio--collections-closed'}`}>
        <ToolRail
          activePanel={activeRailPanel}
          onGoHome={() => navigate('/')}
          onShowWorkspace={() => setCollectionsOpen(false)}
          onShowCollections={() => setCollectionsOpen(true)}
        />

        <main className="workspace">
          <WorkspaceTopbar
            query={query}
            status={identity.status}
            canRun={Boolean(activeEndpoint)}
            onQueryChange={setQuery}
            onRunActive={triggerRequest}
            onToggleCollections={handleToggleCollections}
          />

          <RequestTabsStrip
            openTabs={openTabs}
            activeEndpointId={activeEndpointId}
            onOpenEndpoint={handleOpenEndpoint}
            onCloseTab={handleCloseTab}
          />

          {activeEndpoint ? (
            <>
              <RequestEditor endpoint={activeEndpoint} isLoading={isLoading} onSend={triggerRequest} />
              <ResponsePane
                endpoint={activeEndpoint}
                headers={runtimeResponse?.headers ?? {}}
                responseJson={responseJson}
                responseBytes={responseBytes}
                responsePaneTab={responsePaneTab}
                latencyMs={runtimeResponse?.latencyMs ?? activeEndpoint.baseLatency}
                copied={copied}
                isLoading={isLoading}
                onCopy={copyResponse}
                onChangeTab={setResponsePaneTab}
              />
            </>
          ) : (
            <EmptyWorkspace onOpenDefault={() => handleOpenEndpoint('/me')} />
          )}
        </main>

        {shouldRenderCollections ? (
          <CollectionsPanel
            query={query}
            filteredEndpoints={filteredEndpoints}
            activeEndpointId={activeEndpointId}
            treeExpanded={treeExpanded}
            expandedGroups={expandedGroups}
            onQueryChange={setQuery}
            onToggleTree={() => setTreeExpanded((current) => !current)}
            onToggleGroup={(groupId) =>
              setExpandedGroups((current) => ({
                ...current,
                [groupId]: !current[groupId],
              }))
            }
            onOpenEndpoint={handleOpenEndpoint}
          />
        ) : null}

        {isMobileLayout ? (
          <MobileEndpointDock activeEndpointId={activeEndpointId} onOpenEndpoint={handleOpenEndpoint} />
        ) : null}
      </div>
    </div>
  );
}
