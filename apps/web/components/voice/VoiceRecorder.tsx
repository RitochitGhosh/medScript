"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";

interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VoiceRecorder({
  onTranscriptReady,
  onRecordingStart,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [fileSize, setFileSize] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] ?? 128) / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setFileSize(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setFileSize((prev) => prev + e.data.size);
        }
      };

      recorder.start(100); // collect data every 100ms
      setIsRecording(true);
      setDuration(0);
      onRecordingStart?.();

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      drawWaveform();
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone permissions and try again."
          : "Could not access microphone. Ensure a microphone is connected."
      );
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    setIsRecording(false);
    setIsTranscribing(true);

    // Wait for final data
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => resolve();
      } else resolve();
    });

    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Transcription failed");
      }

      const data = (await response.json()) as { transcript: string };
      onTranscriptReady(data.transcript);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Transcription failed. Please try again."
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Waveform Canvas */}
      <div className="rounded-lg overflow-hidden border bg-muted h-24">
        <canvas
          ref={canvasRef}
          width={800}
          height={96}
          className="w-full h-full"
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 font-medium">Recording</span>
            </span>
          )}
          {isTranscribing && (
            <span className="text-muted-foreground">Transcribing...</span>
          )}
          {!isRecording && !isTranscribing && (
            <span className="text-muted-foreground">Ready to record</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isRecording && (
            <>
              <Badge variant="outline">{formatDuration(duration)}</Badge>
              <span className="text-muted-foreground text-xs">
                {(fileSize / 1024).toFixed(1)} KB
              </span>
            </>
          )}
        </div>
      </div>

      {/* Record Button */}
      <div className="flex justify-center">
        {!isRecording ? (
          <Button
            size="lg"
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
            onClick={startRecording}
            disabled={disabled || isTranscribing}
            title="Start Recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.041h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.041a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
            </svg>
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
            onClick={stopRecording}
            title="Stop Recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isRecording
          ? "Click to stop and transcribe"
          : "Click the button to start recording the consultation"}
      </p>
    </div>
  );
}
