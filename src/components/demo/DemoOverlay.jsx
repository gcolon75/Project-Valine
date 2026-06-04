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
  const cleanupClickRef = useRef(null);

  // Discover element with retries + attach click-to-advance listener
  useEffect(() => {
    cancelRef.current = false;
    setHighlightRect(null);

    // Clean up previous click listener
    if (cleanupClickRef.current) {
      cleanupClickRef.current();
      cleanupClickRef.current = null;
    }

    if (!step?.dataDemoSelector) return;

    let attempts = 0;

    function tryFind() {
      if (cancelRef.current) return;
      const el = document.querySelector(step.dataDemoSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Clicking the highlighted element advances to next step
        const handleClick = () => nextStep();
        el.addEventListener('click', handleClick);
        cleanupClickRef.current = () => el.removeEventListener('click', handleClick);

        setTimeout(() => {
          if (cancelRef.current) return;
          setHighlightRect(el.getBoundingClientRect());
        }, 350);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryFind, 150);
      }
    }

    const t = setTimeout(tryFind, 150);
    return () => {
      cancelRef.current = true;
      clearTimeout(t);
      if (cleanupClickRef.current) {
        cleanupClickRef.current();
        cleanupClickRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Push content down so banner doesn't cover the top of the page
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '110px';
    return () => {
      document.body.style.paddingTop = prev;
    };
  }, []);

  const pad = 10;
  const spotlightStyle = highlightRect
    ? {
        position: 'fixed',
        top: highlightRect.top - pad,
        left: highlightRect.left - pad,
        width: highlightRect.width + pad * 2,
        height: highlightRect.height + pad * 2,
        borderRadius: 14,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
        border: '3px solid rgba(12,206,107,0.9)',
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'demo-glow 2s ease-in-out infinite',
        cursor: 'pointer',
      }
    : null;

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;
  const hasSpotlight = !!step?.dataDemoSelector;

  return (
    <>
      {/* Backdrop — only when no spotlight */}
      {!highlightRect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.65)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Spotlight ring */}
      {spotlightStyle && <div style={spotlightStyle} />}

      {/* Top banner */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
        }}
        className="bg-neutral-950 border-b-4 border-[#0CCE6B] shadow-2xl"
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-5">

          {/* Step badge */}
          <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#0CCE6B]">
              DEMO
            </span>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#474747] to-[#0CCE6B] text-white text-lg font-black flex items-center justify-center shadow-lg">
              {currentStep + 1}
            </div>
            <span className="text-[9px] text-neutral-500 font-medium">
              of {DEMO_STEPS.length}
            </span>
          </div>

          {/* Message + hint */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-base md:text-lg font-semibold leading-snug">
              {step?.message}
            </p>
            {hasSpotlight && (
              <p className="text-[#0CCE6B] text-xs mt-1 font-medium">
                Click the highlighted area to continue →
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
              >
                ← Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={endDemo}
                className="px-5 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90 transition-opacity shadow-lg"
              >
                Finish
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-5 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90 transition-opacity shadow-lg"
              >
                Next →
              </button>
            )}
            <button
              onClick={endDemo}
              className="text-sm text-neutral-500 hover:text-white transition-colors px-2 py-1 ml-1"
            >
              ✕ Exit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </>
  );
}
