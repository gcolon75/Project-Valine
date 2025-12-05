// src/pages/Feed.jsx - DEPRECATED, use FeedContext.jsx instead
// This file is kept for backward compatibility but should be removed
// All functionality has been moved to src/context/FeedContext.jsx
// Posts are now loaded from the API only - no mock/demo data

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { rankForUser, searchPosts } from "../services/search";

// ---- Types ----
// Post: {id, author:{name,role,avatar}, title, body, tags[], createdAt:number,
//        mediaUrl?, likes:number, saved:boolean, comments:number}
// Comment: {id, postId, author, text, createdAt}

const FeedContext = createContext(null);
export const useFeed = () => useContext(FeedContext);

// No demo posts - API-first approach
// Posts are loaded from the backend API only

const LS_KEY = "valine.feed.v1";

export function FeedProvider({ children }) {
  // Initialize with empty array - posts come from API only
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved).posts : [];
  });

  const [comments, setComments] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved).comments : {};
  });

  // simple preference model: tag -> weight
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved).prefs : {};
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ posts, comments, prefs }));
  }, [posts, comments, prefs]);

  const likePost = (id) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likes: p.likes + 1 } : p
      )
    );

  const toggleSave = (id) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, saved: !p.saved } : p
      )
    );

  const addComment = (postId, text) => {
    const c = {
      id: "c" + Math.random().toString(36).slice(2),
      postId,
      author: "You",
      text,
      createdAt: Date.now(),
    };
    setComments((prev) => {
      const arr = prev[postId] || [];
      return { ...prev, [postId]: [...arr, c] };
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p
      )
    );
    // preference bump: reward tags from the commented post
    const post = posts.find((p) => p.id === postId);
    if (post) bumpPrefs(post.tags, 1.5);
  };

  const createPost = ({ title, body, tags }) => {
    const post = {
      id: "p" + Math.random().toString(36).slice(2),
      author: { name: "You", role: "Creator", avatar: "" },
      title,
      body,
      tags,
      createdAt: Date.now(),
      mediaUrl: "",
      likes: 0,
      saved: false,
      comments: 0,
    };
    setPosts((prev) => [post, ...prev]);
    bumpPrefs(tags, 1.0);
    return post.id;
  };

  const bumpPrefs = (tags, amount = 1) => {
    setPrefs((prev) => {
      const next = { ...prev };
      for (const t of tags) next[t.toLowerCase()] = (next[t.toLowerCase()] || 0) + amount;
      return next;
    });
  };

  // ranking & search
  const ranked = useMemo(() => rankForUser(posts, prefs), [posts, prefs]);
  const search = (q) => searchPosts(posts, q, prefs);

  const value = {
    posts: ranked,
    rawPosts: posts,
    comments,
    prefs,
    likePost,
    toggleSave,
    addComment,
    createPost,
    search,
    bumpPrefs,
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}
