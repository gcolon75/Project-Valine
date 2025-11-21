import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ALLOWED_TAGS, MAX_TAGS, TAG_CATEGORIES } from '../../constants/tags';
import { X, Search } from 'lucide-react';

export default function TagSelector({ value = [], onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  
  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    return ALLOWED_TAGS.filter(tag =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);
  
  // Group filtered tags by category
  const groupedTags = useMemo(() => {
    return Object.entries(TAG_CATEGORIES).reduce((acc, [category, tags]) => {
      const filtered = tags.filter(tag => filteredTags.includes(tag));
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {});
  }, [filteredTags]);
  
  const handleToggleTag = (tag) => {
    if (value.includes(tag)) {
      // Remove tag
      onChange(value.filter(t => t !== tag));
    } else {
      // Add tag if under limit
      if (value.length < MAX_TAGS) {
        onChange([...value, tag]);
      }
    }
  };
  
  const handleRemoveTag = (tag) => {
    onChange(value.filter(t => t !== tag));
  };
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const isAtLimit = value.length >= MAX_TAGS;
  
  return (
    <div ref={containerRef} className="relative">
      {/* Selected Tags Display */}
      <div className="mb-2 flex flex-wrap gap-2 min-h-[2.5rem]">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 rounded-full text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        ))}
        
        {value.length === 0 && (
          <span className="text-neutral-500 dark:text-neutral-400 text-sm py-1.5">
            No tags selected
          </span>
        )}
      </div>
      
      {/* Tag Count Indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {value.length} / {MAX_TAGS} tags
        </span>
        {isAtLimit && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Maximum tags reached
          </span>
        )}
      </div>
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-neutral-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search tags..."
          disabled={isAtLimit}
          className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Search tags"
          aria-expanded={isOpen}
          aria-controls="tag-dropdown"
        />
      </div>
      
      {/* Dropdown */}
      {isOpen && !isAtLimit && (
        <div
          id="tag-dropdown"
          className="absolute z-10 mt-2 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {Object.keys(groupedTags).length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
              No tags found
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-4 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {tags.map(tag => {
                      const isSelected = value.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-100 font-medium'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{tag}</span>
                            {isSelected && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
