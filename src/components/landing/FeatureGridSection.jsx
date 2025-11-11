import { Users, FileText, Mic, Video, MessageCircle, Search, Award, Shield } from 'lucide-react';

const FeatureGridSection = () => {
  return (
    <section id="features" className="px-4 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Powerful tools to connect, collaborate, and grow your voice acting career.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          <FeatureCard
            icon={Users}
            title="Connect with Artists"
            description="Build your professional network and discover talented voice actors, writers, and artists in the community."
          />
          <FeatureCard
            icon={FileText}
            title="Share Your Work"
            description="Showcase your portfolio, share scripts, and collaborate on exciting projects with other creatives."
          />
          <FeatureCard
            icon={Mic}
            title="Find Opportunities"
            description="Discover auditions, casting calls, and collaborative opportunities tailored to your skills."
          />
          <FeatureCard
            icon={Video}
            title="Reels & Stories"
            description="Share short-form videos showcasing your work, behind-the-scenes content, and creative process."
          />
          <FeatureCard
            icon={MessageCircle}
            title="Direct Messaging"
            description="Communicate with your connections through our built-in messaging system for collaborations."
          />
          <FeatureCard
            icon={Award}
            title="Portfolio Showcase"
            description="Build your professional portfolio with posts, reels, and scripts to showcase your best work."
          />
        </div>

        {/* Additional Features */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">
            More Features
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
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
              icon={Search}
              title="Discover Talent"
              description="Find and connect with talented artists, discover new opportunities, and expand your network."
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-200 shadow-sm">
    <div className="w-12 h-12 bg-[#0CCE6B]/10 rounded-lg flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-[#0CCE6B]" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-neutral-600">{description}</p>
  </div>
);

const FeatureItem = ({ icon: Icon, title, description }) => (
  <div className="flex space-x-4">
    <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-white" aria-hidden="true" />
    </div>
    <div>
      <h4 className="font-semibold text-neutral-900 mb-2">{title}</h4>
      <p className="text-neutral-600 text-sm">{description}</p>
    </div>
  </div>
);

export default FeatureGridSection;
