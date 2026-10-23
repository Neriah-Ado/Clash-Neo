import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * The strict CSP lives in index.html for the packaged app. Dev-only hook
 * relaxes script-src for the React-refresh preamble and allows the HMR
 * websocket — production keeps script-src 'self'.
 */
function relaxForDev(html: string, ctx: { server?: ViteDevServer }) {
  if (!ctx.server) return html;
  return html
    .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
    .replace(
      "connect-src 'self'",
      "connect-src 'self' ws://127.0.0.1:5180 ws://localhost:5180",
    );
}

export default defineConfig({
  // relative base: required so file:// Electron loads assets correctly
  base: "./",
  plugins: [react(), tailwindcss(), { transformIndexHtml: relaxForDev }],
  server: { port: 5180 },
});
