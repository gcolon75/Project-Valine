import { Link } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Cookie & Session Disclosure Page
 * Details about cookies and session tokens used by Joint
 * Status: Subject to legal counsel review
 */
export default function CookieDisclosure() {
  useEffect(() => {
    document.title = 'Cookie & Session Disclosure — Joint';
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
            Cookie & Session Disclosure
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
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">What Are Cookies?</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, keep you logged in, and protect your account from security threats.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Joint uses cookies primarily for authentication and security purposes. We do not use third-party advertising or tracking cookies.
            </p>
          </section>

          {/* Cookies We Use */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Cookies We Use</h2>
            
            <div className="space-y-8">
              {/* Access Token */}
              <div className="border border-neutral-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Access Token (Authentication)</h3>
                <div className="space-y-3 text-neutral-700">
                  <div>
                    <strong className="text-neutral-900">Purpose:</strong> Authenticates your identity on each request to our servers
                  </div>
                  <div>
                    <strong className="text-neutral-900">Type:</strong> Essential (required for service functionality)
                  </div>
                  <div>
                    <strong className="text-neutral-900">Duration:</strong> Short-lived (typically 15-30 minutes)
                  </div>
                  <div>
                    <strong className="text-neutral-900">Storage:</strong> HttpOnly (not accessible via JavaScript), Secure (HTTPS only), SameSite=Lax
                  </div>
                  <div>
                    <strong className="text-neutral-900">Security Rationale:</strong> HttpOnly flag prevents XSS attacks; short expiry limits exposure
                  </div>
                </div>
              </div>

              {/* Refresh Token */}
              <div className="border border-neutral-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Refresh Token (Session Renewal)</h3>
                <div className="space-y-3 text-neutral-700">
                  <div>
                    <strong className="text-neutral-900">Purpose:</strong> Allows automatic renewal of your access token without re-login
                  </div>
                  <div>
                    <strong className="text-neutral-900">Type:</strong> Essential (required for persistent sessions)
                  </div>
                  <div>
                    <strong className="text-neutral-900">Duration:</strong> Long-lived (typically 7-30 days)
                  </div>
                  <div>
                    <strong className="text-neutral-900">Storage:</strong> HttpOnly, Secure, SameSite=Lax
                  </div>
                  <div>
                    <strong className="text-neutral-900">Security Rationale:</strong> HttpOnly prevents theft; rotation on use prevents replay attacks
                  </div>
                </div>
              </div>

              {/* XSRF Token */}
              <div className="border border-neutral-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">XSRF-TOKEN (CSRF Protection)</h3>
                <div className="space-y-3 text-neutral-700">
                  <div>
                    <strong className="text-neutral-900">Purpose:</strong> Protects against Cross-Site Request Forgery (CSRF) attacks
                  </div>
                  <div>
                    <strong className="text-neutral-900">Type:</strong> Security (prevents malicious actions on your behalf)
                  </div>
                  <div>
                    <strong className="text-neutral-900">Duration:</strong> Matches session duration (typically minutes to hours)
                  </div>
                  <div>
                    <strong className="text-neutral-900">Storage:</strong> Readable by JavaScript (required), Secure, SameSite=Lax
                  </div>
                  <div>
                    <strong className="text-neutral-900">Security Rationale:</strong> Unique per-session token prevents unauthorized state-changing requests
                  </div>
                </div>
              </div>

              {/* Analytics (Disabled) */}
              <div className="border border-neutral-200 rounded-lg p-6 bg-neutral-50">
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Analytics Cookies (Currently Disabled)</h3>
                <div className="space-y-3 text-neutral-700">
                  <div>
                    <strong className="text-neutral-900">Status:</strong> Not currently in use
                  </div>
                  <div>
                    <strong className="text-neutral-900">Future Use:</strong> If enabled, analytics cookies would help us understand how users interact with our platform to improve the user experience
                  </div>
                  <div>
                    <strong className="text-neutral-900">Disclosure:</strong> Any analytics implementation will be feature-flagged and disclosed in an updated version of this policy with opt-out options
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How We Use Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">How We Use Cookies</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We use cookies for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Authentication:</strong> Keep you logged in as you navigate the platform</li>
              <li><strong>Security:</strong> Protect your account from unauthorized access and CSRF attacks</li>
              <li><strong>Session Management:</strong> Remember your preferences during your session</li>
              <li><strong>Performance:</strong> Reduce unnecessary API calls by caching authentication state</li>
            </ul>
          </section>

          {/* Storage & Duration */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Storage & Duration Summary</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-neutral-200 rounded-lg">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 border-b">Cookie Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 border-b">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 border-b">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 border-b">Security</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-sm text-neutral-700">Access Token</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">Essential</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">15-30 minutes</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">HttpOnly, Secure, SameSite</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-sm text-neutral-700">Refresh Token</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">Essential</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">7-30 days</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">HttpOnly, Secure, SameSite</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-neutral-700">XSRF-TOKEN</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">Security</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">Session duration</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">Secure, SameSite</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Third-Party Cookies</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              <strong>We do not use third-party cookies</strong> for advertising or tracking at this time.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Our platform is designed to respect your privacy and minimize data collection. All cookies are first-party cookies set by Joint for essential functionality and security.
            </p>
          </section>

          {/* Opt-Out & Control */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Opt-Out & Browser Controls</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Essential Cookies</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Essential cookies (access token, refresh token, XSRF token) are required for the platform to function. Blocking these cookies will prevent you from logging in and using authenticated features.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Browser Settings</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>View and delete existing cookies</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies (may break site functionality)</li>
              <li>Clear cookies when closing your browser</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              Refer to your browser's help documentation for specific instructions.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Account Deletion</h3>
            <p className="text-neutral-700 leading-relaxed">
              Deleting your account will immediately invalidate all session cookies and clear stored data. See our{' '}
              <Link to="/legal/privacy" className="text-[#0CCE6B] hover:underline">
                Privacy Policy
              </Link>
              {' '}for details on data deletion.
            </p>
          </section>

          {/* Security Rationale */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Security Rationale</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We use industry-standard security practices for cookie handling:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>HttpOnly Flag:</strong> Prevents JavaScript access to authentication cookies, protecting against XSS attacks</li>
              <li><strong>Secure Flag:</strong> Ensures cookies are only transmitted over HTTPS, protecting against man-in-the-middle attacks</li>
              <li><strong>SameSite=Lax:</strong> Provides CSRF protection by limiting when cookies are sent with cross-site requests</li>
              <li><strong>Short Expiration:</strong> Access tokens expire quickly to limit exposure if compromised</li>
              <li><strong>Token Rotation:</strong> Refresh tokens are rotated on use to prevent replay attacks</li>
              <li><strong>CSRF Tokens:</strong> Separate XSRF tokens provide additional protection for state-changing operations</li>
            </ul>
          </section>

          {/* Updates to This Policy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Updates to This Policy</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              If we change our cookie usage (such as adding analytics), we will update this disclosure and notify you via email or prominent notice on the platform.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Changes will be versioned in our{' '}
              <a href="https://github.com/gcolon75/Project-Valine/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-[#0CCE6B] hover:underline">
                CHANGELOG
              </a>
              .
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Questions?</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              If you have questions about our cookie usage, please contact us:
            </p>
            <ul className="list-none text-neutral-700 space-y-2">
              <li>
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@projectvaline.com" className="text-[#0CCE6B] hover:underline">
                  privacy@projectvaline.com
                </a>
              </li>
              <li>
                <strong>General Support:</strong>{' '}
                <a href="mailto:support@projectvaline.com" className="text-[#0CCE6B] hover:underline">
                  support@projectvaline.com
                </a>
              </li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Legal Disclaimer</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              This is a minimum viable cookie disclosure (MVP) designed to establish transparency about our cookie usage. This document has not been reviewed by legal counsel and is subject to revision. For production use, we recommend formal legal review.
            </p>
          </section>
        </article>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Link 
              to="/legal/privacy" 
              className="text-neutral-600 hover:text-[#0CCE6B] transition-colors"
            >
              View Privacy Policy →
            </Link>
            <Link 
              to="/legal/terms" 
              className="text-neutral-600 hover:text-[#0CCE6B] transition-colors"
            >
              View Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
