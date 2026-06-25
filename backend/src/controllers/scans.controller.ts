import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANS_DATA_DIR = path.resolve(__dirname, '../../scans-data');

async function downloadFile(url: string, destPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download result file from ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buffer);
}

export const listScans = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { page, limit, skip } = parsePagination(req);

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where: { userId: user.id },
      orderBy: { scanDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.scan.count({ where: { userId: user.id } }),
  ]);

  res.json(paginatedResult(scans, total, page, limit));
};

export const createScan = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const { fileBase64, fileName, type, bodyPart, description, findings, radiologist, priority, scanDate } = req.body;

  // 1. Create a Scan record in the DB first to get a unique scan ID
  const scan = await prisma.scan.create({
    data: {
      userId: user.id,
      type: type || 'X-Ray',
      bodyPart: bodyPart || 'Chest',
      description: description || 'AI scan analysis',
      findings: findings || 'AI extraction in progress...',
      radiologist: radiologist || 'Aethea AI Analyzer',
      priority: priority || 'routine',
      status: 'pending',
      scanDate: scanDate ? new Date(scanDate) : new Date(),
    },
  });

  const scanId = scan.id;
  const scanDir = path.join(SCANS_DATA_DIR, scanId);

  try {
    // Ensure the folder for this scan exists
    fs.mkdirSync(scanDir, { recursive: true });

    let originalFileUrl: string | null = null;
    const savedImagesList: any[] = [];
    let savedReportUrl: string | null = null;

    // 2. Decode and save original image locally
    if (fileBase64 && fileName) {
      const ext = path.extname(fileName) || '.png';
      const originalFileName = `original${ext}`;
      const originalFilePath = path.join(scanDir, originalFileName);

      const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(originalFilePath, fileBuffer);

      originalFileUrl = `/api/scans/${scanId}/files/${originalFileName}`;
      savedImagesList.push({
        id: 'original',
        url: originalFileUrl,
        thumbnail: originalFileUrl,
        caption: 'Original Scan'
      });

      // 3. Call external AI analyzer service
      const fileMimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const aiBlob = new Blob([fileBuffer], { type: fileMimeType });
      const formData = new FormData();
      formData.append('file', aiBlob, fileName);

      const aiResponse = await fetch('http://host.docker.internal:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error(`AI analysis failed with status: ${aiResponse.status}`);
      }

      const aiData: any = await aiResponse.json();

      // 4. Download and save AI results locally
      if (aiData.images) {
        if (aiData.images.bbox_overlay?.url) {
          const bboxFileName = 'bbox.png';
          await downloadFile(aiData.images.bbox_overlay.url, path.join(scanDir, bboxFileName));
          const url = `/api/scans/${scanId}/files/${bboxFileName}`;
          savedImagesList.push({
            id: 'bbox_overlay',
            url,
            thumbnail: url,
            caption: 'Detection Bounding Box'
          });
        }

        if (aiData.images.gradcam_overlay?.url) {
          const gradcamFileName = 'gradcam.png';
          await downloadFile(aiData.images.gradcam_overlay.url, path.join(scanDir, gradcamFileName));
          const url = `/api/scans/${scanId}/files/${gradcamFileName}`;
          savedImagesList.push({
            id: 'gradcam_overlay',
            url,
            thumbnail: url,
            caption: 'Grad-CAM Heatmap'
          });
        }

        if (aiData.images.roi_crops && Array.isArray(aiData.images.roi_crops)) {
          for (let i = 0; i < aiData.images.roi_crops.length; i++) {
            const crop = aiData.images.roi_crops[i];
            if (crop.url) {
              const cropFileName = `crop_${i}.png`;
              await downloadFile(crop.url, path.join(scanDir, cropFileName));
              const url = `/api/scans/${scanId}/files/${cropFileName}`;
              savedImagesList.push({
                id: `roi_crop_${i}`,
                url,
                thumbnail: url,
                caption: `Region of Interest ${i + 1}`
              });
            }
          }
        }
      }

      if (aiData.pdf_url_en) {
        const pdfFileName = 'report_en.pdf';
        await downloadFile(aiData.pdf_url_en, path.join(scanDir, pdfFileName));
        savedReportUrl = `/api/scans/${scanId}/files/${pdfFileName}`;
      }

      if (aiData.pdf_url_ar) {
        const pdfFileNameAr = 'report_ar.pdf';
        await downloadFile(aiData.pdf_url_ar, path.join(scanDir, pdfFileNameAr));
      }
    }

    // 5. Update Scan record with local results and completed status
    const updatedScan = await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        findings: 'AI image analysis complete. Bounding box overlay, Grad-CAM heatmap, and detailed PDF report generated.',
        reportUrl: savedReportUrl || undefined,
        images: savedImagesList,
      },
    });

    res.status(201).json({ scan: updatedScan });
  } catch (err: any) {
    // Clean up created folder/files and scan record on failure
    try {
      if (fs.existsSync(scanDir)) {
        fs.rmSync(scanDir, { recursive: true, force: true });
      }
    } catch {}
    await prisma.scan.delete({ where: { id: scanId } }).catch(() => {});
    
    console.error('Scan creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete AI analysis and save scan' });
  }
};

export const updateScan = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;

  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    throw AppError.badRequest('Missing scan id');
  }

  const existing = await prisma.scan.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    throw AppError.notFound('Scan not found');
  }

  const scan = await prisma.scan.update({
    where: { id },
    data: {
      type: req.body.type ?? existing.type,
      bodyPart: req.body.bodyPart ?? existing.bodyPart,
      description: req.body.description ?? existing.description,
      findings: req.body.findings ?? existing.findings,
      radiologist: req.body.radiologist ?? existing.radiologist,
      priority: req.body.priority ?? existing.priority,
      status: req.body.status ?? existing.status,
      reportUrl: req.body.reportUrl ?? existing.reportUrl,
      scanDate: req.body.scanDate ? new Date(req.body.scanDate) : existing.scanDate,
    },
  });

  res.json({ scan });
};

export const getScanFileHandler = async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const filenameParam = req.params.filename;
  const filename = Array.isArray(filenameParam) ? filenameParam[0] : filenameParam;

  if (!id || !filename) {
    throw AppError.badRequest('Missing scan id or filename');
  }

  // The UUID of the scan acts as a capability URL
  const scan = await prisma.scan.findFirst({
    where: { id }
  });
  if (!scan) {
    res.status(404).end();
    return;
  }

  const filePath = path.join(SCANS_DATA_DIR, id, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }

  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
  } else if (ext === '.png') {
    res.setHeader('Content-Type', 'image/png');
  } else if (ext === '.jpg' || ext === '.jpeg') {
    res.setHeader('Content-Type', 'image/jpeg');
  } else if (ext === '.webp') {
    res.setHeader('Content-Type', 'image/webp');
  }

  res.sendFile(filePath);
};

export const deleteScan = async (req: Request, res: Response): Promise<void> => {
  const user = req.localUser!;
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) throw AppError.badRequest('Missing scan id');

  const existing = await prisma.scan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw AppError.notFound('Scan not found');

  await prisma.scan.delete({ where: { id } });

  try {
    const scanDir = path.join(SCANS_DATA_DIR, id);
    if (fs.existsSync(scanDir)) {
      fs.rmSync(scanDir, { recursive: true, force: true });
    }
  } catch (err) {
    // Ignore file deletion errors
  }

  res.status(204).end();
};
