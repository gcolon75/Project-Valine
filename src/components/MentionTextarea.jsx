// src/components/MentionTextarea.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { getMyFollowers, getMyFollowing } from "../services/connectionService";
import { searchUsers } from "../services/search";

export default function MentionTextarea({ value, onChange, placeholder, rows = 3, className = "" }) {
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  const [followNetworkIds, setFollowNetworkIds] = useState(new Set());
  const [followNetworkUsers, setFollowNetworkUsers] = useState([]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Load follow network on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [followersData, followingData] = await Promise.allSettled([
          getMyFollowers(),
          getMyFollowing(),
        ]);
        if (cancelled) return;

        const users = [];
        const ids = new Set();

        const addItems = (result) => {
          if (result.status === "fulfilled") {
            const items = result.value?.items || [];
            for (const u of items) {
              if (u?.id && !ids.has(u.id)) {
                ids.add(u.id);
                users.push(u);
              }
            }
          }
        };
        addItems(followersData);
        addItems(followingData);

        setFollowNetworkIds(ids);
        setFollowNetworkUsers(users);
      } catch {
        // non-critical - mention still works without network prioritization
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Detect @mention at cursor
  const detectMention = useCallback((text, cursorPos) => {
    const textBefore = text.slice(0, cursorPos);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      return {
        query: match[1],
        start: cursorPos - match[0].length,
      };
    }
    return null;
  }, []);

  // Fetch suggestions (debounced)
  const fetchSuggestions = useCallback((query) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (query.length === 0) {
        // Show top 8 from follow network
        const top = followNetworkUsers.slice(0, 8);
        setSuggestions(top);
        setActiveIndex(0);
        return;
      }
      try {
        const result = await searchUsers({ query, limit: 8 });
        const items = result?.items || [];
        // Sort: follow network users float to top
        const sorted = [...items].sort((a, b) => {
          const aInNetwork = followNetworkIds.has(a.id) ? 0 : 1;
          const bInNetwork = followNetworkIds.has(b.id) ? 0 : 1;
          return aInNetwork - bInNetwork;
        });
        setSuggestions(sorted);
        setActiveIndex(0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }, [followNetworkIds, followNetworkUsers]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(newValue);

    const mention = detectMention(newValue, cursor);
    if (mention) {
      setMentionQuery(mention.query);
      setMentionStart(mention.start);
      setShowDropdown(true);
      fetchSuggestions(mention.query);
    } else {
      setShowDropdown(false);
    }
  };

  const selectUser = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const mention = detectMention(value, cursor);
    if (!mention) return;

    const before = value.slice(0, mention.start);
    const after = value.slice(cursor);
    const newValue = `${before}@${user.username} ${after}`;
    onChange(newValue);
    setShowDropdown(false);

    // Restore focus and move cursor after inserted mention
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursor = mention.start + user.username.length + 2; // @username + space
      textarea.setSelectionRange(newCursor, newCursor);
    });
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && showDropdown) {
      e.preventDefault();
      selectUser(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />

      {showDropdown && suggestions.length > 0 && (
        <ul
          ref={dropdownRef}
          role="listbox"
          className="absolute z-50 left-0 mt-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((user, i) => (
            <li
              key={user.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectUser(user);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                i === activeIndex
                  ? "bg-neutral-100 dark:bg-white/10"
                  : "hover:bg-neutral-50 dark:hover:bg-white/5"
              }`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName || user.username}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                  {user.displayName || user.username}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  @{user.username}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
