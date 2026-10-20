import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Spoken name when the visible label is an abbreviation, e.g. "7D" -> "Last 7 days". */
  ariaLabel?: string;
}

interface SegmentedToggleProps<T extends string> {
  /** Names the group for assistive technology, e.g. "Spend period". */
  label: string;
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A two-to-six way view switch (period, Cloud | Invoices, Chart | List). It is a group of
 * toggle buttons (`aria-pressed`), not tabs: nothing here owns a tabpanel, and every option
 * stays reachable with Tab. Arrow keys are not required for buttons, so none are bound.
 */
export function SegmentedToggle<T extends string>({ label, options, value, onChange, className }: SegmentedToggleProps<T>) {
  return (
    <div className={`mv-segmented${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`mv-segmented-btn${active ? ' is-active' : ''}`}
            aria-pressed={active}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
