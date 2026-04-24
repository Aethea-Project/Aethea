import { Request, Response } from 'express';
import { AiLabService } from '../services/aiLabService.js';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import { sendErrorAlert } from '../services/emailService.js';

export const uploadLabResult = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const userId = req.localUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. User ID missing.' });
    }

    // 1. Send to Kaggle/Ngrok AI Service (Returns a raw Response with a stream)
    logger.info(`Processing file ${file.originalname} for user ${userId}`);
    
    // Set request timeout to 0 (infinite) for this long-running streaming operation
    req.setTimeout(0);

    const aiResponse = await AiLabService.analyzeLabResult(file.path, file.originalname, file.mimetype);

    if (!aiResponse.body) {
      throw new Error('No response body received from AI service.');
    }

    // 2. Stream the response to the client while accumulating the result
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const reader = (aiResponse.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalAiResult: any = null;

    // Heartbeat interval to keep Cloudflare/Proxy connections alive (524 prevention)
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(JSON.stringify({ status: 'heartbeat', timestamp: new Date().toISOString() }) + '\n');
      }
    }, 20000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);

        // Accumulate for database storage
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.done === true) {
              finalAiResult = data.final || data;
            } else if (data.final) {
              finalAiResult = data.final;
            }
          } catch (e) {
            // Ignore partial JSON parse errors
          }
        }
      }

      clearInterval(heartbeat);

      // 3. Post-stream processing: Store feedback and tests in Database
      if (finalAiResult) {
        const warnings = finalAiResult.medication_warning || finalAiResult.medication_warnings || [];
        const condition = finalAiResult.condition || finalAiResult.disease || 'Unknown condition';
        const riskLevel = finalAiResult.risk || finalAiResult.risk_level || 'medium';
        const doctorAnalysis = finalAiResult.doctor_analysis || finalAiResult.analysis || null;
        const patientSummary = finalAiResult.patient_summary || finalAiResult.summary || null;

        // Create Feedback entry
        await prisma.feedback.create({
          data: {
            userId,
            condition: condition,
            riskLevel: riskLevel,
            relatedMedicines: Array.isArray(warnings) ? warnings : [warnings],
            doctorAnalysis,
            patientSummary,
          }
        });

        // 4. Store Numerical Tests if extracted by AI
        const extractedTests = finalAiResult.extracted_tests || finalAiResult.tests || [];
        if (Array.isArray(extractedTests) && extractedTests.length > 0) {
          logger.info(`Storing ${extractedTests.length} extracted tests for user ${userId}`);
          for (const test of extractedTests) {
            try {
              await prisma.labTest.create({
                data: {
                  userId,
                  testName: test.name || test.test_name || 'Unknown Test',
                  category: test.category || 'General',
                  value: String(test.value || '0'),
                  unit: test.unit || '',
                  refMin: test.ref_min !== undefined ? test.ref_min : (test.min !== undefined ? test.min : null),
                  refMax: test.ref_max !== undefined ? test.ref_max : (test.max !== undefined ? test.max : null),
                  refText: test.ref_text || null,
                  status: (['normal', 'borderline', 'abnormal', 'critical'].includes(test.status) ? test.status : 'normal') as any,
                  orderedBy: 'AI Analysis',
                  measuredAt: new Date(),
                }
              });
            } catch (err) {
              logger.error({ err, test }, 'Failed to store individual extracted test');
            }
          }
        }
      }

      res.end();
    } catch (streamError: any) {
      clearInterval(heartbeat);
      logger.error({ streamError }, 'Error during response streaming');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      } else {
        res.end();
      }
    }
  } catch (error: any) {
    logger.error({ error }, 'Error uploading and processing lab result');
    
    // Send email alert to admin
    void sendErrorAlert(error, `uploadLabResult (User: ${req.localUser?.id})`).catch(e => {
      logger.error({ e }, 'Failed to send error email alert');
    });

    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
};

export const getLabFeedbacks = async (req: Request, res: Response) => {
  try {
    const userId = req.localUser?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const feedbacks = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ data: feedbacks });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching feedbacks');
    return res.status(500).json({ error: 'Internal server error' });
  }
};
