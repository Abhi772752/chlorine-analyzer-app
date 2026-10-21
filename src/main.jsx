
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./index.css";

// Find React root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "React root element not found. Check index.html."
  );
}

// Start Chlorine Analyzer App
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    // Register only in production.
    // Avoid caching Vite development resources.
    if (!import.meta.env.PROD) {
      return;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL;

      const registration =
        await navigator.serviceWorker.register(
          `${baseUrl}sw.js`,
          {
            scope: baseUrl,
          }
        );

      console.log(
        "Chlorine Analyzer Service Worker registered:",
        registration.scope
      );

      // Check for updated versions.
      registration.update().catch((error) => {
        console.warn(
          "Service Worker update check failed:",
          error
        );
      });
    } catch (error) {
      console.error(
        "Service Worker registration failed:",
        error
      );
    }
  });
}
