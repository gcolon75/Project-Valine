// src/utils/videoEmbed.js
// Utilities for parsing and embedding YouTube / Vimeo URLs

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const VIMEO_REGEX =
  /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;

/**
 * Parse a YouTube or Vimeo URL and return embed info.
 * @param {string} url
 * @returns {{ type: 'youtube'|'vimeo', embedUrl: string } | null}
 */
export function parseVideoEmbed(url) {
  if (!url || typeof url !== 'string') return null;

  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }

  const vimeoMatch = url.match(VIMEO_REGEX);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return null;
}

export function isVideoEmbedUrl(url) {
  return parseVideoEmbed(url) !== null;
}
