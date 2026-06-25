export const SEEDED_EMAILS = new Set([
  'admin@aethea.me',
  'doc@aethea.me',
  'farm@aethea.me',
  'pat@aethea.me',
]);

export const SEEDED_IDS = new Set([
  '1c8e4f56-8af4-452a-ae6f-7b20a6d3d9b7', // admin
  'db2417ae-914d-468f-9db1-0503fb556b24', // doctor
  'c58b6c74-f6d3-4fe8-90fd-ed1ad15840c9', // pharmacist
  'ae0b9899-7075-4b2d-bfaa-93e3aed947bc', // patient
]);

export const ACCOUNT_TYPES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  PHARMACIST: 'pharmacist',
  ADMIN: 'admin',
} as const;

export const ACCOUNT_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
} as const;
