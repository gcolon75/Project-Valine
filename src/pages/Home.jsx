import { Sparkles, ArrowRight, Mic, Users, FileText, Twitter, Linkedin, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
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
              <Link to="/about-us" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
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
                className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Add padding to body so content doesn't hide under fixed header */}
      <div className="pt-20">
      
      {/* Hero Section with Background */}
      <section className="relative px-4 py-20 md:py-32 animate-fade-in overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-[#0CCE6B]/5 dark:from-neutral-950 dark:via-[#1a1a1a] dark:to-[#0CCE6B]/10" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#0CCE6B]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#474747]/5 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Text Content */}
            <div>
              <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 px-4 py-2 rounded-full mb-8 animate-slide-up">
                <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
                <span className="text-sm font-medium text-[#0CCE6B]">
                  The Professional Network for Voice Actors
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] bg-clip-text text-transparent animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Connect. Create. Collaborate.
              </h1>
              
              <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Project Valine is where voice actors, writers, and artists come together to share their work, find opportunities, and build their careers.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <Link
                  to="/join"
                  className="group bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/about"
                  className="bg-white dark:bg-[#1a1a1a] hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-white px-8 py-4 rounded-lg font-semibold text-lg border-2 border-neutral-200 dark:border-neutral-700 transition-all duration-200 hover:scale-105"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 dark:border-neutral-800/50">
                {/* Placeholder Hero Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-[#474747]/10 to-[#0CCE6B]/10 flex items-center justify-center">
                  <Mic className="w-32 h-32 text-[#0CCE6B]/30" />
                </div>
                
                {/* Overlay with stats */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-sm rounded-lg p-4 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#0CCE6B]">10K+</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Artists</p>
                  </div>
                  <div className="text-center border-x border-neutral-200 dark:border-neutral-700">
                    <p className="text-2xl font-bold text-[#0CCE6B]">50K+</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#0CCE6B]">5K+</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Projects</p>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-6 -left-6 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg p-3 animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">New!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-neutral-900 dark:text-white animate-slide-up">
            Everything you need to succeed
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Connect with Artists"
              description="Build your professional network and discover talented voice actors, writers, and artists in the community."
              delay="0s"
            />
            <FeatureCard
              icon={FileText}
              title="Share Your Work"
              description="Showcase your portfolio, share scripts, and collaborate on exciting projects with other creatives."
              delay="0.1s"
            />
            <FeatureCard
              icon={Mic}
              title="Find Opportunities"
              description="Discover auditions, casting calls, and collaborative opportunities tailored to your skills."
              delay="0.2s"
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-neutral-900 dark:text-white">
            Loved by artists everywhere
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Testimonial
              quote="Project Valine has completely changed how I connect with other voice actors. It's the perfect platform for collaboration."
              author="Sarah Johnson"
              role="Voice Actor"
              avatar="https://i.pravatar.cc/150?img=1"
              delay="0s"
            />
            <Testimonial
              quote="Finally, a platform built specifically for our community. I've found amazing opportunities and made great connections."
              author="Michael Chen"
              role="Audio Engineer"
              avatar="https://i.pravatar.cc/150?img=12"
              delay="0.1s"
            />
            <Testimonial
              quote="The best place to showcase my work and find talented artists to collaborate with. Highly recommended!"
              author="Emily Rodriguez"
              role="Script Writer"
              avatar="https://i.pravatar.cc/150?img=5"
              delay="0.2s"
            />
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 py-20 bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] animate-slide-up">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to join the community?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Sign up now and start connecting with talented artists.
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
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <div 
    className="bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <div className="w-12 h-12 bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-[#0CCE6B]" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-white">{title}</h3>
    <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
  </div>
);

// Testimonial Component
const Testimonial = ({ quote, author, role, avatar, delay }) => (
  <div 
    className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <p className="text-neutral-700 dark:text-neutral-300 mb-4 italic">"{quote}"</p>
    <div className="flex items-center space-x-3">
      <img src={avatar} alt={author} className="w-12 h-12 rounded-full" />
      <div>
        <p className="font-semibold text-neutral-900 dark:text-white">{author}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{role}</p>
      </div>
    </div>
  </div>
);

export default Home;
