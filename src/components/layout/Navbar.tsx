import { useEffect, useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/components/ui/ThemeProvider';

const navLinks: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Platform', path: '/platform' },
  { label: 'Savings', path: '/savings' },
  { label: 'AI FinOps', path: '/ai' },
  { label: 'SAP BTP', path: '/btp' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Security', path: '/security' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  const location = useLocation();
  const activePath = location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-navy-100 dark:border-gray-800 shadow-sm'
          : 'bg-white dark:bg-gray-900 border-b border-navy-50 dark:border-gray-800'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group cursor-pointer focus:outline-none">
          <img src="/logo.png" alt="Mavera Logo" className="h-12 w-auto" />
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((l) => (
            <li key={l.path}>
              <Link
                to={l.path}
                className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  activePath === l.path
                    ? 'text-brand-700 dark:text-brand-400'
                    : 'text-navy-600 dark:text-gray-300 hover:text-brand-700 dark:hover:text-brand-400'
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            to="/contact"
            className="text-sm font-medium text-navy-600 dark:text-gray-300 transition-all duration-200 hover:text-brand-700 dark:hover:text-brand-400 hover:scale-105"
          >
            Contact Us
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-700 dark:text-gray-300 hover:bg-navy-50 dark:hover:bg-gray-800 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <>
          {/* Overlay to click outside and close */}
          <div 
            className="fixed inset-0 top-[76px] z-40 bg-navy-900/20 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 lg:hidden border-t border-navy-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            <div className="space-y-1 px-5 py-4 relative z-50">
              {navLinks.map((l) => (
                <Link
                  key={l.path}
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    activePath === l.path
                      ? 'text-brand-700 dark:text-brand-400 bg-navy-50 dark:bg-gray-800'
                      : 'text-navy-700 dark:text-gray-300 hover:bg-navy-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="mt-4 block w-full rounded-xl bg-navy-900 dark:bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
              >
                Request a Demo
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
