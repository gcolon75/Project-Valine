import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getFeedbackRequest,
  listFeedbackAnnotations,
  createFeedbackAnnotation,
  deleteFeedbackAnnotation,
} from '../../services/scriptFeedbackService';
import { getMediaAccessUrl } from '../../services/mediaService';
import PdfAnnotationViewer from '../../components/PdfAnnotationViewer';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.joint-networking.com';

export default function ScriptReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let blobUrl = null;

    (async () => {
      try {
        const [req, anns] = await Promise.all([
          getFeedbackRequest(id),
          listFeedbackAnnotations(id),
        ]);
        setRequest(req);
        setAnnotations(anns);

        const isAssignedReader = req.readerId === user?.id;

        if (req.requireWatermark && isAssignedReader && req.mediaId) {
          // Fetch watermarked PDF with credentials (cookies) then hand blob to PDF.js
          const resp = await fetch(
            `${API_BASE}/media/${req.mediaId}/watermarked-pdf`,
            { credentials: 'include' }
          );
          if (!resp.ok) throw new Error(`Watermark fetch failed: ${resp.status}`);
          const blob = await resp.blob();
          blobUrl = URL.createObjectURL(blob);
          setPdfUrl(blobUrl);
        } else if (req.mediaId) {
          // Fresh pre-signed S3 URL — no auth header needed, same pattern as FeedbackView
          const { viewUrl } = await getMediaAccessUrl(req.mediaId);
          setPdfUrl(viewUrl);
        } else {
          // Older submissions that only stored scriptUrl
          setPdfUrl(req.scriptUrl);
        }
      } catch (err) {
        console.error(err);
        const status = err?.response?.status;
        if (status === 403) {
          toast.error('You do not have access to this script.');
        } else if (status === 404) {
          toast.error('Script not found.');
        } else {
          toast.error('Could not load script.');
        }
        navigate(`/feedback-request/${id}`);
      } finally {
        setLoading(false);
      }
    })();

    // Revoke blob URL on unmount to free memory
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!request || !pdfUrl) return null;

  const isAssignedReader = request.readerId === user?.id;
  const isWriter = request.writerId === user?.id;
  const isAdmin = user?.role === 'admin';

  // Only the assigned reader on an accepted request can add annotations
  const canAnnotate = isAssignedReader && request.status === 'accepted';

  // Who is shown in the sidebar header as the annotator
  const annotatorUser = isAssignedReader ? user : request.reader;

  return (
    <PdfAnnotationViewer
      pdfUrl={pdfUrl}
      annotations={annotations}
      onCreateAnnotation={(data) => createFeedbackAnnotation(id, data)}
      onDeleteAnnotation={(annotationId) => deleteFeedbackAnnotation(annotationId)}
      canAnnotate={canAnnotate}
      annotatorUser={annotatorUser}
      currentUserId={user?.id}
      title={request.title}
      backTo={`/feedback-request/${id}`}
      backLabel="Back to Request"
    />
  );
}
