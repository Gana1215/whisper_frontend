import React, { useRef, useState } from "react";

export default function Recorder({ onStop }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [animationId, setAnimationId] = useState(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    const gainNode = audioCtx.createGain();

    analyser.fftSize = 1024; // smoother lines
    source.connect(gainNode);
    gainNode.connect(analyser);

    gainNode.gain.value = 6.0; // 🔊 sensitivity boost
    mediaRecorderRef.current = recorder;
    setRecording(true);

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/wav" });
      chunksRef.current = [];
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      if (onStop) onStop({ blob, url });
    };

    recorder.start();
    visualize(analyser, audioCtx);
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cancelAnimationFrame(animationId);
  };

  // 🎨 Gradient + intensity-sensitive waveform
  const visualize = (analyser, audioCtx) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Compute current volume
      const avgAmplitude =
        dataArray.reduce((sum, val) => sum + Math.abs(val - 128), 0) /
        bufferLength;
      const intensity = Math.min(avgAmplitude / 64, 1); // normalize 0-1

      // Create gradient based on voice intensity
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, `hsl(${260 - 60 * intensity}, 80%, 65%)`);
      gradient.addColorStop(0.5, `hsl(${300 - 80 * intensity}, 80%, 70%)`);
      gradient.addColorStop(1, `hsl(${330 - 50 * intensity}, 90%, 75%)`);

      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128.0;
        const y = canvas.height / 2 + v * (canvas.height * 0.9);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      setAnimationId(requestAnimationFrame(draw));
    };
    draw();
  };

  const handlePlay = () => {
    const audio = document.querySelector("audio");
    if (audio) {
      audio.play().catch(() => {
        const fresh = audio.cloneNode(true);
        audio.replaceWith(fresh);
        fresh.play().catch(() => {});
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <canvas
        ref={canvasRef}
        width="500"
        height="120"
        className="rounded-lg shadow-lg bg-gray-50"
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
        <div className="flex flex-col items-center mt-4 space-y-2">
          <audio
            key={audioUrl}
            src={audioUrl}
            controls
            playsInline
            preload="none"
            className="w-full rounded-lg"
          />
          <button
            onClick={handlePlay}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            ▶️ Play Recording
          </button>
        </div>
      )}
    </div>
  );
}
