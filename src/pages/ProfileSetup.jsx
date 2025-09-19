// src/pages/ProfileSetup.jsx
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updates = { ...form, name: form.displayName, profileComplete: true };
    updateUser(updates);
    try { await api.updateUser(user.id, updates); } catch { /* noop */ }
    navigate('/dashboard'); // <— important: go to Dashboard
  };

  const renderArtistFields = () => (
    <>
      <div className="form-group">
        <label htmlFor="discipline">Primary Discipline</label>
        <input type="text" name="discipline" id="discipline" value={form.discipline} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="skills">Skills / Tags</label>
        <input type="text" name="skills" id="skills" value={form.skills} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="unionStatus">Union Status</label>
        <input type="text" name="unionStatus" id="unionStatus" value={form.unionStatus} onChange={handleChange} />
      </div>
    </>
  );

  const renderObserverFields = () => (
    <>
      <div className="form-group">
        <label htmlFor="title">Title / Role</label>
        <input type="text" name="title" id="title" value={form.title} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="company">Company</label>
        <input type="text" name="company" id="company" value={form.company} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="interests">Interests / Tags</label>
        <input type="text" name="interests" id="interests" value={form.interests} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="budgetRange">Budget Range</label>
        <input type="text" name="budgetRange" id="budgetRange" value={form.budgetRange} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="showreel">Showreel / Website</label>
        <input type="text" name="showreel" id="showreel" value={form.showreel} onChange={handleChange} />
      </div>
    </>
  );

  return (
    <main className="container" style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Complete Your Profile</h1>
      <p style={{ marginBottom: '2rem' }}>
        Welcome to Joint, {user.role === 'artist' ? 'artist' : 'observer'}! We just need a few details to customise your experience.
      </p>
      <form onSubmit={handleSubmit} className="profile-form" style={{ display: 'grid', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor="displayName">Display Name *</label>
          <input type="text" name="displayName" id="displayName" required value={form.displayName} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="pronouns">Pronouns</label>
          <input type="text" name="pronouns" id="pronouns" value={form.pronouns} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input type="text" name="location" id="location" value={form.location} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea name="bio" id="bio" rows={4} value={form.bio} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="linkedIn">LinkedIn Profile</label>
          <input type="url" name="linkedIn" id="linkedIn" placeholder="https://linkedin.com/in/your-profile" value={form.linkedIn} onChange={handleChange} />
        </div>
        {user.role === 'artist' ? renderArtistFields() : renderObserverFields()}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Identity Verification</label>
          <p style={{ fontSize: '0.9rem' }}>Identity verification will be available soon. Stay tuned!</p>
        </div>
        <button type="submit" className="btn" style={{ width: 'fit-content', padding: '0.5rem 1.5rem' }}>
          Save &amp; Continue
        </button>
      </form>
    </main>
  );
}
