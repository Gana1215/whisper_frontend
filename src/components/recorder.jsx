import React, { useRef, useState, useEffect } from "react";

export default function Recorder({ onStop }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [device, setDevice] = useState("unknown");
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  // 🧭 Detect browser / device type
  useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    setDevice(isMobile ? "mobile" : "desktop");
  }, []);

  // 🔓 Unlock AudioContext on iOS
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx({ latencyHint: "interactive" });
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("touchend", unlockAudio, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("touchend", unlockAudio);
    };
  }, []);

  // 🎙️ Start recording
  const startRecording = async () => {
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm"
        : "audio/mp4";

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx =
        audioCtxRef.current || new AudioCtx({ latencyHint: "interactive" });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      chunksRef.current = [];
      setRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (onStop) onStop({ blob, url, device });

        // 💻 Desktop: auto playback for instant feedback
        if (device === "desktop") {
          const autoAudio = new Audio(url);
          autoAudio.playsInline = true;
          autoAudio.play().catch((err) =>
            console.warn("Auto-play blocked:", err)
          );
        }

        // 🧹 Cleanup
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animationRef.current);
      };

      recorder.start(100);
      drawWaveform();
    } catch (err) {
      console.error("Recording error:", err);
      alert("🎤 Microphone permission or browser not supported.");
    }
  };

  // ⏹️ Stop recording
  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // 🎨 Waveform visualizer
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#4f46e5";
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        const amplified = v * 6.5;
        const y = canvas.height / 2 + amplified * (canvas.height / 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  // ▶️ Manual playback (mobile safe)
  const playRecording = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.playsInline = true;

    if (device === "desktop") {
      audio.play().catch((err) => console.warn("Playback error:", err));
    } else {
      audio.play().catch(() => {
        alert("🔊 Tap again to allow playback (iOS requires interaction).");
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <canvas
        ref={canvasRef}
        width="500"
        height="100"
        className="rounded-lg shadow-md bg-gray-50"
      ></canvas>

      <div className="flex space-x-4 mt-2">
        {!recording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 transition"
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-500 text-white rounded-full shadow hover:bg-red-600 transition"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      {audioUrl && (
        <button
          onClick={playRecording}
          className="px-6 py-3 bg-green-500 text-white rounded-full shadow hover:bg-green-600 transition"
        >
          ▶️ Play Recording
        </button>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Device detected: <span className="font-mono">{device}</span>
      </p>
    </div>
  );
}
