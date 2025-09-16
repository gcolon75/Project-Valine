import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { ToastProvider } from '../context/ToastContext';

/**
 * AppLayout wraps all authenticated pages. It defines the three‑column
 * dashboard shell with a sticky sidebar, a central content area and a
 * right‑hand panel for suggestions. The structure has been reformatted
 * to be more semantic and to work with the updated global styles. Use
 * this layout for pages like Feed, Scripts, Auditions, etc.
 */
export default function AppLayout() {
  return (
    <ToastProvider>
      {/* Top navigation bar */}
      <NavBar />
      <div className="layout container">
        {/* Left sidebar with quick actions and followed tags */}
        <aside className="sidebar">
          {/* Quick actions card */}
          <div className="card quick-actions-card">
            <h3>Quick Actions</h3>
            <div className="grid2">
              <a className="btn primary" href="/scripts/new">
                Post Script
              </a>
              <a className="btn primary" href="/auditions/new">
                Post Audition
              </a>
              <a className="btn primary" href="/bookmarks">
                Bookmarks
              </a>
            </div>
          </div>
          {/* Follow tags card */}
          <div className="card follow-tags-card">
            <h3>Follow Tags</h3>
            <div className="tags">
              <span className="badge">#SciFi</span>
              <span className="badge">#Drama</span>
              <span className="badge">#Audition</span>
            </div>
          </div>
        </aside>
        {/* Main content renders the current route */}
        <main>
          <Outlet />
        </main>
        {/* Right sidebar with suggestions */}
        <aside className="right">
          {/* People you may know */}
          <div className="card people-card">
            <h3>People you may know</h3>
            <ul>
              <li>Karim Saif</li>
              <li>Ryan Roslansky</li>
              <li>Dylan Field</li>
            </ul>
          </div>
          {/* Suggested observers */}
          <div className="card observers-card">
            <h3>Suggested Observers</h3>
            <ul>
              <li>@casting.guru</li>
              <li>@producer_max</li>
              <li>@r.obs</li>
            </ul>
          </div>
        </aside>
      </div>
    </ToastProvider>
  );
}