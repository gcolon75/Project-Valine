import { useEffect, useState } from 'react';
import * as api from '../services/api';

export default function Requests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    // Use API if it exists; otherwise provide empty defaults so the page renders
    const p = api.listRequests ? api.listRequests() : Promise.resolve({ items: [] });

    Promise.resolve(p)
      .then((res) => {
        if (!ignore) setItems(res?.items || []);
      })
      .catch(() => {
        if (!ignore) setItems([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  return (
    <main className="container">
      <h1>Requests</h1>
      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && <p>No requests yet.</p>}
      {!loading && items.length > 0 && (
        <ul className="card-list">
          {items.map((req) => (
            <li className="card" key={req.id || req._id}>
              <div className="card-title">{req.title || 'Access Request'}</div>
              <div className="card-body">
                <p><strong>From:</strong> {req.fromName || req.from || 'Unknown'}</p>
                <p><strong>For:</strong> {req.scriptTitle || req.scriptId || 'N/A'}</p>
                {req.status && <p><strong>Status:</strong> {req.status}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
