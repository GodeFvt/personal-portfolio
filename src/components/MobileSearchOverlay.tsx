import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { SearchSuggestion } from '../lib/search';
import SearchSuggestionsPanel from './SearchSuggestionsPanel';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  query: string;
  suggestions: SearchSuggestion[];
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
}

export default function MobileSearchOverlay({
  isOpen,
  query,
  suggestions,
  onClose,
  onQueryChange,
  onSelectSuggestion,
}: MobileSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, [isOpen, query]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="mobile-search-overlay">
      <button type="button" className="mobile-search-overlay__backdrop" aria-label="Close search" onClick={onClose} />

      <div className="mobile-search-sheet">
        <div className="mobile-search-sheet__bar">
          <label className="command-bar mobile-search-sheet__input" htmlFor="mobile-workspace-search">
            <Search size={16} />
            <input
              ref={inputRef}
              id="mobile-workspace-search"
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (suggestions.length === 0) {
                  if (event.key === 'Escape') {
                    onClose();
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
                  onSelectSuggestion(suggestions[activeIndex]);
                }

                if (event.key === 'Escape') {
                  onClose();
                }
              }}
              placeholder="Search portfolio content"
            />
          </label>

          <button type="button" className="topbar-icon-button" aria-label="Close search" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <SearchSuggestionsPanel
          query={query}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onHoverSuggestion={setActiveIndex}
          onSelectSuggestion={onSelectSuggestion}
        />
      </div>
    </div>
  );
}
