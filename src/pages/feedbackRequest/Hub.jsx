import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, XCircle, BookOpen, AlertCircle, Gem, Users, Shield } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { listFeedbackRequests } from '../../services/scriptFeedbackService';

const STATUS_META = {
  pending_payment:  { label: 'Awaiting payment',    color: 'bg-neutral-100 text-neutral-700' },
  pending_approval: { label: 'Pending Joint review', color: 'bg-amber-100 text-amber-800' },
  approved:         { label: 'Available to readers', color: 'bg-blue-100 text-blue-800' },
  accepted:         { label: 'In progress',          color: 'bg-indigo-100 text-indigo-800' },
  completed:        { label: 'Feedback delivered',   color: 'bg-emerald-100 text-emerald-800' },
  denied:           { label: 'Denied',               color: 'bg-red-100 text-red-700' },
  refunded:         { label: 'Refunded',             color: 'bg-neutral-100 text-neutral-600' },
};

function formatUsd(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'bg-neutral-100 text-neutral-700' };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${m.color}`}>
      {m.label}
    </span>
  );
}

function timeUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Overdue';
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs >= 1) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

function WriterTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFeedbackRequests('mine').then((r) => { setItems(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-neutral-500">Loading…</p>;

  if (!items.length) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
        <FileText className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          You haven't submitted any scripts yet.
        </p>
        <Link to="/feedback-request/new">
          <Button variant="primary">Submit a script for review</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link to="/feedback-request/new">
          <Button variant="primary">+ Submit a script</Button>
        </Link>
      </div>
      {items.map((req) => (
        <Link
          key={req.id}
          to={`/feedback-request/${req.id}`}
          className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 hover:border-emerald-500 transition"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {req.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {req.pageCount} pages · {formatUsd(req.totalPaidCents)} paid
              </p>
            </div>
            <div className="text-right">
              <StatusPill status={req.status} />
              {req.status === 'accepted' && req.deadlineAt && (
                <p className="text-xs text-neutral-500 mt-1">
                  <Clock className="inline w-3 h-3 mr-1" />
                  Reader: {timeUntil(req.deadlineAt)}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ReaderTab() {
  const [pool, setPool] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      listFeedbackRequests('available'),
      listFeedbackRequests('mine-as-reader'),
    ]).then(([p, m]) => {
      if (p.status === 'fulfilled') setPool(p.value);
      if (m.status === 'fulfilled') setMine(m.value);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-neutral-500">Loading…</p>;

  const active = mine.filter((r) => r.status === 'accepted');
  const completed = mine.filter((r) => r.status === 'completed');

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mb-3">
            Your active reviews ({active.length})
          </h3>
          <div className="space-y-2">
            {active.map((req) => (
              <Link
                key={req.id}
                to={`/feedback-request/${req.id}`}
                className="block bg-white dark:bg-neutral-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {req.title}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {req.pageCount} pages · Earn {formatUsd(req.readerEarningsCents)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    <Clock className="inline w-4 h-4 mr-1" />
                    {timeUntil(req.deadlineAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mb-3">
          Available scripts ({pool.length})
        </h3>
        {!pool.length ? (
          <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
            <p className="text-neutral-500">No scripts in the pool right now. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pool.map((req) => (
              <Link
                key={req.id}
                to={`/feedback-request/${req.id}`}
                className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 hover:border-emerald-500 transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {req.title}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      by {req.writer?.displayName || req.writer?.username} ·{' '}
                      {req.pageCount} pages
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Earn {formatUsd(req.readerEarningsCents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mb-3">
            Completed reviews ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.slice(0, 10).map((req) => (
              <div
                key={req.id}
                className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {req.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Completed {new Date(req.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  +{formatUsd(req.readerEarningsCents)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function FeedbackRequestHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState('writer');

  const isReader = !!user?.isReader;
  const isAdmin = user?.role === 'admin';
  const freeEvalEligible = !!user?.freeEvalEligible;

  const pendingPayoutDollars = useMemo(
    () => formatUsd(user?.pendingPayoutCents || 0),
    [user?.pendingPayoutCents]
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Feedback Request
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Get professional script feedback in 72 hours — or earn money reviewing scripts for other writers.
          </p>
        </div>

        {/* Admin tools — visible only to admins */}
        {isAdmin && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-300 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-3 inline-flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Admin tools
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/feedback-request/admin">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition">
                  <AlertCircle className="w-4 h-4" />
                  Admin Queue
                </button>
              </Link>
              <Link to="/feedback-request/admin/readers">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-neutral-700 text-amber-800 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700 font-medium rounded-lg transition">
                  <Users className="w-4 h-4" />
                  Manage Readers
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setTab('writer')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              tab === 'writer'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <FileText className="inline w-4 h-4 mr-1" />
            Get Feedback
          </button>
          {isReader && (
            <button
              onClick={() => setTab('reader')}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                tab === 'reader'
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <BookOpen className="inline w-4 h-4 mr-1" />
              Review Scripts
            </button>
          )}
        </div>

        {/* Emerald free eval banner (writer tab) */}
        {tab === 'writer' && freeEvalEligible && (
          <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-400 rounded-xl p-4 flex items-start gap-3">
            <Gem className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Your free Emerald evaluation is available this month
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Submit a script and check the "Use my Emerald free evaluation" box at checkout to skip the payment.
              </p>
            </div>
          </div>
        )}

        {/* Reader earnings banner */}
        {isReader && tab === 'reader' && (user?.pendingPayoutCents || 0) > 0 && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Pending payout
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Paid manually each week. Contact support if you have questions.
              </p>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {pendingPayoutDollars}
            </p>
          </div>
        )}

        {/* Reader interest banner for non-readers */}
        {!isReader && (
          <div className="mb-6 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-sm text-neutral-700 dark:text-neutral-300">
            Want to earn money reviewing scripts? Contact support to apply as a reader.
          </div>
        )}

        {tab === 'writer' ? <WriterTab /> : <ReaderTab />}
      </div>
    </div>
  );
}
