import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api.js';
import { useNavigate, Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { FileText } from 'lucide-react';

export default function Scripts() {
  const { items, sentinel } = useInfiniteList((p) => api.listScripts(p), []);
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Scripts</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No scripts yet"
          description="Browse available scripts or create your own to share with the community."
          actionText="Create Script"
          onAction={() => navigate('/scripts/new')}
        />
      ) : (
        items.map(s => (
          <div key={s.id} className="card mb-4">
            <Link to={'/scripts/' + s.id}><b>{s.title}</b></Link>
            <p>{s.summary}</p>
          </div>
        ))
      )}
      <div ref={sentinel} style={{ height: 1 }}></div>
    </div>
  );
}
