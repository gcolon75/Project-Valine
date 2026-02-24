import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Contact Us Page
 * Frontend-only contact form with client-side validation and success state (no backend handler)
 */
export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'General',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    document.title = 'Contact Us — Joint';
  }, []);

  const validate = (values) => {
    const errs = {};
    if (!values.name.trim()) {
      errs.name = 'Please enter your name.';
    }
    if (!values.email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!values.message.trim()) {
      errs.message = 'Please enter a message.';
    }
    return errs;
  };

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (touched[e.target.name]) {
      setErrors(validate(updated));
    }
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
    setErrors(validate({ ...form, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitted(true);
    }
  };

  const fieldClass = (name) =>
    `w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-[#0CCE6B] transition-colors ${
      errors[name] && touched[name]
        ? 'border-red-400 bg-red-50'
        : 'border-neutral-300'
    }`;

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
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Message Received!</h2>
            <p className="text-neutral-600">
              Thanks! We'll get back to you within 1–2 business days.
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              In the meantime, you can also reach us directly at{' '}
              {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
              <a href="mailto:support@joint-networking.com" className="text-[#0CCE6B] hover:underline">
                support@joint-networking.com
              </a>.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ name: '', email: '', subject: 'General', message: '' });
                setErrors({});
                setTouched({});
              }}
              className="mt-6 text-sm text-[#0CCE6B] hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          /* Contact Form */
          <div>
            {/* Notice banner — form is a demo placeholder */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Note:</strong> This form is currently a preview. To reach us directly, email{' '}
              {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
              <a href="mailto:support@joint-networking.com" className="underline hover:text-amber-900">
                support@joint-networking.com
              </a>.
            </div>

            <form onSubmit={handleSubmit} noValidate className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-neutral-900 mb-1">
                  Name <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  aria-required="true"
                  aria-describedby={errors.name && touched.name ? 'name-error' : undefined}
                  aria-invalid={!!(errors.name && touched.name)}
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldClass('name')}
                  placeholder="Your name"
                />
                {errors.name && touched.name && (
                  <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-neutral-900 mb-1">
                  Email <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  aria-required="true"
                  aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                  aria-invalid={!!(errors.email && touched.email)}
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldClass('email')}
                  placeholder="you@example.com"
                />
                {errors.email && touched.email && (
                  <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
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
                  Message <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  aria-required="true"
                  aria-describedby={errors.message && touched.message ? 'message-error' : undefined}
                  aria-invalid={!!(errors.message && touched.message)}
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldClass('message')}
                  placeholder="How can we help?"
                />
                {errors.message && touched.message && (
                  <p id="message-error" role="alert" className="mt-1 text-sm text-red-600">{errors.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] shadow-md focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
              >
                Send Message
              </button>
            </form>
          </div>
        )}

        {/* Direct Contact */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Or reach us directly</h2>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>
              <strong>General:</strong>{' '}
              {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
              <a href="mailto:support@joint-networking.com" className="text-[#0CCE6B] hover:underline">
                support@joint-networking.com
              </a>
            </li>
            <li>
              <strong>Privacy/Legal:</strong>{' '}
              {/* TODO: replace with full domain once confirmed, e.g. privacy@joint-networking.com */}
              <a href="mailto:privacy@joint-networking.com" className="text-[#0CCE6B] hover:underline">
                privacy@joint-networking.com
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
