-- Rename LabTestStatus enum values from abnormal/critical to high/low
-- Run this on your PostgreSQL database BEFORE deploying the new code
ALTER TYPE public."LabTestStatus" RENAME VALUE 'abnormal' TO 'high';
ALTER TYPE public."LabTestStatus" RENAME VALUE 'critical' TO 'low';
