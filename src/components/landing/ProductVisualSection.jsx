import { Play, Mic } from 'lucide-react';

const ProductVisualSection = () => {
  return (
    <section id="about" className="px-4 py-16 md:py-20 bg-gradient-to-br from-neutral-50 to-white" aria-labelledby="product-visual-heading">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <h2 id="product-visual-heading" className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
              Your voice, your platform
            </h2>
            <p className="text-lg text-neutral-600 mb-8">
              Showcase your talent with a professional portfolio, share your latest work, and connect with opportunities that match your unique voice and style.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
                  <div className="w-2 h-2 bg-[#0CCE6B] rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">Professional Portfolio</h3>
                  <p className="text-neutral-600 text-sm">Build a stunning showcase of your best voice work and creative projects.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
                  <div className="w-2 h-2 bg-[#0CCE6B] rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">Instant Sharing</h3>
                  <p className="text-neutral-600 text-sm">Upload and share audio samples, videos, and scripts with your network.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-[#0CCE6B]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
                  <div className="w-2 h-2 bg-[#0CCE6B] rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">Discover Opportunities</h3>
                  <p className="text-neutral-600 text-sm">Get matched with casting calls and projects that fit your expertise.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Visual/Demo Area */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <div className="aspect-video bg-gradient-to-br from-[#474747] to-[#0CCE6B] flex items-center justify-center">
                <div className="text-center text-white">
                  <Mic className="w-24 h-24 mx-auto mb-4 opacity-90" aria-hidden="true" />
                  <p className="text-sm font-medium opacity-80">Product demo coming soon</p>
                </div>
              </div>
            </div>
            
            {/* Floating play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl" aria-hidden="true">
                <Play className="w-10 h-10 text-[#0CCE6B] ml-1" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductVisualSection;
