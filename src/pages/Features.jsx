import { Link } from 'react-router-dom';
import { Mic, Users, FileText, Video, MessageCircle, Search, Award, Shield, Zap, Github, Twitter, Linkedin } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Features = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-[#1a1a1a] dark:to-neutral-950">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-lg border-b border-neutral-200/50 dark:border-neutral-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                Project Valine
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/about-us" className="text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors">
                About
              </Link>
              <Link to="/features" className="text-[#0CCE6B] font-medium">
                Features
              </Link>
              <ThemeToggle />
            </nav>

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

      {/* Content */}
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero */}
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4 text-[#0CCE6B]" />
              <span className="text-sm font-medium text-[#0CCE6B]">
                All Features
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent mb-6">
              Everything You Need to Succeed
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Project Valine provides voice actors with powerful tools to connect, collaborate, and grow their careers.
            </p>
          </div>

          {/* Main Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <FeatureCard
              icon={Users}
              title="Professional Networking"
              description="Connect with voice actors, writers, audio engineers, and other creative professionals in the industry."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={Video}
              title="Reels & Stories"
              description="Share short-form videos showcasing your work, behind-the-scenes content, and creative process."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={FileText}
              title="Script Sharing"
              description="Share and collaborate on scripts with writers and other voice actors for auditions and projects."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Direct Messaging"
              description="Communicate with your connections through our built-in messaging system for collaborations."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={Search}
              title="Discover Talent"
              description="Find and connect with talented artists, discover new opportunities, and expand your network."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={Award}
              title="Portfolio Showcase"
              description="Build your professional portfolio with posts, reels, and scripts to showcase your best work."
              color="from-[#474747] to-[#0CCE6B]"
            />
          </div>

          {/* Additional Features */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-3xl p-12 mb-20">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-12 text-center">
              More Features
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <FeatureItem
                icon={Shield}
                title="Privacy Controls"
                description="Full control over who sees your content and who can connect with you."
              />
              <FeatureItem
                icon={Mic}
                title="Audio Samples"
                description="Upload and share audio samples of your voice work directly in posts."
              />
              <FeatureItem
                icon={Users}
                title="Connection Requests"
                description="Send and manage connection requests to build your professional network."
              />
              <FeatureItem
                icon={MessageCircle}
                title="Comments & Engagement"
                description="Engage with the community through likes, comments, and shares."
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of voice actors on Project Valine today
            </p>
            <Link
              to="/join"
              className="inline-block bg-white hover:bg-neutral-100 text-[#474747] px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-xl"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] dark:bg-black border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Project Valine</span>
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
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about-us" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">About</Link></li>
                <li><Link to="/features" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="text-neutral-400 hover:text-[#0CCE6B] transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-neutral-800 text-center text-neutral-400 text-sm">
            <p>&copy; 2025 Project Valine. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-2 transition-all">
    <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-6`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
      {title}
    </h3>
    <p className="text-neutral-600 dark:text-neutral-400">
      {description}
    </p>
  </div>
);

// Feature Item Component
const FeatureItem = ({ icon: Icon, title, description }) => (
  <div className="flex space-x-4">
    <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h4>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm">
        {description}
      </p>
    </div>
  </div>
);

export default Features;
