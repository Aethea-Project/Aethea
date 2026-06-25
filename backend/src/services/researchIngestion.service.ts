import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import logger from '../lib/logger.js';
import prisma from '../lib/prisma.js';

export const VALID_CATEGORIES = [
  'vegetables', 'fruits', 'grains_legumes', 'sugar_sweets', 'meat_poultry',
  'fish_seafood', 'dairy', 'fats_oils', 'beverages', 'supplements',
  'weight_loss_diets', 'diabetes_nutrition', 'heart_health', 'kidney_health',
  'general_nutrition'
];



// ----------------------------------------------------------------------------
// DUAL-PROVIDER AI CLIENT (Llama-3.3-70b via Groq Primary -> OpenRouter Fallback)
// ----------------------------------------------------------------------------

async function callOpenSourceAI(systemPrompt: string, userMessage: string, requiresJson: boolean = false): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey || !openRouterKey) {
    throw new Error('Missing GROQ_API_KEY or OPENROUTER_API_KEY in .env');
  }

  const groqClient = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
  const openRouterClient = new OpenAI({ apiKey: openRouterKey, baseURL: 'https://openrouter.ai/api/v1' });

  try {
    logger.info('[Groq] Attempting to generate response (Primary Engine: Llama-3.3-70b)...');
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: requiresJson ? { type: "json_object" } : { type: "text" },
      temperature: 0.1,
    });
    return completion.choices[0].message.content || '';
  } catch (groqError: any) {
    logger.warn(`[Groq] Failed: ${groqError.message}. Falling back to OpenRouter...`);
    
    try {
      logger.info('[OpenRouter] Attempting to generate response (Fallback Engine: qwen-2.5-72b)...');
      const completion = await openRouterClient.chat.completions.create({
        model: 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: systemPrompt + (requiresJson ? '\nIMPORTANT: You must return ONLY valid JSON.' : '') },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
      });
      return completion.choices[0].message.content || '';
    } catch (openRouterError: any) {
      logger.error(`[OpenRouter] Fallback failed: ${openRouterError.message}`);
      throw new Error('Both Groq and OpenRouter failed to process the request.');
    }
  }
}

// ----------------------------------------------------------------------------
// AGENT 1: SEARCH FORMULATOR
// ----------------------------------------------------------------------------

export async function formulateSearchQuery(userQuestion: string): Promise<string> {
  const systemPrompt = `You are an expert medical librarian. Convert the user's natural language question into highly specific, modern medical keywords for a literature search. 
CRITICAL RULES:
1. If the user's query is complete gibberish (e.g., "aodojpe3jop3j") or clearly NOT related to health, biology, or medicine, you MUST return exactly the string: "REJECTED_INVALID_QUERY"
2. If the query contains misspelled words or poor grammar, silently fix the spelling and use the correct medical terms.
3. Otherwise, return ONLY the search string (no quotes, no explanation). Example user: "Do cucumbers actually help the stomach?" -> Example output: cucumber gastrointestinal disease dyspepsia`;
  
  const query = await callOpenSourceAI(systemPrompt, userQuestion);
  return query.trim().replace(/['"]/g, '');
}

// ----------------------------------------------------------------------------
// NATIVE API CATEGORIZATION (Replaces slow Agent 2)
// ----------------------------------------------------------------------------

export function mapKeywordsToCategory(keywords: string[]): string {
  const text = keywords.join(' ').toLowerCase();
  
  if (text.includes('veg') || text.includes('plant')) return 'vegetables';
  if (text.includes('fruit') || text.includes('berry') || text.includes('citrus')) return 'fruits';
  if (text.includes('grain') || text.includes('legume') || text.includes('bean') || text.includes('wheat') || text.includes('rice')) return 'grains_legumes';
  if (text.includes('sugar') || text.includes('sweet') || text.includes('fructose') || text.includes('sucrose')) return 'sugar_sweets';
  if (text.includes('meat') || text.includes('beef') || text.includes('pork') || text.includes('poultry') || text.includes('chicken')) return 'meat_poultry';
  if (text.includes('fish') || text.includes('seafood') || text.includes('omega-3') || text.includes('salmon')) return 'fish_seafood';
  if (text.includes('dairy') || text.includes('milk') || text.includes('cheese') || text.includes('yogurt') || text.includes('calcium')) return 'dairy';
  if (text.includes('fat') || text.includes('oil') || text.includes('lipid') || text.includes('cholesterol') || text.includes('butter')) return 'fats_oils';
  if (text.includes('beverage') || text.includes('drink') || text.includes('alcohol') || text.includes('coffee') || text.includes('tea')) return 'beverages';
  if (text.includes('supplement') || text.includes('vitamin') || text.includes('mineral') || text.includes('extract')) return 'supplements';
  if (text.includes('weight') || text.includes('obes') || text.includes('diet') || text.includes('calorie')) return 'weight_loss_diets';
  if (text.includes('diabet') || text.includes('insulin') || text.includes('glucose') || text.includes('glycemic')) return 'diabetes_nutrition';
  if (text.includes('heart') || text.includes('cardio') || text.includes('blood pressure') || text.includes('hypertension')) return 'heart_health';
  if (text.includes('kidney') || text.includes('renal') || text.includes('nephro')) return 'kidney_health';
  
  return 'general_nutrition';
}

export function extractPlainSummary(abstract: string): string {
  const match = abstract.match(/(?:CONCLUSIONS?|Conclusions?|SUMMARY|Summary)[^\w]*(.*?)$/i);
  if (match && match[1].length > 20) {
    return match[1].trim().substring(0, 300) + (match[1].length > 300 ? '...' : '');
  }
  const sentences = abstract.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 2).join(' ').substring(0, 300) + (sentences.length > 2 ? '...' : '');
}

// ----------------------------------------------------------------------------
// FULL TEXT AUTO-FETCH PIPELINE
// ----------------------------------------------------------------------------

async function fetchPubMedFullTextXML(pmid: string): Promise<string | null> {
  try {
    // Step 1: Convert PMID to PMCID (PMC requires PMCID, not PMID)
    logger.info(`Converting PMID ${pmid} to PMCID...`);
    const convertUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${pmid}&format=json`;
    const convertRes = await fetch(convertUrl);
    if (!convertRes.ok) return null;
    const convertData: any = await convertRes.json();
    const pmcid = convertData.records?.[0]?.pmcid;
    if (!pmcid) {
      logger.info(`No PMCID found for PMID ${pmid}. Paper may not be in PMC.`);
      return null;
    }
    logger.info(`Converted PMID ${pmid} -> ${pmcid}. Fetching full text...`);

    // Step 2: Fetch full text XML from PMC using the correct PMCID
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcid}&retmode=xml&rettype=full`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    // Verify it contains actual article content, not just an error wrapped in pmc-articleset
    if (xml.includes('<body') || xml.includes('<sec')) {
      logger.info(`Successfully fetched full text XML from PMC for ${pmcid}`);
      return xml;
    }
    logger.info(`PMC returned XML but no article body for ${pmcid}. Skipping.`);
    return null;
  } catch (e) {
    logger.error({ error: e }, 'Failed to fetch from PubMed EFetch');
    return null;
  }
}

async function fetchOpenAlexFullTextPDF(openAlexId: string): Promise<string | null> {
  try {
    logger.info(`Attempting to fetch OpenAccess PDF from OpenAlex for ID: ${openAlexId}`);
    // OpenAlex IDs typically look like W1234567890. If the DB stores the full URL, extract the ID.
    const id = openAlexId.replace('https://openalex.org/', '');
    const url = `https://api.openalex.org/works/${id}`;
    const res = await fetch(url);
    const data: any = await res.json();
    
    if (data.open_access?.is_oa && data.open_access.oa_url) {
      logger.info(`Found OA URL: ${data.open_access.oa_url}. Downloading PDF...`);
      const pdfRes = await fetch(data.open_access.oa_url);
      if (!pdfRes.ok || !pdfRes.headers.get('content-type')?.includes('pdf')) {
         return null;
      }
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const { parseDocumentWithLlama } = await import('./llamaParseService.js');
      logger.info(`Parsing PDF with LlamaParse for ID: ${id}`);
      const markdown = await parseDocumentWithLlama(buffer, `${id}.pdf`);
      return markdown;
    }
    return null;
  } catch (e) {
    logger.error({ error: e }, 'Failed to fetch/parse OpenAlex PDF');
    return null;
  }
}

async function getFullText(article: any): Promise<string> {
  // 1. Try PubMed XML (Instant, no parsing required)
  if (article.pmid) {
    const xml = await fetchPubMedFullTextXML(article.pmid);
    if (xml && xml.length > 500) {
       return `[SOURCE: FULL TEXT XML]\n\n${xml}`;
    }
  }
  
  // 2. Try OpenAlex PDF (Requires LlamaParse)
  if (article.openAlexId) {
    const md = await fetchOpenAlexFullTextPDF(article.openAlexId);
    if (md && md.length > 500) {
       return `[SOURCE: FULL TEXT MARKDOWN]\n\n${md}`;
    }
  }
  
  // 3. Fallback to Abstract
  return `[SOURCE: ABSTRACT ONLY (Paywalled or No Full Text Available)]\n\n${article.abstract}`;
}

// ----------------------------------------------------------------------------
// GEMINI API KEY ROTATION & FALLBACK
// ----------------------------------------------------------------------------

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_RESEARCH,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
].filter(Boolean) as string[];

async function runWithGeminiKeyRotation(apiCall: (key: string) => Promise<any>): Promise<any> {
  let lastError = null;
  for (const key of GEMINI_KEYS) {
    try {
      return await apiCall(key);
    } catch (e: any) {
      if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota')) {
         logger.warn('Gemini key hit quota (429). Rotating to next key...');
         lastError = e;
         continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('All Gemini keys failed');
}

// ----------------------------------------------------------------------------
// GEMINI CHAT
// ----------------------------------------------------------------------------

export async function chatWithPaper(documentId: string, userMessage: string, history: { role: string, content: string }[] = []) {
  if (GEMINI_KEYS.length === 0) throw new Error('GEMINI_API_KEY_RESEARCH is missing');

  const article = await prisma.researchArticle.findUnique({ where: { id: documentId } });
  if (!article) throw new Error('Document not found');

  const fullTextContent = await getFullText(article);
  
  // The Smart Prompt (Competitive Edge)
  const systemInstruction = `You are an elite clinical research assistant interrogating a scientific paper for a medical professional or patient.
Your task is to answer the user's queries based ONLY on the paper provided below.

CRITICAL RULES:
1. ZERO FILLER: Never use conversational filler (e.g., "Sure, I can help", "Here is the summary"). Jump straight to the facts.
2. DATA DENSITY: Always extract exact numbers, sample sizes (N=...), percentages, and p-values when discussing results or efficacy.
3. SKEPTICISM: Actively scan for and highlight methodology flaws, small sample sizes, or conflicts of interest if asked about validity.
4. STRUCTURE: Use bolding, bullet points, and markdown tables to organize complex data (e.g., comparing drug arms).
5. LIMITATIONS: If the paper text below says "[SOURCE: ABSTRACT ONLY]", remind the user that your knowledge is limited to the abstract.
6. ABSOLUTE PRECISION: You must NEVER hallucinate, round, or alter any numbers. You must extract findings exactly as formulated in the text to prevent altering the scientific meaning or clinical outcomes.

Paper Title: ${article.title}
Paper Content:
${fullTextContent}`;

  // Map history to Gemini's expected format
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const contents = [
    ...formattedHistory,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const response = await runWithGeminiKeyRotation(async (key) => {
    const ai = new GoogleGenAI({ apiKey: key });
    return ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1
      }
    });
  });

  return response.text;
}

// ----------------------------------------------------------------------------
// VECTOR SEARCH & EMBEDDINGS (pgvector)
// ----------------------------------------------------------------------------

export async function generateEmbedding(text: string): Promise<number[]> {
  if (GEMINI_KEYS.length === 0) throw new Error('GEMINI_API_KEY_RESEARCH is missing');
  
  const response = await runWithGeminiKeyRotation(async (key) => {
    const ai = new GoogleGenAI({ apiKey: key });
    return ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    });
  });
  
  if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
    throw new Error('Gemini API returned empty embeddings');
  }
  return response.embeddings[0].values;
}

export async function semanticSearch(userQuestion: string) {
  try {
    const embedding = await generateEmbedding(userQuestion);
    const embeddingString = `[${embedding.join(',')}]`;
    const results: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, title, abstract, journal, "openAlexId", pmid, url, category, "publishedAt", 
      1 - (embedding <=> '${embeddingString}'::vector) as similarity 
      FROM research_articles 
      WHERE 1 - (embedding <=> '${embeddingString}'::vector) > 0.82 
      ORDER BY similarity DESC 
      LIMIT 3
    `);
    return results;
  } catch (e: any) {
    logger.error({ err: e }, 'Semantic search failed');
    return [];
  }
}

// ----------------------------------------------------------------------------
// DATA FETCHING & DB INGESTION
// ----------------------------------------------------------------------------

export async function fetchFromPubMed(query: string, maxResults = 5) {
  try {
    const apiKey = process.env.PUBMED_API_KEY || '';
    const apiParam = apiKey && apiKey !== 'YOUR_PUBMED_API_KEY_HERE' ? `&api_key=${apiKey}` : '';
    
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query + ' AND free full text[sb]')}&retmode=json&retmax=${maxResults}${apiParam}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    
    const searchData = await searchRes.json() as any;
    const pmids = searchData.esearchresult?.idlist || [];
    if (pmids.length === 0) return [];
    
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml${apiParam}`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) return [];
    const xml = await fetchRes.text();
    
    const articles: any[] = [];
    const articleBlocks = xml.split('<PubmedArticle>');
    articleBlocks.shift(); 
    
    for (const block of articleBlocks) {
      const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch ? pmidMatch[1] : null;
      if (!pmid) continue;
      
      const titleMatch = block.match(/<ArticleTitle[^>]*>(.*?)<\/ArticleTitle>/);
      const title = titleMatch ? titleMatch[1] : 'Unknown Title';
      
      const abstractMatch = block.match(/<AbstractText[^>]*>(.*?)<\/AbstractText>/g);
      let abstract = '';
      if (abstractMatch) {
        abstract = abstractMatch.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      }
      if (!abstract || abstract.length < 50) continue;
      
      const journalMatch = block.match(/<Title>(.*?)<\/Title>/);
      const journal = journalMatch ? journalMatch[1] : 'Unknown Journal';
      
      const yearMatch = block.match(/<PubDate>.*?<Year>(\d{4})<\/Year>.*?<\/PubDate>/s);
      const publishedAt = yearMatch ? new Date(`${yearMatch[1]}-01-01`) : new Date();
      
      const meshMatch = block.match(/<DescriptorName[^>]*>(.*?)<\/DescriptorName>/g);
      const keywords = [];
      if (meshMatch) {
         keywords.push(...meshMatch.map(m => m.replace(/<[^>]+>/g, '')));
      }
      
      articles.push({
        title, abstract, doi: null, openAlexId: null, pmid, journal, publishedAt,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        authors: [], // Simplified for PubMed
        keywords
      });
    }
    return articles;
  } catch (e: any) {
    logger.error('PubMed fetch failed', e);
    return [];
  }
}

export async function fetchFromOpenAlex(query: string, maxResults = 5) {
  try {
    // Rely on OpenAlex's native relevance scoring by omitting sort. Filter for modern papers (2015+).
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=type:article,has_abstract:true,is_oa:true,from_publication_date:2015-01-01&per-page=${maxResults}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const papers = [];

    for (const work of data.results) {
      let abstract = '';
      if (work.abstract_inverted_index) {
        const words: string[] = [];
        for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
          for (const pos of (positions as number[])) { words[pos] = word; }
        }
        abstract = words.join(' ');
      }

      if (!abstract || abstract.length < 50) continue;

      const keywords = work.concepts?.map((c: any) => c.display_name) || [];
      if (work.topics) {
          keywords.push(...work.topics.map((t: any) => t.display_name));
      }

      papers.push({
        title: work.title, abstract, doi: work.doi, openAlexId: work.id, pmid: null,
        journal: work.primary_location?.source?.display_name || 'Unknown Journal',
        publishedAt: new Date(work.publication_date),
        url: work.primary_location?.landing_page_url || work.id,
        authors: work.authorships?.map((a: any) => a.author.display_name) || [],
        keywords
      });
    }
    return papers;
  } catch (e: any) {
    logger.error('OpenAlex fetch failed', e);
    return [];
  }
}

export async function processAndSavePapers(query: string, papers: any[]): Promise<any[]> {
  const savedArticles = [];

  for (const paper of papers) {
    let existing = null;
    if (paper.openAlexId) {
      existing = await prisma.researchArticle.findUnique({ where: { openAlexId: paper.openAlexId } });
    }
    if (!existing && paper.pmid) {
      existing = await prisma.researchArticle.findUnique({ where: { pmid: paper.pmid } });
    }

    if (existing) {
      savedArticles.push(existing);
      // Backfill embedding if it's missing (e.g., old papers before pgvector)
      try {
        const embedding = await generateEmbedding(`Title: ${existing.title}\nAbstract: ${existing.abstract}`);
        const embeddingString = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(`UPDATE research_articles SET embedding = '${embeddingString}'::vector WHERE id = '${existing.id}' AND embedding IS NULL`);
      } catch {
        // Ignore errors for existing papers
      }
      continue;
    }

    try {
      const category = mapKeywordsToCategory(paper.keywords || []);
      const plainSummary = extractPlainSummary(paper.abstract);
      
      const newArticle = await prisma.researchArticle.create({
        data: {
          title: paper.title,
          abstract: paper.abstract,
          journal: paper.journal,
          authors: paper.authors,
          doi: paper.doi,
          openAlexId: paper.openAlexId,
          pmid: paper.pmid,
          url: paper.url,
          publishedAt: paper.publishedAt,
          category: category,
          verdict: "info", // Deprecated field
          claim: "N/A", // Deprecated field
          plainSummary: plainSummary
        }
      });
      savedArticles.push(newArticle);
      logger.info(`Successfully saved: ${paper.title} under category ${category}`);
      
      // Vector Embedding
      try {
        const embedding = await generateEmbedding(`Title: ${paper.title}\nAbstract: ${paper.abstract}`);
        const embeddingString = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(`UPDATE research_articles SET embedding = '${embeddingString}'::vector WHERE id = '${newArticle.id}'`);
      } catch (embErr: any) {
        logger.warn(`Failed to generate/save embedding for ${paper.title}: ${embErr.message}`);
      }
    } catch (err: any) {
      logger.error(`Failed to process paper ${paper.title}: ${err.message}`);
    }
  }

  return savedArticles;
}

// ----------------------------------------------------------------------------
// AGENT 3: RE-RANKER
// ----------------------------------------------------------------------------

export async function rankPapers(userQuestion: string, papers: any[]): Promise<any[]> {
  if (papers.length === 0) return [];
  const systemPrompt = `You are an expert medical peer-reviewer. You will receive a user question and a list of paper abstracts.
Your job is to read all abstracts and score each one from 1 to 10 on how perfectly it answers the exact user question.
Return ONLY valid JSON matching this schema:
{
  "rankings": [
    { "index": 0, "score": 8, "reason": "Directly addresses the question." }
  ]
}`;
  
  const papersText = papers.map((p, i) => `[Index ${i}] Title: ${p.title}\nAbstract: ${p.abstract}`).join('\n\n');
  const userMessage = `User Question: "${userQuestion}"\n\n${papersText}`;
  
  try {
    const response = await callOpenSourceAI(systemPrompt, userMessage, true);
    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    
    // Sort and filter papers
    const scored = papers.map((p, i) => {
      const rank = data.rankings.find((r: any) => r.index === i);
      return { paper: p, score: rank ? rank.score : 0 };
    });
    
    // Keep only high quality papers (>= 7), limit to top 3
    const highScoring = scored.filter(s => s.score >= 7).sort((a, b) => b.score - a.score).map(s => s.paper);
    return highScoring.slice(0, 3);
  } catch (e: any) {
    logger.error('Failed to rank papers', e);
    // Fallback: return top 3
    return papers.slice(0, 3);
  }
}

export async function handleUserQuestion(userQuestion: string) {
  // 1. Try Vector Cache first
  const cachedPapers = await semanticSearch(userQuestion);
  if (cachedPapers.length >= 2) {
    logger.info(`Vector Cache Hit! Found ${cachedPapers.length} highly relevant papers instantly.`);
    return cachedPapers;
  }

  // 2. CRAG Loop (Self-Healing) - Max 3 Retries
  let attempt = 0;
  let previousQuery = '';
  
  while (attempt < 3) {
    let searchQuery = '';
    if (attempt === 0) {
      searchQuery = await formulateSearchQuery(userQuestion);
      if (searchQuery === 'REJECTED_INVALID_QUERY') {
        throw new Error('INVALID_QUERY: I couldn\'t understand that medical question, or it doesn\'t seem related to health. Could you please rephrase it?');
      }
      logger.info(`Agent 1 formulated search: "${searchQuery}" from "${userQuestion}"`);
    } else {
      const healingPrompt = `You are a medical librarian. The previous search query "${previousQuery}" failed to find highly relevant papers for the user's question: "${userQuestion}".\nFormulate a COMPLETELY DIFFERENT search query using alternative medical synonyms. Return ONLY the search string, no quotes.`;
      searchQuery = (await callOpenSourceAI(healingPrompt, userQuestion)).trim().replace(/['"]/g, '');
      logger.info(`[Self-Healing] Attempt ${attempt + 1}: Rewrote query to "${searchQuery}"`);
    }
    previousQuery = searchQuery;

    const [openAlexPapers, pubMedPapers] = await Promise.all([
      fetchFromOpenAlex(searchQuery, 10),
      fetchFromPubMed(searchQuery, 5)
    ]);
    
    const combined = [...openAlexPapers, ...pubMedPapers];
    if (combined.length === 0) {
      attempt++;
      continue;
    }
    
    logger.info(`Fetched ${combined.length} raw papers. Sending to Agent 3 for LLM Re-Ranking...`);
    const topPapers = await rankPapers(userQuestion, combined);
    
    if (topPapers.length > 0) {
      logger.info(`Re-Ranking complete. Top ${topPapers.length} papers selected for the database.`);
      return processAndSavePapers(searchQuery, topPapers);
    }
    
    attempt++;
  }
  
  logger.warn('All 3 Self-Healing attempts failed to find highly relevant papers.');
  return [];
}
