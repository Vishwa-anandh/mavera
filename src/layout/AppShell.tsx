import { Navigate, Outlet } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { useAuth } from '../context/AuthContext';
import { ModuleNavigation } from './ModuleNavigation';
import { ProfileMenu } from './ProfileMenu';
import { Footer } from './Footer';

const { Header, Content } = Layout;

export function AppShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" aria-label="Loading application" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid var(--mv-divider)',
        }}
      >
        <span className="mv-heading" style={{ fontSize: 18, letterSpacing: '0.04em', color: 'var(--mv-text)' }}>
          MAVERA
        </span>
        <div style={{ flex: 1 }}>
          <ModuleNavigation />
        </div>
        <ProfileMenu />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
      <Footer />
    </Layout>
  );
}
