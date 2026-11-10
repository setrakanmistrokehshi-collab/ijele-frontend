import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';

export default function NotFoundPage() {
  useSeo({ title: 'Page not found', noindex: true });
  return (
    <div className="wrap sec">
      <h1 className="pg">We couldn’t find that page</h1>
      <p className="lede">The piece may have sold out or been removed, or the address may have a typo. The full collection is one click away.</p>
      <Link className="cta" to="/">Back to the collection</Link>
    </div>
  );
}
