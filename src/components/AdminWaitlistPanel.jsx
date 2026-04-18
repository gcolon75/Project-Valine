import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getWaitlist, updateWaitlistStatus } from '../services/waitlistService';

const STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-[#0CCE6B] border-green-200',
  denied: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4" />,
  approved: <CheckCircle className="w-4 h-4" />,
  denied: <XCircle className="w-4 h-4" />,
};

export default function AdminWaitlistPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getWaitlist();
      setEntries(data);
    } catch {
      setError('Failed to load waitlist.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(id, status) {
    setUpdating(id + status);
    try {
      const updated = await updateWaitlistStatus(id, status);
      setEntries(prev => prev.map(e => (e.id === id ? updated : e)));
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);
  const counts = {
    all: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    approved: entries.filter(e => e.status === 'approved').length,
    denied: entries.filter(e => e.status === 'denied').length,
  };

  return (
    <div className="py-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
        Waitlist Management
      </h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'denied'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-[#0CCE6B] text-white border-[#0CCE6B]'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700 hover:border-[#0CCE6B]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}{' '}
            <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">
          No {filter === 'all' ? '' : filter} entries.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 dark:text-white truncate">
                  {entry.firstName} {entry.lastName}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{entry.email}</p>
                {entry.interest && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-500 italic">"{entry.interest}"</p>
                )}
                <p className="text-xs text-neutral-400 mt-1">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status badge + actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[entry.status]}`}
                >
                  {STATUS_ICONS[entry.status]}
                  {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                </span>

                {entry.status !== 'approved' && (
                  <button
                    onClick={() => handleStatus(entry.id, 'approved')}
                    disabled={!!updating}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#0CCE6B] hover:bg-[#0BBE60] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Approve ${entry.firstName} ${entry.lastName}`}
                  >
                    {updating === entry.id + 'approved' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Approve
                  </button>
                )}

                {entry.status !== 'denied' && (
                  <button
                    onClick={() => handleStatus(entry.id, 'denied')}
                    disabled={!!updating}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Deny ${entry.firstName} ${entry.lastName}`}
                  >
                    {updating === entry.id + 'denied' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    Deny
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
