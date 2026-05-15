import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Loader2, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  listFeedbackRequests,
  adminListReaders,
  adminReassignReader,
} from '../../services/scriptFeedbackService';
import { Button } from '../../components/ui';
import toast from 'react-hot-toast';

function formatUsd(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function statusBadge(status) {
  const styles = {
    pending_approval: 'bg-amber-100 text-amber-800',
    approved: 'bg-blue-100 text-blue-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-neutral-200 text-neutral-700',
    denied: 'bg-red-100 text-red-700',
  };
  const labels = {
    pending_approval: 'Pending review',
    approved: 'Approved',
    accepted: 'In progress',
    completed: 'Completed',
    denied: 'Denied',
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${styles[status] || 'bg-neutral-100 text-neutral-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function ReassignModal({ request, readers, onConfirm, onClose, saving }) {
  const [selected, setSelected] = useState(request.readerId || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Reassign Reader
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Script: <span className="font-medium text-neutral-900 dark:text-neutral-100">{request.title}</span>
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Assign to reader
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— Unassign (return to pool) —</option>
            {readers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName || r.username} {r.username ? `(@${r.username})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(selected || null)}
            disabled={saving || selected === (request.readerId || '')}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackRequestAdminQueue() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState('pending');
  const [pendingItems, setPendingItems] = useState([]);
  const [assignedItems, setAssignedItems] = useState([]);
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reassignTarget, setReassignTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    Promise.all([
      listFeedbackRequests('admin'),
      listFeedbackRequests('admin-assigned'),
      adminListReaders(),
    ])
      .then(([pending, assigned, readerList]) => {
        setPendingItems(pending);
        setAssignedItems(assigned);
        setReaders(readerList);
      })
      .catch((e) => setError(e?.response?.data?.error || 'Could not load queue'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleReassign = async (readerId) => {
    setSaving(true);
    try {
      const updated = await adminReassignReader(reassignTarget.id, readerId);
      setAssignedItems((prev) =>
        readerId
          ? prev.map((r) => r.id === updated.id ? updated : r)
          : prev.filter((r) => r.id !== updated.id)
      );
      toast.success(readerId ? 'Reader reassigned.' : 'Reader unassigned — script returned to pool.');
      setReassignTarget(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not reassign reader.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">Admin access required.</p>
          <Link to="/feedback-request" className="text-emerald-600 hover:underline">← Back</Link>
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

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
          Admin Queue
        </h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'pending'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
            onClick={() => setTab('pending')}
          >
            Pending Approval
            {pendingItems.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full">
                {pendingItems.length}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'assigned'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
            onClick={() => setTab('assigned')}
          >
            Active Assignments
            {assignedItems.length > 0 && (
              <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs px-1.5 py-0.5 rounded-full">
                {assignedItems.length}
              </span>
            )}
          </button>
        </div>

        {loading && <p className="text-neutral-500">Loading…</p>}

        {/* Pending approval tab */}
        {!loading && tab === 'pending' && (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Review each paid submission before it enters the reader pool.
            </p>
            {!pendingItems.length ? (
              <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
                <p className="text-neutral-600 dark:text-neutral-400">No pending submissions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingItems.map((req) => (
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
                      {statusBadge(req.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Active assignments tab */}
        {!loading && tab === 'assigned' && (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Scripts currently assigned to or completed by a reader. Use Reassign to swap readers or return a script to the pool.
            </p>
            {!assignedItems.length ? (
              <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
                <p className="text-neutral-600 dark:text-neutral-400">No active assignments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedItems.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/feedback-request/${req.id}`}
                          className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-emerald-600 truncate block"
                        >
                          {req.title}
                        </Link>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Writer: {req.writer?.displayName || req.writer?.username} · {req.pageCount} pages
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Reader: {req.reader?.displayName || req.reader?.username || '—'}
                          {req.deadlineAt && req.status === 'accepted' && (
                            <span className="ml-2 text-xs text-amber-600">
                              Due {new Date(req.deadlineAt).toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusBadge(req.status)}
                        {req.status !== 'completed' && (
                          <Button
                            variant="secondary"
                            onClick={() => setReassignTarget(req)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Reassign
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {reassignTarget && (
        <ReassignModal
          request={reassignTarget}
          readers={readers}
          onConfirm={handleReassign}
          onClose={() => setReassignTarget(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
