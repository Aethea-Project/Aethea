export interface LabDefinition {
  title: string;
  definition: string;
  low?: string;
  high?: string;
  aliases?: string[];
}

export const LAB_DICTIONARY: Record<string, LabDefinition> = {
  // Complete Blood Count (CBC)
  hemoglobin: {
    title: 'Hemoglobin (Hb)',
    definition: 'A protein in your red blood cells that carries oxygen from your lungs to the rest of your body.',
    low: 'Low levels usually mean anemia, which can make you feel tired or weak.',
    high: 'High levels can be caused by dehydration, smoking, or lung/heart issues.',
    aliases: ['hgb', 'hb', 'haemoglobin']
  },
  'white blood cells': {
    title: 'White Blood Cells (WBC)',
    definition: 'Your body\'s primary defense system against infections.',
    low: 'Low levels can mean your immune system is weakened.',
    high: 'High levels often indicate your body is actively fighting an infection or inflammation.',
    aliases: ['wbc', 'leucocytic count', 'leukocyte count', 'tlc']
  },
  'red blood cells': {
    title: 'Red Blood Cells (RBC)',
    definition: 'The cells that carry oxygen throughout your body.',
    low: 'Low levels suggest anemia.',
    high: 'High levels can point to dehydration or a condition causing your body to overproduce them.',
    aliases: ['rbc', 'rbcs']
  },
  hematocrit: {
    title: 'Hematocrit (Hct)',
    definition: 'The percentage of your blood that is made up of red blood cells.',
    low: 'Usually falls alongside hemoglobin when you are anemic.',
    high: 'Usually rises alongside hemoglobin when you are dehydrated.',
    aliases: ['hct', 'pcv', 'haematocrit']
  },
  platelets: {
    title: 'Platelets (PLT)',
    definition: 'Tiny cell fragments that help your blood clot to stop bleeding.',
    low: 'Low levels increase the risk of bruising and bleeding.',
    high: 'High levels can increase the risk of unwanted clots.',
    aliases: ['plt', 'thrombocytes', 'platelet']
  },
  neutrophils: {
    title: 'Neutrophils',
    definition: 'The most abundant type of white blood cell, acting as the first responders to bacterial infections.',
    low: 'Low levels make you more vulnerable to infections.',
    high: 'High levels usually point to an active bacterial infection or physical stress.',
    aliases: ['neutrophil']
  },
  lymphocytes: {
    title: 'Lymphocytes',
    definition: 'White blood cells that help fight viral infections and produce antibodies.',
    high: 'High levels typically indicate a recent or active viral infection.',
    aliases: ['lymphocyte']
  },
  monocytes: {
    title: 'Monocytes',
    definition: 'A type of white blood cell that clears up dead cells and fights chronic infections.',
    aliases: ['monocyte']
  },
  eosinophils: {
    title: 'Eosinophils',
    definition: 'White blood cells involved in fighting parasitic infections and allergic reactions.',
    high: 'High levels are commonly seen in people with allergies or asthma.',
    aliases: ['eosinophil']
  },
  basophils: {
    title: 'Basophils',
    definition: 'A rare type of white blood cell involved in inflammatory and allergic responses.',
    aliases: ['basophil']
  },
  mcv: {
    title: 'MCV (Mean Corpuscular Volume)',
    definition: 'Measures the average size of your red blood cells.',
    low: 'Usually indicates iron deficiency anemia (cells are too small).',
    high: 'Can indicate Vitamin B12 or folate deficiency (cells are too large).'
  },
  mch: {
    title: 'MCH (Mean Corpuscular Hemoglobin)',
    definition: 'The average amount of hemoglobin in each red blood cell.'
  },
  mchc: {
    title: 'MCHC (Mean Corpuscular Hemoglobin Concentration)',
    definition: 'The concentration of hemoglobin in a given volume of red blood cells.'
  },
  rdw: {
    title: 'RDW (Red Cell Distribution Width)',
    definition: 'Measures the variation in size of your red blood cells.',
    aliases: ['rdw-cv', 'rdw-sd']
  },

  // Diabetes & Blood Sugar
  hba1c: {
    title: 'HbA1c (Glycated Hemoglobin)',
    definition: 'A measure of your average blood sugar levels over the past 2 to 3 months. It is the standard test used to diagnose or monitor diabetes.',
    aliases: ['a1c', 'haemoglobin a1c', 'hemoglobin a1c']
  },
  glucose: {
    title: 'Glucose (Blood Sugar)',
    definition: 'The amount of sugar in your blood. High levels indicate how well your body is managing sugar, and are used to check for diabetes.',
  },
  'fasting glucose': {
    title: 'Fasting Glucose',
    definition: 'The amount of sugar in your blood after you haven\'t eaten for at least 8 hours.',
  },

  // Kidney Function
  creatinine: {
    title: 'Creatinine',
    definition: 'A normal waste product created by the wear and tear of your muscles. Healthy kidneys filter it out of your blood.',
    high: 'High levels can be an early warning sign that your kidneys are not filtering efficiently.'
  },
  egfr: {
    title: 'eGFR (Estimated Glomerular Filtration Rate)',
    definition: 'A calculation that tells you how well your kidneys are filtering waste from your blood.',
    low: 'A lower number means your kidneys might be struggling to filter properly.'
  },
  urea: {
    title: 'Urea / BUN',
    definition: 'A waste product from the breakdown of protein.',
    high: 'High levels can indicate that your kidneys are not filtering efficiently or you are dehydrated.',
    aliases: ['bun']
  },

  // Heart Health & Lipids
  'total cholesterol': {
    title: 'Total Cholesterol',
    definition: 'A measure of the total amount of cholesterol in your blood, including both "good" (HDL) and "bad" (LDL) cholesterol.',
    high: 'High levels can increase your risk of heart disease and stroke.',
    aliases: ['serum total cholesterol', 'cholesterol', 'cholesterol total']
  },
  'ldl cholesterol': {
    title: 'LDL Cholesterol',
    definition: 'Known as "bad" cholesterol because it can build up in the walls of your arteries. You generally want this number to be low.',
    aliases: ['ldl']
  },
  'hdl cholesterol': {
    title: 'HDL Cholesterol',
    definition: 'Known as "good" cholesterol because it helps remove bad cholesterol from your bloodstream. You generally want this number to be higher.',
    aliases: ['hdl']
  },
  'non-hdl cholesterol': {
    title: 'Non-HDL Cholesterol',
    definition: 'Your total cholesterol minus your "good" HDL cholesterol. This represents all the "bad" cholesterol types in your blood combined.',
    aliases: ['non-hdl']
  },
  'vldl cholesterol': {
    title: 'VLDL Cholesterol',
    definition: 'Very Low-Density Lipoprotein. Another type of "bad" cholesterol that mostly carries triglycerides.',
    aliases: ['vldl']
  },
  triglycerides: {
    title: 'Triglycerides',
    definition: 'A type of fat found in your blood.',
    high: 'High levels are often linked to a diet high in sugar and carbohydrates, and can increase heart disease risk.'
  },
  'hdl risk factor': {
    title: 'Cholesterol Risk Factor (Ratio)',
    definition: 'A ratio comparing your total cholesterol to your "good" HDL cholesterol. It helps predict your risk of heart disease.',
    aliases: ['risk factor', 'ratio']
  },

  // Liver Function
  alt: {
    title: 'ALT (Alanine Aminotransferase)',
    definition: 'An enzyme found mostly in the liver. When liver cells are damaged, they release ALT into the bloodstream.',
    high: 'High levels suggest liver damage from conditions like hepatitis, fatty liver, or alcohol use.',
    aliases: ['sgpt']
  },
  ast: {
    title: 'AST (Aspartate Aminotransferase)',
    definition: 'An enzyme found in the liver, heart, and other muscles. Released into the blood when these organs are damaged.',
    high: 'Often elevated alongside ALT in liver disease or after a heart attack.',
    aliases: ['sgot']
  },
  bilirubin: {
    title: 'Bilirubin',
    definition: 'A yellowish pigment made during the normal breakdown of red blood cells. The liver processes it so it can be excreted.',
    high: 'High levels cause jaundice (yellowing of skin/eyes) and indicate liver or bile duct issues.',
    aliases: ['total bilirubin']
  },
  albumin: {
    title: 'Albumin',
    definition: 'A protein made by your liver. It keeps fluid in your bloodstream and carries vitamins and hormones.',
    low: 'Low levels can indicate liver disease, kidney disease, or poor nutrition.',
    aliases: ['serum albumin']
  },
  globulin: {
    title: 'Globulin',
    definition: 'A group of proteins in your blood that help fight infection and transport nutrients.',
    aliases: ['serum globulin']
  },
  'a/g ratio': {
    title: 'A/G Ratio (Albumin to Globulin)',
    definition: 'The calculated ratio of albumin to globulins in your blood.',
    aliases: ['a g ratio', 'albumin globulin ratio', 'albumin/globulin ratio']
  },
  'alkaline phosphatase': {
    title: 'Alkaline Phosphatase (ALP)',
    definition: 'An enzyme found in the liver, bile ducts, and bone.',
    high: 'High levels can indicate liver disease, blocked bile ducts, or bone disorders.',
    aliases: ['alp']
  },
  'total protein': {
    title: 'Total Protein',
    definition: 'A measurement of the total amount of two classes of proteins found in the fluid portion of your blood: albumin and globulin.',
    aliases: ['serum total protein']
  },

  // Vitamins & Minerals
  'vitamin d': {
    title: 'Vitamin D',
    definition: 'An essential vitamin that helps your body absorb calcium to build strong bones and supports your immune system.',
    low: 'Low levels are very common and can lead to bone pain or fatigue.',
    aliases: ['vit d', '25-oh', '25 oh']
  },
  calcium: {
    title: 'Calcium',
    definition: 'A mineral vital for strong bones and teeth, as well as nerve and muscle function.',
  },
  iron: {
    title: 'Iron',
    definition: 'A mineral needed to make hemoglobin, which carries oxygen in your blood.',
    low: 'Low levels mean you have an iron deficiency, which leads to anemia.'
  },
  ferritin: {
    title: 'Ferritin',
    definition: 'A protein that stores iron inside your cells.',
    low: 'Low levels indicate your body\'s iron stores are depleted.'
  },
  potassium: {
    title: 'Potassium',
    definition: 'An essential mineral that helps your nerves function and muscles contract, particularly regulating your heartbeat.'
  },
  magnesium: {
    title: 'Magnesium',
    definition: 'A mineral crucial for muscle and nerve function, blood glucose control, and blood pressure regulation.',
    aliases: ['serum magnesium']
  },
  'uric acid': {
    title: 'Uric Acid',
    definition: 'A normal waste product created when the body breaks down chemicals called purines. High levels can lead to gout or kidney stones.',
    aliases: ['serum uric acid']
  },
  sodium: {
    title: 'Sodium',
    definition: 'An essential electrolyte that helps maintain the balance of water in and around your cells.',
    aliases: ['na', 'serum sodium']
  },
  chloride: {
    title: 'Chloride',
    definition: 'An electrolyte that works with other electrolytes to help maintain proper fluid balance and acid-base balance in the body.',
    aliases: ['cl', 'serum chloride']
  },
  b12: {
    title: 'Vitamin B12',
    definition: 'A crucial vitamin for nerve tissue health, brain function, and the production of red blood cells.',
    low: 'Low levels can cause anemia, fatigue, and nerve damage.',
    aliases: ['vitamin b12', 'cobalamin']
  },

  // Thyroid Function
  tsh: {
    title: 'TSH (Thyroid Stimulating Hormone)',
    definition: 'A hormone that controls how much thyroxine (T4) and triiodothyronine (T3) the thyroid gland makes.',
    low: 'Low levels usually indicate an overactive thyroid (hyperthyroidism).',
    high: 'High levels usually indicate an underactive thyroid (hypothyroidism).'
  },
  'free t4': {
    title: 'Free T4 (Thyroxine)',
    definition: 'The main hormone produced by the thyroid gland, traveling "free" (unattached to proteins) in the blood.',
    aliases: ['ft4']
  },
  'free t3': {
    title: 'Free T3 (Triiodothyronine)',
    definition: 'The active form of thyroid hormone in the blood.',
    aliases: ['ft3']
  }
};

// Pre-compute and sort matchables for substring matching (longest match wins)
const ALL_MATCHABLES: { str: string, key: string }[] = [];
for (const [key, entry] of Object.entries(LAB_DICTIONARY)) {
  ALL_MATCHABLES.push({ str: key, key });
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      ALL_MATCHABLES.push({ str: alias, key });
    }
  }
}
ALL_MATCHABLES.sort((a, b) => b.str.length - a.str.length);

export function getLabDefinition(testName: string): LabDefinition | null {
  if (!testName) return null;
  const normalized = testName.toLowerCase().trim();
  
  // 1. Exact Match
  if (LAB_DICTIONARY[normalized]) {
    return LAB_DICTIONARY[normalized];
  }

  // 2. Exact Match within Aliases
  for (const entry of Object.values(LAB_DICTIONARY)) {
    if (entry.aliases && entry.aliases.includes(normalized)) {
      return entry;
    }
  }

  // 3. Substring match
  for (const matchable of ALL_MATCHABLES) {
    if (normalized.includes(matchable.str)) {
      return LAB_DICTIONARY[matchable.key];
    }
  }

  return null;
}
