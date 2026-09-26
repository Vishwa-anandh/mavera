import { useEffect, useState } from 'react';

interface Slide {
  src: string;
  alt: string;
  caption: string;
}

const SLIDES: Slide[] = [
  {
    src: '/auth_dashboard.png',
    alt: 'Cloud Cost Monitoring dashboard',
    caption: 'See spend across every cloud in one place',
  },
  {
    src: '/auth_security.png',
    alt: 'Security posture overview',
    caption: 'Stay ahead of risk with continuous monitoring',
  },
  {
    src: '/auth_ai.png',
    alt: 'AI copilot answering a cost question',
    caption: 'Ask your cost data questions in plain English',
  },
];

const ROTATE_MS = 5000;

export function AuthCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <div role="group" aria-label="Product highlights" style={{ textAlign: 'center' }}>
      <img src={slide.src} alt={slide.alt} style={{ maxWidth: '100%' }} />
      <p>{slide.caption}</p>
    </div>
  );
}
