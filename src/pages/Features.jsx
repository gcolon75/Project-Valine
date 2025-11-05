import { Link } from 'react-router-dom';
import { Mic, Users, FileText, Video, MessageCircle, Search, Award, Shield, Zap, Github, Twitter, Linkedin } from 'lucide-react';

const Features = () => {
  return (
    <div className="min-h-screen">
      
      {/* Header */}
      

      {/* Content */}
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero */}
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-[#0CCE6B]/10 px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4 text-[#0CCE6B]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#0CCE6B]">
                All Features
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent mb-6">
              Everything You Need to Succeed
            </h1>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Project Valine provides voice actors with powerful tools to connect, collaborate, and grow their careers.
            </p>
          </div>

          {/* Main Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-20">
            <FeatureCard
              icon={Users}
              title="Professional Networking"
              description="Connect with voice actors, writers, audio engineers, and other creative professionals in the industry."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={Video}
              title="Reels & Stories"
              description="Share short-form videos showcasing your work, behind-the-scenes content, and creative process."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={FileText}
              title="Script Sharing"
              description="Share and collaborate on scripts with writers and other voice actors for auditions and projects."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Direct Messaging"
              description="Communicate with your connections through our built-in messaging system for collaborations."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={Search}
              title="Discover Talent"
              description="Find and connect with talented artists, discover new opportunities, and expand your network."
              color="from-[#474747] to-[#0CCE6B]"
            />
            <FeatureCard
              icon={Award}
              title="Portfolio Showcase"
              description="Build your professional portfolio with posts, reels, and scripts to showcase your best work."
              color="from-[#474747] to-[#0CCE6B]"
            />
          </div>

          {/* Additional Features */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-12 mb-20">
            <h2 className="text-3xl font-bold text-neutral-900 mb-12 text-center">
              More Features
            </h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
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
                icon={MessageCircle}
                title="Comments & Engagement"
                description="Engage with the community through likes, comments, and shares."
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of voice actors on Project Valine today
            </p>
            <Link
              to="/join"
              className="inline-block bg-white hover:bg-neutral-100 text-[#474747] px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-xl"
              aria-label="Create a free account"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
          </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <div className="bg-white border border-neutral-200 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-2 transition-all">
    <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-6`}>
      <Icon className="w-7 h-7 text-white" aria-hidden="true" />
    </div>
    <h3 className="text-xl font-bold text-neutral-900 mb-3">
      {title}
    </h3>
    <p className="text-neutral-600">
      {description}
    </p>
  </div>
);

// Feature Item Component
const FeatureItem = ({ icon: Icon, title, description }) => (
  <div className="flex space-x-4">
    <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-white" aria-hidden="true" />
    </div>
    <div>
      <h4 className="font-semibold text-neutral-900 mb-2">
        {title}
      </h4>
      <p className="text-neutral-600 text-sm">
        {description}
      </p>
    </div>
  </div>
);

export default Features;
