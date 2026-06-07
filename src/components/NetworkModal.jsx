// src/components/NetworkModal.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import UserAvatar from './UserAvatar';
import { useNavigate } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { getProfileNetwork } from '../services/connectionService';
import toast from 'react-hot-toast';

export default function NetworkModal({ isOpen, onClose, profileId, count = 0 }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen || !profileId) return;
    setLoading(true);
    getProfileNetwork(profileId)
      .then(res => setUsers(res.items || []))
      .catch(() => { toast.error('Failed to load network'); setUsers([]); })
      .finally(() => setLoading(false));
  }, [isOpen, profileId]);

  const filtered = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (u.username || '').toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-lg w-full max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Network</h2>
            <p className="text-sm text-neutral-400 mt-0.5">{count} connection{count !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-neutral-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search connections…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 pl-9 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-6 py-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-neutral-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-100 w-1/3" />
                    <div className="h-3 bg-neutral-100 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="px-6 divide-y divide-neutral-100">
              {filtered.map(u => (
                <button
                  key={u.userId}
                  onClick={() => { onClose(); navigate(`/profile/${u.username || u.userId}`); }}
                  className="flex items-center gap-3 py-4 w-full text-left hover:bg-neutral-50 -mx-6 px-6 transition-colors"
                >
                  <UserAvatar src={u.avatar} name={u.displayName || u.username} alt={u.displayName || u.username} className="w-11 h-11 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{u.displayName || u.username}</p>
                    <p className="text-sm text-neutral-400 truncate">@{u.username}</p>
                    {u.title && <p className="text-xs text-neutral-400 truncate mt-0.5">{u.title}</p>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-12">
              {searchQuery ? 'No connections match your search' : 'No connections yet'}
            </p>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
