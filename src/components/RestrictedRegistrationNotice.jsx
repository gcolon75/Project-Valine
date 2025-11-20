import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

/**
 * RestrictedRegistrationNotice
 * 
 * Displays a friendly message when registration is restricted to allowlisted emails.
 * Shows when a non-allowlisted user attempts to access the /join route.
 */
const RestrictedRegistrationNotice = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full animate-fade-in">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Message Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">
            Registration is Restricted
          </h1>
          
          <p className="text-neutral-600 mb-6 leading-relaxed">
            This platform currently has restricted access. Only pre-approved accounts may register and sign in.
          </p>

          <p className="text-sm text-neutral-500 mb-8">
            If you believe you should have access, please contact the administrator.
          </p>

          {/* Action Button */}
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 shadow-md focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
          >
            <Home className="w-5 h-5" />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Footer Link */}
        <p className="mt-6 text-center text-neutral-600 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#0CCE6B] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RestrictedRegistrationNotice;
