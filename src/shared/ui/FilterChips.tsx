import type { ReactNode } from 'react';

export interface FilterChip<T extends string> {
  value: T;
  label: ReactNode;
  /** Number shown after the label (how many items the chip would show). */
  count?: number;
  /** Spoken name when the visible label alone is not enough. */
  ariaLabel?: string;
}

interface FilterChipsProps<T extends string> {
  /** Names the group, e.g. "Filter jobs by status". */
  label: string;
  chips: ReadonlyArray<FilterChip<T>>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * Status or category chips with counts (All 20, Running 1, ...). One chip is on at a time; each is a toggle
 * button (`aria-pressed`), so the whole set is reachable with Tab and nothing relies on colour alone.
 */
export function FilterChips<T extends string>({ label, chips, value, onChange }: FilterChipsProps<T>) {
  return (
    <div className="mv-filter-chips" role="group" aria-label={label}>
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <button
            key={chip.value}
            type="button"
            className={`mv-chip mv-filter-chip${active ? ' is-active' : ''}`}
            aria-pressed={active}
            aria-label={chip.ariaLabel}
            onClick={() => onChange(chip.value)}
          >
            {chip.label}
            {chip.count !== undefined && <span className="mv-filter-chip-count">{chip.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
