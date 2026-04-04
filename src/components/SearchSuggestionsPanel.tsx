import { ArrowRight, CornerDownLeft } from 'lucide-react';
import type { SearchSuggestion } from '../lib/search';

interface SearchSuggestionsPanelProps {
  query: string;
  suggestions: SearchSuggestion[];
  activeIndex: number;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onHoverSuggestion: (index: number) => void;
}

export default function SearchSuggestionsPanel({
  query,
  suggestions,
  activeIndex,
  onSelectSuggestion,
  onHoverSuggestion,
}: SearchSuggestionsPanelProps) {
  return (
    <div className="command-suggestions">
      <div className="command-suggestions__header">
        <span>{query.trim() ? 'Search results' : 'Suggested jumps'}</span>
        <span>{suggestions.length} items</span>
      </div>

      <div className="command-suggestions__list">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              className={`command-suggestion${index === activeIndex ? ' command-suggestion--active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHoverSuggestion(index)}
              onClick={() => onSelectSuggestion(suggestion)}>
              <div className="command-suggestion__main">
                <div className="command-suggestion__title-row">
                  <strong>{suggestion.title}</strong>
                  <span className="command-suggestion__route">{suggestion.routeLabel}</span>
                </div>
                <p className="command-suggestion__detail">
                  <span>{suggestion.sectionLabel}</span>
                  <ArrowRight size={12} />
                  <span>{suggestion.detail}</span>
                </p>
                <p className="command-suggestion__snippet">{suggestion.snippet}</p>
              </div>

              <span className="command-suggestion__enter">
                <CornerDownLeft size={12} />
              </span>
            </button>
          ))
        ) : (
          <div className="command-suggestions__empty">
            <strong>No matches</strong>
            <p>Try project names, skills, contact channels, or major journey milestones.</p>
          </div>
        )}
      </div>
    </div>
  );
}
