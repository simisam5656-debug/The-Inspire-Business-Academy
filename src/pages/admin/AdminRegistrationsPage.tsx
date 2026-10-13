import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import { AdmissionRecord } from '../../types';
import { siteConfig } from '../../config/site';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  FileCheck,
  Search,
  Filter,
  Check,
  X,
  Eye,
  AlertCircle,
  Phone,
  Calendar,
  User,
  GraduationCap,
  ArrowRightCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminRegistrationsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin } = useAuth();

  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'physical' | 'online'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Actions
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [enrolledFee, setEnrolledFee] = useState<number>(siteConfig.physicalPackage.monthlyFee);
  const [batchTitle, setBatchTitle] = useState('Morning Batch A');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAdmissions();
      setAdmissions(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Registrations load nahi ho sakay.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const filteredAdmissions = admissions.filter((a) => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.includes(searchQuery) ||
      (a.guardianName && a.guardianName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || a.admissionType === typeFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleOpenReview = (admission: AdmissionRecord, action: 'approve' | 'reject') => {
    setSelectedAdmission(admission);
    setActionType(action);
    setAdminNotes(action === 'approve' ? 'Documents verified & approved.' : 'Application rejected.');
    setEnrolledFee(
      admission.admissionType === 'physical'
        ? siteConfig.physicalPackage.monthlyFee
        : siteConfig.onlineCourses.defaultPrice
    );
    setBatchTitle(admission.batchPreference || 'Regular Batch');
    setActionError(null);
    setReviewModalOpen(true);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    try {
      setSubmitting(true);
      setActionError(null);

      if (actionType === 'approve') {
        await AdminService.approveAdmissionAndEnroll(
          selectedAdmission,
          enrolledFee,
          batchTitle,
          adminNotes
        );
      } else {
        await AdminService.rejectAdmission(selectedAdmission.id, adminNotes);
      }

      await loadAdmissions();
      setReviewModalOpen(false);
      setSelectedAdmission(null);
    } catch (err: any) {
      setActionError(err?.message || 'Action mukammal karne mein masla pesh aya.');
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
            <FileCheck className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Registrations & Admissions' : 'Registrations & Admissions'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Website ke zariye aane wali dakhla darDarkhwastein (Physical & Online).'
              : 'Review, approve, or reject incoming admission applications.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Badge variant="accent">
            {admissions.filter((a) => a.status === 'pending').length} Pending Review
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Reference No, Naam, ya Phone se talash karein...' : 'Search by reference, name, or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          >
            <option value="all">{isRoman ? 'Dono (Physical & Online)' : 'All Types'}</option>
            <option value="physical">{isRoman ? 'Sirf Physical' : 'Physical Only'}</option>
            <option value="online">{isRoman ? 'Sirf Online' : 'Online Only'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          >
            <option value="all">{isRoman ? 'Tamam Status' : 'All Status'}</option>
            <option value="pending">{isRoman ? 'Pending (Zair-e-Jaiza)' : 'Pending'}</option>
            <option value="approved">{isRoman ? 'Approved (Manzoor)' : 'Approved'}</option>
            <option value="rejected">{isRoman ? 'Rejected (Mustarad)' : 'Rejected'}</option>
          </select>
        </div>
      </div>

      {/* Admissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">{isRoman ? 'Dakhlay load ho rahe hain...' : 'Loading applications...'}</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            {error}
          </div>
        ) : filteredAdmissions.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi dakhla darkhwast nahi mili' : 'No admission requests found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference No</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Course Applied</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Submission Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0F1F5C] whitespace-nowrap">
                      {adm.referenceNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {adm.fullName}
                      {adm.guardianName && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          s/o {adm.guardianName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        size="sm"
                        variant={adm.admissionType === 'physical' ? 'navy' : 'secondary'}
                      >
                        {adm.admissionType === 'physical' ? 'Physical Academy' : 'Online LMS'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{adm.courseTitle}</span>
                      {adm.batchPreference && (
                        <span className="block text-[10px] text-slate-400">{adm.batchPreference}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{adm.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        size="sm"
                        variant={
                          adm.status === 'approved'
                            ? 'accent'
                            : adm.status === 'rejected'
                            ? 'danger'
                            : 'secondary'
                        }
                      >
                        {adm.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      {adm.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleOpenReview(adm, 'approve')}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md font-semibold"
                            title={isRoman ? 'Manzoor Karein' : 'Approve & Enroll'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenReview(adm, 'reject')}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                            title={isRoman ? 'Mustarad Karein' : 'Reject'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSelectedAdmission(adm)}
                          className="p-1.5 text-slate-500 hover:text-[#1F3FBF] hover:bg-slate-100 rounded-md"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review / Decision Modal */}
      {reviewModalOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#0F1F5C] mb-1">
              {actionType === 'approve'
                ? isRoman
                  ? 'Dakhla Manzoori & Student Enrollment'
                  : 'Approve Admission & Enroll Student'
                : isRoman
                ? 'Dakhla Darkhwast Mustarad Karein'
                : 'Reject Admission Request'}
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              Applicant: <span className="font-semibold text-slate-800">{selectedAdmission.fullName}</span> (
              {selectedAdmission.referenceNumber})
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAction} className="space-y-4 text-xs">
              {actionType === 'approve' && selectedAdmission.admissionType === 'physical' && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                  <p className="font-semibold text-[#0F1F5C]">
                    {isRoman
                      ? 'Physical Academy Enrollment Details:'
                      : 'Physical Academy Enrollment Details:'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Total Course Fee (PKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={enrolledFee}
                        onChange={(e) => setEnrolledFee(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Batch Assignment</label>
                      <input
                        type="text"
                        value={batchTitle}
                        onChange={(e) => setBatchTitle(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="Morning Batch A"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRoman
                      ? 'Yeh action student ka physical roll number banaye ga aur academy roster mein shamil kare ga.'
                      : 'This action will automatically generate a student roll number in the physical roster.'}
                  </p>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {isRoman ? 'Admin Note / Waja' : 'Internal Admin Note'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="Record keeping ke liye note darj karein..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewModalOpen(false)}
                  disabled={submitting}
                >
                  {isRoman ? 'Mansookh' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant={actionType === 'approve' ? 'primary' : 'danger'}
                  size="sm"
                  disabled={submitting}
                  className={actionType === 'approve' ? 'bg-[#1F3FBF] hover:bg-[#0F1F5C]' : ''}
                >
                  {submitting
                    ? isRoman
                      ? 'Amal jari hai...'
                      : 'Processing...'
                    : actionType === 'approve'
                    ? isRoman
                      ? 'Manzoor & Dakhil Karein'
                      : 'Confirm & Enroll'
                    : isRoman
                    ? 'Mustarad Karein'
                    : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedAdmission && !reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedAdmission(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#0F1F5C] mb-1">
              Admission Details: {selectedAdmission.referenceNumber}
            </h3>
            <p className="text-slate-500 mb-4">{selectedAdmission.fullName}</p>

            <div className="space-y-2.5">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Course:</span>
                <span className="font-semibold text-slate-800">{selectedAdmission.courseTitle}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-800">{selectedAdmission.phone}</span>
              </div>
              {selectedAdmission.guardianName && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Guardian:</span>
                  <span className="text-slate-800">{selectedAdmission.guardianName}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Status:</span>
                <Badge size="sm">{selectedAdmission.status}</Badge>
              </div>
              {selectedAdmission.adminNotes && (
                <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700">
                  <span className="font-semibold block text-[10px] text-slate-400">Admin Notes:</span>
                  {selectedAdmission.adminNotes}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setSelectedAdmission(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
