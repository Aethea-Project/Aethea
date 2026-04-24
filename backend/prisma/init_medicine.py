import psycopg2
url = 'postgresql://postgres.smxwhvdmucvctxzudtxg:OV5Tww59tXFsGywe@aws-1-eu-west-3.pooler.supabase.com:5432/postgres'

print('Connecting...')
conn = psycopg2.connect(url)
cur = conn.cursor()

sql = """
CREATE TABLE IF NOT EXISTS public.medicines (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "brandNameAr" text NOT NULL,
    "brandNameEn" text,
    "activeIngredient" text NOT NULL,
    "rxcui" text,
    "drugbankId" text,
    "drugClasses" text[],
    "category" text NOT NULL,
    "form" text NOT NULL,
    "manufacturer" text,
    "photoUrl" text,
    "isOtc" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT medicines_pkey PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public.drugbank_drugs (
    "drugbankId" text NOT NULL,
    "name" text NOT NULL,
    "synonyms" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "contraindications" text,
    "interactions" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT drugbank_drugs_pkey PRIMARY KEY ("drugbankId")
);

CREATE INDEX IF NOT EXISTS drugbank_drugs_name_idx ON public.drugbank_drugs ("name");

CREATE TABLE IF NOT EXISTS public.patient_conditions (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "patientId" uuid NOT NULL,
    "condition" text NOT NULL,
    "source" text NOT NULL DEFAULT 'manual',
    "detectedAt" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_conditions_pkey PRIMARY KEY ("id"),
    CONSTRAINT patient_conditions_patientId_fkey FOREIGN KEY ("patientId") REFERENCES public.users("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS patient_conditions_patientId_condition_key ON public.patient_conditions ("patientId", "condition");
"""

print('Executing SQL...')
cur.execute(sql)
conn.commit()

cur.close()
conn.close()
print('Success!')
