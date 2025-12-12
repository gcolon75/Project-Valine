const SocialProofSection = () => {
  return (
    <section className="px-4 py-16 md:py-20 bg-white shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]" aria-labelledby="social-proof-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 id="social-proof-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Loved by creators everywhere
          </h2>
          <p className="text-lg text-neutral-600">
            Join thousands of entertainment professionals who trust Joint
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <Testimonial
            quote="Joint has completely changed how I connect with other professionals in the industry. It's the perfect platform for collaboration and finding opportunities."
            author="Sarah Johnson"
            role="Voice Actor"
            avatar="https://i.pravatar.cc/150?img=1"
          />
          <Testimonial
            quote="Finally, a platform built for the entertainment community. I've found amazing opportunities and made great connections across film, TV, and theater."
            author="Michael Chen"
            role="Cinematographer"
            avatar="https://i.pravatar.cc/150?img=12"
          />
          <Testimonial
            quote="The best place to showcase my work and find talented creators to collaborate with. The feedback tools have been invaluable!"
            author="Emily Rodriguez"
            role="Producer & Writer"
            avatar="https://i.pravatar.cc/150?img=5"
          />
        </div>
      </div>
    </section>
  );
};

const Testimonial = ({ quote, author, role, avatar }) => (
  <article className="bg-white p-6 rounded-2xl border border-neutral-200 hover:shadow-lg transition-all duration-200 shadow-sm">
    <blockquote className="text-neutral-700 mb-4 italic">"{quote}"</blockquote>
    <div className="flex items-center space-x-3">
      <img src={avatar} alt="" className="w-12 h-12 rounded-full" />
      <div>
        <p className="font-semibold text-neutral-900">{author}</p>
        <p className="text-sm text-neutral-600">{role}</p>
      </div>
    </div>
  </article>
);

export default SocialProofSection;
