import React from 'react';
import { Gem } from 'lucide-react';

/**
 * Small green gem icon shown next to the name of users with an active
 * Emerald subscription. Pass an author/user-like object that has `plan`.
 * Renders nothing if the user is not an active Emerald subscriber.
 *
 * Usage:
 *   <span>{author.displayName} <EmeraldBadge user={author} /></span>
 */
export default function EmeraldBadge({ user, size = 14, className = '' }) {
  if (!user || user.plan !== 'emerald') return null;
  return (
    <Gem
      size={size}
      className={`inline-block align-text-bottom text-emerald-500 ${className}`}
      aria-label="Emerald member"
      title="Emerald member"
    />
  );
}
