import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { AnnouncementRecord, AnnouncementCategory, AnnouncementAudience } from '../../types';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Pin,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminAnnouncementsPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile } = useAuth();

  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<AnnouncementRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const items = await CmsService.getAnnouncements(false);
      setAnnouncements(items);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem({
      title: '',
      titleRomanUrdu: '',
      content: '',
      contentRomanUrdu: '',
      category: 'general',
      isPublished: true,
      isPinned: false,
      targetAudience: 'all',
      startDate: new Date().toISOString().split('T')[0],
      displayOrder: announcements.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: AnnouncementRecord) => {
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.content) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Baraye meharbani unwan aur tafseel darj karein.' : 'Please provide title and content.',
      });
      return;
    }

    setSaving(true);
    try {
      await CmsService.saveAnnouncement(editingItem, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Ailan kamyabi se mehfooz hogaya.' : 'Announcement saved successfully.',
      });
      setModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Bachane mein kharabi pesh aayi.' : 'Failed to save announcement.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: AnnouncementRecord) => {
    try {
      await CmsService.saveAnnouncement({ id: item.id, isPublished: !item.isPublished }, user?.id);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: !item.isPublished
          ? isRoman ? 'Ailan shaya kardiya gaya.' : 'Announcement published.'
          : isRoman ? 'Ailan unpublish kardiya gaya.' : 'Announcement unpublished.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await CmsService.deleteAnnouncement(id, user?.id);
      setDeleteConfirmId(null);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Ailan delete kardiya gaya.' : 'Announcement deleted.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const filteredItems = announcements.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titleRomanUrdu && item.titleRomanUrdu.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && item.isPublished) ||
      (statusFilter === 'draft' && !item.isPublished);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Academy Ailanat (Announcements Manager)' : 'Announcements Manager'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Tulba aur public ke liye zaroori ittehad, dakhlay aur imtihani dates control karein.'
              : 'Publish updates, batch openings, and notices to the student portal and public site.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRoman ? 'Naya Ailan Shamil Karein' : 'New Announcement'}</span>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Unwan ya content talash karein...' : 'Search announcements...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1F3FBF] focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Categories' : 'All Categories'}</option>
            <option value="general">General</option>
            <option value="admission">Admission</option>
            <option value="exam">Exam</option>
            <option value="workshop">Workshop</option>
            <option value="holiday">Holiday</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Status' : 'All Status'}</option>
            <option value="published">{isRoman ? 'Shaya Shuda' : 'Published'}</option>
            <option value="draft">{isRoman ? 'Draft / Unpublished' : 'Draft'}</option>
          </select>
        </div>
      </div>

      {/* Announcements Table / Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Spinner size="md" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Ailanat load ho rahe hain...' : 'Loading announcements...'}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Ailan Dastiyab Nahi' : 'No Announcements Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Diye gaye filters ke mutabiq koi ailan mojood nahi.'
              : 'No announcements match your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {item.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 rotate-45" />}
                        <span>{item.title}</span>
                      </div>
                      {item.titleRomanUrdu && (
                        <p className="text-[11px] text-slate-500 truncate">{item.titleRomanUrdu}</p>
                      )}
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{item.content}</p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-[#1F3FBF]">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-600 capitalize">
                        {item.targetAudience.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {item.startDate && <div>Start: {item.startDate}</div>}
                      {item.endDate && <div>End: {item.endDate}</div>}
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
                {isRoman ? 'Ailan Delete Karein?' : 'Delete Announcement?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isRoman
                ? 'Kya aap waqai is ailan ko delete karna chahte hain? Yeh amal wapis nahi liya ja sakta.'
                : 'Are you sure you want to delete this announcement? This action cannot be undone.'}
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
                {isRoman ? 'Delete Karein' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C] flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#1F3FBF]" />
                {editingItem.id
                  ? isRoman ? 'Ailan Mein Tabdeeli' : 'Edit Announcement'
                  : isRoman ? 'Naya Ailan Shamil Karein' : 'Create New Announcement'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="e.g. New Batches Admissions Open"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Title (Roman Urdu)</label>
                  <input
                    type="text"
                    value={editingItem.titleRomanUrdu || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, titleRomanUrdu: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. Naye Batches ke Dakhlay Shuru"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Content (English) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="Detailed announcement content..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Content (Roman Urdu)</label>
                <textarea
                  rows={3}
                  value={editingItem.contentRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, contentRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="Ailan ki mukammal tafseel Roman Urdu mein..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingItem.category || 'general'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="general">General</option>
                    <option value="admission">Admission</option>
                    <option value="exam">Exam</option>
                    <option value="workshop">Workshop</option>
                    <option value="holiday">Holiday</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience</label>
                  <select
                    value={editingItem.targetAudience || 'all'}
                    onChange={(e) => setEditingItem({ ...editingItem, targetAudience: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="all">All (Public + Students)</option>
                    <option value="students">All Enrolled Students</option>
                    <option value="physical_only">Physical Campus Only</option>
                    <option value="online_only">Online Students Only</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editingItem.startDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={editingItem.endDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, endDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isPublished !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Fawri Shaya Karein (Published)' : 'Publish immediately'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isPinned || false}
                    onChange={(e) => setEditingItem({ ...editingItem, isPinned: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Top par Pin Karein' : 'Pin to top'}
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
                      <span>{isRoman ? 'Save ho raha hai...' : 'Saving...'}</span>
                    </span>
                  ) : (
                    <span>{isRoman ? 'Mehfooz Karein' : 'Save Announcement'}</span>
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
