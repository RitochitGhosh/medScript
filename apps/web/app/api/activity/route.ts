import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDoctorByClerkId } from "@workspace/db";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctor = await getDoctorByClerkId(userId);
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Last 7 days of daily consultation counts
    const result = await db.execute(sql`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC')::text AS date,
        COUNT(*)::int AS count
      FROM consultations
      WHERE doctor_id = ${doctor.id}
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at AT TIME ZONE 'UTC')
      ORDER BY date ASC
    `);

    return NextResponse.json(result.rows as { date: string; count: number }[]);
  } catch (error) {
    console.error("[activity] error:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
