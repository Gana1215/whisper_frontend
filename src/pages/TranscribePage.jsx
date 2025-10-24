import React, { useState, useEffect } from "react";
import axios from "axios";
import Recorder from "../components/Recorder";
import { API_BASE } from "../utils/api";

export default function TranscribePage() {
  const [audioBlob, setAudioBlob] = useState(null);
  const [text, setText] = useState("");
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [device, setDevice] = useState("desktop");

  // 🔍 Detect device for backend tagging
  useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    setDevice(isMobile ? "mobile" : "desktop");
  }, []);

  // 🎙️ Handle recording stop event
  const handleStop = async ({ blob }) => {
    if (!blob) return;
    setAudioBlob(blob);

    // ✅ Small delay ensures Safari/Chrome finishes writing audio
    setTimeout(() => sendAudio(blob), 300);
  };

  // 🧠 Send blob for transcription
  const sendAudio = async (blob) => {
    setLoading(true);
    setText("");

    const ext = blob?.type?.includes("mp4")
      ? "mp4"
      : blob?.type?.includes("webm")
      ? "webm"
      : "wav";

    const fd = new FormData();
    fd.append("file", blob, `recording.${ext}`);
    fd.append("device", device);

    try {
      const res = await axios.post(`${API_BASE}/transcribe`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const t = res.data?.user_text || "";
      setText(t.length > 0 ? t : "No text recognized.");
    } catch (err) {
      console.error("❌ /transcribe failed:", err);
      const msg =
        err.response?.data?.detail || err.message || "Transcription failed.";
      setText(`⚠️ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // 💾 Save to dataset (with proper filename)
  const saveToCSV = async () => {
    if (!audioBlob) return alert("Record first!");
    if (!manualText.trim()) return alert("Enter the corresponding text!");

    // 🕒 Generate unique timestamp name (usr_YYYYMMDD_HHMMSS.wav)
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const fileName = `usr_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(
      now.getSeconds()
    )}.wav`;

    const fd = new FormData();
    fd.append("file", audioBlob, fileName);
    fd.append("text", manualText.trim());

    try {
      const res = await axios.post(`${API_BASE}/dataset/add`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "ok") {
        setSaved(true);
        setManualText("");
        setTimeout(() => setSaved(false), 1500);

        // ✅ 🔔 Notify DatasetManager to refresh automatically
        window.dispatchEvent(new Event("dataset-updated"));
      } else {
        alert("⚠️ Save may not have succeeded. Check logs.");
      }
    } catch (e) {
      console.error("❌ /dataset/add failed:", e);
      alert("Failed to save to dataset.");
    }
  };

  // 🖼️ UI
  return (
    <div className="flex flex-col items-center space-y-4">
      <Recorder onStop={handleStop} />

      <div className="w-full max-w-md mt-4 text-center">
        {loading ? (
          <p className="text-blue-700 animate-pulse">⏳ Transcribing...</p>
        ) : (
          <p className="bg-white p-3 rounded-xl shadow text-gray-700 whitespace-pre-wrap">
            {text ? `📝 ${text}` : "🎙️ Record to start transcription"}
          </p>
        )}
      </div>

      <div className="mt-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Enter corresponding text for this recording..."
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          className="w-full p-2 rounded-lg border border-blue-300 focus:ring focus:ring-blue-200"
        />

        <button
          onClick={saveToCSV}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition"
        >
          💾 Save to CSV DB
        </button>

        {saved && <p className="text-green-700 mt-2">✔️ Saved</p>}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Device: <span className="font-mono">{device}</span>
      </p>
    </div>
  );
}
