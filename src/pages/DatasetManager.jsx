import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/api";

export default function DatasetManager() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);

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
      alert("⚠️ Failed to load dataset list.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Update text in CSV
  const updateText = async (file_name, new_text) => {
    if (!new_text.trim()) return;
    const fd = new FormData();
    fd.append("file_name", file_name);
    fd.append("new_text", new_text);
    try {
      const res = await axios.post(`${API_BASE}/dataset/update`, fd);
      if (res.data?.status === "ok") {
        console.log("✅ Updated:", file_name);
      } else {
        alert("⚠️ Update may not have succeeded.");
      }
    } catch (err) {
      console.error("❌ /dataset/update failed:", err);
      alert("⚠️ Update failed.");
    }
  };

  // ✅ Delete sample and refresh
  const deleteSample = async (file_name) => {
    if (!window.confirm(`🗑️ Delete "${file_name}"?`)) return;
    const fd = new FormData();
    fd.append("file_name", file_name);

    try {
      const res = await axios.post(`${API_BASE}/dataset/delete`, fd);
      if (res.data?.status === "ok") {
        setSamples((prev) => prev.filter((s) => s.file_name !== file_name));
        await fetchSamples();
      } else {
        alert("⚠️ Delete may not have succeeded.");
      }
    } catch (err) {
      console.error("❌ /dataset/delete failed:", err);
      alert("Delete failed — check backend logs.");
    }
  };

  // 🚀 Fetch on load
  useEffect(() => {
    fetchSamples();
    window.addEventListener("dataset-updated", fetchSamples);
    return () => window.removeEventListener("dataset-updated", fetchSamples);
  }, []);

  // 🧹 Cleanup orphan files + refresh
  const cleanupAndRefresh = async () => {
    try {
      const res = await axios.post(`${API_BASE}/dataset/cleanup`);
      console.log(`🧹 Cleaned ${res.data?.removed || 0} orphan files`);
    } catch (e) {
      console.warn("⚠️ Cleanup failed:", e);
    }
    await fetchSamples();
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">🗂️ Dataset Manager</h2>

      {/* 🧾 Scrollable list container */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-4 space-y-2 max-h-[480px] overflow-y-auto">
        {loading && <p className="text-gray-600 animate-pulse">Loading samples...</p>}
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

      <button
        onClick={cleanupAndRefresh}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition active:scale-95"
      >
        🔄 Refresh & Clean Orphans
      </button>
    </div>
  );
}

// 🎵 Row Component
function Row({ fileName, initialText, onSave, onDelete }) {
  const [val, setVal] = useState(initialText || "");

  const handlePlay = async () => {
    try {
      // 🧩 file_name may include 'wavs/', clean before using
      const cleanName = fileName.replace(/^wavs\//, "");
      const audioUrl = `${API_BASE}/record_archive/wavs/${encodeURIComponent(cleanName)}`;
      const audio = new Audio(audioUrl);
      audio.playsInline = true;
      await audio.play();
      console.log(`▶️ Playing: ${audioUrl}`);
    } catch (err) {
      console.error("Play error:", err);
      alert("⚠️ Failed to play this recording. File may not exist.");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2">
      <div className="flex items-center space-x-2 w-full">
        <button
          onClick={handlePlay}
          className="bg-green-500 text-white rounded-full px-3 py-1 hover:bg-green-600 active:scale-95"
          title="Play this recording"
        >
          ▶️
        </button>

        <div className="flex flex-col w-full">
          <span className="text-xs text-gray-500 truncate">{fileName}</span>
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => onSave(val)}
            rows={2}
            className="border p-2 rounded w-full resize-y min-h-[48px] focus:ring focus:ring-blue-200"
          />
        </div>
      </div>

      <button
        onClick={onDelete}
        className="text-red-600 hover:text-red-800 hover:underline mt-2 sm:mt-0 sm:ml-4"
        title="Delete this sample"
      >
        🗑️ Delete
      </button>
    </div>
  );
}
