import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sparkles, Mic, Code, Twitter, Linkedin, Github } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: API call when backend is deployed
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // DEV BYPASS
  const handleDevLogin = () => {
    toast.success('Dev mode: Logged in!');
    // Set mock user data in localStorage
    localStorage.setItem('dev_user', JSON.stringify({
      id: 'dev-user-123',
      username: 'developer',
      email: 'dev@valine.com',
      displayName: 'Dev User',
      avatar: 'https://i.pravatar.cc/150?img=68'
    }));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-[#1a1a1a] dark:to-neutral-950">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-lg border-b border-neutral-200/50 dark:border-neutral-700/50 shadow-sm">
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

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/about" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                About
              </Link>
              <Link to="/features" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                Features
              </Link>
              {/* Theme Toggle */}
              <ThemeToggle />
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
              <Link
                to="/join"
                className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20 flex items-center justify-center px-4 py-12 min-h-screen">
        <div className="w-full max-w-md animate-fade-in">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
              <span className="text-sm font-medium text-[#0CCE6B]">
                Welcome back
              </span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              Sign in to your account
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Continue your journey with Project Valine
            </p>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                required
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="password"
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] transition-all"
              />
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-[#0CCE6B] hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* DEV MODE BUTTON */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={handleDevLogin}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Code className="w-5 h-5" />
                <span>Dev Login (Bypass Auth)</span>
              </button>
              <p className="text-xs text-neutral-500 dark:text-neutral-600 text-center mt-2">
                Development mode only - bypasses authentication
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-neutral-600 dark:text-neutral-400 text-sm">
            Don't have an account?{' '}
            <Link to="/join" className="text-[#0CCE6B] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] dark:bg-black border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            
            {/* Brand Column */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">
                  Project Valine
                </span>
              </div>
              <p className="text-neutral-400 text-sm mb-4 max-w-sm">
                The professional network for voice actors and creative artists. Connect, collaborate, and grow your career.
              </p>
              <div className="flex items-center space-x-4">
                <a href="#" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">About</Link></li>
                <li><Link to="/features" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Pricing</Link></li>
                <li><Link to="/changelog" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Changelog</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Help Center</Link></li>
                <li><Link to="/community" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Community</Link></li>
                <li><Link to="/blog" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Blog</Link></li>
                <li><Link to="/status" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-neutral-500 text-sm">
              &copy; 2025 Project Valine. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <Link to="/privacy" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Privacy</Link>
              <Link to="/terms" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Terms</Link>
              <Link to="/cookies" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
