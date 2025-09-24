import React from 'react';
import { NavLink, Link } from 'react-router-dom';

/**
 * Primary navigation bar for the authenticated application. It sticks to the top
 * of the viewport and adapts to light/dark mode. Active links are
 * highlighted. The profile link displays the current user name for better
 * personalization (hard‑coded for demo purposes). To extend, hook this up to
 * your authentication context.
 */
const Header = () => {
  // For this example we hardcode a username. In a real app you would fetch
  // this from your authentication context or API.
  const user = { id: 'me', name: 'Your Name' };

  const navItems = [
    { label: 'Feed', to: '/feed' },
    { label: 'Discover', to: '/search' },
    { label: 'Post', to: '/scripts/new' },
    { label: 'Inbox', to: '/messages' },
    { label: 'Profile', to: `/profile/${user.id}` },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/feed" className="text-xl font-semibold text-primary dark:text-white">
            Valine
          </Link>
          <nav className="flex space-x-6">
            {navItems.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm font-medium hover:text-primary dark:hover:text-primary-300 ${
                    isActive ? 'text-primary dark:text-primary-300' : 'text-gray-600 dark:text-gray-300'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;