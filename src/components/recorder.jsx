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

  // 🌍 Device detection
  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = () =>
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || isIOS();
    setDevice(isMobile ? "mobile" : "desktop");
  }, []);

  // 🎧 Unlock audio context (iOS requires touch)
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx({ latencyHint: "interactive" });
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("touchend", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("touchend", unlock);
    };
  }, []);

  // 🧹 Cleanup when unmounted
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  // 🛑 Stop if tab is hidden (mobile multitasking safety)
  useEffect(() => {
    const stopIfHidden = () => {
      const rec = mediaRecorderRef.current;
      if (document.hidden && rec && rec.state === "recording") rec.stop();
    };
    document.addEventListener("visibilitychange", stopIfHidden);
    return () => document.removeEventListener("visibilitychange", stopIfHidden);
  }, []);

  // 🎙️ Start Recording
  const startRecording = async () => {
    if (recording) return;
    try {
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "audio/webm";
      if (isIOS() || isSafari()) mimeType = "audio/mp4"; // ✅ iOS/Safari AAC

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      // 🎛️ Waveform setup
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
        // 🧩 Build final blob
        let blob = new Blob(chunksRef.current, { type: mimeType });
        if ((!blob.type || blob.size === 0) && (isIOS() || isSafari())) {
          blob = new Blob(chunksRef.current, { type: "audio/mp4" });
        }

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log("🎧 Recorded:", blob.type, blob.size);

        // Notify parent (transcribe/save)
        onStop?.({ blob, device });

        // Desktop auto-play preview
        if (device === "desktop") {
          const auto = new Audio(url);
          auto.playsInline = true;
          auto.play().catch(() => {});
        }

        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animationRef.current);
      };

      // ✅ Small delay stabilizes first chunk on iOS
      setTimeout(() => {
        recorder.start(150);
        drawWaveform();
      }, 200);
    } catch (err) {
      console.error("🎤 Recording error:", err);
      window.dispatchEvent(new CustomEvent("toast", { detail: "⚠️ Mic access denied" }));
    }
  };

  // ⏹ Stop Recording
  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      setRecording(false);
      rec.requestData?.(); // flush Safari buffer
      rec.stop();
    }
  };

  // 🎨 Waveform Visualization
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
        const y = canvas.height / 2 + v * 4 * (canvas.height / 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  // ▶️ Play Recorded Audio
  const playRecording = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.playsInline = true;
    audio.play().catch(() =>
      window.dispatchEvent(new CustomEvent("toast", { detail: "🔊 Tap again to play" }))
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
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
