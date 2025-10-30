const SkeletonProfile = () => (
  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-24 h-24 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
      </div>
    </div>
    <div className="flex space-x-6 mt-4">
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
    </div>
  </div>
);

export default SkeletonProfile;
