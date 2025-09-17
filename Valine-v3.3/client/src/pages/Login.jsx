import React from "react";
import RoleCard from "../components/RoleCard";
import artistImg from "../assets/artist.svg";
import observerImg from "../assets/observer.svg";
import "../styles/login.css";

export default function Login() {
  return (
    <main className="login-page">
      <header className="login-header">
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Please select your role to continue.</p>
      </header>

      <section className="roles-grid" aria-label="Login options">
        <RoleCard
          img={artistImg}
          title="Login as Artist"
          cta="Continue as Artist"
          to="/auth/artist"
        />
        <RoleCard
          img={observerImg}
          title="Login as Observer"
          cta="Continue as Observer"
          to="/auth/observer"
        />
      </section>
    </main>
  );
}