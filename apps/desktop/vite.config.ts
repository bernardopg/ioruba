import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pkg from "./package.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) {
              return "charts";
            }

            if (
              id.includes("@tauri-apps/api") ||
              id.includes("tauri-plugin-serialplugin-api")
            ) {
              return "runtime";
            }

            if (id.includes("react") || id.includes("zustand")) {
              return "vendor";
            }
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // tauri-plugin-serialplugin-api@3's "development" export condition
      // points at guest-js/index.ts, which the npm package never ships
      // (only dist-js/ is in "files"). Alias past package.json#exports
      // straight to the built ESM entry so dev/test resolution doesn't 404.
      "tauri-plugin-serialplugin-api": path.resolve(
        __dirname,
        "../../node_modules/tauri-plugin-serialplugin-api/dist-js/index.js",
      ),
    },
  },
  clearScreen: false,
});
