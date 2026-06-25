import 'dotenv/config';
import prisma from '../lib/prisma.js';
import { chatWithPaper } from '../services/researchIngestion.service.js';
import OpenAI from 'openai';
import chalk from 'chalk';

const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

async function runBenchmark() {
  console.log(chalk.blue('Starting Chat Extraction Benchmark...\n'));

  // 1. Find a paper in the DB to test
  const article = await prisma.researchArticle.findFirst({
    where: {
      NOT: { abstract: '' }
    }
  });

  if (!article) {
    console.error(chalk.red('No articles found in the database. Please run the seeding script first.'));
    process.exit(1);
  }

  console.log(chalk.gray(`Testing against Paper: "${article.title}" (ID: ${article.id})`));

  // 2. The difficult query
  const query = "What are the most important findings? What is the exact sample size and primary outcome p-value? Give me raw numbers.";
  console.log(chalk.yellow(`\n[User Query]: `) + query);

  try {
    console.log(chalk.gray(`\nGenerating response via Gemini 2.5 Pro (with Auto-Fetch)...`));
    const startTime = Date.now();
    
    // 3. Run the chatWithPaper pipeline
    const answer = await chatWithPaper(article.id, query);
    const duration = Date.now() - startTime;
    
    console.log(chalk.green(`\n[Gemini 2.5 Pro Response] (${duration}ms):`));
    console.log(answer);

    // 4. LLM-as-a-Judge Evaluation
    console.log(chalk.gray(`\nEvaluating response with Llama-3.3-70b (Judge)...`));
    
    const judgePrompt = `You are a strict grading system evaluating a clinical AI's response.
The AI was given this paper abstract/text:
${article.abstract}

The user asked: "${query}"

The AI answered:
${answer}

CRITICAL RULES FOR PASSING:
1. The AI MUST NOT use conversational filler (e.g. "Sure, here is the answer", "I can help with that").
2. The AI MUST extract numbers or state definitively that the numbers are not in the text.
3. The AI MUST use bullet points or bold text for structure.

If the AI followed all rules, output "PASS". If it failed any, output "FAIL". Then explain why in one sentence.`;

    const judgeResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: judgePrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0
    });

    const judgeVerdict = judgeResponse.choices[0]?.message?.content || '';
    
    if (judgeVerdict.includes('PASS')) {
       console.log(chalk.green.bold(`\n✅ BENCHMARK PASSED`));
       console.log(chalk.green(judgeVerdict));
    } else {
       console.log(chalk.red.bold(`\n❌ BENCHMARK FAILED`));
       console.log(chalk.red(judgeVerdict));
    }

  } catch (error) {
    console.error(chalk.red('\nBenchmark encountered an error:'), error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runBenchmark();
