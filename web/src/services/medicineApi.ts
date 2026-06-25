/**
 * Medicine API — Repository Layer
 *
 * Handles all medicine-related API calls.
 * Architecture: Pages → Hooks → medicineApi (this) → apiClient
 */

import { authFetch } from '../lib/apiClient';

/* ─── Types ─── */

export interface MedicineFlag {
  condition: string;
  reasonAr: string;
  reasonEn: string;
  matchedCategories: string[];
  matchedKeywords: string[];
}

export interface LabelWarning {
  contraindications: string | null;
  warnings: string | null;
  boxed_warning: string | null;
}

export interface Medicine {
  id: string;
  brandNameAr: string;
  brandNameEn: string | null;
  activeIngredient: string;
  rxcui: string | null;
  drugbankId: string | null;
  drugClasses: string[];
  category: string;
  form: string;
  manufacturer: string | null;
  photoUrl: string | null;
  isOtc: boolean;
  createdAt: string;
  priceOld: number | null;
  priceNew: number | null;
  strength: string | null;
  packSize: number | null;
  packUnit: string | null;
  barcode: string | null;
  origin: string | null;
  flags: MedicineFlag[];
  isSafe: boolean;
  hasPdf?: boolean;
}

export interface MedicineDetail extends Medicine {
  labelWarning: LabelWarning | null;
}

export interface MedicineSearchParams {
  category?: string;
  query?: string;
  matchStatus?: 'all' | 'clear' | 'warning';
  page?: number;
  limit?: number;
}

export interface MedicineSearchResult {
  data: Medicine[];
  total: number;
  page: number;
  limit: number;
}

/* ─── API surface ─── */

export const medicineApi = {
  /** Search medicines — public, personalized if logged in */
  async searchMedicines(params?: MedicineSearchParams): Promise<MedicineSearchResult> {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('query', params.query);
    if (params?.category) qs.set('category', params.category);
    if (params?.matchStatus && params.matchStatus !== 'all') qs.set('matchStatus', params.matchStatus);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return authFetch<MedicineSearchResult>(`/medicines${query}`);
  },

  /** Get single medicine with flags + FDA label warning */
  async getMedicineById(id: string): Promise<MedicineDetail> {
    const data = await authFetch<{ medicine: MedicineDetail }>(`/medicines/${id}`);
    return data.medicine;
  },

  /** List available categories */
  async getCategories(): Promise<string[]> {
    const data = await authFetch<{ categories: string[] }>('/medicines/categories');
    return data.categories;
  },

  /** Get patient's saved conditions (auth required) */
  async getConditions(): Promise<string[]> {
    const data = await authFetch<{ conditions: string[] }>('/medicines/conditions/me');
    return data.conditions;
  },

  /** Set patient's conditions (auth required) */
  async setConditions(
    conditions: string[],
    source: 'manual' | 'lab_result' = 'manual'
  ): Promise<{ success: boolean; conditions: string[] }> {
    return authFetch<{ success: boolean; conditions: string[] }>('/medicines/conditions/me', {
      method: 'PUT',
      body: JSON.stringify({ conditions, source }),
    });
  },
};
