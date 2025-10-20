import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Vite config for Render hosting
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 4173,
    allowedHosts: [
      "whisper-frontend-dhx3.onrender.com", // your Render domain
    ],
  },
});
