// src/components/PDFThumbnail.jsx
import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Component that renders a thumbnail of the first page of a PDF
 */
export default function PDFThumbnail({ pdfUrl, title, className = '', onClick }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pdfUrl) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    const renderPDF = async () => {
      try {
        setLoading(true);
        setError(false);

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        // Get the first page
        const page = await pdf.getPage(1);

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');

        // Calculate scale to fit the canvas width
        const containerWidth = canvas.parentElement?.offsetWidth || 400;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Render the page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        setLoading(false);
      } catch (err) {
        console.error('PDF thumbnail render error:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderPDF();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  if (error) {
    // Fallback to icon if PDF can't be rendered
    return (
      <div
        className={`flex flex-col items-center justify-center bg-neutral-200 dark:bg-neutral-700 ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <FileText className="w-16 h-16 text-neutral-500 dark:text-neutral-400 mb-2" />
        <span className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">
          {title || "PDF Document"}
        </span>
        {onClick && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Click to view
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative bg-neutral-100 dark:bg-neutral-800 ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-700">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}
