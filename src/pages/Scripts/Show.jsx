import React from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * Shows details of a single script. For now we use a static script but in
 * practice you would fetch the script by id from an API. Includes a back
 * button to return to the scripts index page.
 */
const ScriptsShow = () => {
  const { id } = useParams();
  // Hardcoded script example
  const script = {
    id,
    title: 'Space Noir Pilot',
    genre: 'Sci‑Fi',
    synopsis: 'A detective unravels a mystery aboard a generation ship.',
    content: `INT. BRIDGE – NIGHT\n\nThe camera pans across a dimly lit control room filled with blinking consoles. CAPTAIN REX (40s) stares out at the stars as the hum of the ship echoes.\n\nREX\n(to himself)\nAnother day in the void…\n\nA mysterious signal crackles to life on the comm panel.`,
    tags: ['SciFi', 'Mystery'],
  };

  return (
    <div>
      <Link to="/scripts" className="text-sm text-primary hover:underline mb-4 inline-block">
        &larr; Back to Scripts
      </Link>
      <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">{script.title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Genre: {script.genre}</p>
      <p className="mb-6 text-gray-700 dark:text-gray-300">{script.synopsis}</p>
      <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200">
        {script.content}
      </pre>
      <div className="mt-4 flex flex-wrap">
        {script.tags.map((tag) => (
          <span
            key={tag}
            className="mr-2 mb-2 inline-block rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ScriptsShow;