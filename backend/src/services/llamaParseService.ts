import { LlamaParseReader } from 'llama-cloud-services';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../lib/logger.js';

/**
 * Primary service for extracting text/markdown from complex documents (like PDFs)
 * using LlamaParse to produce clean markdown for Gemini extraction.
 */
export async function parseDocumentWithLlama(buffer: Buffer, originalFilename: string): Promise<string> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) {
    logger.warn('LLAMA_CLOUD_API_KEY is missing. LlamaParse parser will fail.');
  }

  // Create a temporary file path
  const ext = path.extname(originalFilename) || '.pdf';
  const tempFilename = `llamaparse-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
  const tempPath = path.join(os.tmpdir(), tempFilename);

  try {
    // Write buffer to temp file
    await fs.writeFile(tempPath, buffer);
    logger.debug(`Wrote temp file for LlamaParse at ${tempPath}`);

    // Initialize LlamaParse
    // LlamaParseReader automatically picks up LLAMA_CLOUD_API_KEY from process.env
    const reader = new LlamaParseReader({ resultType: 'markdown' });
    
    logger.info(`Starting LlamaParse extraction for ${originalFilename}`);
    const documents = await reader.loadData(tempPath);
    
    // Combine all pages/chunks into a single markdown string
    const markdownContent = documents.map(doc => doc.text).join('\n\n');
    
    logger.info(`LlamaParse extraction successful (${markdownContent.length} chars)`);
    return markdownContent;
  } catch (error) {
    logger.error({ error }, 'LlamaParse extraction failed');
    throw error;
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPath);
      logger.debug(`Cleaned up LlamaParse temp file ${tempPath}`);
    } catch (cleanupError) {
      logger.error({ cleanupError }, `Failed to clean up LlamaParse temp file ${tempPath}`);
    }
  }
}
