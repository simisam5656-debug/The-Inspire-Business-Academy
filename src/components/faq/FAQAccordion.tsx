import React, { useState, useEffect } from 'react';
import { FAQItem, OFFICIAL_FAQS } from '../../config/faq';
import { useTranslation } from '../../i18n';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { CmsService } from '../../services/cmsService';

export interface FAQAccordionProps {
  items?: FAQItem[];
  showCategoryFilters?: boolean;
  limit?: number;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items: propsItems,
  showCategoryFilters = false,
  limit,
}) => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [faqList, setFaqList] = useState<FAQItem[]>(propsItems || OFFICIAL_FAQS);

  useEffect(() => {
    if (propsItems) {
      setFaqList(propsItems);
      return;
    }
    async function loadPublished() {
      try {
        const fetched = await CmsService.getFAQs(true);
        if (fetched.length > 0) {
          setFaqList(
            fetched.map((f) => ({
              id: f.id,
              question: f.question,
              questionRomanUrdu: f.questionRomanUrdu,
              answer: f.answer,
              answerRomanUrdu: f.answerRomanUrdu,
              category: (f.category as any) || 'general',
            }))
          );
        }
      } catch (err) {
        console.warn('Fallback to default faqs:', err);
      }
    }
    loadPublished();
  }, [propsItems]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredItems = faqList
    .filter((item) => selectedCategory === 'all' || item.category === selectedCategory)
    .slice(0, limit || faqList.length);

  const toggleItem = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  const categories = [
    { id: 'all', label: isRoman ? 'Tamam Sawalat' : 'All FAQs' },
    { id: 'physical', label: isRoman ? 'Physical Academy' : 'Physical Academy' },
    { id: 'online', label: isRoman ? 'Online LMS' : 'Online LMS' },
    { id: 'admissions', label: isRoman ? 'Dakhla o Fees' : 'Admissions & Fees' },
    { id: 'general', label: isRoman ? 'Aam Maloomat' : 'General Questions' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Category Filter Pills (if enabled) */}
      {showCategoryFilters && (
        <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#1F3FBF] text-white shadow-xs'
                  : 'bg-white text-[#0F1F5C]/80 border border-slate-200 hover:border-[#1F3FBF]/40 hover:text-[#1F3FBF]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isOpen = activeId === item.id;
          const question = isRoman ? item.questionRomanUrdu : item.question;
          const answer = isRoman ? item.answerRomanUrdu : item.answer;
          const contentId = `faq-content-${item.id}`;
          const buttonId = `faq-btn-${item.id}`;

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-[#1F3FBF]/15 overflow-hidden shadow-2xs transition-all duration-150"
            >
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-[#0F1F5C] hover:text-[#1F3FBF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3FBF] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[#1F3FBF] shrink-0" aria-hidden="true" />
                    <span>{question}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#1F3FBF]' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </h3>

              <div
                id={contentId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className={`px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed border-t border-slate-100 ${
                  isOpen ? 'block animate-in fade-in-50 duration-150' : 'hidden'
                }`}
              >
                <p className="mt-3 bg-[#F2F5FF]/70 p-3.5 rounded-lg border border-[#1F3FBF]/10">
                  {answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
