import { useState, useEffect } from 'react';
import SkeletonCard from '../components/skeletons/SkeletonCard';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';
import SkeletonText from '../components/skeletons/SkeletonText';

export default function SkeletonTest() {
  const [showSkeletons, setShowSkeletons] = useState(true);

  useEffect(() => {
    // Simulate loading for 5 seconds
    const timer = setTimeout(() => setShowSkeletons(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">
            Phase 2: Loading Skeletons Demo
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {showSkeletons ? 'Loading skeletons displayed below...' : 'Content loaded! Refresh to see skeletons again.'}
          </p>
          <button
            onClick={() => setShowSkeletons(!showSkeletons)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showSkeletons ? 'Show Content' : 'Show Skeletons'}
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">
            SkeletonCard Component
          </h2>
          {showSkeletons ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full" />
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">John Doe</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Actor</div>
                  </div>
                </div>
                <p className="text-neutral-900 dark:text-white">
                  This is a real post card that appears after the skeleton loading state completes.
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">
            SkeletonProfile Component
          </h2>
          {showSkeletons ? (
            <SkeletonProfile />
          ) : (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-24 h-24 bg-purple-500 rounded-full" />
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Jane Smith</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">@janesmith</p>
                  <p className="text-neutral-700 dark:text-neutral-300">Voice Actor • Writer</p>
                </div>
              </div>
              <div className="flex space-x-6">
                <div className="text-neutral-900 dark:text-white">
                  <span className="font-semibold">123</span> Posts
                </div>
                <div className="text-neutral-900 dark:text-white">
                  <span className="font-semibold">456</span> Followers
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">
            SkeletonText Component
          </h2>
          {showSkeletons ? (
            <SkeletonText lines={5} />
          ) : (
            <div className="text-neutral-900 dark:text-white space-y-2">
              <p>This is line one of the actual content.</p>
              <p>This is line two of the actual content.</p>
              <p>This is line three of the actual content.</p>
              <p>This is line four of the actual content.</p>
              <p>This is line five of the actual content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
