import { useState } from 'react';
import { CheckIcon } from './icons';

/** Copies a value exactly as stored (leading zeros included) and confirms inline. */
export function CopyButton({ value, label = 'Copy ID', ariaLabel }: { value: string; label?: string; ariaLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="mv-quiet-button mv-copy-button" onClick={copy} aria-live="polite" aria-label={ariaLabel ? (copied ? `${ariaLabel} (copied)` : ariaLabel) : undefined}>
      {copied ? <><CheckIcon size={14} aria-hidden /> Copied</> : label}
    </button>
  );
}
