import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Apply repeating diagonal watermark text to each page of a PDF
 * @param {Buffer|Uint8Array} pdfBuffer - Original PDF bytes
 * @param {string} ownerUsername - Owner's username for watermark
 * @returns {Promise<Uint8Array>} - Watermarked PDF bytes
 */
export async function watermarkPdf(pdfBuffer, ownerUsername) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const watermarkText = `Joint-Networking.com/profile/${ownerUsername}`;
  const fontSize = 32;
  const textWidth = boldFont.widthOfTextAtSize(watermarkText, fontSize);

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Draw repeating diagonal watermarks across the entire page
    const spacingX = textWidth * 0.8;
    const spacingY = 120;

    // Start from outside the page to ensure full coverage when rotated
    for (let y = -200; y < height + 400; y += spacingY) {
      for (let x = -200; x < width + 400; x += spacingX) {
        page.drawText(watermarkText, {
          x: x,
          y: y,
          size: fontSize,
          font: boldFont,
          color: rgb(0.3, 0.3, 0.3),
          opacity: 0.35,
          rotate: degrees(-45),
        });
      }
    }

    // Add username in corners
    const smallFontSize = 12;
    const smallText = ownerUsername;

    // Bottom-left corner
    page.drawText(smallText, {
      x: 20,
      y: 20,
      size: smallFontSize,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.5,
    });

    // Top-right corner
    page.drawText(smallText, {
      x: width - boldFont.widthOfTextAtSize(smallText, smallFontSize) - 20,
      y: height - 30,
      size: smallFontSize,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.5,
    });

    // Bottom-right corner
    page.drawText(smallText, {
      x: width - boldFont.widthOfTextAtSize(smallText, smallFontSize) - 20,
      y: 20,
      size: smallFontSize,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.5,
    });

    // Top-left corner
    page.drawText(smallText, {
      x: 20,
      y: height - 30,
      size: smallFontSize,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.5,
    });
  }

  return await pdfDoc.save();
}
