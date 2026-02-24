import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api.js';
import { useNavigate, Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { Mic } from 'lucide-react';

export default function Auditions() {
  const { items, sentinel } = useInfiniteList((p) => api.listAuditions(p), []);
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Auditions</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No auditions available"
          description="Check back soon for new audition opportunities, or browse other content."
          actionText="Discover Content"
          onAction={() => navigate('/discover')}
        />
      ) : (
        items.map(a => (
          <div key={a.id} className="card mb-4">
            <Link to={'/auditions/' + a.id}><b>{a.title}</b></Link>
            <p>{a.summary}</p>
          </div>
        ))
      )}
      <div ref={sentinel} style={{ height: 1 }}></div>
    </div>
  );
}
