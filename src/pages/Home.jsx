import { Sparkles, ArrowRight, Mic, Users, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      
      {/* Hero Section */}
      <section className="relative px-4 py-20 md:py-32 animate-fade-in">
        <div className="max-w-6xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 rounded-full mb-8 animate-slide-up">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              The Professional Network for Voice Actors
            </span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Connect. Create. Collaborate.
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Project Valine is where voice actors, writers, and artists come together to share their work, find opportunities, and build their careers.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/join"
              className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/about"
              className="w-full sm:w-auto bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-8 py-4 rounded-lg font-semibold text-lg border-2 border-neutral-200 dark:border-neutral-700 transition-all duration-200 hover:scale-105"
            >
              Learn More
            </Link>
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
      <section className="px-4 py-20 bg-gradient-to-r from-blue-600 via-emerald-600 to-blue-600 animate-slide-up">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to join the community?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Sign up now and start connecting with talented artists.
          </p>
          <Link
            to="/join"
            className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 bg-neutral-900 dark:bg-black">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Project Valine</h3>
            <p className="text-neutral-400 text-sm">
              The professional network for voice actors and creative artists.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-neutral-400 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-neutral-400 text-sm">
              <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/community" className="hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-neutral-400 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-neutral-800 text-center text-neutral-400 text-sm">
          <p>&copy; 2025 Project Valine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <div 
    className="bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
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
