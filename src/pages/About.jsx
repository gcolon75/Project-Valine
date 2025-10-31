import { Link } from 'react-router-dom';
import { Sparkles, Target, Users, Zap, ArrowRight, Mic, Twitter, Linkedin, Github } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const About = () => {
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
              <Link to="/about-us" className="text-[#0CCE6B] font-medium">
                About
              </Link>
              <Link to="/features" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                Features
              </Link>
              <ThemeToggle />
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
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
            </div>
          </div>
        </div>
      </header>

      {/* Add padding to body so content doesn't hide under fixed header */}
      <div className="pt-20">

      {/* Hero */}
      <section className="px-4 py-20 md:py-32 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
            <span className="text-sm font-medium text-[#0CCE6B]">
              About Project Valine
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-neutral-900 dark:text-white">
            Empowering voice actors and creative artists
          </h1>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
            Project Valine is a professional networking platform designed specifically for the voice acting community. We bring together artists, writers, and creators to collaborate, share, and grow together.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 py-20 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <ValueCard
            icon={Target}
            title="Our Mission"
            description="To create the premier platform where voice actors can connect, collaborate, and find opportunities."
          />
          <ValueCard
            icon={Users}
            title="Our Community"
            description="A diverse network of talented artists, from beginners to industry veterans, all supporting each other."
          />
          <ValueCard
            icon={Zap}
            title="Our Promise"
            description="To provide the tools and connections you need to take your voice acting career to the next level."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] rounded-3xl p-12 shadow-2xl animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of voice actors already on Project Valine
          </p>
          <Link
            to="/join"
            className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-[#474747] px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      </div>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] dark:bg-black border-t border-neutral-800 mt-20">
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
                <li><Link to="/about-us" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">About</Link></li>
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

const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 text-center">
    <div className="w-16 h-16 bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-[#0CCE6B]" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-white">{title}</h3>
    <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
  </div>
);

export default About;
