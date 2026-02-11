import { Link } from 'react-router-dom';
import { Sparkles, Target, Users, Zap, ArrowRight } from 'lucide-react';

const About = () => {
  return (
    <>

      {/* Hero */}
      <section className="px-4 py-20 md:py-32 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-[#0CCE6B]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#0CCE6B]">
              About Joint
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-neutral-900">
            Built for everyone making things in entertainment
          </h1>
          
          <p className="text-xl text-neutral-600 mb-8">
            Joint is where entertainment creators connect—actors, producers, directors, writers, agents, and everyone in between. Share your work, find collaborators, and grow your career.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 py-20 bg-white/50 backdrop-blur-sm border-y border-neutral-200">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
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
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] rounded-3xl p-12 shadow-2xl animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join the community and start building
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

const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 text-center shadow-sm">
    <div className="w-16 h-16 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-[#0CCE6B]" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-neutral-600">{description}</p>
  </div>
);

export default About;
