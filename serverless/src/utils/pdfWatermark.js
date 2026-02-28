import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Apply diagonal watermark text to each page of a PDF
 * @param {Buffer|Uint8Array} pdfBuffer - Original PDF bytes
 * @param {string} username - Viewer's username for watermark
 * @returns {Promise<Uint8Array>} - Watermarked PDF bytes
 */
export async function watermarkPdf(pdfBuffer, username) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const watermarkText = `Downloaded by @${username}`;
  const fontSize = 48;

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Calculate text width for centering
    const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);

    // Draw semi-transparent diagonal watermark in center
    page.drawText(watermarkText, {
      x: (width - textWidth * 0.7) / 2, // Approximate centering accounting for rotation
      y: height / 2,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5), // Gray
      opacity: 0.3, // 30% opacity
      rotate: degrees(-45), // Diagonal
    });

    // Add additional watermarks in corners for extra protection
    const smallFontSize = 12;
    const smallText = `@${username}`;

    // Bottom-left corner
    page.drawText(smallText, {
      x: 20,
      y: 20,
      size: smallFontSize,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.4,
    });

    // Top-right corner
    page.drawText(smallText, {
      x: width - helveticaFont.widthOfTextAtSize(smallText, smallFontSize) - 20,
      y: height - 30,
      size: smallFontSize,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.4,
    });
  }

  return await pdfDoc.save();
}
