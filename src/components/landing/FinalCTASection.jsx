import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FinalCTASection = () => {
  return (
    <section className="bg-neutral-50 px-6 py-20 border-t border-neutral-200" aria-labelledby="final-cta-heading">
      <div className="max-w-3xl mx-auto">
        <h2
          id="final-cta-heading"
          className="font-bold text-neutral-900 mb-6 leading-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          Your work deserves to be{' '}
          <span className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
            read.
          </span>
        </h2>
        <p className="text-neutral-600 text-lg mb-10 max-w-xl leading-relaxed">
          Join the platform where scripts find coverage, talent finds collaborators, and careers get built. Early access is free.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white px-8 py-4 font-semibold hover:opacity-90 transition-opacity group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-2"
            aria-label="Request early access to Joint Networking"
          >
            Request Early Access
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
          <span className="text-neutral-400 text-sm">It's free to join.</span>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
