import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';

const sections = [
  { id: 'acceptance', title: '1. Acceptance' },
  { id: 'services', title: '2. CCM Services' },
  { id: 'account', title: '3. Account and Access' },
  { id: 'authorization', title: '4. Cloud Provider Authorization' },
  { id: 'responsibilities', title: '5. Customer Responsibilities' },
  { id: 'costs', title: '6. Costs, Savings and Forecasts' },
  { id: 'ai', title: '7. AI Services' },
  { id: 'subscription', title: '8. Subscription and Fees' },
  { id: 'third-party', title: '9. Third-Party Services' },
  { id: 'acceptable-use', title: '10. Acceptable Use' },
  { id: 'ip', title: '11. Intellectual Property' },
  { id: 'customer-data', title: '12. Customer Data' },
  { id: 'confidentiality', title: '13. Confidentiality' },
  { id: 'security', title: '14. Security' },
  { id: 'availability', title: '15. Availability and Support' },
  { id: 'termination', title: '16. Suspension and Termination' },
  { id: 'disclaimers', title: '17. Disclaimers' },
  { id: 'liability', title: '18. Limitation of Liability' },
  { id: 'indemnification', title: '19. Indemnification' },
  { id: 'law', title: '20. Governing Law' },
  { id: 'changes', title: '21. Changes' },
  { id: 'contact', title: '22. Contact' },
];

export default function TermsAndConditions() {
  const [activeSection, setActiveSection] = useState('acceptance');

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
            Terms & Conditions
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Effective Date: [DD Month YYYY] <span className="mx-2">•</span> Last Updated: [DD Month YYYY]
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 lg:py-20 flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
        
        {/* Sticky Sidebar Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-32 hidden lg:block">
          <h4 className="text-xs font-black tracking-widest text-slate-400 mb-6">Contents</h4>
          <nav className="flex flex-col gap-1.5 border-l border-slate-100 max-h-[70vh] overflow-y-auto pr-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`text-left text-sm py-2 px-4 transition-all border-l-2 -ml-[1px] flex justify-between items-center group ${
                  activeSection === s.id 
                    ? 'border-brand-600 text-brand-600 font-bold bg-brand-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <span className="truncate pr-2">{s.title}</span>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeSection === s.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50'}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl space-y-12 text-slate-600 leading-relaxed text-[15px]">
          
          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
            <h3 className="text-amber-800 font-bold mb-2">Important Notice</h3>
            <p className="text-amber-700 text-sm">
              This is a business-ready draft and must be reviewed by Maitsys legal counsel before publication and before use in customer contracts. Replace bracketed placeholders and align it with the final subscription agreement, SLA, DPA and security terms.
            </p>
          </div>

          <div id="acceptance" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">1. Acceptance</h2>
            <p>
              These Terms govern access to and use of CCM – Cloud Cost Monitor by [MAITSYS LEGAL ENTITY NAME] (“Maitsys”). By creating an account, accessing or using CCM, the customer agrees to these Terms. If acting for an organization, the user represents that they have authority to bind it.
            </p>
          </div>

          <div id="services" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">2. CCM Services</h2>
            <p>
              CCM provides cloud cost monitoring, resource monitoring, savings analysis, forecasting, alerts, reporting, AI-assisted insights and related FinOps capabilities. Functionality depends on the selected plan, provider integration and configuration.
            </p>
          </div>

          <div id="account" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">3. Account and Access</h2>
            <ul className="space-y-3">
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span>Provide accurate account information.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span>Protect account credentials and report suspected unauthorized access.</span></li>
              <li className="flex gap-3"><span className="text-brand-500 font-bold">•</span><span>Ensure users are authorized to access connected cloud environments.</span></li>
            </ul>
          </div>

          <div id="authorization" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">4. Cloud Provider Authorization</h2>
            <p>
              CCM may connect to Azure, AWS, SAP BTP and other supported environments through customer-authorized APIs, roles, service principals, access keys, OAuth or other methods. The Customer authorizes retrieval of data required for selected CCM functionality. CCM does not take ownership of Customer cloud accounts or resources.
            </p>
          </div>

          <div id="responsibilities" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">5. Customer Responsibilities</h2>
            <ul className="space-y-3">
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span><span>Maintain appropriately scoped cloud permissions.</span></li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span><span>Provide accurate information.</span></li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span><span>Comply with applicable laws and provider terms.</span></li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span><span>Review recommendations and alerts before implementing changes.</span></li>
              <li className="flex gap-3"><span className="text-slate-400 font-bold">•</span><span>Maintain appropriate backups and business continuity measures.</span></li>
            </ul>
          </div>

          <div id="costs" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">6. Costs, Savings and Forecasts</h2>
            <p>
              CCM cost calculations, savings estimates, forecasts, anomaly scores and recommendations are decision-support outputs and are not guarantees of actual provider charges or savings. Actual charges depend on provider pricing, usage, taxes, commitments, contracts and resource changes. Customers must validate recommendations before acting.
            </p>
          </div>

          <div id="ai" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">7. AI Services</h2>
            <p>
              AI-generated summaries, recommendations, forecasts, anomaly explanations and chat responses may contain errors or omissions and should not be treated as financial, legal, tax, security or operational advice. Customers remain responsible for decisions and actions based on CCM outputs.
            </p>
          </div>

          <div id="subscription" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">8. Subscription and Fees</h2>
            <p>
              CCM may be offered in Standard and AI-enabled plans. Fees, billing frequency, limits, renewal and payment terms will be specified in the applicable order form or subscription agreement. Fees are non-refundable except where required by law or contract.
            </p>
          </div>

          <div id="third-party" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">9. Third-Party Services</h2>
            <p>
              CCM relies on third-party cloud providers and services. Their availability, pricing, APIs and functionality are controlled by those providers and may affect CCM.
            </p>
          </div>

          <div id="acceptable-use" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">10. Acceptable Use</h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Do not violate applicable law or third-party rights.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Do not attempt unauthorized access.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Do not interfere with CCM availability or security.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Do not reverse engineer or misuse the service except where law permits.</li>
              <li className="flex gap-3 bg-slate-50 p-3 rounded-lg"><ChevronRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />Do not upload malicious code.</li>
            </ul>
          </div>

          <div id="ip" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">11. Intellectual Property</h2>
            <p>
              Maitsys and its licensors retain rights in CCM software, interfaces, designs, trademarks, documentation and technology, except for Customer Data. No rights are granted other than those expressly provided.
            </p>
          </div>

          <div id="customer-data" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">12. Customer Data</h2>
            <p>
              The Customer retains its rights in Customer Data. The Customer grants Maitsys the rights necessary to host, process and use Customer Data to provide CCM and related services. Additional data-processing terms may apply.
            </p>
          </div>

          <div id="confidentiality" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">13. Confidentiality</h2>
            <p>
              Each party will protect confidential information received from the other and use it only for purposes related to the business relationship, subject to customary exclusions and legally required disclosures.
            </p>
          </div>

          <div id="security" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">14. Security</h2>
            <p>
              Maitsys will maintain reasonable technical and organizational security measures for CCM. Customers remain responsible for the security of their cloud accounts, credentials, configurations and users.
            </p>
          </div>

          <div id="availability" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">15. Availability and Support</h2>
            <p>
              CCM availability, support hours and response commitments, if any, will be described in the applicable SLA or subscription/order documentation. Planned maintenance and events outside Maitsys's reasonable control may affect availability.
            </p>
          </div>

          <div id="termination" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">16. Suspension and Termination</h2>
            <p>
              Maitsys may suspend or terminate access for material breach, non-payment, security risk, unlawful use or other grounds permitted by the applicable agreement. Data handling after termination will follow the applicable contract and retention requirements.
            </p>
          </div>

          <div id="disclaimers" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">17. Disclaimers</h2>
            <p>
              To the maximum extent permitted by law, CCM analytics, forecasts and recommendations are provided as decision support information and are not guaranteed to be error-free or uninterrupted. Customers should independently verify material decisions.
            </p>
          </div>

          <div id="liability" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">18. Limitation of Liability</h2>
            <p>
              Liability caps, exclusions and carve-outs will be governed by the applicable order form or master agreement and must be finalized by legal counsel.
            </p>
          </div>

          <div id="indemnification" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">19. Indemnification</h2>
            <p>
              Any indemnification obligations will be governed by the applicable customer agreement or order form and should be finalized by legal counsel.
            </p>
          </div>

          <div id="law" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">20. Governing Law</h2>
            <p>
              These Terms will be governed by the laws of [STATE/COUNTRY]. Courts or dispute resolution will be as specified in the applicable agreement. Maitsys legal counsel should confirm jurisdiction and venue.
            </p>
          </div>

          <div id="changes" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">21. Changes</h2>
            <p>
              Maitsys may update these Terms from time to time. Updated Terms will be posted with a revised effective date and communicated where required.
            </p>
          </div>

          <div id="contact" className="scroll-mt-32">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">22. Contact</h2>
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
