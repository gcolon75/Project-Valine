// src/pages/PostDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Clock, DollarSign, Loader2 } from 'lucide-react';
import { getPost, requestPostAccess } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingAccess, setRequestingAccess] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPost(id);
        setPost(data);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err.response?.status === 404 ? 'Post not found' : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  const handleRequestAccess = async () => {
    if (!user) {
      toast.error('Please log in to request access');
      return;
    }

    try {
      setRequestingAccess(true);
      await requestPostAccess(id);
      toast.success('Access request sent to post owner');
    } catch (err) {
      console.error('Error requesting access:', err);
      toast.error(err.response?.data?.message || 'Failed to request access');
    } finally {
      setRequestingAccess(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading post...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-neutral-600 dark:text-neutral-400">{error}</p>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const isPaidPost = post.price && parseFloat(post.price) > 0;
  const isOwnPost = user?.id === post.authorId;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Feed</span>
      </Link>

      {/* Post Card */}
      <article className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        {/* Author Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            {post.author?.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.displayName || post.author.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg">
                {(post.author?.displayName || post.author?.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {post.author?.displayName || post.author?.username || 'Unknown User'}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                @{post.author?.username || 'unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-6">
          {/* Price Badge */}
          {isPaidPost && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                ${parseFloat(post.price).toFixed(2)}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none mb-6">
            <p className="text-neutral-900 dark:text-white whitespace-pre-wrap">
              {post.content}
            </p>
          </div>

          {/* Audio Player */}
          {post.audioUrl && (
            <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Audio Post</p>
              <audio controls className="w-full">
                <source src={post.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Media Attachment */}
          {post.mediaAttachment && (
            <div className="mb-6">
              {post.mediaAttachment.type === 'video' ? (
                <video
                  src={post.mediaAttachment.s3Key}
                  controls
                  className="w-full rounded-lg"
                />
              ) : post.mediaAttachment.type === 'image' ? (
                <img
                  src={post.mediaAttachment.s3Key}
                  alt="Post attachment"
                  className="w-full rounded-lg"
                />
              ) : null}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            <Clock className="w-4 h-4" />
            <span>{formatDate(post.createdAt)}</span>
          </div>

          {/* Request Access Button for Paid Posts */}
          {isPaidPost && !isOwnPost && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                This is a paid post. Request access from the creator.
              </p>
              <button
                onClick={handleRequestAccess}
                disabled={requestingAccess}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestingAccess ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Request Access (${parseFloat(post.price).toFixed(2)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-6">
          <button
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition"
            aria-label="Like post"
          >
            <Heart className="w-5 h-5" />
            <span>Like</span>
          </button>
          <button
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-blue-500 transition"
            aria-label="Comment on post"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Comment</span>
          </button>
          <button
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-emerald-500 transition"
            aria-label="Bookmark post"
          >
            <Bookmark className="w-5 h-5" />
            <span>Save</span>
          </button>
          <button
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-purple-500 transition ml-auto"
            aria-label="Share post"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
      </article>
    </div>
  );
}
