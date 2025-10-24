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

  // 🧭 Detect device type
  useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    setDevice(isMobile ? "mobile" : "desktop");
  }, []);

  // 🔓 iOS audio unlock on touch
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx({ latencyHint: "interactive" });
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("touchend", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("touchend", unlock);
    };
  }, []);

  // 🧹 Cleanup when component unmounts
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // 🎙️ Start recording
  const startRecording = async () => {
    if (recording) return;
    try {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const mimeType = isSafari
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
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
        let blob = new Blob(chunksRef.current, { type: mimeType });
        // Safari fallback if blob type empty
        if (!blob.type || blob.size === 0) {
          blob = new Blob(chunksRef.current, { type: "audio/mp4" });
        }

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        console.log("🎧 Blob size:", blob.size, "type:", blob.type);
        onStop?.({ blob, device });

        // Auto-play on desktop
        if (device === "desktop") {
          const auto = new Audio(url);
          auto.playsInline = true;
          auto.play().catch((err) => console.warn("Auto-play blocked:", err));
        }

        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animationRef.current);
      };

      // Safari-friendly delayed start
      setTimeout(() => {
        recorder.start(100);
        drawWaveform();
      }, 200);
    } catch (err) {
      console.error("🎤 Recording error:", err);
      alert("Microphone permission denied or browser not supported.");
    }
  };

  // ⏹ Stop recording
  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      setRecording(false);
      rec.requestData?.();
      rec.stop();
    }
  };

  // 🎨 Waveform drawing
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

      const sliceWidth = canvas.width / bufferLength;
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

  // ▶️ Play last recorded clip
  const playRecording = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.playsInline = true;
    audio.play().catch(() => {
      alert("🔊 Tap again to allow playback (iOS requires interaction).");
    });
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <canvas
        ref={canvasRef}
        width="500"
        height="100"
        className="rounded-lg shadow-md bg-gray-50"
      />

      <div className="flex space-x-4 mt-2">
        {!recording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 active:scale-95 transition"
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-500 text-white rounded-full shadow hover:bg-red-600 active:scale-95 transition"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      {audioUrl && (
        <button
          onClick={playRecording}
          className="px-6 py-3 bg-green-500 text-white rounded-full shadow hover:bg-green-600 active:scale-95 transition"
        >
          ▶️ Play Recording
        </button>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Device: <span className="font-mono">{device}</span>
      </p>
    </div>
  );
}
