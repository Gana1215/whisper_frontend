// ===============================================
// 🎙️ DatasetManager.jsx (v4.0 — Enhanced Edition)
// ✅ Fix: text updates correctly (no "EMPTY_AUDIO")
// ✅ Add: ✏️ edit mode with lock/unlock
// ✅ Add: ➕ new record (placeholder beep)
// ✅ Fully mobile-safe
// ===============================================

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../utils/api";

export default function DatasetManager() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // ✅ Toast helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  // ✅ Fetch dataset list
  const fetchSamples = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dataset/list?_=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      setSamples(res.data?.samples || []);
    } catch (err) {
      console.error("❌ /dataset/list failed:", err);
      showToast("⚠️ Failed to load dataset list.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Update text in CSV (fixed key)
  const updateText = async (file_name, new_text) => {
    const cleanName = (file_name || "").trim();
    const cleanText = (new_text || "").trim();
    if (!cleanName || !cleanText) {
      showToast("⚠️ Empty text ignored");
      return;
    }

    const fd = new FormData();
    fd.append("file_name", cleanName);
    fd.append("text", cleanText); // ✅ FIXED key

    try {
      const res = await axios.post(`${API_BASE}/dataset/update`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "ok") {
        showToast("💾 Updated");
        setSamples((prev) =>
          prev.map((s) =>
            s.file_name === cleanName ? { ...s, text: cleanText } : s
          )
        );
      } else {
        showToast("⚠️ Update failed.");
      }
    } catch (err) {
      console.error("❌ /dataset/update failed:", err);
      showToast("⚠️ Update failed.");
    }
  };

  // ✅ Add new placeholder record
  const addNewRecord = async () => {
    try {
      const res = await axios.post(`${API_BASE}/dataset/add_empty`);
      if (res.data?.status === "ok") {
        showToast("➕ Added new record");
        fetchSamples();
      } else showToast("⚠️ Add failed.");
    } catch (err) {
      console.error("❌ /dataset/add_empty failed:", err);
      showToast("⚠️ Add failed.");
    }
  };

  // ✅ Delete sample
  const deleteSample = async (file_name) => {
    const fd = new FormData();
    fd.append("file_name", file_name);
    try {
      const res = await axios.post(`${API_BASE}/dataset/delete`, fd);
      if (res.data?.status === "ok") {
        setSamples((prev) => prev.filter((s) => s.file_name !== file_name));
        showToast("🗑️ Deleted");
      } else showToast("⚠️ Delete failed.");
    } catch (err) {
      console.error("❌ /dataset/delete failed:", err);
      showToast("⚠️ Delete failed.");
    }
  };

  // 🚀 On load
  useEffect(() => {
    fetchSamples();
    window.addEventListener("dataset-updated", fetchSamples);
    return () => {
      window.removeEventListener("dataset-updated", fetchSamples);
    };
  }, []);

  // ⬇️ Download dataset ZIP
  const downloadDataset = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dataset/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "MongolianWhisper_Dataset.zip";
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("⬇️ Downloaded!");
    } catch (err) {
      console.error("❌ /dataset/export failed:", err);
      showToast("⚠️ Download failed.");
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {toast && (
        <div className="absolute top-2 z-50 bg-gray-900 text-white text-sm px-3 py-1 rounded-md shadow animate-fade">
          {toast}
        </div>
      )}

      <h2 className="text-2xl font-bold text-blue-700 mb-3">🗂️ Dataset Manager</h2>

      {/* ➕ Add Button */}
      <button
        onClick={addNewRecord}
        className="mb-3 px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 text-sm"
      >
        ➕ Add New Record
      </button>

      {/* 🧾 Scrollable list */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-3 space-y-1 max-h-[460px] overflow-y-auto">
        {loading && <p className="text-gray-600 animate-pulse">Loading...</p>}
        {!loading && samples.length === 0 && (
          <p className="text-gray-600">No samples yet. Add from the Transcribe tab.</p>
        )}
        {samples.map((s) => (
          <Row
            key={s.file_name}
            fileName={s.file_name}
            initialText={s.text || s[" text"] || ""}
            onSave={(text) => updateText(s.file_name, text)}
            onDelete={() => deleteSample(s.file_name)}
          />
        ))}
      </div>

      {/* 🔄 / ⬇️ Buttons */}
      <div className="flex space-x-3 mt-4">
        <button
          onClick={fetchSamples}
          className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 text-sm"
        >
          🔄 Refresh
        </button>
        <button
          onClick={downloadDataset}
          className="px-4 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:scale-95 text-sm"
        >
          ⬇️ Download
        </button>
      </div>
    </div>
  );
}

// 🎵 Row Component (Compact, editable, mobile-safe)
function Row({ fileName, initialText, onSave, onDelete }) {
  const [val, setVal] = useState(initialText || "");
  const [editing, setEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  // ▶️ Play
  const handlePlay = async () => {
    if (editing) return; // disable while editing
    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }
      const cleanName = fileName.replace(/^wavs\//, "");
      const audioUrl = `${API_BASE}/record_archive/wavs/${encodeURIComponent(cleanName)}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playsInline = true;
      audio.onended = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("⚠️ Play failed:", err);
    }
  };

  // 🎙️ Re-record
  const handleRecord = async () => {
    if (editing) return; // disable while editing
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("file", blob, "re_record.webm");
        fd.append("file_name", fileName);
        try {
          const res = await axios.post(`${API_BASE}/dataset/update_audio`, fd);
          if (res.data?.status === "ok") window.location.reload();
        } catch (err) {
          console.error("❌ /dataset/update_audio failed:", err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("⚠️ Mic access denied:", err);
    }
  };

  // 📝 Toggle edit
  const toggleEdit = async () => {
    if (editing) {
      await onSave(val);
    }
    setEditing(!editing);
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-1">
      <div className="flex items-center space-x-2 w-full">
        {/* ▶️ */}
        <button
          onClick={handlePlay}
          disabled={editing}
          className={`${
            isPlaying ? "bg-gray-500" : "bg-green-500"
          } text-white rounded-full w-7 h-7 flex items-center justify-center ${
            editing ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
          }`}
        >
          {isPlaying ? "⏹️" : "▶️"}
        </button>

        {/* 🎙️ */}
        <button
          onClick={handleRecord}
          disabled={editing}
          className={`${
            isRecording ? "bg-red-600" : "bg-orange-500"
          } text-white rounded-full w-7 h-7 flex items-center justify-center ${
            editing ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
          }`}
        >
          {isRecording ? "⏹️" : "🎤"}
        </button>

        {/* ✏️ / ✔️ */}
        <button
          onClick={toggleEdit}
          className={`${
            editing ? "bg-blue-600" : "bg-gray-400"
          } text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 active:scale-95`}
          title={editing ? "Save" : "Edit text"}
        >
          {editing ? "✔️" : "✏️"}
        </button>

        {/* Text field */}
        <input
          type="text"
          value={val}
          readOnly={!editing}
          onChange={(e) => setVal(e.target.value)}
          className={`border p-1 rounded w-full text-sm truncate ${
            editing ? "bg-white" : "bg-gray-100 cursor-default"
          } focus:ring focus:ring-blue-200`}
        />
      </div>

      {/* 🗑️ */}
      <button
        onClick={onDelete}
        className="text-red-600 hover:text-red-800 ml-2 text-sm"
        title="Delete sample"
      >
        🗑️
      </button>
    </div>
  );
}
