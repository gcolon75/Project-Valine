import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Apply a single centered diagonal watermark to each page of a PDF
 * @param {Buffer|Uint8Array} pdfBuffer - Original PDF bytes
 * @param {string} ownerUsername - Owner's username for watermark
 * @returns {Promise<Uint8Array>} - Watermarked PDF bytes
 */
export async function watermarkPdf(pdfBuffer, ownerUsername) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const watermarkText = `Joint-Networking.com/profile/${ownerUsername}`;
  const fontSize = 72;
  const textWidth = boldFont.widthOfTextAtSize(watermarkText, fontSize);

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Calculate center position for a single diagonal watermark
    // Account for text width when rotated at -45 degrees
    const centerX = (width - textWidth * Math.cos(Math.PI / 4)) / 2;
    const centerY = (height + textWidth * Math.sin(Math.PI / 4)) / 2;

    // Draw single centered diagonal watermark
    page.drawText(watermarkText, {
      x: centerX,
      y: centerY,
      size: fontSize,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.25,
      rotate: degrees(-45),
    });
  }

  return await pdfDoc.save();
}
