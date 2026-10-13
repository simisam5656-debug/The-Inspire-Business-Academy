import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { PaymentService } from '../../services/paymentService';
import { OnlinePaymentRecord, PaymentStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Smartphone,
  Wallet,
  Building,
  RefreshCw,
} from 'lucide-react';

export const AdminOnlinePaymentsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin } = useAuth();

  const [payments, setPayments] = useState<OnlinePaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters: Pending payment | Verified - pending access | Access granted | Access denied | Rejected | All
  type TabFilter = 'pending' | 'verified_pending_access' | 'access_granted' | 'access_denied' | 'rejected' | 'all';
  const [tabFilter, setTabFilter] = useState<TabFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Proof Modal
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<OnlinePaymentRecord | null>(null);
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Verification Confirmation Dialog & Toast
  const [verifyConfirmPayment, setVerifyConfirmPayment] = useState<OnlinePaymentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PaymentService.getOnlinePayments('all');
      setPayments(data);
    } catch (err: any) {
      setError(err?.message || 'Payments load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Calculate Metrics across all loaded records
  const pendingCount = payments.filter((p) => p.paymentStatus === 'pending').length;
  const verifiedCount = payments.filter((p) => p.paymentStatus === 'verified').length;
  const verifiedPendingAccessCount = payments.filter(
    (p) => p.paymentStatus === 'verified' && (!p.accessStatus || p.accessStatus === 'pending')
  ).length;
  const accessGrantedCount = payments.filter(
    (p) => p.paymentStatus === 'verified' && p.accessStatus === 'granted'
  ).length;
  const accessDeniedCount = payments.filter(
    (p) => p.paymentStatus === 'verified' && p.accessStatus === 'denied'
  ).length;
  const rejectedCount = payments.filter((p) => p.paymentStatus === 'rejected').length;
  const totalVerifiedRevenue = payments
    .filter((p) => p.paymentStatus === 'verified')
    .reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.referenceNumber.toLowerCase().includes(query) ||
      p.transactionId.toLowerCase().includes(query) ||
      (p.userName && p.userName.toLowerCase().includes(query)) ||
      (p.userEmail && p.userEmail.toLowerCase().includes(query)) ||
      (p.userPhone && p.userPhone.includes(query)) ||
      p.courseTitle.toLowerCase().includes(query);

    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

    let matchesTab = true;
    if (tabFilter === 'pending') {
      matchesTab = p.paymentStatus === 'pending';
    } else if (tabFilter === 'verified_pending_access') {
      matchesTab = p.paymentStatus === 'verified' && (!p.accessStatus || p.accessStatus === 'pending');
    } else if (tabFilter === 'access_granted') {
      matchesTab = p.paymentStatus === 'verified' && p.accessStatus === 'granted';
    } else if (tabFilter === 'access_denied') {
      matchesTab = p.paymentStatus === 'verified' && p.accessStatus === 'denied';
    } else if (tabFilter === 'rejected') {
      matchesTab = p.paymentStatus === 'rejected';
    }

    return matchesSearch && matchesMethod && matchesTab;
  });

  const handleOpenProof = async (payment: OnlinePaymentRecord) => {
    setSelectedPayment(payment);
    setProofModalOpen(true);
    setProofSignedUrl(null);

    if (payment.screenshotPath) {
      setLoadingProof(true);
      const url = await PaymentService.getPaymentProofSignedUrl(
        payment.screenshotPath,
        payment.id,
        payment.referenceNumber
      );
      setProofSignedUrl(url);
      setLoadingProof(false);
    }
  };

  const handleOpenVerifyModal = (payment: OnlinePaymentRecord) => {
    setVerifyConfirmPayment(payment);
  };

  const handleExecuteVerification = async (
    paymentId: string,
    accessAction: 'grant_now' | 'verify_only' | 'deny',
    adminNotes?: string
  ) => {
    try {
      setSubmittingAction(true);
      setActionMessage(null);
      const res = await PaymentService.verifyPayment(paymentId, adminNotes, accessAction);
      if (res.ok) {
        if (accessAction === 'grant_now') {
          const expDate = res.enrollment?.expiryDate || 'N/A';
          setToastMessage(
            isRoman
              ? `Enrollment activated until ${expDate} (Dakhla faal kar diya gaya hai)`
              : `Enrollment activated until ${expDate}`
          );
        } else if (accessAction === 'verify_only') {
          setToastMessage(
            isRoman
              ? 'Payment verified, access pending (Payment ki tasdeeq ho gayi, rasai baki hai)'
              : 'Payment verified, access pending'
          );
        } else if (accessAction === 'deny') {
          setToastMessage(
            isRoman
              ? 'Payment verified, access denied (Payment tasdeeq shuda, rasai inkaar kar di gayi)'
              : 'Payment verified, access denied'
          );
        }

        setVerifyConfirmPayment(null);
        if (proofModalOpen) setProofModalOpen(false);
        await loadPayments();
      } else {
        alert(res.error || 'Verification failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenReject = (payment: OnlinePaymentRecord) => {
    setSelectedPayment(payment);
    setRejectionReason('Transaction ID or receipt details could not be verified with bank/mobile statement.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      alert(isRoman ? 'Mustarad karne ki waja likhna lazmi hai.' : 'Rejection reason is required.');
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await PaymentService.rejectPayment(selectedPayment.id, rejectionReason.trim());
      if (res.ok) {
        setRejectModalOpen(false);
        setSelectedPayment(null);
        await loadPayments();
      } else {
        alert(res.error || 'Reject failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setSubmittingAction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Online Payments & Fees Verification' : 'Online Payments & Fee Verification'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Online admissions ki JazzCash, Easypaisa aur Bank payments ki verification.'
              : 'Review transaction IDs, proof screenshots, and verify fee receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPayments}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            {isRoman ? 'Refresh Karein' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isRoman ? 'Pending Verifications' : 'Pending Verification'}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {pendingCount > 0 ? (isRoman ? 'Tawajjah darkar hai' : 'Action required') : (isRoman ? 'Sab clear hai' : 'Up to date')}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isRoman ? 'Verified Payments' : 'Verified Transactions'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{verifiedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRoman ? 'Tasdeeq shuda tulba' : 'Active enrollments eligible'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isRoman ? 'Online Revenue' : 'Total Online Revenue'}
            </span>
            <ShieldCheck className="w-4 h-4 text-[#1F3FBF]" />
          </div>
          <p className="text-2xl font-bold text-[#0F1F5C] mt-2">Rs. {totalVerifiedRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRoman ? 'Tasdeeq shuda fees ka majmua' : 'Verified collected fees'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              isRoman
                ? 'Search by TID, Name, Phone, Course...'
                : 'Search by Transaction ID, Name, Phone, Course...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F3FBF]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setTabFilter('pending')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                tabFilter === 'pending' ? 'bg-white text-amber-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRoman ? 'Pending Payment' : 'Pending payment'} {pendingCount > 0 && `(${pendingCount})`}
            </button>
            <button
              onClick={() => setTabFilter('verified_pending_access')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                tabFilter === 'verified_pending_access'
                  ? 'bg-white text-amber-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRoman ? 'Verified - Pending Access' : 'Verified - pending access'}{' '}
              {verifiedPendingAccessCount > 0 && `(${verifiedPendingAccessCount})`}
            </button>
            <button
              onClick={() => setTabFilter('access_granted')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                tabFilter === 'access_granted'
                  ? 'bg-white text-emerald-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRoman ? 'Access Granted' : 'Access granted'} {accessGrantedCount > 0 && `(${accessGrantedCount})`}
            </button>
            <button
              onClick={() => setTabFilter('access_denied')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                tabFilter === 'access_denied'
                  ? 'bg-white text-rose-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRoman ? 'Access Denied' : 'Access denied'} {accessDeniedCount > 0 && `(${accessDeniedCount})`}
            </button>
            <button
              onClick={() => setTabFilter('rejected')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                tabFilter === 'rejected' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRoman ? 'Rejected' : 'Rejected'} {rejectedCount > 0 && `(${rejectedCount})`}
            </button>
            <button
              onClick={() => setTabFilter('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                tabFilter === 'all' ? 'bg-white text-[#0F1F5C] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRoman ? 'Tamam' : 'All'}
            </button>
          </div>

          {/* Payment Method Select */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Methods' : 'All Methods'}</option>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="bank_transfer">Bank IBFT</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="md" className="mx-auto mb-2 text-[#1F3FBF]" />
            <p className="text-xs text-slate-500">{isRoman ? 'Records load ho rahe hain...' : 'Loading payments...'}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi online payment nahi mili' : 'No online payments found'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || tabFilter !== 'all'
                ? isRoman
                  ? 'Diye gaye filter ke mutabiq koi record mojood nahi.'
                  : 'No records matching the selected search or filter criteria.'
                : isRoman
                ? 'Abhi tak website se koi online payment submit nahi hui.'
                : 'No online payment submissions have been received yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Ref / Date</th>
                  <th className="py-3 px-4">Applicant & Phone</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Payment & Transaction ID</th>
                  <th className="py-3 px-4">Amount Snapshot</th>
                  <th className="py-3 px-4 text-center">Proof</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const isPending = p.paymentStatus === 'pending';
                  const isVerified = p.paymentStatus === 'verified';
                  const isRejected = p.paymentStatus === 'rejected';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ref & Date */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="font-mono font-semibold text-[#0F1F5C] block">
                          {p.referenceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </td>

                      {/* Applicant & Phone */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-800">{p.userName || 'Student'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.userPhone || '—'}</div>
                        {p.userEmail && <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{p.userEmail}</div>}
                      </td>

                      {/* Course */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-800">{p.courseTitle}</div>
                        {p.couponCode && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block">
                            Coupon: {p.couponCode}
                          </span>
                        )}
                        {p.requestType && (
                          <span className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono block w-fit mt-1">
                            {p.requestType}
                          </span>
                        )}
                      </td>

                      {/* Payment Method & Transaction ID */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          {p.paymentMethod === 'jazzcash' && <Smartphone className="w-3.5 h-3.5 text-amber-600" />}
                          {p.paymentMethod === 'easypaisa' && <Wallet className="w-3.5 h-3.5 text-emerald-600" />}
                          {p.paymentMethod === 'bank_transfer' && <Building className="w-3.5 h-3.5 text-blue-600" />}
                          <span className="capitalize font-semibold text-slate-700">{p.paymentMethod}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 font-mono text-[11px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded w-fit">
                          <span>{p.transactionId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.transactionId)}
                            title="Copy Transaction ID"
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {p.accountSenderName && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Sender: {p.accountSenderName}
                          </span>
                        )}
                      </td>

                      {/* Amount Snapshot */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="font-bold text-[#0F1F5C] text-sm block">
                          Rs. {p.finalAmount.toLocaleString()}
                        </span>
                        {p.discountAmount > 0 && (
                          <span className="text-[10px] text-slate-400 block line-through">
                            Base: Rs. {p.basePrice.toLocaleString()} (-{p.discountAmount})
                          </span>
                        )}
                      </td>

                      {/* Proof */}
                      <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                        {p.screenshotPath ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenProof(p)}
                            leftIcon={<Eye className="w-3 h-3" />}
                            className="text-xs py-1 px-2"
                          >
                            {isRoman ? 'Proof' : 'Proof'}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No File</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-top whitespace-nowrap space-y-1">
                        {isPending && (
                          <Badge variant="accent" size="sm">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending Payment
                          </Badge>
                        )}
                        {isVerified && (!p.accessStatus || p.accessStatus === 'pending') && (
                          <Badge variant="accent" size="sm" className="bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 mr-1 text-amber-700" />
                            Verified - Pending Access
                          </Badge>
                        )}
                        {isVerified && p.accessStatus === 'granted' && (
                          <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Access Granted
                          </Badge>
                        )}
                        {isVerified && p.accessStatus === 'denied' && (
                          <Badge variant="danger" size="sm" className="bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                            Access Denied
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="danger" size="sm">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {p.verifiedAt && (
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(p.verifiedAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        {isPending && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenVerifyModal(p)}
                              disabled={submittingAction}
                              leftIcon={<CheckCircle2 className="w-3 h-3" />}
                              className="text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              {isRoman ? 'Verify' : 'Verify'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReject(p)}
                              disabled={submittingAction}
                              leftIcon={<XCircle className="w-3 h-3" />}
                              className="text-xs py-1 px-2 text-rose-600 hover:bg-rose-50 border-rose-200"
                            >
                              {isRoman ? 'Reject' : 'Reject'}
                            </Button>
                          </div>
                        )}
                        {isVerified && (!p.accessStatus || p.accessStatus === 'pending') && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleExecuteVerification(p.id, 'grant_now')}
                              disabled={submittingAction}
                              leftIcon={<CheckCircle2 className="w-3 h-3" />}
                              className="text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold"
                            >
                              {isRoman ? 'Rasai Dain' : 'Grant access'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExecuteVerification(p.id, 'deny')}
                              disabled={submittingAction}
                              leftIcon={<XCircle className="w-3 h-3 text-rose-600" />}
                              className="text-xs py-1 px-2 text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              {isRoman ? 'Inkaar' : 'Deny access'}
                            </Button>
                          </div>
                        )}
                        {isVerified && p.accessStatus === 'denied' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExecuteVerification(p.id, 'grant_now')}
                              disabled={submittingAction}
                              leftIcon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              className="text-xs py-1 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
                            >
                              {isRoman ? 'Rasai Dain' : 'Grant access'}
                            </Button>
                          </div>
                        )}
                        {isVerified && p.accessStatus === 'granted' && (
                          <span className="text-emerald-700 font-bold text-xs inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isRoman ? 'Access Faal' : 'Active'}</span>
                          </span>
                        )}
                        {isRejected && (
                          <span
                            className="text-rose-600 text-xs italic block max-w-[160px] truncate ml-auto"
                            title={p.rejectionReason}
                          >
                            {p.rejectionReason || 'Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Payment Proof Screenshot */}
      {proofModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1F3FBF]" />
                  {isRoman ? 'Payment Screenshot Proof' : 'Payment Proof Screenshot'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  TID: {selectedPayment.transactionId} · {selectedPayment.referenceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-slate-900/5 min-h-[260px]">
              {loadingProof ? (
                <div className="text-center p-8">
                  <Spinner size="md" className="mx-auto mb-2 text-[#1F3FBF]" />
                  <p className="text-xs text-slate-500">
                    {isRoman ? 'Private file load ho rahi hai...' : 'Loading private proof...'}
                  </p>
                </div>
              ) : proofSignedUrl ? (
                <div className="text-center">
                  <img
                    src={proofSignedUrl}
                    alt="Payment Proof Receipt"
                    className="max-h-[500px] w-auto mx-auto rounded-lg shadow-md border border-slate-200 object-contain"
                  />
                  <a
                    href={proofSignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1F3FBF] hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {isRoman ? 'Bari tasveer new tab mein dekhein' : 'Open full resolution image'}
                  </a>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  <AlertCircle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                  {isRoman
                    ? 'Screenshot preview dastiyab nahi hai ya private link expire ho chuka hai.'
                    : 'Screenshot preview is unavailable or access expired.'}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-600">
                Amount: <strong>Rs. {selectedPayment.finalAmount.toLocaleString()}</strong> ({selectedPayment.paymentMethod})
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setProofModalOpen(false)}>
                  {isRoman ? 'Band Karein' : 'Close'}
                </Button>
                {selectedPayment.paymentStatus === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenVerifyModal(selectedPayment)}
                    isLoading={submittingAction}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isRoman ? 'Verify Kar Dein' : 'Confirm & Verify'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Payment Reason */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-5">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              {isRoman ? 'Payment Reject Karein' : 'Reject Payment'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              TID: {selectedPayment.transactionId} · {selectedPayment.userName} (Rs. {selectedPayment.finalAmount})
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRoman ? 'Waja / Reason (Student ke record ke liye)' : 'Rejection Reason'}
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F3FBF]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                  {isRoman ? 'Cancel' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingAction}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {isRoman ? 'Reject Confirm Karein' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Verification Action Confirmation */}
      {verifyConfirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isRoman ? 'Payment Verification & Rasai Action' : 'Payment Verification & Access Grant'}
                </h3>
                <p className="text-xs text-slate-500">
                  {verifyConfirmPayment.userName} · {verifyConfirmPayment.courseTitle} (Rs. {verifyConfirmPayment.finalAmount.toLocaleString()})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-800">{verifyConfirmPayment.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono text-slate-700">{verifyConfirmPayment.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-medium capitalize text-slate-800">{verifyConfirmPayment.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-slate-700">
                {isRoman ? 'Rasai (Access) ka intekhab karein:' : 'Choose access provisioning action:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleExecuteVerification(verifyConfirmPayment.id, 'grant_now')}
                  disabled={submittingAction}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {isRoman ? 'Verify + Rasai Dain' : 'Verify & Grant'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecuteVerification(verifyConfirmPayment.id, 'verify_only')}
                  disabled={submittingAction}
                  className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {isRoman ? 'Sirf Verify Karein' : 'Verify Only'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecuteVerification(verifyConfirmPayment.id, 'deny')}
                  disabled={submittingAction}
                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  {isRoman ? 'Verify + Inkaar' : 'Verify & Deny'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVerifyConfirmPayment(null)}
                disabled={submittingAction}
              >
                {isRoman ? 'Mansookh (Cancel)' : 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
