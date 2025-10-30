const SkeletonCard = () => (
  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 animate-pulse">
    <div className="flex items-center space-x-3 mb-3">
      <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/6" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4/6" />
    </div>
  </div>
);

export default SkeletonCard;
