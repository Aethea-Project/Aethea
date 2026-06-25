import 'dotenv/config';
import { handleUserQuestion } from '../services/researchIngestion.service.js';

const commonMedicalQuestions = [
  "What are the most effective treatments for type 2 diabetes?",
  "How does hypertension affect cardiovascular health?",
  "What is the role of the Mediterranean diet in preventing heart disease?",
  "Are there effective non-pharmacological treatments for chronic insomnia?",
  "What are the latest advancements in asthma management?",
  "Can intermittent fasting improve metabolic syndrome?",
  "What are the side effects of long-term use of proton pump inhibitors (PPIs)?",
  "How effective is cognitive behavioral therapy (CBT) for generalized anxiety disorder?",
  "What are the dietary recommendations for managing polycystic ovary syndrome (PCOS)?",
  "Is there a link between gut microbiome and autoimmune diseases?"
];

async function runPreloader() {
  console.log('==================================================');
  console.log('🚀 Starting Preloader for Medical Papers');
  console.log('==================================================\n');

  for (let i = 0; i < commonMedicalQuestions.length; i++) {
    const question = commonMedicalQuestions[i];
    console.log(`[Preload ${i + 1}/${commonMedicalQuestions.length}] Processing: "${question}"`);
    
    try {
      const papers = await handleUserQuestion(question);
      console.log(`   ✅ Successfully processed and cached ${papers.length} papers.\n`);
    } catch (e: any) {
      console.error(`   ❌ Failed to process question: ${e.message}\n`);
    }
    
    // Add a small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('==================================================');
  console.log('🎉 Preloading Complete! Vector cache is now hot.');
  console.log('==================================================');
  process.exit(0);
}

runPreloader();
