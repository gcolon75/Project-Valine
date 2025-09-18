import { useState } from 'react';
import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const { items, sentinel } = useInfiniteList((page) => api.feed(page), []);

  return (
    <div className="feed">
      {items.map((item) => (
        <PostCard key={item.id || item.title} item={item} />
      ))}

      {items.length === 0 && (
        <div className="card empty-state">
          <h3>Your feed is quiet</h3>
          <p>Post a script or start the mock API to see sample content.</p>
          <a href="/scripts" className="btn">Post a Script</a>
        </div>
      )}

      <div ref={sentinel} style={{ height: 1 }} />
    </div>
  );
}

function PostCard({ item }) {
  const { user } = useAuth();
  const { push } = useToast();

  const [liked, setLiked] = useState(item.liked || false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [bookmarked, setBookmarked] = useState(item.bookmarked || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const toggleLike = async () => {
    try {
      if (!liked) {
        if (item.id) await api.likeScript(item.id, user?.id);
        setLikeCount((c) => c + 1);
      } else {
        setLikeCount((c) => Math.max(0, c - 1));
      }
      setLiked(!liked);
    } catch {
      push('An error occurred while liking the post.');
    }
  };

  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    push(bookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks');
  };

  const toggleComments = async () => {
    if (!showComments && item.id) {
      try {
        const list = await api.listComments(item.id);
        setComments(list.map(c => ({ user: c.author?.name || 'User', body: c.text || c.body })));
      } catch {
        push('Failed to load comments.');
      }
    }
    setShowComments((s) => !s);
  };

  const postComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !item.id) return;
    try {
      await api.postComment(item.id, { body: trimmed });
      setComments((c) => [...c, { user: user?.name || 'You', body: trimmed }]);
      setCommentText('');
      push('Comment posted');
    } catch {
      push('Unable to post comment.');
    }
  };

  const requestDiscover = async () => {
    try {
      await api.requestAccess(item.id, user?.id);
      push('Discover request sent to the creator');
    } catch {
      push('Failed to send discover request');
    }
  };

  return (
    <article className="card post-card">
      <header className="post-header">
        <div className="post-author">
          {item.author?.avatarUrl ? (
            <img src={item.author.avatarUrl} alt="avatar" className="avatar" />
          ) : (
            <div className="avatar placeholder">{item.author?.name?.[0] || '?'}</div>
          )}
          <div>
            <div className="author-name">{item.author?.name || 'Unknown'}</div>
            <div className="meta">{new Date(item.createdAt || Date.now()).toLocaleDateString()}</div>
          </div>
        </div>
        <span className="pill">{item.kind || ''}</span>
      </header>

      <div className="post-body">
        <div className="post-title">{item.title}</div>
        <div className="post-summary">{item.summary}</div>
        {!!(item.tags && item.tags.length) && (
          <div className="post-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="post-actions">
        <button onClick={toggleLike} className={liked ? 'active' : ''}>👍 {likeCount}</button>
        <button onClick={toggleBookmark} className={bookmarked ? 'active' : ''}>📌 Save</button>
        <button onClick={toggleComments}>💬 {comments.length}</button>
        <button onClick={requestDiscover} className="discover">Discover</button>
      </div>

      {showComments && (
        <div className="post-comments">
          {comments.length === 0 && <div className="meta">No comments yet.</div>}
          {comments.map((c, i) => (
            <div key={i} className="comment"><strong>{c.user}:</strong> {c.body}</div>
          ))}
          <div className="comment-input">
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button onClick={postComment} className="btn">Post</button>
          </div>
        </div>
      )}
    </article>
  );
}
