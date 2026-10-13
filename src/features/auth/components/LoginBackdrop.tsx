import { useEffect, useRef } from 'react';

const PULSE_EVERY_MS = 3600;
const PULSE_SPEED = 0.22; // px per ms
const PULSE_BAND = 70; // px either side of the ring that lights up

/**
 * The sign-in backdrop: a quiet dot grid over a diagonal page gradient (see `.mv-login-backdrop`
 * in app.css), the same treatment Consultant Pulse uses. Dots near the pointer brighten and lean
 * away from it, and every few seconds a "pulse" ring travels out from the centre of the screen.
 * Colours come from the theme tokens, so it is correct in light and dark. With reduced motion it
 * is a still grid. Purely decorative and hidden from assistive technology.
 */
export function LoginBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let spacing = 24;
    let dots: Array<{ x: number; y: number; glow: number }> = [];
    let base = '#7C8798';
    let ink = '#182230';
    const pointer = { x: -9999, y: -9999, active: false };
    const start = performance.now();
    let frame = 0;

    const readColours = () => {
      const styles = getComputedStyle(document.documentElement);
      base = styles.getPropertyValue('--mv-border-control').trim() || base;
      ink = styles.getPropertyValue('--mv-text').trim() || ink;
    };

    const layout = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      spacing = Math.max(20, rem * 1.75);
      dots = [];
      const offsetX = (width % spacing) / 2;
      const offsetY = (height % spacing) / 2;
      for (let y = offsetY; y <= height; y += spacing) for (let x = offsetX; x <= width; x += spacing) dots.push({ x, y, glow: 0 });
      readColours();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const centreX = width / 2;
      const centreY = height / 2;
      const reach = Math.hypot(centreX, centreY);
      const elapsed = (time - start) % PULSE_EVERY_MS;
      const ring = reduceMotion ? -1 : elapsed * PULSE_SPEED;
      const ringFade = Math.max(0, 1 - ring / reach);
      const influence = spacing * 5;

      for (const dot of dots) {
        let target = 0;
        let x = dot.x;
        let y = dot.y;
        if (!reduceMotion) {
          // The travelling pulse.
          const fromCentre = Math.hypot(dot.x - centreX, dot.y - centreY);
          const band = Math.abs(fromCentre - ring);
          if (band < PULSE_BAND) target = Math.max(target, (1 - band / PULSE_BAND) * 0.75 * ringFade);
          // The pointer.
          if (pointer.active) {
            const dx = dot.x - pointer.x;
            const dy = dot.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < influence) {
              const strength = 1 - distance / influence;
              target = Math.max(target, strength);
              const push = strength * strength * spacing * 0.35;
              x += (dx / (distance || 1)) * push;
              y += (dy / (distance || 1)) * push;
            }
          }
        }
        // Ease towards the target so dots fade rather than blink.
        dot.glow += (target - dot.glow) * 0.12;
        context.globalAlpha = 0.28 + dot.glow * 0.6;
        context.fillStyle = dot.glow > 0.35 ? ink : base;
        context.beginPath();
        context.arc(x, y, 1 + dot.glow * 1.4, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const onPointerLeave = () => { pointer.active = false; };
    const onResize = () => { layout(); if (reduceMotion) draw(performance.now()); };
    // Re-read colours when the theme changes.
    const observer = new MutationObserver(() => { readColours(); if (reduceMotion) draw(performance.now()); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    layout();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div className="mv-login-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="mv-login-dots" />
    </div>
  );
}
