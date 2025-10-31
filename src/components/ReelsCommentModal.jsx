import { X, Send, MessageCircle } from 'lucide-react';
import { useState } from 'react';

const ReelsCommentModal = ({ isOpen, onClose, reel }) => {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: API call to post comment
    console.log('Comment:', comment);
    setComment('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a1a] rounded-t-2xl md:rounded-2xl max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Comments
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Comments List */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Mock comments */}
          <div className="space-y-4">
            <div className="flex space-x-3">
              <img 
                src="https://i.pravatar.cc/150?img=3"
                alt="User"
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  john_doe
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Amazing work! 🔥
                </p>
                <p className="text-xs text-neutral-500 mt-1">2h ago</p>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {reel.comments === 0 && (
            <p className="text-center text-neutral-500 py-8">
              No comments yet. Be the first!
            </p>
          )}
        </div>

        {/* Comment Input */}
        <form 
          onSubmit={handleSubmit}
          className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-full px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReelsCommentModal;
