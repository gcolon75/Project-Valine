import { Link } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Terms of Service Page
 * MVP terms covering user responsibilities, prohibited conduct, IP, termination
 * Status: Subject to legal counsel review
 */
export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service — Joint';
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
            Terms of Service
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
          {/* Acceptance of Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Acceptance of Terms</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              By accessing or using Joint ("the Service," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 13 years of age.
            </p>
          </section>

          {/* User Responsibilities */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">User Responsibilities</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              By using Joint, you agree to:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Provide Accurate Information:</strong> Ensure all account information is accurate, complete, and up-to-date</li>
              <li><strong>Protect Your Account:</strong> Maintain the confidentiality of your password and account credentials</li>
              <li><strong>Lawful Use:</strong> Use the Service only for lawful purposes and in accordance with these Terms</li>
              <li><strong>Respectful Conduct:</strong> Treat other users with respect and professionalism</li>
              <li><strong>Notify Us:</strong> Immediately report any unauthorized use of your account</li>
            </ul>
          </section>

          {/* Prohibited Conduct */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Prohibited Conduct</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You agree NOT to engage in any of the following prohibited activities:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Malicious Activity:</strong> Upload viruses, malware, or other harmful code</li>
              <li><strong>Spam:</strong> Send unsolicited bulk messages or commercial communications</li>
              <li><strong>Unauthorized Access:</strong> Attempt to access accounts, systems, or networks without authorization</li>
              <li><strong>Data Scraping:</strong> Use automated tools to scrape, harvest, or collect data from the Service</li>
              <li><strong>Abuse & Harassment:</strong> Harass, threaten, or abuse other users</li>
              <li><strong>Impersonation:</strong> Impersonate any person or entity</li>
              <li><strong>Interference:</strong> Interfere with or disrupt the Service or servers</li>
              <li><strong>Violation of Rights:</strong> Infringe upon intellectual property rights, privacy rights, or other rights of others</li>
              <li><strong>Illegal Content:</strong> Post content that is illegal, obscene, defamatory, or violates any law</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              Violations may result in account suspension or termination without notice.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Platform Content</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by Joint and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">User-Submitted Content</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You retain ownership of content you submit to the Service (posts, profiles, scripts, media). By submitting content, you grant Joint a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display your content for the purpose of operating and improving the Service.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              You represent and warrant that you have all necessary rights to submit the content and grant us this license.
            </p>
          </section>

          {/* Account Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Account Termination</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Voluntary Termination</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You may close your account at any time through account settings or by contacting us at{' '}
              {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
              <a href="mailto:support@joint-networking" className="text-[#0CCE6B] hover:underline">
                support@joint-networking
              </a>.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Before deleting your account, you may export your data (feature planned). Account deletion is permanent and irreversible.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Suspension or Termination by Us</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We reserve the right to suspend or terminate your account if you:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>Violate these Terms or our policies</li>
              <li>Engage in prohibited conduct</li>
              <li>Pose a security risk to the Service or other users</li>
              <li>Provide false or misleading information</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              We may terminate accounts with or without notice, at our sole discretion. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          {/* Data Portability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Data Portability & Deletion</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Export Your Data:</strong> Request a machine-readable copy of your account data (feature planned: <code className="bg-neutral-100 px-2 py-1 rounded text-sm">POST /api/account/export</code>)</li>
              <li><strong>Delete Your Account:</strong> Permanently delete your account and associated data (feature planned: <code className="bg-neutral-100 px-2 py-1 rounded text-sm">DELETE /api/account</code>)</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              See our <Link to="/legal/privacy" className="text-[#0CCE6B] hover:underline">Privacy Policy</Link> for detailed information on data handling and retention.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Limitation of Liability</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOINT SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, revenue, data, or use</li>
              <li>Interruption of business or service outages</li>
              <li>Any damages arising from your use or inability to use the Service</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="text-neutral-700 leading-relaxed mt-4">
              We do not guarantee that the Service will be uninterrupted, secure, or error-free. Your use of the Service is at your sole risk.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Indemnification</h2>
            <p className="text-neutral-700 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Joint, its affiliates, officers, directors, employees, and agents from any claims, damages, liabilities, costs, or expenses (including reasonable attorneys' fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2 mt-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another person or entity</li>
              <li>Content you submit to the Service</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Dispute Resolution</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              If you have any concerns or disputes, please contact us first at{' '}
              {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
              <a href="mailto:support@joint-networking" className="text-[#0CCE6B] hover:underline">
                support@joint-networking
              </a>
              {' '}to attempt to resolve the issue informally.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Any disputes that cannot be resolved informally will be subject to binding arbitration or litigation as determined by applicable law in the jurisdiction specified in the "Governing Law" section.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Changes to Terms</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We reserve the right to modify these Terms at any time. Changes will be documented in our{' '}
              <a href="https://github.com/gcolon75/Project-Valine/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-[#0CCE6B] hover:underline">
                CHANGELOG
              </a>
              {' '}with version numbers.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We will notify you of material changes via email or prominent notice on the platform. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              If you do not agree with the new Terms, you must stop using the Service and may delete your account.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Governing Law</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              <strong>Note:</strong> Specific jurisdiction and venue details (state, court) to be determined and added in formal legal review.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Severability</h2>
            <p className="text-neutral-700 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
          </section>

          {/* Entire Agreement */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Entire Agreement</h2>
            <p className="text-neutral-700 leading-relaxed">
              These Terms, together with our <Link to="/legal/privacy" className="text-[#0CCE6B] hover:underline">Privacy Policy</Link> and <Link to="/legal/cookies" className="text-[#0CCE6B] hover:underline">Cookie Disclosure</Link>, constitute the entire agreement between you and Joint regarding the use of the Service, superseding any prior agreements.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Contact Information</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none text-neutral-700 space-y-2">
              <li>
                <strong>Email:</strong>{' '}
                {/* TODO: replace with full domain once confirmed, e.g. support@joint-networking.com */}
                <a href="mailto:support@joint-networking" className="text-[#0CCE6B] hover:underline">
                  support@joint-networking
                </a>
              </li>
              <li>
                <strong>Legal Inquiries:</strong>{' '}
                {/* TODO: replace with full domain once confirmed, e.g. legal@joint-networking.com */}
                <a href="mailto:legal@joint-networking" className="text-[#0CCE6B] hover:underline">
                  legal@joint-networking
                </a>
              </li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Legal Disclaimer</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              This is a minimum viable terms of service (MVP) designed to establish a baseline for legal compliance. This document has not been reviewed by legal counsel and is subject to revision. For production use, we recommend formal legal review and jurisdiction-specific customization.
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
