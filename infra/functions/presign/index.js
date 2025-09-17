import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

function bad(status, message) {
  return { statusCode: status, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: message }) };
}

export const handler = async (event) => {
  try {
    const { userId = "anon", filename, contentType } = JSON.parse(event.body || "{}");
    if (!filename || !contentType) return bad(400, "Missing filename or contentType");

    const allowed = (process.env.ALLOWED_TYPES || "").split(",");
    if (!allowed.includes(contentType)) return bad(415, "Unsupported content-type");

    const bucket = process.env.BUCKET_NAME;
    const key = `${userId}/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, command, { expiresIn: Number(process.env.URL_TTL_SECONDS || 300) });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, key, bucket, contentType })
    };
  } catch (err) {
    console.error(err);
    return bad(500, "Failed to create presigned URL");
  }
};
