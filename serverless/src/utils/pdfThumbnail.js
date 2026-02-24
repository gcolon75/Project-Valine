/**
 * PDF Thumbnail Generator
 * Generates thumbnail images from PDF first page using pdfjs-dist and canvas
 */

import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure PDF.js to not use workers (for Lambda compatibility)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

/**
 * Generate a thumbnail from a PDF buffer
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @param {Object} options - Options for thumbnail generation
 * @param {number} options.width - Target width (default: 400)
 * @param {number} options.height - Target height (default: 566, A4 ratio)
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generatePdfThumbnail(pdfBuffer, options = {}) {
  const { width = 400, height = 566 } = options;

  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;

    // Get the first page
    const page = await pdfDoc.getPage(1);

    // Calculate scale to fit within target dimensions
    const viewport = page.getViewport({ scale: 1 });
    const scaleX = width / viewport.width;
    const scaleY = height / viewport.height;
    const scale = Math.min(scaleX, scaleY);

    const scaledViewport = page.getViewport({ scale });

    // Create canvas
    const canvas = createCanvas(scaledViewport.width, scaledViewport.height);
    const context = canvas.getContext('2d');

    // Fill with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render the page
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;

    // Convert to PNG buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('PDF thumbnail generation failed:', error);
    throw error;
  }
}
