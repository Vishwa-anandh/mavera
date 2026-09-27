import { Avatar, Dropdown, type MenuProps } from 'antd';
import { UserOutlined, BulbOutlined, LogoutOutlined, SettingOutlined, CreditCardOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMaveraTheme } from '../theme/ThemeProvider';
import { useConfirm } from '../components/ConfirmProvider';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const { mode, density, toggleMode, setDensity } = useMaveraTheme();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Log out of Mavera?', variant: 'logout', okText: 'Log out' });
    if (ok) {
      await logout();
      navigate('/login');
    }
  };

  const items: MenuProps['items'] = [
    { key: 'email', label: user?.email, disabled: true },
    { type: 'divider' },
    {
      key: 'appearance',
      label: mode === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance',
      icon: <BulbOutlined />,
      onClick: toggleMode,
    },
    {
      key: 'density',
      label: density === 'compact' ? 'Switch to comfortable density' : 'Switch to compact density',
      icon: <SettingOutlined />,
      onClick: () => setDensity(density === 'compact' ? 'comfortable' : 'compact'),
    },
    { key: 'account', label: <Link to="/account">Account</Link>, icon: <UserOutlined /> },
    { key: 'subscription', label: <Link to="/subscription">Subscription</Link>, icon: <CreditCardOutlined /> },
    { type: 'divider' },
    { key: 'logout', label: 'Log out', icon: <LogoutOutlined />, onClick: handleLogout },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} aria-label="Profile menu" />
    </Dropdown>
  );
}
