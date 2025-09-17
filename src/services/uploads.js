const API = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function getPresignedUrl({ filename, contentType, userId }) {
  const res = await fetch(`${API}/uploads/presign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename, contentType, userId }),
  });
  if (!res.ok) throw new Error('presign failed');
  return res.json(); // { url, key }
}

export async function uploadWithPresignedUrl(url, file) {
  const put = await fetch(url, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!put.ok) throw new Error('upload failed');
  return true;
}
