import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { getFeedbackRequest, submitFeedbackNotes } from '../../services/scriptFeedbackService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function FinishFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalThoughts, setFinalThoughts] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getFeedbackRequest(id)
      .then((r) => {
        // Only the assigned reader in 'accepted' status should be here
        if (!r || r.readerId !== user?.id || r.status !== 'accepted') {
          navigate(`/feedback-request/${id}`, { replace: true });
          return;
        }
        setRequest(r);
        if (r.summaryNotes) setFinalThoughts(r.summaryNotes);
      })
      .catch(() => navigate(`/feedback-request/${id}`, { replace: true }))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!finalThoughts.trim()) {
      toast.error('Please write your final thoughts before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedbackNotes(id, finalThoughts.trim());
      toast.success('Feedback submitted for admin review. You\'ll be notified once it\'s approved.');
      navigate(`/feedback-request/${id}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          to={`/feedback-request/${id}/read`}
          className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Script
        </Link>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow border border-neutral-200 dark:border-neutral-700 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            Final Thoughts
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            For <span className="font-medium text-neutral-700 dark:text-neutral-300">{request.title}</span>
          </p>

          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
            Great work making it through the script! Write your overall impressions here — things
            like story structure, characters, pacing, dialogue, and any top-level suggestions.
            Your inline annotations are already saved and will be shared with the writer once you submit.
          </p>

          <textarea
            value={finalThoughts}
            onChange={(e) => setFinalThoughts(e.target.value)}
            rows={14}
            placeholder={`Overall impressions…\n\nWhat worked well?\n\nWhat could be improved?\n\nTop suggestions for the writer?`}
            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm leading-relaxed"
          />
          <p className="text-xs text-neutral-400 mt-1 mb-6">
            {finalThoughts.length} characters
          </p>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link
              to={`/feedback-request/${id}/read`}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
            >
              ← Go back and review
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || !finalThoughts.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
