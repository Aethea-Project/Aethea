-- Create medicines table if not exists
CREATE TABLE IF NOT EXISTS "public"."medicines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandNameAr" TEXT NOT NULL,
    "brandNameEn" TEXT,
    "activeIngredient" TEXT NOT NULL,
    "rxcui" TEXT,
    "drugbankId" TEXT,
    "drugClasses" TEXT[],
    "category" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "manufacturer" TEXT,
    "photoUrl" TEXT,
    "isOtc" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- Create drugbank_drugs table if not exists
CREATE TABLE IF NOT EXISTS "public"."drugbank_drugs" (
    "drugbankId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "synonyms" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "categories" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "contraindications" TEXT,
    "interactions" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drugbank_drugs_pkey" PRIMARY KEY ("drugbankId")
);

CREATE INDEX IF NOT EXISTS "drugbank_drugs_name_idx" ON "public"."drugbank_drugs" ("name");

-- Create patient_conditions table if not exists
CREATE TABLE IF NOT EXISTS "public"."patient_conditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "condition" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "detectedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_conditions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patient_conditions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "patient_conditions_patientId_condition_key" ON "public"."patient_conditions" ("patientId", "condition");

-- AlterTable
ALTER TABLE "public"."medicines" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "origin" TEXT DEFAULT 'local',
ADD COLUMN     "packSize" INTEGER,
ADD COLUMN     "packUnit" TEXT,
ADD COLUMN     "priceNew" DECIMAL(10,2),
ADD COLUMN     "priceOld" DECIMAL(10,2),
ADD COLUMN     "strength" TEXT;

-- CreateIndex
CREATE INDEX "medicines_activeIngredient_idx" ON "public"."medicines"("activeIngredient");

-- CreateIndex
CREATE INDEX "medicines_barcode_idx" ON "public"."medicines"("barcode");

