import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 🌐 Allowed hosts for local, mobile (ngrok/LAN), and Render
const allowedHosts = [
  "localhost",
  "127.0.0.1",

  // 🧭 Optional ngrok tunnel for mobile testing
  "4f96af32fcaa.ngrok-free.app",

  // ☁️ Render backend & frontend domains
  "wstt-demo.onrender.com",           // ✅ FastAPI backend
  "whisper-frontend-dhx3.onrender.com" // ✅ React frontend
];

// 🧩 Dynamically add new host if provided (LAN or custom tunnel)
if (process.env.ALLOWED_HOST) {
  allowedHosts.push(process.env.ALLOWED_HOST);
  console.log(`🔓 Added allowed host: ${process.env.ALLOWED_HOST}`);
}

// 🧠 Log active config at startup
console.log("🛰️ Allowed Hosts:", allowedHosts);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",      // Accessible across LAN / mobile
    port: 5173,
    allowedHosts,
    cors: true,           // Enables API access to Render backend
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 4173,
    allowedHosts,
  },
});
