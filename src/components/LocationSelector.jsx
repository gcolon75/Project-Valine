// src/components/LocationSelector.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';

/**
 * US states and major cities for the location selector.
 * Format: "City, ST" for cities, "State Name" for states.
 */
const US_LOCATIONS = [
  // States
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
  'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'Washington, DC',
  // Major cities
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
  'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
  'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
  'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'Indianapolis, IN',
  'San Francisco, CA', 'Seattle, WA', 'Denver, CO', 'Nashville, TN',
  'Oklahoma City, OK', 'El Paso, TX', 'Las Vegas, NV',
  'Louisville, KY', 'Memphis, TN', 'Portland, OR', 'Baltimore, MD',
  'Milwaukee, WI', 'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA',
  'Sacramento, CA', 'Kansas City, MO', 'Mesa, AZ', 'Atlanta, GA',
  'Omaha, NE', 'Colorado Springs, CO', 'Raleigh, NC', 'Long Beach, CA',
  'Virginia Beach, VA', 'Minneapolis, MN', 'Tampa, FL', 'New Orleans, LA',
  'Arlington, TX', 'Bakersfield, CA', 'Honolulu, HI', 'Anaheim, CA',
  'Aurora, CO', 'Santa Ana, CA', 'Corpus Christi, TX', 'Riverside, CA',
  'St. Louis, MO', 'Lexington, KY', 'Stockton, CA', 'Pittsburgh, PA',
  'Saint Paul, MN', 'Anchorage, AK', 'Cincinnati, OH', 'Greensboro, NC',
  'Henderson, NV', 'Toledo, OH', 'Lincoln, NE', 'Orlando, FL',
  'Chandler, AZ', 'St. Petersburg, FL', 'Laredo, TX', 'Norfolk, VA',
  'Madison, WI', 'Durham, NC', 'Lubbock, TX', 'Winston-Salem, NC',
  'Garland, TX', 'Glendale, AZ', 'Hialeah, FL', 'Reno, NV',
  'Baton Rouge, LA', 'Irvine, CA', 'Chesapeake, VA', 'Irving, TX',
  'Scottsdale, AZ', 'North Las Vegas, NV', 'Fremont, CA', 'Gilbert, AZ',
  'San Bernardino, CA', 'Birmingham, AL', 'Rochester, NY', 'Richmond, VA',
  'Spokane, WA', 'Des Moines, IA', 'Montgomery, AL', 'Modesto, CA',
  'Fayetteville, NC', 'Tacoma, WA', 'Shreveport, LA', 'Fontana, CA',
  'Moreno Valley, CA', 'Glendale, CA', 'Akron, OH', 'Yonkers, NY',
  'Huntington Beach, CA', 'Little Rock, AR', 'Columbus, GA', 'Augusta, GA',
  'Grand Rapids, MI', 'Oxnard, CA', 'Tallahassee, FL', 'Knoxville, TN',
  'Worcester, MA', 'Newport News, VA', 'Brownsville, TX', 'Providence, RI',
  'Garden Grove, CA', 'Oceanside, CA', 'Santa Clarita, CA', 'Fort Lauderdale, FL',
  'Rancho Cucamonga, CA', 'Tempe, AZ', 'Ontario, CA', 'Salt Lake City, UT',
  'Huntsville, AL', 'Chattanooga, TN', 'Amarillo, TX',
  'Cape Coral, FL', 'Peoria, AZ', 'Jackson, MS',
  'Eugene, OR', 'Vancouver, WA', 'Fort Collins, CO', 'Salem, OR',
  'Elk Grove, CA', 'Pembroke Pines, FL', 'Corona, CA', 'Fort Wayne, IN',
  'Springfield, MA', 'Springfield, MO', 'Rockford, IL',
  'Pasadena, CA', 'Hayward, CA', 'Torrance, CA', 'Pomona, CA',
  'Escondido, CA', 'Sunnyvale, CA', 'Kansas City, KS', 'Clarksville, TN',
  'Savannah, GA', 'Lakewood, CO', 'Hollywood, FL', 'Paterson, NJ',
  'Syracuse, NY', 'Bridgeport, CT', 'Mesquite, TX', 'Macon, GA',
  'Pasadena, TX', 'Roseville, CA', 'Dayton, OH', 'Hampton, VA',
  'Warren, MI', 'Columbia, SC', 'Sterling Heights, MI', 'New Haven, CT',
  'Sioux Falls, SD', 'Hartford, CT', 'Wichita, KS', 'Coral Springs, FL',
  'Surprise, AZ', 'Metairie, LA', 'Lakewood, CA', 'Bellevue, WA',
  'Murfreesboro, TN', 'Concord, CA', 'Killeen, TX',
  'Hollywood, CA', 'Burbank, CA', 'Santa Monica, CA', 'Beverly Hills, CA',
  'West Hollywood, CA', 'Culver City, CA', 'Malibu, CA',
  'Brooklyn, NY', 'Queens, NY', 'The Bronx, NY', 'Staten Island, NY',
  'Manhattan, NY', 'Harlem, NY', 'Astoria, NY', 'Flushing, NY',
  'Miami Beach, FL', 'Coral Gables, FL', 'Coconut Grove, FL',
  'South Beach, FL', 'Brickell, FL', 'Aventura, FL',
  'Evanston, IL', 'Oak Park, IL', 'Naperville, IL',
  'Boston, MA', 'Cambridge, MA', 'Somerville, MA', 'Brookline, MA',
  'Decatur, GA', 'Sandy Springs, GA', 'Marietta, GA',
  'Detroit, MI', 'Ann Arbor, MI', 'Dearborn, MI', 'Lansing, MI',
  'Thornton, CO',
  'Bloomington, MN', 'Duluth, MN',
  'Gresham, OR',
];

// Deduplicate and sort
const SORTED_LOCATIONS = [...new Set(US_LOCATIONS)].sort((a, b) =>
  a.localeCompare(b)
);

/**
 * LocationSelector - Searchable dropdown for US cities and states.
 * Prevents free-form text entry; only allows selecting from the predefined list.
 *
 * @param {string} value - Currently selected location
 * @param {function} onChange - Callback with selected location string
 * @param {string} [id] - Input element id for label association
 * @param {string} [className] - Additional CSS classes for the wrapper
 * @param {string} [inputClassName] - Additional CSS classes for the input
 * @param {string} [placeholder] - Placeholder text
 * @param {'onboarding'|'edit'} [variant] - Visual variant
 */
export default function LocationSelector({
  value = '',
  onChange,
  id = 'location',
  className = '',
  inputClassName = '',
  placeholder = 'Search city or state…',
  variant = 'onboarding',
}) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync query with external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const filtered = SORTED_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 12);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
    // If user clears input, also clear the selected value
    if (!e.target.value) {
      onChange('');
    }
  };

  const handleSelect = useCallback(
    (location) => {
      setQuery(location);
      onChange(location);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        } else if (filtered.length === 1) {
          handleSelect(filtered[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery(value || '');
        break;
      case 'Tab':
        setIsOpen(false);
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        } else {
          setQuery(value || '');
        }
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        // Reset query to last confirmed value if user typed but didn't select
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const isOnboarding = variant === 'onboarding';

  const baseInputClass = isOnboarding
    ? 'w-full pl-11 pr-10 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent'
    : 'w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg pl-9 pr-9 py-2 text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Left icon */}
      <MapPin
        className={`absolute top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none z-10 ${
          isOnboarding ? 'left-3 w-5 h-5' : 'left-2.5 w-4 h-4'
        }`}
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
        }
        autoComplete="off"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query) setIsOpen(true);
        }}
        placeholder={placeholder}
        className={`${baseInputClass} ${inputClassName}`}
      />

      {/* Right: clear button or chevron */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${
          isOnboarding ? 'right-3' : 'right-2'
        }`}
      >
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            aria-label="Clear location"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label="US locations"
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg"
        >
          {filtered.length > 0 ? (
            filtered.map((loc, index) => (
              <li
                key={loc}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={loc === value}
                onMouseDown={(e) => {
                  // Use mousedown to fire before blur
                  e.preventDefault();
                  handleSelect(loc);
                }}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex
                    ? 'bg-[#0CCE6B]/10 text-[#0CCE6B] dark:text-[#0CCE6B]'
                    : loc === value
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white font-medium'
                    : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                {loc}
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
              No matching US locations found
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
