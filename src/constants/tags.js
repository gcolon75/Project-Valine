/**
 * Curated tag taxonomy for Joint platform
 * Categories: Performance, Genre, Format, Skill
 * 
 * Update process: Add new tags here, deploy, deprecate old tags via migration script
 */
export const ALLOWED_TAGS = [
  // Performance Types
  'Monologue',
  'Drama',
  'Comedy',
  'Improv',
  'Character',
  'Stage',
  
  // Genres
  'SciFi',
  'Fantasy',
  'Horror',
  'Romance',
  'Thriller',
  'Action',
  
  // Formats
  'Narration',
  'Animation',
  'Commercial',
  'Audiobook',
  'Podcast',
  'VoiceOver',
  
  // Content Types
  'Reading',
  'Reel',
  'ShortFilm',
  'Feature',
  'Pilot',
  'ColdRead',
  
  // Skills
  'Dialect',
  'Playwriting',
  'Directing',
  'Producing',
  'Editing',
  'Casting',
];

export const MAX_TAGS = 5;

export const TAG_CATEGORIES = {
  performance: ['Monologue', 'Drama', 'Comedy', 'Improv', 'Character', 'Stage'],
  genre: ['SciFi', 'Fantasy', 'Horror', 'Romance', 'Thriller', 'Action'],
  format: ['Narration', 'Animation', 'Commercial', 'Audiobook', 'Podcast', 'VoiceOver'],
  content: ['Reading', 'Reel', 'ShortFilm', 'Feature', 'Pilot', 'ColdRead'],
  skill: ['Dialect', 'Playwriting', 'Directing', 'Producing', 'Editing', 'Casting'],
};

/**
 * Validate tags against allowed list and max count
 */
export function validateTags(tags) {
  const errors = [];
  
  if (!Array.isArray(tags)) {
    return { valid: false, errors: ['Tags must be an array'] };
  }
  
  if (tags.length > MAX_TAGS) {
    errors.push(`Maximum ${MAX_TAGS} tags allowed (you have ${tags.length})`);
  }
  
  const invalidTags = tags.filter(tag => !ALLOWED_TAGS.includes(tag));
  if (invalidTags.length > 0) {
    errors.push(`Invalid tags: ${invalidTags.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
