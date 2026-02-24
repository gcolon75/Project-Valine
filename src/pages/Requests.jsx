// src/pages/Requests.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConnectionRequests, approveRequest, rejectRequest, followBack } from '../services/connectionService';
import { getUserAccessRequests, grantPostAccess } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Check, X, UserCheck, Lock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Requests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('follow'); // 'follow' | 'post'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFollowBackModal, setShowFollowBackModal] = useState(false);
  const [approvedUser, setApprovedUser] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());

  // Post access requests state
  const [postRequests, setPostRequests] = useState([]);
  const [postRequestsLoading, setPostRequestsLoading] = useState(false);
  const [postRequestsError, setPostRequestsError] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'post' && user?.id) {
      loadPostRequests();
    }
  }, [activeTab, user?.id]);

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

  const loadPostRequests = async () => {
    if (!user?.id) return;
    setPostRequestsLoading(true);
    setPostRequestsError(null);
    try {
      const data = await getUserAccessRequests(user.id, 'PENDING');
      setPostRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load post access requests:', err);
      setPostRequestsError(err.message || 'Failed to load post access requests');
      setPostRequests([]);
    } finally {
      setPostRequestsLoading(false);
    }
  };

  const handleApprovePostRequest = async (req) => {
    setProcessingIds(prev => new Set([...prev, req.id]));
    try {
      await grantPostAccess(req.postId, req.id, 'approve');
      setPostRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success(`Access granted to ${req.requester?.displayName || req.requester?.username}`);
    } catch (err) {
      console.error('Failed to approve post request:', err);
      toast.error('Failed to approve request. Please try again.');
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  };

  const handleDenyPostRequest = async (req) => {
    setProcessingIds(prev => new Set([...prev, req.id]));
    try {
      await grantPostAccess(req.postId, req.id, 'deny');
      setPostRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success('Request denied');
    } catch (err) {
      console.error('Failed to deny post request:', err);
      toast.error('Failed to deny request. Please try again.');
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(req.id); return next; });
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
        Requests
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        Manage follow and post access requests
      </p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('follow')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
            activeTab === 'follow'
              ? 'border-[#0CCE6B] text-[#0CCE6B]'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Follow Requests
          {requests.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-[#0CCE6B] text-white text-xs rounded-full">{requests.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('post')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
            activeTab === 'post'
              ? 'border-[#0CCE6B] text-[#0CCE6B]'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          Post Access Requests
          {postRequests.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-[#0CCE6B] text-white text-xs rounded-full">{postRequests.length}</span>
          )}
        </button>
      </div>

      {/* ── Follow Requests Tab ── */}
      {activeTab === 'follow' && (
        <>
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
            No pending follow requests
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
        </>
      )}

      {/* ── Post Access Requests Tab ── */}
      {activeTab === 'post' && (
        <>
          {postRequestsLoading && (
            <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-neutral-300 dark:border-neutral-700 border-t-[#0CCE6B] mb-4" />
              <p className="text-neutral-600 dark:text-neutral-300">Loading post access requests...</p>
            </div>
          )}

          {postRequestsError && !postRequestsLoading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-amber-800 dark:text-amber-200">
              <p className="font-medium">Unable to load post access requests</p>
              <p className="text-sm mt-1">{postRequestsError}</p>
            </div>
          )}

          {!postRequestsLoading && !postRequestsError && postRequests.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#474747]/10 to-[#0CCE6B]/10 mb-6">
                <Lock className="w-10 h-10 text-[#0CCE6B]" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                No pending post access requests
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                When someone requests access to your gated posts, you'll see them here
              </p>
            </div>
          )}

          {!postRequestsLoading && postRequests.length > 0 && (
            <div className="space-y-4">
              {postRequests.map((req, index) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex items-center space-x-4 cursor-pointer flex-1 min-w-0"
                      onClick={() => navigate(`/profile/${req.requester?.username}`)}
                    >
                      <div className="p-0.5 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full flex-shrink-0">
                        {req.requester?.avatar ? (
                          <img
                            src={req.requester.avatar}
                            alt={req.requester.displayName}
                            className="w-14 h-14 rounded-full border-2 border-white dark:border-[#1a1a1a] object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white dark:border-[#1a1a1a] bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                            <Users className="w-7 h-7 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white hover:text-[#0CCE6B] transition-colors truncate">
                          {req.requester?.displayName || req.requester?.username}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          @{req.requester?.username}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{(req.post?.content || '').slice(0, 60)}{(req.post?.content || '').length > 60 ? '…' : ''}</span>
                        </div>
                        {req.message && (
                          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 italic">
                            "{req.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprovePostRequest(req)}
                        disabled={processingIds.has(req.id)}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 text-sm"
                      >
                        {processingIds.has(req.id) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleDenyPostRequest(req)}
                        disabled={processingIds.has(req.id)}
                        className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-900 dark:text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                      >
                        <X className="w-4 h-4" />
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
