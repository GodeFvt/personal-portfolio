import { useEffect, useRef, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import type { SearchSuggestion } from '../lib/search';
import SearchSuggestionsPanel from './SearchSuggestionsPanel';

interface WorkspaceTopbarProps {
  query: string;
  status: string;
  suggestions: SearchSuggestion[];
  onQueryChange: (value: string) => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onToggleCollections: () => void;
}

export default function WorkspaceTopbar({
  query,
  status,
  suggestions,
  onQueryChange,
  onSelectSuggestion,
  onToggleCollections,
}: WorkspaceTopbarProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleSelect = (suggestion: SearchSuggestion) => {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
  };

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__left">
        <button
          type="button"
          className="topbar-icon-button"
          onClick={onToggleCollections}
          aria-label="Toggle collections panel">
          <Menu size={18} />
        </button>

        <div className="workspace-brand">
          <span className="workspace-brand__name">Phuttinan Workspace</span>
          <span className="workspace-brand__subtitle">portfolio runtime</span>
        </div>
      </div>

      <div ref={shellRef} className="workspace-command">
        <label className="command-bar" htmlFor="workspace-search">
          <Search size={16} />
          <input
            ref={inputRef}
            id="workspace-search"
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (!isOpen || suggestions.length === 0) {
                if (event.key === 'Escape') {
                  setIsOpen(false);
                }
                return;
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((current) => (current + 1) % suggestions.length);
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
              }

              if (event.key === 'Enter') {
                event.preventDefault();
                handleSelect(suggestions[activeIndex]);
              }

              if (event.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder="Search commands, sections, and portfolio content"
          />
          <span className="command-bar__hint">Ctrl K</span>
        </label>

        {isOpen ? (
          <SearchSuggestionsPanel
            query={query}
            suggestions={suggestions}
            activeIndex={activeIndex}
            onHoverSuggestion={setActiveIndex}
            onSelectSuggestion={handleSelect}
          />
        ) : null}
      </div>

      <div className="workspace-topbar__right">
        <span className="live-pill">{status}</span>
      </div>
    </header>
  );
}
