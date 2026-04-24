import { MedicineRepository } from '../repositories/medicine.repository';
import { flagMedicine } from '../config/flaggingRules';
import { SearchMedicinesInput } from '../schemas/medicine.schemas';

const OPENFDA_API_KEY = process.env.OPENFDA_API_KEY ?? '';

async function fetchOpenFDAWarnings(activeIngredient: string) {
  try {
    const url =
      `https://api.fda.gov/drug/label.json` +
      `?api_key=${OPENFDA_API_KEY}` +
      `&search=active_ingredient:"${encodeURIComponent(activeIngredient)}"&limit=1`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data: any = await res.json();
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

export class MedicineService {
  constructor(private repo: MedicineRepository) {}

  async searchMedicines(input: SearchMedicinesInput, patientId?: string) {
    const { page, limit, category, query } = input;
    const offset = (page - 1) * limit;

    const conditions = patientId
      ? await this.repo.getPatientConditions(patientId)
      : [];

    const { data, total } = await this.repo.searchMedicines({
      category,
      query,
      limit,
      offset,
    });

    const medicines = data.map(med => {
      const flags = flagMedicine(
        med.drugClasses,
        med.activeIngredient,
        conditions
      );
      return { ...med, flags, isSafe: flags.length === 0 };
    });

    medicines.sort((a, b) => {
      if (a.isSafe === b.isSafe) return 0;
      return a.isSafe ? -1 : 1;
    });

    return {
      data:  medicines,
      total,
      page,
      limit,
    };
  }

  async getMedicineById(id: string, patientId?: string) {
    const med = await this.repo.getMedicineById(id);
    if (!med) return null;

    const conditions = patientId
      ? await this.repo.getPatientConditions(patientId)
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

    return { ...med, flags, isSafe, labelWarning };
  }

  async getCategories() {
    return this.repo.getCategories();
  }

  async getPatientConditions(patientId: string) {
    return this.repo.getPatientConditions(patientId);
  }

  async setPatientConditions(
    patientId:  string,
    conditions: string[],
    source:     string
  ) {
    await this.repo.setPatientConditions(patientId, conditions, source);
    return { success: true, conditions };
  }
}

