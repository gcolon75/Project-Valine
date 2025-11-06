// src/pages/Onboarding/steps/LinksSetup.jsx
import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import ProfileLinksEditor from '../../../components/ProfileLinksEditor';

/**
 * LinksSetup Step - External links and portfolio
 * Uses ProfileLinksEditor for consistent link management with drag-and-drop reordering
 */
export default function LinksSetup({ userData, onUpdate }) {
  const [links, setLinks] = useState(userData?.profileLinks || []);

  // Update parent component when links change
  useEffect(() => {
    onUpdate({ profileLinks: links });
  }, [links]);

  const handleLinksChange = (newLinks) => {
    setLinks(newLinks);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
              Add Your Professional Links
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Share your portfolio, IMDb, showreel, and other professional profiles.
              You can reorder links by dragging them, and they'll appear on your profile in this order.
            </p>
          </div>
        </div>
      </div>

      <ProfileLinksEditor
        links={links}
        onChange={handleLinksChange}
        maxLinks={10}
      />

      <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Tips for Adding Links
        </h4>
        <ul className="text-sm text-neutral-700 dark:text-neutral-400 space-y-1 list-disc list-inside">
          <li>Use clear, descriptive labels (max 40 characters)</li>
          <li>All URLs must start with http:// or https://</li>
          <li>Drag links to reorder them on your profile</li>
          <li>You can add up to 10 external links</li>
        </ul>
      </div>
    </div>
  );
}
