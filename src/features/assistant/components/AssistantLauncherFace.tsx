import { useEffect, useRef } from 'react';

const MAX_X = 4; // px the eyes may travel sideways
const MAX_Y = 3; // px the eyes may travel up/down

/**
 * The assistant launcher's face: a chat-bubble "screen" whose two eyes follow the pointer
 * around the page and blink now and then. Movement is written to CSS variables on the face
 * (no React re-render per pointer move) and eased in CSS. Skipped entirely when the user
 * prefers reduced motion, leaving the eyes centred and still. Decorative only.
 */
export function AssistantLauncherFace({ className }: { className?: string } = {}) {
  const faceRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const face = faceRef.current;
    if (!face || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const update = () => {
      frame = 0;
      if (!pointer) return;
      const rect = face.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      // Full deflection once the pointer is ~160px away; gentler when it's close by.
      const reach = Math.min(1, distance / 160);
      face.style.setProperty('--eye-x', `${((dx / distance) * MAX_X * reach).toFixed(2)}px`);
      face.style.setProperty('--eye-y', `${((dy / distance) * MAX_Y * reach).toFixed(2)}px`);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => {
      pointer = null;
      face.style.setProperty('--eye-x', '0px');
      face.style.setProperty('--eye-y', '0px');
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <span className={className ? `mv-bot-face ${className}` : 'mv-bot-face'} ref={faceRef} aria-hidden="true">
      <span className="mv-bot-eyes">
        <span className="mv-bot-eye" />
        <span className="mv-bot-eye" />
      </span>
    </span>
  );
}
