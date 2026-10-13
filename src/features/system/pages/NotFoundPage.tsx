import { Link } from 'react-router-dom';
export function NotFoundPage() { return <main className="mv-empty"><div className="mv-empty-icon">404</div><h2>Sorry, this page doesn't exist.</h2><p>The address may be incorrect or the page may have moved.</p><Link className="mv-primary-button" to="/">Back to dashboard</Link></main>; }
