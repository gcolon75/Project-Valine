// src/components/demo/DemoOverlay.jsx
import { useEffect, useRef, useState } from 'react';
import { useDemo, DEMO_STEPS } from '../../context/DemoContext';

export default function DemoOverlay() {
  const { currentStep, endDemo, nextStep, prevStep } = useDemo();
  const step = DEMO_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === DEMO_STEPS.length - 1;
  const [highlightRect, setHighlightRect] = useState(null);
  const cancelRef = useRef(false);

  // Discover element with retries
  useEffect(() => {
    cancelRef.current = false;
    setHighlightRect(null);

    if (!step?.dataDemoSelector) return;

    let attempts = 0;

    function tryFind() {
      if (cancelRef.current) return;
      const el = document.querySelector(step.dataDemoSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (cancelRef.current) return;
          setHighlightRect(el.getBoundingClientRect());
        }, 350);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryFind, 150);
      }
      // If all attempts fail, highlightRect stays null — banner still shows
    }

    // Small initial delay for page transition
    const t = setTimeout(tryFind, 150);
    return () => {
      cancelRef.current = true;
      clearTimeout(t);
    };
  }, [step?.dataDemoSelector, step?.page]);

  // Update rect on window resize
  useEffect(() => {
    if (!step?.dataDemoSelector) return;

    const handleResize = () => {
      const el = document.querySelector(step.dataDemoSelector);
      if (el) setHighlightRect(el.getBoundingClientRect());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [step?.dataDemoSelector]);

  // Add body padding so banner doesn't cover content
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '80px';
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  const pad = 8;
  const spotlightStyle = highlightRect
    ? {
        position: 'fixed',
        top: highlightRect.top - pad,
        left: highlightRect.left - pad,
        width: highlightRect.width + pad * 2,
        height: highlightRect.height + pad * 2,
        borderRadius: 12,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
        border: '2px solid rgba(12,206,107,0.8)',
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'demo-glow 2s ease-in-out infinite',
      }
    : null;

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  return (
    <>
      {/* Backdrop — only when no spotlight (spotlight box-shadow handles it otherwise) */}
      {!highlightRect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Spotlight ring */}
      {spotlightStyle && <div style={spotlightStyle} />}

      {/* Bottom banner */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
        }}
        className="bg-neutral-900 border-t-2 border-[#0CCE6B]"
      >
        {/* Progress bar */}
        <div className="h-1 bg-neutral-700">
          <div
            className="h-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Step badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0CCE6B] text-white text-xs font-bold flex items-center justify-center">
            {currentStep + 1}
          </div>

          {/* Message */}
          <p className="flex-1 text-sm text-white leading-snug">
            {step?.message}
          </p>

          {/* Counter */}
          <span className="flex-shrink-0 text-xs text-neutral-400 hidden sm:block">
            {currentStep + 1} of {DEMO_STEPS.length}
          </span>

          {/* Controls */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={endDemo}
              className="text-xs text-neutral-400 hover:text-white transition-colors px-2 py-1"
            >
              Exit
            </button>

            {!isFirst && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
              >
                Back
              </button>
            )}

            {isLast ? (
              <button
                onClick={endDemo}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90 transition-opacity"
              >
                Finish
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90 transition-opacity"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
