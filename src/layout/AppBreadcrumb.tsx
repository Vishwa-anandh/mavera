import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function AppBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <Breadcrumb
        items={items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return {
            title:
              item.path && !isCurrent ? (
                <Link to={item.path}>{item.label}</Link>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined}>{item.label}</span>
              ),
          };
        })}
      />
    </nav>
  );
}
