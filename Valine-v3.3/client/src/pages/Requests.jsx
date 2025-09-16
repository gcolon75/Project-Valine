// Valine-v3.3/client/src/pages/Requests.jsx
import { useEffect, useState } from "react";

export default function Requests() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // hit your mock endpoint if you have one; otherwise keep empty
    fetch("/api/requests").then(r => r.json()).then(setItems).catch(setErr);
  }, []);

  if (err) return <div className="card">Error: {String(err)}</div>;

  return (
    <div className="card">
      <h2>Requests</h2>
      {items.length === 0 ? <p>No requests yet.</p> : (
        <ul>{items.map(r => <li key={r.id}>{r.title || JSON.stringify(r)}</li>)}</ul>
      )}
    </div>
  );
}
