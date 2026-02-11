import { Target, Users, Zap } from 'lucide-react';

const ValuePropsSection = () => {
  return (
    <section id="about" className="px-4 py-16 md:py-20 bg-white/50 backdrop-blur-sm border-y border-neutral-200 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]" aria-labelledby="about-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="about-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Built for everyone in entertainment
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Whether you're acting, producing, writing, or directing—this is your space to connect and grow.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <ValueCard
            icon={Target}
            title="Our Mission"
            description="Connect you with the right people and help you land your next opportunity—no matter where you are in your career."
          />
          <ValueCard
            icon={Users}
            title="Our Community"
            description="Real people building real careers—from your first project to your biggest break, we're all here figuring it out together."
          />
          <ValueCard
            icon={Zap}
            title="Our Promise"
            description="Give you the tools to share your work, control who sees it, and actually make money from what you create."
          />
        </div>
      </div>
    </section>
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

export default ValuePropsSection;
