import { useState } from 'react';

/**
 * Renders a user's avatar image, with a branded initial-circle fallback
 * when no avatar is set or the image fails to load.
 *
 * Props:
 *   src        — avatar URL (optional)
 *   alt        — alt text for the <img>
 *   name       — display name used to derive the initial (falls back to alt)
 *   className  — size + any extra classes applied to both the img and fallback div
 *                (default: 'w-10 h-10')
 */
export default function UserAvatar({ src, alt, name, className = 'w-10 h-10' }) {
  const [errored, setErrored] = useState(false);
  const initial = (name || alt || '?').charAt(0).toUpperCase();

  if (src && !errored) {
    return (
      <img
        src={src}
        alt={alt || name || 'User'}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-[#0CCE6B]/20 flex items-center justify-center flex-shrink-0 ${className}`}
      aria-label={alt || name || 'User'}
    >
      <span className="text-[#0CCE6B] font-semibold text-sm leading-none select-none">
        {initial}
      </span>
    </div>
  );
}
