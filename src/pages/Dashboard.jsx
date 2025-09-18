import { useState } from 'react';
import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Dashboard page for the Joint platform.
 *
 * This component serves as the main feed for artists and observers. It pulls
 * paginated items from the server and renders them with actions inspired by
 * social platforms like LinkedIn and Instagram. Users can like posts,
 * bookmark them, open a comment thread, and request full access via the
 * Discover button. Tags are displayed to improve discoverability.
 */
export default function Dashboard() {
  // Use our custom hook to fetch feed data. The `feed` API returns a
  // paginated list of scripts, auditions and other creative works. When
  // the sentinel div scrolls into view another page is fetched.
  const { items, sentinel } = useInfiniteList((page) => api.feed(page), []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {items.map((item) => (
        <PostCard key={item.id || item.title} item={item} />
      ))}
      {/* The sentinel element triggers the next page load when it enters the viewport */}
      <div ref={sentinel} style={{ height: 1 }}></div>
    </div>
  );
}

/**
 * Render an individual post from the feed. Shows basic metadata plus
 * interactive actions. The structure is generic enough to handle both
 * scripts and auditions by relying on fields exposed in the feed API.
 */
function PostCard({ item }) {
  const { user } = useAuth();
  const { push } = useToast();
  // Track optimistic like state and count. If your API returns a likes
  // property on each item you can initialize from that value. Otherwise
  // default to zero.
  const [liked, setLiked] = useState(item.liked || false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [bookmarked, setBookmarked] = useState(item.bookmarked || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Toggle like state and inform the server. Uses optimistic updates for
  // responsive UI. If the call fails the UI reverts and a toast is shown.
  const toggleLike = async () => {
    try {
      if (!liked) {
        await api.likeScript(item.id, user.id);
        setLikeCount((c) => c + 1);
      } else {
        // Currently the API only supports liking, not unliking. You could
        // implement an unlike endpoint on your server and call it here.
        setLikeCount((c) => c - 1);
      }
      setLiked(!liked);
    } catch (err) {
      push('An error occurred while liking the post.');
    }
  };

  // Bookmarks are stored client side for now. In a real implementation
  // you would persist bookmarks via an API. This simple toggle allows
  // observers to save items for later viewing.
  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    push(bookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks');
  };

  // Show or hide the comments section. On first open, load comments via
  // the API and cache them locally. If the API call fails a toast is shown.
  const toggleComments = async () => {
    if (!showComments) {
      try {
        const list = await api.listComments(item.id);
        setComments(list);
      } catch (err) {
        push('Failed to load comments.');
      }
    }
    setShowComments((s) => !s);
  };

  // Post a new comment. The API accepts a body object. After posting
  // append the new comment locally so the UI immediately reflects it.
  const postComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    try {
      await api.postComment(item.id, { body: trimmed });
      setComments((c) => [...c, { body: trimmed, user: user?.name || 'You' }]);
      setCommentText('');
      push('Comment posted');
    } catch (err) {
      push('Unable to post comment.');
    }
  };

  // Send a request to view the full content. Uses the requestAccess API
  // which will notify the creator. Feedback is delivered via toast.
  const requestDiscover = async () => {
    try {
      await api.requestAccess(item.id, user.id);
      push('Discover request sent to the creator');
    } catch (err) {
      push('Failed to send discover request');
    }
  };

  return (
    <div className="card post-card">
      {/* Post header: user avatar and meta info */}
      <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Placeholder avatar if none provided */}
          {item.author?.avatarUrl ? (
            <img
              src={item.author.avatarUrl}
              alt="avatar"
              style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
                fontWeight: 600,
              }}
            >
              {item.author?.name ? item.author.name.charAt(0) : '?'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{item.author?.name || 'Unknown'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {new Date(item.createdAt || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
        {/* Optionally display the kind of item: script, audition, etc. */}
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{item.kind || ''}</span>
      </div>

      {/* Post body */}
      <div className="post-body" style={{ marginTop: '0.5rem' }}>
        <div className="post-title" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{item.title}</div>
        <div className="post-summary" style={{ marginBottom: '0.5rem', color: 'var(--ink)' }}>{item.summary}</div>
        {/* Tags */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <div className="post-tags" style={{ marginTop: '0.25rem' }}>
            {item.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: 'rgba(12, 206, 107, 0.15)',
                  color: 'var(--brand)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.5rem',
                  marginRight: '0.3rem',
                  fontSize: '0.75rem',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="post-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={toggleLike}
          className={liked ? 'active' : ''}
          style={{ background: 'none', border: 'none', color: liked ? 'var(--brand)' : 'var(--muted)', cursor: 'pointer' }}
        >
          👍 {likeCount}
        </button>
        <button
          onClick={toggleBookmark}
          className={bookmarked ? 'active' : ''}
          style={{ background: 'none', border: 'none', color: bookmarked ? 'var(--brand)' : 'var(--muted)', cursor: 'pointer' }}
        >
          📌 Save
        </button>
        <button
          onClick={toggleComments}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
        >
          💬 {comments.length}
        </button>
        <button
          onClick={requestDiscover}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer' }}
        >
          Discover
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="post-comments" style={{ marginTop: '0.5rem', borderTop: '1px solid #222a2e', paddingTop: '0.5rem' }}>
          {comments.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No comments yet.</div>
          )}
          {comments.map((c, i) => (
            <div key={i} style={{ marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 600 }}>{c.user || 'Anonymous'}:</span> {c.body}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ flex: 1, padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #333', background: 'var(--card)', color: 'var(--ink)' }}
            />
            <button onClick={postComment} style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '0.3rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}