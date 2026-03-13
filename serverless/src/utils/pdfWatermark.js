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

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Calculate the diagonal length of the page
    const diagonal = Math.sqrt(width * width + height * height);

    // Calculate font size so watermark fills ~70% of the diagonal
    const targetWidth = diagonal * 0.7;
    const testFontSize = 72;
    const testTextWidth = boldFont.widthOfTextAtSize(watermarkText, testFontSize);
    const fontSize = Math.min((targetWidth / testTextWidth) * testFontSize, 100); // Cap at 100pt

    // Get actual text dimensions at calculated font size
    const textWidth = boldFont.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = boldFont.heightAtSize(fontSize);

    // Position text at center of page
    // When rotated -45°, the text anchor point needs adjustment
    const centerX = width / 2 - (textWidth * Math.cos(Math.PI / 4)) / 2 + (textHeight * Math.sin(Math.PI / 4)) / 2;
    const centerY = height / 2 + (textWidth * Math.sin(Math.PI / 4)) / 2 + (textHeight * Math.cos(Math.PI / 4)) / 2;

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
