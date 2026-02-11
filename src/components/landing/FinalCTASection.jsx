import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FinalCTASection = () => {
  return (
    <section className="px-4 py-16 md:py-20 bg-gradient-to-r from-[#474747] via-[#0CCE6B] to-[#474747] shadow-[0_8px_30px_-5px_rgba(0,0,0,0.12)]" aria-labelledby="final-cta-heading">
      <div className="max-w-4xl mx-auto text-center">
        <h2 id="final-cta-heading" className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to get started?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Create your profile, share your work, and start connecting. It's free to join.
        </p>
        <Link
          to="/join"
          className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-[#474747] px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0CCE6B]"
          aria-label="Create a free account"
        >
          <span>Join for Free</span>
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default FinalCTASection;
