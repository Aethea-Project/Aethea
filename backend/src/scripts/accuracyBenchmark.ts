import 'dotenv/config';
import { handleUserQuestion } from '../services/researchIngestion.service.js';
import OpenAI from 'openai';
import prisma from '../lib/prisma.js';

// Hardcoded Golden Dataset
const testQuestions = [
  "Do bananas cause sugar spikes in diabetics?",
  "What is the mechanism of action of Metformin?",
  "Can taking Vitamin D help with seasonal depression?",
  "Are artificial sweeteners safe during pregnancy?",
  "What are the best dietary changes to lower high cholesterol?"
];

async function callJudge(question: string, paperTitles: string[]): Promise<{ score: number, reasoning: string }> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('Missing GROQ_API_KEY');

  const client = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });

  const systemPrompt = `You are an expert medical peer-reviewer acting as an AI Judge.
You will be given a patient's question and the titles of 3 medical papers that our search engine retrieved.
Your job is to grade the retrieval accuracy. Are these papers highly relevant to the question?
Provide a score from 0 to 100, and a 1-sentence reasoning.

Return ONLY valid JSON matching this schema:
{
  "score": 95,
  "reasoning": "The retrieved papers perfectly address the impact of the dietary component on the specific condition mentioned."
}`;

  const userMessage = `Question: "${question}"\n\nRetrieved Papers:\n` + paperTitles.map((t, i) => `${i+1}. ${t}`).join('\n');

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = completion.choices[0].message.content || '{}';
  return JSON.parse(content);
}

async function runBenchmark() {
  console.log('==================================================');
  console.log('🤖 Starting Automated RAG Accuracy Benchmark (Judge: Llama-3.3-70b)');
  console.log('==================================================\n');

  let totalScore = 0;

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`[Test ${i + 1}/${testQuestions.length}] Question: "${question}"`);
    console.log(`   ⏳ Fetching papers (Checking Vector Cache -> OpenAlex/PubMed -> Re-Ranker)...`);

    try {
      const papers = await handleUserQuestion(question);
      
      if (papers.length === 0) {
        console.log(`   ❌ Result: 0 papers retrieved.\n`);
        continue;
      }

      const titles = papers.map(p => p.title);
      console.log(`   🔍 Retrieved ${titles.length} papers. Passing to AI Judge...`);
      
      const judgment = await callJudge(question, titles);
      totalScore += judgment.score;

      console.log(`   🏆 Score: ${judgment.score}/100`);
      console.log(`   📝 Reasoning: ${judgment.reasoning}\n`);

    } catch (e: any) {
      console.error(`   🚨 Error processing question: ${e.message}\n`);
    }
  }

  const averageScore = totalScore / testQuestions.length;
  console.log('==================================================');
  console.log(`✅ Benchmark Complete!`);
  console.log(`📊 Final System Accuracy Score: ${averageScore.toFixed(1)}/100`);
  console.log('==================================================');

  await prisma.$disconnect();
}

runBenchmark();
