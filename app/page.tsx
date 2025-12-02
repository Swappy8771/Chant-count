"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState("om");
  const [status, setStatus] = useState("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    setCount(0);
    setRecording(true);
    setStatus("Listening…");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // 🔥 IMPORTANT — Whisper REQUIRES OPUS codec
    const mime = "audio/webm; codecs=opus";

    if (!MediaRecorder.isTypeSupported(mime)) {
      alert("Your browser does NOT support OPUS audio. Try Chrome.");
      return;
    }

    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: mime,
    });

    mediaRecorder.current.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        console.log("Blob type:", event.data.type); // DEBUG
        await sendChunk(event.data);
      }
    };

    mediaRecorder.current.start(2000); // send every 1 second
  };

  const stopRecording = () => {
    setRecording(false);
    setStatus("Stopped");

    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const sendChunk = async (blob: Blob) => {
    const form = new FormData();
    form.append("audio", blob, "chunk.webm");
    form.append("target", target);

    const res = await fetch("/api/whisper", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    console.log("Transcript:", data.transcript);

    if (data.match) {
      setCount((prev) => prev + 1);
    }
  };

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>108 Mantra Counter (Next.js + Whisper)</h1>

      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Target word: om"
        style={{ padding: 10, fontSize: 18 }}
      />

      <h2 style={{ fontSize: 40, marginTop: 20 }}>
        {count} / 108
      </h2>

      <button
        onClick={startRecording}
        disabled={recording}
        style={{
          padding: "12px 25px",
          background: "green",
          color: "white",
          borderRadius: 8,
          marginRight: 10,
          fontSize: 20,
        }}
      >
        🎤 Start
      </button>

      <button
        onClick={stopRecording}
        style={{
          padding: "12px 25px",
          background: "red",
          color: "white",
          borderRadius: 8,
          fontSize: 20,
        }}
      >
        ⛔ Stop
      </button>

      <p style={{ marginTop: 20 }}>{status}</p>
    </div>
  );
}
