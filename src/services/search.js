// src/services/search.js
import apiClient from './api';

// Normalize text
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^\w# ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Basic tokenizer
const toks = (s) => norm(s).split(" ").filter(Boolean);

// Compute score for a post given query tokens & user prefs
function scorePost(post, qTokens, prefs = {}) {
  const title = norm(post.title);
  const body = norm(post.body);
  const tags = (post.tags || []).map((t) => t.toLowerCase());

  let score = 0;

  // tag exact matches weigh a lot
  for (const qt of qTokens) {
    if (qt.startsWith("#")) {
      if (tags.includes(qt)) score += 8;
    } else {
      // keyword presence
      if (title.includes(qt)) score += 4;
      if (body.includes(qt)) score += 2;
    }
  }

  // personal preference weights (instagram-ish)
  for (const t of tags) {
    const w = prefs[t] || 0;
    score += w; // each tag weight adds
  }

  // recency boost (last 48h)
  const ageH = (Date.now() - post.createdAt) / 36e5;
  const recency = Math.max(0, 48 - ageH) / 8; // 0..6
  score += recency;

  // engagement (likes/comments) soft boost
  score += Math.log2(1 + post.likes) + Math.log2(1 + post.comments);

  return score;
}

export function searchPosts(posts, query, prefs = {}) {
  const qTokens = toks(query);
  if (!qTokens.length) return posts.slice();
  const withScores = posts.map((p) => ({ p, s: scorePost(p, qTokens, prefs) }));
  withScores.sort((a, b) => b.s - a.s);
  return withScores.map((x) => x.p);
}

export function rankForUser(posts, prefs = {}) {
  // Personalized home feed ranking with no query
  const withScores = posts.map((p) => ({
    p,
    s: scorePost(p, [], prefs),
  }));
  withScores.sort((a, b) => b.s - a.s);
  return withScores.map((x) => x.p);
}

/**
 * Search profiles via serverless API
 * @param {Object} params - Search parameters
 * @param {string} params.query - Text search query
 * @param {string} params.role - Filter by role
 * @param {string} params.location - Filter by location
 * @param {number} params.limit - Results per page
 * @param {string} params.cursor - Pagination cursor
 * @returns {Promise} Search results
 */
export const searchProfiles = async ({ query, role, location, limit = 20, cursor } = {}) => {
  const params = {};
  if (query) params.query = query;
  if (role) params.role = role;
  if (location) params.location = location;
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;

  const { data } = await apiClient.get('/search', { params });
  return data;
};

/**
 * Search users via serverless API
 * @param {Object} params - Search parameters
 * @param {string} params.query - Username or display name search query (required)
 * @param {number} params.limit - Results per page
 * @param {string} params.cursor - Pagination cursor
 * @returns {Promise} User search results
 */
export const searchUsers = async ({ query, limit = 20, cursor } = {}) => {
  if (!query) {
    throw new Error('query parameter is required for user search');
  }

  const params = { query };
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;

  const { data } = await apiClient.get('/search/users', { params });
  return data;
};
