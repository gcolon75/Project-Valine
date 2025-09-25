// src/components/ThemeToggle.jsx
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm theme-chip hover:opacity-90"
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <span aria-hidden className="grid place-items-center h-4 w-4">
        {isDark ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM3 11a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm16 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1ZM5.64 5.64a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.42 1.42l-.7-.71a1 1 0 0 1 0-1.42Zm10.6 10.6a1 1 0 0 1 1.42 0l.71.7a1 1 0 1 1-1.42 1.42l-.71-.7a1 1 0 0 1 0-1.42Zm1.42-10.6a1 1 0 0 1 0 1.42l-.71.71A1 1 0 1 1 15.53 6l.71-.71a1 1 0 0 1 1.42 0ZM6.35 16.24a1 1 0 0 1 0 1.42l-.71.71A1 1 0 1 1 4.22 17l.71-.71a1 1 0 0 1 1.42 0Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12.5 2a1 1 0 0 1 .92.62 8.5 8.5 0 1 0 8 11.16 1 1 0 0 1 1.32 1.3A10.5 10.5 0 1 1 11.88 1.1 1 1 0 0 1 12.5 2Z" />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"} mode</span>
    </button>
  );
}
