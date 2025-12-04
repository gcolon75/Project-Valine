// src/context/FeedContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { rankForUser, searchPosts } from "../services/search";
import { optimisticUpdate } from "../hooks/useOptimisticUpdate";
import { apiClient } from "../services/api.js";

// ---- Demo seed data ----
const NOW = Date.now();
const demoPosts = [
  {
    id: "p1",
    author: { name: "Avery Quinn", role: "Writer • Sci-Fi", avatar: "" },
    title: "Six-page pilot cold open",
    body: "Looking for feedback on pacing and hook. Short cold open for a space-noir pilot.",
    tags: ["#Script", "#SciFi", "#NeedEdits"],
    createdAt: NOW - 2 * 60 * 60 * 1000,
    mediaUrl: "",
    likes: 42,
    saved: false,
    comments: 8,
  },
  {
    id: "p2",
    author: { name: "Milo Reyes", role: "Actor • Drama", avatar: "" },
    title: "Audition tape (teaser)",
    body: "Monologue snippet; full tape gated — hit Discover to request access.",
    tags: ["#Audition", "#Drama"],
    createdAt: NOW - 5 * 60 * 60 * 1000,
    mediaUrl: "",
    likes: 31,
    saved: false,
    comments: 12,
  },
  {
    id: "p3",
    author: { name: "Noa Kim", role: "Director • Indie", avatar: "" },
    title: "ShortFilm board roughs",
    body: "Looking for a writer to punch up a key scene. Mood board and beat sheet attached.",
    tags: ["#ShortFilm", "#Indie", "#Collab"],
    createdAt: NOW - 24 * 60 * 60 * 1000,
    mediaUrl: "",
    likes: 18,
    saved: false,
    comments: 4,
  },
];

const FeedContext = createContext(null);
export const useFeed = () => useContext(FeedContext);

const LS_KEY = "valine.feed.v1";

export function FeedProvider({ children }) {
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved).posts : demoPosts;
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

  const likePost = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    await optimisticUpdate(
      // Optimistic: increment likes
      () => setPosts((prev) => prev.map((p) => 
        p.id === id ? { ...p, likes: p.likes + 1, isLiked: true } : p
      )),
      // API call
      () => apiClient.post(`/posts/${id}/like`),
      // Rollback: decrement likes
      () => setPosts((prev) => prev.map((p) => 
        p.id === id ? { ...p, likes: p.likes - 1, isLiked: false } : p
      )),
      'FeedContext.likePost'
    ).catch(() => {
      // Error already handled by optimisticUpdate
    });
  };

  const toggleSave = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    await optimisticUpdate(
      // Optimistic: toggle saved
      () => setPosts((prev) => prev.map((p) => 
        p.id === id ? { ...p, saved: !p.saved } : p
      )),
      // API call
      () => apiClient.post(`/posts/${id}/bookmark`),
      // Rollback: toggle back
      () => setPosts((prev) => prev.map((p) => 
        p.id === id ? { ...p, saved: !p.saved } : p
      )),
      'FeedContext.toggleSave'
    ).catch(() => {
      // Error already handled by optimisticUpdate
    });
  };

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
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p)));

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
