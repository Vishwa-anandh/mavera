import { Link } from 'react-router-dom';
export interface BreadcrumbItem { label: string; path?: string; }
export function AppBreadcrumb({ items }: { items: BreadcrumbItem[] }) { return <nav className="mv-breadcrumb" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`}>{item.path && index !== items.length - 1 ? <Link to={item.path}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}{index !== items.length - 1 && <b aria-hidden>›</b>}</span>)}</nav>; }
