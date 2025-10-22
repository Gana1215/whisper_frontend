import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "172.20.10.8", // 🔹 your local network IP for iPhone testing
      "3048592c92ad.ngrok-free.app", // 🔹 current ngrok domain (mobile test)
    ],
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 4173,
    allowedHosts: [
      "whisper-frontend-dhx3.onrender.com", // ✅ your Render production domain
    ],
  },
});
