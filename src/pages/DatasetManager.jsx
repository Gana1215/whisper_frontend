// ===============================================
// 🎙️ DatasetManager.jsx (v4.1.8 — Safe Download + Delete/Re-Record Confirmation)
// ✅ Adds reliable ZIP download for Render + all browsers
// ✅ Keeps Safe Delete + Re-Record confirmations
// ✅ All other logic untouched
// ===============================================

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../utils/api";

export default function DatasetManager() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [currentIdx, setCurrentIdx] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dataset/list?_=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const rows = res.data?.samples || [];
      setSamples(rows);
      setCurrentIdx((idx) =>
        idx == null ? null : Math.min(idx, Math.max(0, rows.length - 1))
      );
    } catch (err) {
      console.error("❌ /dataset/list failed:", err);
      showToast("⚠️ Failed to load dataset list.");
    } finally {
      setLoading(false);
    }
  };

  const updateText = async (file_name, new_text) => {
    const cleanName = (file_name || "").trim();
    const cleanText = (new_text || "").trim();
    if (!cleanName || !cleanText) {
      showToast("⚠️ Empty text ignored");
      return;
    }

    const fd = new FormData();
    fd.append("file_name", cleanName);
    fd.append("new_text", cleanText);

    try {
      const res = await axios.post(`${API_BASE}/dataset/update`, fd);
      if (res.data?.status === "ok") {
        showToast("💾 Text updated");
        setSamples((prev) =>
          prev.map((s) =>
            s.file_name === cleanName ? { ...s, text: cleanText } : s
          )
        );
      } else showToast("⚠️ Update failed.");
    } catch (err) {
      console.error("❌ /dataset/update failed:", err);
      showToast("⚠️ Update failed.");
    }
  };

  const addNewRecord = async () => {
    try {
      setAdding(true);
      const res = await axios.post(`${API_BASE}/dataset/add_empty`);
      if (res.data?.status === "ok") {
        showToast("➕ Added new voice room");
        await fetchSamples();
        setTimeout(() => {
          const list = document.querySelector(".dataset-list");
          if (list) list.scrollTop = list.scrollHeight;
          setCurrentIdx((rowsLen) => {
            const len = document.querySelectorAll(".dataset-list .row-item").length;
            return len ? len - 1 : null;
          });
        }, 200);
      } else showToast("⚠️ Add failed.");
    } catch (err) {
      console.error("❌ /dataset/add_empty failed:", err);
      showToast("⚠️ Add failed.");
    } finally {
      setAdding(false);
    }
  };

  // 🧩 Safe Delete Confirmation
  const deleteSample = async (file_name) => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to delete "${file_name}"?\nThis action cannot be undone.`
    );
    if (!confirmDelete) return;

    const fd = new FormData();
    fd.append("file_name", file_name);
    try {
      const res = await axios.post(`${API_BASE}/dataset/delete`, fd);
      if (res.data?.status === "ok") {
        setSamples((prev) => {
          const idx = prev.findIndex((s) => s.file_name === file_name);
          const next = prev.filter((s) => s.file_name !== file_name);
          if (idx !== -1) {
            const newIdx = Math.min(idx, Math.max(0, next.length - 1));
            setCurrentIdx(next.length ? newIdx : null);
          }
          return next;
        });
        showToast("🗑️ Deleted");
      } else showToast("⚠️ Delete failed.");
    } catch (err) {
      console.error("❌ /dataset/delete failed:", err);
      showToast("⚠️ Delete failed.");
    }
  };

  useEffect(() => {
    fetchSamples();
    return () => {
      const audios = document.querySelectorAll("audio");
      audios.forEach((a) => a.pause());
    };
  }, []);

  // =====================================================
  // ⬇️ Fixed: Safe Unified Dataset Download (Render-safe)
  // =====================================================
  const downloadDataset = async () => {
    try {
      showToast("⏳ Preparing ZIP...");
      const res = await axios.get(`${API_BASE}/dataset/export?_=${Date.now()}`, {
        responseType: "blob",
        headers: { "Cache-Control": "no-cache" },
      });

      const ct = (res.headers["content-type"] || "").toLowerCase();
      if (!ct.includes("application/zip")) {
        const text = await new Response(res.data).text().catch(() => "");
        showToast(text || "⚠️ Download error.");
        return;
      }

      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const cd = res.headers["content-disposition"] || "";
      const match = cd.match(/filename="?([^"]+)"?/i);
      const filename =
        match?.[1] ||
        `MongolianWhisper_FullDataset_${new Date()
          .toISOString()
          .replace(/[:.]/g, "_")}.zip`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("✅ Download complete!");
    } catch (err) {
      console.error("❌ /dataset/export failed:", err);
      showToast("⚠️ Download failed. Check backend or CORS.");
    }
  };

  const total = samples.length;
  const currentHuman = currentIdx != null ? currentIdx + 1 : null;

  return (
    <div className="relative w-full flex flex-col items-center">
      {toast && (
        <div className="absolute top-2 z-50 bg-gray-900 text-white text-sm px-3 py-1 rounded-md shadow animate-fade">
          {toast}
        </div>
      )}

      <h2 className="text-2xl font-bold text-blue-700 mb-1">🗂️ Dataset Manager</h2>

      <div className="text-sm text-gray-700 mb-2">
        {total > 0 ? (
          currentHuman ? (
            <>Record <span className="font-semibold">{currentHuman}</span> / {total}</>
          ) : (
            <>Total records: <span className="font-semibold">{total}</span></>
          )
        ) : (
          <>No records</>
        )}
      </div>

      <button
        onClick={addNewRecord}
        disabled={adding}
        className={`mb-3 px-4 py-2 text-white rounded-lg text-sm ${
          adding
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 active:scale-95"
        }`}
      >
        {adding ? "⏳ Adding..." : "➕ Add New Voice Room"}
      </button>

      <div className="dataset-list w-full max-w-2xl bg-white rounded-lg shadow p-3 space-y-1 max-h=[460px] max-h-[460px] overflow-y-auto">
        {loading && <p className="text-gray-600 animate-pulse">Loading...</p>}
        {!loading && samples.length === 0 && (
          <p className="text-gray-600">No samples yet. Add new voice room.</p>
        )}
        {samples.map((s, i) => (
          <Row
            key={s.file_name}
            index={i}
            fileName={s.file_name}
            initialText={s.text || s[" text"] || ""}
            onSave={(text) => updateText(s.file_name, text)}
            onDelete={() => deleteSample(s.file_name)}
            onUpdated={fetchSamples}
            onFocusRow={() => setCurrentIdx(i)}
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
function Row({ index, fileName, initialText, onSave, onDelete, onUpdated, onFocusRow }) {
  const [val, setVal] = useState(initialText || "");
  const [editing, setEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const handlePlay = async () => {
    if (editing) return;
    try {
      onFocusRow?.();
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }
      const cleanName = fileName.replace(/^wavs\//, "");
      const audioUrl = `${API_BASE}/record_archive/wavs/${encodeURIComponent(cleanName)}?_=${Date.now()}`;
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

  // 🧩 Safe Re-Record Confirmation
  const handleRecord = async () => {
    if (editing) return;
    if (!isRecording) {
      const confirmReRecord = window.confirm(
        `🎙️ If you re-record, the previous recording for "${fileName}" will be overwritten.\nAre you sure you want to continue?`
      );
      if (!confirmReRecord) return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      onFocusRow?.();
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
          if (res.data?.status === "ok") onUpdated();
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

  const toggleEdit = async () => {
    if (editing) await onSave(val);
    setEditing(!editing);
    onFocusRow?.();
  };

  return (
    <div className="row-item flex items-center justify-between border-b border-gray-200 pb-1">
      <div className="flex items-center space-x-2 w-full" onMouseDown={onFocusRow} onFocus={onFocusRow}>
        <button
          onClick={handlePlay}
          disabled={editing}
          className={`${isPlaying ? "bg-gray-500" : "bg-green-500"} text-white rounded-full w-7 h-7 flex items-center justify-center ${
            editing ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
          }`}
        >
          {isPlaying ? "⏹️" : "▶️"}
        </button>

        <button
          onClick={handleRecord}
          disabled={editing}
          className={`${isRecording ? "bg-red-600" : "bg-orange-500"} text-white rounded-full w-7 h-7 flex items-center justify-center ${
            editing ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
          }`}
        >
          {isRecording ? "⏹️" : "🎤"}
        </button>

        <button
          onClick={toggleEdit}
          className={`${editing ? "bg-blue-600" : "bg-gray-400"} text-white rounded-full w-7 h-7 flex items-center justify-center hover:opacity-90 active:scale-95`}
          title={editing ? "Save" : "Edit text"}
        >
          {editing ? "✔️" : "✏️"}
        </button>

        <input
          type="text"
          value={val}
          readOnly={!editing}
          onChange={(e) => setVal(e.target.value)}
          onFocus={onFocusRow}
          className={`border p-1 rounded text-sm truncate transition-all duration-300 ease-in-out ${
            editing ? "bg-white" : "bg-gray-100 cursor-default"
          } focus:ring focus:ring-blue-200 focus:outline-none overflow-x-auto`}
          style={{
            fontSize: "0.95rem",
            flex: 1,
            width: editing ? "clamp(220px, 18ch, 420px)" : "clamp(200px, 15ch, 360px)",
            minWidth: "200px",
            maxWidth: "calc(100% - 90px)",
            letterSpacing: "0.2px",
          }}
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
