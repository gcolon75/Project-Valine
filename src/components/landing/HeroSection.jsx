import { Sparkles, ArrowRight, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section id="hero" className="relative px-4 py-16 md:py-20 lg:py-24 overflow-hidden">
      {/* Background Pattern - Light mode only */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-[#0CCE6B]/5" aria-hidden="true" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#0CCE6B]/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#474747]/5 rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Sidebar: Stats Cards */}
          <div className="lg:col-span-2 order-1">
            <div className="space-y-4 lg:sticky lg:top-24">
              <StatCard number="10K+" label="Artists" delay="0s" />
              <StatCard number="50K+" label="Posts" delay="0.1s" />
              <StatCard number="5K+" label="Projects" delay="0.2s" />
            </div>
          </div>

          {/* Main Content: Text + Hero Image */}
          <div className="lg:col-span-8 order-2">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              
              {/* Text Content */}
              <div>
                <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-6 animate-slide-up">
                  <Sparkles className="w-4 h-4 text-[#0CCE6B]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[#0CCE6B]">
                    The Professional Network for Voice Actors
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] bg-clip-text text-transparent animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  Connect. Create. Collaborate.
                </h1>
                
                <p className="text-lg md:text-xl text-neutral-600 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  Project Valine is where voice actors, writers, and artists come together to share their work, find opportunities, and build their careers.
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <Link
                    to="/join"
                    className="group bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                    aria-label="Get started with a free account"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Link>
                  <a
                    href="#about"
                    className="bg-white hover:bg-neutral-50 text-neutral-900 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-neutral-200 transition-all duration-200 hover:scale-105"
                    aria-label="Learn more about Project Valine"
                  >
                    Learn More
                  </a>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50">
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#474747]/10 to-[#0CCE6B]/10 flex items-center justify-center">
                    <Mic className="w-32 h-32 text-[#0CCE6B]/30" aria-hidden="true" />
                  </div>
                </div>
                
                {/* Floating "New!" badge */}
                <div className="absolute -top-6 -left-6 bg-white rounded-lg shadow-lg p-3 animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">New!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Trending */}
          <div className="lg:col-span-2 order-3">
            <div className="lg:sticky lg:top-24">
              <TrendingCard delay="0.3s" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Stat Card Component
const StatCard = ({ number, label, delay }) => (
  <div 
    className="bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <p className="text-3xl font-bold text-[#0CCE6B] mb-1">{number}</p>
    <p className="text-xs text-neutral-600 font-medium">{label}</p>
  </div>
);

// Trending Card Component
const TrendingCard = ({ delay }) => (
  <div 
    className="bg-gradient-to-br from-[#0CCE6B] to-[#0BBE60] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-center space-x-2 mb-3">
      <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
      <h2 className="text-white font-bold text-lg">Trending Now</h2>
    </div>
    <p className="text-white/90 text-sm mb-4">
      Join thousands of voice actors sharing their latest projects and reels.
    </p>
    <Link 
      to="/reels"
      className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      aria-label="Explore trending reels"
    >
      <span>Explore Reels</span>
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  </div>
);

export default HeroSection;
