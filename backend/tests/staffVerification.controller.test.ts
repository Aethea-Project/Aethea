import { Request, Response } from 'express';
import prisma from '../src/lib/prisma.js';
import { getSupabaseAdminClient } from '../src/lib/supabaseAdmin.js';
import {
  createVerificationUploadUrl,
  reviewVerificationProfile,
  submitVerificationProfile,
} from '../src/controllers/staffVerification.controller.js';

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock('../src/lib/supabaseAdmin.js', () => ({
  __esModule: true,
  getSupabaseAdminClient: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
};

const mockedGetSupabaseAdminClient = getSupabaseAdminClient as jest.Mock;

const createResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('staffVerification.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVerificationUploadUrl', () => {
    it('creates signed upload URL for valid file name', async () => {
      mockedGetSupabaseAdminClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            createSignedUploadUrl: jest.fn().mockResolvedValue({
              data: {
                path: 'u1/12345-passport.png',
                token: 'upload-token',
                signedUrl: 'https://storage.test/upload',
              },
              error: null,
            }),
          }),
        },
      });

      const req = {
        user: { id: 'u1', account_type: 'doctor', account_status: 'pending' },
        body: { bucket: 'staff-documents', fileName: 'passport.png' },
      } as unknown as Request;
      const res = createResponse();

      await createVerificationUploadUrl(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bucket: 'staff-documents',
            token: 'upload-token',
          }),
        }),
      );
    });

    it('rejects invalid filename characters', async () => {
      const req = {
        user: { id: 'u1', account_type: 'doctor', account_status: 'pending' },
        body: { bucket: 'staff-documents', fileName: '../escape.pdf' },
      } as unknown as Request;
      const res = createResponse();

      await expect(createVerificationUploadUrl(req, res)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_FILE_NAME',
      });
    });
  });

  describe('submitVerificationProfile', () => {
    it('upserts profile and sets account status to pending', async () => {
      mockedPrisma.$queryRaw.mockResolvedValueOnce([
        {
          user_id: 'u1',
          staff_type: 'doctor',
          verification_status: 'under_review',
        },
      ]);
      mockedPrisma.$executeRaw.mockResolvedValueOnce(1);

      const req = {
        user: { id: 'u1', account_type: 'doctor', account_status: 'pending' },
        body: {
          governmentIdPath: 'u1/gov-id.png',
          certificateFilePath: 'u1/license.pdf',
          selfieFilePath: 'u1/selfie.png',
          specialty: 'Cardiology',
          affiliationName: 'Aethea Clinic',
          affiliationType: 'clinic',
        },
      } as unknown as Request;
      const res = createResponse();

      await submitVerificationProfile(req, res);

      expect(mockedPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockedPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'u1',
          verification_status: 'under_review',
        }),
      });
    });
  });

  describe('reviewVerificationProfile', () => {
    const staffUserId = '00000000-0000-4000-a000-000000000001';
    const adminUserId = '00000000-0000-4000-a000-000000000099';
    const missingUserId = '00000000-0000-4000-a000-ffffffffffff';

    it('marks account active when verification approved', async () => {
      mockedPrisma.$queryRaw.mockResolvedValueOnce([
        { user_id: staffUserId, verification_status: 'verified' },
      ]);
      mockedPrisma.$executeRaw.mockResolvedValueOnce(1);

      const req = {
        params: { userId: staffUserId },
        user: { id: adminUserId, account_type: 'admin', account_status: 'active' },
        body: { verificationStatus: 'verified', notes: 'All checks passed' },
      } as unknown as Request;
      const res = createResponse();

      await reviewVerificationProfile(req, res);

      expect(mockedPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ user_id: staffUserId }),
      });
    });

    it('marks account rejected when verification rejected', async () => {
      mockedPrisma.$queryRaw.mockResolvedValueOnce([
        { user_id: staffUserId, verification_status: 'rejected' },
      ]);
      mockedPrisma.$executeRaw.mockResolvedValueOnce(1);

      const req = {
        params: { userId: staffUserId },
        user: { id: adminUserId, account_type: 'admin', account_status: 'active' },
        body: { verificationStatus: 'rejected', notes: 'Expired certificate' },
      } as unknown as Request;
      const res = createResponse();

      await reviewVerificationProfile(req, res);

      expect(mockedPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ user_id: staffUserId }),
      });
    });

    it('returns not found when staff profile does not exist', async () => {
      mockedPrisma.$queryRaw.mockResolvedValueOnce([]);

      const req = {
        params: { userId: missingUserId },
        user: { id: adminUserId, account_type: 'admin', account_status: 'active' },
        body: { verificationStatus: 'verified' },
      } as unknown as Request;
      const res = createResponse();

      await expect(reviewVerificationProfile(req, res)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
