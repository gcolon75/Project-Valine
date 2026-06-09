import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Loader2, Trash2,
  ChevronLeft, ChevronRight, Highlighter, MessageCircle, FileText, CheckSquare,
  ThumbsUp, HelpCircle, ThumbsDown, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SENTIMENTS = [
  { key: 'good',        label: 'Good',        bg: 'bg-[#0CCE6B] hover:bg-[#0BBE60]',   Icon: ThumbsUp },
  { key: 'questioning', label: 'Questioning',  bg: 'bg-amber-500 hover:bg-amber-600',   Icon: HelpCircle },
  { key: 'not_sure',    label: 'Not Sure',     bg: 'bg-red-500 hover:bg-red-600',       Icon: ThumbsDown },
  { key: 'general',     label: 'General',      bg: 'bg-blue-500 hover:bg-blue-600',     Icon: MessageCircle },
];

function highlightClass(sentiment, selected) {
  if (sentiment === 'good')        return selected ? 'bg-[#0CCE6B]/50 ring-2 ring-[#0CCE6B] ring-offset-1'  : 'bg-[#0CCE6B]/25 hover:bg-[#0CCE6B]/40';
  if (sentiment === 'questioning') return selected ? 'bg-amber-400/50 ring-2 ring-amber-500 ring-offset-1'  : 'bg-amber-300/30 hover:bg-amber-400/40';
  if (sentiment === 'not_sure')    return selected ? 'bg-red-400/50 ring-2 ring-red-500 ring-offset-1'      : 'bg-red-300/30 hover:bg-red-400/40';
  if (sentiment === 'general')     return selected ? 'bg-blue-400/50 ring-2 ring-blue-500 ring-offset-1'    : 'bg-blue-300/30 hover:bg-blue-400/40';
  return selected ? 'bg-amber-400/50 ring-2 ring-amber-500 ring-offset-1' : 'bg-amber-300/30 hover:bg-amber-400/40';
}

function markerClass(sentiment, selected) {
  if (sentiment === 'good')        return selected ? 'bg-[#0CCE6B] scale-125 ring-2 ring-[#0CCE6B]/60 ring-offset-2' : 'bg-[#0CCE6B] hover:scale-110';
  if (sentiment === 'questioning') return selected ? 'bg-amber-600 scale-125 ring-2 ring-amber-400 ring-offset-2'    : 'bg-amber-500 hover:scale-110 hover:bg-amber-600';
  if (sentiment === 'not_sure')    return selected ? 'bg-red-600 scale-125 ring-2 ring-red-400 ring-offset-2'        : 'bg-red-500 hover:scale-110 hover:bg-red-600';
  if (sentiment === 'general')     return selected ? 'bg-blue-600 scale-125 ring-2 ring-blue-400 ring-offset-2'      : 'bg-blue-500 hover:scale-110 hover:bg-blue-600';
  return selected ? 'bg-purple-600 scale-125 ring-2 ring-purple-400 ring-offset-2' : 'bg-purple-500 hover:scale-110 hover:bg-purple-600';
}

function sentimentBadge(sentiment) {
  if (sentiment === 'good')        return <span className="text-[10px] px-1.5 py-0.5 bg-[#0CCE6B]/15 text-neutral-700 font-medium">Good</span>;
  if (sentiment === 'questioning') return <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-medium">Questioning</span>;
  if (sentiment === 'not_sure')    return <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 font-medium">Not Sure</span>;
  if (sentiment === 'general')     return <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-medium">General</span>;
  return null;
}

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

  // Finish feedback eligibility
  const coveredPages = new Set(annotations.filter(a => a.pageNumber != null).map(a => a.pageNumber));
  const allPagesCovered = totalPages > 0 && coveredPages.size >= totalPages;

  return (
    <div className="min-h-screen bg-neutral-100">

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={backTo}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
            <div className="h-5 w-px bg-neutral-200" />
            <h1 className="font-semibold text-neutral-900 truncate max-w-xs text-sm">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Page nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || pageRendering}
                className="p-1.5 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-600" />
              </button>
              <span className="text-sm text-neutral-500 min-w-[72px] text-center tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || pageRendering}
                className="p-1.5 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* Finish feedback */}
            {canAnnotate && onFinishFeedback && (
              <button
                onClick={onFinishFeedback}
                disabled={!allPagesCovered}
                title={
                  allPagesCovered
                    ? 'Submit your final thoughts'
                    : `${coveredPages.size} / ${totalPages} pages covered — annotate every page to finish`
                }
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${
                  allPagesCovered
                    ? 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {allPagesCovered ? 'Finish Feedback' : `${coveredPages.size}/${totalPages} pages`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">

        {/* PDF canvas */}
        <div className="flex-1 overflow-auto p-6 relative">
          <div
            ref={containerRef}
            className="relative mx-auto bg-white shadow-sm"
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
                    className={`absolute cursor-pointer transition-all duration-200 ${
                      highlightClass(ann.sentiment, selectedAnnotation?.id === ann.id)
                    }`}
                    style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
                  />
                ))}
              </div>
            ))}

            {/* Page-comment markers (pin-style, keep circular) */}
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
                className="absolute pointer-events-none bg-amber-400/40"
                style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
              />
            ))}

            {/* Preview after selection */}
            {showCommentInput && !isSelecting && selectionRects.map((r, i) => (
              <div
                key={i}
                className={`absolute pointer-events-none ${
                  annotationType === 'HIGHLIGHT'
                    ? 'bg-amber-400/50 ring-2 ring-amber-500'
                    : 'bg-purple-500/50 ring-2 ring-purple-600'
                }`}
                style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
              />
            ))}
          </div>

          {pageRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <Loader2 className="w-6 h-6 animate-spin text-[#0CCE6B]" />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 lg:w-96 bg-white border-l border-neutral-200 flex flex-col">

          {/* Sidebar header */}
          <div className="p-4 border-b border-neutral-200">
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#0CCE6B]" />
              Annotations
              <span className="text-neutral-400 font-normal">({annotations.length})</span>
            </h2>
            {annotatorUser && (
              <div className="flex items-center gap-2 mt-2 text-sm text-neutral-500">
                {annotatorUser.avatar ? (
                  <img src={annotatorUser.avatar} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-semibold">
                    {(annotatorUser.displayName || annotatorUser.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate">{annotatorUser.displayName || annotatorUser.username}</span>
                <span className="text-neutral-400 flex-shrink-0">giving feedback</span>
              </div>
            )}
          </div>

          {/* New annotation input */}
          {showCommentInput && (
            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              {selectedText && (
                <div className="mb-3 p-2 bg-amber-50 border-l-2 border-amber-400">
                  <p className="text-xs text-amber-600 font-medium mb-1">Selected text:</p>
                  <p className="text-sm text-neutral-700 italic">"{selectedText}"</p>
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your comment…"
                className="w-full px-3 py-2 border border-neutral-200 bg-white text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]/30 focus:border-[#0CCE6B] text-sm transition-colors"
                rows={3}
                autoFocus
              />
              <p className="text-xs text-neutral-400 mt-2 mb-2">Choose a sentiment to submit:</p>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition mr-1"
                >
                  Cancel
                </button>
                {SENTIMENTS.map(({ key, label, bg, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleSubmitAnnotation(key)}
                    disabled={!commentText.trim() || submitting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition ${bg}`}
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
            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              <p className="text-sm font-semibold text-neutral-800 mb-3">How to give feedback:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className="text-sm text-neutral-700">
                    <span className="font-medium text-amber-600">Highlight text:</span> drag to select
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <p className="text-sm text-neutral-700">
                    <span className="font-medium text-purple-600">Page comment:</span> click on page
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-[#0CCE6B]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-[#0CCE6B]" />
                  </div>
                  <p className="text-sm text-neutral-700">
                    <span className="font-medium text-[#0CCE6B]">Page feedback:</span> use box below
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-200">
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#0CCE6B]/15 text-neutral-700 font-medium">Good</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-medium">Questioning</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 font-medium">Not Sure</span>
                  <span className="text-[10px] text-neutral-400 ml-0.5">= sentiment</span>
                </div>
              </div>
            </div>
          )}

          {/* Per-page feedback */}
          {canAnnotate && !showCommentInput && (
            <div className="p-4 border-b border-neutral-200">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Page {currentPage} Feedback
              </label>
              <textarea
                value={pageComment}
                onChange={(e) => setPageComment(e.target.value)}
                placeholder={`Overall thoughts on page ${currentPage}…`}
                className="w-full px-3 py-2 border border-neutral-200 bg-white text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]/30 focus:border-[#0CCE6B] text-sm transition-colors"
                rows={3}
              />
              <div className="flex gap-1 flex-wrap mt-2">
                {SENTIMENTS.map(({ key, label, bg, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleSubmitPageComment(key)}
                    disabled={!pageComment.trim() || submittingPageComment}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition ${bg}`}
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
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                  Page {currentPage}
                </h3>
                <div className="space-y-2">
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
              <div className="p-4 border-t border-neutral-100">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">General</h3>
                <div className="space-y-2">
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
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-8">
                <FileText className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm text-center">No annotations yet</p>
                {canAnnotate && (
                  <p className="text-xs text-center mt-1 text-neutral-400">
                    Select text or click on the page to add feedback
                  </p>
                )}
              </div>
            )}
          </div>

          {/* General comment button */}
          {canAnnotate && !showCommentInput && (
            <div className="p-4 border-t border-neutral-200">
              <button
                onClick={() => {
                  setAnnotationType('GENERAL_COMMENT');
                  setShowCommentInput(true);
                  setSelectionRects([]);
                  setSelectedText('');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-neutral-300 text-neutral-500 hover:border-[#0CCE6B] hover:text-[#0CCE6B] transition text-sm"
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
      className={`p-3 border transition cursor-pointer ${
        selected
          ? 'border-[#0CCE6B] bg-[#0CCE6B]/5'
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <AnnotationTypeIcon type={annotation.type} sentiment={annotation.sentiment} />
          {annotation.author?.avatar ? (
            <img src={annotation.author.avatar} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
              {(annotation.author?.displayName || annotation.author?.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-neutral-900 truncate">
            {annotation.author?.displayName || annotation.author?.username}
          </span>
          {sentimentBadge(annotation.sentiment)}
        </div>
        {annotation.authorId === currentUserId && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
            className="p-1 text-neutral-300 hover:text-red-500 transition flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {annotation.highlightedText && (
        <div className="mt-2 px-2 py-1.5 bg-amber-50 border-l-2 border-amber-400 text-xs text-neutral-600 italic">
          "{annotation.highlightedText}"
        </div>
      )}
      {annotation.type === 'PAGE_FEEDBACK' && (
        <div className="mt-1 text-xs text-[#0CCE6B] font-medium">
          Page {annotation.pageNumber} Feedback
        </div>
      )}
      <p className="text-sm text-neutral-700 mt-2">{annotation.content}</p>
    </div>
  );
}

function AnnotationTypeIcon({ type, sentiment }) {
  if (type === 'HIGHLIGHT') {
    const bg = sentiment === 'good' ? 'bg-[#0CCE6B]/15' : sentiment === 'questioning' ? 'bg-amber-100' : sentiment === 'not_sure' ? 'bg-red-100' : sentiment === 'general' ? 'bg-blue-100' : 'bg-amber-100';
    const color = sentiment === 'good' ? 'text-[#0CCE6B]' : sentiment === 'questioning' ? 'text-amber-600' : sentiment === 'not_sure' ? 'text-red-600' : sentiment === 'general' ? 'text-blue-600' : 'text-amber-600';
    return (
      <div className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Highlighter className={`w-3.5 h-3.5 ${color}`} />
      </div>
    );
  }
  if (type === 'PAGE_COMMENT') {
    const bg = sentiment === 'good' ? 'bg-[#0CCE6B]/15' : sentiment === 'questioning' ? 'bg-amber-100' : sentiment === 'not_sure' ? 'bg-red-100' : sentiment === 'general' ? 'bg-blue-100' : 'bg-purple-100';
    const color = sentiment === 'good' ? 'text-[#0CCE6B]' : sentiment === 'questioning' ? 'text-amber-600' : sentiment === 'not_sure' ? 'text-red-600' : sentiment === 'general' ? 'text-blue-600' : 'text-purple-600';
    return (
      <div className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${bg}`}>
        <MessageCircle className={`w-3.5 h-3.5 ${color}`} />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 bg-[#0CCE6B]/15 flex items-center justify-center flex-shrink-0">
      <FileText className="w-3.5 h-3.5 text-[#0CCE6B]" />
    </div>
  );
}
