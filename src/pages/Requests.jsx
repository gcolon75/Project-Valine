// src/pages/Requests.jsx
import { useEffect, useState } from 'react';
import { getConnectionRequests, approveRequest, rejectRequest } from '../services/connectionService';
import { Users } from 'lucide-react';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = 'current-user-id'; // TODO: Get from auth context

  useEffect(() => {
    getConnectionRequests(userId)
      .then(setRequests)
      .catch(err => {
        console.error('Failed to load requests:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleApprove = async (id) => {
    try {
      await approveRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">
        Connection Requests
      </h1>
      
      {loading && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-neutral-600 dark:text-neutral-300">
          Loading requests...
        </div>
      )}

      {error && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-neutral-600 dark:text-neutral-300">
          Failed to load requests. Using local mode.
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0CCE6B]/10 mb-4">
            <Users className="w-8 h-8 text-[#0CCE6B]" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">No pending connection requests</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
            When someone wants to connect with you, you'll see them here
          </p>
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
                <div className="flex items-center space-x-4">
                  {/* Avatar with gradient ring */}
                  <div className="p-0.5 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full">
                    {req.sender.avatar ? (
                      <img 
                        src={req.sender.avatar}
                        alt={req.sender.displayName}
                        className="w-16 h-16 rounded-full border-2 border-white dark:border-[#1a1a1a] object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-white dark:border-[#1a1a1a] bg-neutral-200 dark:bg-neutral-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {req.sender.displayName || req.sender.username}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      @{req.sender.username}
                    </p>
                    {req.message && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                        {req.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleApprove(req.id)} 
                    className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleReject(req.id)} 
                    className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-6 py-2 rounded-lg font-semibold transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
