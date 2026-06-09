// src/components/PostCard.jsx
import { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Download, Lock, Eye, MoreVertical, Trash2, MessageSquare, Share2, FileText, Mic, Film, Camera, Megaphone } from "lucide-react";
import UserAvatar from './UserAvatar';
import { parseVideoEmbed } from "../utils/videoEmbed";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useFeed } from "../context/FeedContext";
import { useAuth } from "../context/AuthContext";
import CommentList from "./CommentList";
import ConfirmationModal from "./ConfirmationModal";
import EmeraldBadge from "./EmeraldBadge";
import { getMediaAccessUrl, requestMediaAccess, getWatermarkedPdf, uploadPdfPoster } from "../services/mediaService";
import { generatePdfThumbnailBase64 } from "../utils/pdfThumbnailGenerator";
import { deletePost } from "../services/postService";
import { createThread } from "../services/messagesService";

function renderBody(text) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <Link key={i} to={`/profile/${part.slice(1)}`} className="text-[#0CCE6B] hover:underline">{part}</Link>
      : <span key={i}>{part}</span>
  );
}

const CONTENT_TYPE_LABELS = {
  script:       { label: 'Script',       Icon: FileText  },
  audition:     { label: 'Audition',     Icon: Mic       },
  reel:         { label: 'Film / Reel',  Icon: Film      },
  audio:        { label: 'Audio',        Icon: Mic       },
  headshots:    { label: 'Headshots',    Icon: Camera    },
  casting_call: { label: 'Casting Call', Icon: Megaphone },
};

export default function PostCard({ post, onDelete, onLike }) {
  const { likePost: contextLikePost, toggleSave } = useFeed();
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
  const [localPosterUrl, setLocalPosterUrl] = useState(null);

  const handleCommentAdded = () => {
    setCommentCount((prev) => prev + 1);
  };

  const myId = user?.userId || user?.id;
  const isAuthor = !!myId && (
    myId === post.author?.id ||
    myId === post.authorId ||
    myId === post.userId ||
    myId === post.ownerId
  );

  const isGated = post.mediaId && (post.visibility === "on-request" || post.visibility === "private");

  const isPdf = post.mediaAttachment?.type === 'pdf' ||
                post.mediaAttachment?.s3Key?.endsWith('.pdf');
  const isDoc = post.mediaAttachment?.type === 'document' ||
                post.mediaAttachment?.s3Key?.endsWith('.doc') ||
                post.mediaAttachment?.s3Key?.endsWith('.docx');
  const isDocument = isPdf || isDoc;

  const isAudio = post.audioUrl ||
                  post.mediaAttachment?.type === 'audio' ||
                  post.mediaAttachment?.s3Key?.endsWith('.mp3') ||
                  post.mediaAttachment?.s3Key?.endsWith('.wav') ||
                  post.mediaAttachment?.s3Key?.endsWith('.m4a') ||
                  post.mediaAttachment?.s3Key?.endsWith('.ogg') ||
                  post.mediaAttachment?.s3Key?.endsWith('.aac');

  const isVideo = post.mediaAttachment?.type === 'video' ||
                  post.mediaAttachment?.s3Key?.endsWith('.mp4') ||
                  post.mediaAttachment?.s3Key?.endsWith('.mov') ||
                  post.mediaAttachment?.s3Key?.endsWith('.webm');

  const embedInfo = parseVideoEmbed(post.media?.[0]);

  const posterUrl = localPosterUrl || post.mediaAttachment?.posterUrl;
  const imageUrl = posterUrl || post.mediaUrl || post.imageUrl;
  const videoUrl = post.mediaAttachment?.url || post.mediaUrl;

  const mediaId = post.mediaId || post.mediaAttachment?.id;
  useEffect(() => {
    if (!isPdf || post.mediaAttachment?.posterUrl || localPosterUrl || !isAuthor || !mediaId) return;
    let cancelled = false;

    const fix = async () => {
      try {
        const { viewUrl } = await getMediaAccessUrl(mediaId);
        if (cancelled || !viewUrl) return;
        const base64 = await generatePdfThumbnailBase64(viewUrl);
        if (cancelled) return;
        const { posterUrl: newUrl } = await uploadPdfPoster(mediaId, base64);
        if (!cancelled) setLocalPosterUrl(newUrl);
      } catch (err) {
        console.warn('PDF auto-thumbnail failed (non-fatal):', err);
      }
    };

    fix();
    return () => { cancelled = true; };
  }, [mediaId, isAuthor, isPdf]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDownload = async () => {
    if (!post.mediaId) {
      toast.error("No media available for download");
      return;
    }
    setDownloading(true);
    try {
      if (isPdf) {
        const pdfBlob = await getWatermarkedPdf(post.mediaId);
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
        const response = await getMediaAccessUrl(post.mediaId, user?.id);
        const downloadUrl = response.viewUrl || response.downloadUrl;
        if (!downloadUrl) throw new Error('No download URL available');
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

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
      toast.success("Post deleted successfully");
      setShowDeleteConfirm(false);
      if (onDelete) onDelete(post.id);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(error.response?.data?.message || "Failed to delete post. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleShareViaDM = async () => {
    if (!user?.id) {
      toast.error("Please log in to share via DM");
      return;
    }
    setSharingViaDM(true);
    setShowMenu(false);
    try {
      const authorId = post.author?.id || post.authorId;
      if (!authorId) throw new Error("Post author not found");
      const threadData = await createThread(authorId);
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
      <article className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/40 overflow-hidden transition-shadow duration-200 hover:shadow-md animate-slide-up relative">

        {/* Author row */}
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <Link to={`/profile/${post.author.role}`} className="shrink-0 mt-0.5">
            <UserAvatar
              src={post.author.avatar}
              name={post.author.name || post.author.displayName || post.author.username}
              alt={post.author.name}
              className="h-9 w-9"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/profile/${post.author.role}`}
              className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span className="font-semibold text-neutral-900 dark:text-white text-sm leading-tight">
                {post.author.name}
              </span>
              <EmeraldBadge user={post.author} />
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500 mt-0.5 flex-wrap">
              {post.author.role && (
                <Link
                  to={`/profile/${post.author.role}`}
                  className="text-[#0CCE6B] hover:text-[#0BBE60] transition-colors"
                >
                  @{post.author.role}
                </Link>
              )}
              <span aria-hidden="true">·</span>
              <span>{timeAgo(post.createdAt)}</span>
              {isGated && <Lock className="w-3 h-3" aria-label="Gated content" />}
              {post.price !== undefined && post.price !== null && (() => {
                const priceValue = parseFloat(post.price);
                return (
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                    priceValue > 0
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-[#0CCE6B]/10 text-[#0CCE6B] border border-[#0CCE6B]/20'
                  }`}>
                    {priceValue > 0 ? `$${priceValue.toFixed(2)}` : 'Free'}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* 3-dot menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              aria-label="Post options"
            >
              <MoreVertical className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1">
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
                  {isAuthor && (
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
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

        {/* Title */}
        {post.title && (
          <div className="px-5 pb-2">
            <h2
              className="text-base font-bold text-neutral-900 cursor-pointer hover:text-[#0CCE6B] transition-colors leading-snug"
              onClick={() => navigate(`/posts/${post.id}`)}
            >
              {post.title}
            </h2>
          </div>
        )}

        {/* Body */}
        <div className="px-5 pb-3">
          <div
            className="cursor-pointer"
            onClick={() => navigate(`/posts/${post.id}`)}
          >
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {renderBody(post.body)}
            </p>
          </div>
        </div>

        {/* Media */}
        <div
          className="aspect-[16/10] bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden cursor-pointer"
          onClick={() => navigate(`/posts/${post.id}`)}
        >

          {isGated && !hasAccess ? (
            <div className="relative w-full h-full">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={post.title || "Post preview"}
                  className="w-full h-full object-cover blur-lg opacity-50"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/40">
                <Lock className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">
                  {post.visibility === "private" ? "Private Content" : "Access Required"}
                </span>
              </div>
            </div>
          ) : embedInfo ? (
            <iframe
              src={embedInfo.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={post.title || 'Embedded video'}
              onClick={(e) => e.stopPropagation()}
            />
          ) : isAudio ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-800 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Mic className="w-10 h-10 text-[#0CCE6B] mb-3" aria-hidden="true" />
              <audio controls className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <source src={post.audioUrl || post.mediaAttachment?.url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                {post.title || "Audio Post"}
              </span>
            </div>
          ) : isVideo && videoUrl ? (
            <video
              controls
              className="w-full h-full object-cover"
              onClick={(e) => e.stopPropagation()}
              poster={post.mediaAttachment?.posterUrl}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video element.
            </video>
          ) : isDocument ? (
            posterUrl ? (
              <img
                src={posterUrl}
                alt={post.title || "Document preview"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800';
                  fallback.innerHTML = '<span class="text-xs text-neutral-500">PDF Document</span>';
                  e.target.parentNode.replaceChild(fallback, e.target);
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                <FileText className="w-14 h-14 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">PDF Document</span>
              </div>
            )
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={post.title || "Post image"}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <span className="text-sm text-neutral-400 dark:text-neutral-500">No preview</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="px-5 pt-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded border border-neutral-200 dark:border-white/10 px-2 py-0.5 text-xs text-neutral-500 dark:text-neutral-400"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Actions — flat, no pill borders */}
        <div className="px-5 py-3 flex items-center gap-6 flex-wrap">
          <button
            onClick={() => likePost(post.id)}
            className={`flex items-center gap-2 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 ${
              post.isLiked
                ? 'text-red-500 dark:text-red-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
            aria-label={post.isLiked ? `Unlike post, ${post.likes || 0} likes` : `Like post, ${post.likes || 0} likes`}
          >
            <Heart className="w-5 h-5" fill={post.isLiked ? "currentColor" : "none"} aria-hidden="true" />
            <span>{post.likes || 0}</span>
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-2 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 ${
              open
                ? 'text-[#0CCE6B]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
            aria-label={`View comments, ${commentCount} comments`}
            aria-expanded={open}
          >
            <MessageCircle className="w-5 h-5" fill={open ? "currentColor" : "none"} aria-hidden="true" />
            <span>{commentCount}</span>
          </button>

          <button
            onClick={() => toggleSave(post.id)}
            className={`flex items-center gap-2 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 ${
              post.saved
                ? 'text-[#0CCE6B]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
            aria-label={post.saved ? "Unsave post" : "Save post"}
          >
            <Bookmark className="w-5 h-5" fill={post.saved ? "currentColor" : "none"} aria-hidden="true" />
            <span>{post.saved ? "Saved" : "Save"}</span>
          </button>

          <button
            onClick={() => {
              const postUrl = `${window.location.origin}/posts/${post.id}`;
              navigator.clipboard.writeText(postUrl)
                .then(() => toast.success("Link copied!"))
                .catch(() => toast.error("Failed to copy link"));
            }}
            className="flex items-center gap-2 text-base text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1"
            aria-label="Share post"
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
            <span>Share</span>
          </button>

          {/* Right side: access / download */}
          <div className="ml-auto">
            {isGated && !hasAccess ? (
              <button
                onClick={handleRequestAccess}
                disabled={accessRequested}
                className={`flex items-center gap-2 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 ${
                  accessRequested
                    ? 'text-neutral-400 cursor-not-allowed'
                    : 'text-[#0CCE6B] hover:text-[#0BBE60]'
                }`}
                aria-label={accessRequested ? "Access requested" : "Request access"}
              >
                {accessRequested ? (
                  <><Eye className="w-5 h-5" /><span>Requested</span></>
                ) : (
                  <><Lock className="w-5 h-5" /><span>Request Access</span></>
                )}
              </button>
            ) : post.allowDownload && (post.mediaId || post.mediaUrl) ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 text-base text-[#0CCE6B] hover:text-[#0BBE60] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1"
                aria-label="Download content"
              >
                <Download className="w-5 h-5" />
                <span>{downloading ? "Downloading..." : "Download"}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Comments */}
        {open && <CommentList postId={post.id} onCommentAdded={handleCommentAdded} />}
      </article>

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
