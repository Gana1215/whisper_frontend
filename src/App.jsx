import React, { useState } from "react";
import axios from "axios";
import { ReactMic } from "react-mic";

const API_URL = "https://wstt-demo.onrender.com/transcribe";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [blobURL, setBlobURL] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [playbackURL, setPlaybackURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [device, setDevice] = useState("unknown");

  // Detect device type (mobile vs desktop)
  React.useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    setDevice(isMobile ? "mobile" : "desktop");
  }, []);

  const startRecording = () => setRecording(true);
  const stopRecording = () => setRecording(false);

  const onStop = async (recordedBlob) => {
    console.log("🎤 Recorded blob:", recordedBlob);
    setBlobURL(recordedBlob.blobURL);
    await sendAudio(recordedBlob.blob);
  };

  const sendAudio = async (blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", blob, "recording.wav");
    formData.append("device", device);

    try {
      const res = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Backend response:", res.data);

      // Handle new backend JSON schema
      const {
        user_text,
        playback_path,
        language,
        duration_sec,
        time_ms,
      } = res.data;

      setTranscript(
        user_text
          ? `📝 ${user_text}\n\n🌐 Language: ${language}\n🎧 Duration: ${duration_sec.toFixed(
              2
            )}s\n⚡ Processing: ${time_ms.toFixed(1)} ms`
          : "No text recognized."
      );

      // Handle playback (if backend provides a path)
      if (playback_path) {
        const fullPlaybackURL = `${API_URL.replace(
          "/transcribe",
          ""
        )}${playback_path}`;
        setPlaybackURL(fullPlaybackURL);
      } else {
        setPlaybackURL("");
      }
    } catch (err) {
      console.error("❌ Transcription error:", err);
      setTranscript("Transcription failed. Please try again.");
      setPlaybackURL("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-blue-50 to-blue-200">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">
        🎙️ Mongolian Whisper Frontend
      </h1>

      <ReactMic
        record={recording}
        className="w-80"
        onStop={onStop}
        strokeColor="#0ea5e9"
        backgroundColor="#e0f2fe"
      />

      <div className="mt-5">
        {!recording ? (
          <button
            onClick={startRecording}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            🎧 Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      {/* Local playback of recorded audio */}
      {blobURL && (
        <audio
          src={blobURL}
          controls
          playsInline
          className="mt-6 border-2 border-blue-300 rounded-xl shadow-md"
        />
      )}

      {/* Playback from backend (TTS or processed WAV) */}
      {playbackURL && (
        <audio
          src={playbackURL}
          controls
          playsInline
          autoPlay
          className="mt-6 border-2 border-green-300 rounded-xl shadow-md"
        />
      )}

      <div className="mt-6 w-full max-w-md">
        {loading ? (
          <p className="text-blue-700 animate-pulse">⏳ Transcribing...</p>
        ) : (
          transcript && (
            <pre className="bg-white p-4 rounded-xl shadow text-gray-700 whitespace-pre-wrap">
              {transcript}
            </pre>
          )
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Device: {device} | API: {API_URL}
      </p>
    </div>
  );
}
