import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 🌐 Allowed hosts for local + Render backend/frontend
const allowedHosts = [
  "localhost",
  "127.0.0.1",
  "wstt-demo.onrender.com",          // ✅ your Render backend
  "whisper-frontend-dhx3.onrender.com", // ✅ your Render frontend (added)
];

// Dynamically add ngrok or LAN IP if testing on mobile
if (process.env.ALLOWED_HOST) {
  allowedHosts.push(process.env.ALLOWED_HOST);
  console.log(`🔓 Added allowed host: ${process.env.ALLOWED_HOST}`);
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts,
    cors: true,
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 4173,
    allowedHosts,
  },
});
