import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listFeedbackRequests } from '../../services/scriptFeedbackService';

function formatUsd(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export default function FeedbackRequestAdminQueue() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    listFeedbackRequests('admin')
      .then(setItems)
      .catch((e) => setError(e?.response?.data?.error || 'Could not load queue'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">Admin access required.</p>
          <Link to="/feedback-request" className="text-emerald-600 hover:underline">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          to="/feedback-request"
          className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Feedback Request
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Admin Queue — Pending Approval
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Review each paid submission before it goes to the reader pool. Click an item to approve or deny.
        </p>

        {loading && <p className="text-neutral-500">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !items.length && (
          <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
            <p className="text-neutral-600 dark:text-neutral-400">No pending submissions.</p>
          </div>
        )}

        <div className="space-y-3">
          {items.map((req) => (
            <Link
              key={req.id}
              to={`/feedback-request/${req.id}`}
              className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 hover:border-amber-500 transition"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {req.title}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Writer: {req.writer?.displayName || req.writer?.username} · {req.pageCount} pages · Paid {formatUsd(req.totalPaidCents)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Submitted {new Date(req.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  Pending review
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
