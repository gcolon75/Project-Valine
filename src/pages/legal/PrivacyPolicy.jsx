import { Link } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Privacy Policy Page
 * MVP privacy policy covering data collection, user rights, security measures
 * Status: Subject to legal counsel review
 */
export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy — Joint';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-neutral-600 hover:text-[#0CCE6B] mb-6 transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Privacy Policy
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-neutral-600">
            <span>Last Updated: November 12, 2025</span>
            <span className="hidden md:inline">•</span>
            <span>Version 1.0.0</span>
            <span className="hidden md:inline">•</span>
            <span className="text-amber-600 font-medium">MVP - Subject to Legal Counsel Review</span>
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-neutral max-w-none">
          {/* Introduction / Scope */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Introduction / Scope</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Joint ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              By creating an account or using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          {/* Data Collection */}
          <section className="mb-12" id="data-collection">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Data Collection</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We collect the following types of information:
            </p>
            
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Account Information</h3>
            <ul className="list-disc pl-6 mb-4 text-neutral-700 space-y-2">
              <li>Email address (required for account creation and verification)</li>
              <li>Username and display name</li>
              <li>Profile information (bio, title/headline, profile links, avatar)</li>
              <li>User preferences (theme, notification settings)</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Operational Logs</h3>
            <ul className="list-disc pl-6 mb-4 text-neutral-700 space-y-2">
              <li>Authentication events (login, logout, password reset)</li>
              <li>Security events (failed login attempts, two-factor authentication activity)</li>
              <li>Profile modification events</li>
              <li>Session management data</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Technical Information</h3>
            <ul className="list-disc pl-6 mb-4 text-neutral-700 space-y-2">
              <li>IP addresses (for security and rate limiting)</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Access times and referring URLs</li>
            </ul>
          </section>

          {/* Purpose of Processing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Purpose of Processing</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We process your data for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Account Operation:</strong> To create, maintain, and authenticate your account</li>
              <li><strong>Security:</strong> To protect against unauthorized access, fraud, and abuse</li>
              <li><strong>Service Reliability:</strong> To monitor system performance and troubleshoot issues</li>
              <li><strong>Communication:</strong> To send important account-related notifications (verification emails, password resets, security alerts)</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            </ul>
          </section>

          {/* Cookies & Session Tokens */}
          <section className="mb-12" id="cookies">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Cookies & Session Tokens</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We use HTTP-only cookies to maintain your session and protect against security threats. See our <Link to="/legal/cookies" className="text-[#0CCE6B] hover:underline">Cookie & Session Disclosure</Link> for detailed information.
            </p>
            
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Cookies We Use</h3>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Access Token:</strong> Short-lived authentication token (HttpOnly, Secure, SameSite=Lax)</li>
              <li><strong>Refresh Token:</strong> Long-lived token for session renewal (HttpOnly, Secure, SameSite=Lax)</li>
              <li><strong>XSRF-TOKEN:</strong> Cross-Site Request Forgery protection token (minutes, matching session duration)</li>
            </ul>

            <p className="text-neutral-700 leading-relaxed mt-4">
              <strong>Analytics:</strong> Analytics cookies are currently disabled. If enabled in the future, they will be feature-flagged and disclosed in updated versions of this policy.
            </p>
          </section>

          {/* User Rights */}
          <section className="mb-12" id="user-rights">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">User Rights</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You have the following rights regarding your data:
            </p>
            
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Access & Export</h3>
            <p className="text-neutral-700 leading-relaxed mb-2">
              Request a copy of your data through the account settings page or by contacting us at{' '}
              {/* TODO: replace with full domain once confirmed, e.g. privacy@joint-networking.com */}
              <a href="mailto:privacy@joint-networking.com" className="text-[#0CCE6B] hover:underline">
                privacy@joint-networking.com
              </a>.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-4">
              <strong>Endpoint:</strong> <code className="bg-neutral-100 px-2 py-1 rounded text-sm">POST /api/account/export</code> (planned)
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Delete</h3>
            <p className="text-neutral-700 leading-relaxed mb-2">
              Request account deletion through account settings or by contacting us. Account deletion is permanent and irreversible.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-4">
              <strong>Endpoint:</strong> <code className="bg-neutral-100 px-2 py-1 rounded text-sm">DELETE /api/account</code> (planned)
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Correction</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Update your profile information at any time through the profile edit page.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Opt-Out</h3>
            <p className="text-neutral-700 leading-relaxed">
              Control notification preferences through account settings. Deleting your account removes all cookies and stored data.
            </p>
          </section>

          {/* Security Measures */}
          <section className="mb-12" id="security-measures">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Security Measures</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We implement industry-standard security practices to protect your data:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>HttpOnly Cookies:</strong> Session tokens stored in HttpOnly cookies to prevent XSS attacks</li>
              <li><strong>CSRF Protection:</strong> XSRF tokens on all state-changing requests</li>
              <li><strong>Rate Limiting:</strong> Protection against brute force attacks and abuse</li>
              <li><strong>Password Hashing:</strong> Passwords encrypted using bcrypt (industry standard)</li>
              <li><strong>Two-Factor Authentication:</strong> Optional TOTP-based 2FA for enhanced security</li>
              <li><strong>Input Sanitization:</strong> All user inputs validated and sanitized</li>
              <li><strong>Encryption at Rest:</strong> Data encrypted via managed cloud services</li>
              <li><strong>Secure Transmission:</strong> HTTPS/TLS encryption for all data in transit</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Data Retention</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We retain your data as follows:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active and for 30 days after deletion (for recovery)</li>
              <li><strong>Verification Tokens:</strong> 24 hours (email verification, password reset)</li>
              <li><strong>Session Tokens:</strong> Access tokens expire in minutes; refresh tokens expire in days</li>
              <li><strong>Security Logs:</strong> 30-90 days depending on event category</li>
              <li><strong>Audit Logs:</strong> Login/logout events retained for 90 days</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Data Sharing & Disclosure</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information. We may share data only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Service Providers:</strong> Third-party services that help operate our platform (cloud hosting, email delivery) under strict confidentiality agreements</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets (with notice to you)</li>
            </ul>
          </section>

          {/* Storage Locations */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Storage Locations</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Your data is stored on secure cloud infrastructure provided by reputable cloud service providers. Data centers are located in the United States. We will update this section if data residency changes or regional compliance options are added.
            </p>
          </section>

          {/* International Users */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">International Users</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Joint is based in the United States. If you access our services from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              <strong>Future Enhancements:</strong> We plan to add region-specific compliance features (GDPR for EU, CCPA for California) in future releases. Internationalization (i18n) support is also planned.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Children's Privacy</h2>
            <p className="text-neutral-700 leading-relaxed">
              Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Changes to This Policy</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. Changes will be documented in our{' '}
              <a href="https://github.com/gcolon75/Project-Valine/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-[#0CCE6B] hover:underline">
                CHANGELOG
              </a>
              {' '}with version numbers. We will notify you of significant changes via email or prominent notice on our platform.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Your continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Contact Information</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              For questions, concerns, or data subject access requests, please contact us:
            </p>
            <ul className="list-none text-neutral-700 space-y-2">
              <li>
                <strong>Email:</strong>{' '}
                {/* TODO: replace with full domain once confirmed, e.g. privacy@joint-networking.com */}
                <a href="mailto:privacy@joint-networking.com" className="text-[#0CCE6B] hover:underline">
                  privacy@joint-networking.com
                </a>
              </li>
              <li>
                <strong>General Support:</strong>{' '}
                {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
                <a href="mailto:support@joint-networking.com" className="text-[#0CCE6B] hover:underline">
                  support@joint-networking.com
                </a>
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              <strong>Note:</strong> Contact form and dedicated DSAR request flow are planned for future releases.
            </p>
          </section>

          {/* Disclaimer */}
          <section className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Legal Disclaimer</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              This is a minimum viable privacy policy (MVP) designed to establish a baseline for legal compliance. This document has not been reviewed by legal counsel and is subject to revision. For production use, we recommend formal legal review and regional compliance assessment (GDPR, CCPA, etc.).
            </p>
          </section>
        </article>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Link 
              to="/legal/terms" 
              className="text-neutral-600 hover:text-[#0CCE6B] transition-colors"
            >
              View Terms of Service →
            </Link>
            <Link 
              to="/legal/cookies" 
              className="text-neutral-600 hover:text-[#0CCE6B] transition-colors"
            >
              View Cookie Disclosure →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
