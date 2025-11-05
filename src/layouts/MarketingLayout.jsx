import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Mic, Twitter, Linkedin, Github } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * MarketingLayout - Forces light mode for all marketing pages
 * Provides shared header/footer for /, /about-us, /features, /join, /login
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
      // Only restore if user had a different preference before
      if (previousTheme !== 'light' && previousTheme !== theme) {
        setTheme(previousTheme);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine active nav item
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
      
      {/* Shared Header - Light mode only on marketing pages */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                Project Valine
              </span>
            </Link>

            {/* Navigation - Light mode only, no theme toggle on marketing */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                to="/about-us" 
                className={`transition-colors ${
                  isActive('/about-us') || isActive('/about') 
                    ? 'text-[#0CCE6B] font-medium' 
                    : 'text-neutral-600 hover:text-[#0CCE6B]'
                }`}
              >
                About
              </Link>
              <Link 
                to="/features" 
                className={`transition-colors ${
                  isActive('/features') 
                    ? 'text-[#0CCE6B] font-medium' 
                    : 'text-neutral-600 hover:text-[#0CCE6B]'
                }`}
              >
                Features
              </Link>
            </nav>

            {/* CTA Buttons - Single primary CTA */}
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-neutral-600 hover:text-[#0CCE6B] font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/join"
                className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-md"
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

      {/* Shared Footer */}
      <footer className="border-t border-neutral-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                  Project Valine
                </span>
              </Link>
              <p className="text-sm text-neutral-600 max-w-xs">
                The professional networking platform for voice actors and creative artists.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><Link to="/features" className="hover:text-[#0CCE6B] transition-colors">Features</Link></li>
                <li><Link to="/about-us" className="hover:text-[#0CCE6B] transition-colors">About</Link></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-3">Connect</h3>
              <div className="flex items-center space-x-3">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" 
                   className="w-8 h-8 bg-neutral-100 hover:bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center transition-colors"
                   aria-label="Twitter">
                  <Twitter className="w-4 h-4 text-neutral-600" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" 
                   className="w-8 h-8 bg-neutral-100 hover:bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center transition-colors"
                   aria-label="LinkedIn">
                  <Linkedin className="w-4 h-4 text-neutral-600" />
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
                   className="w-8 h-8 bg-neutral-100 hover:bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center transition-colors"
                   aria-label="GitHub">
                  <Github className="w-4 h-4 text-neutral-600" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600">
            &copy; {new Date().getFullYear()} Project Valine. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
