// src/components/AdminEmailPanel.jsx
import { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2, Shield } from 'lucide-react';
import { getAllowedEmails, addAllowedEmail, removeAllowedEmail } from '../services/adminService';
import Button from './ui/Button';

export default function AdminEmailPanel() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getAllowedEmails();
      setEmails(data);
    } catch (e) {
      setError('Failed to load allowlist.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAddError('Enter a valid email address.');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const record = await addAllowedEmail(trimmed);
      setEmails(prev => [...prev, record]);
      setNewEmail('');
    } catch (e) {
      setAddError(e?.message || 'Failed to add email.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(email) {
    if (!window.confirm(`Remove ${email} from the allowlist?`)) return;
    setRemovingId(email);
    try {
      await removeAllowedEmail(email);
      setEmails(prev => prev.filter(r => r.email !== email));
    } catch (e) {
      alert('Failed to remove email.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="max-w-lg py-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-[#0CCE6B]" />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Allowlist Management
        </h2>
      </div>

      {/* Add email form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="email"
          value={newEmail}
          onChange={e => { setNewEmail(e.target.value); setAddError(''); }}
          placeholder="new@email.com"
          className="flex-1 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent text-sm"
        />
        <Button type="submit" size="sm" disabled={adding || !newEmail.trim()}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </Button>
      </form>
      {addError && (
        <p className="text-sm text-red-500 -mt-4 mb-4">{addError}</p>
      )}

      {/* Email list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : emails.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No emails on the allowlist.</p>
      ) : (
        <ul className="space-y-2">
          {emails.map(r => (
            <li
              key={r.id}
              className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              <span className="text-sm text-neutral-900 dark:text-white">{r.email}</span>
              <button
                onClick={() => handleRemove(r.email)}
                disabled={removingId === r.email}
                className="text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                aria-label={`Remove ${r.email}`}
              >
                {removingId === r.email
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
        {emails.length} email{emails.length !== 1 ? 's' : ''} on the allowlist
      </p>
    </div>
  );
}
