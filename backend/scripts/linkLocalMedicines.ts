import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../src/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const PHASE1_DIR = path.resolve(__dirname, '../medicines-data');
const PHASE2_DIR = path.resolve(__dirname, '../../Medicines for Aethea phase2');
const PUBLIC_MEDICINES_DIR = path.resolve(__dirname, '../../web/public/medicines');

// Database setup
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting medicine asset migration to static serving...');

  // Ensure target directory exists
  if (!fs.existsSync(PUBLIC_MEDICINES_DIR)) {
    fs.mkdirSync(PUBLIC_MEDICINES_DIR, { recursive: true });
    console.log(`📁 Created directory: ${PUBLIC_MEDICINES_DIR}`);
  }

  // Helper to normalize folder names
  const normalize = (name: string) => name.toLowerCase().replace(/\//g, '-').trim();

  // Helper to find folder across both source directories
  function findSourceFolder(brandNameEn: string): string | null {
    if (!brandNameEn) return null;
    const normalized = normalize(brandNameEn);

    // Try exact matches in both dirs
    const p1Exact = path.join(PHASE1_DIR, normalized);
    if (fs.existsSync(p1Exact)) return p1Exact;

    const p2Exact = path.join(PHASE2_DIR, normalized + '-done');
    if (fs.existsSync(p2Exact)) return p2Exact;

    // Try fallback prefix match
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
      const prefix = parts.slice(0, 2).join(' ');
      
      // Check Phase 1
      if (fs.existsSync(PHASE1_DIR)) {
        const p1Dirs = fs.readdirSync(PHASE1_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
        const matchP1 = p1Dirs.find(d => d.toLowerCase().startsWith(prefix));
        if (matchP1) return path.join(PHASE1_DIR, matchP1);
      }

      // Check Phase 2
      if (fs.existsSync(PHASE2_DIR)) {
        const p2Dirs = fs.readdirSync(PHASE2_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
        const matchP2 = p2Dirs.find(d => d.toLowerCase().startsWith(prefix));
        if (matchP2) return path.join(PHASE2_DIR, matchP2);
      }
    }
    return null;
  }

  const medicines = await prisma.medicine.findMany({ select: { id: true, brandNameEn: true } });
  console.log(`📦 Found ${medicines.length} medicines in database.`);

  let updatedCount = 0;
  let copiedFilesCount = 0;

  for (const med of medicines) {
    if (!med.brandNameEn) continue;

    const sourceFolder = findSourceFolder(med.brandNameEn);
    if (!sourceFolder) continue;

    try {
      const files = fs.readdirSync(sourceFolder);
      
      // Find the image and pdf
      const imgFile = files.find(f => /\.(webp|png|jpe?g)$/i.test(f));
      const pdfFile = files.find(f => /\.pdf$/i.test(f));

      const slug = normalize(med.brandNameEn).replace(/[^a-z0-9-]+/g, '-');
      const medStaticDir = path.join(PUBLIC_MEDICINES_DIR, slug);

      let photoUrl: string | null = null;
      let hasPdfFlag = false;

      // Ensure medicine static directory exists
      if ((imgFile || pdfFile) && !fs.existsSync(medStaticDir)) {
        fs.mkdirSync(medStaticDir, { recursive: true });
      }

      // Copy image
      if (imgFile) {
        const ext = path.extname(imgFile);
        const targetImgName = `image${ext}`;
        fs.copyFileSync(path.join(sourceFolder, imgFile), path.join(medStaticDir, targetImgName));
        photoUrl = `/medicines/${slug}/${targetImgName}`;
        copiedFilesCount++;
      }

      // Copy PDF
      if (pdfFile) {
        fs.copyFileSync(path.join(sourceFolder, pdfFile), path.join(medStaticDir, 'leaflet.pdf'));
        hasPdfFlag = true;
        copiedFilesCount++;
      }

      // Update Database (only if we found something)
      if (photoUrl || hasPdfFlag) {
        // Wait, 'hasPdf' doesn't exist on Medicine model right now!
        // We will only update photoUrl. If they want hasPdf, we need to add it to Prisma schema.
        // Let's check if hasPdf is in the schema first.
        // Actually, we can just save it or ignore it if it's not in DB.
        
        // Wait, the DB does not have `hasPdf`!
        // So we just update photoUrl for now.
        await prisma.medicine.update({
          where: { id: med.id },
          data: { photoUrl }
        });
        
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ Error processing ${med.brandNameEn}:`, err);
    }
  }

  console.log(`\n✅ Migration Complete!`);
  console.log(`- Copied ${copiedFilesCount} files into web/public/medicines/`);
  console.log(`- Updated ${updatedCount} medicine records in the database with static photoUrls.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
