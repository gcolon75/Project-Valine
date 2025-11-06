// src/components/ProfileLinksEditor.jsx
import { useState } from 'react';
import { Plus, X, GripVertical, ExternalLink } from 'lucide-react';
import { validateProfileLink } from '../utils/urlValidation';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

/**
 * ProfileLinksEditor - Component for managing profile external links
 * Supports add/remove/reorder with client-side validation
 * 
 * @param {Array<{label: string, url: string, type?: string}>} links - Array of link objects
 * @param {Function} onChange - Callback when links change
 * @param {number} maxLinks - Maximum number of links allowed (default: 10)
 */
export default function ProfileLinksEditor({ links = [], onChange, maxLinks = 10 }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  // Link types matching API spec: website|imdb|showreel|other
  const linkTypes = [
    { value: 'website', label: 'Website' },
    { value: 'imdb', label: 'IMDb' },
    { value: 'showreel', label: 'Showreel' },
    { value: 'other', label: 'Other' }
  ];

  const handleAddLink = () => {
    if (links.length >= maxLinks) {
      return;
    }

    const newLink = { label: '', url: '', type: 'website' };
    const newLinks = [...links, newLink];
    onChange(newLinks);
    setEditingIndex(links.length);
  };

  const handleRemoveLink = (index) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange(newLinks);
    
    // Clear validation errors for this index
    const newErrors = { ...validationErrors };
    delete newErrors[index];
    // Reindex errors
    const reindexedErrors = {};
    Object.keys(newErrors).forEach(key => {
      const idx = parseInt(key);
      if (idx > index) {
        reindexedErrors[idx - 1] = newErrors[key];
      } else {
        reindexedErrors[idx] = newErrors[key];
      }
    });
    setValidationErrors(reindexedErrors);
  };

  const handleUpdateLink = (index, field, value) => {
    const newLinks = [...links];
    
    // Sanitize input based on field type
    let sanitizedValue = value;
    if (field === 'label') {
      sanitizedValue = sanitizeText(value);
    } else if (field === 'url') {
      // Don't sanitize URL while typing (only on blur/save), but trim whitespace
      sanitizedValue = value.trim();
    }
    
    newLinks[index] = { ...newLinks[index], [field]: sanitizedValue };
    onChange(newLinks);

    // Validate the updated link
    const validation = validateProfileLink(newLinks[index]);
    const newErrors = { ...validationErrors };
    
    if (!validation.valid) {
      newErrors[index] = validation.errors;
    } else {
      delete newErrors[index];
    }
    
    setValidationErrors(newErrors);
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newLinks = [...links];
    const draggedItem = newLinks[draggedIndex];
    newLinks.splice(draggedIndex, 1);
    newLinks.splice(index, 0, draggedItem);
    
    onChange(newLinks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-3" role="region" aria-label="External Links Editor">
      {links.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
          <ExternalLink className="w-12 h-12 mx-auto text-neutral-400 dark:text-neutral-600 mb-2" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            No external links added yet
          </p>
          <button
            onClick={handleAddLink}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg transition-all"
            aria-label="Add your first link"
          >
            <Plus className="w-4 h-4" />
            <span>Add Link</span>
          </button>
        </div>
      ) : (
        <>
          {links.map((link, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 transition-all ${
                draggedIndex === index ? 'opacity-50' : 'opacity-100'
              } hover:border-[#0CCE6B] focus-within:border-[#0CCE6B] focus-within:ring-2 focus-within:ring-[#0CCE6B]/20`}
              role="group"
              aria-label={`Link ${index + 1}`}
            >
              {/* Drag Handle */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move">
                <GripVertical 
                  className="w-5 h-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" 
                  aria-label="Drag to reorder"
                />
              </div>

              <div className="pl-6 pr-8 space-y-3">
                {/* Type Selector */}
                <div>
                  <label 
                    htmlFor={`link-type-${index}`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Type
                  </label>
                  <select
                    id={`link-type-${index}`}
                    value={link.type || 'website'}
                    onChange={(e) => handleUpdateLink(index, 'type', e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                    aria-describedby={validationErrors[index]?.type ? `link-type-error-${index}` : undefined}
                  >
                    {linkTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {validationErrors[index]?.type && (
                    <p id={`link-type-error-${index}`} className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                      {validationErrors[index].type}
                    </p>
                  )}
                </div>

                {/* Label Input */}
                <div>
                  <label 
                    htmlFor={`link-label-${index}`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Label <span className="text-red-500" aria-label="required">*</span>
                  </label>
                  <input
                    id={`link-label-${index}`}
                    type="text"
                    value={link.label}
                    onChange={(e) => handleUpdateLink(index, 'label', e.target.value)}
                    placeholder="e.g., My Portfolio"
                    maxLength={40}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                    aria-required="true"
                    aria-invalid={!!validationErrors[index]?.label}
                    aria-describedby={validationErrors[index]?.label ? `link-label-error-${index}` : `link-label-hint-${index}`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {validationErrors[index]?.label ? (
                      <p id={`link-label-error-${index}`} className="text-xs text-red-600 dark:text-red-400" role="alert">
                        {validationErrors[index].label}
                      </p>
                    ) : (
                      <p id={`link-label-hint-${index}`} className="text-xs text-neutral-500 dark:text-neutral-600">
                        {link.label.length}/40 characters
                      </p>
                    )}
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label 
                    htmlFor={`link-url-${index}`}
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    URL <span className="text-red-500" aria-label="required">*</span>
                  </label>
                  <input
                    id={`link-url-${index}`}
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                    aria-required="true"
                    aria-invalid={!!validationErrors[index]?.url}
                    aria-describedby={validationErrors[index]?.url ? `link-url-error-${index}` : `link-url-hint-${index}`}
                  />
                  {validationErrors[index]?.url ? (
                    <p id={`link-url-error-${index}`} className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                      {validationErrors[index].url}
                    </p>
                  ) : (
                    <p id={`link-url-hint-${index}`} className="text-xs text-neutral-500 dark:text-neutral-600 mt-1">
                      Must start with http:// or https://
                    </p>
                  )}
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveLink(index)}
                className="absolute right-2 top-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                aria-label={`Remove link ${link.label || index + 1}`}
                title="Remove link"
              >
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          ))}

          {/* Add Link Button */}
          {links.length < maxLinks && (
            <button
              onClick={handleAddLink}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#0CCE6B] hover:bg-[#0CCE6B]/5 dark:hover:bg-[#0CCE6B]/10 text-neutral-700 dark:text-neutral-300 rounded-lg transition-all"
              aria-label="Add another link"
            >
              <Plus className="w-5 h-5" />
              <span>Add Another Link</span>
            </button>
          )}

          {links.length >= maxLinks && (
            <p className="text-xs text-neutral-500 dark:text-neutral-600 text-center" role="status">
              Maximum of {maxLinks} links reached
            </p>
          )}
        </>
      )}

      {/* Info Message */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> Links are stored in normalized format with types: website, imdb, showreel, or other.
          Maximum {maxLinks} links allowed per profile. URLs must use http:// or https://.
        </p>
      </div>
    </div>
  );
}
