import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import { ExpenseRecord, ExpenseCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  Receipt,
  Plus,
  Search,
  AlertCircle,
  Calendar,
  X,
  TrendingDown,
  DollarSign,
} from 'lucide-react';

export const AdminExpensesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: string;
    notes: string;
    receiptReference: string;
  }>({
    title: '',
    category: 'utilities',
    amount: 1500,
    expenseDate: new Date().toISOString().split('T')[0],
    notes: '',
    receiptReference: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getExpenses();
      setExpenses(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Ikhrajat load nahi ho sakay.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'utilities',
      amount: 1500,
      expenseDate: new Date().toISOString().split('T')[0],
      notes: '',
      receiptReference: '',
    });
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.amount <= 0) {
      setSubmitError('Kharche ka unwan aur raqam lazmi darj karein.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      await AdminService.recordExpense({
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        notes: formData.notes,
        receiptReference: formData.receiptReference,
      });

      await loadExpenses();
      setIsModalOpen(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Kharcha mehfooz karne mein masla pesh aya.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Academy Operational Expenses' : 'Academy Operational Expenses'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Physical Academy Sadiqabad ke intizami ikhrajat (Rent, Bijli, Internet, Stationery) ka hisab.'
              : 'Record and categorize daily campus operational expenses.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
        >
          {isRoman ? 'Naya Kharcha Darj Karein' : 'Record Expense'}
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            {isRoman ? 'Kul Filter Shuda Ikhrajat' : 'Filtered Expenses Total'}
          </span>
          <span className="text-2xl font-black text-rose-800 font-mono">
            Rs. {totalExpenseAmount.toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            {isRoman ? 'Kul Records' : 'Total Expense Entries'}
          </span>
          <span className="text-2xl font-black text-[#0F1F5C] font-mono">
            {filteredExpenses.length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            {isRoman ? 'Ahem Categories' : 'Primary Categories'}
          </span>
          <span className="text-xs text-slate-700 font-medium block mt-1">
            Utilities, Lab Equipment, Stationary, Refreshment
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Unwan ya tafseel se talash...' : 'Search expense...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
        >
          <option value="all">{isRoman ? 'Tamam Categories' : 'All Categories'}</option>
          <option value="utilities">Utilities (Bijli, Net)</option>
          <option value="rent">Rent (Academy Building)</option>
          <option value="lab_equipment">Lab Equipment</option>
          <option value="stationery">Stationery & Printing</option>
          <option value="refreshment">Refreshment / Tea</option>
          <option value="marketing">Marketing & Flex</option>
          <option value="maintenance">Maintenance & Generator</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Expenses List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">{isRoman ? 'Ikhrajat load ho rahe hain...' : 'Loading expenses...'}</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            {error}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi kharcha record nahi mila' : 'No expenses recorded'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Expense Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 font-mono">Amount (PKR)</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Notes / Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {exp.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge size="sm" variant="navy" className="capitalize">
                        {exp.category.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-800 whitespace-nowrap">
                      Rs. {exp.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">{exp.expenseDate}</td>
                    <td className="px-4 py-3 text-slate-600">{exp.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 text-xs">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#0F1F5C] mb-1">
              {isRoman ? 'Naya Kharcha Record Karein' : 'Record Campus Expense'}
            </h3>
            <p className="text-slate-500 mb-4">
              {isRoman
                ? 'Academy ke budget aur accounting register mein kharcha darj karein.'
                : 'Log expenditure for campus maintenance, utilities, or lab upkeep.'}
            </p>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Expense Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PTCL Fiber Net Bill, Whiteboard Markers"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#1F3FBF]"
                  >
                    <option value="utilities">Utilities</option>
                    <option value="rent">Rent</option>
                    <option value="lab_equipment">Lab Equipment</option>
                    <option value="stationery">Stationery</option>
                    <option value="refreshment">Refreshment</option>
                    <option value="marketing">Marketing</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#1F3FBF]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details, receipt reference, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  {isRoman ? 'Mansookh' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
                >
                  {submitting
                    ? isRoman
                      ? 'Mehfooz ho raha hai...'
                      : 'Saving...'
                    : isRoman
                    ? 'Kharcha Save Karein'
                    : 'Save Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
