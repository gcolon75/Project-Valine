import { useState } from 'react';
import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/* -------------------------------------------------------
   Dashboard: LinkedIn + Instagram-style feed
   - Toolbar (tabs + search)
   - Centered feed column
   - Post cards with like / comment / save / Discover
   - Empty state + skeletons
-------------------------------------------------------- */

function DashboardToolbar({ filter, setFilter, setQuery }) {
  const tabs = ['All', 'Scripts', 'Auditions', 'Following'];
  return (
    <div className="card feed-toolbar">
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={`tab ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        className="toolbar-search"
        placeholder="Search posts, tags, people…"
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}

export default function Dashboard() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const { items, sentinel, end } = useInfiniteList((page) => api.feed(page), []);

  const filtered = items
    .filter((it) => filter === 'All' || it.kind?.toLowerCase().includes(filter.toLowerCase()))
    .filter((it) =>
      !query
        ? true
        : (it.title + ' ' + (it.summary || '') + ' ' + (it.tags || []).join(' '))
            .toLowerCase()
            .includes(query.toLowerCase())
    );

  return (
    <div className="feed">
      <DashboardToolbar filter={filter} setFilter={setFilter} setQuery={setQuery} />

      {/* Skeletons while first page loads */}
      {items.length === 0 && !end && (
        <div className="skeleton-list">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card skeleton">
              <div className="sk-head">
                <div className="sk-av" />
                <div className="sk-lines" />
              </div>
              <div className="sk-body" />
            </div>
          ))}
        </div>
      )}

      {filtered.map((item) => (
        <PostCard key={item.id || item.title} item={item} />
      ))}

      {items.length === 0 && end && (
        <div className="card empty-state">
          <h3>Your feed is quiet</h3>
          <p>Post a script or follow creators to see content here.</p>
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
        setComments(
          list.map((c) => ({
            user: c.author?.name || 'User',
            body: c.text || c.body,
          }))
        );
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
            <div className="meta">
              {new Date(item.createdAt || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
        {item.kind && <span className="pill">{item.kind}</span>}
      </header>

      <div className="post-body">
        <div className="post-title">{item.title}</div>
        {item.summary && <div className="post-summary">{item.summary}</div>}

        {!!(item.tags && item.tags.length) && (
          <div className="post-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="post-actions">
        <button onClick={toggleLike} className={liked ? 'active' : ''}>
          👍 <span className="count">{likeCount}</span>
        </button>
        <button onClick={toggleComments}>
          💬 <span className="count">{comments.length}</span>
        </button>
        <button onClick={toggleBookmark} className={bookmarked ? 'active' : ''}>
          📌 <span className="count">Save</span>
        </button>
        <div className="spacer" />
        <button onClick={requestDiscover} className="discover">Discover</button>
      </div>

      {showComments && (
        <div className="post-comments">
          {comments.length === 0 && <div className="meta">No comments yet.</div>}
          {comments.map((c, i) => (
            <div key={i} className="comment">
              <strong>{c.user}:</strong> {c.body}
            </div>
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
