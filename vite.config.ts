import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(projectRoot, "client"),
  envDir: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "dist", "public"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    cors: false,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.env*", "**/.git/**", "**/*.pem", "**/*.key"],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    allowedHosts: ["localhost", "127.0.0.1"],
  },
});
