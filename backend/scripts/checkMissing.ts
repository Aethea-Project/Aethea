import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

// We need to import the exact logic from the frontend to test it here
const LAB_DICTIONARY = {
  // Complete Blood Count (CBC)
  hemoglobin: {
    title: 'Hemoglobin (Hb)',
    definition: 'A protein in your red blood cells that carries oxygen from your lungs to the rest of your body.',
    aliases: ['hgb', 'hb', 'haemoglobin']
  },
  'white blood cells': {
    title: 'White Blood Cells (WBC)',
    aliases: ['wbc', 'leucocytic count', 'leukocyte count', 'tlc', 'total leucocytic count (edta blood)']
  },
  'red blood cells': {
    title: 'Red Blood Cells (RBC)',
    aliases: ['rbc', 'rbcs', 'rbcs count (edta blood)']
  },
  hematocrit: {
    title: 'Hematocrit (Hct)',
    aliases: ['hct', 'pcv', 'haematocrit', 'haematocrit (pcv)']
  },
  platelets: {
    title: 'Platelets (PLT)',
    aliases: ['plt', 'thrombocytes', 'platelet', 'platelet count']
  },
  neutrophils: {
    title: 'Neutrophils',
    aliases: ['neutrophil', 'neutrophils %', 'neutrophils absolute']
  },
  lymphocytes: {
    title: 'Lymphocytes',
    aliases: ['lymphocyte', 'lymphocytes %', 'lymphocytes absolute']
  },
  monocytes: {
    title: 'Monocytes',
    aliases: ['monocyte', 'monocytes %', 'monocytes absolute']
  },
  eosinophils: {
    title: 'Eosinophils',
    aliases: ['eosinophil', 'eosinophils %', 'eosinophils absolute']
  },
  basophils: {
    title: 'Basophils',
    aliases: ['basophil', 'basophils %', 'basophils absolute']
  },
  mcv: {
    title: 'MCV (Mean Corpuscular Volume)',
  },
  mch: {
    title: 'MCH (Mean Corpuscular Hemoglobin)',
  },
  mchc: {
    title: 'MCHC (Mean Corpuscular Hemoglobin Concentration)',
  },
  rdw: {
    title: 'RDW (Red Cell Distribution Width)',
    aliases: ['rdw-cv', 'rdw-sd']
  },
  hba1c: {
    title: 'HbA1c (Glycated Hemoglobin)',
    aliases: ['a1c', 'haemoglobin a1c', 'hemoglobin a1c']
  },
  glucose: {
    title: 'Glucose (Blood Sugar)',
  },
  'fasting glucose': {
    title: 'Fasting Glucose',
  },
  creatinine: {
    title: 'Creatinine',
  },
  egfr: {
    title: 'eGFR (Estimated Glomerular Filtration Rate)',
  },
  urea: {
    title: 'Urea / BUN',
    aliases: ['bun']
  },
  'total cholesterol': {
    title: 'Total Cholesterol',
    aliases: ['serum total cholesterol']
  },
  'ldl cholesterol': {
    title: 'LDL Cholesterol',
    aliases: ['ldl']
  },
  'hdl cholesterol': {
    title: 'HDL Cholesterol',
    aliases: ['hdl']
  },
  'non-hdl cholesterol': {
    title: 'Non-HDL Cholesterol',
    aliases: ['non-hdl']
  },
  'vldl cholesterol': {
    title: 'VLDL Cholesterol',
    aliases: ['vldl']
  },
  triglycerides: {
    title: 'Triglycerides',
    aliases: ['serum triglycerides']
  },
  'hdl risk factor': {
    title: 'Cholesterol Risk Factor (Ratio)',
    aliases: ['risk factor', 'ratio']
  },
  alt: {
    title: 'ALT (Alanine Aminotransferase)',
    aliases: ['sgpt']
  },
  ast: {
    title: 'AST (Aspartate Aminotransferase)',
    aliases: ['sgot']
  },
  bilirubin: {
    title: 'Bilirubin',
  },
  'vitamin d': {
    title: 'Vitamin D',
    aliases: ['vit d', '25-oh', '25 oh', '25 oh vitamin d (total)']
  },
  calcium: {
    title: 'Calcium',
    aliases: ['serum calcium', 'ionized calcium']
  },
  iron: {
    title: 'Iron',
  },
  ferritin: {
    title: 'Ferritin',
  },
  potassium: {
    title: 'Potassium',
    aliases: ['serum potassium']
  },
  magnesium: {
    title: 'Magnesium',
    aliases: ['serum magnesium']
  },
  tsh: {
    title: 'TSH (Thyroid Stimulating Hormone)',
  }
};

const ALL_MATCHABLES = [];
for (const [key, entry] of Object.entries(LAB_DICTIONARY)) {
  ALL_MATCHABLES.push({ str: key, key });
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      ALL_MATCHABLES.push({ str: alias, key });
    }
  }
}
ALL_MATCHABLES.sort((a, b) => b.str.length - a.str.length);

function getLabDefinition(testName) {
  if (!testName) return null;
  const normalized = testName.toLowerCase().trim();
  
  if (LAB_DICTIONARY[normalized]) return LAB_DICTIONARY[normalized];
  
  for (const entry of Object.values(LAB_DICTIONARY)) {
    if (entry.aliases && entry.aliases.includes(normalized)) return entry;
  }
  
  for (const matchable of ALL_MATCHABLES) {
    if (normalized.includes(matchable.str)) return LAB_DICTIONARY[matchable.key];
  }
  return null;
}

async function main() {
  const tests = await prisma.labTest.findMany({
    select: { testName: true }
  });
  
  const uniqueNames = new Set(tests.map(t => t.testName));
  const missing = [];
  
  for (const name of uniqueNames) {
    if (!getLabDefinition(name)) {
      missing.push(name);
    }
  }
  
  console.log('Missing tests:');
  console.log(missing);
}

main().finally(() => prisma.$disconnect());
