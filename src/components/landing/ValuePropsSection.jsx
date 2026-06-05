import { Target, Users, Zap } from 'lucide-react';

const ValuePropsSection = () => {
  return (
    <section id="about" className="bg-neutral-50 px-6 py-20" aria-labelledby="about-heading">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h2
            id="about-heading"
            className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4"
          >
            Built for everyone in entertainment
          </h2>
          <p className="text-neutral-500 max-w-xl">
            Whether you're writing, acting, producing, directing, or reviewing, this is where your work finds its audience.
          </p>
        </div>

        <p className="text-neutral-700 max-w-2xl leading-relaxed mb-10">
          Joint exists to connect working creatives and industry professionals in one dedicated space. Our mission is to give everyone in film and theater the tools to share their work, find the right collaborators, and build a career on their own terms. No gatekeeping, no clutter, no LinkedIn.
        </p>

        <ul className="flex flex-wrap gap-x-10 gap-y-4" aria-label="Platform values">
          <li className="flex items-center gap-2 text-sm text-neutral-600">
            <Target className="w-4 h-4 text-[#0CCE6B] shrink-0" aria-hidden="true" />
            Connect you with the right opportunities
          </li>
          <li className="flex items-center gap-2 text-sm text-neutral-600">
            <Users className="w-4 h-4 text-[#0CCE6B] shrink-0" aria-hidden="true" />
            Real people building real careers
          </li>
          <li className="flex items-center gap-2 text-sm text-neutral-600">
            <Zap className="w-4 h-4 text-[#0CCE6B] shrink-0" aria-hidden="true" />
            Tools to share, control access, and earn
          </li>
        </ul>
      </div>
    </section>
  );
};

export default ValuePropsSection;
