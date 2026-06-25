export const CONDITION_RULES = {
  diabetes: {
    flagCategories: [
      "Hyperglycemia-Associated Agents",
      "Corticosteroids",
      "Thiazide Diuretics",
      "Blood Glucose Lowering Agents" // flag if patient is NOT diabetic taking this
    ],
    flagKeywords: ["pseudoephedrine", "phenylephrine", "prednisone", "dexamethasone"],
    reasonAr: "قد يؤثر على مستوى السكر في الدم",
    reasonEn: "May affect blood sugar levels"
  },
  prediabetes: {
    flagCategories: [
      "Hyperglycemia-Associated Agents",
      "Corticosteroids",
      "Thiazide Diuretics",
      "Blood Glucose Lowering Agents"
    ],
    flagKeywords: ["pseudoephedrine", "phenylephrine", "prednisone", "dexamethasone"],
    reasonAr: "قد يؤثر على مستوى السكر في الدم (مقدمات السكري)",
    reasonEn: "May affect blood sugar levels (Prediabetes Warning)"
  },
  hypertension: {
    flagCategories: [
      "Agents that produce hypertension",
      "Nasal Decongestants",
      "Nasal Decongestants for Systemic Use",
      "Vasoconstrictor Agents",
      "Non COX-2 selective NSAIDS",
      "Anti-Inflammatory Agents, Non-Steroidal"
    ],
    flagKeywords: ["pseudoephedrine", "phenylephrine", "ibuprofen", "naproxen"],
    reasonAr: "قد يرفع ضغط الدم",
    reasonEn: "May raise blood pressure"
  },
  hyperlipidemia: {
    flagCategories: [
      "Thiazide Diuretics",
      "Beta-Blockers",
      "Antipsychotics",
      "Corticosteroids"
    ],
    flagKeywords: ["propranolol", "olanzapine", "clozapine", "prednisone", "isotretinoin"],
    reasonAr: "قد يؤثر سلبًا على مستوى الدهون في الدم",
    reasonEn: "May worsen lipid profile (cholesterol/triglycerides)"
  },
  kidney_dysfunction: {
    flagCategories: [
      "Nephrotoxic agents",
      "Non COX-2 selective NSAIDS",
      "Anti-Inflammatory Agents, Non-Steroidal",
      "Aminoglycosides"
    ],
    flagKeywords: ["ibuprofen", "naproxen", "diclofenac", "gentamicin", "piroxicam"],
    reasonAr: "يمنع استخدامه في حالة وجود ضعف في وظائف الكلى",
    reasonEn: "Contraindicated for potential kidney impairment"
  }
} as const;

export type PatientConditionType = keyof typeof CONDITION_RULES;

export type MedicineFlag = {
  condition: PatientConditionType;
  reasonAr: string;
  reasonEn: string;
  matchedCategories: string[];
  matchedKeywords: string[];
};

export function flagMedicine(
  drugClasses: string[] | string | null | undefined,
  activeIngredient: string | null | undefined,
  conditions: readonly string[]
): MedicineFlag[] {
  let drugClassesText = '';
  if (Array.isArray(drugClasses)) {
    drugClassesText = drugClasses.join(' ').toLowerCase();
  } else {
    drugClassesText = (drugClasses ?? '').toLowerCase();
  }
  const ingredientText = (activeIngredient ?? '').toLowerCase();

  const flags: MedicineFlag[] = [];

  for (const condition of conditions) {
    if (!(condition in CONDITION_RULES)) continue;

    const typedCondition = condition as PatientConditionType;
    const rule = CONDITION_RULES[typedCondition];

    const matchedCategories = rule.flagCategories.filter(cat =>
      drugClassesText.includes(cat.toLowerCase())
    );

    const matchedKeywords = rule.flagKeywords.filter(keyword =>
      ingredientText.includes(keyword.toLowerCase())
    );

    if (matchedCategories.length === 0 && matchedKeywords.length === 0) continue;

    flags.push({
      condition: typedCondition,
      reasonAr: rule.reasonAr,
      reasonEn: rule.reasonEn,
      matchedCategories: [...matchedCategories],
      matchedKeywords: [...matchedKeywords],
    });
  }

  return flags;
}




