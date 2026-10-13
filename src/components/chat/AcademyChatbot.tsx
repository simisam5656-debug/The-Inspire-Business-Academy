import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { CmsService } from '../../services/cmsService';
import { siteConfig } from '../../config/site';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'Physical Package fees kitni hai?',
  'Online courses ki details dein',
  'Admission ka tareeqa kya hai?',
  'Campus kahan waqia hai?',
];

export const AcademyChatbot: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const location = useLocation();

  // STRICT REQUIREMENT: Chatbot must NOT appear on /student/* or /admin/* routes
  const isHiddenRoute =
    location.pathname.startsWith('/student') ||
    location.pathname.startsWith('/admin');

  if (isHiddenRoute) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [whatsappHelpline, setWhatsappHelpline] = useState(siteConfig.whatsapp);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: isRoman
        ? 'Assalam o Alaikum! Main The Inspire Business Academy ka official AI guide hoon. Aap mujh se physical campus programs, online courses, fees, aur dakhlay ke bare mein poochh sakte hain.'
        : 'Welcome! I am the official AI Guide for The Inspire Business Academy. How may I assist you today regarding courses, admissions, or fees?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    CmsService.getSiteSettings()
      .then((s) => {
        if (s?.whatsapp) setWhatsappHelpline(s.whatsapp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    setInput('');

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build lightweight conversation history for context
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const friendlyMsg =
          data.friendlyReply ||
          (isRoman
            ? 'Hamari AI helpline filwaqt masroof hai. Baraye meharbani academy WhatsApp helpline par rabta karein.'
            : 'Our AI guide is temporarily unavailable. Please reach out directly to our admissions team on WhatsApp.');

        console.warn(
          `[AcademyChatbot Assistant Note] ${data.error ? String(data.error) : 'Fallback response displayed'}`
        );

        const assistantFallbackMessage: Message = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: friendlyMsg,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantFallbackMessage]);
        return;
      }

      const assistantMessage: Message = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.friendlyReply || 'Apologies, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.warn(`[AcademyChatbot Connection Note] ${err?.message || 'Network error'}`);
      const friendlyMsg = isRoman
        ? 'Rabtay mein waqti rukawat hai. Baraye meharbani thori der baad koshish karein ya WhatsApp helpline se rabta karein.'
        : 'Connection interrupted. Please try again shortly or contact our admissions helpline via WhatsApp.';
      const fallbackMsg: Message = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: friendlyMsg,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button (Positioned safely above WhatsApp button) */}
      <aside aria-label="AI Assistant Floating Widget">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close AI Assistant' : 'Open The Inspire Business Academy AI Assistant'}
          className="fixed bottom-20 right-5 sm:bottom-22 sm:right-6 z-40 group flex items-center gap-2 bg-[#1F3FBF] hover:bg-[#18339E] text-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2"
        >
          <div className="relative">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true" />
            <Sparkles className="w-2.5 h-2.5 text-[#FFC20E] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wide">
            {isRoman ? 'Ask AI' : 'Ask AI'}
          </span>
        </button>
      </aside>

      {/* Chat Window Dialog */}
      {isOpen && (
        <section
          aria-label="The Inspire Business Academy AI Assistant"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
        >
          {/* Header */}
          <header className="bg-[#0F1F5C] text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#1F3FBF] border border-[#FFC20E]/40 flex items-center justify-center text-[#FFC20E]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
                    Academy AI Assistant
                  </h2>
                  <span className="text-[10px] bg-[#FFC20E] text-[#0F1F5C] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    Beta
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isRoman ? 'Hunarmand Pakistan Guide' : 'Official Vocational Guide'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Assistant Window"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E]"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFF] max-h-[340px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#1F3FBF] text-[#FFC20E] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#1F3FBF] text-white rounded-br-2xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-2xs shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start items-center">
                <div className="w-6 h-6 rounded-full bg-[#1F3FBF] text-[#FFC20E] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-bl-2xs shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#1F3FBF] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-[#1F3FBF] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[#1F3FBF] rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    className="mt-1 text-[11px] font-bold underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel (when history is small) */}
          {messages.length <= 2 && (
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap text-[11px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full font-medium transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Form */}
          <footer className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRoman ? 'Sawaal poochhein... (Urdu / English)' : 'Ask a question about IBA...'}
                maxLength={500}
                disabled={isLoading}
                className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F3FBF] focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send Message"
                className="p-2.5 bg-[#FFC20E] hover:bg-[#E5AD07] disabled:opacity-40 disabled:cursor-not-allowed text-[#0F1F5C] font-bold rounded-xl shadow-2xs transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="mt-1.5 text-[10px] text-center text-slate-400">
              Helpline: <strong className="text-slate-600">{whatsappHelpline}</strong> • Powered by Workers AI
            </p>
          </footer>
        </section>
      )}
    </>
  );
};
