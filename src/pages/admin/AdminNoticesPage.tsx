import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { NoticeRecord, NoticePriority } from '../../types';
import {
  BellRing,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminNoticesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<NoticeRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const items = await CmsService.getNotices(false);
      setNotices(items);
    } catch (err: any) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem({
      message: '',
      messageRomanUrdu: '',
      linkUrl: '',
      isPublished: true,
      priority: 'normal',
      startDate: new Date().toISOString().split('T')[0],
      displayOrder: notices.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: NoticeRecord) => {
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.message) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Notice message likhna zaroori hai.' : 'Notice message is required.',
      });
      return;
    }

    setSaving(true);
    try {
      await CmsService.saveNotice(editingItem, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Notice kamyabi se mehfooz hogaya.' : 'Notice saved successfully.',
      });
      setModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Kharabi pesh aayi.' : 'Failed to save notice.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: NoticeRecord) => {
    try {
      await CmsService.saveNotice({ id: item.id, isPublished: !item.isPublished }, user?.id);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: !item.isPublished ? 'Notice published.' : 'Notice unpublished.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await CmsService.deleteNotice(id, user?.id);
      setDeleteConfirmId(null);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Notice delete hogaya.' : 'Notice deleted.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const filteredItems = notices.filter(
    (item) =>
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.messageRomanUrdu && item.messageRomanUrdu.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Notice Ticker Manager' : 'Notice Ticker & Alert Manager'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Public website ke top header ticker par chalne wale alerts aur dakhla khabrein.'
              : 'Control scrolling top-bar ticker announcements and emergency notifications.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRoman ? 'Naya Notice Shamil Karein' : 'New Notice'}</span>
        </Button>
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

      {/* Live Preview Bar */}
      <div className="bg-[#0F1F5C] text-white p-3.5 rounded-xl border border-blue-900/40 shadow-sm flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFC20E] text-[#0F1F5C] px-2 py-0.5 rounded-md shrink-0">
          Live Ticker Preview
        </span>
        <div className="text-xs truncate text-blue-100 flex-1">
          {notices.find((n) => n.isPublished)?.message || (isRoman ? 'Koi active notice nahi hai.' : 'No active notices published.')}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Notice message talash karein...' : 'Search notices...'}
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
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Loading...' : 'Loading notices...'}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <BellRing className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Notice Dastiyab Nahi' : 'No Notices Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman ? 'Naya notice shamil karein.' : 'Add your first alert or ticker announcement.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">Order</th>
                  <th className="py-3 px-4">Notice Text</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Link URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {item.displayOrder}
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <div className="font-bold text-slate-900">{item.message}</div>
                      {item.messageRomanUrdu && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.messageRomanUrdu}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          item.priority === 'urgent'
                            ? 'bg-red-50 text-red-700'
                            : item.priority === 'high'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-[#1F3FBF]'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500">
                      {item.linkUrl || '—'}
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
                {isRoman ? 'Notice Delete Karein?' : 'Delete Notice?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isRoman
                ? 'Kya aap waqai is notice ko delete karna chahte hain?'
                : 'Are you sure you want to permanently delete this notice?'}
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C] flex items-center gap-2">
                <BellRing className="w-5 h-5 text-[#1F3FBF]" />
                {editingItem.id
                  ? isRoman ? 'Notice Mein Tabdeeli' : 'Edit Notice'
                  : isRoman ? 'Naya Notice Shamil Karein' : 'Create New Notice'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Message (English) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.message || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, message: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="e.g. New computer lab batch admissions now open in Sadiqabad!"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message (Roman Urdu)</label>
                <textarea
                  rows={2}
                  value={editingItem.messageRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, messageRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="e.g. Sadiqabad campus par naye batches ke dakhlay jari hain!"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editingItem.priority || 'normal'}
                    onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Link URL (Optional)</label>
                <input
                  type="text"
                  value={editingItem.linkUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, linkUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="e.g. /join/physical or https://wa.me/..."
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isPublished !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Public header ticker par foran shaya karein' : 'Publish publicly on ticker'}
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
                    <span>{isRoman ? 'Mehfooz Karein' : 'Save Notice'}</span>
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
