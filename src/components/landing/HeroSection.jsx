import { Sparkles, ArrowRight, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section id="hero" className="relative px-4 py-16 md:py-20 overflow-hidden" aria-labelledby="hero-heading">
      {/* Background Pattern - Light mode only */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-[#0CCE6B]/5" aria-hidden="true" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#0CCE6B]/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#474747]/5 rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Centered Main Content */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-6 animate-slide-up">
            <Sparkles className="w-4 h-4 text-[#0CCE6B]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#0CCE6B]">
              Where entertainment talent connects
            </span>
          </div>
          
          <h1 id="hero-heading" className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] bg-clip-text text-transparent animate-slide-up max-w-4xl pb-2 leading-tight" style={{ animationDelay: '0.1s' }}>
            Showcase your work. Connect with artists. Collaborate and grow.
          </h1>

          {/* Subtitle Text - Below Main Title */}
          <p className="text-lg md:text-xl text-neutral-600 mb-8 animate-slide-up max-w-3xl text-center" style={{ animationDelay: '0.2s' }}>
            Actors, Writers, Influencers, Musicians, and Producers… Joint Networking is a safe and secure platform to collaborate with other artists. Co-created by Justin Valine and Gabriel Colon, Joint Networking is a site focused on connecting people that are interested or are currently working in entertainment. Joint Networking allows you to showcase your work, earn insightful feedback from real industry professionals, and share your media with exclusive privacy.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up mb-12" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/join"
              className="group bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
              aria-label="Sign up for a free account"
            >
              <span>Join for Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
            <a
              href="#about"
              className="bg-white hover:bg-neutral-50 text-neutral-900 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-neutral-200 transition-all duration-200 hover:scale-105"
              aria-label="Learn more about Joint"
            >
              Learn More
            </a>
          </div>

          {/* Hero Visual - Centered */}
          <div className="relative animate-slide-up max-w-2xl w-full" style={{ animationDelay: '0.4s' }}>
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

        {/* Stats Cards Below - Centered in a Row */}
        <div className="flex flex-wrap justify-center gap-6 mt-16 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <StatCard number="10K+" label="Creators" delay="0s" />
          <StatCard number="50K+" label="Posts" delay="0.1s" />
          <StatCard number="5K+" label="Projects" delay="0.2s" />
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
    role="region"
    aria-label={`${label} statistic`}
  >
    <p className="text-3xl font-bold text-[#0CCE6B] mb-1" aria-label={`${number} ${label}`}>{number}</p>
    <p className="text-xs text-neutral-600 font-medium">{label}</p>
  </div>
);

export default HeroSection;
