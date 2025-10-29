// src/pages/Requests.jsx
import { useEffect, useState } from 'react';
import { getConnectionRequests, approveRequest, rejectRequest } from '../services/connectionService';

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
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
        Requests
      </h1>
      
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 text-neutral-300">
          Loading requests...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 text-neutral-300">
          Failed to load requests. Using local mode.
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 text-neutral-300">
          No pending connection requests.
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((req) => (
            <div 
              key={req.id} 
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{req.sender.displayName || req.sender.username}</p>
                <p className="text-sm text-neutral-400">wants to connect</p>
                {req.message && (
                  <p className="text-sm text-neutral-300 mt-2">{req.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleApprove(req.id)} 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleReject(req.id)} 
                  className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
