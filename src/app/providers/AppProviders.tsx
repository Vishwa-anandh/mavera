import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { ToastListener } from '../../shared/ui/ToastListener';
import { ConfirmProvider } from '../../shared/ui/ConfirmProvider';
import { AuthProvider } from '../../features/auth';
import { SuperAdminAuthProvider } from '../../features/superAdmin';
import { BillingProvider } from '../../features/billing';
import { ErrorBoundary } from '../errors/ErrorBoundary';

/** Startup composition only: provider order matters (session providers wrap the router). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastListener />
        <ConfirmProvider>
          <AuthProvider>
            <SuperAdminAuthProvider>
              <BillingProvider>
                <BrowserRouter>{children}</BrowserRouter>
              </BillingProvider>
            </SuperAdminAuthProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
