import { GoogleGenAI, Type } from '@google/genai';
import logger from '../lib/logger.js';

/* ─── Types ─── */

export interface GeminiLabTest {
  test_name: string;
  category: string;
  value: string;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_text: string | null;
  status: 'normal' | 'borderline' | 'high' | 'low';
}

export interface GeminiLabResult {
  condition: string;
  risk_level: string;
  findings: string[];
  summary: string;
  doctor_analysis: string;
  medications: string[];
  lab_results: GeminiLabTest[];
}

/* ─── Gemini Client ─── */

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_RESEARCH,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
].filter(Boolean) as string[];

async function runWithGeminiKeyRotation(apiCall: (key: string) => Promise<any>): Promise<any> {
  let lastError = null;
  for (const key of GEMINI_KEYS) {
    try {
      return await apiCall(key);
    } catch (e: any) {
      if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota')) {
         logger.warn('Gemini key hit quota (429) during Lab Extraction. Rotating to next key...');
         lastError = e;
         continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('All Gemini keys failed');
}

/* ─── JSON Schema for Structured Output ─── */

const labResultSchema = {
  type: Type.OBJECT,
  properties: {
    condition: {
      type: Type.STRING,
      description: 'A short medical condition summary, e.g. "Lab Results Analysis"',
    },
    risk_level: {
      type: Type.STRING,
      description: 'Overall risk level based on the results',
      enum: ['low', 'medium', 'high'],
    },
    findings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of notable clinical findings, e.g. ["Elevated LDL Cholesterol", "Low Ferritin"]',
    },
    summary: {
      type: Type.STRING,
      description: 'A patient-friendly summary of the lab results in plain language',
    },
    doctor_analysis: {
      type: Type.STRING,
      description: 'A professional medical analysis of the results for a doctor to review',
    },
    medications: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Any medication warnings or recommendations. Empty array if none.',
    },
    lab_results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          test_name: {
            type: Type.STRING,
            description: 'The individual test/parameter name as printed on the lab report, e.g. "Haemoglobin (EDTA Blood)", "Serum Creatinine", "HDL Cholesterol"',
          },
          category: {
            type: Type.STRING,
            description: 'The profile/section header this test belongs to, e.g. "Complete Blood Picture", "Kidney Function Tests", "Lipid Profile"',
          },
          value: {
            type: Type.STRING,
            description: 'The measured result value as a string, e.g. "12.5", "4.6"',
          },
          unit: {
            type: Type.STRING,
            description: 'The unit of measurement, e.g. "g/dL", "mg/dL", "%"',
          },
          ref_min: {
            type: Type.NUMBER,
            description: 'The minimum of the normal reference range, or null if not available',
            nullable: true,
          },
          ref_max: {
            type: Type.NUMBER,
            description: 'The maximum of the normal reference range, or null if not available',
            nullable: true,
          },
          ref_text: {
            type: Type.STRING,
            description: 'The full reference range text as printed, e.g. "4.0 - 11.0", "Up to 40", "< 200"',
            nullable: true,
          },
          status: {
            type: Type.STRING,
            description: 'Whether this result is within normal range',
            enum: ['normal', 'borderline', 'high', 'low'],
          },
        },
        required: ['test_name', 'category', 'value', 'unit', 'status'],
      },
      description: 'Array of every individual test parameter extracted from the lab report',
    },
  },
  required: ['condition', 'risk_level', 'findings', 'summary', 'doctor_analysis', 'medications', 'lab_results'],
};

/* ─── System Prompt ─── */

const SYSTEM_PROMPT = `You are an expert medical lab report parser. You will receive Markdown text extracted from a medical lab PDF report (typically from Egyptian labs like Al Mokhtabar, Alfa Lab, etc.).

Your job is to extract EVERY individual test parameter from the report into structured JSON.

## Critical Rules for Extraction:

1. **Profile Headers vs Test Parameters**: The report contains section headers (profiles) like "Liver Function Tests", "Kidney Function Tests", "Iron Profile", "Diabetic Profile", "Vitamins Assessment", "Thyroid Function Tests". These are CATEGORY names, NOT test names. The actual test names are the individual parameters listed UNDER these headers (e.g., "SGPT (ALT)", "Serum Creatinine", "Ferritin", "TSH").

2. **Use the category field**: Put the profile/section header name in the "category" field. Put the individual parameter name in the "test_name" field.

3. **Complete Blood Picture (CBC)**: This is a special bundled test. Use "Complete Blood Picture" as the category. Extract EVERY individual parameter under it (Haemoglobin, RBCs, WBCs, Platelets, Neutrophils, Lymphocytes, etc.) as separate test entries.

4. **Lipid Profile**: This is also a bundled test. Use "Lipid Profile" as the category. Extract every parameter (Total Cholesterol, Triglycerides, HDL, LDL, VLDL, etc.) as separate entries.

5. **Status determination**: Compare each value against the reference range provided in the report:
   - "normal" = within the reference range
   - "high" = above the upper limit
   - "low" = below the lower limit  
   - "borderline" = very close to the edge of the reference range (within ~5%)

6. **Reference ranges**: Extract ref_min, ref_max, and ref_text exactly as printed. If the range says "Up to 40", set ref_min to null, ref_max to 40. If it says "< 200", set ref_min to null, ref_max to 200.

7. **Extract ALL parameters**: Do not skip any test parameter. If it has a numeric value and a unit, extract it.

8. **Values with percentages and absolutes**: For tests like WBC differential (Neutrophils, Lymphocytes, etc.) that may have both percentage and absolute values, extract BOTH as separate entries if both are present (e.g., "Neutrophils %" and "Neutrophils Absolute").

9. **Patient info**: Include any patient age, gender, or relevant context in your summary and analysis.

10. **Custom Diabetes/Prediabetes Ranges & Condition Assignment**: YOU MUST STRICTLY ENFORCE THESE RANGES regardless of the PDF:
    - **Random Blood Glucose**: Normal (< 140), Prediabetes (140-199), Diabetes (>= 200).
    - **Haemoglobin A1C**: Normal (< 5.7), Prediabetes (5.7-6.4), Diabetes (> 6.4).
    If a patient falls in the Prediabetes range for any of these, set the overall \`condition\` field strictly to "prediabetes".
    If a patient falls in the Diabetes range for any of these, set the overall \`condition\` field strictly to "diabetes".
    If the patient is in the "prediabetes" range, you MUST add a friendly "Danger Zone" note to the \`summary\` field explaining what Random Blood Glucose or A1C is in simple terms, and mentioning that they are in the danger zone so the system is restricting certain medicines to keep them safe.`;


/* ─── Main Function ─── */

export async function extractLabResultsWithGemini(markdown: string): Promise<GeminiLabResult> {
  if (GEMINI_KEYS.length === 0) throw new Error('GEMINI_API_KEY is missing');

  logger.info(`Sending ${markdown.length} chars of markdown to Gemini 2.5 Flash for extraction`);

  const response = await runWithGeminiKeyRotation(async (key) => {
    const client = new GoogleGenAI({ apiKey: key });
    return client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract all lab test results from the following medical lab report:\n\n${markdown}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: labResultSchema,
        systemInstruction: SYSTEM_PROMPT,
      },
    });
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  logger.info('Gemini extraction complete, parsing JSON response');
  const result: GeminiLabResult = JSON.parse(text);

  logger.info(`Gemini extracted ${result.lab_results?.length ?? 0} test parameters`);
  return result;
}
