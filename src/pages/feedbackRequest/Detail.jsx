import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, DollarSign, FileText, ExternalLink, Loader2, CheckCircle2, XCircle, Hourglass } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  getFeedbackRequest,
  acceptFeedbackRequest,
  submitFeedbackNotes,
  denyFeedbackRequest,
  approveFeedbackRequest,
} from '../../services/scriptFeedbackService';

const STATUS_META = {
  pending_payment:  { label: 'Awaiting payment',     color: 'bg-neutral-200 text-neutral-800' },
  pending_approval: { label: 'Pending Joint review',  color: 'bg-amber-100 text-amber-800' },
  approved:         { label: 'Available for readers', color: 'bg-blue-100 text-blue-800' },
  accepted:         { label: 'In progress',           color: 'bg-indigo-100 text-indigo-800' },
  completed:        { label: 'Feedback delivered',    color: 'bg-emerald-100 text-emerald-800' },
  denied:           { label: 'Denied',                color: 'bg-red-100 text-red-700' },
  refunded:         { label: 'Refunded',              color: 'bg-neutral-200 text-neutral-700' },
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
  if (hrs >= 1) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

export default function FeedbackRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  const [summaryNotes, setSummaryNotes] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [showDenyForm, setShowDenyForm] = useState(false);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') setBanner('Payment received — your request is now pending Joint review.');
    if (payment === 'cancelled') setBanner('Payment was cancelled.');
    if (payment) {
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = async () => {
    try {
      const r = await getFeedbackRequest(id);
      setRequest(r);
      setSummaryNotes(r?.summaryNotes || '');
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isWriter = request?.writerId === user?.id;
  const isAssignedReader = request?.readerId === user?.id;
  const isAdmin = user?.role === 'admin';
  const canAcceptAsReader =
    !isWriter && user?.isReader && request?.status === 'approved' && !request?.readerId;

  const handleAccept = async () => {
    setActing(true);
    setError('');
    try {
      await acceptFeedbackRequest(id);
      await reload();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not accept request.');
    } finally {
      setActing(false);
    }
  };

  const handleSubmitNotes = async () => {
    if (!summaryNotes.trim()) {
      setError('Please write your summary notes before submitting.');
      return;
    }
    setActing(true);
    setError('');
    try {
      await submitFeedbackNotes(id, summaryNotes.trim());
      setBanner('Feedback submitted. Earnings have been added to your pending payout.');
      await reload();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not submit notes.');
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async () => {
    setActing(true);
    setError('');
    try {
      await approveFeedbackRequest(id);
      await reload();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not approve.');
    } finally {
      setActing(false);
    }
  };

  const handleDeny = async () => {
    setActing(true);
    setError('');
    try {
      await denyFeedbackRequest(id, denyReason);
      setShowDenyForm(false);
      setDenyReason('');
      await reload();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not deny.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>;
  }
  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">{error || 'Request not found.'}</p>
          <Link to="/feedback-request" className="text-emerald-600 hover:underline">
            ← Back to Feedback Request
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[request.status] || { label: request.status, color: 'bg-neutral-100 text-neutral-700' };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link
          to="/feedback-request"
          className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Feedback Request
        </Link>

        {banner && (
          <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-300">
            {banner}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow border border-neutral-200 dark:border-neutral-700 p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                {request.title}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                by {request.writer?.displayName || request.writer?.username}
              </p>
            </div>
            <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Pages</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {request.pageCount}
              </p>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {isWriter ? 'You paid' : 'Reader earns'}
              </p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {formatUsd(isWriter ? request.totalPaidCents : request.readerEarningsCents)}
              </p>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Deadline</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {request.status === 'accepted' && request.deadlineAt
                  ? timeUntil(request.deadlineAt)
                  : '—'}
              </p>
            </div>
          </div>

          {/* Script link */}
          {(isWriter || isAssignedReader || isAdmin || canAcceptAsReader) && request.scriptUrl && (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <FileText className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                  Script PDF ({request.pageCount} pages)
                </span>
              </div>
              <a
                href={request.scriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-emerald-600 hover:underline ml-3"
              >
                Open
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          )}

          {/* Pool reader: accept CTA */}
          {canAcceptAsReader && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-3">
                Accepting starts a <strong>24-hour countdown</strong>. You'll need to deliver
                1–4 pages of detailed notes before the deadline. You'll earn{' '}
                <strong>{formatUsd(request.readerEarningsCents)}</strong> when submitted.
              </p>
              <Button variant="primary" onClick={handleAccept} disabled={acting}>
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept this script'}
              </Button>
            </div>
          )}

          {/* Reader: submit notes form */}
          {isAssignedReader && request.status === 'accepted' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Summary notes (1–4 pages, markdown supported)
                </label>
                <textarea
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                  rows={16}
                  placeholder="# Overall impressions&#10;&#10;## Story&#10;&#10;## Characters&#10;&#10;## Pacing&#10;&#10;## Specific suggestions"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {summaryNotes.length} characters · For inline highlights on the PDF, use the
                  page viewer (coming soon — for now, reference page numbers in your notes).
                </p>
              </div>
              <Button variant="primary" onClick={handleSubmitNotes} disabled={acting}>
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit feedback'}
              </Button>
            </div>
          )}

          {/* Writer / anyone: view delivered notes */}
          {request.status === 'completed' && request.summaryNotes && (
            <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-5 mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-3">
                <CheckCircle2 className="inline w-4 h-4 mr-1" />
                Summary notes from {request.reader?.displayName || request.reader?.username}
              </h2>
              <div className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-mono leading-relaxed">
                {request.summaryNotes}
              </div>
            </div>
          )}

          {/* Inline annotations (read-only list view for MVP) */}
          {request.annotations && request.annotations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mb-2">
                Inline notes ({request.annotations.length})
              </h2>
              <div className="space-y-2">
                {request.annotations.map((a) => (
                  <div
                    key={a.id}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        {a.type === 'HIGHLIGHT' ? 'Highlight' : a.type === 'PAGE_COMMENT' ? 'Page comment' : 'General'}
                        {a.pageNumber ? ` · page ${a.pageNumber}` : ''}
                      </span>
                    </div>
                    {a.highlightedText && (
                      <p className="text-neutral-600 dark:text-neutral-400 italic mb-1 border-l-2 border-emerald-400 pl-2">
                        "{a.highlightedText}"
                      </p>
                    )}
                    <p className="text-neutral-800 dark:text-neutral-200">{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-admin status banners (writer + reader pool view) */}
          {!isAdmin && request.status === 'pending_payment' && isWriter && (
            <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Hourglass className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Awaiting payment
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Complete your Stripe checkout to send this for Joint review.
                </p>
              </div>
            </div>
          )}

          {!isAdmin && request.status === 'pending_approval' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Hourglass className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Awaiting approval from Joint
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  A Joint admin will review your submission before it goes to the reader pool. This usually takes under 24 hours. You'll be notified once approved.
                </p>
              </div>
            </div>
          )}

          {!isAdmin && isWriter && request.status === 'approved' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Hourglass className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Waiting for a reader to claim your script
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  Your script is live in the reader pool. Once a reader accepts it, you'll see a 24-hour countdown here.
                </p>
              </div>
            </div>
          )}

          {!isAdmin && isWriter && request.status === 'accepted' && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  A reader is working on your feedback
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                  {request.reader?.displayName || request.reader?.username || 'A reader'} has up to 24 hours to deliver your notes.
                </p>
              </div>
            </div>
          )}

          {!isAdmin && request.status === 'refunded' && isWriter && (
            <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-neutral-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Refunded
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Your payment has been returned to your card. Refunds typically post within 5–10 business days.
                </p>
              </div>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && request.status === 'pending_approval' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">
                Admin review
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                Approving will release this script to the reader pool. Denying will auto-refund the writer.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="primary" onClick={handleApprove} disabled={acting}>
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDenyForm((s) => !s)}
                  disabled={acting}
                >
                  Deny + refund
                </Button>
              </div>
              {showDenyForm && (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Reason (optional, shown to writer)"
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm"
                  />
                  <Button
                    variant="secondary"
                    className="mt-2 bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                    onClick={handleDeny}
                    disabled={acting}
                  >
                    Confirm deny + refund
                  </Button>
                </div>
              )}
            </div>
          )}

          {request.status === 'denied' && request.denyReason && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-lg p-4 text-sm">
              <p className="font-semibold text-red-700 dark:text-red-300 mb-1">
                <XCircle className="inline w-4 h-4 mr-1" />
                Denied
              </p>
              <p className="text-red-700 dark:text-red-400">{request.denyReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
