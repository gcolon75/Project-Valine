// /src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { FeedProvider } from "./context/FeedContext";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { UnreadProvider } from "./context/UnreadContext";
import ToastProvider from "./components/ToastProvider";

import "./index.css";
import "./styles/theme.css"; // NEW: load AFTER index.css so colors win

import App from "./routes/App";

// Initialize performance monitoring
import performanceMonitor from "./utils/performanceMonitor";

// Initialize accessibility testing in development
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  }).catch(() => {
    console.log('Axe accessibility testing not available');
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider />
      <BrowserRouter>
        <AuthProvider>
          <UnreadProvider>
            <FeedProvider>
              <App />
            </FeedProvider>
          </UnreadProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
