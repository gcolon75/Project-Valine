import { Link } from 'react-router-dom';
import { Mic, Twitter, Linkedin, Github, Mail } from 'lucide-react';

const MarketingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        {/* Main Footer Grid - 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Product Column */}
          <nav aria-labelledby="footer-product">
            <h3 id="footer-product" className="font-semibold text-neutral-900 mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <a href="#features" className="hover:text-[#0CCE6B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded">
                  Features
                </a>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Changelog
                </span>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Roadmap
                </span>
              </li>
            </ul>
          </nav>

          {/* Resources Column */}
          <nav aria-labelledby="footer-resources">
            <h3 id="footer-resources" className="font-semibold text-neutral-900 mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Documentation
                </span>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Support
                </span>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#0CCE6B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded">
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          {/* Company Column */}
          <nav aria-labelledby="footer-company">
            <h3 id="footer-company" className="font-semibold text-neutral-900 mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <a href="#about" className="hover:text-[#0CCE6B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded">
                  About
                </a>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Contact
                </span>
              </li>
            </ul>
          </nav>

          {/* Legal Column */}
          <nav aria-labelledby="footer-legal">
            <h3 id="footer-legal" className="font-semibold text-neutral-900 mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <Link to="/legal/privacy" className="hover:text-[#0CCE6B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className="hover:text-[#0CCE6B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2 rounded">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-200 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                  Project Valine
                </span>
              </Link>
            </div>

            {/* Copyright */}
            <div className="text-sm text-neutral-600">
              &copy; {currentYear} Project Valine. All rights reserved.
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-3">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 bg-neutral-100 hover:bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="w-4 h-4 text-neutral-600" aria-hidden="true" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 bg-neutral-100 hover:bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-neutral-600" aria-hidden="true" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 bg-neutral-100 hover:bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
                aria-label="View our GitHub"
              >
                <Github className="w-4 h-4 text-neutral-600" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
