/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/transcribe
 * Test in Requestly API Client before integration
 */

import { NextRequest, NextResponse } from "next/server";
import { speechToText } from "@workspace/elevenlabs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required", code: "MISSING_AUDIO" },
        { status: 400 }
      );
    }

    const transcript = await speechToText(audioFile);

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
        code: "TRANSCRIPTION_FAILED",
      },
      { status: 500 }
    );
  }
}
