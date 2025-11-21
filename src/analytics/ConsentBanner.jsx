/**
 * Analytics Consent Banner Component
 * Privacy-first consent UI for analytics tracking
 */

import React, { useState, useEffect } from 'react';
import { shouldShowConsentBanner, setConsent, hasConsent } from './client';
import { trackPageView } from './client';

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Check if banner should be shown
    const checkBanner = async () => {
      const shouldShow = shouldShowConsentBanner();
      setShowBanner(shouldShow);
    };
    
    checkBanner();
  }, []);
  
  const handleAccept = () => {
    setConsent(true);
    setShowBanner(false);
    
    // Track initial page view after accepting consent
    trackPageView(window.location.pathname);
  };
  
  const handleDecline = () => {
    setConsent(false);
    setShowBanner(false);
  };
  
  if (!showBanner) {
    return null;
  }
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50"
      role="dialog"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-description"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 id="consent-banner-title" className="font-semibold mb-1">
            Help improve Joint
          </h3>
          <p id="consent-banner-description" className="text-sm text-gray-300">
            Help improve Joint by allowing anonymous usage analytics. No personal data collected.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            aria-label="Decline analytics tracking"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            aria-label="Accept analytics tracking"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
