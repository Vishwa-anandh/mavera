import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
    >
      <button
        onClick={scrollToTop}
        className="p-3.5 rounded-full bg-brand-600 text-white shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center focus:outline-none"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5 stroke-[2.5px]" />
      </button>
    </div>
  );
}
