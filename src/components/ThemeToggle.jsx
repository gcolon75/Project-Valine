// src/components/ThemeToggle.jsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm theme-chip hover:opacity-90 transition-all duration-200"
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-200" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200" />
      )}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"} mode</span>
    </button>
  );
}
