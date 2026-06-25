/**
 * seed_medicines.ts — Egyptian Medicine CSV Import
 *
 * Imports 175 real Egyptian medicines from sample(Sheet1).csv,
 * enriches with DrugBank linking and OpenFDA OTC/RX classification,
 * then upserts into public.medicines.
 *
 * Usage:  npx tsx backend/prisma/seed_medicines.ts
 */
import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import pg from 'pg';

/* ─── DB Connection ─── */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required to run seed');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const OPENFDA_API_KEY = process.env.OPENFDA_API_KEY ?? '';

/* ─── CSV Parsing ─── */
function parseCSV(filePath: string): string[][] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));
  // Skip header (line 0), skip empty trailing lines
  return lines
    .slice(1)
    .filter(line => line.trim().length > 0)
    .map(line => {
      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());
      return cols;
    });
}

/* ─── Category → drugClasses mapping ─── */
function parseDrugClasses(category: string): string[] {
  if (!category) return [];
  // Split on dots to create hierarchical classes
  // e.g. "antihypertensive.arbs" → ["antihypertensive", "arbs"]
  return category
    .split('.')
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

/* ─── OpenFDA OTC/RX Lookup ─── */
const FDA_CACHE = new Map<string, { isOtc: boolean; source: string }>();

// Category-based fallback for ingredients not found in FDA
const RX_CATEGORY_PATTERNS = [
  /psychiatric/i,
  /antipsychotic/i,
  /antidepressant/i,
  /anti-epileptic/i,
  /antihypertensive/i,
  /anticoagulant/i,
  /antineoplastic/i,
  /immunosuppressive/i,
  /anti-diabetic/i,
  /narcotic/i,
  /antibiotic/i,
  /antiarrhythm/i,
  /anti-estrogen/i,
  /dopamine receptor/i,
  /attention-deficit/i,
  /aldosterone/i,
];

const OTC_CATEGORY_PATTERNS = [
  /vitamin/i,
  /multivitamin/i,
  /dietary supplement/i,
  /cold drugs/i,
  /hair care/i,
  /massage/i,
  /immunty booster/i,  // sic (CSV typo)
  /immunity booster/i,
];

function categoryHeuristic(category: string): boolean {
  // Returns true if OTC, false if RX
  for (const pattern of OTC_CATEGORY_PATTERNS) {
    if (pattern.test(category)) return true;
  }
  for (const pattern of RX_CATEGORY_PATTERNS) {
    if (pattern.test(category)) return false;
  }
  // Default to OTC for unknown categories (analgesics, antifungals, etc.)
  return true;
}

function mapFriendlyCategory(category: string): string {
  const cat = category.toLowerCase();
  
  if (/antihypertensive|antiarrhythmias|anti-ischemic|calcium channel blocker|beta blocker|antihyperlipidemic|antianginal/i.test(cat)) {
    return 'Heart & Chronic Conditions';
  }
  if (/vitamin|multivitamin|dietary supplement|immunity booster|immunty booster/i.test(cat)) {
    return 'Vitamins & Supplements';
  }
  if (/analgesic|nsaid|cold drugs|local anaesthetic/i.test(cat)) {
    return 'Pain & Fever Relief';
  }
  if (/psychiatric|anti-epileptic|attention-deficit|cerebral circulatory/i.test(cat)) {
    return 'Mental Health & Brain';
  }
  if (/anti-diabetic|antidiabetic/i.test(cat)) {
    return 'Diabetes Care';
  }
  if (/peptic ulcer|antiemetic|haemorrhoids/i.test(cat)) {
    return 'Digestive Health';
  }
  if (/antihistamine|bronchodilator/i.test(cat)) {
    return 'Allergy, Asthma & Flu';
  }
  if (/antibiotic|antifungal|immunosuppressive|massage cream|hair care|hirsutism/i.test(cat)) {
    return 'Infections & Skin Care';
  }
  
  // Fallback for remaining items
  return 'General & Specialty Medicine';
}

async function lookupFDA(
  ingredient: string,
  category: string
): Promise<{ isOtc: boolean; source: string }> {
  // Normalize: take first ingredient if combination drug
  const primaryIngredient = ingredient.split('+')[0].trim();

  if (FDA_CACHE.has(primaryIngredient)) {
    return FDA_CACHE.get(primaryIngredient)!;
  }

  try {
    const url =
      `https://api.fda.gov/drug/label.json` +
      `?api_key=${OPENFDA_API_KEY}` +
      `&search=openfda.generic_name:"${encodeURIComponent(primaryIngredient)}"&limit=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: any = await res.json();
    const productType = data?.results?.[0]?.openfda?.product_type?.[0] ?? '';

    const isOtc = productType === 'HUMAN OTC DRUG';
    const result = { isOtc, source: `fda:${productType}` };
    FDA_CACHE.set(primaryIngredient, result);
    return result;
  } catch {
    // FDA not found → use category heuristic
    const isOtc = categoryHeuristic(category);
    const result = { isOtc, source: `heuristic:${category}` };
    FDA_CACHE.set(primaryIngredient, result);
    return result;
  }
}

/* ─── DrugBank Linking ─── */
async function findDrugbankMatch(
  ingredient: string
): Promise<{ drugbankId: string; categories: string[] } | null> {
  const primaryIngredient = ingredient.split('+')[0].trim();

  try {
    const match = await prisma.drugbankDrug.findFirst({
      where: {
        name: { contains: primaryIngredient, mode: 'insensitive' },
      },
    });

    if (!match) return null;

    const categories = Array.isArray(match.categories)
      ? (match.categories as string[])
      : [];

    return { drugbankId: match.drugbankId, categories };
  } catch {
    return null;
  }
}

/* ─── Main ─── */
async function main() {
  console.log('🗑️  Wiping existing medicines (fresh start)…');
  await prisma.medicine.deleteMany({});
  console.log('   Done. All existing medicine rows deleted.\n');

  const csvPath = resolve(process.cwd(), '../sample(Sheet1).csv');
  console.log(`📄 Reading CSV: ${csvPath}`);
  const rows = parseCSV(csvPath);
  console.log(`   Found ${rows.length} data rows.\n`);

  // Collect unique ingredients for batch FDA lookup
  const uniqueIngredients = new Set<string>();
  const medicines: Array<{
    brandNameEn: string;
    brandNameAr: string;
    priceOld: number | null;
    priceNew: number | null;
    activeIngredient: string;
    manufacturer: string | null;
    category: string;
    drugClasses: string[];
    packSize: number | null;
    packUnit: string | null;
    strength: string | null;
    form: string;
    origin: string;
  }> = [];

  for (const cols of rows) {
    if (cols.length < 14) {
      console.warn(`   ⚠ Skipping short row: ${cols[1] || 'unknown'}`);
      continue;
    }

    const [
      _id,          // 0: CSV id (ignored)
      brandNameEn,  // 1
      brandNameAr,  // 2
      priceOldStr,  // 3
      priceNewStr,  // 4
      ingredient,   // 5
      manufacturer, // 6
      category,     // 7
      _stripsPerPack, // 8: units per major pack
      packSizeStr,  // 9: units per strip
      packUnit,     // 10: volume/weight
      strength,     // 11
      form,         // 12
      origin,       // 13
      _dateUpdated, // 14: date (ignored)
    ] = cols;

    if (!brandNameEn && !brandNameAr) continue;

    const priceOld = priceOldStr ? parseFloat(priceOldStr) : null;
    const priceNew = priceNewStr ? parseFloat(priceNewStr) : null;
    const packSize = packSizeStr ? parseInt(packSizeStr, 10) : null;
    const drugClasses = parseDrugClasses(category);

    uniqueIngredients.add(ingredient);

    medicines.push({
      brandNameEn: brandNameEn || '',
      brandNameAr: brandNameAr || '',
      priceOld: priceOld && !isNaN(priceOld) ? priceOld : null,
      priceNew: priceNew && !isNaN(priceNew) ? priceNew : null,
      activeIngredient: ingredient,
      manufacturer: manufacturer || null,
      category: mapFriendlyCategory(category || 'uncategorized'),
      drugClasses,
      packSize: packSize && !isNaN(packSize) ? packSize : null,
      packUnit: packUnit || null,
      strength: strength || null,
      form: form || 'unknown',
      origin: origin || 'local',
    });
  }

  // ── FDA OTC/RX Lookup (batch with rate limiting) ──
  console.log(`🏥 Looking up OTC/RX status from OpenFDA for ${uniqueIngredients.size} unique ingredients…`);
  let fdaFound = 0;
  let fdaNotFound = 0;

  for (const ingredient of uniqueIngredients) {
    const result = await lookupFDA(ingredient, '');
    if (result.source.startsWith('fda:')) fdaFound++;
    else fdaNotFound++;
    // Rate limit: 40 requests per minute for authenticated users
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`   FDA: ${fdaFound} found, ${fdaNotFound} fallback to heuristic.\n`);

  // ── DrugBank Linking ──
  console.log(`💊 Linking to DrugBank for ${uniqueIngredients.size} unique ingredients…`);
  const drugbankMap = new Map<string, { drugbankId: string; categories: string[] }>();
  let dbLinked = 0;

  for (const ingredient of uniqueIngredients) {
    const match = await findDrugbankMatch(ingredient);
    if (match) {
      drugbankMap.set(ingredient, match);
      dbLinked++;
    }
  }
  console.log(`   DrugBank: ${dbLinked} linked, ${uniqueIngredients.size - dbLinked} not found.\n`);

  // ── Upsert medicines ──
  console.log(`📥 Upserting ${medicines.length} medicines…`);
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const med of medicines) {
    try {
      // Get FDA OTC/RX status (from cache)
      const fdaResult = await lookupFDA(med.activeIngredient, med.category);
      const isOtc = fdaResult.isOtc;

      // Get DrugBank data
      const dbMatch = drugbankMap.get(med.activeIngredient);
      const drugbankId = dbMatch?.drugbankId ?? null;
      const mergedClasses = [...new Set([
        ...med.drugClasses,
        ...(dbMatch?.categories ?? []),
      ])];

      const data = {
        brandNameAr: med.brandNameAr,
        brandNameEn: med.brandNameEn,
        activeIngredient: med.activeIngredient,
        drugbankId,
        drugClasses: mergedClasses,
        category: med.category,
        form: med.form,
        manufacturer: med.manufacturer,
        isOtc,
        priceOld: med.priceOld !== null ? new Prisma.Decimal(med.priceOld) : null,
        priceNew: med.priceNew !== null ? new Prisma.Decimal(med.priceNew) : null,
        strength: med.strength,
        packSize: med.packSize,
        packUnit: med.packUnit,
        origin: med.origin,
      };

      // Use brandNameEn as the unique key for upsert
      // Since brandNameEn isn't @unique, we search first
      const existing = await prisma.medicine.findFirst({
        where: { brandNameEn: med.brandNameEn },
      });

      if (existing) {
        await prisma.medicine.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.medicine.create({ data });
        created++;
      }
    } catch (err) {
      errors++;
      console.error(`   ❌ Error upserting "${med.brandNameEn}":`, err);
    }
  }

  console.log(`\n✅ Seed completed!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors:  ${errors}`);
  console.log(`   Total:   ${medicines.length}`);

  // ── Verify ──
  const count = await prisma.medicine.count();
  const withDrugbank = await prisma.medicine.count({ where: { drugbankId: { not: null } } });
  const otcCount = await prisma.medicine.count({ where: { isOtc: true } });
  const rxCount = await prisma.medicine.count({ where: { isOtc: false } });

  console.log(`\n📊 Database summary:`);
  console.log(`   Total medicines:    ${count}`);
  console.log(`   DrugBank linked:    ${withDrugbank}`);
  console.log(`   OTC medicines:      ${otcCount}`);
  console.log(`   RX medicines:       ${rxCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
