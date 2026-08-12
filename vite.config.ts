import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so assets resolve wherever the site is served — including the
// case-sensitive GitHub Pages project path https://oshal7.github.io/Compare/.
// Works with HashRouter (all routes live in the URL hash) regardless of path case.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // web-llm and tesseract pull in large workers; keep the chunk warning quiet.
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
