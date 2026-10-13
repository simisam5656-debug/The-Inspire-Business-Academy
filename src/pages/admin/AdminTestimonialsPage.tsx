import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { TestimonialRecord } from '../../types';
import { isSafeHttpsUrl } from '../../utils/url';
import {
  MessageSquareQuote,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminTestimonialsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<TestimonialRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const items = await CmsService.getTestimonials(false);
      setTestimonials(items);
    } catch (err: any) {
      console.error('Error fetching testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem({
      studentName: '',
      studentCity: 'Sadiqabad',
      courseTitle: '',
      avatarUrl: '',
      testimonialText: '',
      testimonialTextRomanUrdu: '',
      rating: 5,
      isApproved: true,
      isFeatured: false,
      displayOrder: testimonials.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: TestimonialRecord) => {
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.studentName || !editingItem?.testimonialText) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Talib-e-ilm ka naam aur raaye ka matan zaroori hain.' : 'Student name and feedback text are required.',
      });
      return;
    }

    if (editingItem?.avatarUrl && !isSafeHttpsUrl(editingItem.avatarUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Avatar URL sirf safe HTTPS link hona chahiye.' : 'Avatar URL must be a valid HTTPS image link.',
      });
      return;
    }

    setSaving(true);
    try {
      await CmsService.saveTestimonial(editingItem, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Raaye kamyabi se mehfooz hogayi.' : 'Testimonial saved successfully.',
      });
      setModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Kharabi pesh aayi.' : 'Failed to save testimonial.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApproved = async (item: TestimonialRecord) => {
    try {
      await CmsService.saveTestimonial({ id: item.id, isApproved: !item.isApproved }, user?.id);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: !item.isApproved ? 'Testimonial approved & published.' : 'Testimonial unapproved.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await CmsService.deleteTestimonial(id, user?.id);
      setDeleteConfirmId(null);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Testimonial delete hogaya.' : 'Testimonial deleted.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const filteredItems = testimonials.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.testimonialText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.courseTitle && item.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.studentCity && item.studentCity.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && item.isApproved) ||
      (statusFilter === 'pending' && !item.isApproved);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Tulba Raaye Manager (Testimonials)' : 'Student Testimonials Manager'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Tasdeeq shuda tulba ki feedback, rating aur course delivery reviews manage karein.'
              : 'Approve, feature, and manage authentic student reviews and feedback.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRoman ? 'Nayi Raaye Shamil Karein' : 'Add Testimonial'}</span>
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
            placeholder={isRoman ? 'Talib-e-ilm ka naam ya course talash karein...' : 'Search student or course...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1F3FBF] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Status' : 'All Testimonials'}</option>
            <option value="approved">{isRoman ? 'Approved (Shaya Shuda)' : 'Approved & Published'}</option>
            <option value="pending">{isRoman ? 'Under Review' : 'Under Review'}</option>
          </select>
        </div>
      </div>

      {/* Testimonials List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Spinner size="md" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Loading...' : 'Loading testimonials...'}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <MessageSquareQuote className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Testimonial Dastiyab Nahi' : 'No Testimonials Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Tasdeeq shuda tulba ki feedback shamil karein.'
              : 'Add authentic verified reviews to showcase student success.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-[#1F3FBF]/30 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.studentName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1F3FBF] flex items-center justify-center font-bold text-xs">
                        {item.studentName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{item.studentName}</h4>
                      <p className="text-[11px] text-slate-500">{item.studentCity || 'Sadiqabad'}</p>
                    </div>
                  </div>

                  <Badge variant={item.isApproved ? 'success' : 'neutral'} size="sm">
                    {item.isApproved ? (isRoman ? 'Approved' : 'Approved') : (isRoman ? 'Pending' : 'Pending')}
                  </Badge>
                </div>

                {item.courseTitle && (
                  <div className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[#0F1F5C] text-[10px] font-semibold">
                    {item.courseTitle}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic line-clamp-4">
                  "{item.testimonialText}"
                </p>

                {item.testimonialTextRomanUrdu && (
                  <p className="text-[11px] text-slate-500 italic line-clamp-3 border-t border-slate-100 pt-2">
                    "{item.testimonialTextRomanUrdu}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Order: {item.displayOrder}</span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleApproved(item)}
                    title={item.isApproved ? 'Unapprove' : 'Approve'}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      item.isApproved
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {item.isApproved ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                {isRoman ? 'Testimonial Delete Karein?' : 'Delete Testimonial?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isRoman
                ? 'Kya aap waqai is student review ko delete karna chahte hain?'
                : 'Are you sure you want to delete this student review?'}
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
                <MessageSquareQuote className="w-5 h-5 text-[#1F3FBF]" />
                {editingItem.id
                  ? isRoman ? 'Testimonial Mein Tabdeeli' : 'Edit Testimonial'
                  : isRoman ? 'Naya Testimonial Shamil Karein' : 'Add Student Testimonial'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.studentName || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, studentName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. Muhammad Usman"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / Location</label>
                  <input
                    type="text"
                    value={editingItem.studentCity || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, studentCity: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. Sadiqabad"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Associated Course</label>
                <input
                  type="text"
                  value={editingItem.courseTitle || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, courseTitle: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="e.g. Graphic Design Mastery"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Avatar Image URL (HTTPS)</label>
                <input
                  type="url"
                  value={editingItem.avatarUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, avatarUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="https://example.com/student-photo.jpg"
                />
                {editingItem.avatarUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={editingItem.avatarUrl}
                      alt="Avatar Preview"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-500">Avatar preview active</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Testimonial Text (English) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingItem.testimonialText || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, testimonialText: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="Student review text..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Testimonial Text (Roman Urdu)</label>
                <textarea
                  rows={3}
                  value={editingItem.testimonialTextRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, testimonialTextRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="Tulba feedback Roman Urdu mein..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rating (Stars)</label>
                  <select
                    value={editingItem.rating || 5}
                    onChange={(e) => setEditingItem({ ...editingItem, rating: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                    <option value={3}>⭐⭐⭐ (3 Stars)</option>
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

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isApproved !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isApproved: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Tasdeeq Shuda (Approved & Public)' : 'Approve & Publish publicly'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isFeatured || false}
                    onChange={(e) => setEditingItem({ ...editingItem, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Homepage par Feature Karein' : 'Feature on homepage'}
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
                    <span>{isRoman ? 'Mehfooz Karein' : 'Save Testimonial'}</span>
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
