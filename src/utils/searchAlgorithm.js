/**
 * Simple search algorithm that scores posts based on keyword frequency in their
 * content and tags. The higher the number of keyword matches, the higher
 * the score. If no keywords are provided the original order is preserved.
 *
 * @param {Array} posts The list of posts to search through.
 * @param {string} query A space separated string of search terms.
 * @returns {Array} A new array of posts sorted by relevance.
 */
export function searchPosts(posts, query) {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (keywords.length === 0) return posts;
  return posts
    .map((post) => {
      let score = 0;
      const haystack = `${post.content} ${post.tags?.join(' ')}`.toLowerCase();
      keywords.forEach((kw) => {
        const occurrences = haystack.split(kw).length - 1;
        score += occurrences;
      });
      return { ...post, _score: score };
    })
    .filter((p) => p._score > 0)
    .sort((a, b) => b._score - a._score);
}