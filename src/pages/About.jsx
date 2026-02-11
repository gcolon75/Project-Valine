import { Link } from 'react-router-dom';
import { Sparkles, Target, Users, Zap, ArrowRight } from 'lucide-react';

const About = () => {
  return (
    <>

      {/* Hero */}
      <section className="px-4 py-24 md:py-32 lg:py-40 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-[#0CCE6B]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#0CCE6B]">
              About Joint
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-neutral-900 leading-tight">
            Built for everyone making things in entertainment
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Joint is where entertainment creators connect—actors, producers, directors, writers, agents, and everyone in between. Share your work, find collaborators, and grow your career.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 md:px-6 lg:px-8 py-24 md:py-32 bg-white/50 backdrop-blur-sm border-y border-neutral-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Why we exist
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Built by creators, for creators—helping you connect and grow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
            <ValueCard
              icon={Target}
              title="Our Mission"
              description="Connect everyone in entertainment and help them find their next opportunity—no matter what they do or where they're starting from."
            />
            <ValueCard
              icon={Users}
              title="Our Community"
              description="Real people at every stage—just starting out, mid-career, veterans—all here to support and learn from each other."
            />
            <ValueCard
              icon={Zap}
              title="Our Promise"
              description="Give you the tools and connections to take your entertainment career to the next level—whatever that looks like for you."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 md:px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] rounded-3xl p-8 md:p-12 lg:p-16 shadow-2xl animate-slide-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the community and start building
          </p>
          <Link
            to="/join"
            className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-[#474747] px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl min-h-[44px]"
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

const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="group bg-white p-8 rounded-2xl border border-neutral-200 hover:border-[#0CCE6B]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out text-center shadow-sm motion-reduce:transition-none motion-reduce:hover:transform-none">
    <div className="w-16 h-16 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#0CCE6B]/20 transition-colors duration-300">
      <Icon className="w-8 h-8 text-[#0CCE6B] group-hover:scale-110 transition-transform duration-300 motion-reduce:transition-none motion-reduce:group-hover:transform-none" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-base text-neutral-600 leading-relaxed">{description}</p>
  </div>
);

export default About;
