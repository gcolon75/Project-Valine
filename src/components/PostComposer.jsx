// src/components/PostComposer.jsx
import { useState, useRef, useEffect } from "react";
import { Send, X, Upload, FileText, Video, Image, File } from "lucide-react";
import toast from "react-hot-toast";
import { useFeed } from "../context/FeedContext";
import { useAuth } from "../context/AuthContext";
import { uploadMedia } from "../services/mediaService";
import { getMyProfile } from "../services/profileService";

export default function PostComposer() {
  const { createPost } = useFeed();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visibility, setVisibility] = useState("PUBLIC");
  const [profileId, setProfileId] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch profile ID for media uploads
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id && !profileId) {
        try {
          const profile = await getMyProfile();
          if (profile?.id) {
            setProfileId(profile.id);
          }
        } catch (error) {
          console.warn('Failed to fetch profile for media upload:', error);
          // Will fall back to user.id if profile fetch fails
        }
      }
    };
    fetchProfile();
  }, [user?.id, profileId]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const withHash = t.startsWith("#") ? t : `#${t}`;
    if (!tags.includes(withHash)) setTags([...tags, withHash]);
    setTagInput("");
  };

  const removeTag = (t) => setTags(tags.filter((x) => x !== t));

  // Determine media type from file
  const getMediaType = (file) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "application/pdf") return "pdf";
    return "document";
  };

  // Get file type icon
  const getFileIcon = (file) => {
    if (!file) return File;
    if (file.type.startsWith("image/")) return Image;
    if (file.type.startsWith("video/")) return Video;
    if (file.type === "application/pdf") return FileText;
    return File;
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (500MB for video, 10MB for images/docs)
    const maxSize = file.type.startsWith("video/") ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith("video/") ? 500 : 10;
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please add a title to your post");
      return;
    }

    try {
      let mediaId = null;

      // Upload file if selected
      if (selectedFile && user?.id) {
        setUploading(true);
        setUploadProgress(0);
        
        try {
          // Use profile.id if available, otherwise fall back to user.id
          // Backend will auto-create profile if it doesn't exist
          const targetProfileId = profileId || user.id;
          const mediaResult = await uploadMedia(
            targetProfileId,
            selectedFile,
            getMediaType(selectedFile),
            {
              title: title.trim(),
              privacy: visibility,
              onProgress: setUploadProgress
            }
          );
          mediaId = mediaResult?.id;
        } catch (uploadError) {
          console.error("Upload failed:", uploadError);
          toast.error(uploadError.message || "Failed to upload file. Please try again.");
          setUploading(false);
          return;
        }
      }

      createPost({ 
        title: title.trim(), 
        body: body.trim(), 
        tags,
        mediaId,
        visibility
      });
      toast.success("Post created successfully!");
      setTitle(""); 
      setBody(""); 
      setTags([]); 
      setTagInput("");
      removeFile();
      setVisibility("PUBLIC");
    } catch (error) {
      toast.error("Failed to create post. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const FileIcon = getFileIcon(selectedFile);

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4 md:p-5"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent text-base md:text-lg font-semibold text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
        placeholder="Share a script, audition, or reel..."
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="mt-2 w-full bg-transparent text-sm text-neutral-700 dark:text-neutral-300 outline-none placeholder:text-neutral-500"
        placeholder="Add a short description (optional)"
      />
      
      {/* Tags section */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => removeTag(t)}
            className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            title="Remove tag"
          >
            {t}
            <X className="w-3 h-3" />
          </button>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addTag()) : null}
          className="bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-full px-3 py-1 text-xs text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
          placeholder="Add tag"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-full border border-neutral-300 dark:border-white/15 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
        >
          Add tag
        </button>
      </div>

      {/* File upload section */}
      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Attach File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          id="post-file-upload"
        />
        <label
          htmlFor="post-file-upload"
          className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/5 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
        >
          <Upload className="w-5 h-5" />
          <span>Click to upload image, video, or PDF</span>
        </label>
        
        {/* File preview */}
        {selectedFile && (
          <div className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-12 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                <FileIcon className="w-6 h-6 text-neutral-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-neutral-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Remove file"
            >
              <X className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
              <div 
                className="bg-brand h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Visibility selector */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Visibility
        </label>
        <div className="flex gap-2">
          {[
            { value: "PUBLIC", label: "Public", description: "Anyone can view" },
            { value: "FOLLOWERS", label: "Followers Only", description: "Only your followers can view" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                visibility === option.value
                  ? "bg-brand text-white"
                  : "bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-white/10 hover:bg-neutral-200 dark:hover:bg-white/10"
              }`}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>{uploading ? "Uploading..." : "Post"}</span>
        </button>
      </div>
    </form>
  );
}
