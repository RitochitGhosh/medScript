"use client";

import { useRef, useState } from "react";
import { Textarea } from "@workspace/ui/components/textarea";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { SoapNote, HitlFlag, HitlSection } from "@workspace/types";

interface SoapEditorProps {
  soapNote: SoapNote;
  hitlFlags: HitlFlag[];
  onChange: (updated: SoapNote) => void;
  onFlagResolved: (index: number, doctorEdit: string) => void;
}

const SECTIONS: Array<{ key: keyof SoapNote; label: string; section: HitlSection }> = [
  { key: "subjective",  label: "Subjective",  section: "subjective" },
  { key: "objective",   label: "Objective",   section: "objective" },
  { key: "assessment",  label: "Assessment",  section: "assessment" },
  { key: "plan",        label: "Plan",        section: "plan" },
];

export function SoapEditor({
  soapNote,
  hitlFlags,
  onChange,
  onFlagResolved,
}: SoapEditorProps) {
  const [values, setValues] = useState<SoapNote>(soapNote);

  // Voice recording state
  const [recordingSection, setRecordingSection] = useState<keyof SoapNote | null>(null);
  const [transcribingSection, setTranscribingSection] = useState<keyof SoapNote | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  function handleChange(key: keyof SoapNote, value: string) {
    const updated = { ...values, [key]: value };
    setValues(updated);
    onChange(updated);
  }

  function getFlagsForSection(section: HitlSection): Array<{ flag: HitlFlag; index: number }> {
    return hitlFlags
      .map((flag, index) => ({ flag, index }))
      .filter(({ flag }) => flag.section === section);
  }

  async function startVoice(section: keyof SoapNote) {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(100);
      setRecordingSection(section);
    } catch {
      setVoiceError("Microphone access denied or unavailable.");
    }
  }

  async function stopVoice(section: keyof SoapNote) {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecordingSection(null);
    setTranscribingSection(section);

    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      const data = (await res.json()) as { transcript: string };

      // Append transcript to the section (with a space separator)
      const current = values[section];
      const appended = current ? `${current} ${data.transcript}` : data.transcript;
      handleChange(section, appended);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Transcription failed. Please try again.");
    } finally {
      setTranscribingSection(null);
    }
  }

  return (
    <div className="space-y-6">
      {voiceError && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{voiceError}</AlertDescription>
        </Alert>
      )}

      {SECTIONS.map(({ key, label, section }) => {
        const sectionFlags = getFlagsForSection(section);
        const unresolvedFlags = sectionFlags.filter(({ flag }) => !flag.resolved);
        const hasUnresolved = unresolvedFlags.length > 0;
        const isRecording = recordingSection === key;
        const isTranscribing = transcribingSection === key;

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{values[key].length} chars</span>
                {hasUnresolved && (
                  <Badge variant="secondary" className="text-amber-600 bg-amber-50">
                    {unresolvedFlags.length} flag{unresolvedFlags.length > 1 ? "s" : ""}
                  </Badge>
                )}
                {/* Voice dictation button */}
                <Button
                  type="button"
                  size="sm"
                  variant={isRecording ? "destructive" : "ghost"}
                  className="h-6 w-6 p-0"
                  disabled={isTranscribing || (recordingSection !== null && !isRecording)}
                  title={isRecording ? "Stop dictation" : "Dictate to this section"}
                  onClick={() => (isRecording ? stopVoice(key) : startVoice(key))}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-red-50 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-xs text-red-600 font-medium">Recording — click mic to stop & transcribe</span>
              </div>
            )}

            {/* Flag alerts */}
            {unresolvedFlags.map(({ flag, index }) => (
              <Alert key={index} className="border-amber-200 bg-amber-50">
                <AlertDescription className="flex items-start justify-between gap-4">
                  <span className="text-amber-800 text-sm">{flag.reason}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
                    onClick={() => onFlagResolved(index, values[key])}
                  >
                    Resolve Flag
                  </Button>
                </AlertDescription>
              </Alert>
            ))}

            {/* Resolved flags */}
            {sectionFlags
              .filter(({ flag }) => flag.resolved)
              .map(({ index }) => (
                <Alert key={index} className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700 text-sm flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Flag resolved
                  </AlertDescription>
                </Alert>
              ))}

            <Textarea
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              rows={4}
              className={hasUnresolved ? "border-amber-300 focus-visible:ring-amber-400" : ""}
              placeholder={`Enter ${label.toLowerCase()} section...`}
            />
          </div>
        );
      })}
    </div>
  );
}
