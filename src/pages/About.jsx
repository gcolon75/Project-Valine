import { Link } from 'react-router-dom';
import { Sparkles, Target, Users, Zap, ArrowRight } from 'lucide-react';

const About = () => {
  return (
    <>

      {/* Hero */}
      <section className="px-4 py-20 md:py-32 animate-fade-in">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-[#0CCE6B]" />
            <span className="text-sm font-medium text-[#0CCE6B]">
              About Project Valine
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-neutral-900">
            Empowering voice actors and creative artists
          </h1>
          
          <p className="text-xl text-neutral-600 mb-8">
            Project Valine is a professional networking platform designed specifically for the voice acting community. We bring together artists, writers, and creators to collaborate, share, and grow together.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 py-20 bg-white/50 backdrop-blur-sm border-y border-neutral-200">
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
    </>
  );
};

const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 text-center shadow-sm">
    <div className="w-16 h-16 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-[#0CCE6B]" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-neutral-600">{description}</p>
  </div>
);

export default About;
