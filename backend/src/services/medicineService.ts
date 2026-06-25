import * as medicineRepo from '../repositories/medicineRepository.js';
import { flagMedicine } from '../config/flaggingRules.js';
import { SearchMedicinesInput } from '../schemas/medicine.schemas.js';

const OPENFDA_API_KEY = process.env.OPENFDA_API_KEY ?? '';

interface OpenFdaResponse {
  results?: Array<{
    contraindications?: string[];
    warnings?: string[];
    boxed_warning?: string[];
  }>;
}

async function fetchOpenFDAWarnings(activeIngredient: string) {
  try {
    const url =
      `https://api.fda.gov/drug/label.json` +
      `?api_key=${OPENFDA_API_KEY}` +
      `&search=openfda.generic_name:"${encodeURIComponent(activeIngredient)}"&limit=1`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as OpenFdaResponse;
    const result = data?.results?.[0];
    if (!result) return null;

    return {
      contraindications: result.contraindications?.[0] ?? null,
      warnings:          result.warnings?.[0] ?? null,
      boxed_warning:     result.boxed_warning?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

export async function searchMedicines(input: SearchMedicinesInput, patientId?: string) {
  const { page, limit, category, query, matchStatus } = input;

  const conditions = patientId
    ? await medicineRepo.getPatientConditions(patientId)
    : [];

  // Fetch matching medicines directly from the repo
  // We can rely on the database now since photoUrl is persisted.
  // Still fetching up to 10000 to sort safe/unsafe medicines dynamically.
  const { data: allData } = await medicineRepo.searchMedicines({
    category,
    query,
    limit: 10000,
    offset: 0,
  });

  const total = allData.length;

  const medicines = allData.map(med => {
    const flags = flagMedicine(
      med.drugClasses,
      med.activeIngredient,
      conditions
    );
    
    return { 
      ...med, 
      flags, 
      isSafe: flags.length === 0,
      hasImage: !!med.photoUrl,
      hasPdf: !!med.photoUrl,
    };
  });

  medicines.sort((a, b) => {
    // 1. Medicines with images first
    if (a.hasImage !== b.hasImage) {
      return a.hasImage ? -1 : 1;
    }
    // 2. Safe medicines second
    if (a.isSafe !== b.isSafe) {
      return a.isSafe ? -1 : 1;
    }
    return 0;
  });

  // Filter by matchStatus if provided
  let filteredMedicines = medicines;
  if (matchStatus === 'clear') {
    filteredMedicines = medicines.filter(m => m.isSafe);
  } else if (matchStatus === 'warning') {
    filteredMedicines = medicines.filter(m => !m.isSafe);
  }

  const finalTotal = filteredMedicines.length;

  // Paginate the sorted results in memory
  const offset = (page - 1) * limit;
  const paginatedMedicines = filteredMedicines.slice(offset, offset + limit);

  return {
    data:  paginatedMedicines,
    total: finalTotal,
    page,
    limit
  };
}

export async function getMedicineById(id: string, patientId?: string) {
  const med = await medicineRepo.getMedicineById(id);
  if (!med) return null;

  const conditions = patientId
    ? await medicineRepo.getPatientConditions(patientId)
    : [];

  const flags = flagMedicine(
    med.drugClasses,
    med.activeIngredient,
    conditions
  );

  const isSafe = flags.length === 0;

  let labelWarning = null;
  if (!isSafe) {
    labelWarning = await fetchOpenFDAWarnings(med.activeIngredient);
  }

  return { 
    ...med, 
    flags, 
    isSafe, 
    labelWarning,
    hasImage: !!med.photoUrl,
    hasPdf: !!med.photoUrl,
  };
}

export async function getCategories() {
  return medicineRepo.getCategories();
}

export async function getPatientConditions(patientId: string) {
  return medicineRepo.getPatientConditions(patientId);
}

export async function setPatientConditions(
  patientId:  string,
  conditions: string[],
  source:     string
) {
  await medicineRepo.setPatientConditions(patientId, conditions, source);
  return { success: true, conditions };
}
