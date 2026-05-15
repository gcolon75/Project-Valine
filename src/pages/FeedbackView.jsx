// src/pages/FeedbackView.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getFeedbackRequest, createAnnotation, deleteAnnotation } from '../services/feedbackService';
import { getMediaAccessUrl } from '../services/mediaService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PdfAnnotationViewer from '../components/PdfAnnotationViewer';

export default function FeedbackView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [annotations, setAnnotations] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getFeedbackRequest(id);
        setFeedbackRequest(data);
        setAnnotations(data.annotations || []);

        const mediaId = data.post?.mediaAttached?.id || data.post?.mediaId;
        if (mediaId) {
          const { viewUrl } = await getMediaAccessUrl(mediaId);
          setPdfUrl(viewUrl);
        }
      } catch (err) {
        console.error('Failed to fetch feedback request:', err);
        toast.error('Failed to load feedback session');
        navigate('/profile?tab=feedback');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0CCE6B]" />
      </div>
    );
  }

  if (!feedbackRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Feedback session not found</p>
      </div>
    );
  }

  const isRequester = feedbackRequest?.requesterId === user?.id;
  const canAnnotate = isRequester && feedbackRequest?.status === 'approved';

  const handleCreateAnnotation = async (data) => {
    return await createAnnotation(id, data);
  };

  const handleDeleteAnnotation = async (annotationId) => {
    await deleteAnnotation(annotationId);
  };

  return (
    <PdfAnnotationViewer
      pdfUrl={pdfUrl}
      annotations={annotations}
      onCreateAnnotation={handleCreateAnnotation}
      onDeleteAnnotation={handleDeleteAnnotation}
      canAnnotate={canAnnotate}
      annotatorUser={feedbackRequest.requester}
      currentUserId={user?.id}
      title={feedbackRequest.post?.title || 'PDF Feedback'}
      backTo="/profile?tab=feedback"
      backLabel="Back to Feedback"
    />
  );
}
