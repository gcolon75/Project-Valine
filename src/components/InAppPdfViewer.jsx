// src/components/InAppPdfViewer.jsx
// Full-page PDF viewer — matches PdfAnnotationViewer layout but without annotation tools.
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SCALE = 1.5;

export default function InAppPdfViewer({ url, title = 'PDF Viewer', onClose }) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  // Load PDF
  useEffect(() => {
    if (!url) return;
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error('PDF load error', err);
      }
    })();
  }, [url]);

  // Render page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      setPageRendering(true);
      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: SCALE });

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
              `left:${item.transform[4] * SCALE}px`,
              `top:${viewport.height - item.transform[5] * SCALE - item.height * SCALE}px`,
              `font-size:${item.height * SCALE}px`,
              `font-family:${item.fontName || 'sans-serif'}`,
              `color:transparent`,
              `cursor:text`,
              `user-select:text`,
            ].join(';');
            textLayerRef.current.appendChild(span);
          });
        }
      } catch (err) {
        if (!cancelled) console.error('PDF render error', err);
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDocument, currentPage]);

  return (
    <div className="min-h-screen bg-neutral-100">

      {/* Sticky header — matches PdfAnnotationViewer */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <h1 className="font-semibold text-neutral-900 truncate max-w-xs text-sm">{title}</h1>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || pageRendering}
              className="p-1.5 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <span className="text-sm text-neutral-500 min-w-[72px] text-center tabular-nums">
              {totalPages > 0 ? `${currentPage} / ${totalPages}` : '—'}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || pageRendering}
              className="p-1.5 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF canvas area */}
      <div className="flex justify-center p-6">
        <div
          className="relative bg-white shadow-sm"
          style={{ width: 'fit-content' }}
        >
          {pageRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#0CCE6B]" />
            </div>
          )}
          <canvas ref={canvasRef} className="block" />
          <div
            ref={textLayerRef}
            className="absolute top-0 left-0 overflow-hidden pointer-events-none select-text"
            style={{
              width: canvasRef.current?.width,
              height: canvasRef.current?.height,
            }}
          />
        </div>
      </div>
    </div>
  );
}
