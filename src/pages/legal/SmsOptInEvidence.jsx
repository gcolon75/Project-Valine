import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function SmsOptInEvidence() {
  useEffect(() => {
    document.title = 'SMS Opt-In Evidence — Joint';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-neutral-600 hover:text-[#0CCE6B] mb-6 transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">SMS Opt-In Consent Evidence</h1>
          <p className="text-neutral-600 text-sm">
            This page documents how Joint Networking collects SMS consent from users during account onboarding.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">How Consent Is Collected</h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            During the onboarding flow at{' '}
            <a href="https://joint-networking.com/onboarding" className="text-[#0CCE6B] hover:underline">
              joint-networking.com/onboarding
            </a>
            , users are prompted to enter their phone number. Before submitting, users must check a checkbox
            acknowledging the following disclosure:
          </p>
          <blockquote className="border-l-4 border-[#0CCE6B] pl-4 py-2 bg-neutral-50 rounded-r-lg text-neutral-700 italic mb-4">
            "By submitting your phone number, you agree to receive SMS messages from Joint Networking,
            including one-time verification codes and activity notifications (likes, comments, follows, direct messages).
            Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help."
          </blockquote>
          <p className="text-neutral-700 leading-relaxed">
            Users cannot proceed without checking this box. Links to the{' '}
            <a href="https://joint-networking.com/legal/privacy" className="text-[#0CCE6B] hover:underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="https://joint-networking.com/legal/terms" className="text-[#0CCE6B] hover:underline">
              Terms of Service
            </a>{' '}
            are displayed on the same page.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Consent Form Mock-Up</h2>
          <p className="text-neutral-600 text-sm mb-4">
            The following is a representation of the consent form shown to users during onboarding:
          </p>

          {/* Mock-up of the consent form */}
          <div className="border border-neutral-200 rounded-2xl p-6 bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Verify Your Phone Number</h3>
            <p className="text-sm text-neutral-500 mb-5">
              Add your phone number to receive activity notifications via SMS.
            </p>

            <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
            <div className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 text-neutral-400 text-sm bg-neutral-50 mb-5">
              +1 (555) 000-0000
            </div>

            <div className="flex items-start gap-3 mb-5">
              <div className="w-4 h-4 mt-0.5 rounded border-2 border-[#0CCE6B] bg-[#0CCE6B] flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                By submitting your phone number, you agree to receive SMS messages from Joint Networking,
                including one-time verification codes and activity notifications (likes, comments, follows, direct messages).
                Message and data rates may apply. Message frequency varies.
                Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.{' '}
                <a href="/legal/privacy" className="text-[#0CCE6B] underline">Privacy Policy</a>{' '}
                ·{' '}
                <a href="/legal/terms" className="text-[#0CCE6B] underline">Terms of Service</a>
              </p>
            </div>

            <div className="w-full bg-[#0CCE6B] text-white text-sm font-medium py-2.5 rounded-lg text-center">
              Send Verification Code
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">Opt-Out Instructions</h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-2 text-sm">
            <li>Reply <strong>STOP</strong> to any SMS message to immediately opt out.</li>
            <li>Reply <strong>HELP</strong> to any SMS message for support.</li>
            <li>Users can also manage or remove SMS preferences in their account settings at any time.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">Message Types</h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-2 text-sm">
            <li>One-time verification codes during account setup</li>
            <li>Activity notifications (likes, comments, follows) with a link to view the content</li>
          </ul>
          <p className="text-neutral-600 text-sm mt-3">
            Message and data rates may apply. Message frequency varies. Mobile opt-in data is not shared
            with third parties or used for marketing purposes.
          </p>
        </section>

        <div className="mt-10 pt-6 border-t border-neutral-200 flex gap-4 text-sm">
          <Link to="/legal/privacy" className="text-neutral-600 hover:text-[#0CCE6B] transition-colors">
            Privacy Policy →
          </Link>
          <Link to="/legal/terms" className="text-neutral-600 hover:text-[#0CCE6B] transition-colors">
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
