import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';

const sections = [
  { id: 'about', title: '1. About This Privacy Policy' },
  { id: 'information', title: '2. Information We May Collect' },
  { id: 'credentials', title: '3. Cloud Credentials and Access' },
  { id: 'use', title: '4. How We Use Information' },
  { id: 'ai', title: '5. AI Features' },
  { id: 'protection', title: '6. Data Protection' },
  { id: 'sharing', title: '7. Sharing of Information' },
  { id: 'retention', title: '8. Data Retention' },
  { id: 'security', title: '9. Security' },
  { id: 'international', title: '10. International Transfers' },
  { id: 'cookies', title: '11. Cookies' },
  { id: 'rights', title: '12. Your Rights' },
  { id: 'changes', title: '13. Changes' },
  { id: 'contact', title: '14. Contact' },
];

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState('about');

  useEffect(() => {
    const handleScroll = () => {
      let current = '';
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150) {
            current = section.id;
          }
        }
      }
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white min-h-screen">

      {/* Header Area */}
      <div className="bg-slate-50 border-b border-slate-200 py-16 lg:py-10">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex items-center gap-3 text-brand-600 mb-6">
            <ShieldCheck className="w-8 h-8" />
            <span className="font-bold tracking-widest text-sm">Legal & Privacy</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Privacy Policy
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 lg:py-20 flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

        {/* Sticky Sidebar Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-32 hidden lg:block">
          <h4 className="text-xs font-black tracking-widest text-slate-400 mb-6">Contents</h4>
          <nav className="flex flex-col gap-1.5 border-l border-slate-100">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`text-left text-sm py-2 px-4 transition-all border-l-2 -ml-[1px] flex justify-between items-center group ${activeSection === s.id
                  ? 'border-brand-600 text-brand-600 font-bold bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
              >
                {s.title}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeSection === s.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50'}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl space-y-12 text-slate-600 leading-relaxed text-[15px]">

          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
            <h3 className="text-amber-800 font-bold mb-2">Important Notice</h3>
            <p className="text-amber-700 text-sm">
              This is a business-ready draft and must be reviewed and approved by Maitsys legal/privacy counsel before publication. Replace all bracketed placeholders with the final legal entity name, address, privacy contact, retention periods and production URL.
            </p>
          </div>

          <div id="about" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">1. About This Privacy Policy</h2>
            <p>
              This Privacy Policy explains how [MAITSYS LEGAL ENTITY NAME] (“Maitsys”, “we”, “us” or “our”) collects, uses, stores, protects and shares information when you visit the Mavera website, create or use a Mavera account, request a demonstration, contact us, or use Mavera services.
            </p>
          </div>

          <div id="information" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">2. Information We May Collect</h2>
            <ul className="space-y-3">
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span><strong>Account information:</strong> name, business email, company, job title, phone number and login details.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span><strong>Cloud information:</strong> provider, subscription/account identifiers, resource metadata, service names, regions, usage and billing information needed to provide Mavera.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span><strong>Support information:</strong> enquiries, requests, feedback and correspondence.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span><strong>Technical information:</strong> IP address, browser/device information, operating system, timestamps, logs and application usage.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span><strong>Subscription information:</strong> plan and billing status; payment details may be processed by our payment provider.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span>Information voluntarily submitted through Mavera forms, reports or features.</span></li>
            </ul>
          </div>

          <div id="credentials" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">3. Cloud Credentials and Access</h2>
            <p>
              Mavera may require customers to authorize access to cloud-provider accounts or APIs. Customers should provide only permissions required for the selected functionality. Where supported, Mavera should use secure credential storage, encryption and least-privilege access. Customers remain responsible for ensuring that credentials and permissions are appropriately authorized.
            </p>
          </div>

          <div id="use" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">4. How We Use Information</h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Provide and maintain Mavera.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Monitor and analyze cloud costs and savings.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Generate dashboards, alerts and AI insights.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Provide support and respond to enquiries.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Authenticate users and maintain security.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Detect and prevent fraud and security incidents.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Improve Mavera functionality and user experience.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Send service or marketing communications.</li>
            </ul>
          </div>

          <div id="ai" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">5. AI Features</h2>
            <p>
              Mavera may use AI or machine-learning services to generate executive summaries, forecasts, anomaly detection, recommendations and natural-language responses. AI outputs may not always be accurate or complete and should be validated before material financial or operational decisions are taken.
            </p>
          </div>

          <div id="protection" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">6. Data Protection</h2>
            <p>
              Where applicable, we process personal data based on consent, contract, legal obligations, legitimate interests or another lawful basis. For India, Mavera should be operated in accordance with applicable requirements of the Digital Personal Data Protection Act, 2023 and Digital Personal Data Protection Rules, 2025, including applicable phased commencement dates.
            </p>
          </div>

          <div id="sharing" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">7. Sharing of Information</h2>
            <ul className="space-y-3 mb-6">
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span> Service providers supporting hosting, authentication, analytics, communications, AI and support.</li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span> Cloud providers and integrations when required for requested functionality.</li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span> Professional advisers and auditors where reasonably required.</li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span> Authorities where legally required.</li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span> Transaction parties in a merger, acquisition or restructuring.</li>
            </ul>
            <p className="bg-slate-50 text-slate-700 px-4 py-3 rounded-lg border border-slate-200">
              We do not sell personal information for monetary consideration.
            </p>
          </div>

          <div id="retention" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">8. Data Retention</h2>
            <p>
              We retain information only as reasonably necessary to provide services, meet contractual requirements, maintain security, resolve disputes and comply with legal obligations. Specific retention periods should be defined in Mavera's data-retention schedule and customer agreements.
            </p>
          </div>

          <div id="security" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">9. Security</h2>
            <p>
              We use reasonable technical and organizational safeguards appropriate to the information, which may include encryption, access controls, authentication, logging, monitoring, backup controls and secure development practices. No internet service can guarantee absolute security.
            </p>
          </div>

          <div id="international" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">10. International Transfers</h2>
            <p>
              Mavera may use infrastructure and service providers located in other countries. Where applicable, appropriate safeguards will be used in accordance with applicable law.
            </p>
          </div>

          <div id="cookies" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">11. Cookies</h2>
            <p>
              Mavera may use essential cookies for authentication, security and functionality. Optional analytics or marketing technologies, if used, should be described in a separate cookie notice.
            </p>
          </div>

          <div id="rights" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">12. Your Rights</h2>
            <p>
              Depending on applicable law, individuals may have rights concerning access, correction, deletion, withdrawal of consent and grievance/complaint handling. Requests may be submitted through the contact details below.
            </p>
          </div>

          <div id="changes" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">13. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. The updated version will be posted with a revised effective date.
            </p>
          </div>

          <div id="contact" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">14. Contact</h2>
            <div className="bg-[#fafbfe] p-8 rounded-2xl border border-slate-200">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-black tracking-widest text-slate-400 mb-2">Call Us</h4>
                  <p className="text-slate-900 font-medium">+1 (978) 472-2177</p>
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-widest text-slate-400 mb-2">Email</h4>
                  <a href="mailto:contact@maitsys.com" className="text-brand-600 font-medium hover:underline cursor-pointer">contact@maitsys.com</a>
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-widest text-slate-400 mb-2">Global Headquarters</h4>
                  <p className="text-slate-900 font-medium">1 Marina Park Drive<br />Boston, MA 02210</p>
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-widest text-slate-400 mb-2">Website</h4>
                  <a href="https://www.maitsys.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-medium hover:underline cursor-pointer">https://www.maitsys.com</a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
