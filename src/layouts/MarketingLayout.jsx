import React from "react";
import { Outlet, Link } from "react-router-dom";

export default function MarketingLayout() {
  return (
    <div className="marketing">{/* <-- scope all marketing styles */}
      <nav className="marketing-navbar">
        <div><Link to="/">Joint</Link></div>
        <div className="nav-links">
          <Link to="/about-us">About Us</Link>
          <Link to="/become-artist">Become an Artist</Link>
          <Link to="/become-observer">Become an Observer</Link>
          <Link className="cta-button" to="/login">Login / Sign Up</Link>
        </div>
      </nav>

      <Outlet />

      <footer className="marketing-footer">
        Joint — the creative collab network.
      </footer>
    </div>
  );
}
