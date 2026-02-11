import { Users, FileText, Mic, Video, MessageCircle, Search, Award, Shield, DollarSign, BarChart, MessageSquare } from 'lucide-react';

const FeatureGridSection = () => {
  return (
    <section id="features" className="px-4 py-16 md:py-20 bg-gradient-to-b from-white to-neutral-50/30 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]" aria-labelledby="features-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            What you can do here
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Share your work, meet the right people, and find opportunities that actually fit what you do.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          <FeatureCard
            icon={Users}
            title="Meet the right people"
            description="Connect with actors, producers, directors, writers, agents, and everyone making things happen in entertainment."
          />
          <FeatureCard
            icon={FileText}
            title="Share Your Work"
            description="Post your scripts, music, demos, samples—whatever you're working on. Decide who gets to see it: everyone, select people, or make them pay for access."
          />
          <FeatureCard
            icon={Mic}
            title="Find Opportunities"
            description="Find auditions, collaborations, and gigs across film, TV, theater, music, gaming—all the stuff that matches what you do."
          />
          <FeatureCard
            icon={MessageSquare}
            title="Feedback & Revisions"
            description="Share drafts with people you trust, get feedback, and keep all the notes in one place instead of scattered across a million emails."
          />
          <FeatureCard
            icon={DollarSign}
            title="Monetize Your Craft"
            description="Charge for your premium stuff or give free previews. You set the price, you control access, you get paid."
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
              icon={MessageCircle}
              title="Direct Messaging"
              description="Message people directly—no need to leave the platform to have a conversation."
            />
            <FeatureItem
              icon={Award}
              title="Portfolio Showcase"
              description="Build your portfolio with everything you've made—scripts, art, music, samples—all in one place."
            />
            <FeatureItem
              icon={BarChart}
              title="Premium Visibility & Analytics"
              description="Go premium to show up higher in search and see who's viewing your stuff. Know what's working so you can do more of it."
            />
            <FeatureItem
              icon={Mic}
              title="Audio Samples"
              description="Share audio samples—voice demos, music tracks, sound design—right in your posts."
            />
            <FeatureItem
              icon={Search}
              title="Discover Talent"
              description="Search for talent, discover new collaborators, and grow your network without the LinkedIn vibes."
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
