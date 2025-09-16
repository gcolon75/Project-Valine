import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';

/**
 * Displays a list of auditions in an infinitely scrolling feed. Each
 * audition is rendered as an enriched card with a title, summary and
 * call to action. The updated styling uses the new feed-card class to
 * provide depth and interactivity, drawing inspiration from modern
 * social feeds.
 */
export default function Auditions() {
  const { items, sentinel } = useInfiniteList((p) => api.listAuditions(p), []);
  return (
    <div className="auditions-page">
      <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Auditions</h2>
      {items.map((a) => (
        <div key={a.id} className="feed-card audition-card">
          <a href={`/auditions/${a.id}`} className="card-title">
            {a.title}
          </a>
          <p className="card-summary">{a.summary}</p>
          <div className="card-footer">
            <a href={`/auditions/${a.id}`} className="btn primary">
              View Details
            </a>
          </div>
        </div>
      ))}
      {/* Sentinel div for infinite scrolling */}
      <div ref={sentinel} style={{ height: 1 }}></div>
    </div>
  );
}