import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import CTA, { Footer } from '@/components/layout/CTA';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';

const HomePage = lazy(() => import('@/pages/HomePage'));
const PlatformPage = lazy(() => import('@/pages/PlatformPage'));
const SavingsPage = lazy(() => import('@/pages/SavingsPage'));
const AIPage = lazy(() => import('@/pages/AIPage'));
const BTPPage = lazy(() => import('@/pages/BTPPage'));
const SecurityPage = lazy(() => import('@/pages/SecurityPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const NotFound = lazy(() => import('@/components/sections/NotFound'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white flex flex-col">
        <ScrollToTop />
        <Navbar />
        <main className="pt-20 flex-grow">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/platform" element={<PlatformPage />} />
                <Route path="/savings" element={<SavingsPage />} />
                <Route path="/ai" element={<AIPage />} />
                <Route path="/btp" element={<BTPPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<CTA />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
        <ScrollToTopButton />
      </div>
    </BrowserRouter>
  );
}
