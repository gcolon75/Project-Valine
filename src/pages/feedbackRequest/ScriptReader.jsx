import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getFeedbackRequest,
  listFeedbackAnnotations,
  createFeedbackAnnotation,
  deleteFeedbackAnnotation,
  getScriptPdfUrl,
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
        const [req, anns, scriptData] = await Promise.all([
          getFeedbackRequest(id),
          listFeedbackAnnotations(id),
          getScriptPdfUrl(id),
        ]);
        setRequest(req);
        setAnnotations(anns);
        setPdfUrl(scriptData.url);
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!request || !pdfUrl) return null;

  const isAssignedReader = request.readerId === user?.id;
  const isWriter = request.writerId === user?.id;
  const isAdmin = user?.role === 'admin';

  // Only the assigned reader on an accepted request can annotate
  const canAnnotate = isAssignedReader && request.status === 'accepted';

  // Writer shown anonymously to reader if they opted in
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
    />
  );
}
