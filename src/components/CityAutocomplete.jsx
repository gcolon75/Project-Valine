// src/components/CityAutocomplete.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

/**
 * City autocomplete backed by the Photon / OpenStreetMap geocoder.
 * Free, no API key required, returns city + country results.
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
  // Track whether the current inputText matches a confirmed selection
  const [confirmed, setConfirmed] = useState(!!value);

  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  // Keep inputText in sync when parent value changes externally
  useEffect(() => {
    setInputText(value || '');
    setConfirmed(!!value);
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

    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&layer=city`;
      const res = await fetch(url, { signal: abortRef.current.signal });
      const data = await res.json();

      const cities = (data.features || [])
        .filter((f) => f.properties?.name)
        .map((f) => {
          const { name, country, state, countrycode } = f.properties;
          // Format: "City, State, Country" for US/CA, otherwise "City, Country"
          const useLong = state && ['US', 'CA', 'AU'].includes(countrycode?.toUpperCase());
          const label = useLong
            ? `${name}, ${state}, ${country}`
            : `${name}, ${country}`;
          return { label, key: `${f.geometry?.coordinates?.join(',')}-${label}` };
        })
        // Deduplicate by label
        .filter((item, i, arr) => arr.findIndex((x) => x.label === item.label) === i);

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
    setInputText(text);
    setConfirmed(false);
    // Clear the parent value while the user is typing
    onChange('');

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  };

  const handleSelect = (label) => {
    setInputText(label);
    setConfirmed(true);
    setOpen(false);
    setResults([]);
    onChange(label);
  };

  const handleClear = () => {
    setInputText('');
    setConfirmed(false);
    setResults([]);
    setOpen(false);
    onChange('');
  };

  // On blur, if nothing was confirmed, revert to last confirmed value (or clear)
  const handleBlur = () => {
    setTimeout(() => {
      if (!confirmed) {
        const revert = value || '';
        setInputText(revert);
        if (!revert) setResults([]);
        setOpen(false);
      }
    }, 150); // small delay so click-on-option fires first
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      if (!confirmed) {
        setInputText(value || '');
      }
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

        {/* Right side: spinner or clear button */}
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

      {/* Dropdown */}
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
