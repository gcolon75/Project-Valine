// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";          // or your existing home component
import Login from "./pages/Login";
import ArtistAuth from "./pages/ArtistAuth";
import ObserverAuth from "./pages/ObserverAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* ⬇️ paste the three routes here */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/artist" element={<ArtistAuth />} />
        <Route path="/auth/observer" element={<ObserverAuth />} />
      </Routes>
    </BrowserRouter>
  );
}
