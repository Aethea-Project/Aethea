-- CreateEnum
CREATE TYPE "public"."LabTestStatus" AS ENUM ('normal', 'borderline', 'abnormal', 'critical');

-- CreateEnum
CREATE TYPE "public"."ScanPriority" AS ENUM ('routine', 'urgent', 'emergency');

-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('pending', 'in_progress', 'completed', 'reviewed');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" VARCHAR(50),
    "lastName" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lab_tests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "testName" VARCHAR(120) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "value" VARCHAR(120) NOT NULL,
    "unit" VARCHAR(40) NOT NULL,
    "refMin" DECIMAL(10,2),
    "refMax" DECIMAL(10,2),
    "refText" VARCHAR(120),
    "status" "public"."LabTestStatus" NOT NULL DEFAULT 'normal',
    "orderedBy" VARCHAR(120) NOT NULL,
    "notes" TEXT,
    "measuredAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "bodyPart" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "findings" TEXT,
    "radiologist" VARCHAR(120) NOT NULL,
    "priority" "public"."ScanPriority" NOT NULL DEFAULT 'routine',
    "status" "public"."ScanStatus" NOT NULL DEFAULT 'pending',
    "reportUrl" TEXT,
    "scanDate" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reservations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "doctorName" VARCHAR(120) NOT NULL,
    "specialty" VARCHAR(120) NOT NULL,
    "reason" TEXT NOT NULL,
    "location" VARCHAR(180) NOT NULL,
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6),
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "lab_tests_userId_measuredAt_idx" ON "public"."lab_tests"("userId", "measuredAt");

-- CreateIndex
CREATE INDEX "scans_userId_scanDate_idx" ON "public"."scans"("userId", "scanDate");

-- CreateIndex
CREATE INDEX "reservations_userId_startAt_idx" ON "public"."reservations"("userId", "startAt");

-- AddForeignKey
ALTER TABLE "public"."lab_tests" ADD CONSTRAINT "lab_tests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scans" ADD CONSTRAINT "scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
