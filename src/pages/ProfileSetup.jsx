import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

export default function ProfileSetup() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  const [form, setForm] = useState(() => ({
    displayName: user.name || '',
    pronouns: user.pronouns || '',
    location: user.location || '',
    bio: user.bio || '',
    linkedIn: user.linkedIn || '',
    discipline: user.discipline || '',
    skills: user.skills || '',
    unionStatus: user.unionStatus || '',
    title: user.title || '',
    company: user.company || '',
    interests: user.interests || '',
    budgetRange: user.budgetRange || '',
    showreel: user.showreel || '',
  }));
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updates = { ...form, name: form.displayName, profileComplete: true };
    updateUser(updates);
    try { await api.updateUser(user.id, updates); } catch {}
    navigate('/dashboard');
  };

  const renderArtistFields = () => (
    <>
      <div>
        <label htmlFor="discipline" className="block text-sm font-medium mb-1">Primary Discipline</label>
        <input
          type="text"
          name="discipline"
          id="discipline"
          value={form.discipline}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label htmlFor="skills" className="block text-sm font-medium mb-1">Skills / Tags</label>
        <input
          type="text"
          name="skills"
          id="skills"
          value={form.skills}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label htmlFor="unionStatus" className="block text-sm font-medium mb-1">Union Status</label>
        <input
          type="text"
          name="unionStatus"
          id="unionStatus"
          value={form.unionStatus}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
    </>
  );

  const renderObserverFields = () => (
    <>
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">Title / Role</label>
        <input
          type="text"
          name="title"
          id="title"
          value={form.title}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-medium mb-1">Company</label>
        <input
          type="text"
          name="company"
          id="company"
          value={form.company}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label htmlFor="interests" className="block text-sm font-medium mb-1">Interests / Tags</label>
        <input
          type="text"
          name="interests"
          id="interests"
          value={form.interests}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label htmlFor="budgetRange" className="block text-sm font-medium mb-1">Budget Range</label>
        <input
          type="text"
          name="budgetRange"
          id="budgetRange"
          value={form.budgetRange}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label htmlFor="showreel" className="block text-sm font-medium mb-1">Showreel / Website</label>
        <input
          type="text"
          name="showreel"
          id="showreel"
          value={form.showreel}
          onChange={handleChange}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
    </>
  );

  return (
    <div className="p-6 md:p-10 min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Complete Your Profile</h1>
        <p className="text-sm text-neutral-400">
          Welcome to Joint, {user.role === 'artist' ? 'artist' : 'observer'}! We just need a few details to customise your experience.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">Display Name *</label>
            <input
              type="text"
              name="displayName"
              id="displayName"
              required
              value={form.displayName}
              onChange={handleChange}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="pronouns" className="block text-sm font-medium mb-1">Pronouns</label>
            <input
              type="text"
              name="pronouns"
              id="pronouns"
              value={form.pronouns}
              onChange={handleChange}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              name="location"
              id="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              name="bio"
              id="bio"
              rows={4}
              value={form.bio}
              onChange={handleChange}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-y"
            />
          </div>
          <div>
            <label htmlFor="linkedIn" className="block text-sm font-medium mb-1">LinkedIn Profile</label>
            <input
              type="url"
              name="linkedIn"
              id="linkedIn"
              placeholder="https://linkedin.com/in/your-profile"
              value={form.linkedIn}
              onChange={handleChange}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          {user.role === 'artist' ? renderArtistFields() : renderObserverFields()}
          <div>
            <label className="block text-sm font-medium mb-1">Identity Verification</label>
            <p className="text-xs text-neutral-500">Identity verification will be available soon. Stay tuned!</p>
          </div>
          
          {/* Terms of Use */}
          <div className="border border-neutral-700 dark:border-neutral-600 rounded-lg p-4 bg-neutral-900/50">
            <div className="flex items-start gap-3 mb-3">
              <img 
                src="/terms-icon.png" 
                alt="Terms of Use" 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1 text-neutral-100">Terms of Use</h3>
                <p className="text-xs text-neutral-400 mb-2">
                  Please review and accept our terms of use to continue using Joint.
                </p>
                <a 
                  href="/terms" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-500 hover:text-emerald-400 underline"
                >
                  Read full Terms of Use
                </a>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-neutral-900"
              />
              <span className="text-sm text-neutral-300">
                I have read and accept the Terms of Use
              </span>
            </label>
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={!acceptedTerms}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
            {!acceptedTerms && (
              <p className="text-xs text-neutral-500 mt-2">
                You must accept the Terms of Use to continue
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
