/**
 * REQUESTLY ENDPOINT
 * Method: POST
 * Path: /api/audit-log
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { appendAuditLog } from "@workspace/db";
import { z } from "zod";

const RequestSchema = z.object({
  consultationId: z.string().uuid(),
  action: z.string().min(1),
  aiSuggested: z.string(),
  doctorApproved: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { consultationId, action, aiSuggested, doctorApproved } = parsed.data;

    await appendAuditLog(consultationId, {
      action,
      timestamp: new Date(),
      aiSuggested,
      doctorApproved,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log audit entry", code: "AUDIT_LOG_FAILED" },
      { status: 500 }
    );
  }
}
