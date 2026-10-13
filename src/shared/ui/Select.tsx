import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDownIcon } from './icons';
import { computeFloatingPosition, type FloatingRect } from './floatingPosition';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string | number> {
  label: string;
  /** Keep the label for assistive tech but don't show it, for toolbars whose
   * selected value already reads as the label (MAVERA_DESIGN_SYSTEM.md §6.2). */
  hideLabel?: boolean;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
  style?: CSSProperties;
  helpText?: ReactNode;
}

const SEARCH_THRESHOLD = 8;
const POPUP_MAX_HEIGHT = 320;

/**
 * Custom listbox dropdown per MAVERA_DESIGN_SYSTEM.md §8.3: label/value/
 * chevron, popup capped at 320px with a search field once there are more
 * than 8 options, a checkmark on the selected row, and explicit loading/
 * error/empty states.
 */
export function Select<T extends string | number>({
  label, hideLabel, value, onChange, options, disabled, loading, error, required, className, style, helpText,
}: SelectProps<T>) {
  const reactId = useId();
  const listboxId = `select-${reactId}-listbox`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [rect, setRect] = useState<(FloatingRect & { width: number }) | null>(null);

  const searchable = options.length > SEARCH_THRESHOLD;
  const filtered = useMemo(
    () => (searchable && search ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())) : options),
    [options, search, searchable],
  );
  const selected = options.find((o) => o.value === value);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const selectValue = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  };

  const openPopup = () => {
    if (disabled || loading) return;
    const startIndex = Math.max(0, options.findIndex((o) => o.value === value));
    setHighlighted(startIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const trigger = triggerRef.current;
      const popup = popupRef.current;
      if (!trigger) return;
      const anchor = trigger.getBoundingClientRect();
      const width = Math.max(anchor.width, 200);
      const placed = computeFloatingPosition(anchor, { width, height: popup?.offsetHeight ?? POPUP_MAX_HEIGHT }, {
        align: 'start', preferred: 'bottom', gap: 4,
      });
      setRect({ ...placed, width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, filtered.length]);

  useEffect(() => { setHighlighted((h) => Math.min(h, Math.max(filtered.length - 1, 0))); }, [filtered.length]);

  const moveHighlight = (delta: number) => {
    if (filtered.length === 0) return;
    setHighlighted((h) => {
      let next = h + delta;
      if (next < 0) next = filtered.length - 1;
      if (next >= filtered.length) next = 0;
      return next;
    });
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); moveHighlight(1); break;
      case 'ArrowUp': event.preventDefault(); moveHighlight(-1); break;
      case 'Home': event.preventDefault(); setHighlighted(0); break;
      case 'End': event.preventDefault(); setHighlighted(Math.max(filtered.length - 1, 0)); break;
      case 'Enter':
      case ' ':
        if (!searchable || event.key === 'Enter') {
          event.preventDefault();
          const option = filtered[highlighted];
          if (option) selectValue(option);
        }
        break;
      case 'Escape':
        event.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPopup();
      }
      return;
    }
    if (!searchable) onListKeyDown(event);
  };

  const activeOptionId = filtered[highlighted] ? `${listboxId}-opt-${highlighted}` : undefined;

  let popupBody: ReactNode;
  if (loading) {
    popupBody = <div className="mv-select-status">Loading…</div>;
  } else if (error) {
    popupBody = <div className="mv-select-status mv-select-status--error">{error}</div>;
  } else {
    popupBody = (
      <ul className="mv-select-options" role="listbox" id={listboxId} aria-label={label} onKeyDown={searchable ? undefined : onListKeyDown}>
        {filtered.length === 0 ? (
          <li className="mv-select-status" role="presentation">{search ? `No matches for "${search}".` : 'No options.'}</li>
        ) : filtered.map((option, index) => (
          <li
            key={option.value}
            id={`${listboxId}-opt-${index}`}
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            className={`mv-select-option${index === highlighted ? ' is-active' : ''}${option.disabled ? ' is-disabled' : ''}`}
            onMouseEnter={() => setHighlighted(index)}
            onClick={() => selectValue(option)}
          >
            <span>{option.label}</span>
            {option.value === value && <CheckIcon size={15} className="mv-select-check" />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <label className={`mv-field${className ? ` ${className}` : ''}`}>
      {hideLabel ? <span className="mv-sr-only">{label}</span> : label}
      <button
        ref={triggerRef}
        type="button"
        className="mv-select"
        style={style}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-activedescendant={open ? activeOptionId : undefined}
        onClick={() => (open ? close() : openPopup())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="mv-select-value">{selected?.label ?? ''}</span>
        <ChevronDownIcon size={16} className="mv-select-chevron" />
      </button>
      {helpText && <span className="mv-field-help">{helpText}</span>}

      {open && createPortal(
        <div
          ref={popupRef}
          className="mv-select-popup"
          style={{ top: rect?.top ?? 0, left: rect?.left ?? 0, width: rect?.width, maxHeight: POPUP_MAX_HEIGHT }}
        >
          {searchable && (
            <div className="mv-select-search-wrap">
              <input
                ref={searchRef}
                className="mv-select-search"
                type="text"
                aria-label={`Search ${label}`}
                placeholder="Search…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlighted(0); }}
                onKeyDown={onListKeyDown}
              />
            </div>
          )}
          {popupBody}
        </div>,
        document.body,
      )}
    </label>
  );
}
