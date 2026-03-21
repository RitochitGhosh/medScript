import { eq } from "drizzle-orm";
import { db } from "./drizzle/client";
import { doctors, users } from "./drizzle/schema";
import { getUserByClerkId } from "./pg-users";
import type { DoctorProfile } from "@workspace/types";

function toDoctorProfile(
  doctor: typeof doctors.$inferSelect,
  user: typeof users.$inferSelect
): DoctorProfile {
  return {
    id: doctor.id,
    userId: doctor.userId,
    clerkUserId: user.clerkUserId,
    name: user.name,
    email: user.email,
    specialization: doctor.specialization,
    clinicName: doctor.clinicName,
    licenseNumber: doctor.licenseNumber,
  };
}

export async function createDoctorProfile(
  userId: string,
  data: { specialization?: string; clinicName?: string; licenseNumber?: string }
): Promise<DoctorProfile> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error(`User ${userId} not found`);

  const [doctor] = await db
    .insert(doctors)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: doctors.userId,
      set: { ...data },
    })
    .returning();

  return toDoctorProfile(doctor!, user);
}

export async function getDoctorByUserId(userId: string): Promise<DoctorProfile | null> {
  const doctor = await db.query.doctors.findFirst({
    where: eq(doctors.userId, userId),
  });
  if (!doctor) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;

  return toDoctorProfile(doctor, user);
}

export async function getDoctorById(doctorId: string): Promise<DoctorProfile | null> {
  const doctor = await db.query.doctors.findFirst({
    where: eq(doctors.id, doctorId),
  });
  if (!doctor) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, doctor.userId) });
  if (!user) return null;

  return toDoctorProfile(doctor, user);
}

export async function getDoctorByClerkId(clerkUserId: string): Promise<DoctorProfile | null> {
  const user = await getUserByClerkId(clerkUserId);
  if (!user) return null;
  return getDoctorByUserId(user.id);
}
