// src/context/FeedContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { rankForUser, searchPosts } from "../services/search";
import { optimisticUpdate } from "../hooks/useOptimisticUpdate";
import { apiClient } from "../services/api.js";

// No more demo seed data - API-first approach
// Posts are loaded from the backend API only

const FeedContext = createContext(null);
export const useFeed = () => useContext(FeedContext);

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

  // NOTE: addComment is a local-first UI function for immediate feedback.
  // Actual comment persistence is handled by API calls in the CommentList component.
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

  // NOTE: createPost now integrates with backend API
  // Local state is updated optimistically for immediate UI feedback
  const createPost = async ({ title, body, tags, mediaId, visibility }) => {
    // Create optimistic local post for immediate feedback
    const optimisticPost = {
      id: "p" + Math.random().toString(36).slice(2),
      author: { name: "You", role: "Creator", avatar: "" },
      title,
      body,
      tags,
      createdAt: Date.now(),
      mediaUrl: "",
      mediaId,
      visibility: visibility || 'PUBLIC',
      likes: 0,
      saved: false,
      comments: 0,
    };
    
    // Add to local state immediately
    setPosts((prev) => [optimisticPost, ...prev]);
    bumpPrefs(tags, 1.0);
    
    // Call backend API
    try {
      const response = await apiClient.post('/posts', {
        content: body || title,
        tags: tags || [],
        mediaId: mediaId || null,
        visibility: visibility || 'PUBLIC'
      });
      
      // Update with actual post data from backend
      if (response?.data) {
        const actualPost = {
          id: response.data.id || optimisticPost.id,
          author: response.data.author || optimisticPost.author,
          title: title,
          body: response.data.content || body,
          tags: response.data.tags || tags,
          createdAt: new Date(response.data.createdAt).getTime() || optimisticPost.createdAt,
          mediaUrl: response.data.media?.[0] || "",
          mediaId: response.data.mediaId || mediaId,
          visibility: response.data.visibility || visibility,
          likes: response.data._count?.likes || 0,
          saved: false,
          comments: response.data._count?.comments || 0,
        };
        
        setPosts((prev) => prev.map(p => p.id === optimisticPost.id ? actualPost : p));
      }
    } catch (error) {
      console.error('Failed to create post via API:', error);
      // Keep optimistic post in place - user can try again or we handle elsewhere
    }
    
    return optimisticPost.id;
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
