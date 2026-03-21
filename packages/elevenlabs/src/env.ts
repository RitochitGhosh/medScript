import { z } from "zod";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  // Optional — falls back to OpenAI Whisper when not set
  ELEVENLABS_API_KEY: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`[@workspace/elevenlabs] Invalid environment variables:\n${missing}`);
}

export const env = parsed.data;
