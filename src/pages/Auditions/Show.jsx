import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * Shows details of a single audition. If the audition is gated, the user can
 * request access. For demonstration purposes we show a simple video
 * placeholder and a gating mechanism.
 */
const AuditionsShow = () => {
  const { id } = useParams();
  // Hardcoded audition example
  const audition = {
    id,
    title: 'Teaser for Sci‑Fi Pilot',
    category: 'Sci‑Fi',
    description: 'Short monologue showcasing range for the lead role.',
    gated: true,
    videoUrl: null,
  };
  const [requested, setRequested] = useState(false);

  return (
    <div>
      <Link to="/auditions" className="text-sm text-primary hover:underline mb-4 inline-block">
        &larr; Back to Auditions
      </Link>
      <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">{audition.title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Category: {audition.category}</p>
      <p className="mb-6 text-gray-700 dark:text-gray-300">{audition.description}</p>
      {audition.gated && !requested ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">This audition tape is gated. Request access to view the full video.</p>
          <button
            onClick={() => setRequested(true)}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Request Access
          </button>
        </div>
      ) : (
        <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden" style={{ paddingTop: '56.25%' }}>
          {/* In a real app embed a video player */}
          {audition.videoUrl ? (
            <video
              src={audition.videoUrl}
              controls
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <span>Video placeholder</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditionsShow;