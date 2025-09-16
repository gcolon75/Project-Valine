import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./routes/App";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Suspense fallback={<div style={{padding:20}}>Loading…</div>}>
      <App />
    </Suspense>
  </BrowserRouter>
);
