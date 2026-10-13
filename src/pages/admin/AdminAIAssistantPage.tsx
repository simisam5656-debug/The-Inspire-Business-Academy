import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { canAccessModule } from '../../utils/permissions';
import { AdminAiService } from '../../services/adminAiService';
import { AdminAiAction } from '../../../api/admin/ai/generate';
import {
  Sparkles,
  FileEdit,
  PenTool,
  BarChart3,
  MessageSquare,
  BookOpen,
  Copy,
  Check,
  AlertCircle,
  ShieldAlert,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminAIAssistantPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { profile } = useAuth();

  // Permission guard
  const hasAccess = canAccessModule(profile?.role, 'ai_tools');

  const [activeTab, setActiveTab] = useState<AdminAiAction>('draft_content');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [metaInfo, setMetaInfo] = useState<{ modelUsed?: string; correlationId?: string } | null>(null);

  // Form states for each tool
  // 1. Content Drafting
  const [draftType, setDraftType] = useState('announcement');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftPoints, setDraftPoints] = useState('');
  const [draftLang, setDraftLang] = useState('Bilingual (English & Roman Urdu)');

  // 2. Text Improvement
  const [improveText, setImproveText] = useState('');
  const [improveGoal, setImproveGoal] = useState('Enhance clarity, spelling, and professional tone');

  // 3. Report Summarizer
  const [reportRange, setReportRange] = useState('Last 30 Days');
  const [reportMetrics, setReportMetrics] = useState('');

  // 4. Support Reply
  const [studentName, setStudentName] = useState('');
  const [studentInquiry, setStudentInquiry] = useState('');

  // 5. Course Outline
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDuration, setCourseDuration] = useState('8 weeks');
  const [courseTopics, setCourseTopics] = useState('');

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">
            {isRoman ? 'Ijazat Maujood Nahi Hai' : 'Access Restricted'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {isRoman
              ? 'Aapke account ko "ai_tools" permission allocate nahi ki gayi. Baraye meharbani Super Admin se rabta karein.'
              : 'Your staff account has not been granted the "ai_tools" permission. Please contact a Super Administrator for access.'}
          </p>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg(null);
    setResultText('');
    setMetaInfo(null);
    setCopied(false);

    let payload: Record<string, any> = {};

    switch (activeTab) {
      case 'draft_content':
        payload = {
          contentType: draftType,
          topic: draftTopic,
          keyPoints: draftPoints,
          language: draftLang,
        };
        break;
      case 'improve_text':
        payload = {
          originalText: improveText,
          goal: improveGoal,
        };
        break;
      case 'summarize_report':
        payload = {
          dateRange: reportRange,
          metricsSummary: reportMetrics,
        };
        break;
      case 'draft_support_reply':
        payload = {
          studentName,
          studentInquiry,
        };
        break;
      case 'draft_course_outline':
        payload = {
          courseTitle,
          durationWeeks: courseDuration,
          topics: courseTopics,
        };
        break;
    }

    const res = await AdminAiService.generate({
      action: activeTab,
      payload,
    });

    setLoading(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to generate response.');
      return;
    }

    setResultText(res.resultText || '');
    setMetaInfo({ modelUsed: res.modelUsed, correlationId: res.correlationId });
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] font-display">
              {isRoman ? 'Admin AI Services' : 'Admin AI Assistant'}
            </h1>
            <Badge variant="primary" size="sm" className="bg-[#1F3FBF] text-white">
              Cloudflare Workers AI
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {isRoman
              ? 'Academy communication, syllabus drafting, aur reports review ke liye AI tools.'
              : 'Editorial drafting and assistance for academy staff. Outputs are drafts for human review.'}
          </p>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-[#1F3FBF] shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong>Staff Review Policy:</strong> AI outputs are advisory drafts. The AI will never automatically publish courses, alter fees, enroll students, issue certificates, or delete records. Always verify content prior to publishing.
        </div>
      </div>

      {/* Main Grid: Tool Tabs & Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tool Selection & Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tool Tabs */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('draft_content')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'draft_content'
                  ? 'bg-[#1F3FBF] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileEdit className="w-4 h-4" />
              {isRoman ? 'Content Draft' : 'Draft Content'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('improve_text')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'improve_text'
                  ? 'bg-[#1F3FBF] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PenTool className="w-4 h-4" />
              {isRoman ? 'Text Rewrite' : 'Improve Text'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summarize_report')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'summarize_report'
                  ? 'bg-[#1F3FBF] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {isRoman ? 'Report Summary' : 'Report Summary'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('draft_support_reply')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'draft_support_reply'
                  ? 'bg-[#1F3FBF] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {isRoman ? 'Support Reply' : 'Support Reply'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('draft_course_outline')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'draft_course_outline'
                  ? 'bg-[#1F3FBF] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {isRoman ? 'Course Syllabus' : 'Course Outline'}
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            {activeTab === 'draft_content' && (
              <>
                <h3 className="font-bold text-sm text-[#0F1F5C] flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-[#1F3FBF]" /> Draft Official Academy Content
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Content Type</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  >
                    <option value="announcement">Announcement / Notice</option>
                    <option value="faq">FAQ (Question & Answer)</option>
                    <option value="course_description">Course Description / Overview</option>
                    <option value="campus_notice">Physical Campus Notice (Lab / Schedule)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Topic / Subject</label>
                  <input
                    type="text"
                    value={draftTopic}
                    onChange={(e) => setDraftTopic(e.target.value)}
                    placeholder="e.g. New Batch Admissions Open for Amazon VA & Graphic Design"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Key Points / Details</label>
                  <textarea
                    rows={4}
                    value={draftPoints}
                    onChange={(e) => setDraftPoints(e.target.value)}
                    placeholder="Provide raw bullet points (e.g. starting date 1st of next month, Rs. 5040/month, computer lab seats limited)"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Language</label>
                  <select
                    value={draftLang}
                    onChange={(e) => setDraftLang(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  >
                    <option value="Bilingual (English & Roman Urdu)">Bilingual (English & Roman Urdu)</option>
                    <option value="English">English</option>
                    <option value="Roman Urdu">Roman Urdu</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'improve_text' && (
              <>
                <h3 className="font-bold text-sm text-[#0F1F5C] flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#1F3FBF]" /> Refine and Improve Text
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Original Staff Draft</label>
                  <textarea
                    rows={6}
                    value={improveText}
                    onChange={(e) => setImproveText(e.target.value)}
                    placeholder="Paste text to proofread, fix grammar, or enhance tone..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Improvement Goal</label>
                  <input
                    type="text"
                    value={improveGoal}
                    onChange={(e) => setImproveGoal(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === 'summarize_report' && (
              <>
                <h3 className="font-bold text-sm text-[#0F1F5C] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1F3FBF]" /> Summarize Operational Metrics
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Report Timeframe</label>
                  <input
                    type="text"
                    value={reportRange}
                    onChange={(e) => setReportRange(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Numeric Data / Metrics Summary</label>
                  <textarea
                    rows={5}
                    value={reportMetrics}
                    onChange={(e) => setReportMetrics(e.target.value)}
                    placeholder="Paste metrics from Reports page (e.g. Total Active Physical Students: 42, Total Fee Collected: Rs. 210,000, Total Expenses: Rs. 95,000, Attendance Average: 88%)"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The AI will synthesize your metrics without altering the figures.
                  </p>
                </div>
              </>
            )}

            {activeTab === 'draft_support_reply' && (
              <>
                <h3 className="font-bold text-sm text-[#0F1F5C] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#1F3FBF]" /> Draft Inquiry Response
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student / Inquirer Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Hamza Ali"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student's Question / Message</label>
                  <textarea
                    rows={4}
                    value={studentInquiry}
                    onChange={(e) => setStudentInquiry(e.target.value)}
                    placeholder="Paste the student's message (e.g. 'Can I pay fees in installments for the Amazon course?')"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === 'draft_course_outline' && (
              <>
                <h3 className="font-bold text-sm text-[#0F1F5C] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#1F3FBF]" /> Curriculum Outline Builder
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Course Title</label>
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder="e.g. AI-Powered Freelancing Masterclass"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      placeholder="e.g. 6 weeks / 12 lessons"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Core Modules / Topics</label>
                  <textarea
                    rows={4}
                    value={courseTopics}
                    onChange={(e) => setCourseTopics(e.target.value)}
                    placeholder="List core skills (e.g. Profile Setup, Bidding Strategies, Portfolio Projects, Client Delivery)"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
              </>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full justify-center bg-[#FFC20E] text-[#0F1F5C] font-bold py-2.5"
            >
              {loading ? (
                <>
                  <Spinner size="sm" variant="navy" />
                  <span>Generating Draft...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Draft with Workers AI</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Generated Output & Review Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs min-h-[480px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-[#0F1F5C] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FFC20E]" /> Generated Draft
                </h3>
                {resultText && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#1F3FBF] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {loading && (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Spinner size="lg" variant="primary" />
                  <p className="text-xs">Workers AI model is generating completion...</p>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold">Error Generating Content:</strong>
                    <p>{errorMsg}</p>
                  </div>
                </div>
              )}

              {!loading && !errorMsg && !resultText && (
                <div className="py-24 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs">Configure parameters on the left and click Generate.</p>
                  <p className="text-[11px] text-slate-400">Drafts will appear here ready for review and copying.</p>
                </div>
              )}

              {!loading && resultText && (
                <div className="p-4 bg-[#F8FAFF] rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                  {resultText}
                </div>
              )}
            </div>

            {/* Bottom Meta & Warning */}
            {resultText && (
              <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Model: {metaInfo?.modelUsed || '@cf/meta/llama-3.1-8b-instruct'}</span>
                  <span>Review Status: <strong className="text-amber-600">Unpublished Draft</strong></span>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Copy this draft into the relevant Announcement, FAQ, or Course edit form to review and publish.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
