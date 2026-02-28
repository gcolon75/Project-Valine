// src/pages/PostDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Clock,
  DollarSign,
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Download,
  FileText
} from 'lucide-react';
import { getPost, requestPostAccess, payForPostAccess, likePost, unlikePost } from '../services/postService';
import { getMediaAccessUrl } from '../services/mediaService';
import PDFThumbnail from '../components/PDFThumbnail';
import CommentList from '../components/CommentList';
import SkeletonCard from '../components/skeletons/SkeletonCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Helper function to safely format price
  const formatPrice = (price) => {
    const parsedPrice = parseFloat(price);
    return !isNaN(parsedPrice) ? parsedPrice.toFixed(2) : '0.00';
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPost(id);
        setPost(data);
        setCommentsCount(data.commentsCount || 0);
        setIsLiked(data.isLiked || false);
        setLikesCount(data.likesCount || 0);
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

  // Fetch PDF URL when post has a PDF attachment
  useEffect(() => {
    const fetchPdfUrl = async () => {
      if (post?.mediaAttachment?.type === 'pdf' && post.mediaAttachment.id) {
        try {
          const { viewUrl } = await getMediaAccessUrl(post.mediaAttachment.id);
          setPdfUrl(viewUrl);
        } catch (err) {
          console.error('Error fetching PDF URL:', err);
        }
      }
    };

    fetchPdfUrl();
  }, [post?.mediaAttachment]);

  const handleRequestAccess = async () => {
    if (!user) {
      toast.error('Please log in to request access');
      return;
    }

    try {
      setRequestingAccess(true);
      await requestPostAccess(id);
      toast.success('Access request sent to post owner');
      // Refresh post to get updated status
      const data = await getPost(id);
      setPost(data);
    } catch (err) {
      console.error('Error requesting access:', err);
      toast.error(err.response?.data?.message || 'Failed to request access');
    } finally {
      setRequestingAccess(false);
    }
  };

  const handlePayForAccess = async () => {
    if (!user) {
      toast.error('Please log in to purchase access');
      return;
    }

    try {
      setProcessingPayment(true);
      await payForPostAccess(id);
      toast.success('Payment successful! You now have access.');
      // Refresh post to get updated status
      const data = await getPost(id);
      setPost(data);
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    if (likingInProgress) return;

    try {
      setLikingInProgress(true);
      if (isLiked) {
        const result = await unlikePost(id);
        setIsLiked(false);
        setLikesCount(result.likesCount);
      } else {
        const result = await likePost(id);
        setIsLiked(true);
        setLikesCount(result.likesCount);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      toast.error('Failed to update like');
    } finally {
      setLikingInProgress(false);
    }
  };

  // Called when a new comment is added
  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
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
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
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

  const isPaidPost = !post.isFree && post.price && parseFloat(post.price) > 0;
  const isOwnPost = user?.id === post.authorId;
  const requiresAccess = post.requiresAccess && !isOwnPost;
  const hasAccess = post.hasAccess || isOwnPost;
  const accessStatus = post.accessStatus || 'granted';
  const visibility = post.visibility || 'PUBLIC';
  const isFollowersOnly = visibility === 'FOLLOWERS_ONLY';

  // Render access control UI
  const renderAccessControl = () => {
    if (!requiresAccess || hasAccess) {
      return null;
    }

    if (accessStatus === 'pending') {
      return (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Access Request Pending</h3>
          </div>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Your access request is pending approval from the creator.
          </p>
        </div>
      );
    }

    if (accessStatus === 'denied') {
      return (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-100">Access Denied</h3>
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">
            Your access request was denied by the creator.
          </p>
          <button
            onClick={handleRequestAccess}
            disabled={requestingAccess}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {requestingAccess ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Request Access Again
              </>
            )}
          </button>
        </div>
      );
    }

    // Default: not requested or expired
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            {isPaidPost ? 'Paid Content' : 'Access Required'}
          </h3>
        </div>
        <p className="text-amber-700 dark:text-amber-300 mb-4">
          {isPaidPost 
            ? `This content requires payment of $${formatPrice(post.price)} to access.`
            : 'This content requires permission from the creator to access.'
          }
        </p>
        <div className="flex gap-3">
          {isPaidPost ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-lg font-medium text-sm">
              <Lock className="w-4 h-4" />
              Paid access — coming soon
            </span>
          ) : (
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
                  <Lock className="w-4 h-4" />
                  Request Access
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

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
        {/* Thumbnail - only show if post has a custom thumbnail (not for PDFs - they render below) */}
        {post.thumbnailUrl && post.mediaAttachment?.type !== 'pdf' && (
          <div className="w-full aspect-video bg-neutral-100 dark:bg-neutral-800">
            <img
              src={post.thumbnailUrl}
              alt="Post thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Author Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${post.author?.username}`}>
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.displayName || post.author.username}
                  className="w-12 h-12 rounded-full object-cover hover:ring-2 ring-emerald-500 transition"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg hover:ring-2 ring-emerald-500 transition">
                  {(post.author?.displayName || post.author?.username || 'U')[0].toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1">
              <Link to={`/profile/${post.author?.username}`} className="hover:underline">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {post.author?.displayName || post.author?.username || 'Unknown User'}
                </h3>
              </Link>
              <div className="flex items-center gap-2">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  @{post.author?.username || 'unknown'}
                </p>
                {isFollowersOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
                    <EyeOff className="w-3 h-3" />
                    Followers Only
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-6">
          {/* Post Title */}
          {post.title && (
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              {post.title}
            </h1>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {isPaidPost && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full text-sm font-medium">
                <Lock className="w-4 h-4" />
                Paid access — coming soon
              </span>
            )}
            {!isPaidPost && post.isFree && requiresAccess && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Free (Permission Required)
              </span>
            )}
          </div>

          {/* Access Control UI */}
          {renderAccessControl()}

          {/* Content - show if has access or doesn't require access */}
          {(hasAccess || !requiresAccess) && (
            <>
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
                  ) : post.mediaAttachment.type === 'pdf' ? (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                      {/* PDF Title Header */}
                      <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-red-500 dark:text-red-400 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                              {post.mediaAttachment.title || 'Document'}
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">PDF Document</p>
                          </div>
                        </div>
                      </div>
                      {/* PDF Thumbnail Preview - rendered client-side */}
                      <PDFThumbnail
                        pdfUrl={pdfUrl}
                        title={post.mediaAttachment.title || 'Document'}
                        className="w-full min-h-[300px]"
                      />
                      {/* PDF Actions */}
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-end">
                        <button
                          onClick={() => {
                            if (pdfUrl) {
                              window.open(pdfUrl, '_blank');
                            } else {
                              toast.error('PDF not ready yet');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
                        >
                          <Eye className="w-4 h-4" />
                          View PDF
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Download Button */}
              {hasAccess && post.allowDownload && (post.mediaAttachment || post.audioUrl) && (
                <div className="mb-6">
                  <button
                    disabled
                    title="Download feature coming soon"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium transition opacity-50 cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Download (Watermarked) - Coming Soon
                  </button>
                </div>
              )}
            </>
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
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-6">
          <button
            onClick={handleLike}
            disabled={likingInProgress}
            className={`flex items-center gap-2 transition disabled:opacity-50 ${
              isLiked
                ? 'text-red-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-red-500'
            }`}
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
          >
            <Heart className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} />
            <span>{likesCount > 0 ? likesCount : 'Like'}</span>
          </button>
          <button
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-blue-500 transition"
            aria-label="View comments"
            onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount}</span>
          </button>
          <button
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-emerald-500 transition"
            aria-label="Bookmark post"
          >
            <Bookmark className="w-5 h-5" />
            <span>Save</span>
          </button>
          <button
            onClick={() => {
              const postUrl = `${window.location.origin}/posts/${id}`;
              navigator.clipboard.writeText(postUrl).then(() => {
                toast.success("Link copied to clipboard!");
              }).catch(() => {
                toast.error("Failed to copy link");
              });
            }}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-purple-500 transition ml-auto"
            aria-label="Share post"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>

        {/* Comments Section */}
        <div id="comments-section">
          <CommentList postId={id} onCommentAdded={handleCommentAdded} />
        </div>
      </article>
    </div>
  );
}
