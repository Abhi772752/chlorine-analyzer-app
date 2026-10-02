# Chlorine Analyzer — App Prototype

A responsive Progressive Web App interface prototype for Android and iPhone.

## Run locally
Open `index.html` in a browser for a quick preview. For PWA installation and offline support, serve the folder over HTTPS (or localhost).

## Publish with GitHub Pages
1. Create a GitHub repository named `chlorine-analyzer-app`.
2. Upload all files in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish the site. Open the published HTTPS URL on your phone.

## Install
- Android: open the HTTPS site in Chrome → browser menu → Install app / Add to Home screen.
- iPhone: open the HTTPS site in Safari → Share → Add to Home Screen.

## Current limitations
- This is UI prototype version 0.1.
- Generated measurements are simulated demo data, not real chlorine readings.
- History is stored locally in the browser on that device.
- BLE hardware communication is not implemented yet. Web Bluetooth support is not available in iOS Safari; cross-platform direct BLE control will require a native wrapper (for example Capacitor with native BLE support) or a different communication route.
- Do not use demo values for water safety decisions.
