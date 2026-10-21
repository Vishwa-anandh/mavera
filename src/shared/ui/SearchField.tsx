import { SearchIcon } from './icons';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Spoken name of the field, e.g. "Search jobs". */
  label: string;
  placeholder?: string;
  /** Extra class for a page-specific placement (never for width: every search box is the same width). */
  className?: string;
}

/**
 * The one search box used across Mavera. Every page, drawer and toolbar renders this, so the width, height,
 * icon, focus ring and clear behaviour are identical everywhere (the width is the --mv-search-width token).
 */
export function SearchField({ value, onChange, label, placeholder, className }: SearchFieldProps) {
  return (
    <label className={`mv-search${className ? ` ${className}` : ''}`}>
      <SearchIcon size={16} aria-hidden />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder ?? `${label}…`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
