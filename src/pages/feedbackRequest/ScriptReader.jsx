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
import PdfAnnotationViewer from '../../components/PdfAnnotationViewer';
import toast from 'react-hot-toast';

export default function ScriptReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [req, anns] = await Promise.all([
          getFeedbackRequest(id),
          listFeedbackAnnotations(id),
        ]);
        setRequest(req);
        setAnnotations(anns);

        // getRequest now returns scriptPresignedUrl — a fresh signed S3 URL.
        // Fall back to scriptUrl if the backend is an older deploy without it.
        const url = req.scriptPresignedUrl || req.scriptUrl;
        if (!url) throw new Error('No script URL available');
        setPdfUrl(url);
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
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0CCE6B]" />
      </div>
    );
  }

  if (!request || !pdfUrl) return null;

  const isAssignedReader = user?.id && (request.readerId === user.id || request.reader?.id === user.id);
  const isAdmin = user?.role === 'admin';
  const canAnnotate = isAssignedReader && request.status === 'accepted';
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
      title={request.anonymousSubmission ? 'Anonymous Script' : request.title}
      backTo={`/feedback-request/${id}`}
      backLabel="Back to Request"
      onFinishFeedback={canAnnotate ? () => navigate(`/feedback-request/${id}/finish`) : null}
    />
  );
}
