// src/components/PostCard.jsx
import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Download, Lock, Eye, MoreVertical, Trash2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useFeed } from "../context/FeedContext";
import { useAuth } from "../context/AuthContext";
import CommentList from "./CommentList";
import ConfirmationModal from "./ConfirmationModal";
import { getMediaAccessUrl, requestMediaAccess } from "../services/mediaService";
import { deletePost } from "../services/postService";
import { createThread } from "../services/messagesService";

export default function PostCard({ post, onDelete }) {
  const { likePost, toggleSave } = useFeed();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accessRequested, setAccessRequested] = useState(post.accessRequestStatus === 'pending');
  const [hasAccess, setHasAccess] = useState(
    post.visibility === "public" || 
    post.hasAccess || 
    post.accessRequestStatus === 'approved'
  );
  const [downloading, setDownloading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharingViaDM, setSharingViaDM] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);

  // Handle comment added
  const handleCommentAdded = () => {
    setCommentCount((prev) => prev + 1);
  };

  // Check if current user is the post author
  // Include fallback checks for different property name variations
  const isAuthor = user && (
    user.id === post.author?.id || 
    user.id === post.authorId || 
    user.id === post.userId || 
    user.id === post.ownerId
  );
  
  // Check if content is gated (has a mediaId and is not public)
  const isGated = post.mediaId && (post.visibility === "on-request" || post.visibility === "private");
  
  // Image fallback: use mediaAttachment url, post image, or placeholder
  const imageUrl = post.mediaAttachment?.posterUrl || post.mediaUrl || post.imageUrl || '/placeholders/post.svg';

  // Handle request access
  const handleRequestAccess = async () => {
    if (!user?.id) {
      toast.error("Please log in to request access");
      return;
    }

    try {
      if (post.mediaId) {
        await requestMediaAccess(post.mediaId, user.id);
      }
      setAccessRequested(true);
      toast.success("Access request sent! You'll be notified when approved.");
    } catch (error) {
      console.error("Request access failed:", error);
      toast.error("Failed to send request. Please try again.");
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!post.mediaId) {
      toast.error("No media available for download");
      return;
    }

    setDownloading(true);
    try {
      const response = await getMediaAccessUrl(post.mediaId, user?.id);
      // Backend returns viewUrl, posterUrl. Use viewUrl for download.
      const downloadUrl = response.viewUrl || response.downloadUrl;
      
      if (!downloadUrl) {
        throw new Error('No download URL available');
      }
      
      // Create download link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = post.title || "download";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Handle delete post
  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
      toast.success("Post deleted successfully");
      setShowDeleteConfirm(false);
      // Call parent callback if provided
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(error.response?.data?.message || "Failed to delete post. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Handle share via DM
  const handleShareViaDM = async () => {
    if (!user?.id) {
      toast.error("Please log in to share via DM");
      return;
    }

    setSharingViaDM(true);
    setShowMenu(false);
    
    try {
      // Create or get thread with post author
      const authorId = post.author?.id || post.authorId;
      if (!authorId) {
        throw new Error("Post author not found");
      }
      
      const threadData = await createThread(authorId);
      
      // Navigate to conversation with forwarded post in state
      navigate(`/inbox/${threadData.id}`, {
        state: {
          forwardedPost: {
            id: post.id,
            title: post.title,
            body: post.body,
            author: post.author
          }
        }
      });
      
      toast.success("Opening conversation...");
    } catch (error) {
      console.error("Share via DM failed:", error);
      toast.error("Failed to share via DM. Please try again.");
    } finally {
      setSharingViaDM(false);
    }
  };

  return (
    <>
      <article className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {post.author.avatar ? (
            <img 
              src={post.author.avatar} 
              alt={post.author.name}
              className="h-8 w-8 rounded-full object-cover"
              onError={(e) => {
                e.target.src = ''; // Clear broken image
              }}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate text-neutral-900 dark:text-white">{post.author.name}</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{post.author.role}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Visibility indicator */}
            {isGated && (
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <Lock className="w-3 h-3" />
                {post.visibility === "private" ? "Private" : "On Request"}
              </span>
            )}
            {/* Price badge */}
            {post.price !== undefined && post.price !== null && (() => {
              const priceValue = parseFloat(post.price);
              return (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  priceValue > 0 
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {priceValue > 0 ? `$${priceValue.toFixed(2)}` : 'Free'}
                </span>
              );
            })()}
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {timeAgo(post.createdAt)}
            </span>
            
            {/* 3-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Post options"
              >
                <MoreVertical className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </button>
              
              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 top-8 z-20 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1">
                    {/* Share via DM - available for all posts */}
                    {!isAuthor && (
                      <button
                        onClick={handleShareViaDM}
                        disabled={sharingViaDM}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {sharingViaDM ? "Opening..." : "Share via DM"}
                      </button>
                    )}
                    
                    {/* Delete - only for author */}
                    {isAuthor && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* Media */}
      <div className="aspect-[16/9] bg-neutral-300 dark:bg-neutral-800 relative overflow-hidden">
        {isGated && !hasAccess ? (
          // Gated content - show blurred preview
          <div className="relative w-full h-full">
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={post.title || "Post preview"}
                className="w-full h-full object-cover blur-lg opacity-50"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/40">
              <Lock className="w-8 h-8 text-white mb-2" />
              <span className="text-white text-sm font-medium">
                {post.visibility === "private" ? "Private Content" : "Access Required"}
              </span>
            </div>
          </div>
        ) : (
          // Full content
          imageUrl && (
            <img 
              src={imageUrl} 
              alt={post.title || "Post image"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-semibold text-neutral-900 dark:text-white">{post.title}</div>
        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{post.body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-2.5 py-0.5 text-xs text-neutral-700 dark:text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => likePost(post.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5 ${
              post.isLiked
                ? "border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-300"
                : "border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
            }`}
            aria-label={post.isLiked ? `Unlike post, currently ${post.likes || 0} likes` : `Like post, currently ${post.likes || 0} likes`}
          >
            <Heart className="w-4 h-4" fill={post.isLiked ? "currentColor" : "none"} aria-hidden="true" />
            <span>{post.likes || 0}</span>
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
            aria-label={`View comments, ${commentCount} comments`}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            <span>{commentCount}</span>
          </button>
          <button
            onClick={() => toggleSave(post.id)}
            className={[
              "rounded-full px-3 py-1.5 text-sm border transition-colors flex items-center gap-1.5",
              post.saved
                ? "bg-emerald-100 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                : "bg-neutral-100 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10",
            ].join(" ")}
            aria-label={post.saved ? "Unsave post" : "Save post"}
          >
            <Bookmark className="w-4 h-4" fill={post.saved ? "currentColor" : "none"} aria-hidden="true" />
            <span>{post.saved ? "Saved" : "Save"}</span>
          </button>
          
          {/* View button - navigate to post detail page */}
          <button
            onClick={() => navigate(`/posts/${post.id}`)}
            className="rounded-full border border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-600/20 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-colors flex items-center gap-1.5"
            aria-label="View full post details"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>View</span>
          </button>
          
          {/* Request/Download button */}
          <div className="ml-auto">
            {isGated && !hasAccess ? (
              // Request access button
              <button
                onClick={handleRequestAccess}
                disabled={accessRequested}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5 ${
                  accessRequested
                    ? "border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : "border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-600/30"
                }`}
                aria-label={accessRequested ? "Access requested" : "Request access to this post"}
              >
                {accessRequested ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Requested</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Request Access</span>
                  </>
                )}
              </button>
            ) : post.mediaId || post.mediaUrl ? (
              // Download button for accessible content with media
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-full border border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-600/20 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download content"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? "Downloading..." : "Download"}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Comments */}
      {open && <CommentList postId={post.id} onCommentAdded={handleCommentAdded} />}
    </article>

    {/* Delete Confirmation Modal */}
    <ConfirmationModal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={handleDeletePost}
      title="Delete Post"
      message="Are you sure you want to delete this post? This will remove it from your profile and feed and revoke access for anyone who had access. This action cannot be undone."
      confirmText={deleting ? "Deleting..." : "Delete"}
      cancelText="Cancel"
      destructive={true}
    />
  </>
  );
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
