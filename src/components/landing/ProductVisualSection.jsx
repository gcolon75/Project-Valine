import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    step: '1',
    title: 'Writer submits a script',
    body: 'Upload your PDF, set the page count. Pay $0.50/page. Scripts go into the review queue within minutes.',
  },
  {
    step: '2',
    title: 'A qualified reader accepts',
    body: 'Readers from our vetted pool claim your script. They have 24 hours to deliver structured coverage: character, structure, dialogue, marketability.',
  },
  {
    step: '3',
    title: 'You get real notes',
    body: 'Not a form response. Actual feedback from someone who reads scripts professionally. Use it to revise, pitch, or understand where your story stands.',
  },
];

const ProductVisualSection = () => {
  return (
    <section className="bg-neutral-50 px-6 py-20" aria-labelledby="how-it-works-heading">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">

        {/* Left: Steps */}
        <div>
          <h2
            id="how-it-works-heading"
            className="text-3xl md:text-4xl font-bold text-neutral-900 mb-12"
          >
            How script review works
          </h2>

          <ol className="space-y-0" aria-label="Script review process steps">
            {STEPS.map(({ step, title, body }, i) => (
              <li key={step} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <span className="w-8 h-8 flex items-center justify-center border border-neutral-300 text-xs font-semibold text-neutral-500 shrink-0">
                    {step}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="w-px flex-1 bg-neutral-200 my-2" aria-hidden="true" />
                  )}
                </div>
                <div className={`pb-10 ${i === STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right: Callout */}
        <div className="border border-neutral-200 bg-white p-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#0CCE6B] mb-6">
            For Readers
          </p>
          <h3 className="text-2xl font-bold text-neutral-900 mb-4 leading-snug">
            Earn for your expertise
          </h3>
          <p className="text-neutral-600 mb-8 leading-relaxed">
            Readers earn $0.25 per page for every script they review. Accept work on your schedule, build your reputation, and get paid for the analytical skills you already have.
          </p>
          <ul className="space-y-3 mb-10" aria-label="Reader benefits">
            {[
              'Accept scripts on your own schedule',
              '24-hour review window per script',
              'Structured coverage format included',
              'Direct payout, no platform lock-in',
            ].map(item => (
              <li key={item} className="flex items-start gap-3 text-sm text-neutral-700">
                <span className="w-4 h-px bg-[#0CCE6B] mt-2.5 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0CCE6B] hover:text-[#0BBE60] transition-colors group"
            aria-label="Request early access to Joint Networking"
          >
            Request Early Access
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default ProductVisualSection;
