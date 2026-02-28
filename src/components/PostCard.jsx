// src/components/PostCard.jsx
import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Download, Lock, Eye, MoreVertical, Trash2, MessageSquare, Share2, FileText } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useFeed } from "../context/FeedContext";
import { useAuth } from "../context/AuthContext";
import CommentList from "./CommentList";
import ConfirmationModal from "./ConfirmationModal";
import { getMediaAccessUrl, requestMediaAccess, getWatermarkedPdf } from "../services/mediaService";
import { deletePost } from "../services/postService";
import { createThread } from "../services/messagesService";

export default function PostCard({ post, onDelete, onLike }) {
  const { likePost: contextLikePost, toggleSave } = useFeed();
  // Use provided onLike handler or fall back to context
  const likePost = onLike || contextLikePost;
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

  // Check if media is a document (PDF, script, etc.)
  const isPdf = post.mediaAttachment?.type === 'pdf' ||
                post.mediaAttachment?.s3Key?.endsWith('.pdf');
  const isDoc = post.mediaAttachment?.type === 'document' ||
                post.mediaAttachment?.s3Key?.endsWith('.doc') ||
                post.mediaAttachment?.s3Key?.endsWith('.docx');
  const isDocument = isPdf || isDoc;


  // Image fallback: use mediaAttachment url, post image, or placeholder
  const imageUrl = post.mediaAttachment?.posterUrl || post.mediaUrl || post.imageUrl;

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
      // For PDFs, use watermarked endpoint (adds viewer's username as watermark)
      if (isPdf) {
        const pdfBlob = await getWatermarkedPdf(post.mediaId);

        // Create download link from blob
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${post.title || 'document'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("PDF downloaded!");
      } else {
        // Non-PDF: use existing S3 signed URL flow
        const response = await getMediaAccessUrl(post.mediaId, user?.id);
        const downloadUrl = response.viewUrl || response.downloadUrl;

        if (!downloadUrl) {
          throw new Error('No download URL available');
        }

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = post.title || "download";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download started!");
      }
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
        <div className="px-4 py-3">
          {/* Post Title - Primary */}
          {post.title && (
            <h2
              className="text-lg font-bold text-neutral-900 dark:text-white mb-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              onClick={() => navigate(`/posts/${post.id}`)}
            >
              {post.title}
            </h2>
          )}

          {/* Author info and meta - Secondary */}
          <div className="flex items-center gap-2">
            <Link to={`/profile/${post.author.role}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="h-6 w-6 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = '';
                  }}
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-white/10" />
              )}
              <span className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200">
                {post.author.name}
              </span>
            </Link>
            {post.author.role && (
              <>
                <span className="text-neutral-400 dark:text-neutral-500">·</span>
                <Link to={`/profile/${post.author.role}`} className="text-xs text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                  @{post.author.role}
                </Link>
              </>
            )}
            <span className="text-neutral-400 dark:text-neutral-500">·</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-500">
              {timeAgo(post.createdAt)}
            </span>

            {/* Badges */}
            {isGated && (
              <span className="flex items-center gap-1 text-xs text-neutral-500 ml-1">
                <Lock className="w-3 h-3" />
              </span>
            )}
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

            {/* 3-dot menu */}
            <div className="relative ml-auto">
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

      {/* Media - clickable to view post */}
      <div
        className="aspect-[16/9] bg-neutral-300 dark:bg-neutral-800 relative overflow-hidden cursor-pointer"
        onClick={() => navigate(`/posts/${post.id}`)}
      >
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
        ) : isDocument ? (
          // Document content - show poster thumbnail if available, otherwise icon
          post.mediaAttachment?.posterUrl ? (
            <img
              src={post.mediaAttachment.posterUrl}
              alt={post.title || "Document preview"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // On error, replace with fallback
                const fallback = document.createElement('div');
                fallback.className = 'w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800';
                fallback.innerHTML = '<span class="text-xs text-neutral-500">PDF Document</span>';
                e.target.parentNode.replaceChild(fallback, e.target);
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
              <FileText className="w-16 h-16 text-red-500 dark:text-red-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
                PDF Document
              </span>
            </div>
          )
        ) : imageUrl ? (
          // Image/video content with actual URL
          <img
            src={imageUrl}
            alt={post.title || "Post image"}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          // No image available - show placeholder
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-200 dark:bg-neutral-700">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              No preview available
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Body content - clickable to view post */}
        <div
          className="cursor-pointer"
          onClick={() => navigate(`/posts/${post.id}`)}
        >
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{post.body}</p>
        </div>
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
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 ${
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
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 ${
              open
                ? "border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300"
                : "border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-600 dark:hover:bg-blue-600/20 dark:hover:text-blue-300"
            }`}
            aria-label={`View comments, ${commentCount} comments`}
            aria-expanded={open}
          >
            <MessageCircle className="w-4 h-4" fill={open ? "currentColor" : "none"} aria-hidden="true" />
            <span>{commentCount}</span>
          </button>
          <button
            onClick={() => toggleSave(post.id)}
            className={[
              "rounded-full px-3 py-1.5 text-sm border transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1",
              post.saved
                ? "bg-emerald-100 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                : "bg-neutral-100 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10",
            ].join(" ")}
            aria-label={post.saved ? "Unsave post" : "Save post"}
          >
            <Bookmark className="w-4 h-4" fill={post.saved ? "currentColor" : "none"} aria-hidden="true" />
            <span>{post.saved ? "Saved" : "Save"}</span>
          </button>

          {/* Share button - copy link to clipboard */}
          <button
            onClick={() => {
              const postUrl = `${window.location.origin}/posts/${post.id}`;
              navigator.clipboard.writeText(postUrl).then(() => {
                toast.success("Link copied to clipboard!");
              }).catch(() => {
                toast.error("Failed to copy link");
              });
            }}
            className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1"
            aria-label="Share post"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            <span>Share</span>
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
