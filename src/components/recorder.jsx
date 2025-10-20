import React, { useRef, useState } from "react";

export default function Recorder({ onStop }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [animationId, setAnimationId] = useState(null);
  const audioCtxRef = useRef(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

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
    visualize(analyser);
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cancelAnimationFrame(animationId);
  };

  const visualize = (analyser) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    let dynamicGain = 1.0;

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      const avgAmp =
        dataArray.reduce((sum, v) => sum + Math.abs(v - 128), 0) /
        bufferLength;
      const targetGain = Math.min(8.0 / (avgAmp + 1), 8.0);
      dynamicGain += (targetGain - dynamicGain) * 0.05;

      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0, "#4f46e5");
      grad.addColorStop(0.5, "#7e22ce");
      grad.addColorStop(1, "#db2777");

      ctx.lineWidth = 3;
      ctx.strokeStyle = grad;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128.0;
        const y = canvas.height / 2 + v * (canvas.height / 2.0) * dynamicGain;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      setAnimationId(requestAnimationFrame(draw));
    };
    draw();
  };

  // ✅ Full iPhone playback fix
  const handlePlay = async () => {
    try {
      // Resume AudioContext if suspended (iPhone Chrome/Safari quirk)
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      const audio = document.querySelector("audio");
      if (!audio) return;

      // Ensure play happens only from user gesture
      await audio.play().catch(() => {
        // fallback: recreate and trigger in a gesture
        const newAudio = audio.cloneNode(true);
        audio.replaceWith(newAudio);
        newAudio.play().catch(() => {});
      });
    } catch (e) {
      console.warn("Playback issue:", e);
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

      {audioUrl && (
        <div className="flex flex-col items-center mt-4 space-y-2">
          <audio
            key={audioUrl}
            src={audioUrl}
            controls
            playsInline
            preload="auto"
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

// FIXED 