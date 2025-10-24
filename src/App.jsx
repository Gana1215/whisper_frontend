// ===============================================
// 🎙️ Mongolian Whisper Frontend (v2.1)
// Elegant tabbed UI for Transcription & Dataset
// ===============================================

import React, { useState } from "react";
import TranscribePage from "./pages/TranscribePage";
import DatasetManager from "./pages/DatasetManager";

export default function App() {
  const [activeTab, setActiveTab] = useState("transcribe");

  const renderPage = () => {
    switch (activeTab) {
      case "dataset":
        return <DatasetManager />;
      default:
        return <TranscribePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center text-center">
      {/* Header */}
      <header className="mt-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 drop-shadow-sm">
          🎙️ Mongolian Whisper Frontend
        </h1>
        <p className="text-sm text-indigo-600/70 mt-1">
          Fast Speech-to-Text + Dataset Curation
        </p>
      </header>

      {/* Tabs */}
      <nav
        className="flex space-x-4 sm:space-x-6 mt-6"
        role="tablist"
        aria-label="Main navigation"
      >
        <TabButton
          label="🎧 Transcribe"
          active={activeTab === "transcribe"}
          onClick={() => setActiveTab("transcribe")}
        />
        <TabButton
          label="🗂️ Dataset Manager"
          active={activeTab === "dataset"}
          onClick={() => setActiveTab("dataset")}
        />
      </nav>

      {/* Page container */}
      <main className="w-full max-w-2xl mt-6 px-4 pb-16 transition-opacity duration-500 ease-in-out">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="mt-auto mb-4 text-xs text-indigo-600/70">
        Built with ❤️ by <b>Ganaacts</b> — Mongolian Whisper STT
        <br />
        <span className="text-[10px] opacity-70">
          (React + FastAPI • Mobile ready)
        </span>
      </footer>
    </div>
  );
}

// 🎛️ Reusable tab button component
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      className={`px-4 py-2 rounded-lg font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
        active
          ? "bg-indigo-600 text-white shadow-md scale-105"
          : "bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50"
      }`}
    >
      {label}
    </button>
  );
}
