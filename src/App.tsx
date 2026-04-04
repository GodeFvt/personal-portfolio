import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpenText,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Copy,
  Database,
  Eye,
  FileJson2,
  Folder,
  FolderOpen,
  Globe,
  ListTree,
  Mail,
  Menu,
  Phone,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import {
  contactChannels,
  currentRoles,
  education,
  endpointOrder,
  endpointRegistry,
  experience,
  identity,
  journey,
  meFacts,
  profileLinks,
  projects,
  skillGroups,
  workingTraits,
  type ContactChannel,
  type EndpointDefinition,
  type EndpointId,
} from './data/portfolio';
import './style.css';

type ResponsePaneTab = 'preview' | 'json' | 'headers';

interface RequestLog {
  id: number;
  endpointId: EndpointId;
  latency: number;
  executedAt: string;
}

interface RuntimeResponse {
  ok: true;
  status: number;
  method: 'GET';
  path: EndpointId;
  servedAt: string;
  latencyMs: number;
  sourceCount: number;
  headers: Record<string, string>;
  data: unknown;
}

interface CollectionGroup {
  id: 'profile' | 'work' | 'contact';
  label: string;
  endpoints: EndpointId[];
}

const collectionGroups: CollectionGroup[] = [
  { id: 'profile', label: 'Profile', endpoints: ['/me', '/about', '/skills'] },
  { id: 'work', label: 'Projects', endpoints: ['/project'] },
  { id: 'contact', label: 'Reach', endpoints: ['/contact'] },
];

const contactIcons: Record<ContactChannel['type'], LucideIcon> = {
  email: Mail,
  phone: Phone,
  github: Code2,
  linkedin: BriefcaseBusiness,
  website: Globe,
  instagram: Camera,
};

function isEndpointId(value: string): value is EndpointId {
  return endpointOrder.includes(value as EndpointId);
}

function buildRuntimeResponse(endpoint: EndpointDefinition, log: RequestLog | null): RuntimeResponse {
  const servedAt = log?.endpointId === endpoint.id ? log.executedAt : new Date().toISOString();
  const latencyMs = log?.endpointId === endpoint.id ? log.latency : endpoint.baseLatency;

  return {
    ok: true,
    status: 200,
    method: endpoint.method,
    path: endpoint.id,
    servedAt,
    latencyMs,
    sourceCount: endpoint.sources.length,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-portfolio-badge': endpoint.badge,
      'x-portfolio-sources': endpoint.sources.join(', '),
      'x-portfolio-runtime': 'hoppscotch-inspired-portfolio',
    },
    data: endpoint.data,
  };
}

function AppShell() {
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
  const [expandedGroups, setExpandedGroups] = useState<Record<CollectionGroup['id'], boolean>>({
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
      const nextLog: RequestLog = {
        id: requestCountRef.current,
        endpointId: activeEndpoint.id,
        latency,
        executedAt: new Date().toISOString(),
      };

      setLastRun(nextLog);
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
      const nextLog: RequestLog = {
        id: requestCountRef.current,
        endpointId: activeEndpoint.id,
        latency,
        executedAt: new Date().toISOString(),
      };

      setLastRun(nextLog);
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
  const visibleGroups = collectionGroups
    .map((group) => ({
      ...group,
      endpoints: group.endpoints.filter((endpointId) => filteredEndpoints.includes(endpointId)),
    }))
    .filter((group) => group.endpoints.length > 0);

  const responsePaneLabels: Array<{ id: ResponsePaneTab; label: string; icon: LucideIcon }> = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'json', label: 'JSON', icon: FileJson2 },
    { id: 'headers', label: 'Headers', icon: Code2 },
  ];

  return (
    <div className="app-shell">
      <div className="app-shell__glow app-shell__glow--one" />
      <div className="app-shell__glow app-shell__glow--two" />

      <div className={`studio${collectionsOpen ? '' : ' studio--collections-closed'}`}>
        <aside className="tool-rail">
          <button type="button" className="tool-rail__logo" onClick={() => navigate('/')}>
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

        <main className="workspace">
          <header className="workspace-topbar">
            <div className="workspace-topbar__left">
              <button
                type="button"
                className="topbar-icon-button"
                onClick={() => setCollectionsOpen((current) => !current)}
                aria-label="Toggle collections panel">
                <Menu size={18} />
              </button>

              <div className="workspace-brand">
                <span className="workspace-brand__name">Phuttinan API Workspace</span>
                <span className="workspace-brand__subtitle">Hoppscotch-inspired portfolio runtime</span>
              </div>
            </div>

            <label className="command-bar" htmlFor="workspace-search">
              <Search size={16} />
              <input
                id="workspace-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search requests and collections"
              />
              <span className="command-bar__hint">Ctrl K</span>
            </label>

            <div className="workspace-topbar__right">
              <span className="live-pill">{identity.status}</span>
              <button type="button" className="solid-button" onClick={() => triggerRequest()} disabled={!activeEndpoint}>
                <Play size={15} />
                <span>Run Active</span>
              </button>
            </div>
          </header>

          <section className="request-tabs-strip">
            {openTabs.length === 0 ? (
              <div className="tab-empty">
                <span>No request tab open.</span>
                <button type="button" className="tab-empty__button" onClick={() => handleOpenEndpoint('/me')}>
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
                    onClick={() => handleOpenEndpoint(endpointId)}>
                    <span className="request-tab__method">{endpoint.method}</span>
                    <span className="request-tab__path">{endpoint.id}</span>
                    <span
                      className="request-tab__close"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCloseTab(endpointId);
                      }}>
                      <X size={12} />
                    </span>
                  </button>
                );
              })
            )}
          </section>

          {activeEndpoint ? (
            <>
              <section className="request-editor">
                <div className="request-editor__row">
                  <div className="request-method-select">
                    <span>{activeEndpoint.method}</span>
                    <ChevronDown size={14} />
                  </div>

                  <div className="request-url">
                    <span className="request-url__host">portfolio.local</span>
                    <span className="request-url__path">{activeEndpoint.id}</span>
                  </div>

                  <button type="button" className="send-button" onClick={() => triggerRequest()}>
                    <Play size={15} />
                    <span>{isLoading ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>

                <div className="request-editor__meta">
                  <span>{activeEndpoint.label}</span>
                  <span>{activeEndpoint.summary}</span>
                </div>
              </section>

              <section className="response-pane">
                <div className="response-pane__header">
                  <div>
                    <p className="response-pane__eyebrow">Response</p>
                    <h2 className="response-pane__title">
                      200 OK <span>{runtimeResponse?.latencyMs ?? activeEndpoint.baseLatency} ms</span>
                    </h2>
                  </div>

                  <div className="response-pane__actions">
                    <span className="response-pane__meta">{responseBytes} bytes</span>
                    <button type="button" className="topbar-icon-button" onClick={copyResponse} aria-label="Copy response">
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
                        onClick={() => setResponsePaneTab(tab.id)}>
                        <Icon size={14} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="response-pane__body">
                  {responsePaneTab === 'preview' ? (
                    <div className="response-pane__preview">
                      <PreviewPane endpointId={activeEndpoint.id} />
                    </div>
                  ) : responsePaneTab === 'json' ? (
                    <JsonViewer content={responseJson} />
                  ) : (
                    <HeadersViewer headers={runtimeResponse?.headers ?? {}} />
                  )}
                </div>

                {isLoading ? (
                  <div className="response-pane__loading">
                    <div className="response-pane__loading-bar" />
                    <p>Resolving {activeEndpoint.id} from portfolio collections...</p>
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <section className="empty-workspace">
              <div className="empty-workspace__icon">
                <Sparkles size={22} />
              </div>
              <h2>No open request</h2>
              <p>Open one of the five portfolio endpoints from the collections panel to start exploring the data.</p>
              <button type="button" className="solid-button" onClick={() => handleOpenEndpoint('/me')}>
                <Plus size={15} />
                <span>Open /me</span>
              </button>
            </section>
          )}
        </main>

        {collectionsOpen ? (
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search collections"
              />
            </div>

            <div className="collections-list">
              <div className="tree-root">
                <button
                  type="button"
                  className="tree-folder"
                  onClick={() => setTreeExpanded((current) => !current)}
                  aria-expanded={treeExpanded}>
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
                          onClick={() =>
                            setExpandedGroups((current) => ({
                              ...current,
                              [group.id]: !current[group.id],
                            }))
                          }
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
                                  onClick={() => handleOpenEndpoint(endpointId)}>
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
        ) : null}
      </div>
    </div>
  );
}

function PreviewPane({ endpointId }: { endpointId: EndpointId }) {
  switch (endpointId) {
    case '/me':
      return <MePreview />;
    case '/project':
      return <ProjectsPreview />;
    case '/about':
      return <AboutPreview />;
    case '/skills':
      return <SkillsPreview />;
    case '/contact':
      return <ContactPreview />;
    default:
      return null;
  }
}

function MePreview() {
  return (
    <div className="preview-stack">
      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Identity</p>
          <span className="preview-section__aside">GET /me</span>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Name</span>
          <div className="preview-row__value">
            <strong>{identity.name}</strong>
            <p>{identity.alias}</p>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Role</span>
          <div className="preview-row__value">
            <strong>{identity.role}</strong>
            <p>{identity.headline}</p>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Status</span>
          <div className="preview-row__value">
            <strong>{identity.status}</strong>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Location</span>
          <div className="preview-row__value">
            <strong>{identity.location}</strong>
            <p>{identity.education}</p>
          </div>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Summary</span>
          <div className="preview-row__value">
            <p>{identity.summary}</p>
          </div>
        </div>
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Facts</p>
          <span className="preview-section__aside">{meFacts.length} items</span>
        </div>

        {meFacts.map((fact) => (
          <div key={fact.label} className="preview-row">
            <span className="preview-row__label">{fact.label}</span>
            <div className="preview-row__value">
              <strong>{fact.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Current roles</p>
          <span className="preview-section__aside">{currentRoles.length} active</span>
        </div>

        {currentRoles.map((role) => (
          <article key={`${role.title}-${role.company}`} className="preview-entry">
            <div className="preview-entry__top">
              <div>
                <h3>{role.title}</h3>
                <p className="preview-entry__company">{role.company}</p>
              </div>
              <span className="record-chip">{role.period}</span>
            </div>
            <p className="preview-entry__copy">{role.note}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProjectsPreview() {
  return (
    <div className="preview-stack">
      {projects.map((project) => (
        <section key={project.name} className="preview-section">
          <article className="preview-entry preview-entry--spacious">
            <div>
              <p className="preview-section__title">{project.type}</p>
              <h3>{project.name}</h3>
              <div className="preview-entry__meta">
                <span>{project.period}</span>
                <span>{project.visibility}</span>
              </div>
            </div>

            <div className="preview-entry__top">
              <p className="preview-entry__copy">{project.description}</p>
              <span className="record-chip">{project.status}</span>
            </div>

            <ul className="preview-bullets">
              {project.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="preview-row preview-row--stack">
              <span className="preview-row__label">Stack</span>
              <div className="preview-row__chips">
                {project.stack.map((item) => (
                  <span key={item} className="source-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </section>
      ))}
    </div>
  );
}

function AboutPreview() {
  return (
    <div className="preview-stack">
      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Education</p>
          <span className="preview-section__aside">{education.length} records</span>
        </div>

        {education.map((item) => (
          <div key={item.school} className="preview-row">
            <span className="preview-row__label">{item.period}</span>
            <div className="preview-row__value">
              <strong>{item.school}</strong>
              <p>
                {item.degree} - {item.location}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Experience</p>
          <span className="preview-section__aside">{experience.length} records</span>
        </div>

        {experience.map((item) => (
          <article key={`${item.role}-${item.company}`} className="preview-entry">
            <div className="preview-entry__top">
              <div>
                <h3>{item.role}</h3>
                <p className="preview-entry__company">
                  {item.company} - {item.location}
                </p>
              </div>
              <span className="record-chip">{item.period}</span>
            </div>
            <ul className="preview-bullets">
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="preview-row preview-row--stack">
              <span className="preview-row__label">Stack</span>
              <div className="preview-row__chips">
                {item.stack.map((tech) => (
                  <span key={tech} className="source-chip">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Timeline</p>
          <span className="preview-section__aside">{journey.length} events</span>
        </div>

        {journey.map((item) => (
          <div key={`${item.year}-${item.title}`} className="preview-row">
            <span className="preview-row__label">{item.year}</span>
            <div className="preview-row__value">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SkillsPreview() {
  return (
    <div className="preview-stack">
      {skillGroups.map((group) => (
        <section key={group.name} className="preview-section">
          <div className="preview-row preview-row--stack">
            <span className="preview-row__label">{group.name}</span>
            <div className="preview-row__chips">
              {group.items.map((item) => (
                <span key={item} className="source-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Working style</p>
          <span className="preview-section__aside">workflow</span>
        </div>

        {workingTraits.map((item) => (
          <div key={item} className="preview-row">
            <span className="preview-row__label">Trait</span>
            <div className="preview-row__value">
              <strong>{item}</strong>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ContactPreview() {
  return (
    <div className="preview-stack">
      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Reach me</p>
          <span className="preview-section__aside">{contactChannels.length} channels</span>
        </div>

        {contactChannels.map((channel) => {
          const Icon = contactIcons[channel.type];

          return (
            <a key={channel.href} className="preview-link-row" href={channel.href} target="_blank" rel="noreferrer">
              <div className="preview-link-row__main">
                <Icon size={15} />
                <div className="preview-link-row__copy">
                  <strong>{channel.label}</strong>
                  <p>{channel.value}</p>
                </div>
              </div>
              <span className="preview-link-row__note">{channel.note}</span>
            </a>
          );
        })}
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Public links</p>
          <span className="preview-section__aside">{profileLinks.length} links</span>
        </div>

        <div className="preview-row preview-row--stack">
          <span className="preview-row__label">Links</span>
          <div className="preview-row__chips">
            {profileLinks.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="source-chip source-chip--link">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="preview-section">
        <div className="preview-section__header">
          <p className="preview-section__title">Availability</p>
          <span className="preview-section__aside">status</span>
        </div>

        <div className="preview-row">
          <span className="preview-row__label">Hiring</span>
          <div className="preview-row__value">
            <strong>{identity.status}</strong>
            <p>{identity.location}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function JsonViewer({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="code-view">
      {lines.map((line, index) => (
        <div key={`${index + 1}-${line}`} className="code-line">
          <span className="code-line__number">{index + 1}</span>
          <span className="code-line__content">{line || ' '}</span>
        </div>
      ))}
    </div>
  );
}

function HeadersViewer({ headers }: { headers: Record<string, string> }) {
  const rows = Object.entries(headers);

  return (
    <div className="table-shell">
      <div className="table-head table-head--three">
        <span>Header</span>
        <span>Value</span>
        <span>Note</span>
      </div>
      {rows.map(([key, value]) => (
        <div key={key} className="table-row table-row--three">
          <span>{key}</span>
          <span>{value}</span>
          <span>Response metadata emitted by the portfolio runtime.</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
