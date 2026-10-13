import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LottieSvg, type LottieHandle } from 'lottie-react';

export type AnimatedIconTrigger = 'hover' | 'loop' | 'mount' | 'click';

export interface AnimatedIconProps {
  /** A parsed Uicon Lottie JSON, imported from src/assets/uicons/*.json. */
  animation: Record<string, unknown>;
  size?: number;
  /** Any CSS color, including a token like 'var(--mv-danger)'. Defaults to
   * inheriting the surrounding text color, matching the static SVG icons'
   * `stroke="currentColor"` behaviour. */
  color?: string;
  trigger?: AnimatedIconTrigger;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/** Every icon in the Uicon Animated Icons pack is single-tone, pure black
 * (`[0,0,0,1]`) — confirmed across a broad sample. Recoloring is therefore a
 * single targeted replace rather than a general color walker. */
const BLACK_COLOR_RE = /"c":\{"a":0,"k":\[0,0,0,1\]/g;

const recolorCache = new Map<string, Record<string, unknown>>();

function recolor(animation: Record<string, unknown>, unitRgb: string): Record<string, unknown> {
  const key = `${(animation as { nm?: string }).nm ?? ''}|${unitRgb}`;
  const cached = recolorCache.get(key);
  if (cached) return cached;
  const json = JSON.stringify(animation).replace(BLACK_COLOR_RE, `"c":{"a":0,"k":[${unitRgb},1]`);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  recolorCache.set(key, parsed);
  return parsed;
}

/** lottie-web colors are normalized 0–1, not 0–255. */
function toUnitRgb(cssColor: string): string {
  const match = cssColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!match) return '0,0,0';
  return [match[1], match[2], match[3]].map((v) => Number(v) / 255).join(',');
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Renders one icon from the Uicon Animated Icons Vol2 pack (src/assets/uicons)
 * with the same drop-in feel as the static icons in src/shared/ui/icons.tsx:
 * sized in pixels, colored via inheritance or an explicit CSS color, and
 * accessible (decorative by default, or an img role when given a label).
 *
 * `trigger` controls when it plays: 'hover' (the pack's own intended
 * interaction — plays once on mouseenter, resets to rest on mouseleave),
 * 'click', 'mount' (plays once automatically), or 'loop' (continuous —
 * use sparingly, per the design system's motion-restraint guidance).
 * Respects prefers-reduced-motion by never auto-playing or looping.
 */
export function AnimatedIcon({ animation, size = 20, color, trigger = 'hover', className, style, ariaLabel }: AnimatedIconProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const lottieRef = useRef<LottieHandle>(null);
  const [resolved, setResolved] = useState<Record<string, unknown> | null>(null);
  const reducedMotion = useMemo(prefersReducedMotion, []);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setResolved(recolor(animation, toUnitRgb(getComputedStyle(el).color)));
  }, [animation, color]);

  // Hover plays on whichever ancestor is actually the interactive element
  // (a button, link, or table row an icon sits inside), not just this small
  // icon's own tiny bounding box — so nav items, icon-buttons and list rows
  // all "just work" without every call site wiring up its own hover state.
  useEffect(() => {
    if (trigger !== 'hover' || reducedMotion) return;
    const el = wrapperRef.current;
    if (!el) return;
    const target = el.closest<HTMLElement>('button, a, [role="button"], tr, .mv-icon-button') ?? el;
    const onEnter = () => lottieRef.current?.play();
    const onLeave = () => lottieRef.current?.stop();
    target.addEventListener('mouseenter', onEnter);
    target.addEventListener('mouseleave', onLeave);
    return () => {
      target.removeEventListener('mouseenter', onEnter);
      target.removeEventListener('mouseleave', onLeave);
    };
  }, [trigger, reducedMotion, resolved]);

  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, flex: 'none', lineHeight: 0, color, ...style }}
      aria-hidden={ariaLabel ? undefined : true}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      onClick={() => { if (trigger === 'click' && !reducedMotion) { lottieRef.current?.stop(); lottieRef.current?.play(); } }}
    >
      {resolved && (
        <LottieSvg
          src={resolved}
          lottieRef={lottieRef}
          loop={trigger === 'loop' && !reducedMotion}
          autoplay={(trigger === 'loop' || trigger === 'mount') && !reducedMotion}
          style={{ width: size, height: size }}
        />
      )}
    </span>
  );
}
