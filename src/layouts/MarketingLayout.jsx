import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Mic } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import MarketingFooter from '../components/MarketingFooter';
import MetaInjector from '../seo/MetaInjector';
import StructuredData from '../seo/StructuredData';

/**
 * MarketingLayout - Forces light mode for all marketing pages
 * Provides shared header/footer with anchor navigation support
 * Prevents theme flicker by setting light mode before first render
 */
export default function MarketingLayout() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  
  // Force light mode on marketing pages and restore on unmount
  useEffect(() => {
    // Store the theme that was active when we entered marketing
    const storedTheme = localStorage.getItem('theme');
    const previousTheme = storedTheme || 'light';
    
    // Ensure light mode is active (may already be set by index.html pre-hydration script)
    if (theme !== 'light') {
      setTheme('light');
    }
    
    // Restore previous theme when leaving marketing pages
    return () => {
      // Only restore if user had a different preference before (not light)
      if (previousTheme !== 'light') {
        setTheme(previousTheme);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Enable smooth scrolling for anchor links
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  // Determine active nav item (supports both routes and hash)
  const isActive = (path) => {
    if (path.startsWith('#')) {
      return location.hash === path;
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
      {/* SEO Components - Inject metadata and structured data */}
      <MetaInjector />
      <StructuredData />
      
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#0CCE6B] text-white px-4 py-2 rounded-lg font-semibold z-[100] focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      
      {/* Shared Header - Light mode only on marketing pages */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded">
              <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                Project Valine
              </span>
            </Link>

            {/* Navigation - Anchor links for landing page */}
            <nav className="hidden md:flex items-center space-x-8" aria-label="Main navigation">
              <a 
                href="/#features" 
                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded ${
                  isActive('#features') 
                    ? 'text-[#0CCE6B] font-medium' 
                    : 'text-neutral-600 hover:text-[#0CCE6B]'
                }`}
              >
                Features
              </a>
              <a 
                href="/#about" 
                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded ${
                  isActive('#about') 
                    ? 'text-[#0CCE6B] font-medium' 
                    : 'text-neutral-600 hover:text-[#0CCE6B]'
                }`}
              >
                About
              </a>
              <a 
                href="/#faq" 
                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded ${
                  isActive('#faq') 
                    ? 'text-[#0CCE6B] font-medium' 
                    : 'text-neutral-600 hover:text-[#0CCE6B]'
                }`}
              >
                FAQ
              </a>
            </nav>

            {/* CTA Buttons - Single primary CTA */}
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-neutral-600 hover:text-[#0CCE6B] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded"
              >
                Sign In
              </Link>
              <Link
                to="/join"
                className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-md focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Add padding to body so content doesn't hide under fixed header */}
      <div className="pt-20">
        <Outlet />
      </div>

      {/* Shared Footer - New 4-column layout */}
      <MarketingFooter />
    </div>
  );
}
