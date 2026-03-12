-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('patient', 'doctor', 'pharmacist', 'admin');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('slot_available', 'reservation_confirmed', 'reservation_cancelled');

-- AlterTable: Add accountType to users
ALTER TABLE "public"."users" ADD COLUMN "accountType" "public"."AccountType" NOT NULL DEFAULT 'patient';

-- AlterTable: Drop old reservation columns, add new ones
ALTER TABLE "public"."reservations"
  DROP COLUMN "doctorName",
  DROP COLUMN "specialty",
  DROP COLUMN "location",
  DROP COLUMN IF EXISTS "endAt",
  ADD COLUMN "doctorScheduleId" UUID NOT NULL,
  ADD COLUMN "slotIndex" INTEGER NOT NULL,
  ADD COLUMN "endAt" TIMESTAMPTZ(6) NOT NULL,
  ADD COLUMN "shareHealthData" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notifyOnCancel" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cancelDeadlineAt" TIMESTAMPTZ(6) NOT NULL;

-- CreateTable: doctor_profiles
CREATE TABLE "public"."doctor_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "specialty" VARCHAR(120) NOT NULL,
    "bio" TEXT,
    "clinicName" VARCHAR(200),
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "photoUrl" TEXT,
    "consultFee" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: doctor_schedules
CREATE TABLE "public"."doctor_schedules" (
    "id" UUID NOT NULL,
    "doctorProfileId" UUID NOT NULL,
    "scheduleDate" DATE NOT NULL,
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "slotDurationMins" INTEGER NOT NULL,
    "maxPatients" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_userId_key" ON "public"."doctor_profiles"("userId");

-- CreateIndex
CREATE INDEX "doctor_schedules_scheduleDate_idx" ON "public"."doctor_schedules"("scheduleDate");

-- CreateIndex
CREATE INDEX "doctor_schedules_doctorProfileId_scheduleDate_idx" ON "public"."doctor_schedules"("doctorProfileId", "scheduleDate");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_doctorScheduleId_slotIndex_key" ON "public"."reservations"("doctorScheduleId", "slotIndex");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "public"."notifications"("userId", "isRead", "createdAt");

-- AddForeignKey: doctor_profiles -> users
ALTER TABLE "public"."doctor_profiles" ADD CONSTRAINT "doctor_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: doctor_schedules -> doctor_profiles
ALTER TABLE "public"."doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctorProfileId_fkey"
  FOREIGN KEY ("doctorProfileId") REFERENCES "public"."doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reservations -> doctor_schedules
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_doctorScheduleId_fkey"
  FOREIGN KEY ("doctorScheduleId") REFERENCES "public"."doctor_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notifications -> users
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
