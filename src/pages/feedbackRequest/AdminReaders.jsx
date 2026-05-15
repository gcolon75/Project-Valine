import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Search, UserCheck, UserMinus, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  adminListReaders,
  adminSearchUsers,
  adminSetReader,
} from '../../services/scriptFeedbackService';

function formatUsd(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function UserRow({ user, isReader, onToggle, pending, pendingPayoutCents }) {
  const name = user.displayName || user.username || 'Unknown';
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        {user.avatar ? (
          <img src={user.avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {user.username ? `@${user.username}` : ''}
            {user.email ? ` · ${user.email}` : ''}
          </p>
          {pendingPayoutCents !== undefined && pendingPayoutCents > 0 && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              Pending payout: {formatUsd(pendingPayoutCents)}
            </p>
          )}
        </div>
      </div>
      <Button
        variant={isReader ? 'secondary' : 'primary'}
        onClick={() => onToggle(user.id, !isReader)}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isReader ? (
          <>
            <UserMinus className="w-4 h-4 mr-1" />
            Revoke
          </>
        ) : (
          <>
            <UserCheck className="w-4 h-4 mr-1" />
            Make reader
          </>
        )}
      </Button>
    </div>
  );
}

export default function AdminReaders() {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [readers, setReaders] = useState([]);
  const [readersLoading, setReadersLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [error, setError] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    adminListReaders()
      .then(setReaders)
      .catch((e) => setError(e?.response?.data?.error || 'Could not load readers.'))
      .finally(() => setReadersLoading(false));
  }, [isAdmin]);

  // Debounced search
  useEffect(() => {
    if (!isAdmin) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await adminSearchUsers(query.trim());
        setSearchResults(results);
      } catch (e) {
        setError(e?.response?.data?.error || 'Search failed.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, isAdmin]);

  const markPending = (id, flag) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (flag) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggle = async (userId, isReader) => {
    markPending(userId, true);
    setError('');
    try {
      const updated = await adminSetReader(userId, isReader);

      // Update both lists
      if (isReader) {
        setReaders((prev) => {
          if (prev.some((r) => r.id === updated.id)) return prev;
          return [...prev, updated].sort((a, b) =>
            (a.username || '').localeCompare(b.username || '')
          );
        });
      } else {
        setReaders((prev) => prev.filter((r) => r.id !== updated.id));
      }
      setSearchResults((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, isReader: updated.isReader } : u))
      );

      // If the admin toggled their own flag, refresh their session
      if (updated.id === user?.id && typeof refreshUser === 'function') {
        refreshUser();
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not update reader flag.');
    } finally {
      markPending(userId, false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">Admin access required.</p>
          <Link to="/feedback-request" className="text-emerald-600 hover:underline">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link
          to="/feedback-request"
          className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Feedback Request
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Manage Readers
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Approved readers can claim paid script-feedback jobs and earn $0.25 per page.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Search */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mb-2">
            Add a reader
          </h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username, email, or display name…"
              className="w-full pl-10 pr-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {searching && <p className="text-xs text-neutral-500">Searching…</p>}
          {!searching && query.trim().length >= 2 && !searchResults.length && (
            <p className="text-xs text-neutral-500">No users match "{query}".</p>
          )}
          <div className="space-y-2">
            {searchResults.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isReader={u.isReader}
                onToggle={handleToggle}
                pending={pendingIds.has(u.id)}
              />
            ))}
          </div>
        </section>

        {/* Current readers */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mb-3">
            Current readers ({readers.length})
          </h2>
          {readersLoading ? (
            <p className="text-neutral-500">Loading…</p>
          ) : !readers.length ? (
            <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-500">
              No readers yet. Use search above to add the first one.
            </div>
          ) : (
            <div className="space-y-2">
              {readers.map((r) => (
                <UserRow
                  key={r.id}
                  user={r}
                  isReader={true}
                  onToggle={handleToggle}
                  pending={pendingIds.has(r.id)}
                  pendingPayoutCents={r.pendingPayoutCents}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
