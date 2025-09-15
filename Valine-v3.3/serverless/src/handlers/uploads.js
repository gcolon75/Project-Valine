import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const presign = async (evt) => {
  try {
    const { filename, contentType, userId = 'anon' } = JSON.parse(evt.body || '{}');
    if (!filename || !contentType) return { statusCode: 400, body: 'filename and contentType required' };
    const safeName = filename.replace(/[^\w.\-]+/g, '_');
    const key = `uploads/${encodeURIComponent(userId)}/${Date.now()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, key }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'presign error' };
  }
};
