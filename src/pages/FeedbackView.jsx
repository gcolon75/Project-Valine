// src/pages/FeedbackView.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Loader2, Trash2, ChevronLeft, ChevronRight, Highlighter, MessageCircle, FileText, User } from 'lucide-react';
import { getFeedbackRequest, createAnnotation, deleteAnnotation } from '../services/feedbackService';
import { getMediaAccessUrl } from '../services/mediaService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function FeedbackView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const [scale, setScale] = useState(1.5);

  // Annotation state
  const [annotations, setAnnotations] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRects, setSelectionRects] = useState([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [annotationType, setAnnotationType] = useState('HIGHLIGHT');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);

  // Determine if user can create annotations
  const isRequester = feedbackRequest?.requesterId === user?.id;
  const isOwner = feedbackRequest?.ownerId === user?.id;
  const canAnnotate = isRequester && feedbackRequest?.status === 'approved';

  // Fetch feedback request data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getFeedbackRequest(id);
        setFeedbackRequest(data);
        setAnnotations(data.annotations || []);

        // Fetch PDF URL if media is attached
        if (data.post?.mediaAttached?.id || data.post?.mediaId) {
          const mediaId = data.post?.mediaAttached?.id || data.post?.mediaId;
          const { viewUrl } = await getMediaAccessUrl(mediaId);
          setPdfUrl(viewUrl);
        }
      } catch (err) {
        console.error('Failed to fetch feedback request:', err);
        toast.error('Failed to load feedback session');
        navigate('/profile?tab=feedback');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      if (!pdfUrl) return;

      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        toast.error('Failed to load PDF document');
      }
    };

    loadPdf();
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;

      setPageRendering(true);
      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Render text layer for selection
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          const textContent = await page.getTextContent();

          // Create text layer
          const textItems = textContent.items;
          textItems.forEach((item) => {
            const div = document.createElement('span');
            div.textContent = item.str;
            div.style.position = 'absolute';
            div.style.left = `${item.transform[4] * scale}px`;
            div.style.top = `${viewport.height - (item.transform[5] * scale) - (item.height * scale)}px`;
            div.style.fontSize = `${item.height * scale}px`;
            div.style.fontFamily = item.fontName || 'sans-serif';
            div.style.color = 'transparent';
            div.style.cursor = 'text';
            textLayerRef.current.appendChild(div);
          });
        }
      } catch (err) {
        console.error('Failed to render page:', err);
      } finally {
        setPageRendering(false);
      }
    };

    renderPage();
  }, [pdfDocument, currentPage, scale]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (!canAnnotate) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      setSelectedText(text);

      // Get selection rectangles
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects()).map(rect => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        return {
          x: rect.left - (containerRect?.left || 0),
          y: rect.top - (containerRect?.top || 0),
          width: rect.width,
          height: rect.height,
        };
      });

      setSelectionRects(rects);
      setAnnotationType('HIGHLIGHT');
      setShowCommentInput(true);
    }
  }, [canAnnotate]);

  // Handle page click for page comments
  const handleCanvasClick = useCallback((e) => {
    if (!canAnnotate || selectedText) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionRects([{ x, y, width: 20, height: 20 }]);
    setAnnotationType('PAGE_COMMENT');
    setShowCommentInput(true);
    setSelectedText('');
  }, [canAnnotate, selectedText]);

  // Submit annotation
  const handleSubmitAnnotation = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const annotationData = {
        type: annotationType,
        pageNumber: currentPage,
        content: commentText.trim(),
        highlightedText: selectedText || null,
        selectionData: selectionRects.length > 0 ? { rects: selectionRects } : null,
        positionX: selectionRects[0]?.x || null,
        positionY: selectionRects[0]?.y || null,
      };

      const newAnnotation = await createAnnotation(id, annotationData);
      setAnnotations(prev => [...prev, newAnnotation]);

      // Reset state
      setCommentText('');
      setSelectedText('');
      setSelectionRects([]);
      setShowCommentInput(false);
      window.getSelection()?.removeAllRanges();

      toast.success('Annotation added');
    } catch (err) {
      console.error('Failed to create annotation:', err);
      toast.error('Failed to add annotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await deleteAnnotation(annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      setSelectedAnnotation(null);
      toast.success('Annotation deleted');
    } catch (err) {
      console.error('Failed to delete annotation:', err);
      toast.error('Failed to delete annotation');
    }
  };

  // Cancel annotation
  const handleCancelAnnotation = () => {
    setCommentText('');
    setSelectedText('');
    setSelectionRects([]);
    setShowCommentInput(false);
    window.getSelection()?.removeAllRanges();
  };

  // Get annotations for current page
  const pageAnnotations = annotations.filter(a => a.pageNumber === currentPage);
  const generalAnnotations = annotations.filter(a => a.type === 'GENERAL_COMMENT');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0CCE6B]" />
      </div>
    );
  }

  if (!feedbackRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Feedback session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/profile?tab=feedback"
              className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Feedback</span>
            </Link>
            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
            <h1 className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs">
              {feedbackRequest.post?.title || 'PDF Feedback'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || pageRendering}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || pageRendering}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto p-4">
          <div
            ref={containerRef}
            className="relative mx-auto bg-white dark:bg-neutral-800 shadow-lg"
            style={{ width: 'fit-content' }}
            onMouseUp={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="block"
            />

            {/* Text layer for selection */}
            <div
              ref={textLayerRef}
              className="absolute top-0 left-0 overflow-hidden"
              style={{
                width: canvasRef.current?.width,
                height: canvasRef.current?.height,
                pointerEvents: canAnnotate ? 'auto' : 'none'
              }}
            />

            {/* Highlight overlays for current page */}
            {pageAnnotations.filter(a => a.type === 'HIGHLIGHT').map(annotation => (
              <div key={annotation.id}>
                {annotation.selectionData?.rects?.map((rect, i) => (
                  <div
                    key={i}
                    className="absolute bg-yellow-300/40 cursor-pointer hover:bg-yellow-300/60 transition"
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                    }}
                    onClick={() => setSelectedAnnotation(annotation)}
                  />
                ))}
              </div>
            ))}

            {/* Page comment markers */}
            {pageAnnotations.filter(a => a.type === 'PAGE_COMMENT').map(annotation => (
              <div
                key={annotation.id}
                className="absolute w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-lg"
                style={{
                  left: (annotation.positionX || 0) - 12,
                  top: (annotation.positionY || 0) - 12,
                }}
                onClick={() => setSelectedAnnotation(annotation)}
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
            ))}

            {/* Selection highlight preview */}
            {showCommentInput && selectionRects.map((rect, i) => (
              <div
                key={i}
                className={`absolute ${annotationType === 'HIGHLIGHT' ? 'bg-yellow-300/60' : 'bg-purple-500/60'} pointer-events-none`}
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                }}
              />
            ))}
          </div>

          {/* Loading overlay */}
          {pageRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
              <Loader2 className="w-8 h-8 animate-spin text-[#0CCE6B]" />
            </div>
          )}
        </div>

        {/* Annotations Sidebar */}
        <div className="w-80 lg:w-96 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#0CCE6B]" />
              Annotations ({annotations.length})
            </h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              <img
                src={feedbackRequest.requester?.avatar || 'https://i.pravatar.cc/150?img=1'}
                alt=""
                className="w-5 h-5 rounded-full"
              />
              <span>{feedbackRequest.requester?.displayName || feedbackRequest.requester?.username}</span>
              <span className="text-neutral-400">giving feedback</span>
            </div>
          </div>

          {/* Comment Input (when adding annotation) */}
          {showCommentInput && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              {selectedText && (
                <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm">
                  <p className="text-xs text-neutral-500 mb-1">Selected text:</p>
                  <p className="text-neutral-700 dark:text-neutral-300 italic">"{selectedText}"</p>
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your comment..."
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={handleCancelAnnotation}
                  className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAnnotation}
                  disabled={!commentText.trim() || submitting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#0CCE6B] text-white rounded-lg hover:bg-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Add Comment
                </button>
              </div>
            </div>
          )}

          {/* Instructions for annotating */}
          {canAnnotate && !showCommentInput && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-purple-50 dark:bg-purple-900/20">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <Highlighter className="w-4 h-4 inline mr-1" />
                Select text to highlight, or click on the page to add a comment.
              </p>
            </div>
          )}

          {/* Annotations List */}
          <div className="flex-1 overflow-y-auto">
            {/* Page annotations */}
            {pageAnnotations.length > 0 && (
              <div className="p-4">
                <h3 className="text-xs font-medium text-neutral-500 uppercase mb-3">
                  Page {currentPage}
                </h3>
                <div className="space-y-3">
                  {pageAnnotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className={`p-3 rounded-lg border transition cursor-pointer ${
                        selectedAnnotation?.id === annotation.id
                          ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                      onClick={() => setSelectedAnnotation(annotation)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={annotation.author?.avatar || 'https://i.pravatar.cc/150?img=1'}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {annotation.author?.displayName || annotation.author?.username}
                          </span>
                        </div>
                        {annotation.authorId === user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(annotation.id);
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {annotation.highlightedText && (
                        <p className="text-xs text-neutral-500 italic mt-2 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                          "{annotation.highlightedText}"
                        </p>
                      )}
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2">
                        {annotation.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General comments */}
            {generalAnnotations.length > 0 && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-xs font-medium text-neutral-500 uppercase mb-3">
                  General Comments
                </h3>
                <div className="space-y-3">
                  {generalAnnotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={annotation.author?.avatar || 'https://i.pravatar.cc/150?img=1'}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {annotation.author?.displayName || annotation.author?.username}
                          </span>
                        </div>
                        {annotation.authorId === user?.id && (
                          <button
                            onClick={() => handleDeleteAnnotation(annotation.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2">
                        {annotation.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {annotations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-center">No annotations yet</p>
                {canAnnotate && (
                  <p className="text-sm text-center mt-2">
                    Select text or click on the page to add feedback
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Add General Comment Button */}
          {canAnnotate && !showCommentInput && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => {
                  setAnnotationType('GENERAL_COMMENT');
                  setShowCommentInput(true);
                  setSelectionRects([]);
                  setSelectedText('');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-400 hover:border-[#0CCE6B] hover:text-[#0CCE6B] transition"
              >
                <MessageSquare className="w-4 h-4" />
                Add General Comment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
