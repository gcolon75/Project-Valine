import { DEV_BYPASS_ENABLED } from '../lib/devBypass';

/**
 * DevModeIndicator
 * Shows a visual indicator when dev bypass mode is active
 * Only renders when DEV_BYPASS_ENABLED is true
 */
export default function DevModeIndicator() {
  if (!DEV_BYPASS_ENABLED) return null;
  
  // Additional check - only show on localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return null;
  }
  
  return (
    <div 
      className="fixed bottom-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg font-bold z-50 flex items-center gap-2"
      role="alert"
      aria-live="polite"
    >
      <span className="text-lg" aria-hidden="true">⚠️</span>
      <span>DEV BYPASS MODE</span>
    </div>
  );
}
