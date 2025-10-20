import React, { useRef, useState } from "react";

export default function Recorder({ onStop }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [animationId, setAnimationId] = useState(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ---- Start Recording ----
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 2.5; // 🔊 Boost amplitude for iPhone Chrome/Safari
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;

    source.connect(gainNode);
    gainNode.connect(analyserNode);

    mediaRecorderRef.current = recorder;
    setAudioContext(audioCtx);
    setAnalyser(analyserNode);
    setRecording(true);

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/wav" });
      chunksRef.current = [];
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      onStop({ blob, url });
    };

    recorder.start();
    visualize(analyserNode);
  };

  // ---- Stop Recording ----
  const stopRecording = () => {
    setRecording(false);
    mediaRecorderRef.current?.stop();
    audioContext?.close();
    cancelAnimationFrame(animationId);
  };

  // ---- Waveform Visualizer ----
  const visualize = (analyserNode) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyserNode.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#4f46e5";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        // 🔎 Boost visual sensitivity
        const v = dataArray[i] / 128.0 - 1;
        const y = (canvas.height / 2) + v * (canvas.height / 3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      setAnimationId(requestAnimationFrame(draw));
    };
    draw();
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

      {/* ✅ iPhone Chrome/Safari compatible audio player */}
      {audioUrl && (
        <div className="flex flex-col items-center mt-4 space-y-2">
          <audio
            key={audioUrl}
            src={audioUrl}
            controls
            playsInline  // ✅ required for iOS browsers
            preload="none"
            className="w-full rounded-lg"
          />
          <button
            onClick={() => {
              const audio = document.querySelector("audio");
              if (audio) audio.play().catch(() => {});
            }}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            ▶️ Play Recording
          </button>
        </div>
      )}
    </div>
  );
}
