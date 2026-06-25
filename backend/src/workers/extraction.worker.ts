import { createWorker } from '../lib/bullmq.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import { parseDocumentWithLlama } from '../services/llamaParseService.js';
import { extractLabResultsWithGemini } from '../services/geminiService.js';
import { storeFeedback, storeLabTests } from '../services/labResultsService.js';
import logger from '../lib/logger.js';
import prisma from '../lib/prisma.js';
import { retry, circuitBreaker, handleAll, wrap, ConsecutiveBreaker, ExponentialBackoff } from 'cockatiel';

const retryPolicy = retry(handleAll, { maxAttempts: 3, backoff: new ExponentialBackoff() });
const cbPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 10 * 1000,
  breaker: new ConsecutiveBreaker(5),
});

const llamaCircuit = wrap(retryPolicy, cbPolicy);
const geminiCircuit = wrap(retryPolicy, cbPolicy);

// Safety bounds for common lab tests
// Keys are matched via test_name.includes(key), so be SPECIFIC to avoid
// false positives (e.g. "VLDL Cholesterol" must NOT match "Total Cholesterol").
// Order matters: longer/more-specific keys should come first.
const CLINICAL_RANGES: Record<string, { min: number; max: number }> = {
  'Vitamin D':         { min: 0,   max: 200  },
  'HbA1c':             { min: 2,   max: 20   },
  'eGFR':              { min: 0,   max: 200  },
  'Hemoglobin':        { min: 1,   max: 30   },
  'Creatinine':        { min: 0.1, max: 30   },
  'Total Cholesterol': { min: 50,  max: 600  },
  'VLDL':              { min: 1,   max: 100  },
  'LDL':               { min: 5,   max: 500  },
  'HDL':               { min: 3,   max: 150  },
  'Triglycerides':     { min: 10,  max: 2000 },
};

function validateExtraction(metrics: any[]): { valid: boolean; quarantinedReasons: string[] } {
  const quarantinedReasons: string[] = [];

  for (const metric of metrics) {
    if (metric.test_name && (metric.test_name.toLowerCase().includes('ratio') || metric.test_name.toLowerCase().includes('risk'))) {
      continue;
    }

    // Attempt to match by test_name or category
    const rangeKey = Object.keys(CLINICAL_RANGES).find(k => 
      (metric.test_name && metric.test_name.toLowerCase().includes(k.toLowerCase())) || 
      (metric.category && metric.category.toLowerCase().includes(k.toLowerCase()))
    );

    if (rangeKey && metric.value) {
      const range = CLINICAL_RANGES[rangeKey];
      const val = parseFloat(metric.value);
      if (!isNaN(val) && (val < range.min || val > range.max)) {
        quarantinedReasons.push(
          `${metric.test_name || 'Unknown'}: ${metric.value} is outside physiological range (${range.min}–${range.max})`
        );
      }
    }
  }

  return { valid: quarantinedReasons.length === 0, quarantinedReasons };
}

interface ExtractionJobData {
  userId: string;
  feedbackId: string;
  storagePath: string;
}

export const extractionWorker = createWorker<ExtractionJobData>(
  'clinical-extraction',
  async (job) => {
    const { userId, feedbackId, storagePath } = job.data;
    logger.info({ jobId: job.id, userId, pipeline: 'gemini' }, `Starting extraction job for ${storagePath}`);

    // Progress: starting
    await job.updateProgress({ status: 'starting' });

    try {
      // 1. Download file from Supabase Storage
      const supabase = getSupabaseAdminClient();
      const { data: fileData, error } = await supabase.storage
        .from('clinical-documents')
        .download(storagePath);

      if (error || !fileData) {
        throw new Error(`Failed to download file from storage: ${error?.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const originalName = storagePath.split('/').pop() || 'document';
      const extension = originalName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(extension);

      await job.updateProgress({ status: 'downloaded' });

      let aiResult: any;

      if (isImage) {
        await job.updateProgress({ status: 'analyzing' });
        const kaggleUrl = process.env.KAGGLE_OCR_URL;
        if (!kaggleUrl) {
          throw new Error('KAGGLE_OCR_URL environment variable is not set.');
        }

        logger.info({ jobId: job.id }, `Sending image to Kaggle API... (${kaggleUrl})`);
        
        const formData = new FormData();
        formData.append('file', fileData as Blob, originalName);

        const response = await fetch(kaggleUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`Kaggle API Error: ${response.status} - ${errText}`);
        }

        const kaggleData = await response.json();
        
        aiResult = {
          is_medical_report: kaggleData.is_medical_report,
          condition: kaggleData.condition || 'General Analysis',
          risk_level: kaggleData.risk_level || 'low',
          findings: kaggleData.findings || [],
          summary: kaggleData.summary || (Array.isArray(kaggleData.written_notes_and_comments) && kaggleData.written_notes_and_comments.length > 0 ? kaggleData.written_notes_and_comments.join(' ') : (typeof kaggleData.written_notes_and_comments === 'string' ? kaggleData.written_notes_and_comments : 'No summary provided.')),
          doctor_analysis: kaggleData.doctor_analysis || (Array.isArray(kaggleData.written_notes_and_comments) && kaggleData.written_notes_and_comments.length > 0 ? kaggleData.written_notes_and_comments.join(' ') : (typeof kaggleData.written_notes_and_comments === 'string' ? kaggleData.written_notes_and_comments : 'No detailed analysis provided.')),
          medications: kaggleData.medications || [],
          patient_info: kaggleData.patient_info,
          report_metadata: kaggleData.report_metadata,
          lab_results: (kaggleData.lab_results || []).map((lr: any) => {
            let refMin = null;
            let refMax = null;
            let refText = lr.ref_text || lr.reference_range || lr.refText || lr.referenceRange || null;
            
            if (refText && typeof refText === 'string') {
               const parts = refText.split('-').map((p: string) => parseFloat(p.trim()));
               if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                 refMin = parts[0];
                 refMax = parts[1];
               }
            }
            return {
              category: lr.category || lr.testCategory || 'General',
              test_name: lr.test_name || lr.testName || 'Unknown Parameter',
              value: lr.value !== undefined && lr.value !== null ? String(lr.value) : (lr.result_value !== undefined && lr.result_value !== null ? String(lr.result_value) : '-'),
              unit: lr.unit || '',
              ref_min: lr.ref_min != null ? lr.ref_min : (lr.refMin != null ? lr.refMin : refMin),
              ref_max: lr.ref_max != null ? lr.ref_max : (lr.refMax != null ? lr.refMax : refMax),
              ref_text: refText,
              status: lr.status ? lr.status.toLowerCase() : 'normal',
            };
          }),
          written_notes_and_comments: kaggleData.written_notes_and_comments,
          confidence_score: kaggleData.confidence_score
        };
      } else {
        // 2. LlamaParse: PDF → Markdown
        await job.updateProgress({ status: 'analyzing' });
        logger.info({ jobId: job.id }, 'Running LlamaParse OCR...');
        const markdown = await llamaCircuit.execute(() => parseDocumentWithLlama(buffer, originalName));
        logger.info({ jobId: job.id }, `LlamaParse produced ${markdown.length} chars of markdown`);

        // 3. Gemini: Markdown → Structured JSON
        await job.updateProgress({ status: 'extracting' });
        logger.info({ jobId: job.id }, 'Sending markdown to Gemini 2.5 Flash...');
        aiResult = await geminiCircuit.execute(() => extractLabResultsWithGemini(markdown));
      }

      // 4. Safety Validation Gate
      const { valid, quarantinedReasons } = validateExtraction(aiResult.lab_results || []);
      if (!valid) {
        logger.warn({ jobId: job.id, reasons: quarantinedReasons }, 'Extraction quarantined due to physiological bounds');
        await prisma.feedback.update({
          where: { id: feedbackId },
          data: {
            doctorAnalysis: 'QUARANTINED: The AI extracted values that are physiologically impossible. ' + quarantinedReasons.join(', '),
            riskLevel: 'QUARANTINED',
          }
        });
        return { status: 'quarantined', reasons: quarantinedReasons };
      }

      // 5. Save to Database
      await job.updateProgress({ status: 'saving' });

      const { extractedTests } = await storeFeedback(userId, aiResult as any, feedbackId);
      const testCount = await storeLabTests(userId, feedbackId, extractedTests);

      // 6. Clinical Feedback Loop
      await job.updateProgress({ status: 'clinical_feedback' });
      const newConditions: string[] = [];
      const extractedMetrics = aiResult.lab_results || [];

      for (const metric of extractedMetrics) {
        // Diabetes check: HbA1c, Fasting Glucose, or Random/2-Hour Glucose
        const testNameLower = metric.test_name ? metric.test_name.toLowerCase() : '';
        const isHbA1c = testNameLower.includes('hba1c') || testNameLower.includes('a1c') || testNameLower.includes('glycated');
        const isGlucose = testNameLower.includes('glucose');
        const metricVal = metric.value ? parseFloat(metric.value) : 0;
        
        if (isHbA1c) {
          if (metricVal > 6.4) {
            newConditions.push('diabetes');
          } else if (metricVal >= 5.7) {
            newConditions.push('prediabetes');
          }
        } else if (isGlucose) {
          const isMgDl = metric.unit && metric.unit.toLowerCase().includes('mg/dl');
          const isMmol = metric.unit && metric.unit.toLowerCase().includes('mmol/l');
          const isFasting = metric.test_name.toLowerCase().includes('fasting');
          
          if (isFasting) {
            if ((isMgDl && metricVal >= 126) || (isMmol && metricVal >= 7.0) || (!isMgDl && !isMmol && metricVal >= 126)) {
              newConditions.push('diabetes');
            } else if ((isMgDl && metricVal >= 100) || (isMmol && metricVal >= 5.6) || (!isMgDl && !isMmol && metricVal >= 100)) {
              newConditions.push('prediabetes');
            }
          } else {
            if ((isMgDl && metricVal >= 200) || (isMmol && metricVal >= 11.1) || (!isMgDl && !isMmol && metricVal >= 200)) {
              newConditions.push('diabetes');
            } else if ((isMgDl && metricVal >= 140) || (isMmol && metricVal >= 7.8) || (!isMgDl && !isMmol && metricVal >= 140)) {
              newConditions.push('prediabetes');
            }
          }
        }

        // Kidney dysfunction check
        if (metric.category && metric.category.toLowerCase().includes('kidney') && metric.status === 'high') {
          newConditions.push('kidney_dysfunction');
        }
        
        // Hyperlipidemia check
        if (metric.test_name && metric.test_name.toLowerCase().includes('cholesterol') && metric.status === 'high') {
          newConditions.push('hyperlipidemia');
        }
      }

      let alertsCount = 0;
      if (newConditions.length > 0) {
        const uniqueConditions = Array.from(new Set(newConditions));
        
        for (const cond of uniqueConditions) {
           await prisma.patientCondition.upsert({
             where: { patientId_condition: { patientId: userId, condition: cond } },
             update: {},
             create: { patientId: userId, condition: cond, source: 'ai_extraction' }
           });
        }

        const activePrescriptions = await prisma.patientPrescription.findMany({
          where: { patientId: userId, isActive: true },
          include: { medicine: true }
        });

        const { flagMedicine } = await import('../config/flaggingRules.js');
        const severeAlerts: string[] = [];
        
        for (const rx of activePrescriptions) {
           const flags = flagMedicine(rx.medicine.drugClasses, rx.medicine.activeIngredient, uniqueConditions);
           if (flags.length > 0) {
             const warningMsg = flags.map(f => f.reasonEn).join(', ');
             severeAlerts.push(`${rx.medicine.brandNameAr} (${warningMsg})`);
           }
        }

        const currentFeedback = await prisma.feedback.findUnique({ where: { id: feedbackId }});
        let existingAnalysis = currentFeedback?.doctorAnalysis || '';
        let needsUpdate = false;
        let newRiskLevel = currentFeedback?.riskLevel;

        const hasHighHbA1c = extractedMetrics.some((m: any) => {
          const mLower = m.test_name ? m.test_name.toLowerCase() : '';
          return (mLower.includes('hba1c') || mLower.includes('a1c') || mLower.includes('glycated')) && m.value && parseFloat(m.value) >= 5.7;
        });
        
        if (hasHighHbA1c && !existingAnalysis.includes('HbA1c is a 2-3 month average')) {
          existingAnalysis += '\n\n📝 Note on your HbA1c: Your HbA1c result indicates prediabetes or diabetes, but this is not permanent. HbA1c measures your average blood sugar over the past 2-3 months. With proper medication, diet, and exercise, this number can be significantly lowered.';
          needsUpdate = true;
        }

        if (severeAlerts.length > 0) {
          logger.warn({ jobId: job.id, alerts: severeAlerts }, 'Clinical Feedback Loop triggered alerts');
          existingAnalysis += '\n\n🚨 CLINICAL ALERT: Based on extracted labs, the patient is contraindicated for their active prescriptions: ' + severeAlerts.join(' | ');
          newRiskLevel = 'high';
          needsUpdate = true;
          alertsCount = severeAlerts.length;
        }

        if (needsUpdate) {
          await prisma.feedback.update({
            where: { id: feedbackId },
            data: {
              doctorAnalysis: existingAnalysis,
              riskLevel: newRiskLevel
            }
          });
        }
      }

      logger.info({ jobId: job.id }, `[Gemini] Successfully processed and saved ${testCount} lab tests.`);
      return { status: 'db_saved', count: testCount, result: aiResult, clinical_alerts: alertsCount };

    } catch (err: any) {
      if (err.message?.includes('circuit') || err.message?.includes('BrokenCircuitError')) {
         logger.error({ jobId: job.id }, 'External API circuit broken, failing gracefully.');
      } else {
         logger.error({ jobId: job.id, err }, 'Extraction job failed');
      }
      throw err;
    }
  },
  {
    concurrency: 2,
  }
);

