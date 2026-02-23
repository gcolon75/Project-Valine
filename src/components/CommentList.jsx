// src/components/CommentList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPostComments, addPostComment, updateComment, deleteComment, getCommentReplies } from "../services/postService";
import { useAuth } from "../context/AuthContext";
import { MoreHorizontal, Edit2, Trash2, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

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

// Single Comment component with edit/delete/reply functionality
function Comment({ comment, postId, user, onDelete, onUpdate, onReplyAdded, depth = 0 }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || comment.content || "");
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState(comment.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count?.replies || comment.replyCount || 0);

  const isAuthor = user?.id === comment.author?.id || user?.id === comment.authorId;
  const maxDepth = 4; // Maximum nesting depth for visual purposes

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

  // Handle edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const updated = await updateComment(comment.id, editText.trim());
      onUpdate(comment.id, updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm("Delete this comment? This will also delete all replies.")) return;

    try {
      await deleteComment(comment.id);
      onDelete(comment.id);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Handle reply submit
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const newReply = await addPostComment(postId, replyText.trim(), comment.id);
      setReplies((prev) => [...prev, newReply]);
      setReplyCount((prev) => prev + 1);
      setReplyText("");
      setIsReplying(false);
      setShowReplies(true);
      if (onReplyAdded) onReplyAdded();
    } catch (err) {
      console.error("Failed to add reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Load more replies
  const loadReplies = async () => {
    if (loadingReplies) return;

    setLoadingReplies(true);
    try {
      const data = await getCommentReplies(comment.id);
      setReplies(data.replies || []);
      setShowReplies(true);
    } catch (err) {
      console.error("Failed to load replies:", err);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Handle reply deletion from nested comment
  const handleReplyDelete = (replyId) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setReplyCount((prev) => Math.max(0, prev - 1));
  };

  // Handle reply update from nested comment
  const handleReplyUpdate = (replyId, updatedReply) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === replyId ? { ...r, ...updatedReply } : r))
    );
  };

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : "";

  return (
    <div className={`${depth > 0 ? "ml-8 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3" : ""}`}>
      <div className="flex gap-2 py-2">
        <Link to={getProfileLink(comment.author)} className="flex-shrink-0">
          {comment.author?.avatar ? (
            <img
              src={comment.author.avatar}
              alt={getAuthorName(comment.author)}
              className="h-7 w-7 rounded-full object-cover hover:ring-2 hover:ring-brand transition-all"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-white/10 hover:ring-2 hover:ring-brand transition-all flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {getAuthorName(comment.author).charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={getProfileLink(comment.author)}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-brand dark:hover:text-brand transition-colors"
            >
              {getAuthorName(comment.author)}
            </Link>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-1">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-2 py-1 text-sm text-neutral-900 dark:text-white outline-none"
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  disabled={submitting || !editText.trim()}
                  className="text-xs text-brand hover:underline disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.text || comment.content || "");
                  }}
                  className="text-xs text-neutral-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-neutral-900 dark:text-white break-words">
              {comment.text || comment.content}
            </div>
          )}

          {/* Action buttons */}
          {!isEditing && user && (
            <div className="flex items-center gap-3 mt-1">
              {depth < maxDepth && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-xs text-neutral-500 hover:text-brand flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  Reply
                </button>
              )}
              {isAuthor && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-neutral-500 hover:text-brand flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs text-neutral-500 hover:text-red-500 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1 text-sm text-neutral-900 dark:text-white outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting || !replyText.trim()}
                className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {submitting ? "..." : "Reply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText("");
                }}
                className="text-xs text-neutral-500 hover:underline"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Show/load replies toggle */}
          {replyCount > 0 && (
            <button
              onClick={() => {
                if (!showReplies && replies.length === 0) {
                  loadReplies();
                } else {
                  setShowReplies(!showReplies);
                }
              }}
              className="text-xs text-brand hover:underline mt-2 flex items-center gap-1"
            >
              {loadingReplies ? (
                "Loading..."
              ) : showReplies ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  View {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-1">
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              user={user}
              onDelete={handleReplyDelete}
              onUpdate={handleReplyUpdate}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Handle comment deletion
  const handleDelete = (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (onCommentAdded) onCommentAdded(); // Refresh count
  };

  // Handle comment update
  const handleUpdate = (commentId, updatedComment) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, ...updatedComment } : c))
    );
  };

  return (
    <div className="border-t border-neutral-300 dark:border-white/10 px-4 py-3">
      <div className="space-y-1">
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
          <Comment
            key={c.id}
            comment={c}
            postId={postId}
            user={user}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onReplyAdded={onCommentAdded}
            depth={0}
          />
        ))}
      </div>

      {user && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
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
