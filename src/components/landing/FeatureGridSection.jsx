import { FileText, MessageSquare, User, MessageCircle, Edit, DollarSign, Award, BarChart, Mic, Search } from 'lucide-react';

const PRIMARY_FEATURES = [
  {
    icon: FileText,
    label: 'Script Submission',
    description: 'Upload your screenplay, teleplay, or stage play. Set your page count, pay per page, and your script enters the queue for review.',
  },
  {
    icon: MessageSquare,
    label: 'Paid Coverage',
    description: 'Readers deliver structured notes: logline assessment, character, structure, dialogue, marketability. Honest feedback from people who work in the field.',
  },
  {
    icon: User,
    label: 'Portfolio and Profile',
    description: 'Build a profile that shows what you do and who you are. Upload demos, scripts, reels, and samples. Control visibility: public, connections-only, or paid access.',
  },
  {
    icon: MessageCircle,
    label: 'Direct Messaging',
    description: 'Reach out to collaborators, respond to interest, and keep conversations in one place. No external tools needed.',
  },
  {
    icon: Edit,
    label: 'Peer Feedback',
    description: 'Share drafts with trusted collaborators before going to paid review. Annotate scripts, leave comments, and track revisions together.',
  },
  {
    icon: DollarSign,
    label: 'Monetize Your Work',
    description: 'Charge for premium content, offer free previews, or accept reader applications. You set the terms and Joint handles the rest.',
  },
];

const MORE_FEATURES = [
  { icon: Award, label: 'Portfolio Showcase', description: 'Everything you have made in one place: scripts, art, music, samples.' },
  { icon: BarChart, label: 'Premium Visibility', description: 'Go premium to show up higher in search and see who is viewing your profile.' },
  { icon: Mic, label: 'Audio Samples', description: 'Share voice demos, music tracks, and sound design right in your posts.' },
  { icon: Search, label: 'Discover Talent', description: 'Search for collaborators and grow your network without the LinkedIn feel.' },
];

const FeatureGridSection = () => {
  return (
    <section id="features" className="bg-white px-6 py-20" aria-labelledby="features-heading">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <h2
            id="features-heading"
            className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4"
          >
            What you can do here
          </h2>
          <p className="text-neutral-500 max-w-xl">
            Share your work, meet the right people, and find opportunities that actually fit what you do.
          </p>
        </div>

        <ul className="grid md:grid-cols-2 gap-x-16 gap-y-8 mb-16" aria-label="Primary features">
          {PRIMARY_FEATURES.map(({ icon: Icon, label, description }) => (
            <li key={label} className="flex gap-4">
              <Icon className="w-5 h-5 text-[#0CCE6B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-neutral-900 mb-1">{label}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-neutral-200 pt-10">
          <h3 className="text-sm font-semibold text-neutral-400 tracking-widest uppercase mb-8">
            More Features
          </h3>
          <ul className="grid md:grid-cols-2 gap-x-16 gap-y-6" aria-label="Additional features">
            {MORE_FEATURES.map(({ icon: Icon, label, description }) => (
              <li key={label} className="flex gap-4">
                <Icon className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="font-medium text-neutral-700 mb-0.5 text-sm">{label}</h4>
                  <p className="text-neutral-500 text-sm leading-relaxed">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FeatureGridSection;
