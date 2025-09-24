import React from 'react';

/**
 * Displays a single tag as a rounded pill. Color changes on hover. Use this
 * component to render post tags or saved tags lists.
 */
const TagPill = ({ tag, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick && onClick(tag)}
      className="mr-2 mb-2 inline-block rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors"
    >
      #{tag}
    </button>
  );
};

export default TagPill;