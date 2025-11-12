/**
 * Profile Summary Utilities
 * Builds lightweight profile summary objects for caching
 */

/**
 * Build a profile summary with essential fields only
 * Excludes large/PII fields and includes computed metadata
 * 
 * @param {object} profileRecord - Full profile record from database
 * @returns {object} Lightweight profile summary
 */
export function buildProfileSummary(profileRecord) {
  if (!profileRecord) {
    return null
  }

  const summary = {
    id: profileRecord.id,
    userId: profileRecord.userId,
    vanityUrl: profileRecord.vanityUrl,
    headline: profileRecord.headline || null,
    title: profileRecord.title || null,
    bio: profileRecord.bio || null,
    roles: profileRecord.roles || [],
    tags: profileRecord.tags || [],
    location: profileRecord.location || null,
    // Computed fields
    linksCount: Array.isArray(profileRecord.links) ? profileRecord.links.length : 0,
    hasAvatar: profileRecord.user?.avatar ? true : false,
    // Include links if present (already ordered from query)
    links: profileRecord.links || [],
    // Timestamps
    createdAt: profileRecord.createdAt,
    updatedAt: profileRecord.updatedAt
  }

  return summary
}

/**
 * Build profile summary cache key
 * Pattern: profile:v1:<userId>:summary
 * 
 * @param {string} userId - User ID
 * @returns {string} Cache key
 */
export function getProfileCacheKey(userId) {
  return `profile:v1:${userId}:summary`
}

/**
 * Normalize search query for consistent cache keys
 * 
 * @param {string} query - Search query
 * @returns {string} Normalized query
 */
export function normalizeSearchQuery(query) {
  if (!query) {
    return ''
  }

  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}

/**
 * Build search cache key
 * Pattern: search:v1:<normalizedQuery>:page:<n>
 * 
 * @param {string} query - Search query (will be normalized)
 * @param {number} page - Page number (default 1)
 * @returns {string} Cache key
 */
export function getSearchCacheKey(query, page = 1) {
  const normalized = normalizeSearchQuery(query)
  return `search:v1:${normalized}:page:${page}`
}
