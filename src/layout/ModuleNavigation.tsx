import { useMemo } from 'react';
import { Menu, type MenuProps } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { derivePermissions } from '../lib/permissions';
import { resolveNav, type ResolvedNavLeaf } from './navConfig';
import { StatusTag } from '../components/StatusTag';

function LeafLabel({ leaf }: { leaf: ResolvedNavLeaf }) {
  return (
    <Link to={leaf.path}>
      {leaf.label}
      {leaf.locked && (
        <>
          {' '}
          <LockOutlined style={{ marginLeft: 4 }} />
          <StatusTag tone="neutral">Upgrade</StatusTag>
        </>
      )}
    </Link>
  );
}

export function ModuleNavigation() {
  const { user, cloudAccess, invoiceOnly, features } = useAuth();
  const location = useLocation();
  const permissions = useMemo(
    () => derivePermissions(user, cloudAccess, invoiceOnly),
    [user, cloudAccess, invoiceOnly],
  );
  const entries = useMemo(
    () => resolveNav(permissions, { features, invoiceOnly }),
    [permissions, features, invoiceOnly],
  );

  const items: MenuProps['items'] = useMemo(
    () =>
      entries.map((entry) =>
        entry.type === 'leaf'
          ? { key: entry.key, label: <LeafLabel leaf={entry} /> }
          : {
              key: entry.key,
              label: entry.label,
              children: entry.children.map((leaf) => ({ key: leaf.key, label: <LeafLabel leaf={leaf} /> })),
            },
      ),
    [entries],
  );

  const allLeaves = useMemo(
    () => entries.flatMap((entry) => (entry.type === 'leaf' ? [entry] : entry.children)),
    [entries],
  );
  const selectedKeys = useMemo(() => {
    const match = allLeaves.find((leaf) => leaf.path === location.pathname);
    return match ? [match.key] : [];
  }, [allLeaves, location.pathname]);

  return <Menu mode="horizontal" selectedKeys={selectedKeys} items={items} />;
}
