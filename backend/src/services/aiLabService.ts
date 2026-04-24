import fs from 'fs';

import logger from '../lib/logger.js';

export class AiLabService {
  /**
   * Processes a lab image or PDF by sending it to the Kaggle AI inference endpoint.
   * @param filePath Path to the uploaded file
   * @param originalName The original name of the file
   * @param mimeType The file's MIME type
   */
  static async analyzeLabResult(filePath: string, originalName: string, mimeType: string) {
    const baseUrl = process.env.KAGGLE_NGROK_URL;
    if (!baseUrl) {
      throw new Error("KAGGLE_NGROK_URL is not configured.");
    }

    let apiUrl = baseUrl;
    if (!apiUrl.endsWith('/analyze-document-stream')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/analyze-document-stream';
    }
    logger.info(`Sending lab result to AI service at ${apiUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000); // 20 minutes

    try {
      // Use native Node.js FormData (available in modern Node versions)
      const formData = new FormData();
      const fileBuffer = await fs.promises.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, originalName);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Server Error: ${response.status} ${await response.text()}`);
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI analysis timed out after 20 minutes.');
      }
      logger.error({ error }, "Error during AI lab analysis");
      throw error;
    }
  }


  /**
   * Parses the streaming or standard JSON response from the Kaggle AI backend.
   */
  private static async parseResponseResult(response: any): Promise<any> {
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    // Fast path: normal JSON
    if (contentType.includes('application/json') && !contentType.includes('stream')) {
      return await response.json();
    }

    // Handle Streaming JSONL response (if the fetch implementation supports async iterator on body)
    let lastObj = null;
    let finalObj = null;

    if (response.body && typeof response.body[Symbol.asyncIterator] === 'function') {
      let buffer = '';
      for await (const chunk of response.body) {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            lastObj = obj;
            if (obj && typeof obj === 'object' && obj.done === true) {
              finalObj = obj.final;
              break;
            }
          } catch (e) {
            // Ignore parse errors on incomplete chunks if any
          }
        }
        if (finalObj) break;
      }
    } else {
      // Fallback
      return await response.json();
    }

    if (finalObj !== null) return finalObj;
    if (lastObj !== null) return lastObj;

    throw new Error("Could not parse JSON from streaming response");
  }
}
