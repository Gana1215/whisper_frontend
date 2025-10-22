import React, { useState, useEffect } from "react";
import axios from "axios";
import { ReactMic } from "react-mic";

const API_URL = "https://wstt-demo.onrender.com/transcribe";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [device, setDevice] = useState("unknown");

  // Detect device type
  useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    setDevice(isMobile ? "mobile" : "desktop");
  }, []);

  const startRecording = () => setRecording(true);
  const stopRecording = () => setRecording(false);

  const onStop = async (recordedBlob) => {
    console.log("🎤 Recorded:", recordedBlob);
    await sendAudio(recordedBlob.blob, recordedBlob.device);
  };

  const sendAudio = async (blob, deviceType = device) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", blob, "recording.wav");
    formData.append("device", deviceType);

    try {
      const res = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("✅ Backend response:", res.data);

      // Simplified handling
      const { user_text, playback_path } = res.data;
      setTranscript(user_text || "No text recognized.");

      if (playback_path) {
        const fullURL = `${API_URL.replace("/transcribe", "")}${playback_path}`;
        setAudioSrc(fullURL);
      } else {
        setAudioSrc(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error("❌ Transcription error:", err);
      setTranscript("Transcription failed.");
      setAudioSrc(null);
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
        strokeColor="#0ea5e9"
        backgroundColor="#e0f2fe"
        onStop={onStop}
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

      {/* 🎵 Single player — only backend playback */}
      {audioSrc && (
        <audio
          src={audioSrc}
          controls
          playsInline
          autoPlay={device === "desktop"}
          className="mt-6 border-2 border-blue-300 rounded-xl shadow-md w-72 sm:w-96"
        />
      )}

      <div className="mt-6 w-full max-w-md">
        {loading ? (
          <p className="text-blue-700 animate-pulse">⏳ Transcribing...</p>
        ) : (
          transcript && (
            <p className="bg-white p-4 rounded-xl shadow text-gray-700 whitespace-pre-wrap">
              {transcript}
            </p>
          )
        )}
      </div>
    </div>
  );
}
