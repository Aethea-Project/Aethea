import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { medicalApi } from '../../services/medicalApi';
import ResearchCard from './ResearchCard';
import PaperChatPanel from './PaperChatPanel';
import { FeatureHeader } from '../../components/FeatureHeader';
import { SearchBar } from '../../components/ui/SearchBar';

export interface Article {
  id: string;
  title: string;
  journal: string | null;
  authors: string[];
  doi: string | null;
  openAlexId: string;
  pmid: string | null;
  url: string | null;
  category: string;
  verdict: 'supports' | 'refutes' | 'mixed';
  claim: string;
  plainSummary: string;
  publishedAt: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All Myths' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'sugar_sweets', label: 'Sugar & Sweets' },
  { id: 'diabetes_nutrition', label: 'Diabetes' },
  { id: 'heart_health', label: 'Heart Health' },
  { id: 'general_nutrition', label: 'General Nutrition' },
];

export default function ResearchPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chat Panel State
  const [activeChatArticle, setActiveChatArticle] = useState<Article | null>(null);

  const fetchArticles = async (category = 'all') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await medicalApi.fetchResearchArticles(category);
      setArticles(data || []);
    } catch (err) {
      console.error('Failed to fetch articles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(activeCategory);
  }, [activeCategory]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isAskingAI) return;
    
    setIsAskingAI(true);
    setErrorMsg(null);
    try {
      const newArticles = await medicalApi.askResearchQuestion(searchQuery);
      
      if (newArticles && newArticles.length > 0) {
        setArticles(newArticles);
      }
      setSearchQuery('');
    } catch (err: any) {
      console.error('AI Processing Failed', err);
      // Clean up the error message for the user
      const msg = err.message || err.toString();
      setErrorMsg(msg.replace('Error: ', ''));
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      
      <FeatureHeader
        title="Medical Myth Buster"
        subtitle="Ask any health question below. Our dual-AI engine will instantly read millions of medical papers and return the scientific truth."
      />

      {/* User-Facing Ask AI Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleAskAI}
        placeholder="e.g. Do cucumbers actually help with stomach pain?"
        disabled={isAskingAI}
        actionText="Ask AI"
        isActionLoading={isAskingAI}
        actionLoadingText="Asking..."
      />

      {/* Error Message Display */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mt-4 mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium flex items-start text-left gap-3 shadow-sm"
          >
            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories - Olive Green Filter Tags */}
      <div className="flex overflow-x-auto gap-3 pb-4 mb-8 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id 
                ? 'bg-olive-600 text-white shadow-md' 
                : 'bg-white text-sand-600 hover:bg-sand-100 shadow-sm'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pinterest-style Masonry Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-200 border-t-nescafe" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-sand-500">
          <p className="text-lg">No myths discovered here yet.</p>
          <p className="text-sm mt-2 opacity-70">Be the first to ask a question above!</p>
        </div>
      ) : (
        <motion.div 
          layout
          className="flex flex-col gap-6 w-full"
        >
          <AnimatePresence>
            {articles.map((article) => (
              <ResearchCard 
                key={article.id} 
                article={article} 
                onChatClick={() => setActiveChatArticle(article)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Chat UI Modal/Sliding Panel */}
      <AnimatePresence>
        {activeChatArticle && (
          <PaperChatPanel 
            article={activeChatArticle} 
            onClose={() => setActiveChatArticle(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
