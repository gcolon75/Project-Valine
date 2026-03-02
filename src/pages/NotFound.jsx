import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Mic } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-[#1a1a1a] dark:to-neutral-950">
      
      {/* Marketing Header (NOT Dashboard header) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-lg border-b border-neutral-200/50 dark:border-neutral-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                Joint
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/about-us" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                About
              </Link>
              <Link to="/features" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                Features
              </Link>
              <ThemeToggle />
            </nav>

            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/join"
                    className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 404 Content */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-20">
        <div className="text-center animate-fade-in">
          {/* Large 404 */}
          <h1 className="text-9xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent mb-4">
            404
          </h1>
          
          {/* Message */}
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              className="flex items-center space-x-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
            >
              <Home className="w-5 h-5" />
              <span>{isAuthenticated ? "Go to Dashboard" : "Go Home"}</span>
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 bg-white dark:bg-[#1a1a1a] hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-white px-6 py-3 rounded-lg font-semibold border-2 border-neutral-200 dark:border-neutral-700 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
