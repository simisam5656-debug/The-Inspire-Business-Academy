import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { GalleryItemRecord, GalleryCategory } from '../../types';
import { getSafeYouTubeEmbedUrl, isSafeHttpsUrl } from '../../utils/url';
import {
  Image as ImageIcon,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Camera,
  Video,
  Play,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ImagePreviewField } from '../../components/ui/ImagePreviewField';

export const AdminGalleryPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [items, setItems] = useState<GalleryItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<GalleryItemRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const list = await CmsService.getGalleryItems(false);
      setItems(list);
    } catch (err: any) {
      console.error('Error fetching gallery:', err);
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
      category: 'campus',
      mediaType: 'image',
      description: '',
      descriptionRomanUrdu: '',
      location: 'Sadiqabad Campus',
      imageUrl: '',
      videoUrl: '',
      altText: '',
      displayOrder: items.length + 1,
      isPublished: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: GalleryItemRecord) => {
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Gallery item ka unwan zaroori hai.' : 'Item title is required.',
      });
      return;
    }

    if (editingItem?.mediaType === 'image' && editingItem?.imageUrl && !isSafeHttpsUrl(editingItem.imageUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Image URL sirf safe HTTPS link hona chahiye.' : 'Image URL must be a valid HTTPS link.',
      });
      return;
    }

    if ((editingItem?.mediaType === 'video' || editingItem?.videoUrl) && editingItem?.videoUrl && !getSafeYouTubeEmbedUrl(editingItem.videoUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Video URL sirf mutamad YouTube link hona chahiye.' : 'Video URL must be a valid YouTube link.',
      });
      return;
    }

    setSaving(true);
    try {
      await CmsService.saveGalleryItem(editingItem, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Gallery item mehfooz hogaya.' : 'Gallery item saved successfully.',
      });
      setModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Kharabi pesh aayi.' : 'Failed to save gallery item.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: GalleryItemRecord) => {
    try {
      await CmsService.saveGalleryItem({ id: item.id, isPublished: !item.isPublished }, user?.id);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: !item.isPublished ? 'Gallery item published.' : 'Gallery item unpublished.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await CmsService.deleteGalleryItem(id, user?.id);
      setDeleteConfirmId(null);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Item delete hogaya.' : 'Gallery item deleted.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.titleRomanUrdu && item.titleRomanUrdu.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && item.isPublished) ||
      (statusFilter === 'draft' && !item.isPublished);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Academy Gallery Manager' : 'Campus Media Gallery Manager'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Sadiqabad campus computer lab, classrooms aur testing sessions ki tasweer manage karein.'
              : 'Upload and manage facility photos, computer lab stations, and workshop sessions.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRoman ? 'Nayi Tasweer Shamil Karein' : 'Add Gallery Item'}</span>
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
            placeholder={isRoman ? 'Gallery unwan talash karein...' : 'Search gallery items...'}
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
            <option value="campus">Campus</option>
            <option value="lab">Computer Lab</option>
            <option value="workshops">Workshops</option>
            <option value="testing">Testing Sessions</option>
            <option value="events">Events</option>
            <option value="students">Students</option>
            <option value="videos">Videos</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Status' : 'All Items'}</option>
            <option value="published">{isRoman ? 'Shaya Shuda' : 'Published'}</option>
            <option value="draft">{isRoman ? 'Draft' : 'Draft'}</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Spinner size="md" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Loading...' : 'Loading gallery items...'}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Tasweer Dastiyab Nahi' : 'No Gallery Items Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman ? 'Nayi campus tasweer ya video shamil karein.' : 'Add campus, computer lab photos or workshop videos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isVideo = item.mediaType === 'video' || item.category === 'videos' || Boolean(item.videoUrl);
            const embedUrl = isVideo ? getSafeYouTubeEmbedUrl(item.videoUrl) : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#1F3FBF]/40 transition-colors"
              >
                {/* Media Preview (Video or Image) */}
                <div className="h-44 bg-slate-900 border-b border-slate-100 flex items-center justify-center relative overflow-hidden group">
                  {isVideo && embedUrl ? (
                    <div className="w-full h-full relative">
                      <iframe
                        src={embedUrl}
                        title={item.title}
                        className="w-full h-full pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-md">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.altText || item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400">
                      {isVideo ? <Video className="w-8 h-8 mx-auto mb-1 text-red-400" /> : <Camera className="w-8 h-8 mx-auto mb-1 opacity-40" />}
                      <span className="text-[11px] font-medium">{item.category.toUpperCase()} {isVideo ? 'VIDEO' : 'PHOTO'}</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant={item.isPublished ? 'success' : 'neutral'} size="sm">
                      {item.isPublished ? (isRoman ? 'Shaya Shuda' : 'Published') : (isRoman ? 'Draft' : 'Draft')}
                    </Badge>
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-semibold tracking-wider uppercase backdrop-blur-xs">
                      {item.category}
                    </span>
                    {isVideo && (
                      <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-bold uppercase">
                        Video
                      </span>
                    )}
                  </div>
                </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  {item.titleRomanUrdu && (
                    <p className="text-[11px] text-slate-500">{item.titleRomanUrdu}</p>
                  )}
                  {item.description && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                    <MapPin className="w-3 h-3" />
                    <span>{item.location || 'Sadiqabad Campus'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Order: {item.displayOrder}</span>

                  <div className="flex items-center gap-1.5">
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                {isRoman ? 'Gallery Item Delete Karein?' : 'Delete Gallery Item?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isRoman
                ? 'Kya aap waqai is media item ko delete karna chahte hain?'
                : 'Are you sure you want to delete this media item?'}
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
                <ImageIcon className="w-5 h-5 text-[#1F3FBF]" />
                {editingItem.id
                  ? isRoman ? 'Gallery Item Mein Tabdeeli' : 'Edit Gallery Item'
                  : isRoman ? 'Nayi Gallery Item Shamil Karein' : 'Add Gallery Item'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
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
                  placeholder="e.g. Modern Computer Lab Setup"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title (Roman Urdu)</label>
                <input
                  type="text"
                  value={editingItem.titleRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, titleRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="e.g. Sadiqabad Campus Computer Lab"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingItem.category || 'campus'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="campus">Campus</option>
                    <option value="lab">Computer Lab</option>
                    <option value="workshops">Workshops</option>
                    <option value="testing">Testing Sessions</option>
                    <option value="events">Events</option>
                    <option value="students">Students</option>
                    <option value="videos">Videos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Media Type</label>
                  <select
                    value={editingItem.mediaType || 'image'}
                    onChange={(e) => setEditingItem({ ...editingItem, mediaType: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="image">Image (Photo)</option>
                    <option value="video">Video (YouTube)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus Location</label>
                  <input
                    type="text"
                    value={editingItem.location || 'Sadiqabad Campus'}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {editingItem.mediaType === 'video' || editingItem.category === 'videos' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    YouTube Video URL (Watch, Shorts, or Embed) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.videoUrl || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, videoUrl: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-xs"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  />
                  {editingItem.videoUrl && getSafeYouTubeEmbedUrl(editingItem.videoUrl) ? (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid YouTube Video
                      </span>
                      <div className="aspect-video max-w-xs rounded-lg overflow-hidden border border-slate-200 bg-black">
                        <iframe
                          src={getSafeYouTubeEmbedUrl(editingItem.videoUrl)!}
                          title="Preview"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : editingItem.videoUrl ? (
                    <p className="text-[10px] text-red-500 mt-1">Please enter a valid YouTube link.</p>
                  ) : null}
                </div>
              ) : (
                <ImagePreviewField
                  label={isRoman ? 'Tasveer ka URL (HTTPS)' : 'Image URL (HTTPS)'}
                  value={editingItem.imageUrl || ''}
                  onChange={(val) => setEditingItem({ ...editingItem, imageUrl: val })}
                  placeholder="https://example.com/gallery/photo-1.jpg"
                  isRoman={isRoman}
                  aspect="video"
                  helpText="Direct HTTPS image link"
                />
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Description of facility or lab station..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Roman Urdu)</label>
                <textarea
                  rows={2}
                  value={editingItem.descriptionRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, descriptionRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Sadiqabad campus lab ki tafseel..."
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

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isPublished !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Public gallery par foran shaya karein' : 'Publish publicly in gallery'}
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
                    <span>{isRoman ? 'Mehfooz Karein' : 'Save Gallery Item'}</span>
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
