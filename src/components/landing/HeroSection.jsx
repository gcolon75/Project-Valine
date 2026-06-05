import { ArrowRight, PenLine, Star, Film, Briefcase, Camera, Mic2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLE_LINES = [
  { icon: PenLine, role: 'Writers', description: 'Get your scripts read and reviewed.' },
  { icon: Star, role: 'Actors', description: 'Showcase your work, upload headshots, reels, and a resume.' },
  { icon: Film, role: 'Directors', description: 'Source talent and get paid to evaluate scripts.' },
  { icon: Briefcase, role: 'Producers', description: 'Releasing a film? Monetize your project by charging for views.' },
];

const FilmVisual = () => {
  const holes = Array.from({ length: 7 });
  return (
    <div className="relative select-none" aria-hidden="true">
      {/* Film strip */}
      <div className="bg-[#111] rounded-xl overflow-hidden shadow-2xl">

        {/* Top sprocket strip */}
        <div className="bg-[#0a0a0a] px-6 py-2 flex justify-between items-center border-b border-white/5">
          {holes.map((_, i) => (
            <div key={i} className="w-5 h-3.5 rounded-sm bg-[#1e1e1e] border border-white/10" />
          ))}
        </div>

        {/* Main frame */}
        <div className="relative px-6 py-10 flex items-center justify-center min-h-[320px] bg-[#111]">

          {/* Viewfinder corner brackets */}
          {[
            'top-4 left-4 border-t-2 border-l-2',
            'top-4 right-4 border-t-2 border-r-2',
            'bottom-4 left-4 border-b-2 border-l-2',
            'bottom-4 right-4 border-b-2 border-r-2',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-6 h-6 border-[#0CCE6B] ${cls}`} />
          ))}

          {/* REC indicator */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
            <span className="text-red-500 text-xs font-mono tracking-widest">REC</span>
          </div>

          {/* Scene label */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/30 text-xs font-mono tracking-widest whitespace-nowrap">
            SCENE 01 / TAKE 01
          </div>

          {/* Center icons */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#0CCE6B]/10 border border-[#0CCE6B]/20 flex items-center justify-center">
                <Camera className="w-12 h-12 text-[#0CCE6B]" />
              </div>
              {/* orbit icons */}
              <div className="absolute -top-3 -right-4 w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-white/50" />
              </div>
              <div className="absolute -bottom-3 -left-4 w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                <Film className="w-4 h-4 text-white/50" />
              </div>
            </div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#0CCE6B]/40 to-transparent" />
          </div>
        </div>

        {/* Bottom sprocket strip */}
        <div className="bg-[#0a0a0a] px-6 py-2 flex justify-between items-center border-t border-white/5">
          {holes.map((_, i) => (
            <div key={i} className="w-5 h-3.5 rounded-sm bg-[#1e1e1e] border border-white/10" />
          ))}
        </div>
      </div>

      {/* Subtle glow */}
      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 80px -20px rgba(12,206,107,0.15)' }} />
    </div>
  );
};

const HeroSection = () => {
  return (
    <section id="hero" className="bg-white px-6 pt-20 pb-0" aria-labelledby="hero-heading">
      <div className="max-w-6xl mx-auto">

        {/* Headline row: slogan + film visual side by side */}
        <div className="lg:flex lg:items-center lg:gap-16 mb-10">
          <h1
            id="hero-heading"
            className="font-bold leading-[1.05] bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent pb-2 lg:shrink-0"
            style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5.5rem)' }}
          >
            Project based match making
            <br />for independent film.
          </h1>

          <div className="hidden lg:block flex-1 max-w-[380px]">
            <FilmVisual />
          </div>
        </div>

        {/* Role bullets — full width below */}
        <dl
          data-testid="hero-subtitle"
          className="mb-12 grid sm:grid-cols-2 gap-x-12 gap-y-5 max-w-3xl"
        >
          {ROLE_LINES.map(({ icon: Icon, role, description }) => (
            <div key={role} className="flex gap-4 items-start">
              <Icon className="w-5 h-5 text-[#0CCE6B] shrink-0 mt-1" aria-hidden="true" />
              <div>
                <dt className="font-semibold text-neutral-900 text-base mb-0.5">{role}</dt>
                <dd className="text-neutral-500 text-base leading-relaxed">{description}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-6 mb-20">
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white px-8 py-4 font-semibold hover:opacity-90 transition-opacity group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-2"
            aria-label="Request early access to Joint Networking"
          >
            Request Early Access
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
          <a
            href="#about"
            className="text-neutral-500 hover:text-neutral-900 text-sm font-medium transition-colors border-b border-neutral-300 hover:border-neutral-600 pb-0.5"
            aria-label="Learn more about Joint Networking"
          >
            Learn More
          </a>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
