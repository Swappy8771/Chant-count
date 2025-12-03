"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [target, setTarget] = useState("om");
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [count, setCount] = useState(0);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<any | null>(null);
  const shouldRestartRef = useRef(false);

  const [supportsSpeechRecognition, setSupportsSpeechRecognition] =
    useState<boolean | null>(null);

  // Detect support only on the client to avoid SSR hydration mismatches
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setSupportsSpeechRecognition(!!SpeechRecognitionCtor);

    if (!SpeechRecognitionCtor) {
      setStatus("Your browser does not support speech recognition.");
    }
  }, []);
  useEffect(() => {
    if (!supportsSpeechRecognition) return;

    if (count >= 108) {
      setStatus("Completed 108 chants ✅");
    } else if (listening) {
      setStatus("Listening…");
    } else if (!listening && transcript) {
      setStatus("Stopped");
    } else {
      setStatus("");
    }
  }, [count, listening, transcript, supportsSpeechRecognition]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = () => {
    if (!supportsSpeechRecognition) return;
    if (listening) return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN"; // adjust language as needed
    recognition.continuous = true;
    recognition.interimResults = true;

    shouldRestartRef.current = true;
    setTranscript("");
    setCount(0);

    recognition.onstart = () => {
      console.log("[Speech] onstart");
      setListening(true);
    };

    recognition.onerror = (event: any) => {
      console.error("[Speech] error:", event);
      setStatus("Speech recognition error");
    };

    recognition.onend = () => {
      console.log("[Speech] onend");
      if (shouldRestartRef.current) {
        console.log("[Speech] restarting recognition");
        recognition.start();
      } else {
        setListening(false);
      }
    };

    recognition.onresult = (event: any) => {
      console.log("[Speech] raw event:", event);

      const result = event.results[event.resultIndex];
      if (!result) return;

      const segment = result[0]?.transcript ?? "";
      const cleanedSegment = segment.trim();
      const lowerSegment = cleanedSegment.toLowerCase();
      const targetWord = target.trim().toLowerCase();

      let segmentOccurrences = 0;
      let words: string[] = [];
      if (targetWord) {
        words = lowerSegment.split(/\W+/).filter(Boolean);
        segmentOccurrences = words.filter((w) => w === targetWord).length;
      }

      console.log("[Speech] segment transcript:", cleanedSegment);
      console.log("[Speech] segment words:", words);
      console.log(
        "[Speech] target:",
        targetWord,
        "segmentOccurrences:",
        segmentOccurrences,
      );

      setTranscript((prev) => `${prev} ${cleanedSegment}`.trim());
      if (segmentOccurrences > 0) {
        setCount((prev) => {
          const next = Math.min(108, prev + segmentOccurrences);
          console.log("[Speech] updated count:", next);
          return next;
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>108 Mantra Counter (Web Speech)</h1>

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
        onClick={startListening}
        disabled={listening || !supportsSpeechRecognition}
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
        onClick={stopListening}
        disabled={!listening}
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

      <p style={{ marginTop: 10, fontStyle: "italic" }}>
        Live transcript: {transcript || "(waiting for speech…)"}
      </p>
    </div>
  );
}
