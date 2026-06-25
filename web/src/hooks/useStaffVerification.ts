import { useCallback, useEffect, useState } from 'react';
import { staffVerificationApi, StaffVerificationProfile } from '../services/staffVerificationApi';

interface VerificationForm {
  specialty: string;
  affiliationName: string;
  affiliationType: 'hospital' | 'clinic' | 'pharmacy' | 'other';
  nationalId: string;
  syndicateId: string;
  ministryLicense: string;
  governmentIdFile: File | null;
  certificateFile: File | null;
  selfieFile: File | null;
}

const defaultForm: VerificationForm = {
  specialty: '',
  affiliationName: '',
  affiliationType: 'hospital',
  nationalId: '',
  syndicateId: '',
  ministryLicense: '',
  governmentIdFile: null,
  certificateFile: null,
  selfieFile: null,
};

export const useStaffVerification = () => {
  const [profile, setProfile] = useState<StaffVerificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VerificationForm>(defaultForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffVerificationApi.getMyProfile();
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(<K extends keyof VerificationForm>(key: K, value: VerificationForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const submit = useCallback(async () => {
    if (!form.governmentIdFile || !form.certificateFile || !form.selfieFile) {
      throw new Error('All required files must be selected before submission');
    }

    setSubmitting(true);
    setError(null);

    try {
      const govUpload = await staffVerificationApi.requestUploadUrl('staff-documents', form.governmentIdFile.name);
      const certUpload = await staffVerificationApi.requestUploadUrl('staff-documents', form.certificateFile.name);
      const selfieUpload = await staffVerificationApi.requestUploadUrl('staff-selfies', form.selfieFile.name);

      await Promise.all([
        staffVerificationApi.uploadWithSignedToken('staff-documents', govUpload.path, govUpload.token, form.governmentIdFile),
        staffVerificationApi.uploadWithSignedToken('staff-documents', certUpload.path, certUpload.token, form.certificateFile),
        staffVerificationApi.uploadWithSignedToken('staff-selfies', selfieUpload.path, selfieUpload.token, form.selfieFile),
      ]);

      await staffVerificationApi.submitProfile({
        governmentIdPath: govUpload.path,
        certificateFilePath: certUpload.path,
        selfieFilePath: selfieUpload.path,
        specialty: form.specialty,
        affiliationName: form.affiliationName,
        affiliationType: form.affiliationType,
        nationalId: form.nationalId,
        syndicateId: form.syndicateId,
        ministryLicense: form.ministryLicense,
      });

      await load();
      setForm(defaultForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit verification profile');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [form, load]);

  return {
    profile,
    loading,
    submitting,
    error,
    form,
    setField,
    submit,
    reload: load,
  };
};
