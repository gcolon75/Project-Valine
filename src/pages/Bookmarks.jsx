// src/pages/Bookmarks.jsx
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { Bookmark } from 'lucide-react';

export default function Bookmarks() {
  const navigate = useNavigate();
  const bookmarks = []; // TODO: fetch real bookmarks

  return (
    <div className="max-w-3xl mx-auto space-y-4 px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Bookmarks</h1>
      {bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Save posts you want to revisit by clicking the bookmark icon."
          actionText="Explore Posts"
          onAction={() => navigate('/dashboard')}
        />
      ) : (
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4 text-neutral-700 dark:text-neutral-300">
          {/* bookmark list goes here */}
        </div>
      )}
    </div>
  );
}
