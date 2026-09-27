import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastListener } from './components/ToastListener';
import { ConfirmProvider } from './components/ConfirmProvider';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { SubscriptionExpiredPage } from './features/auth/SubscriptionExpiredPage';
import { HomePage } from './features/dashboard/HomePage';
import { NotFoundPage } from './features/NotFoundPage';

function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 className="mv-heading">{title}</h2>
      <p>This page is coming in a later phase.</p>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AntdApp>
        <ToastListener />
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/subscription-expired" element={<SubscriptionExpiredPage />} />

                <Route element={<AppShell />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/account" element={<ComingSoonPage title="Account" />} />
                  <Route path="/subscription" element={<ComingSoonPage title="Subscription" />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </AntdApp>
    </ThemeProvider>
  );
}

export default App;
