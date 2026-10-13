import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { ShortSessionRecord } from '../../types';
import {
  Sparkles,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminShortSessionsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ShortSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ShortSessionRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const list = await CmsService.getShortSessions(false);
      setSessions(list);
    } catch (err: any) {
      console.error('Error fetching short sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const end = new Date();
    end.setDate(end.getDate() + 7);

    setEditingItem({
      title: '',
      titleRomanUrdu: '',
      skillTopic: '',
      description: '',
      descriptionRomanUrdu: '',
      durationDays: 7,
      startDate: today,
      endDate: end.toISOString().split('T')[0],
      fee: 1500,
      freeForEnrolledStudents: true,
      includesCertificate: false, // Strict rule preserved
      eligibilityNotes: 'Free for enrolled physical and online students.',
      isPublished: true,
      displayOrder: sessions.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ShortSessionRecord) => {
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.skillTopic) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Session unwan aur topic darj karna zaroori hai.' : 'Session title and skill topic are required.',
      });
      return;
    }

    setSaving(true);
    try {
      await CmsService.saveShortSession(editingItem, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Short session kamyabi se mehfooz hogaya.' : 'Short session saved successfully.',
      });
      setModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Kharabi pesh aayi.' : 'Failed to save short session.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: ShortSessionRecord) => {
    try {
      await CmsService.saveShortSession({ id: item.id, isPublished: !item.isPublished }, user?.id);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: !item.isPublished ? 'Session published.' : 'Session unpublished.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await CmsService.deleteShortSession(id, user?.id);
      setDeleteConfirmId(null);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Session delete hogaya.' : 'Session deleted.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const filteredItems = sessions.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.skillTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titleRomanUrdu && item.titleRomanUrdu.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Short Sessions & Bootcamps Manager' : 'Short Skill Sessions & Bootcamps'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? '7-roza ya 20-roza tez tareen practical skill bootcamps (Jaise Prompt Engineering, Typing Speed).'
              : 'Manage 7-day or 20-day high-intensity skill sprints and workshops.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRoman ? 'Naya Bootcamp Shamil Karein' : 'New Short Session'}</span>
        </Button>
      </div>

      {/* Business Policy Banner */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#1F3FBF] shrink-0 mt-0.5" />
        <div>
          <strong className="block text-slate-900 font-bold mb-0.5">
            {isRoman ? 'Official Academy Policy: Short Sessions Sanad (Certificate) Shamil Nahi' : 'Academic Policy: Short Sessions Do Not Include Certificates'}
          </strong>
          <span>
            {isRoman
              ? 'Academy policy ke tehat short bootcamps sirf hunar aur practice ke liye hote hain, in par formal digital sanad issue nahi hoti.'
              : 'As per core business rules, short sessions are non-credential skill sprints designed for practice and do not issue graduation certificates.'}
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Session unwan ya skill topic talash karein...' : 'Search session or skill...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1F3FBF] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Spinner size="md" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Loading...' : 'Loading sessions...'}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Short Session Dastiyab Nahi' : 'No Short Sessions Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman ? 'Naya practical bootcamp shamil karein.' : 'Add your first skill bootcamp or sprint.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Title & Topic</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Fee Structure</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.titleRomanUrdu && (
                        <div className="text-[11px] text-slate-500">{item.titleRomanUrdu}</div>
                      )}
                      <div className="text-[11px] text-[#1F3FBF] font-semibold mt-0.5">
                        Skill: {item.skillTopic}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#1F3FBF] font-bold text-xs inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.durationDays} Days
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-600 whitespace-nowrap">
                      <div>{item.startDate}</div>
                      <div>to {item.endDate}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">Rs. {item.fee}</div>
                      {item.freeForEnrolledStudents && (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                          Free for enrolled
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={item.isPublished ? 'success' : 'neutral'} size="sm">
                        {item.isPublished ? (isRoman ? 'Shaya Shuda' : 'Published') : (isRoman ? 'Draft' : 'Draft')}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleTogglePublish(item)}
                          title={item.isPublished ? 'Unpublish' : 'Publish'}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            item.isPublished
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                {isRoman ? 'Session Delete Karein?' : 'Delete Session?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isRoman
                ? 'Kya aap waqai is short session ko delete karna chahte hain?'
                : 'Are you sure you want to delete this short session?'}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                {isRoman ? 'Cancel' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                {isRoman ? 'Delete' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1F3FBF]" />
                {editingItem.id
                  ? isRoman ? 'Session Mein Tabdeeli' : 'Edit Short Session'
                  : isRoman ? 'Naya Bootcamp Shamil Karein' : 'Create Short Session'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Title (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. 7-Day AI Prompt Bootcamp"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Title (Roman Urdu)</label>
                  <input
                    type="text"
                    value={editingItem.titleRomanUrdu || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, titleRomanUrdu: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. 7-Roza AI Prompt Bootcamp"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Skill / Core Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.skillTopic || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, skillTopic: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="e.g. ChatGPT, Midjourney & Upwork Proposals"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Days)</label>
                  <select
                    value={editingItem.durationDays || 7}
                    onChange={(e) => setEditingItem({ ...editingItem, durationDays: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={7}>7 Days Sprint</option>
                    <option value={10}>10 Days Sprint</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={20}>20 Days Intensive</option>
                    <option value={30}>30 Days Masterclass</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fee (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.fee || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, fee: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editingItem.displayOrder || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, displayOrder: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editingItem.startDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={editingItem.endDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, endDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Bootcamp objectives and practical deliverables..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Roman Urdu)</label>
                <textarea
                  rows={2}
                  value={editingItem.descriptionRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, descriptionRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Practical training ki tafseel..."
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.freeForEnrolledStudents !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, freeForEnrolledStudents: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Enrolled tulba ke liye muft sahulat (Free for enrolled students)' : 'Free for currently enrolled students'}
                  </span>
                </label>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isPublished !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Website par foran shaya karein' : 'Publish publicly'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  {isRoman ? 'Cancel' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  className="bg-[#1F3FBF] text-white hover:bg-[#0F1F5C] font-bold"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner size="xs" variant="white" />
                      <span>{isRoman ? 'Save...' : 'Saving...'}</span>
                    </span>
                  ) : (
                    <span>{isRoman ? 'Mehfooz Karein' : 'Save Session'}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
