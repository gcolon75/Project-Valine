import { Sparkles, ArrowRight, Mic, Users, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <>
      
      {/* Hero Section with Background - Updated layout: stat cards moved to sides */}
      <section className="relative px-4 py-20 md:py-32 animate-fade-in overflow-hidden">
        {/* Background Pattern - Light mode only */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-[#0CCE6B]/5" aria-hidden="true" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#0CCE6B]/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#474747]/5 rounded-full blur-3xl" aria-hidden="true" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Desktop: Three column layout with side cards. Mobile: Stack vertically */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
            
            {/* Left Sidebar: Stats Cards (Desktop) - Hidden on mobile, shown above content */}
            <div className="lg:col-span-2 order-1 lg:order-1">
              <div className="space-y-4 lg:sticky lg:top-24">
                <StatCard number="10K+" label="Artists" delay="0s" />
                <StatCard number="50K+" label="Posts" delay="0.1s" />
                <StatCard number="5K+" label="Projects" delay="0.2s" />
              </div>
            </div>

            {/* Main Content: Text + Hero Image */}
            <div className="lg:col-span-8 order-2 lg:order-2">
              <div className="grid md:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
                
                {/* Text Content */}
                <div>
                  <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-8 animate-slide-up">
                    <Sparkles className="w-4 h-4 text-[#0CCE6B]" aria-hidden="true" />
                    <span className="text-sm font-medium text-[#0CCE6B]">
                      Scripts, auditions, and creative collaboration
                    </span>
                  </div>
                  
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] bg-clip-text text-transparent animate-slide-up pb-2 leading-tight" style={{ animationDelay: '0.1s' }}>
                    Connect. Create. Collaborate.
                  </h1>
                  
                  <p className="text-xl text-neutral-600 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    Find scripts, auditions, and collaborators, then share voice work, music, and other creative projects.
                  </p>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <Link
                      to="/join"
                      className="group bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                      aria-label="Sign up for a free account"
                    >
                      <span>Sign up</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/about"
                      className="bg-white hover:bg-neutral-50 text-neutral-900 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-neutral-200 transition-all duration-200 hover:scale-105"
                      aria-label="Learn more about Joint"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>

                {/* Hero Image */}
                <div className="relative animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50">
                    {/* Placeholder Hero Image */}
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

            {/* Right Sidebar: Trending/Featured Content (Desktop) */}
            <div className="lg:col-span-2 order-3 lg:order-3">
              <div className="lg:sticky lg:top-24">
                <TrendingCard delay="0.3s" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-neutral-900 animate-slide-up">
            Everything you need to succeed
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-neutral-900">
            Loved by artists everywhere
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <Testimonial
              quote="Joint has completely changed how I connect with other voice actors. It's the perfect platform for collaboration."
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
            aria-label="Create a free account"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

    </>
  );
};

// Stat Card Component - Used in hero sidebar
const StatCard = ({ number, label, delay }) => (
  <div 
    className="bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <p className="text-3xl font-bold text-[#0CCE6B] mb-1">{number}</p>
    <p className="text-xs text-neutral-600 font-medium">{label}</p>
  </div>
);

// Trending Card Component - Used in hero right sidebar
const TrendingCard = ({ delay }) => (
  <div 
    className="bg-gradient-to-br from-[#0CCE6B] to-[#0BBE60] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 animate-slide-up"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-center space-x-2 mb-3">
      <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
      <h3 className="text-white font-bold text-lg">Trending Now</h3>
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

// Feature Card Component - with improved depth and separation
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <div 
    className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 animate-slide-up shadow-sm"
    style={{ animationDelay: delay }}
  >
    <div className="w-12 h-12 bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-[#0CCE6B]" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-neutral-600">{description}</p>
  </div>
);

// Testimonial Component - with improved depth
const Testimonial = ({ quote, author, role, avatar, delay }) => (
  <div 
    className="bg-white p-6 rounded-2xl border border-neutral-200 hover:shadow-lg transition-all duration-200 animate-slide-up shadow-sm"
    style={{ animationDelay: delay }}
  >
    <p className="text-neutral-700 mb-4 italic">"{quote}"</p>
    <div className="flex items-center space-x-3">
      <img src={avatar} alt={`${author}, ${role}`} className="w-12 h-12 rounded-full" />
      <div>
        <p className="font-semibold text-neutral-900">{author}</p>
        <p className="text-sm text-neutral-600">{role}</p>
      </div>
    </div>
  </div>
);

export default Home;
