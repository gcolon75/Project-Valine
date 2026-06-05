import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: 'What is Joint?',
    answer:
      'Joint is a platform for the entertainment industry — writers, directors, producers, actors, composers, and industry readers. Submit scripts for professional coverage, post your work, find collaborators, and build your career in film, theater, and beyond.',
  },
  {
    question: 'How does paid script review work?',
    answer:
      'Writers submit a PDF script and pay $0.50 per page. A vetted reader from our pool claims the script and delivers structured coverage within 24 hours — character, structure, dialogue, and marketability. Readers earn $0.25 per page.',
  },
  {
    question: 'Is Joint free to use?',
    answer:
      'Creating a profile, posting work, connecting with people, and using peer feedback is free. Script review is a paid service ($0.50/page). An Emerald subscription ($9.99/month) includes one free script review per month plus premium visibility.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Request early access and you\'ll be notified when the platform opens. Once you\'re in, create a profile, post your work, and start connecting with writers, directors, and other creatives in the industry.',
  },
  {
    question: 'What types of scripts can I submit?',
    answer:
      'Screenplays, teleplays, stage plays, pilots, and short film scripts. Submit as PDF. Coverage is tailored to the format you select at submission.',
  },
  {
    question: 'Is my content private?',
    answer:
      'You have full control. Set each post to public, connections-only, or paid access. Scripts submitted for review are only visible to the assigned reader and platform admins.',
  },
];

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const id = `faq-${question.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="border-b border-neutral-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-2"
        aria-expanded={isOpen}
        aria-controls={id}
      >
        <h3 className="font-semibold text-neutral-900">{question}</h3>
        {isOpen
          ? <Minus className="w-4 h-4 text-[#0CCE6B] shrink-0" aria-hidden="true" />
          : <Plus className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
        }
      </button>
      {isOpen && (
        <div id={id} className="pb-5">
          <p className="text-neutral-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const FAQSection = () => {
  return (
    <section id="faq" className="bg-white px-6 py-20" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-neutral-500">
            Everything you need to know about Joint.
          </p>
        </div>

        <div className="border-t border-neutral-200">
          {faqs.map(faq => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
