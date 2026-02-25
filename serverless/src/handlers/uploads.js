import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Allowed MIME types for presigned uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
];

// Upload size limits (in bytes)
const MAX_FILE_SIZES = {
  'image/jpeg': 10 * 1024 * 1024,   // 10 MB
  'image/png': 10 * 1024 * 1024,    // 10 MB
  'image/webp': 10 * 1024 * 1024,   // 10 MB
  'video/mp4': 500 * 1024 * 1024,   // 500 MB
  'application/pdf': 25 * 1024 * 1024, // 25 MB
};

export const presign = async (evt) => {
  try {
    const { filename, contentType, fileSize, mimeType, userId = 'anon' } = JSON.parse(evt.body || '{}');
    if (!filename || !contentType) return { statusCode: 400, body: JSON.stringify({ error: 'filename and contentType required' }) };

    // Resolve the MIME type to validate (prefer explicit mimeType, fall back to contentType)
    const resolvedMimeType = mimeType || contentType;

    // Validate MIME type against allowlist
    if (!ALLOWED_MIME_TYPES.includes(resolvedMimeType)) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` }),
      };
    }

    // Validate file size if provided
    if (fileSize !== undefined && fileSize !== null) {
      const parsedSize = typeof fileSize === 'number' ? fileSize : parseInt(fileSize, 10);
      if (isNaN(parsedSize) || parsedSize <= 0) {
        return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'fileSize must be a positive number' }) };
      }
      const maxSize = MAX_FILE_SIZES[resolvedMimeType];
      if (parsedSize > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: `File too large. Max size for ${resolvedMimeType} is ${maxSizeMB}MB.` }),
        };
      }
    }

    const safeName = filename.replace(/[^\w.\-]+/g, '_');
    const key = `uploads/${encodeURIComponent(userId)}/${Date.now()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: resolvedMimeType,
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, key }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'presign error' }) };
  }
};
