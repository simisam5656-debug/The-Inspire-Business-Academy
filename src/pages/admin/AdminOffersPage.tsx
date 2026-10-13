import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { OfferRecord } from '../../types';
import {
  Tag,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Percent,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const AdminOffersPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<OfferRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const list = await CmsService.getOffers(false);
      setOffers(list);
    } catch (err: any) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    setEditingItem({
      title: '',
      titleRomanUrdu: '',
      description: '',
      descriptionRomanUrdu: '',
      discountPercentage: 15,
      startDate: today,
      endDate: nextMonth.toISOString().split('T')[0],
      isActive: true,
      bannerMessage: '',
      applicableCourseSlugs: null,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: OfferRecord) => {
    setEditingItem({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.discountPercentage) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Unwan aur discount percentage zaroori hain.' : 'Title and discount percentage are required.',
      });
      return;
    }

    if (editingItem.discountPercentage <= 0 || editingItem.discountPercentage > 100) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Discount 1% se 100% ke darmiyan hona chahiye.' : 'Discount percentage must be between 1 and 100.',
      });
      return;
    }

    setSaving(true);
    try {
      await CmsService.saveOffer(editingItem, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Offer kamyabi se mehfooz hogayi.' : 'Offer saved successfully.',
      });
      setModalOpen(false);
      setEditingItem(null);
      await fetchItems();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Kharabi pesh aayi.' : 'Failed to save offer.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: OfferRecord) => {
    try {
      await CmsService.saveOffer({ id: item.id, isActive: !item.isActive }, user?.id);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: !item.isActive ? 'Offer activated.' : 'Offer deactivated.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await CmsService.deleteOffer(id, user?.id);
      setDeleteConfirmId(null);
      await fetchItems();
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Offer delete hogayi.' : 'Offer deleted.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const filteredItems = offers.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.titleRomanUrdu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Khas Riayatein o Offers Manager' : 'Offers & Discounts Manager'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Course fee par session discount, percentage off aur promotion banners control karein.'
              : 'Configure seasonal promotions, percent discounts, and marketing banners.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRoman ? 'Nayi Offer Shamil Karein' : 'New Offer'}</span>
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

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Offer title ya discount talash karein...' : 'Search offers...'}
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
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Loading...' : 'Loading offers...'}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Offer Mojood Nahi' : 'No Offers Configured'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman ? 'Nayi promotional offer shamil karein.' : 'Add your first promotional discount offer.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Offer Title</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Valid Window</th>
                  <th className="py-3 px-4">Banner Message</th>
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
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.titleRomanUrdu}</div>
                      )}
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{item.description}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs inline-flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {item.discountPercentage}% OFF
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-600 whitespace-nowrap">
                      <div>From: {item.startDate}</div>
                      <div>To: {item.endDate}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500">
                      {item.bannerMessage || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={item.isActive ? 'success' : 'neutral'} size="sm">
                        {item.isActive ? (isRoman ? 'Faal (Active)' : 'Active') : (isRoman ? 'Ghair Faal' : 'Inactive')}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleActive(item)}
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            item.isActive
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                {isRoman ? 'Offer Delete Karein?' : 'Delete Offer?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isRoman
                ? 'Kya aap waqai is offer ko delete karna chahte hain?'
                : 'Are you sure you want to delete this promotional offer?'}
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
                <Tag className="w-5 h-5 text-[#1F3FBF]" />
                {editingItem.id
                  ? isRoman ? 'Offer Mein Tabdeeli' : 'Edit Promotional Offer'
                  : isRoman ? 'Nayi Offer Shamil Karein' : 'Create New Offer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Offer Title (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. Hunarmand Youth Discount"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Title (Roman Urdu)</label>
                  <input
                    type="text"
                    value={editingItem.titleRomanUrdu || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, titleRomanUrdu: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                    placeholder="e.g. Hunarmand Naujawan Riayat"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discount Percentage (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editingItem.discountPercentage || 10}
                    onChange={(e) => setEditingItem({ ...editingItem, discountPercentage: Number(e.target.value) })}
                    className="w-full p-2.5 pl-8 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  />
                  <Percent className="w-4 h-4 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Offer details and terms..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Roman Urdu)</label>
                <textarea
                  rows={2}
                  value={editingItem.descriptionRomanUrdu || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, descriptionRomanUrdu: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Riayat ki sharaait Roman Urdu mein..."
                />
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
                <label className="block font-semibold text-slate-700 mb-1">Promotion Banner Message</label>
                <input
                  type="text"
                  value={editingItem.bannerMessage || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, bannerMessage: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="e.g. Flash Sale: 20% Off till end of month!"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isActive !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded"
                  />
                  <span className="font-semibold text-slate-800">
                    {isRoman ? 'Offer ko faal (Active) rakhein' : 'Offer is active for checkout discounts'}
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
                    <span>{isRoman ? 'Mehfooz Karein' : 'Save Offer'}</span>
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
