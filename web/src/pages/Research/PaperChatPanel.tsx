import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { medicalApi } from '../../services/medicalApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PaperChatPanelProps {
  article: any;
  onClose: () => void;
}

export default function PaperChatPanel({ article, onClose }: PaperChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Map current messages to history format for the AI
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const answer = await medicalApi.chatWithPaper(article.id, text, history);
      
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: answer };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: `Error: ${error.message || 'Failed to communicate with AI.'}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-sand-900/40 backdrop-blur-sm z-40"
      />

      {/* Sliding Panel */}
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-surface shadow-[0_0_40px_rgba(0,0,0,0.1)] z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-5 flex items-start justify-between bg-white shadow-sm z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <h2 className="text-[11px] font-semibold tracking-wide uppercase text-sand-500">Gemini 2.5 Flash</h2>
            </div>
            <h3 className="font-serif text-lg leading-tight text-sand-900 line-clamp-2 pr-4">{article.title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-sand-400 hover:text-sand-900 hover:bg-sand-50 rounded-full transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-sand-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h4 className="font-serif text-xl text-sand-900 mb-2">Interrogate this Paper</h4>
              <p className="text-sm text-sand-500 mb-8 max-w-[280px]">
                Ask deep methodological questions. The AI will automatically fetch the full text if available.
              </p>
              
              <div className="flex flex-col gap-2 w-full">
                {["What was the exact sample size and p-value?", "Summarize the methodology in bullet points.", "Are there any conflicts of interest?"].map((suggestion, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="text-left text-sm p-3 rounded-xl bg-white text-sand-700 hover:text-amber-800 transition-colors shadow-sm hover:shadow-md"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-sand-800 text-white rounded-tr-sm' 
                      : 'bg-white shadow-sm text-sand-800 rounded-tl-sm'
                  }`}>
                    {/* Extremely basic markdown rendering for bolding and bullets just to make it readable.
                        In a full app we'd use react-markdown here. */}
                    {msg.content.split('\n').map((line, i) => {
                      if (line.startsWith('- ')) {
                        return <li key={i} className="ml-4 mb-1">{line.substring(2)}</li>;
                      }
                      // bold text naive replace
                      const bolded = line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : part);
                      return <p key={i} className="mb-2 last:mb-0">{bolded}</p>;
                    })}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm p-4 flex items-center gap-1.5 h-12">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-sand-400 rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-sand-400 rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-sand-400 rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 bg-sand-50/50 rounded-2xl focus-within:bg-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-amber-500 transition-all p-1">
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about this paper..."
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-[15px] p-3 text-sand-900 placeholder:text-sand-400 block"
                rows={1}
                style={{ minHeight: '52px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-[52px] h-[52px] shrink-0 bg-nescafe text-white rounded-2xl flex items-center justify-center hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-3">
             <p className="text-[10px] text-sand-400 uppercase tracking-wide font-medium flex items-center justify-center gap-1.5">
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               AI can make mistakes. Check important numbers.
             </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
