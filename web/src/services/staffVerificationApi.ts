import { authFetch } from '../lib/apiClient';
import { authService } from './auth';

type VerificationStatus = 'unverified' | 'under_review' | 'verified' | 'rejected';

type UploadBucket = 'staff-documents' | 'staff-selfies';

interface SignedUploadResponse {
  data: {
    bucket: UploadBucket;
    path: string;
    token: string;
    signedUrl: string;
  };
}

interface StaffVerificationProfile {
  user_id: string;
  staff_type: 'doctor' | 'pharmacist';
  government_id_path: string | null;
  certificate_file_path: string | null;
  selfie_file_path: string | null;
  specialty: string | null;
  affiliation_name: string | null;
  affiliation_type: string | null;
  national_id: string | null;
  syndicate_id: string | null;
  ministry_license: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  updated_at: string;
}

interface QueueItem extends StaffVerificationProfile {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const staffVerificationApi = {
  async getMyProfile(): Promise<StaffVerificationProfile | null> {
    const response = await authFetch<{ data: StaffVerificationProfile | null }>('/v1/staff/verification/me');
    return response.data;
  },

  async requestUploadUrl(bucket: UploadBucket, fileName: string): Promise<SignedUploadResponse['data']> {
    const response = await authFetch<SignedUploadResponse>('/v1/staff/verification/upload-url', {
      method: 'POST',
      body: JSON.stringify({ bucket, fileName }),
    });
    return response.data;
  },

  async uploadWithSignedToken(bucket: UploadBucket, path: string, token: string, file: File): Promise<void> {
    const supabase = authService.getSupabaseClient();
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async submitProfile(payload: {
    governmentIdPath: string;
    certificateFilePath: string;
    selfieFilePath: string;
    specialty: string;
    affiliationName: string;
    affiliationType: 'hospital' | 'clinic' | 'pharmacy' | 'other';
    nationalId: string;
    syndicateId: string;
    ministryLicense: string;
  }): Promise<void> {
    await authFetch<{ data: unknown }>('/v1/staff/verification/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listQueue(status: VerificationStatus = 'under_review', page = 1, limit = 20): Promise<PaginatedResponse<QueueItem>> {
    const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
    return authFetch<PaginatedResponse<QueueItem>>(`/v1/admin/staff-profiles?${params.toString()}`);
  },

  async getDocumentLinks(userId: string): Promise<{ governmentIdUrl: string | null; certificateUrl: string | null; selfieUrl: string | null }> {
    const response = await authFetch<{ data: { governmentIdUrl: string | null; certificateUrl: string | null; selfieUrl: string | null } }>(
      `/v1/admin/staff-profiles/${userId}/documents`
    );
    return response.data;
  },

  async reviewProfile(userId: string, verificationStatus: 'verified' | 'rejected', notes?: string): Promise<void> {
    await authFetch<{ data: unknown }>(`/v1/admin/staff-profiles/${userId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus, notes }),
    });
  },
};

export type { VerificationStatus, StaffVerificationProfile, QueueItem };
