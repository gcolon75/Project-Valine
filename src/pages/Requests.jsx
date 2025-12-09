// src/pages/Requests.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConnectionRequests, approveRequest, rejectRequest, followBack } from '../services/connectionService';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Check, X, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Requests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFollowBackModal, setShowFollowBackModal] = useState(false);
  const [approvedUser, setApprovedUser] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getConnectionRequests();
      // API returns { requests: [...] } or array directly depending on implementation
      const requestsArray = Array.isArray(data) ? data : (data?.requests || []);
      setRequests(requestsArray);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setError(err.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    setProcessingIds(prev => new Set([...prev, request.id]));
    try {
      await approveRequest(request.id);
      
      // Show follow-back prompt
      setApprovedUser(request.sender);
      setShowFollowBackModal(true);
      
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success(`You accepted ${request.sender.displayName || request.sender.username}'s follow request!`);
    } catch (err) {
      console.error('Failed to approve request:', err);
      toast.error('Failed to accept request. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleReject = async (request) => {
    setProcessingIds(prev => new Set([...prev, request.id]));
    try {
      await rejectRequest(request.id);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('Request declined');
    } catch (err) {
      console.error('Failed to reject request:', err);
      toast.error('Failed to decline request. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleFollowBack = async () => {
    if (!approvedUser) return;
    
    try {
      await followBack(approvedUser.id);
      toast.success(`You're now following ${approvedUser.displayName || approvedUser.username} back!`);
    } catch (err) {
      console.error('Failed to follow back:', err);
      toast.error('Failed to follow back. You can do this later from their profile.');
    } finally {
      setShowFollowBackModal(false);
      setApprovedUser(null);
    }
  };

  const handleSkipFollowBack = () => {
    setShowFollowBackModal(false);
    setApprovedUser(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        Follow Requests
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        People who want to follow you
      </p>
      
      {loading && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-neutral-300 dark:border-neutral-700 border-t-[#0CCE6B] mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">Loading requests...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-amber-800 dark:text-amber-200">
          <p className="font-medium">Unable to load requests</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#474747]/10 to-[#0CCE6B]/10 mb-6">
            <Users className="w-10 h-10 text-[#0CCE6B]" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            No pending requests
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            When someone wants to follow you, you'll see them here
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
          >
            <UserPlus className="w-5 h-5" />
            Discover People
          </button>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((req, index) => (
            <div 
              key={req.id} 
              className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-4 cursor-pointer flex-1"
                  onClick={() => navigate(`/profile/${req.sender.username}`)}
                >
                  {/* Avatar with gradient ring */}
                  <div className="p-0.5 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full">
                    {req.sender.avatar ? (
                      <img 
                        src={req.sender.avatar}
                        alt={req.sender.displayName}
                        className="w-16 h-16 rounded-full border-2 border-white dark:border-[#1a1a1a] object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-white dark:border-[#1a1a1a] bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                        <Users className="w-8 h-8 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white hover:text-[#0CCE6B] transition-colors">
                      {req.sender.displayName || req.sender.username}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      @{req.sender.username}
                    </p>
                    {req.sender.title && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1 line-clamp-1">
                        {req.sender.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleApprove(req)} 
                    disabled={processingIds.has(req.id)}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold transition-all hover:scale-105"
                  >
                    {processingIds.has(req.id) ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Accept
                  </button>
                  <button 
                    onClick={() => handleReject(req)} 
                    disabled={processingIds.has(req.id)}
                    className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-900 dark:text-white px-5 py-2.5 rounded-lg font-semibold transition-all"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow Back Modal */}
      {showFollowBackModal && approvedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-slide-up">
            <div className="text-center">
              {/* Avatar */}
              <div className="inline-flex p-1 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full mb-4">
                {approvedUser.avatar ? (
                  <img 
                    src={approvedUser.avatar}
                    alt={approvedUser.displayName}
                    className="w-20 h-20 rounded-full border-4 border-white dark:border-neutral-900 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    <Users className="w-10 h-10 text-neutral-400" />
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                Follow back?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                You accepted <strong>{approvedUser.displayName || approvedUser.username}</strong>'s request. 
                Would you like to follow them back?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSkipFollowBack}
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Not now
                </button>
                <button
                  onClick={handleFollowBack}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                >
                  <UserCheck className="w-5 h-5" />
                  Follow back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
