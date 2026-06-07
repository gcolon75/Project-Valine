// src/pages/AdminPanel.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminEmailPanel from '../components/AdminEmailPanel';
import AdminWaitlistPanel from '../components/AdminWaitlistPanel';
import { AdminQueueContent } from './feedbackRequest/AdminQueue';
import { AdminReadersContent } from './feedbackRequest/AdminReaders';

const TABS = [
  { key: 'allowlist',   label: 'Allowlist' },
  { key: 'waitlist',    label: 'Preapproved' },
  { key: 'reviewqueue', label: 'Review Queue' },
  { key: 'readers',     label: 'Manage Readers' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState('allowlist');

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-xl font-bold text-neutral-900 mb-8">Admin Panel</h1>

      <div className="bg-white border border-neutral-200 px-6 py-6">
        <div className="flex gap-4 mb-6 border-b border-neutral-200 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`relative pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                subTab === key ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {label}
              {subTab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0CCE6B]" />}
            </button>
          ))}
        </div>
        {subTab === 'allowlist'   && <AdminEmailPanel />}
        {subTab === 'waitlist'    && <AdminWaitlistPanel />}
        {subTab === 'reviewqueue' && <AdminQueueContent />}
        {subTab === 'readers'     && <AdminReadersContent />}
      </div>
    </div>
  );
}
