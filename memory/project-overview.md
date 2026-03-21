---
name: MedScript AI Project Overview
description: Full-stack voice-first clinical documentation app for Indian doctors
type: project
---

MedScript AI is a production-ready voice-first clinical documentation assistant for Indian doctors. Built March 2026.

**Why:** Hackathon project for underserved Indian communities. Doctors record voice consultations, AI generates SOAP notes with HITL review before PDF generation.

**How to apply:** Always check this file for architecture context when working on this project.

## Tech Stack
- Monorepo: Turborepo + npm workspaces (NOTE: not pnpm, uses npm)
- Frontend: Next.js 16 (App Router), TypeScript, Tailwind CSS, @base-ui shadcn components
- Backend: Next.js API routes (not separate Express)
- Database: MongoDB Atlas (native driver, no Mongoose) + Vector Search for RAG
- STT/TTS: ElevenLabs Scribe (primary), OpenAI Whisper (fallback)
- LLM: LangChain.js + gpt-4o-mini (structured output)
- Web Search: Tavily API (drug prices, hospital search, treatment guidelines)
- PDF: @react-pdf/renderer
- Auth: NextAuth.js credentials provider

## Key Architectural Decisions
- Workspace packages: @workspace/db, @workspace/langchain, @workspace/elevenlabs, @workspace/types
- All packages use `moduleResolution: bundler` (NOT NodeNext) so Next.js transpilePackages works
- No .js extensions needed in imports due to bundler mode
- MongoDB client defers connection error to runtime (not module load time) for build compatibility
- Next.js 16 dynamic route params are Promises: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`
- SheetTrigger from @base-ui doesn't support `asChild` prop - use native child elements

## Build Status (2026-03-21)
✓ `npm run build` passes with 15 routes
✓ All API routes created
✓ All pages created
✓ PDF template working
✓ TypeScript strict mode passes

## Environment Variables (apps/web/.env.local)
- OPENAI_API_KEY
- ELEVENLABS_API_KEY
- TAVILY_API_KEY (tvly-dev key in .env.local)
- MONGODB_URI (not yet set - needs Atlas cluster)
- MONGODB_DB_NAME=medscript
- NEXTAUTH_SECRET
- NEXTAUTH_URL=http://localhost:3000

## Mock Doctor Login
- Email: doctor@medscript.ai
- Password: password123
