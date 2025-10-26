import React, { useEffect, useState, useRef } from "react";
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
      if (res.data?.status === "ok") console.log("✅ Updated:", file_name);
      else alert("⚠️ Update may not have succeeded.");
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
      } else alert("⚠️ Delete may not have succeeded.");
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
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      console.log("✅ Dataset downloaded");
    } catch (err) {
      console.error("❌ /dataset/export failed:", err);
      alert("⚠️ Failed to download dataset ZIP.");
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        🗂️ Dataset Manager
      </h2>

      {/* 🧾 Scrollable list container */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-4 space-y-1 max-h-[480px] overflow-y-auto">
        {loading && (
          <p className="text-gray-600 animate-pulse">Loading samples...</p>
        )}
        {!loading && samples.length === 0 && (
          <p className="text-gray-600">
            No samples yet. Add from the Transcribe tab.
          </p>
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

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
        <button
          onClick={cleanupAndRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95"
        >
          🔄 Refresh & Clean
        </button>

        <button
          onClick={downloadDataset}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:scale-95"
        >
          ⬇️ Download
        </button>
      </div>
    </div>
  );
}

// 🎵 Row Component — compact + icon-based
function Row({ fileName, initialText, onSave, onDelete }) {
  const [val, setVal] = useState(initialText || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  // ▶️ / ⏹️ Play toggle
  const handlePlay = async () => {
    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      const cleanName = fileName.replace(/^wavs\//, "");
      const audioUrl = `${API_BASE}/record_archive/wavs/${encodeURIComponent(
        cleanName
      )}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playsInline = true;
      audio.onended = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
      console.log(`▶️ Playing: ${audioUrl}`);
    } catch (err) {
      console.error("Play error:", err);
      alert("⚠️ Failed to play this recording.");
    }
  };

  // 🎙️ / ⏹️ Re-record toggle
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
            alert("✅ Re-recorded successfully!");
          } else alert("⚠️ Re-record may not have succeeded.");
        } catch (err) {
          console.error("❌ /dataset/update_audio failed:", err);
          alert("⚠️ Failed to re-record audio.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log(`🎙️ Started re-recording for ${fileName}`);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("⚠️ Microphone access denied or unavailable.");
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-1">
      {/* Left side controls */}
      <div className="flex items-center space-x-2 w-full">
        <button
          onClick={handlePlay}
          className={`${
            isPlaying ? "bg-gray-500" : "bg-green-500"
          } text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 active:scale-95`}
          title={isPlaying ? "Stop playback" : "Play recording"}
        >
          {isPlaying ? "⏹️" : "▶️"}
        </button>

        <button
          onClick={handleRecord}
          className={`${
            isRecording ? "bg-red-600" : "bg-orange-500"
          } text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 active:scale-95`}
          title={isRecording ? "Stop recording" : "Re-record"}
        >
          {isRecording ? "⏹️" : "🎤"}
        </button>

        {/* Single-line text field (longer text visible) */}
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
        title="Delete this sample"
      >
        🗑️
      </button>
    </div>
  );
}
