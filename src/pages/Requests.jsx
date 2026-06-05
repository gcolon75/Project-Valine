// src/pages/Requests.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptNetworkRequest, declineNetworkRequest } from '../services/connectionService';
import { getNotifications } from '../services/notificationsService';
import { Users, UserPlus, Check, X, UserCheck } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import toast from 'react-hot-toast';

export default function Requests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getNotifications({ type: 'NETWORK_REQUEST', limit: 50 });
      const pending = (data.notifications || []).filter(n => {
        const t = n.type?.toLowerCase();
        return t === 'network_request';
      });
      setRequests(pending);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (notification) => {
    const senderProfileId = notification.metadata?.senderProfileId;
    if (!senderProfileId) return;
    setProcessingIds(prev => new Set([...prev, notification.id]));
    try {
      await acceptNetworkRequest(senderProfileId);
      setRequests(prev => prev.filter(r => r.id !== notification.id));
      const name = notification.triggerer?.displayName || notification.triggerer?.username || 'User';
      toast.success(`Connected with ${name}!`);
    } catch (err) {
      console.error('Failed to accept:', err);
      toast.error('Failed to accept request. Please try again.');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(notification.id); return s; });
    }
  };

  const handleDecline = async (notification) => {
    const senderProfileId = notification.metadata?.senderProfileId;
    if (!senderProfileId) return;
    setProcessingIds(prev => new Set([...prev, notification.id]));
    try {
      await declineNetworkRequest(senderProfileId);
      setRequests(prev => prev.filter(r => r.id !== notification.id));
      toast.success('Request declined');
    } catch (err) {
      console.error('Failed to decline:', err);
      toast.error('Failed to decline request. Please try again.');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(notification.id); return s; });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        Connection Requests
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        People who want to connect with you
      </p>

      {loading && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-neutral-300 dark:border-neutral-700 border-t-[#0CCE6B] mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">Loading requests...</p>
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0CCE6B]/10 mb-6">
            <UserCheck className="w-10 h-10 text-[#0CCE6B]" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            No pending requests
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            When someone wants to connect with you, you'll see them here
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Discover People
          </button>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((notification) => {
            const user = notification.triggerer;
            const isProcessing = processingIds.has(notification.id);
            return (
              <div
                key={notification.id}
                className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center space-x-4 cursor-pointer flex-1"
                    onClick={() => user?.username && navigate(`/profile/${user.username}`)}
                  >
                    <UserAvatar
                      src={user?.avatar}
                      name={user?.displayName || user?.username}
                      alt={user?.username || 'User'}
                      className="w-14 h-14"
                    />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {user?.displayName || user?.username || 'Unknown'}
                      </p>
                      {user?.username && (
                        <p className="text-sm text-[#0CCE6B]">@{user.username}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccept(notification)}
                      disabled={isProcessing}
                      className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(notification)}
                      disabled={isProcessing}
                      className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-900 dark:text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
