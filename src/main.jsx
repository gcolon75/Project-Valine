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

// Dev health check - verify API base is reachable
if (import.meta.env.DEV) {
  const apiBase = import.meta.env.VITE_API_BASE;
  if (apiBase) {
    const healthUrl = `${apiBase}/health`;
    
    // Non-blocking health check with 2s timeout
    fetch(healthUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    })
      .then(response => {
        if (response.ok) {
          console.log('[Dev Health Check] ✅ API base is reachable:', apiBase);
        } else {
          console.warn(
            `[Dev Health Check] ⚠️ API base responded with status ${response.status}.\n` +
            `  URL: ${healthUrl}\n` +
            `  Check VITE_API_BASE setting.`
          );
        }
      })
      .catch(error => {
        console.warn(
          `[Dev Health Check] ⚠️ API base unreachable.\n` +
          `  URL: ${healthUrl}\n` +
          `  Error: ${error.message}\n` +
          `  Tip: Set VITE_API_BASE to your API Gateway URL or start local backend.\n` +
          `  Current VITE_API_BASE: ${apiBase}`
        );
        
        // Show toast notification (non-blocking)
        setTimeout(() => {
          const event = new CustomEvent('toast:show', {
            detail: {
              message: 'API unreachable. Set VITE_API_BASE in .env.local or start backend.',
              type: 'warning'
            }
          });
          window.dispatchEvent(event);
        }, 1000);
      });
  }
}

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
