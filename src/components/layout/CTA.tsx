import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, Phone, Linkedin, Youtube, Instagram, Facebook } from 'lucide-react';
import { useReveal } from '@/lib/hooks';

export default function CTA() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="pt-6 pb-12 lg:pt-8 lg:pb-16 relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_0%_50%,rgba(47,126,245,0.08),transparent)] pointer-events-none" />
      
      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <div
          ref={ref}
          className={`grid gap-12 lg:gap-16 lg:grid-cols-2 lg:items-center transition-all duration-700 ${
            shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Left: Info */}
          <div className="flex flex-col justify-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
              Contact <span className="text-brand-600">Us</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-navy-600 max-w-md">
              We are committed to processing the information in order to contact you and talk about your project.
            </p>
            
            <div className="mt-10 space-y-6">
              <div className="flex items-center gap-4 text-navy-700">
                <div className="text-brand-600 border border-brand-200 rounded p-1.5 bg-brand-50">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="font-medium">contact@maitsys.com</span>
              </div>
              <div className="flex items-center gap-4 text-navy-700">
                <div className="text-brand-600 border border-brand-200 rounded p-1.5 bg-brand-50">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="font-medium">+1 (978) 472-2177</span>
              </div>
            </div>

            {/* <div className="mt-10 flex gap-4">
              {[Linkedin, Youtube, Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-600 transition-colors hover:bg-brand-600 hover:text-white">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div> */}
          </div>

          {/* Right: Form */}
          <div className="rounded-2xl bg-white p-4 sm:p-10">
            {!submitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="flex flex-col gap-5"
              >
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium text-navy-700">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    className="w-full rounded-md border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-navy-700">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full rounded-md border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="help" className="block text-sm font-medium text-navy-700">
                    How can we help? <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="help"
                    required
                    rows={5}
                    className="w-full resize-none rounded-md border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                
               

                <button
                  type="submit"
                  className="mt-2 w-full rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-save-100 text-save-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">Message Sent!</h3>
                <p className="text-sm text-navy-600">
                  Thank you for reaching out. We will get back to you shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    {
      title: 'Product',
      links: [
        { label: 'Platform Deep Dive', path: '/platform' },
        { label: 'Cloud Savings', path: '/platform#savings' },
        { label: 'AI FinOps', path: '/ai' },
        { label: 'SAP BTP Monitoring', path: '/ai#btp' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Security & Trust', path: '/security' },
        { label: 'Pricing Plans', path: '/pricing' },
        { label: 'Contact Us', path: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', path: '/privacy-policy' },
        { label: 'Terms & Conditions', path: '/terms-and-conditions' },
      ],
    },
  ];

  return (
    <footer className="border-t border-navy-100 bg-white pt-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Mavera Logo" className="h-12 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-500">
              Mavera is an AI-powered Cloud & SAP BTP FinOps intelligence platform built by Maitsys — helping enterprises monitor, understand, optimize, predict, and save.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="text-sm font-bold text-navy-900">{c.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.path.startsWith('#') ? (
                        <a href={l.path} className="text-sm text-navy-500 transition-colors hover:text-brand-700">{l.label}</a>
                      ) : (
                        <Link to={l.path} className="text-sm text-navy-500 transition-colors hover:text-brand-700">{l.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-navy-100 py-8 sm:flex-row">
          <p className="text-xs text-navy-400">© {new Date().getFullYear()} Maitsys. All Rights Reserved.</p>
          <div className="flex gap-6 text-xs text-navy-400">
            <Link to="/privacy-policy" className="hover:text-navy-700 transition-colors">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-navy-700 transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
