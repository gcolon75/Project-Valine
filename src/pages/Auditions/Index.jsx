import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Lists audition tapes created by the user. Each audition shows a title,
 * category and a short description. Users can create new audition entries
 * or view existing ones. Video upload is not implemented in this demo.
 */
const AuditionsIndex = () => {
  const auditions = [
    {
      id: 1,
      title: 'Teaser for Sci‑Fi Pilot',
      category: 'Sci‑Fi',
      description: 'Short monologue showcasing range for the lead role.',
    },
    {
      id: 2,
      title: 'Comedy Reel',
      category: 'Comedy',
      description: 'Compilation of improv scenes and stand‑up clips.',
    },
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">My Auditions</h1>
        <Link
          to="/auditions/new"
          className="px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark"
        >
          New Audition
        </Link>
      </div>
      {auditions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">You have no auditions yet.</p>
      ) : (
        <ul className="space-y-4">
          {auditions.map((audition) => (
            <li
              key={audition.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {audition.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Category: {audition.category}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {audition.description}
                </p>
              </div>
              <Link
                to={`/auditions/${audition.id}`}
                className="text-primary text-sm hover:underline mt-1"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AuditionsIndex;