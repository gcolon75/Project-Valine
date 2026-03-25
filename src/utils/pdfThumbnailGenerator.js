// src/utils/pdfThumbnailGenerator.js
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Render the first page of a PDF to a JPEG and return it as a base64 string.
 * @param {File|Blob|string} source - PDF File/Blob object or a URL string
 * @param {number} thumbnailWidth - Width in pixels for the rendered thumbnail (default 600)
 * @returns {Promise<string>} Base64-encoded JPEG (no data: prefix)
 */
export async function generatePdfThumbnailBase64(source, thumbnailWidth = 600) {
  let pdfSource;
  if (source instanceof File || source instanceof Blob) {
    pdfSource = await source.arrayBuffer();
  } else {
    pdfSource = source; // URL string — PDF.js fetches it
  }

  const pdf = await pdfjsLib.getDocument(pdfSource).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1 });
  const scale = thumbnailWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({
    canvasContext: canvas.getContext('2d'),
    viewport: scaledViewport,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Failed to create thumbnail blob')); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // strip data: prefix
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      0.85,
    );
  });
}
