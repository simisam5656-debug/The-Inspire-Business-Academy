import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import { ContactMessageRecord } from '../../types';
import {
  Mail,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Clock,
  Trash2,
  CheckCircle,
  Archive,
  RefreshCw,
  ExternalLink,
  X,
  AlertCircle,
  FileText,
  User,
  BookOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminMessagesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin, user } = useAuth();

  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminService.getContactMessages();
      setMessages(data);
    } catch (err: any) {
      setError(err?.message || (isRoman ? 'Paighamat load nahi ho sakay' : 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleOpenDrawer = async (msg: ContactMessageRecord) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.adminNotes || '');
    setDrawerOpen(true);

    // If new, automatically mark as read
    if (msg.status === 'new') {
      try {
        const updated = await AdminService.updateContactMessage(msg.id, { status: 'read' }, user?.id);
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
        setSelectedMessage(updated);
      } catch (err) {
        console.warn('Could not auto-mark read:', err);
      }
    }
  };

  const handleUpdateStatus = async (id: string, status: 'new' | 'read' | 'replied' | 'archived') => {
    try {
      setActionLoading(true);
      const updated = await AdminService.updateContactMessage(id, { status }, user?.id);
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
      if (selectedMessage?.id === id) {
        setSelectedMessage(updated);
      }
    } catch (err: any) {
      alert(err?.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedMessage) return;
    try {
      setSavingNotes(true);
      const updated = await AdminService.updateContactMessage(
        selectedMessage.id,
        { adminNotes },
        user?.id
      );
      setMessages((prev) => prev.map((m) => (m.id === selectedMessage.id ? updated : m)));
      setSelectedMessage(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) return;
    try {
      setActionLoading(true);
      await AdminService.deleteContactMessage(id, user?.id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) {
        setDrawerOpen(false);
        setSelectedMessage(null);
      }
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete message');
    } finally {
      setActionLoading(false);
    }
  };

  const formatWhatsAppUrl = (phone?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '92' + clean.slice(1);
    } else if (!clean.startsWith('92')) {
      clean = '92' + clean;
    }
    const defaultGreeting = isRoman
      ? 'Assalam-o-Alaikum, The Inspire Business Academy Sadiqabad ki janib se rabta kiya ja raha hai.'
      : 'Hello, reaching out from The Inspire Business Academy Sadiqabad regarding your inquiry.';
    return `https://wa.me/${clean}?text=${encodeURIComponent(defaultGreeting)}`;
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.courseInterest && m.courseInterest.toLowerCase().includes(q)) ||
        m.message.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [messages, statusFilter, searchQuery]);

  const unreadCount = messages.filter((m) => m.status === 'new').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F3FBF]">
              {isRoman ? 'Rabta Inbox' : 'Contact Inquiries'}
            </span>
            {unreadCount > 0 && (
              <Badge variant="accent" size="sm">
                {unreadCount} {isRoman ? 'Naye Paigham' : 'New Unread'}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Website Rabta Paighamat' : 'Contact Form Messages'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Public website ke rabta form se mosool shuda inquiries ka intizam aur WhatsApp reply.'
              : 'Incoming inquiries from the public website contact form with direct WhatsApp outreach.'}
          </p>
        </div>

        <Button
          onClick={loadMessages}
          variant="outline"
          size="sm"
          disabled={loading}
          className="self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {isRoman ? 'Taza Karein' : 'Refresh'}
        </Button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isRoman
                ? 'Naam, phone, email, course ya paigham talaash karein...'
                : 'Search by name, phone, email, course or message...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]/20 focus:border-[#1F3FBF]"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'new', 'read', 'replied', 'archived'] as const).map((st) => {
            const count = st === 'all' ? messages.length : messages.filter((m) => m.status === st).length;
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  active
                    ? 'bg-[#1F3FBF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="capitalize">
                  {st === 'all'
                    ? isRoman
                      ? 'Tamam'
                      : 'All'
                    : st === 'new'
                    ? isRoman
                      ? 'Naye'
                      : 'New'
                    : st === 'read'
                    ? isRoman
                      ? 'Parhay Huay'
                      : 'Read'
                    : st === 'replied'
                    ? isRoman
                      ? 'Jawab Diya'
                      : 'Replied'
                    : isRoman
                    ? 'Archived'
                    : 'Archived'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages List / Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Spinner size="lg" variant="primary" className="mx-auto mb-3" />
          <p className="text-xs text-slate-500">
            {isRoman ? 'Paighamat load ho rahe hain...' : 'Loading inquiries...'}
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">
            {isRoman ? 'Koi paigham dastiyab nahi' : 'No messages found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isRoman
              ? 'Muntakhib kardah filter ya search ke mutabiq koi record nahi mila.'
              : 'No contact inquiries matched your current filter or search criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleOpenDrawer(msg)}
                className={`p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  msg.status === 'new' ? 'bg-blue-50/30 font-medium' : ''
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      msg.status === 'new'
                        ? 'bg-[#1F3FBF] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {msg.fullName[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0F1F5C] truncate">{msg.fullName}</span>
                      {msg.status === 'new' && (
                        <span className="bg-[#1F3FBF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          New
                        </span>
                      )}
                      {msg.status === 'replied' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          Replied
                        </span>
                      )}
                      {msg.status === 'archived' && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          Archived
                        </span>
                      )}
                      {msg.courseInterest && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200/60 text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[180px]">
                          {msg.courseInterest}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{msg.message}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                      {msg.phone && <span>{msg.phone}</span>}
                      {msg.email && <span className="truncate max-w-[180px]">{msg.email}</span>}
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {msg.phone && (
                    <a
                      href={formatWhatsAppUrl(msg.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center transition-colors"
                      title="WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden md:inline">WhatsApp</span>
                    </a>
                  )}
                  {msg.phone && (
                    <a
                      href={`tel:${msg.phone}`}
                      className="p-1.5 rounded-lg bg-blue-50 text-[#1F3FBF] hover:bg-blue-100 text-xs font-semibold flex items-center transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden md:inline">Call</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {drawerOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#1F3FBF] text-white flex items-center justify-center font-bold text-xs">
                    {selectedMessage.fullName[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F1F5C]">{selectedMessage.fullName}</h3>
                    <p className="text-[11px] text-slate-500">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-5">
                {/* Status Badges & Changer */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-600">
                    {isRoman ? 'Mojooda Status:' : 'Current Status:'}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {(['new', 'read', 'replied', 'archived'] as const).map((st) => (
                      <button
                        key={st}
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(selectedMessage.id, st)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          selectedMessage.status === st
                            ? 'bg-[#1F3FBF] text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
                    {selectedMessage.phone ? (
                      <a href={`tel:${selectedMessage.phone}`} className="font-semibold text-[#1F3FBF] hover:underline">
                        {selectedMessage.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email</span>
                    {selectedMessage.email ? (
                      <a href={`mailto:${selectedMessage.email}`} className="font-semibold text-[#1F3FBF] hover:underline truncate block">
                        {selectedMessage.email}
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </div>
                </div>

                {/* Course Interest */}
                {selectedMessage.courseInterest && (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs">
                    <span className="text-amber-800 block text-[10px] uppercase font-semibold flex items-center">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {isRoman ? 'Dilchaspi Ka Course' : 'Interested Course'}
                    </span>
                    <span className="font-bold text-amber-950 mt-0.5 block">{selectedMessage.courseInterest}</span>
                  </div>
                )}

                {/* Full Message */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {isRoman ? 'Paigham Ka Matan' : 'Message Body'}
                  </span>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  {selectedMessage.phone && (
                    <a
                      href={formatWhatsAppUrl(selectedMessage.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4 mr-1.5" />
                      {isRoman ? 'WhatsApp Par Rabta Karein' : 'Reply on WhatsApp'}
                    </a>
                  )}
                  {selectedMessage.phone && (
                    <a
                      href={`tel:${selectedMessage.phone}`}
                      className="py-2 px-3 rounded-lg bg-[#0F1F5C] hover:bg-[#1F3FBF] text-white font-semibold text-xs flex items-center justify-center transition-colors"
                    >
                      <Phone className="w-4 h-4 mr-1.5" />
                      {isRoman ? 'Call' : 'Call'}
                    </a>
                  )}
                </div>

                {/* Admin Internal Notes */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      {isRoman ? 'Androoni Admin Notes' : 'Internal Staff Notes'}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="text-[11px] px-2.5 py-1 h-auto"
                    >
                      {savingNotes ? 'Saving...' : isRoman ? 'Notes Mehfooz Karein' : 'Save Notes'}
                    </Button>
                  </div>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={
                      isRoman
                        ? 'Is talib-e-ilm ya inquiry ke bare mein staff ke androoni notes darj karein...'
                        : 'Add private staff notes regarding phone calls, follow-up or agreements...'
                    }
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]/20 focus:border-[#1F3FBF]"
                  />
                </div>
              </div>
            </div>

            {/* Drawer Footer (Delete for Super Admin) */}
            {isSuperAdmin && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                {deleteConfirmId === selectedMessage.id ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-700 font-semibold">
                      {isRoman ? 'Kiya aap waqai delete karna chahte hain?' : 'Are you sure you want to delete?'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleDelete(selectedMessage.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs border-red-600"
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(selectedMessage.id)}
                    className="w-full py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {isRoman ? 'Paigham Delete Karein (Super Admin)' : 'Delete Message (Super Admin)'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
