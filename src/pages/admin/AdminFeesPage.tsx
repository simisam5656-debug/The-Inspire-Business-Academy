import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import { PhysicalStudent, FeePaymentRecord, PaymentMethod } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  CreditCard,
  Plus,
  Search,
  AlertCircle,
  Receipt,
  User,
  Calendar,
  X,
  CheckCircle2,
  DollarSign,
  Printer,
} from 'lucide-react';
import { siteConfig } from '../../config/site';

export const AdminFeesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin } = useAuth();

  const [students, setStudents] = useState<PhysicalStudent[]>([]);
  const [payments, setPayments] = useState<FeePaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'balances' | 'history'>('balances');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(3000);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Printable Fee Receipt
  const [receiptToPrint, setReceiptToPrint] = useState<{
    payment: FeePaymentRecord;
    student: PhysicalStudent;
    remainingBalance: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stuList, payList] = await Promise.all([
        AdminService.getStudents(),
        AdminService.getFeePayments(),
      ]);
      setStudents(stuList);
      setPayments(payList);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Fee data load nahi ho saka.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute student balances map
  const studentBalanceMap = students.map((stu) => {
    const studentPayments = payments.filter((p) => p.studentId === stu.id);
    const paidAmount = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFee = stu.totalFee || 0;
    const remainingAmount = Math.max(0, totalFee - paidAmount);
    return {
      student: stu,
      totalFee,
      paidAmount,
      remainingAmount,
      isFullyPaid: remainingAmount === 0 && totalFee > 0,
    };
  });

  const filteredBalances = studentBalanceMap.filter((item) => {
    const s = item.student;
    return (
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentIdCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
    );
  });

  const handleOpenPayment = (studentId?: string) => {
    setSelectedStudentId(studentId || (students[0]?.id || ''));
    setPaymentAmount(3000);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setReferenceNote('');
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || paymentAmount <= 0) {
      setSubmitError('Sahi student muntakhab karein aur raqam darj karein.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const newPayment = await AdminService.recordFeePayment({
        studentId: selectedStudentId,
        amount: Number(paymentAmount),
        paymentDate,
        paymentMethod,
        referenceNote,
      });

      await loadData();
      setIsModalOpen(false);

      const student = students.find((s) => s.id === selectedStudentId);
      if (student) {
        const studentPayments = [...payments.filter((p) => p.studentId === student.id), newPayment];
        const paid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
        const remaining = Math.max(0, (student.totalFee || 0) - paid);
        setReceiptToPrint({
          payment: newPayment,
          student,
          remainingBalance: remaining,
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Payment record karne mein masla pesh aya.');
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
            <CreditCard className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Physical Academy Fee Management' : 'Physical Academy Fee Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Kul fee, wasool shuda raqam, baqaya jat aur payment receipts ka record.'
              : 'Track student balances, installments, and payment history.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenPayment()}
          disabled={students.length === 0}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
        >
          {isRoman ? 'Nayi Wasooli (Fee) Darj Karein' : 'Record Fee Payment'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'balances'
              ? 'border-[#1F3FBF] text-[#1F3FBF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {isRoman ? 'Students Baqaya Jat (Balances)' : 'Student Balances'} ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-[#1F3FBF] text-[#1F3FBF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {isRoman ? 'Taza Tareen Receipts (History)' : 'Payment History'} ({payments.length})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={isRoman ? 'Student naam, roll no ya phone se talash...' : 'Search student...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
        />
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">{isRoman ? 'Fee ledger khul raha hai...' : 'Loading fee records...'}</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            {error}
          </div>
        ) : activeTab === 'balances' ? (
          /* Balances View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3 font-mono">Total Fee</th>
                  <th className="px-4 py-3 font-mono">Paid Amount</th>
                  <th className="px-4 py-3 font-mono">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalances.map(({ student, totalFee, paidAmount, remainingAmount, isFullyPaid }) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0F1F5C] whitespace-nowrap">
                      {student.studentIdCode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {student.fullName}
                      <span className="block text-[10px] text-slate-400 font-normal">{student.phone}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{student.courseTitle}</td>
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">
                      Rs. {totalFee.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                      Rs. {paidAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">
                      {remainingAmount > 0 ? (
                        <span className="text-amber-700">Rs. {remainingAmount.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">Rs. 0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isFullyPaid ? (
                        <Badge size="sm" variant="accent">
                          Paid Full
                        </Badge>
                      ) : (
                        <Badge size="sm" variant="secondary">
                          Installment Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenPayment(student.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
                      >
                        + Wasooli
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Payment History View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 font-mono">Amount Paid</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Note / Details</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const student = students.find((s) => s.id === p.studentId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F1F5C] whitespace-nowrap">
                        {p.receiptNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {student ? student.fullName : 'Student'}
                        {student && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {student.studentIdCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        Rs. {p.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{p.paymentDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap capitalize">
                        <Badge size="sm" variant="navy">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.referenceNote || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2.5 py-1 h-auto"
                          onClick={() => {
                            if (student) {
                              const studentPayments = payments.filter((item) => item.studentId === student.id);
                              const totalPaid = studentPayments.reduce((acc, item) => acc + item.amount, 0);
                              const remaining = Math.max(0, (student.totalFee || 0) - totalPaid);
                              setReceiptToPrint({
                                payment: p,
                                student,
                                remainingBalance: remaining,
                              });
                            }
                          }}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 inline" />
                          {isRoman ? 'Rasid' : 'Receipt'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
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
              {isRoman ? 'Nayi Fee Payment Record Karein' : 'Record Fee Payment'}
            </h3>
            <p className="text-slate-500 mb-4">
              {isRoman
                ? 'Student ki wasooli register aur ledger mein mehfooz karein.'
                : 'Credit physical fee payment to student balance.'}
            </p>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#1F3FBF]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentIdCode}) - {s.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#1F3FBF]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#1F3FBF]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#1F3FBF]"
                >
                  <option value="cash">Cash (Physical Counter)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Note / Reference (Optional)</label>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="e.g. 2nd Installment / Slip # 452"
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
                    ? 'Payment Save Karein'
                    : 'Save Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl relative border border-slate-300">
            {/* Action Bar (hidden in print) */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1F3FBF]">
                Official Academy Fee Receipt
              </span>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="primary" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print / Save PDF
                </Button>
                <button
                  onClick={() => setReceiptToPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body (Formatted for printing) */}
            <div className="receipt-print-area text-slate-900 border-2 border-slate-800 p-6 rounded-lg bg-white space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <h2 className="text-xl font-black tracking-wider uppercase text-[#0F1F5C]">
                  THE INSPIRE BUSINESS ACADEMY
                </h2>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  {siteConfig.location} | Phone: {siteConfig.phone}
                </p>
                <span className="inline-block px-3 py-0.5 mt-2 text-[10px] font-black uppercase tracking-widest bg-[#0F1F5C] text-[#FFC20E] rounded">
                  FEE PAYMENT RECEIPT
                </span>
              </div>

              {/* Receipt Metadata */}
              <div className="flex justify-between items-center text-xs border-b border-slate-300 pb-2">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Receipt Number</span>
                  <span className="font-mono font-bold text-sm text-[#0F1F5C]">{receiptToPrint.payment.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Payment Date</span>
                  <span className="font-mono font-bold text-slate-900">{receiptToPrint.payment.paymentDate}</span>
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Student Name</span>
                  <span className="font-bold text-slate-900">{receiptToPrint.student.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Student Roll / ID</span>
                  <span className="font-mono font-bold text-slate-900">{receiptToPrint.student.studentIdCode}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase block">Course & Batch</span>
                  <span className="font-semibold text-slate-800">
                    {receiptToPrint.student.courseTitle} ({receiptToPrint.student.batchTitle || 'Regular Batch'})
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase block">Fee Month / Installment Period</span>
                  <span className="font-semibold text-[#0F1F5C]">
                    {new Date(receiptToPrint.payment.paymentDate).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 font-semibold text-[10px] uppercase">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-center">Method</th>
                    <th className="py-2 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200 font-semibold">
                    <td className="py-2.5">
                      Fee Installment
                      {receiptToPrint.payment.referenceNote && (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {receiptToPrint.payment.referenceNote}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-center uppercase font-mono text-[11px]">
                      {receiptToPrint.payment.paymentMethod}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-sm text-[#0F1F5C]">
                      Rs. {receiptToPrint.payment.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Remaining Balance Summary */}
              <div className="flex justify-between items-center text-xs pt-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Total Course Fee:</span>
                  <span className="font-mono text-slate-700">Rs. {receiptToPrint.student.totalFee.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Remaining Balance:</span>
                  <span className="font-mono font-bold text-rose-700">
                    Rs. {receiptToPrint.remainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Signature Line */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div className="text-[10px] text-slate-400">
                  <p>Computer generated receipt.</p>
                  <p>The Inspire Business Academy, Sadiqabad</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-800 mb-1"></div>
                  <span className="text-[10px] font-semibold text-slate-600 uppercase">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
