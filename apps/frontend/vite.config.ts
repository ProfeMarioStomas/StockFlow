import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls to the Wrangler dev server (port 8787 by default)
    proxy: {
      "/api": {
        // Switch target to test against the production backend locally.
        // For local backend: target: "http://localhost:8787"
        target: "https://stockflow-api.hola-1c9.workers.dev",
        changeOrigin: true,
        configure: (proxy) => {
          // Chrome refuses to store cookies with Secure; SameSite=None from an
          // HTTP source (even localhost). Strip both attributes so the browser
          // treats them as plain session cookies for http://localhost.
          proxy.on("proxyRes", (proxyRes) => {
            const cookies = proxyRes.headers["set-cookie"];
            if (cookies) {
              proxyRes.headers["set-cookie"] = cookies.map((cookie) =>
                cookie.replace(/;\s*Secure/gi, "").replace(/;\s*SameSite=None/gi, "; SameSite=Lax"),
              );
            }
          });
        },
      },
    },
  },
});
