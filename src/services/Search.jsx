// src/services/search.js

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
