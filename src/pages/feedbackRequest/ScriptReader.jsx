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
      } catch (err) {
        console.error(err);
        toast.error('Could not load script');
        navigate(`/feedback-request/${id}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!request) return null;

  const isAssignedReader = request.readerId === user?.id;
  const isWriter = request.writerId === user?.id;
  const isAdmin = user?.role === 'admin';

  // Only the assigned reader on an in-progress request can add annotations
  const canAnnotate = isAssignedReader && request.status === 'accepted';

  // Reader sees watermarked copy when required
  const scriptUrl =
    request.requireWatermark && isAssignedReader && request.mediaId
      ? `/api/media/${request.mediaId}/watermarked-pdf`
      : request.scriptUrl;

  const handleCreateAnnotation = async (data) => {
    return await createFeedbackAnnotation(id, data);
  };

  const handleDeleteAnnotation = async (annotationId) => {
    await deleteFeedbackAnnotation(annotationId);
  };

  // Who is the person doing the annotating?
  const annotatorUser = isAssignedReader ? user : request.reader;

  const canView = isWriter || isAssignedReader || isAdmin;
  if (!canView) {
    navigate(`/feedback-request/${id}`);
    return null;
  }

  return (
    <PdfAnnotationViewer
      pdfUrl={scriptUrl}
      annotations={annotations}
      onCreateAnnotation={handleCreateAnnotation}
      onDeleteAnnotation={handleDeleteAnnotation}
      canAnnotate={canAnnotate}
      annotatorUser={annotatorUser}
      currentUserId={user?.id}
      title={request.title}
      backTo={`/feedback-request/${id}`}
      backLabel="Back to Request"
    />
  );
}
