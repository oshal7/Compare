import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project-site path: https://oshal7.github.io/compare/
// If you move to a custom domain or a user/org page, change `base` to "/".
export default defineConfig({
  base: "/compare/",
  plugins: [react()],
  // web-llm and tesseract pull in large workers; keep the chunk warning quiet.
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
