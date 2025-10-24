// ===============================================
// 🚀 main.jsx — React entry point
// Mounts App into #root with Tailwind + StrictMode
// ===============================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // make sure Tailwind is imported here

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
