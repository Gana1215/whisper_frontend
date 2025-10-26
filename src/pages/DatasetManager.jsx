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
    setTimeout(() => setToast(""), 1800);
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

  // ✅ Update text in CSV
  const updateText = async (file_name, new_text) => {
    if (!new_text.trim()) return;
    const fd = new FormData();
    fd.append("file_name", file_name);
    fd.append("new_text", new_text);
    try {
      const res = await axios.post(`${API_BASE}/dataset/update`, fd);
      if (res.data?.status === "ok") showToast("💾 Updated");
    } catch (err) {
      console.error("❌ /dataset/update failed:", err);
      showToast("⚠️ Update failed.");
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
      }
    } catch (err) {
      console.error("❌ /dataset/delete failed:", err);
      showToast("⚠️ Delete failed.");
    }
  };

  // 🚀 On load
  useEffect(() => {
    fetchSamples();
    window.addEventListener("dataset-updated", fetchSamples);
    const handleToast = (e) => showToast(e.detail);
    window.addEventListener("toast", handleToast);
    return () => {
      window.removeEventListener("dataset-updated", fetchSamples);
      window.removeEventListener("toast", handleToast);
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
      {/* ✅ Floating Toast */}
      {toast && (
        <div className="absolute top-2 z-50 bg-gray-900 text-white text-sm px-3 py-1 rounded-md shadow animate-fade">
          {toast}
        </div>
      )}

      <h2 className="text-2xl font-bold text-blue-700 mb-3">🗂️ Dataset Manager</h2>

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

// 🎵 Row Component (compact, icon-only, smooth)
function Row({ fileName, initialText, onSave, onDelete }) {
  const [val, setVal] = useState(initialText || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  // ▶️ Play/Stop
  const handlePlay = async () => {
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
      console.error("Play error:", err);
      window.dispatchEvent(new CustomEvent("toast", { detail: "⚠️ Play failed" }));
    }
  };

  // 🎙️ Record/Stop toggle
  const handleRecord = async () => {
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
          const res = await axios.post(`${API_BASE}/dataset/update_audio`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (res.data?.status === "ok") {
            window.dispatchEvent(new CustomEvent("toast", { detail: "🎙️ Re-recorded" }));
          }
        } catch (err) {
          console.error("❌ /dataset/update_audio failed:", err);
          window.dispatchEvent(new CustomEvent("toast", { detail: "⚠️ Record failed" }));
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      window.dispatchEvent(new CustomEvent("toast", { detail: "⚠️ Mic access denied" }));
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-1">
      <div className="flex items-center space-x-2 w-full">
        {/* ▶️ / ⏹️ */}
        <button
          onClick={handlePlay}
          className={`${
            isPlaying ? "bg-gray-500" : "bg-green-500"
          } text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 active:scale-95`}
          title={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? "⏹️" : "▶️"}
        </button>

        {/* 🎙️ / ⏹️ */}
        <button
          onClick={handleRecord}
          className={`${
            isRecording ? "bg-red-600" : "bg-orange-500"
          } text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 active:scale-95`}
          title={isRecording ? "Stop" : "Re-record"}
        >
          {isRecording ? "⏹️" : "🎤"}
        </button>

        {/* 📝 Editable single line */}
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => onSave(val)}
          className="border p-1 rounded w-full text-sm truncate focus:ring focus:ring-blue-200"
        />
      </div>

      {/* 🗑️ Delete */}
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

/* ✨ Add to your global CSS or tailwind.css:
@keyframes fade {
  0% { opacity: 0; transform: translateY(-5px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-5px); }
}
.animate-fade {
  animation: fade 1.8s ease-in-out;
}
*/
