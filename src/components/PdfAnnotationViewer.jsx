import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Loader2, Trash2,
  ChevronLeft, ChevronRight, Highlighter, MessageCircle, FileText, CheckSquare,
  ThumbsUp, HelpCircle, ThumbsDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Sentiment helpers
const SENTIMENTS = [
  { key: 'good',        label: 'Good',        bg: 'bg-emerald-500 hover:bg-emerald-600', Icon: ThumbsUp },
  { key: 'questioning', label: 'Questioning',  bg: 'bg-amber-500 hover:bg-amber-600',    Icon: HelpCircle },
  { key: 'not_sure',    label: 'Not Sure',     bg: 'bg-red-500 hover:bg-red-600',        Icon: ThumbsDown },
];

function highlightClass(sentiment, selected) {
  if (sentiment === 'good')        return selected ? 'bg-emerald-400/50 ring-2 ring-emerald-500 ring-offset-1' : 'bg-emerald-300/30 hover:bg-emerald-400/40';
  if (sentiment === 'questioning') return selected ? 'bg-amber-400/50 ring-2 ring-amber-500 ring-offset-1'   : 'bg-amber-300/30 hover:bg-amber-400/40';
  if (sentiment === 'not_sure')    return selected ? 'bg-red-400/50 ring-2 ring-red-500 ring-offset-1'       : 'bg-red-300/30 hover:bg-red-400/40';
  return selected ? 'bg-amber-400/50 ring-2 ring-amber-500 ring-offset-1' : 'bg-amber-300/30 hover:bg-amber-400/40';
}

function markerClass(sentiment, selected) {
  if (sentiment === 'good')        return selected ? 'bg-emerald-600 scale-125 ring-2 ring-emerald-400 ring-offset-2' : 'bg-emerald-500 hover:scale-110 hover:bg-emerald-600';
  if (sentiment === 'questioning') return selected ? 'bg-amber-600 scale-125 ring-2 ring-amber-400 ring-offset-2'   : 'bg-amber-500 hover:scale-110 hover:bg-amber-600';
  if (sentiment === 'not_sure')    return selected ? 'bg-red-600 scale-125 ring-2 ring-red-400 ring-offset-2'       : 'bg-red-500 hover:scale-110 hover:bg-red-600';
  return selected ? 'bg-purple-600 scale-125 ring-2 ring-purple-400 ring-offset-2' : 'bg-purple-500 hover:scale-110 hover:bg-purple-600';
}

function sentimentBadge(sentiment) {
  if (sentiment === 'good')        return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Good</span>;
  if (sentiment === 'questioning') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Questioning</span>;
  if (sentiment === 'not_sure')    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Not Sure</span>;
  return null;
}

/**
 * Full-screen PDF viewer with inline annotation support.
 *
 * Props:
 *   pdfUrl            string   — S3/pre-signed URL for the PDF
 *   annotations       array    — initial annotation objects (managed by parent)
 *   onAnnotationsChange fn     — called with the updated array after create/delete
 *   onCreateAnnotation  async fn(data) => annotation  — parent supplies the API call
 *   onDeleteAnnotation  async fn(annotationId) => void
 *   canAnnotate       boolean  — show annotation tools (false = read-only)
 *   annotatorUser     object   — { displayName, username, avatar } shown in sidebar
 *   currentUserId     string   — used to show delete button only on own annotations
 *   title             string   — shown in the sticky header
 *   backTo            string   — href for the back arrow
 *   backLabel         string   — label for the back arrow (default "Back")
 */
export default function PdfAnnotationViewer({
  pdfUrl,
  annotations: initialAnnotations = [],
  onCreateAnnotation,
  onDeleteAnnotation,
  canAnnotate = false,
  annotatorUser = null,
  currentUserId,
  title = 'PDF Viewer',
  backTo = '/',
  backLabel = 'Back',
  onFinishFeedback = null,
}) {
  const [annotations, setAnnotations] = useState(initialAnnotations);

  // Keep local state in sync when parent passes updated annotations
  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const [scale] = useState(1.5);

  const [selectedText, setSelectedText] = useState('');
  const [selectionRects, setSelectionRects] = useState([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [annotationType, setAnnotationType] = useState('HIGHLIGHT');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [liveSelectionRects, setLiveSelectionRects] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pageComment, setPageComment] = useState('');
  const [submittingPageComment, setSubmittingPageComment] = useState(false);

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelectedText('');
    setSelectionRects([]);
    setLiveSelectionRects([]);
    setIsSelecting(false);
    setShowCommentInput(false);
    setCommentText('');
  }, []);

  useEffect(() => () => { window.getSelection()?.removeAllRanges(); }, []);
  useEffect(() => { clearSelection(); }, [currentPage, clearSelection]);

  // Load PDF
  useEffect(() => {
    if (!pdfUrl) return;
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error('PDF load error', err);
        toast.error('Failed to load PDF document');
      }
    })();
  }, [pdfUrl]);

  // Render page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      setPageRendering(true);
      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (textLayerRef.current && !cancelled) {
          textLayerRef.current.innerHTML = '';
          const { items } = await page.getTextContent();
          items.forEach((item) => {
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.cssText = [
              `position:absolute`,
              `left:${item.transform[4] * scale}px`,
              `top:${viewport.height - item.transform[5] * scale - item.height * scale}px`,
              `font-size:${item.height * scale}px`,
              `font-family:${item.fontName || 'sans-serif'}`,
              `color:transparent`,
              `cursor:text`,
            ].join(';');
            textLayerRef.current.appendChild(span);
          });
        }
      } catch (err) {
        if (!cancelled) console.error('Page render error', err);
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDocument, currentPage, scale]);

  const getSelectionRects = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) return [];
    const range = sel.getRangeAt(0);
    const base = containerRef.current?.getBoundingClientRect();
    return Array.from(range.getClientRects()).map(r => ({
      x: r.left - (base?.left || 0),
      y: r.top - (base?.top || 0),
      width: r.width,
      height: r.height,
    }));
  }, []);

  useEffect(() => {
    if (!canAnnotate) return;
    const onSelChange = () => {
      if (!isSelecting) return;
      setLiveSelectionRects(getSelectionRects());
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, [canAnnotate, isSelecting, getSelectionRects]);

  const handleMouseDown = useCallback(() => {
    if (!canAnnotate) return;
    setIsSelecting(true);
    setLiveSelectionRects([]);
  }, [canAnnotate]);

  const handleMouseUp = useCallback(() => {
    if (!canAnnotate) return;
    setIsSelecting(false);
    const text = window.getSelection()?.toString().trim();
    if (text) {
      setSelectedText(text);
      setSelectionRects(getSelectionRects());
      setLiveSelectionRects([]);
      setAnnotationType('HIGHLIGHT');
      setShowCommentInput(true);
    } else {
      setLiveSelectionRects([]);
    }
  }, [canAnnotate, getSelectionRects]);

  const handleCanvasClick = useCallback((e) => {
    if (!canAnnotate || selectedText) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectionRects([{ x: e.clientX - rect.left, y: e.clientY - rect.top, width: 20, height: 20 }]);
    setAnnotationType('PAGE_COMMENT');
    setShowCommentInput(true);
    setSelectedText('');
  }, [canAnnotate, selectedText]);

  // sentiment: 'good' | 'questioning' | 'not_sure'
  const handleSubmitAnnotation = async (sentiment) => {
    if (!commentText.trim()) { toast.error('Please enter a comment'); return; }
    setSubmitting(true);
    try {
      const data = {
        type: annotationType,
        pageNumber: currentPage,
        content: commentText.trim(),
        highlightedText: selectedText || null,
        selectionData: selectionRects.length ? { rects: selectionRects } : null,
        positionX: selectionRects[0]?.x ?? null,
        positionY: selectionRects[0]?.y ?? null,
        sentiment: sentiment || null,
      };
      const newAnnotation = await onCreateAnnotation(data);
      setAnnotations(prev => [...prev, newAnnotation]);
      clearSelection();
      toast.success('Annotation added');
    } catch {
      toast.error('Failed to add annotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    try {
      await onDeleteAnnotation(annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      setSelectedAnnotation(null);
      toast.success('Annotation deleted');
    } catch {
      toast.error('Failed to delete annotation');
    }
  };

  // sentiment: 'good' | 'questioning' | 'not_sure'
  const handleSubmitPageComment = async (sentiment) => {
    if (!pageComment.trim()) return;
    setSubmittingPageComment(true);
    try {
      const data = {
        type: 'PAGE_FEEDBACK',
        pageNumber: currentPage,
        content: pageComment.trim(),
        highlightedText: null,
        selectionData: null,
        positionX: null,
        positionY: null,
        sentiment: sentiment || null,
      };
      const newAnnotation = await onCreateAnnotation(data);
      setAnnotations(prev => [...prev, newAnnotation]);
      setPageComment('');
      toast.success('Page feedback added');
    } catch {
      toast.error('Failed to add page feedback');
    } finally {
      setSubmittingPageComment(false);
    }
  };

  const pageAnnotations = annotations.filter(a => a.pageNumber === currentPage && a.type !== 'GENERAL_COMMENT');
  const generalAnnotations = annotations.filter(a => a.type === 'GENERAL_COMMENT');

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={backTo}
              className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
            <h1 className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
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

            {canAnnotate && onFinishFeedback && (() => {
              const coveredPages = new Set(
                annotations.filter(a => a.pageNumber != null).map(a => a.pageNumber)
              );
              const allPagesCovered = totalPages > 0 && coveredPages.size >= totalPages;
              return (
                <button
                  onClick={onFinishFeedback}
                  disabled={!allPagesCovered}
                  title={
                    allPagesCovered
                      ? 'Submit your final thoughts'
                      : `${coveredPages.size} / ${totalPages} pages covered — annotate every page to finish`
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    allPagesCovered
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {allPagesCovered ? 'Finish Feedback' : `${coveredPages.size}/${totalPages} pages`}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* PDF canvas */}
        <div className="flex-1 overflow-auto p-4 relative">
          <div
            ref={containerRef}
            className="relative mx-auto bg-white dark:bg-neutral-800 shadow-lg"
            style={{ width: 'fit-content' }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <canvas ref={canvasRef} onClick={handleCanvasClick} className="block" />

            {/* Text layer */}
            <div
              ref={textLayerRef}
              data-feedback-text-layer
              className="absolute top-0 left-0 overflow-hidden"
              style={{
                width: canvasRef.current?.width,
                height: canvasRef.current?.height,
                pointerEvents: canAnnotate ? 'auto' : 'none',
              }}
            />
            <style>{`
              [data-feedback-text-layer]::selection,
              [data-feedback-text-layer] *::selection {
                background: transparent !important;
                color: transparent !important;
              }
            `}</style>

            {/* Committed highlight overlays */}
            {pageAnnotations.filter(a => a.type === 'HIGHLIGHT').map(ann => (
              <div key={ann.id}>
                {ann.selectionData?.rects?.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedAnnotation(ann)}
                    className={`absolute cursor-pointer rounded-sm transition-all duration-200 ${
                      highlightClass(ann.sentiment, selectedAnnotation?.id === ann.id)
                    }`}
                    style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
                  />
                ))}
              </div>
            ))}

            {/* Page-comment markers */}
            {pageAnnotations.filter(a => a.type === 'PAGE_COMMENT').map(ann => (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnotation(ann)}
                className={`absolute w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all duration-200 ${
                  markerClass(ann.sentiment, selectedAnnotation?.id === ann.id)
                }`}
                style={{ left: (ann.positionX || 0) - 14, top: (ann.positionY || 0) - 14 }}
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
            ))}

            {/* Live selection */}
            {isSelecting && liveSelectionRects.map((r, i) => (
              <div
                key={`live-${i}`}
                className="absolute pointer-events-none rounded-sm bg-amber-400/40"
                style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
              />
            ))}

            {/* Preview after selection */}
            {showCommentInput && !isSelecting && selectionRects.map((r, i) => (
              <div
                key={i}
                className={`absolute pointer-events-none rounded-sm ${
                  annotationType === 'HIGHLIGHT'
                    ? 'bg-amber-400/50 ring-2 ring-amber-500'
                    : 'bg-purple-500/50 ring-2 ring-purple-600'
                }`}
                style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
              />
            ))}
          </div>

          {pageRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
              <Loader2 className="w-8 h-8 animate-spin text-[#0CCE6B]" />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 lg:w-96 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
          {/* Sidebar header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#0CCE6B]" />
              Annotations ({annotations.length})
            </h2>
            {annotatorUser && (
              <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {annotatorUser.avatar ? (
                  <img src={annotatorUser.avatar} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-semibold">
                    {(annotatorUser.displayName || annotatorUser.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{annotatorUser.displayName || annotatorUser.username}</span>
                <span className="text-neutral-400">giving feedback</span>
              </div>
            )}
          </div>

          {/* New annotation input */}
          {showCommentInput && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              {selectedText && (
                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-400 rounded-r">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Selected text:</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">"{selectedText}"</p>
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your comment…"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                rows={3}
                autoFocus
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 mb-2">
                Choose a sentiment to submit:
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition mr-1"
                >
                  Cancel
                </button>
                {SENTIMENTS.map(({ key, label, bg, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleSubmitAnnotation(key)}
                    disabled={!commentText.trim() || submitting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition ${bg}`}
                  >
                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {canAnnotate && !showCommentInput && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-emerald-50/50 via-amber-50/50 to-red-50/50 dark:from-emerald-900/10 dark:via-amber-900/10 dark:to-red-900/10">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">How to give feedback:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Highlighter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium text-amber-600 dark:text-amber-400">Highlight text:</span> Drag to select
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium text-purple-600 dark:text-purple-400">Page comment:</span> Click on page
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0CCE6B]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-[#0CCE6B]" />
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    <span className="font-medium text-[#0CCE6B]">Page feedback:</span> Use box below
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Good</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Questioning</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Not Sure</span>
                  <span className="text-xs text-neutral-500">= sentiment</span>
                </div>
              </div>
            </div>
          )}

          {/* Per-page feedback box */}
          {canAnnotate && !showCommentInput && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Page {currentPage} Feedback
              </label>
              <textarea
                value={pageComment}
                onChange={(e) => setPageComment(e.target.value)}
                placeholder={`Share your thoughts on page ${currentPage}…`}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white resize-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent text-sm"
                rows={3}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 mb-1">
                Choose a sentiment to submit:
              </p>
              <div className="flex gap-1 flex-wrap">
                {SENTIMENTS.map(({ key, label, bg, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleSubmitPageComment(key)}
                    disabled={!pageComment.trim() || submittingPageComment}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition ${bg}`}
                  >
                    {submittingPageComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Annotations list */}
          <div className="flex-1 overflow-y-auto">
            {pageAnnotations.length > 0 && (
              <div className="p-4">
                <h3 className="text-xs font-medium text-neutral-500 uppercase mb-3">
                  Page {currentPage} Annotations
                </h3>
                <div className="space-y-3">
                  {pageAnnotations.map(ann => (
                    <AnnotationCard
                      key={ann.id}
                      annotation={ann}
                      selected={selectedAnnotation?.id === ann.id}
                      currentUserId={currentUserId}
                      onSelect={() => setSelectedAnnotation(ann)}
                      onDelete={handleDeleteAnnotation}
                    />
                  ))}
                </div>
              </div>
            )}

            {generalAnnotations.length > 0 && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="text-xs font-medium text-neutral-500 uppercase mb-3">General Comments</h3>
                <div className="space-y-3">
                  {generalAnnotations.map(ann => (
                    <AnnotationCard
                      key={ann.id}
                      annotation={ann}
                      selected={false}
                      currentUserId={currentUserId}
                      onSelect={() => {}}
                      onDelete={handleDeleteAnnotation}
                    />
                  ))}
                </div>
              </div>
            )}

            {annotations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-center">No annotations yet</p>
                {canAnnotate && (
                  <p className="text-sm text-center mt-2">Select text or click on the page to add feedback</p>
                )}
              </div>
            )}
          </div>

          {/* General comment button */}
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

function AnnotationCard({ annotation, selected, currentUserId, onSelect, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border transition cursor-pointer ${
        selected
          ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AnnotationTypeIcon type={annotation.type} sentiment={annotation.sentiment} />
          {annotation.author?.avatar ? (
            <img src={annotation.author.avatar} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-semibold">
              {(annotation.author?.displayName || annotation.author?.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-neutral-900 dark:text-white">
            {annotation.author?.displayName || annotation.author?.username}
          </span>
          {sentimentBadge(annotation.sentiment)}
        </div>
        {annotation.authorId === currentUserId && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
            className="p-1 text-neutral-400 hover:text-red-500 transition flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {annotation.highlightedText && (
        <div className="mt-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-400 rounded-r text-xs text-neutral-600 dark:text-neutral-400 italic">
          "{annotation.highlightedText}"
        </div>
      )}
      {annotation.type === 'PAGE_FEEDBACK' && (
        <div className="mt-1 text-xs text-[#0CCE6B] font-medium">
          Page {annotation.pageNumber} Feedback
        </div>
      )}
      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2">{annotation.content}</p>
    </div>
  );
}

function AnnotationTypeIcon({ type, sentiment }) {
  if (type === 'HIGHLIGHT') {
    const bg = sentiment === 'good' ? 'bg-emerald-100 dark:bg-emerald-900/30' : sentiment === 'questioning' ? 'bg-amber-100 dark:bg-amber-900/30' : sentiment === 'not_sure' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30';
    const color = sentiment === 'good' ? 'text-emerald-600 dark:text-emerald-400' : sentiment === 'questioning' ? 'text-amber-600 dark:text-amber-400' : sentiment === 'not_sure' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bg}`}>
        <Highlighter className={`w-3.5 h-3.5 ${color}`} />
      </div>
    );
  }
  if (type === 'PAGE_COMMENT') {
    const bg = sentiment === 'good' ? 'bg-emerald-100 dark:bg-emerald-900/30' : sentiment === 'questioning' ? 'bg-amber-100 dark:bg-amber-900/30' : sentiment === 'not_sure' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-purple-100 dark:bg-purple-900/30';
    const color = sentiment === 'good' ? 'text-emerald-600 dark:text-emerald-400' : sentiment === 'questioning' ? 'text-amber-600 dark:text-amber-400' : sentiment === 'not_sure' ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400';
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bg}`}>
        <MessageCircle className={`w-3.5 h-3.5 ${color}`} />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-[#0CCE6B]/20 flex items-center justify-center">
      <FileText className="w-3.5 h-3.5 text-[#0CCE6B]" />
    </div>
  );
}
