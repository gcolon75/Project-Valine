import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQSection = () => {
  const faqs = [
    {
      question: "What is Joint?",
      answer: "Joint is a professional networking platform designed for the entertainment industry—actors, voice talent, writers, producers, directors, editors, composers, and more. It provides tools for collaboration, portfolio showcasing, monetizing your work, and discovering opportunities."
    },
    {
      question: "Is Joint free to use?",
      answer: "Yes! Joint offers a free tier that includes core features like creating a profile, connecting with other artists, sharing your work, and discovering opportunities."
    },
    {
      question: "How do I get started?",
      answer: "Simply click 'Get Started' to create your free account. You'll set up your profile, add your portfolio, and can immediately start connecting with other artists in the community."
    },
    {
      question: "Can I showcase my work?",
      answer: "Absolutely! You can upload audio samples, share video reels, post scripts, pitches, storyboards, and build a comprehensive portfolio that showcases your talents and experience across any entertainment discipline."
    },
    {
      question: "How do I find collaboration opportunities?",
      answer: "Browse the feed to discover posts from other artists, use the search feature to find specific talent or opportunities, and check out the auditions section for casting calls."
    },
    {
      question: "Is my content private?",
      answer: "You have full control over your privacy settings. Choose what content is public, visible to connections only, or completely private."
    }
  ];

  return (
    <section id="faq" className="px-4 py-16 md:py-20 bg-neutral-50 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-neutral-600">
            Everything you need to know about Joint
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${question.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <h3 className="font-semibold text-neutral-900 pr-4">{question}</h3>
        <ChevronDown 
          className={`w-5 h-5 text-neutral-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div 
          id={`faq-answer-${question.replace(/\s+/g, '-').toLowerCase()}`}
          className="px-6 pb-4"
        >
          <p className="text-neutral-600">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default FAQSection;
