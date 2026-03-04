/**
 * Mock medicine data for MedicineGuide page
 * Will be replaced by API calls when the backend endpoints are ready.
 */

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  description: string;
  sideEffects: string[];
  contraindications: string[];
  warnings: {
    diabetes?: boolean;
    hypertension?: boolean;
    pregnancy?: boolean;
    kidneyDisease?: boolean;
    liverDisease?: boolean;
  };
  dosage: string;
  activeIngredients: string[];
}

export interface PatientConditions {
  diabetes: boolean;
  hypertension: boolean;
  pregnancy: boolean;
  kidneyDisease: boolean;
  liverDisease: boolean;
}

/** Default patient conditions (in real app, from user profile) */
export const defaultPatientConditions: PatientConditions = {
  diabetes: true,
  hypertension: false,
  pregnancy: false,
  kidneyDisease: false,
  liverDisease: false,
};

export const mockMedicines: Medicine[] = [
  {
    id: 'med-001',
    name: 'Panadol Extra',
    genericName: 'Paracetamol + Caffeine',
    category: 'Pain Relief',
    description: 'Fast-acting pain reliever for headaches, fever, and body aches',
    sideEffects: ['Nausea', 'Stomach upset', 'Allergic reactions (rare)'],
    contraindications: ['Severe liver disease', 'Alcohol dependency'],
    warnings: {
      diabetes: false,
      hypertension: false,
      pregnancy: false,
      kidneyDisease: false,
      liverDisease: true,
    },
    dosage: '1-2 tablets every 4-6 hours. Max 8 tablets in 24 hours',
    activeIngredients: ['Paracetamol 500mg', 'Caffeine 65mg'],
  },
  {
    id: 'med-002',
    name: 'Congestal',
    genericName: 'Pseudoephedrine + Paracetamol',
    category: 'Cold & Flu',
    description: 'Relieves nasal congestion, fever, and cold symptoms',
    sideEffects: ['Drowsiness', 'Dry mouth', 'Increased heart rate', 'Elevated blood pressure'],
    contraindications: ['Severe hypertension', 'Heart disease', 'MAO inhibitors'],
    warnings: {
      diabetes: true,
      hypertension: true,
      pregnancy: true,
      kidneyDisease: false,
      liverDisease: false,
    },
    dosage: '1 tablet every 12 hours. Do not exceed 2 tablets in 24 hours',
    activeIngredients: ['Pseudoephedrine 60mg', 'Paracetamol 500mg'],
  },
  {
    id: 'med-003',
    name: 'Glucophage',
    genericName: 'Metformin',
    category: 'Diabetes Management',
    description: 'Controls blood sugar levels in type 2 diabetes',
    sideEffects: ['Diarrhea', 'Nausea', 'Stomach upset', 'Metallic taste'],
    contraindications: ['Kidney disease', 'Liver disease', 'Heart failure'],
    warnings: {
      diabetes: false,
      hypertension: false,
      pregnancy: true,
      kidneyDisease: true,
      liverDisease: true,
    },
    dosage: 'As prescribed by doctor. Usually 500mg-1000mg twice daily with meals',
    activeIngredients: ['Metformin Hydrochloride 500mg'],
  },
  {
    id: 'med-004',
    name: 'Brufen',
    genericName: 'Ibuprofen',
    category: 'Pain Relief / Anti-inflammatory',
    description: 'Reduces pain, inflammation, and fever',
    sideEffects: ['Stomach pain', 'Heartburn', 'Nausea', 'Dizziness'],
    contraindications: ['Active stomach ulcers', 'Severe kidney disease', 'Aspirin allergy'],
    warnings: {
      diabetes: false,
      hypertension: true,
      pregnancy: true,
      kidneyDisease: true,
      liverDisease: false,
    },
    dosage: '200-400mg every 4-6 hours. Max 1200mg in 24 hours without prescription',
    activeIngredients: ['Ibuprofen 400mg'],
  },
  {
    id: 'med-005',
    name: 'Amoxil',
    genericName: 'Amoxicillin',
    category: 'Antibiotic',
    description: 'Treats bacterial infections',
    sideEffects: ['Diarrhea', 'Nausea', 'Rash', 'Yeast infections'],
    contraindications: ['Penicillin allergy', 'Mononucleosis'],
    warnings: {
      diabetes: false,
      hypertension: false,
      pregnancy: false,
      kidneyDisease: true,
      liverDisease: false,
    },
    dosage: 'As prescribed. Typically 250-500mg every 8 hours for 7-10 days',
    activeIngredients: ['Amoxicillin Trihydrate 500mg'],
  },
];
