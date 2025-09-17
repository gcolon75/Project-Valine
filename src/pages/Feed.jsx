import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';

/**
 * Displays the personalised feed for the logged‑in user. Each item in
 * the feed could be a script, audition, update or other content type.
 * Items are presented in cards with the new feed-card styling. A
 * muted footer indicates the content kind.
 */
export default function Feed() {
  const { items, sentinel } = useInfiniteList((p) => api.feed(p), []);
  return (
    <div className="feed-page">
      <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Feed</h2>
      {items.map((it, i) => (
        <div key={i} className="feed-card">
          <h3 className="card-title">{it.title}</h3>
          <p className="card-summary">{it.summary}</p>
          <div className="card-footer">
            <span className="muted">{it.kind}</span>
          </div>
        </div>
      ))}
      {/* Infinite scroll sentinel */}
      <div ref={sentinel} style={{ height: 1 }}></div>
    </div>
  );
}