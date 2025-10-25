// ==========================================
// 🌐 API Utility for Mongolian Whisper Frontend
// Version: 2.0 — Unified Storage Edition
// ✅ Works with /record_archive/wavs/* (no /uploads)
// ✅ Supports /transcribe and /dataset/* routes
// ✅ Mobile-safe + timestamped filenames
// ==========================================

// 🧭 Dynamic backend endpoint (local or Render)
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname.includes("localhost")
    ? "http://127.0.0.1:10000"
    : "https://wstt-demo.onrender.com");

// 🪄 Startup log (for sanity check)
console.log(`🛰️ API_BASE in use → ${API_BASE}`);

// 🧩 Simple timestamp-based filename (usr_YYYYMMDD_HHMMSS.wav)
export function generateFileName(prefix = "usr") {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${prefix}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.wav`;
}

// 🔹 Generic response handler
async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ API Error [${res.status} ${res.statusText}] →`, text);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

// 🎙️ Transcribe audio file (handles iOS/Android blobs too)
export async function transcribeAudio(blob, device = "desktop") {
  const ext =
    blob?.type?.includes("mp4")
      ? "mp4"
      : blob?.type?.includes("webm")
      ? "webm"
      : "wav";

  const fd = new FormData();
  fd.append("file", blob, `recording.${ext}`);
  fd.append("device", device);

  try {
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: "POST",
      body: fd,
    });
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 transcribeAudio failed:", err.message);
    throw err;
  }
}

// 🗂️ Fetch dataset list
export async function listSamples() {
  try {
    const res = await fetch(`${API_BASE}/dataset/list`, {
      headers: { "Cache-Control": "no-cache" },
    });
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 listSamples failed:", err.message);
    throw err;
  }
}

// ➕ Add new dataset sample (auto filename if missing)
export async function addSample(file, text, fileName = null) {
  const ext =
    file?.type?.includes("mp4")
      ? "mp4"
      : file?.type?.includes("webm")
      ? "webm"
      : "wav";

  const name = fileName || generateFileName("usr");
  const fd = new FormData();
  fd.append("file", file, name);
  fd.append("text", text);

  try {
    const res = await fetch(`${API_BASE}/dataset/add`, {
      method: "POST",
      body: fd,
    });
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 addSample failed:", err.message);
    throw err;
  }
}

// ✏️ Update existing dataset entry
export async function updateSample(fileName, newText) {
  const fd = new FormData();
  fd.append("file_name", fileName);
  fd.append("new_text", newText);

  try {
    const res = await fetch(`${API_BASE}/dataset/update`, {
      method: "POST",
      body: fd,
    });
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 updateSample failed:", err.message);
    throw err;
  }
}

// 🗑️ Delete dataset entry
export async function deleteSample(fileName) {
  const fd = new FormData();
  fd.append("file_name", fileName);

  try {
    const res = await fetch(`${API_BASE}/dataset/delete`, {
      method: "POST",
      body: fd,
    });
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 deleteSample failed:", err.message);
    throw err;
  }
}

// 🔊 Build playback URL for any file (desktop + mobile)
export function getAudioUrl(fileName) {
  if (fileName.startsWith("/record_archive"))
    return `${API_BASE}${fileName}`;
  if (fileName.startsWith("wavs/"))
    return `${API_BASE}/record_archive/${fileName}`;
  return `${API_BASE}/record_archive/wavs/${fileName}`;
}

// 🧹 Cleanup orphan files (usr_*, wv_*, temp_*)
export async function cleanupOrphans() {
  try {
    const res = await fetch(`${API_BASE}/dataset/cleanup`, { method: "POST" });
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 cleanupOrphans failed:", err.message);
    throw err;
  }
}

// 🧠 Optional — backend health check
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/`);
    return await handleResponse(res);
  } catch (err) {
    console.error("🚨 Backend unreachable:", err.message);
    return null;
  }
}
