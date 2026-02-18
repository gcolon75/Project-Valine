// src/components/CommentList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPostComments, addPostComment } from "../services/postService";
import { useAuth } from "../context/AuthContext";

// Format relative time (1s, 1m, 1h, 1d, 1w, 1mo, 1yr)
const formatRelativeTime = (dateString) => {
  if (!dateString) return "";

  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(days / 365);
  return `${years}yr`;
};

export default function CommentList({ postId, onCommentAdded }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch comments from backend
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostComments(postId);
        setComments(data.comments || []);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
        setError("Failed to load comments");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await addPostComment(postId, text.trim());
      // Add the new comment to the list (it comes with author info from backend)
      setComments((prev) => [newComment, ...prev]);
      setText("");
      // Notify parent component that a comment was added
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
      setError("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Get display name for a comment author
  const getAuthorName = (author) => {
    if (!author) return "Unknown";
    return author.displayName || author.username || "Unknown";
  };

  // Get profile link for author
  const getProfileLink = (author) => {
    if (!author?.id) return "#";
    return `/profile/${author.id}`;
  };

  return (
    <div className="border-t border-neutral-300 dark:border-white/10 px-4 py-3">
      <div className="space-y-3">
        {loading && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading comments...</div>
        )}
        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}
        {!loading && !error && comments.length === 0 && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Be the first to comment.</div>
        )}
        {!loading && comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Link to={getProfileLink(c.author)} className="flex-shrink-0">
              {c.author?.avatar ? (
                <img
                  src={c.author.avatar}
                  alt={getAuthorName(c.author)}
                  className="h-7 w-7 rounded-full object-cover hover:ring-2 hover:ring-brand transition-all"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-white/10 hover:ring-2 hover:ring-brand transition-all flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {getAuthorName(c.author).charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to={getProfileLink(c.author)}
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-brand dark:hover:text-brand transition-colors"
                >
                  {getAuthorName(c.author)}
                </Link>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {formatRelativeTime(c.createdAt)}
                </span>
              </div>
              <div className="text-sm text-neutral-900 dark:text-white break-words">{c.text || c.content}</div>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            disabled={submitting}
            className="flex-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "..." : "Send"}
          </button>
        </form>
      )}
      {!user && (
        <div className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          <Link to="/login" className="text-brand hover:underline">Sign in</Link> to comment
        </div>
      )}
    </div>
  );
}
