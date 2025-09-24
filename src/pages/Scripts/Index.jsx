import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Lists the user's scripts. Each script includes a title, genre and a short
 * synopsis. Users can navigate to create a new script or view existing
 * scripts in detail. This page acts as a starting point for script
 * management.
 */
const ScriptsIndex = () => {
  const scripts = [
    {
      id: 1,
      title: 'Space Noir Pilot',
      genre: 'Sci‑Fi',
      synopsis: 'A detective unravels a mystery aboard a generation ship.',
    },
    {
      id: 2,
      title: 'Rom‑Com Twist',
      genre: 'Comedy',
      synopsis: 'Love and AI collide in this quirky short film.',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">My Scripts</h1>
        <Link
          to="/scripts/new"
          className="px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark"
        >
          New Script
        </Link>
      </div>
      {scripts.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">You have no scripts yet.</p>
      ) : (
        <ul className="space-y-4">
          {scripts.map((script) => (
            <li
              key={script.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {script.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Genre: {script.genre}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {script.synopsis}
                </p>
              </div>
              <Link
                to={`/scripts/${script.id}`}
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

export default ScriptsIndex;