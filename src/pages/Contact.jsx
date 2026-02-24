import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Contact Us Page
 * Frontend-only contact form with success state (no backend handler)
 */
export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'General',
    message: '',
  });

  useEffect(() => {
    document.title = 'Contact Us — Joint';
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-neutral-600 hover:text-[#0CCE6B] mb-6 transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-neutral-600">We'd love to hear from you.</p>
        </header>

        {submitted ? (
          /* Success State */
          <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#0CCE6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Message Sent!</h2>
            <p className="text-neutral-600">
              Thanks! We'll get back to you within 1–2 business days.
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: 'General', message: '' }); }}
              className="mt-6 text-sm text-[#0CCE6B] hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          /* Contact Form */
          <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-neutral-900 mb-1">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] transition-colors"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-neutral-900 mb-1">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="contact-subject" className="block text-sm font-medium text-neutral-900 mb-1">
                Subject
              </label>
              <select
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] transition-colors bg-white"
              >
                <option value="General">General</option>
                <option value="Bug Report">Bug Report</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Partnership">Partnership</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-neutral-900 mb-1">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] transition-colors resize-y"
                placeholder="How can we help?"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] shadow-md focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
            >
              Send Message
            </button>
          </form>
        )}

        {/* Direct Contact */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Or reach us directly</h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>
              <strong>General:</strong>{' '}
              {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
              <a href="mailto:support@joint-networking" className="text-[#0CCE6B] hover:underline">
                support@joint-networking
              </a>
            </li>
            <li>
              <strong>Privacy/Legal:</strong>{' '}
              {/* TODO: replace with full domain once confirmed, e.g. privacy@joint-networking.com */}
              <a href="mailto:privacy@joint-networking" className="text-[#0CCE6B] hover:underline">
                privacy@joint-networking
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
