
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [react()],

  base: command === "build"
    ? "/chlorine-analyzer-app/"
    : "/",

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,
  },

  build: {
    outDir: "dist",
  },
}));
