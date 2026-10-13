import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { canAccessModule } from '../../utils/permissions';
import { CmsService } from '../../services/cmsService';
import { ChatbotSettings, ChatbotKnowledgeItem } from '../../types';
import {
  Bot,
  Save,
  Plus,
  Trash2,
  Edit2,
  Send,
  HelpCircle,
  BookOpen,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X,
  Power,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Label } from '../../components/ui/Label';

export const AdminChatbotPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { profile } = useAuth();

  const hasAccess = canAccessModule(profile?.role, 'chatbot');

  // Loading and feedback states
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<ChatbotSettings>({
    id: 'default',
    isEnabled: true,
    greetingEn: 'Hello! Welcome to The Inspire Business Academy. How can I help you today?',
    greetingRomanUrdu: 'Assalam-o-Alaikum! The Inspire Business Academy mein khushamdeed. Main aap ki kya madad kar sakta hoon?',
    extraInstructions: '',
    fallbackMessage: 'I am not sure about that. Please contact our admissions office on WhatsApp (+92 300 1234567) or visit our campus.',
  });

  // Knowledge base state
  const [knowledgeList, setKnowledgeList] = useState<ChatbotKnowledgeItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Knowledge edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [currentItem, setCurrentItem] = useState<{
    id?: string;
    category: string;
    title: string;
    content: string;
    keywords: string;
    isActive: boolean;
    displayOrder: number;
  }>({
    category: 'general',
    title: '',
    content: '',
    keywords: '',
    isActive: true,
    displayOrder: 0,
  });

  // Test chat simulation
  const [testInput, setTestInput] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [fetchedSettings, fetchedKnowledge] = await Promise.all([
        CmsService.getChatbotSettings(),
        CmsService.getChatbotKnowledge(),
      ]);
      setSettings(fetchedSettings);
      setKnowledgeList(fetchedKnowledge);

      // Initialize test chat greeting
      const greeting = isRoman
        ? (fetchedSettings.greetingRomanUrdu || fetchedSettings.greetingEn)
        : (fetchedSettings.greetingEn || fetchedSettings.greetingRomanUrdu);
      setTestMessages([
        {
          role: 'assistant',
          text: greeting || 'Hello! How can I assist you today?',
        },
      ]);
    } catch (err: any) {
      console.error('[AdminChatbotPage] Error loading data:', err);
      setErrorMsg(err.message || (isRoman ? 'Chatbot settings load karne mein masla hua' : 'Failed to load chatbot data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setSavingSettings(true);
      await CmsService.updateChatbotSettings(settings, profile?.id);
      setSuccessMsg(isRoman ? 'Chatbot settings kamyabi se mehfooz ho gayin!' : 'Chatbot settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('[AdminChatbotPage] Error saving settings:', err);
      setErrorMsg(err.message || (isRoman ? 'Settings save karne mein masla hua' : 'Failed to save chatbot settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setCurrentItem({
      category: 'admissions',
      title: '',
      content: '',
      keywords: '',
      isActive: true,
      displayOrder: knowledgeList.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ChatbotKnowledgeItem) => {
    setModalMode('edit');
    setCurrentItem({
      id: item.id,
      category: item.category || 'general',
      title: item.title,
      content: item.content,
      keywords: Array.isArray(item.keywords) ? item.keywords.join(', ') : '',
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    });
    setIsModalOpen(true);
  };

  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.title.trim() || !currentItem.content.trim()) {
      setErrorMsg(isRoman ? 'Title aur Content zaroori hain' : 'Title and Content are required');
      return;
    }
    setSavingKnowledge(true);
    setErrorMsg(null);
    try {
      const keywordsArray = currentItem.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      await CmsService.saveChatbotKnowledge(
        {
          id: currentItem.id,
          category: currentItem.category,
          title: currentItem.title.trim(),
          content: currentItem.content.trim(),
          keywords: keywordsArray,
          isActive: currentItem.isActive,
          displayOrder: Number(currentItem.displayOrder) || 0,
        },
        profile?.id
      );

      setIsModalOpen(false);
      setSuccessMsg(
        modalMode === 'create'
          ? (isRoman ? 'Naya knowledge item shaamil kar diya gaya!' : 'Knowledge item added successfully!')
          : (isRoman ? 'Knowledge item update ho gaya!' : 'Knowledge item updated successfully!')
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      console.error('[AdminChatbotPage] Error saving knowledge:', err);
      setErrorMsg(err.message || (isRoman ? 'Knowledge save karne mein masla hua' : 'Failed to save knowledge item'));
    } finally {
      setSavingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (id: string, title: string) => {
    const confirmText = isRoman
      ? `Kya aap waqai "${title}" ko delete karna chahte hain?`
      : `Are you sure you want to delete "${title}"?`;
    if (!window.confirm(confirmText)) return;

    setErrorMsg(null);
    try {
      await CmsService.deleteChatbotKnowledge(id, profile?.id);
      setKnowledgeList((prev) => prev.filter((k) => k.id !== id));
      setSuccessMsg(isRoman ? 'Item delete ho gaya!' : 'Item deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('[AdminChatbotPage] Error deleting knowledge:', err);
      setErrorMsg(err.message || (isRoman ? 'Delete karne mein masla hua' : 'Failed to delete knowledge item'));
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || testSending) return;

    const userText = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setTestSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          language: isRoman ? 'roman-urdu' : 'en',
          history: testMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setTestMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        setTestMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply || data.error || (isRoman ? 'Khata pesh aayi, live API se jawab nahi mila.' : 'Error getting reply from API.'),
          },
        ]);
      }
    } catch (err: any) {
      setTestMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.message || (isRoman ? 'Network issue: chatbot tak rasai mumkin nahi.' : 'Network error communicating with chatbot.'),
        },
      ]);
    } finally {
      setTestSending(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">
          {isRoman ? 'Ijazat Nahi Hai' : 'Access Restricted'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isRoman
            ? 'Aap ke account ko Chatbot control karne ki permission nahi di gayi.'
            : 'Your manager role does not have permission to manage the Academy Chatbot.'}
        </p>
      </div>
    );
  }

  const categories = ['all', 'admissions', 'fees', 'courses', 'timings', 'campus', 'general'];

  const filteredKnowledge = knowledgeList.filter((item) => {
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(item.keywords) && item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isRoman ? 'Academy Chatbot Management' : 'Academy Chatbot Management'}
            </h1>
            <p className="text-sm text-slate-500">
              {isRoman
                ? 'Website ke public AI assistant ki settings aur knowledge base yahan se control karein'
                : 'Configure settings, greetings, fallback messages, and grounded knowledge for the website assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isRoman ? 'Refresh' : 'Refresh'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isRoman ? 'Naya Knowledge Item' : 'Add Knowledge Item'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 mt-3">
            {isRoman ? 'Chatbot data load ho raha hai...' : 'Loading chatbot settings and knowledge...'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Settings & Live Preview Simulation (1 col) */}
          <div className="space-y-6">
            {/* Global Settings Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Power className="w-5 h-5 text-primary-600" />
                  <h2 className="font-bold text-slate-800">
                    {isRoman ? 'Chatbot Activation' : 'Chatbot Status & Config'}
                  </h2>
                </div>
                <Badge variant={settings.isEnabled ? 'success' : 'neutral'}>
                  {settings.isEnabled ? (isRoman ? 'Fa-al (Enabled)' : 'Enabled') : (isRoman ? 'Band (Disabled)' : 'Disabled')}
                </Badge>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {isRoman ? 'Chatbot ko website par dikhayein' : 'Enable Public Chatbot'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isRoman ? 'Band karne par website se widget chup jayega' : 'Show floating widget on public pages'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isEnabled}
                      onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div>
                  <Label htmlFor="greetingEn">
                    {isRoman ? 'Greeting Message (English)' : 'Welcome Greeting (English)'}
                  </Label>
                  <Textarea
                    id="greetingEn"
                    rows={2}
                    value={settings.greetingEn || ''}
                    onChange={(e) => setSettings({ ...settings, greetingEn: e.target.value })}
                    className="text-xs"
                    placeholder="Hello! Welcome to The Inspire Business Academy..."
                  />
                </div>

                <div>
                  <Label htmlFor="greetingRomanUrdu">
                    {isRoman ? 'Greeting Message (Roman Urdu)' : 'Welcome Greeting (Roman Urdu)'}
                  </Label>
                  <Textarea
                    id="greetingRomanUrdu"
                    rows={2}
                    value={settings.greetingRomanUrdu || ''}
                    onChange={(e) => setSettings({ ...settings, greetingRomanUrdu: e.target.value })}
                    className="text-xs"
                    placeholder="Assalam-o-Alaikum! The Inspire Business Academy mein khushamdeed..."
                  />
                </div>

                <div>
                  <Label htmlFor="fallbackMessage">
                    {isRoman ? 'Fallback Message (Jab jawab na mile)' : 'Fallback Message (When unsure)'}
                  </Label>
                  <Textarea
                    id="fallbackMessage"
                    rows={2}
                    value={settings.fallbackMessage || ''}
                    onChange={(e) => setSettings({ ...settings, fallbackMessage: e.target.value })}
                    className="text-xs"
                    placeholder="I am not sure about that. Please contact our office on WhatsApp..."
                  />
                </div>

                <div>
                  <Label htmlFor="extraInstructions">
                    {isRoman ? 'Izafi Hidayat (Extra System Instructions)' : 'Special System Directives'}
                  </Label>
                  <Textarea
                    id="extraInstructions"
                    rows={3}
                    value={settings.extraInstructions || ''}
                    onChange={(e) => setSettings({ ...settings, extraInstructions: e.target.value })}
                    className="text-xs"
                    placeholder="Always emphasize practical hands-on training; encourage visiting Sadiqabad campus in person..."
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={savingSettings}
                >
                  <Save className="w-4 h-4" />
                  {savingSettings
                    ? (isRoman ? 'Mehfooz ho raha hai...' : 'Saving...')
                    : (isRoman ? 'Settings Mehfooz Karein' : 'Save Settings')}
                </Button>
              </form>
            </div>

            {/* Test Chat Sandbox */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[400px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    {isRoman ? 'Live Test Sandbox' : 'Test Assistant Interaction'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const g = isRoman ? settings.greetingRomanUrdu : settings.greetingEn;
                    setTestMessages([{ role: 'assistant', text: g || 'Hello! How can I assist you?' }]);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {isRoman ? 'Clear' : 'Clear'}
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-2 p-2 text-xs">
                {testMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {testSending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-400 rounded-xl px-3 py-2 rounded-bl-none text-xs flex items-center gap-1">
                      <Spinner size="sm" />
                      <span>{isRoman ? 'Soch raha hai...' : 'Generating response...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <form onSubmit={handleSendTestMessage} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder={isRoman ? 'Sawaal poochein...' : 'Test a question...'}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={testSending || !testInput.trim()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-xl text-xs disabled:opacity-50 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Grounded Knowledge Base Management (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                    {isRoman ? 'Grounded Knowledge Base' : 'Custom Knowledge Base'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRoman
                      ? 'In maloomat ko chatbot admissions, fees, aur campus se mutaliq sawaalaat ke durust jawabaat ke liye istemal karta hai'
                      : 'The chatbot references these active entries whenever visitors ask specific questions'}
                  </p>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {knowledgeList.length} {isRoman ? 'Items' : 'Knowledge Items'}
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRoman ? 'Title, content ya keywords dhoondein...' : 'Search title, content, keywords...'}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium capitalize transition-colors ${
                        filterCategory === cat
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Knowledge items list */}
              {filteredKnowledge.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">
                    {isRoman ? 'Koi knowledge item nahi mila' : 'No knowledge items found'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRoman
                      ? 'Naya item shaamil karne ke liye oopar diye gaye button par click karein'
                      : 'Click "Add Knowledge Item" above to add official FAQs or details'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredKnowledge.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 capitalize">
                            {item.category || 'general'}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {item.title}
                          </span>
                          <Badge variant={item.isActive ? 'success' : 'neutral'}>
                            {item.isActive ? (isRoman ? 'Active' : 'Active') : (isRoman ? 'Inactive' : 'Inactive')}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {item.content}
                        </p>
                        {Array.isArray(item.keywords) && item.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.keywords.map((k, kidx) => (
                              <span
                                key={kidx}
                                className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded"
                              >
                                #{k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(item)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          {isRoman ? 'Edit' : 'Edit'}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteKnowledge(item.id, item.title)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isRoman ? 'Delete' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit Knowledge Item */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? (isRoman ? 'Naya Knowledge Item Shaamil Karein' : 'Add Knowledge Base Entry')
            : (isRoman ? 'Knowledge Item Edit Karein' : 'Edit Knowledge Base Entry')
        }
      >
        <form onSubmit={handleSaveKnowledge} className="space-y-4">
          <div>
            <Label htmlFor="category">{isRoman ? 'Category' : 'Category'}</Label>
            <select
              id="category"
              value={currentItem.category}
              onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="admissions">{isRoman ? 'Dakhlay (Admissions)' : 'Admissions'}</option>
              <option value="fees">{isRoman ? 'Fees aur Packages' : 'Fees & Packages'}</option>
              <option value="courses">{isRoman ? 'Courses & Syllabus' : 'Courses & Syllabus'}</option>
              <option value="timings">{isRoman ? 'Aukat (Timings & Batches)' : 'Timings & Batches'}</option>
              <option value="campus">{isRoman ? 'Campus aur Address' : 'Campus & Address'}</option>
              <option value="general">{isRoman ? 'Aam Maloomat (General)' : 'General'}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="kTitle">{isRoman ? 'Title (Mawzoo)' : 'Topic / Question Title'}</Label>
            <Input
              id="kTitle"
              type="text"
              required
              value={currentItem.title}
              onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
              placeholder={isRoman ? 'Misal: Admission Eligibility criteria' : 'e.g. Admission Eligibility criteria'}
            />
          </div>

          <div>
            <Label htmlFor="kContent">{isRoman ? 'Content / Jawab' : 'Detailed Content / Fact'}</Label>
            <Textarea
              id="kContent"
              rows={4}
              required
              value={currentItem.content}
              onChange={(e) => setCurrentItem({ ...currentItem, content: e.target.value })}
              placeholder={
                isRoman
                  ? 'Mukammal wazahat likhein jo chatbot visitors ko bata sake...'
                  : 'Provide accurate facts for the AI to include in student answers...'
              }
            />
          </div>

          <div>
            <Label htmlFor="kKeywords">
              {isRoman ? 'Keywords (Comma separated)' : 'Keywords (Comma separated)'}
            </Label>
            <Input
              id="kKeywords"
              type="text"
              value={currentItem.keywords}
              onChange={(e) => setCurrentItem({ ...currentItem, keywords: e.target.value })}
              placeholder="admission, matric, eligibility, criteria, qualification"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isRoman ? 'Active Status' : 'Active Status'}
              </p>
              <p className="text-xs text-slate-500">
                {isRoman ? 'Chatbot sirf active items se jawab banata hai' : 'Only active entries are fed to the chatbot context'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentItem.isActive}
                onChange={(e) => setCurrentItem({ ...currentItem, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              {isRoman ? 'Mansookh' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={savingKnowledge}
            >
              {savingKnowledge
                ? (isRoman ? 'Mehfooz...' : 'Saving...')
                : (isRoman ? 'Mehfooz Karein' : 'Save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
