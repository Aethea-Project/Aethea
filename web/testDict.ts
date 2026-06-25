import { getLabDefinition } from './src/lib/labDictionary';

// We can just define the tests we saw in the DB or fetch them from the backend endpoint
// Actually, let's just create an array of common tests to see if any are returning null.
const tests = [
  'Total Cholesterol', 'VLDL', 'LDL', 'HDL', 'Triglycerides',
  'Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol',
  'Cholesterol',
  'White Blood Cells', 'Red Blood Cells', 'Hemoglobin', 'Hematocrit',
  'Platelets', 'Neutrophils %', 'Lymphocytes %', 'Monocytes %',
  'Eosinophils %', 'Basophils %', 'MCV', 'MCH', 'MCHC', 'RDW-CV',
  'ALT', 'AST', 'Bilirubin', 'Vitamin D', 'Calcium', 'Iron', 'Ferritin',
  'Potassium', 'Magnesium', 'Uric Acid', 'TSH',
  'Serum Uric Acid', 'HDL Risk Factor', 'Risk Factor', 'Ratio',
  'Albumin', 'Globulin', 'A/G Ratio', 'Alkaline Phosphatase', 'ALP',
  'Sodium', 'Chloride', 'Total Protein', 'Free T4', 'Free T3', 'B12'
];

for (const test of tests) {
  const def = getLabDefinition(test);
  if (!def) {
    console.log(`[MISSING] ${test}`);
  } else {
    // console.log(`[FOUND] ${test} -> ${def.title}`);
  }
}
