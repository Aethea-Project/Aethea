/**
 * 0-dependency magic byte validation for secure file uploads.
 * Inspects buffer headers to verify the real file type.
 */
export type AllowedMimeType = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';

export function validateMagicBytes(buffer: Buffer): AllowedMimeType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. Check PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // 2. Check PNG (89 50 4e 47 0d 0a 1a 0a)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. Check JPEG (ff d8 ff)
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // 4. Check WEBP (52 49 46 46 at offset 0 and 57 45 42 50 at offset 8)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}
