import { useState } from 'react';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { submitWaitlist } from '../services/waitlistService';

const INTEREST_OPTIONS = ['Yes', 'No', 'Maybe', 'Other'];

export default function Waitlist() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', interest: '', otherText: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  function validate() {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    if (!form.interest) e.interest = 'Please select an option';
    if (form.interest === 'Other' && !form.otherText.trim()) e.otherText = 'Please describe your interest';
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  function handleInterest(option) {
    setForm(prev => ({ ...prev, interest: option, otherText: option !== 'Other' ? '' : prev.otherText }));
    if (errors.interest) setErrors(prev => ({ ...prev, interest: '' }));
    if (serverError) setServerError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setServerError('');
    const interestValue = form.interest === 'Other' ? form.otherText.trim() : form.interest;
    try {
      await submitWaitlist({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        interest: interestValue,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-[#0CCE6B]" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">You're on the list!</h1>
          <p className="text-lg text-neutral-600">
            You will be notified when you are approved from the waitlist!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent mb-3">Join the Waitlist</h1>
          <p className="text-neutral-600">
            Be among the first to access Joint Networking when we open our doors.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* First + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={form.firstName}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent transition ${errors.firstName ? 'border-red-400' : 'border-neutral-300'}`}
                placeholder="Jane"
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={form.lastName}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent transition ${errors.lastName ? 'border-red-400' : 'border-neutral-300'}`}
                placeholder="Doe"
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent transition ${errors.email ? 'border-red-400' : 'border-neutral-300'}`}
              placeholder="jane@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Interest question */}
          <div>
            <p className="block text-sm font-medium text-neutral-700 mb-2">
              Do you have any interest in pursuing an occupation in the arts or in the entertainment industry? <span className="text-neutral-500 font-normal">(e.g. actor, writer, director)</span> <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleInterest(option)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    form.interest === option
                      ? 'bg-[#0CCE6B] border-[#0CCE6B] text-white'
                      : 'bg-white border-neutral-300 text-neutral-700 hover:border-[#0CCE6B]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {errors.interest && <p className="mt-1 text-xs text-red-500">{errors.interest}</p>}

            {form.interest === 'Other' && (
              <div className="mt-3">
                <input
                  name="otherText"
                  type="text"
                  value={form.otherText}
                  onChange={handleChange}
                  placeholder="Please describe your interest..."
                  className={`w-full px-4 py-3 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent transition ${errors.otherText ? 'border-red-400' : 'border-neutral-300'}`}
                />
                {errors.otherText && <p className="mt-1 text-xs text-red-500">{errors.otherText}</p>}
              </div>
            )}
          </div>

          {serverError && <p className="text-sm text-red-500 text-center">{serverError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-[1.02] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Join the Waitlist</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
