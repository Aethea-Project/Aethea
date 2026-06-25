import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { Article } from './index';

export default function ResearchCard({ article, onChatClick }: { article: Article, onChatClick?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine colors based on verdict
  const verdictConfig = {
    supports: { bg: 'bg-emerald-50/70', text: 'text-emerald-700', label: 'FACT' },
    refutes: { bg: 'bg-rose-50/70', text: 'text-rose-700', label: 'MYTH' },
    mixed: { bg: 'bg-amber-50/70', text: 'text-amber-700', label: 'MIXED' },
  };

  const config = verdictConfig[article.verdict as keyof typeof verdictConfig] || verdictConfig.mixed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className={`flex flex-col h-full rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-md bg-white relative after:absolute after:bottom-0 after:left-[30%] after:w-[40%] after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-sand-900/20 after:to-transparent`}
    >
      {/* Top Badge Row */}
      <div className="flex justify-between items-start mb-4">
        <span className={`px-3 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-sand-500 font-medium bg-sand-50/70 px-2 py-1 rounded">
          {article.openAlexId ? 'OpenAlex' : 'PubMed'}
        </span>
      </div>

      {/* Main Title (Replaces old N/A Claim) */}
      <h3 className="font-serif text-2xl text-sand-900 leading-tight mb-3">
        {article.title}
      </h3>

      {/* AI Plain Summary with Expand/Collapse */}
      <div className="bg-sand-50/70 rounded-2xl p-4 mb-5">
        <motion.div layout>
          <p className={`text-sm text-sand-800 leading-relaxed font-medium ${isExpanded ? '' : 'line-clamp-3'}`}>
            <span className="text-amber-800 mr-2 text-lg leading-none font-serif">"</span>
            {article.plainSummary}
          </p>
        </motion.div>
        
        {/* Only show toggle if text is long. As a heuristic, if > 150 chars, show it. */}
        {article.plainSummary.length > 150 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
            <svg 
              className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Scientific Source Info */}
      <div className="pt-2 mt-auto">
        <p className="text-[11px] text-sand-400 flex items-center justify-between">
          <span className="truncate">{article.journal || 'Unknown Journal'} • {new Date(article.publishedAt).getFullYear()}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-2">
        {article.url && (
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 py-2.5 text-center text-[11px] font-semibold tracking-wide uppercase rounded-xl bg-surface shadow-sm text-sand-600 hover:bg-sand-800 hover:text-white transition-colors"
          >
            Read Study
          </a>
        )}
        <button
          onClick={onChatClick}
          className="flex-1 py-2.5 text-center text-[11px] font-semibold tracking-wide uppercase rounded-xl bg-nescafe shadow-sm text-white hover:bg-nescafe-hover transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Ask AI
        </button>
      </div>
    </motion.div>
  );
}
