import { Users, FileText, Mic, Video, MessageCircle, Search, Award, Shield, DollarSign, BarChart, MessageSquare } from 'lucide-react';

const FeatureGridSection = () => {
  return (
    <section id="features" className="px-4 py-16 md:py-20 bg-gradient-to-b from-white to-neutral-50/30 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]" aria-labelledby="features-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Powerful tools to showcase your work, connect with industry professionals, and grow your entertainment career.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          <FeatureCard
            icon={Users}
            title="Connect with Industry Pros"
            description="Build your professional network and discover talented actors, writers, producers, directors, and other entertainment professionals."
          />
          <FeatureCard
            icon={FileText}
            title="Share Your Work"
            description="Showcase scripts, reels, scenes, audio, storyboards, and pitches. Control who sees each piece—make it free, paid, or request-access only—and turn every view into a chance to get actionable feedback."
          />
          <FeatureCard
            icon={Mic}
            title="Find Opportunities"
            description="Discover auditions, casting calls, and collaborative opportunities tailored to your skills across film, TV, theater, gaming, and more."
          />
          <FeatureCard
            icon={MessageSquare}
            title="Feedback & Revisions"
            description="Share works-in-progress with trusted peers. Let collaborators request access, approve who can see your work, and collect detailed notes, edits, and revision ideas in one place."
          />
          <FeatureCard
            icon={DollarSign}
            title="Monetize Your Craft"
            description="Charge for access to premium content or offer free previews. Control pricing and access to your work, and earn money directly from your talent."
          />
          <FeatureCard
            icon={Shield}
            title="Privacy & Access Controls"
            description="Full control over who sees your content and who can connect with you. Set visibility by post: public, request-only, or paid access."
          />
        </div>

        {/* Additional Features */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl font-bold text-neutral-900 mb-8 text-center">
            More Features
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureItem
              icon={Video}
              title="Reels & Stories"
              description="Share short-form clips, auditions, scene cuts, behind-the-scenes moments, and showcase your creative process."
            />
            <FeatureItem
              icon={MessageCircle}
              title="Direct Messaging"
              description="Connect directly with producers, directors, collaborators, and potential clients through our built-in messaging system."
            />
            <FeatureItem
              icon={Award}
              title="Portfolio Showcase"
              description="Build your multi-media portfolio with scripts, reels, concept art, and more to showcase your best work to the industry."
            />
            <FeatureItem
              icon={BarChart}
              title="Premium Visibility & Analytics"
              description="Upgrade to a premium plan to boost your profile in search and discovery, and unlock analytics. See who's finding your work, what's resonating, and where to focus your next move."
            />
            <FeatureItem
              icon={Mic}
              title="Audio Samples"
              description="Upload and share audio samples of your voice work, music, sound design, and more directly in posts."
            />
            <FeatureItem
              icon={Search}
              title="Discover Talent"
              description="Find and connect with talented creators, discover new opportunities, and expand your professional network across all entertainment sectors."
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
