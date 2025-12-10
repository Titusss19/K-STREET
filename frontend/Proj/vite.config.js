import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./", // <-- added (fixes missing CSS/JS on ngrok)
  server: {
    port: 3000,
    host: true, // <-- added (allow external access)
    allowedHosts: true, // <-- added (allow ngrok domains)
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
