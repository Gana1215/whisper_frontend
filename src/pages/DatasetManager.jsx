import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../utils/api";

export default function DatasetManager() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

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

  // ✅ Fixed field name: backend expects "text"
  const updateText = async (file_name, new_text) => {
    const clean = (new_text || "").trim();
    if (!clean) return;
    const fd = new FormData();
    fd.append("file_name", file_name);
    fd.append("text", clean); // ✅ Fixed

    try {
      const res = await axios.post(`${API_BASE}/dataset/update`, fd);
      if (res.data?.status === "ok") {
        setSamples((prev) =>
          prev.map((s) =>
            s.file_name === file_name ? { ...s, text: clean } : s
          )
        );
        showToast("💾 Updated");
      }
    } catch (err) {
      console.error("❌ /dataset/update failed:", err);
      showToast("⚠️ Update failed.");
    }
  };

  const deleteSample = async (file_name) => {
    const fd = new FormData();
    fd.append("file_name", file_name);
    try {
      const res = await axios.post(`${API_BASE}/dataset/delete`, fd);
      if (res.data?.status === "ok") {
        setSamples((prev) => prev.filter((s) => s.file_name !== file_name));
        showToast("🗑️ Deleted");
      }
    } catch (err) {
      console.error("❌ /dataset/delete failed:", err);
      showToast("⚠️ Delete failed.");
    }
  };

  useEffect(() => {
    fetchSamples();
    window.addEventListener("dataset-updated", fetchSamples);
    return () => {
      window.removeEventListener("dataset-updated", fetchSamples);
    };
  }, []);

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
            onReplaced={fetchSamples}
          />
        ))}
      </div>

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

// 🎵 Row Component
function Row({ fileName, initialText, onSave, onDelete, onReplaced }) {
  const [val, setVal] = useState(initialText || "");

  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-1">
      <div className="flex items-center space-x-2 w-full">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => onSave(val)}
          className="border p-1 rounded w-full text-sm truncate focus:ring focus:ring-blue-200"
        />
      </div>
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
