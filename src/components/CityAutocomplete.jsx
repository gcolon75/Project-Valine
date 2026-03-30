// src/components/CityAutocomplete.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

/**
 * City autocomplete backed by the Open-Meteo Geocoding API.
 * Free, no API key, no rate limits, full CORS support.
 *
 * Props:
 *   value        – current location string
 *   onChange     – called with the selected location string
 *   placeholder  – input placeholder
 *   className    – extra classes for the wrapper div
 */
export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city…',
  className = '',
}) {
  const [inputText, setInputText] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const isTypingRef = useRef(false);

  // Sync input when parent sets value externally (e.g. pre-fill), but not while typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setInputText(value || '');
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const search = useCallback(async (query) => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
      const res = await fetch(url, { signal: abortRef.current.signal });
      const data = await res.json();

      const cities = (data.results || []).map((r) => {
        const useState = r.admin1 && ['US', 'CA', 'AU'].includes(r.country_code);
        const label = useState
          ? `${r.name}, ${r.admin1}, ${r.country}`
          : `${r.name}, ${r.country}`;
        return { label, key: r.id };
      }).filter((item, i, arr) => arr.findIndex(x => x.label === item.label) === i);

      setResults(cities);
      setOpen(cities.length > 0);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('City search error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const text = e.target.value;
    isTypingRef.current = true;
    setInputText(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  };

  const handleSelect = (label) => {
    isTypingRef.current = false;
    setInputText(label);
    setOpen(false);
    setResults([]);
    onChange(label);
  };

  const handleClear = () => {
    isTypingRef.current = false;
    setInputText('');
    setResults([]);
    setOpen(false);
    onChange('');
  };

  const handleBlur = () => {
    setTimeout(() => {
      isTypingRef.current = false;
      setOpen(false);
      setInputText(value || '');
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      isTypingRef.current = false;
      setOpen(false);
      setInputText(value || '');
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-600 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={inputText}
          onChange={handleInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
          ) : inputText ? (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="Clear location"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
        >
          {results.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item.label); }}
                className="w-full text-left px-4 py-2.5 text-sm text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
