const EmptyState = ({ icon: Icon, title, description, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
    {Icon && (
      <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-neutral-600 dark:text-neutral-400 mb-4 max-w-sm">
      {description}
    </p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        {actionText}
      </button>
    )}
  </div>
);

export default EmptyState;
