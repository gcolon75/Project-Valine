import React from "react";
import { Outlet, Link } from "react-router-dom";

export default function MarketingLayout() {
  return (
    <div className="marketing">
      <nav className="marketing-navbar">
        <div><Link to="/">Joint</Link></div>
        <div className="nav-links">
          <Link to="/about-us">About Us</Link>
          <Link to="/join">Join</Link>
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
