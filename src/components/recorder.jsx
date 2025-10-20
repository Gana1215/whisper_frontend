import React, { useRef, useState } from "react";

export default function Recorder({ onStop }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [animationId, setAnimationId] = useState(null);

  // iOS-safe AudioContext (keeps alive across taps)
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx =
      audioCtxRef.current || new AudioCtx({ latencyHint: "interactive" });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    mediaRecorderRef.current = recorder;
    setRecording(true);
    setReady(false);

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setReady(true);
      if (onStop) onStop({ blob, url });
    };

    recorder.start();
    visualize();
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cancelAnimationFrame(animationId);
  };

  // 🔊 Dynamically scale waveform intensity
  const visualize = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    let gain = 1.0;

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      const avg =
        dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) /
        bufferLength;
      const target = Math.min(6 / (avg + 1), 6);
      gain += (target - gain) * 0.1;

      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0, "#4f46e5");
      grad.addColorStop(0.5, "#9333ea");
      grad.addColorStop(1, "#ec4899");

      ctx.lineWidth = 3;
      ctx.strokeStyle = grad;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        const y = canvas.height / 2 + v * canvas.height * 0.4 * gain;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      setAnimationId(requestAnimationFrame(draw));
    };
    draw();
  };

  // ✅ iPhone playback-safe handler
  const handlePlay = async () => {
    if (!audioUrl) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx =
      audioCtxRef.current ||
      new AudioCtx({ sampleRate: 44100, latencyHint: "interactive" });
    audioCtxRef.current = ctx;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Force gesture-based play with a new audio element
    const audio = new Audio(audioUrl);
    audio.playsInline = true;
    audio.autoplay = true;
    audio.preload = "auto";

    try {
      await audio.play();
    } catch (err) {
      console.warn("iPhone playback blocked, retrying...", err);
      document.body.addEventListener(
        "touchend",
        () => {
          audio.play().catch(() => {});
        },
        { once: true }
      );
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <canvas
        ref={canvasRef}
        width="500"
        height="120"
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

      {ready && (
        <div className="flex flex-col items-center mt-4 space-y-2">
          <button
            onClick={handlePlay}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
          >
            ▶️ Play Recording
          </button>
        </div>
      )}
    </div>
  );
}
