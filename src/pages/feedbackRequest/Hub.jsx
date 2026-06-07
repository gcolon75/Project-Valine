import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, BookOpen, Gem, Users, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listFeedbackRequests } from '../../services/scriptFeedbackService';

// Left-edge bar color per status — like colored revision pages in Hollywood scripts
const STATUS_META = {
  pending_payment:  { label: 'Awaiting payment',      bar: 'bg-neutral-300' },
  pending_approval: { label: 'Pending review',         bar: 'bg-amber-400' },
  approved:         { label: 'In reader pool',         bar: 'bg-blue-400' },
  accepted:         { label: 'In progress',            bar: 'bg-indigo-500' },
  reader_submitted: { label: 'Under admin review',     bar: 'bg-purple-400' },
  completed:        { label: 'Feedback delivered',     bar: 'bg-[#0CCE6B]' },
  denied:           { label: 'Denied',                 bar: 'bg-red-400' },
  refunded:         { label: 'Refunded',               bar: 'bg-neutral-300' },
};

function formatUsd(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function timeUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Overdue';
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs >= 1) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// Script card with colored left-edge status bar
function ScriptCard({ req, to, children }) {
  const m = STATUS_META[req.status] || { label: req.status, bar: 'bg-neutral-300' };
  return (
    <Link
      to={to}
      className="flex overflow-hidden bg-white border border-neutral-100 hover:border-neutral-300 transition-colors"
    >
      <div className={`w-1.5 shrink-0 ${m.bar}`} />
      <div className="flex-1 px-6 py-5">{children(m)}</div>
    </Link>
  );
}

function WriterTab({ freeEvalEligible }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFeedbackRequests('mine')
      .then((r) => { setItems(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-neutral-400 py-8">Loading…</p>;

  return (
    <div className="space-y-6">
      {freeEvalEligible && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 px-5 py-4">
          <Gem className="w-4 h-4 text-[#0CCE6B] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Free evaluation available</p>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Submit a script and check "Use my Emerald free evaluation" at checkout — no charge. One free eval per 3 months.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-400">
          {items.length > 0
            ? `${items.length} submission${items.length !== 1 ? 's' : ''}`
            : 'No submissions yet'}
        </p>
        <div data-demo="feedback-submit">
          <Link
            to="/feedback-request/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-4 py-2 transition-all"
          >
            Submit a script
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {!items.length ? (
        <div className="py-16 text-center border border-neutral-100">
          <FileText className="w-8 h-8 mx-auto text-neutral-200 mb-3" />
          <p className="text-sm text-neutral-400 mb-1">No scripts submitted yet</p>
          <p className="text-xs text-neutral-300">Professional coverage in 24 hours · $0.50/page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((req) => (
            <ScriptCard key={req.id} req={req} to={`/feedback-request/${req.id}`}>
              {(m) => (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-neutral-900 truncate text-base">
                        {req.title}
                      </h3>
                      {req.scriptType && (
                        <span className="text-[11px] text-neutral-400 shrink-0 uppercase tracking-wide">
                          {req.scriptType}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400">
                      {req.pageCount} pages · {formatUsd(req.totalPaidCents)} paid
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-neutral-500">{m.label}</p>
                    {req.status === 'accepted' && req.deadlineAt && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {timeUntil(req.deadlineAt)} left
                      </p>
                    )}
                  </div>
                </div>
              )}
            </ScriptCard>
          ))}
        </div>
      )}
    </div>
  );
}

function ReaderTab({ pendingPayoutDollars, hasPendingPayout }) {
  const [pool, setPool] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');

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

  if (loading) return <p className="text-sm text-neutral-400 py-8">Loading…</p>;

  const active = mine.filter((r) => ['accepted', 'reader_submitted'].includes(r.status));
  const completed = mine.filter((r) => r.status === 'completed');
  const filteredPool = typeFilter === 'All' ? pool : pool.filter((r) => r.scriptType === typeFilter);

  return (
    <div className="space-y-8">
      {hasPendingPayout && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-emerald-900">Pending payout</p>
            <p className="text-xs text-emerald-600 mt-0.5">Paid manually each week</p>
          </div>
          <p className="text-2xl font-bold text-[#0CCE6B] tabular-nums">{pendingPayoutDollars}</p>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Your active reviews
          </p>
          <div className="space-y-2">
            {active.map((req) => (
              <Link
                key={req.id}
                to={`/feedback-request/${req.id}`}
                className="flex overflow-hidden bg-white border border-neutral-100 hover:border-neutral-300 transition-colors"
              >
                <div className="w-1.5 shrink-0 bg-indigo-500" />
                <div className="flex-1 px-6 py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-neutral-900 text-base truncate">{req.title}</h4>
                    <p className="text-sm text-neutral-400 mt-0.5">
                      {req.pageCount} pages · Earn {formatUsd(req.readerEarningsCents)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeUntil(req.deadlineAt)} left
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Available scripts
            {filteredPool.length > 0 && (
              <span className="ml-1.5 font-normal text-neutral-300">({filteredPool.length})</span>
            )}
          </p>
          <div className="flex gap-1.5">
            {['All', 'Screenplay', 'Playwright', 'Book'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs px-3 py-1 border font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {!filteredPool.length ? (
          <div className="py-12 text-center border border-neutral-100">
            <p className="text-sm text-neutral-400">
              {pool.length === 0 ? 'No scripts available right now.' : `No ${typeFilter} scripts available.`}
            </p>
            <p className="text-xs text-neutral-300 mt-1">
              The pool refreshes as scripts are submitted and approved.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPool.map((req) => (
              <Link
                key={req.id}
                to={`/feedback-request/${req.id}`}
                className="flex overflow-hidden bg-white border border-neutral-100 hover:border-neutral-300 transition-colors"
              >
                <div className="w-1.5 shrink-0 bg-blue-400" />
                <div className="flex-1 px-6 py-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-neutral-900 text-base truncate">{req.title}</h4>
                      {req.scriptType && (
                        <span className="text-[11px] text-neutral-400 shrink-0 uppercase tracking-wide">
                          {req.scriptType}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400">
                      {req.writer?.displayName || req.writer?.username} · {req.pageCount} pages
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0CCE6B] shrink-0 tabular-nums">
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
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Completed <span className="font-normal text-neutral-300">({completed.length})</span>
          </p>
          <div className="space-y-2">
            {completed.map((req) => (
              <Link
                key={req.id}
                to={`/feedback-request/${req.id}`}
                className="flex overflow-hidden bg-white border border-neutral-100 hover:border-neutral-200 transition-colors"
              >
                <div className="w-1.5 shrink-0 bg-[#0CCE6B]" />
                <div className="flex-1 px-6 py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-neutral-700 truncate">{req.title}</p>
                    <p className="text-sm text-neutral-400 mt-0.5">
                      {req.pageCount} pages · {new Date(req.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#0CCE6B] shrink-0 tabular-nums">
                    +{formatUsd(req.readerEarningsCents)}
                  </p>
                </div>
              </Link>
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
  const hasPendingPayout = (user?.pendingPayoutCents || 0) > 0;
  const pendingPayoutDollars = useMemo(
    () => formatUsd(user?.pendingPayoutCents || 0),
    [user?.pendingPayoutCents]
  );

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-6">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">Script Feedback</h1>
          <p className="text-base text-neutral-500">
            Professional coverage in 24 hours · $0.50/page · Readers earn $0.25/page
          </p>
        </div>

        {/* Admin tools */}
        {isAdmin && (
          <div className="mb-8 border border-amber-200 bg-amber-50 px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin?tab=reviewqueue"
                className="inline-flex items-center gap-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                Review Queue
              </Link>
            </div>
          </div>
        )}

        {/* Mode toggle — only shown to readers */}
        {isReader && (
          <div className="flex mb-8 border border-neutral-200">
            <button
              onClick={() => setTab('writer')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'writer'
                  ? 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Get Feedback
            </button>
            <button
              data-demo="reader-section"
              onClick={() => setTab('reader')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-l border-neutral-200 ${
                tab === 'reader'
                  ? 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Earn Money
            </button>
          </div>
        )}

        {/* Non-reader interest note */}
        {!isReader && (
          <p className="mb-8 text-xs text-neutral-400 border-l-2 border-neutral-200 pl-3">
            Interested in earning by reviewing scripts?{' '}
            <Link to="/contact" className="text-neutral-600 underline underline-offset-2">
              Contact us
            </Link>{' '}
            to apply as a reader.
          </p>
        )}

        {/* Both tabs stay mounted to avoid refetch flicker on tab switch */}
        <div className={tab !== 'writer' ? 'hidden' : ''}>
          <WriterTab freeEvalEligible={freeEvalEligible} />
        </div>
        <div className={tab !== 'reader' ? 'hidden' : ''}>
          <ReaderTab
            pendingPayoutDollars={pendingPayoutDollars}
            hasPendingPayout={hasPendingPayout}
          />
        </div>

      </div>
    </div>
  );
}
