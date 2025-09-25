// /src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { FeedProvider } from "./context/FeedContext";
import { ThemeProvider } from "./context/ThemeContext.jsx"; // NEW

import "./index.css";
import "./styles/theme.css"; // NEW: load AFTER index.css so colors win

import App from "./routes/App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <FeedProvider>
            <App />
          </FeedProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
