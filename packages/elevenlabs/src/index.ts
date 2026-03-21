/**
 * ElevenLabs client wrapper for MedScript AI
 * Primary: ElevenLabs Scribe STT + TTS
 * Fallback: OpenAI Whisper for STT
 */

const ELEVENLABS_API_KEY = process.env["ELEVENLABS_API_KEY"];
const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];

// Default voice: Indian English - Priya (neutral, professional)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Fallback to Sarah (calm, professional)
const INDIAN_ENGLISH_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - clear, neutral

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

/**
 * Convert speech to text using ElevenLabs Scribe STT
 * Falls back to OpenAI Whisper on failure
 */
export async function speechToText(audioBlob: Blob): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("ElevenLabs API key not configured, using OpenAI Whisper fallback");
    return speechToTextWhisperFallback(audioBlob);
  }

  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model_id", "scribe_v1");
    formData.append("language_code", "en"); // English, supports Indian accent

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ElevenLabsError(
        `ElevenLabs STT failed: ${errorText}`,
        "STT_FAILED",
        response.status
      );
    }

    const data = (await response.json()) as { text?: string; transcript?: string };
    const transcript = data.text ?? data.transcript ?? "";

    if (!transcript) {
      throw new ElevenLabsError(
        "ElevenLabs returned empty transcript",
        "EMPTY_TRANSCRIPT"
      );
    }

    return transcript;
  } catch (error) {
    if (error instanceof ElevenLabsError) {
      console.error("ElevenLabs STT error:", error.message, "- Falling back to Whisper");
    } else {
      console.error("Unexpected error in ElevenLabs STT:", error, "- Falling back to Whisper");
    }
    return speechToTextWhisperFallback(audioBlob);
  }
}

/**
 * Fallback STT using OpenAI Whisper
 */
async function speechToTextWhisperFallback(audioBlob: Blob): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new ElevenLabsError(
      "Neither ElevenLabs nor OpenAI API keys are configured",
      "NO_API_KEY"
    );
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ElevenLabsError(
      `OpenAI Whisper fallback also failed: ${errorText}`,
      "WHISPER_FALLBACK_FAILED",
      response.status
    );
  }

  const data = (await response.json()) as { text?: string };
  return data.text ?? "";
}

/**
 * Convert text to speech using ElevenLabs TTS
 * Returns audio as ArrayBuffer
 */
export async function textToSpeech(
  text: string,
  voiceId: string = INDIAN_ENGLISH_VOICE_ID
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new ElevenLabsError(
      "ElevenLabs API key not configured",
      "NO_API_KEY"
    );
  }

  if (text.length > 5000) {
    throw new ElevenLabsError(
      "Text too long for TTS (max 5000 characters)",
      "TEXT_TOO_LONG"
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5", // Fast, supports Indian English
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ElevenLabsError(
      `ElevenLabs TTS failed: ${errorText}`,
      "TTS_FAILED",
      response.status
    );
  }

  return response.arrayBuffer();
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<
  Array<{ voice_id: string; name: string; labels: Record<string, string> }>
> {
  if (!ELEVENLABS_API_KEY) {
    throw new ElevenLabsError("ElevenLabs API key not configured", "NO_API_KEY");
  }

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new ElevenLabsError("Failed to fetch voices", "FETCH_VOICES_FAILED");
  }

  const data = (await response.json()) as {
    voices: Array<{ voice_id: string; name: string; labels: Record<string, string> }>;
  };
  return data.voices;
}

export { DEFAULT_VOICE_ID, INDIAN_ENGLISH_VOICE_ID };
