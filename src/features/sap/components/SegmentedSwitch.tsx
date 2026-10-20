import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the visible label is only an icon or an abbreviation. */
  ariaLabel?: string;
}

interface SegmentedSwitchProps<T extends string> {
  /** Names the group for assistive tech, e.g. "Service memory view". */
  label: string;
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * A two- or three-way view switch (Chart | List, Donut | Bar, 7D | 14D). Both the choice and the
 * pressed state are exposed as toggle buttons in a labelled group; it is not a tab set and does
 * not hide any page region the user cannot also reach another way.
 */
export function SegmentedSwitch<T extends string>({ label, options, value, onChange }: SegmentedSwitchProps<T>) {
  return (
    <div className="mv-segmented mv-segmented--compact" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`mv-segmented-btn${value === option.value ? ' is-active' : ''}`}
          aria-pressed={value === option.value}
          aria-label={option.ariaLabel}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
