import 'dotenv/config';
import { handleUserQuestion } from './src/services/researchIngestion.service.js';

async function test() {
  try {
    console.log('Testing handleUserQuestion...');
    const result = await handleUserQuestion('cucumber stomach benefits');
    console.log('SUCCESS:', result);
  } catch (err: any) {
    console.error('FAILED:', err);
  }
}

test();
