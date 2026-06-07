import React, { useEffect, useState, useRef } from 'react';
import UserAvatar from '../../components/UserAvatar';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  adminListReaders,
  adminSearchUsers,
  adminSetReader,
} from '../../services/scriptFeedbackService';

function formatUsd(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

// Row styled as a ledger line — not a card
function ReaderRow({ user, isReader, onToggle, pending, pendingPayoutCents }) {
  const name = user.displayName || user.username || 'Unknown';
  const showPayout = pendingPayoutCents !== undefined && pendingPayoutCents > 0;

  return (
    <div className="flex items-center gap-5 py-5 border-b border-neutral-100 last:border-0">
      <UserAvatar src={user.avatar} name={name} alt={name} className="w-11 h-11 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-neutral-900 truncate">{name}</p>
        <p className="text-sm text-neutral-400 truncate">
          {user.username ? `@${user.username}` : ''}
          {user.email ? (user.username ? ` · ${user.email}` : user.email) : ''}
        </p>
      </div>
      {showPayout && (
        <p className="text-base font-semibold text-[#0CCE6B] tabular-nums shrink-0 hidden sm:block">
          {formatUsd(pendingPayoutCents)}
        </p>
      )}
      <button
        onClick={() => onToggle(user.id, !isReader)}
        disabled={pending}
        className={`shrink-0 min-w-[110px] text-center text-sm font-medium px-4 py-2 border transition-colors disabled:opacity-50 ${
          isReader
            ? 'text-neutral-400 border-neutral-200 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
            : 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-700'
        }`}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        ) : isReader ? (
          'Revoke'
        ) : (
          'Grant access'
        )}
      </button>
    </div>
  );
}

export function AdminReadersContent() {
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
      if (updated.id === user?.id && typeof refreshUser === 'function') {
        refreshUser();
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not update reader flag.');
    } finally {
      markPending(userId, false);
    }
  };

  if (!isAdmin) return null;

  const hasSearchQuery = query.trim().length >= 2;

  return (
    <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-lg font-semibold text-neutral-900">Reader Pool</h2>
            {!readersLoading && (
              <span className="text-sm text-neutral-400 tabular-nums">
                {readers.length} active
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">
            Vetted readers claim approved scripts and earn $0.25 per page.
          </p>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-6 py-4 text-base text-red-700">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Add a reader
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, username, or email…"
              className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 animate-spin" />
            )}
          </div>

          {/* Search results */}
          {hasSearchQuery && !searching && (
            <div className="mt-2 bg-white border border-neutral-100">
              {!searchResults.length ? (
                <p className="px-6 py-5 text-base text-neutral-400">
                  No users match &ldquo;{query}&rdquo;
                </p>
              ) : (
                <div className="px-6">
                  {searchResults.map((u) => (
                    <ReaderRow
                      key={u.id}
                      user={u}
                      isReader={u.isReader}
                      onToggle={handleToggle}
                      pending={pendingIds.has(u.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current roster */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Current readers
            {!readersLoading && (
              <span className="ml-1.5 font-normal text-neutral-300">({readers.length})</span>
            )}
          </p>

          {readersLoading ? (
            <p className="text-base text-neutral-400 py-6">Loading…</p>
          ) : !readers.length ? (
            <p className="text-base text-neutral-400 py-6 border-l-2 border-neutral-200 pl-4">
              No readers yet. Use the search above to grant the first one access.
            </p>
          ) : (
            <div className="bg-white border border-neutral-100 px-6">
              {readers.map((r) => (
                <ReaderRow
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
  );
}

export default function AdminReaders() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <Link
          to="/feedback-request"
          className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Feedback Hub
        </Link>
        <AdminReadersContent />
      </div>
    </div>
  );
}
