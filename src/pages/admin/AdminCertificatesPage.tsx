import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CertificateService } from '../../services/certificateService';
import { AdminService } from '../../services/adminService';
import { CourseService } from '../../services/courseService';
import {
  CertificateRecord,
  PhysicalStudent,
  CourseCMS,
} from '../../types';
import { CertificateView } from '../../components/certificates/CertificateView';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Ban,
  FileCheck2,
  ExternalLink,
  Printer,
  X,
  Save,
  Users,
  GraduationCap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const AdminCertificatesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [physicalStudents, setPhysicalStudents] = useState<PhysicalStudent[]>([]);
  const [courses, setCourses] = useState<CourseCMS[]>([]);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [viewingCert, setViewingCert] = useState<CertificateRecord | null>(null);

  const [showIssuePhysicalModal, setShowIssuePhysicalModal] = useState(false);
  const [physicalForm, setPhysicalForm] = useState({
    studentId: '',
    courseTitle: '',
    score: '',
    grade: '',
  });

  const [showIssueOnlineModal, setShowIssueOnlineModal] = useState(false);
  const [onlineRows, setOnlineRows] = useState<any[]>([]);
  const [onlineSearch, setOnlineSearch] = useState('');

  const openIssueOnline = async () => {
    setMsgError(null);
    setShowIssueOnlineModal(true);
    try {
      setOnlineRows(await CertificateService.getOnlineEnrollmentsForCertificates());
    } catch (err: any) {
      setMsgError(err.message || 'Online students load nahi ho sake.');
    }
  };

  const handleIssueOnline = async (row: any) => {
    setActionLoading(true);
    setMsgError(null);
    try {
      const cert = await CertificateService.issueOnlineCertificateByAdmin({
        userId: row.userId,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        recipientName: row.studentName,
        scorePercentage: row.bestPercentage,
      });
      setMsgSuccess(`Online certificate ${cert.certificateCode || ''} jari ho gaya!`);
      setShowIssueOnlineModal(false);
      await loadData();
    } catch (err: any) {
      setMsgError(err.message || 'Certificate issue karne mein masla aaya.');
    } finally {
      setActionLoading(false);
    }
  };

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingCert, setRevokingCert] = useState<CertificateRecord | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [certs, pStudents, allC] = await Promise.all([
        CertificateService.getAllCertificates({
          status: statusFilter,
          studentType: typeFilter,
        }),
        AdminService.getStudents(),
        CourseService.getAllCourses(),
      ]);
      setCertificates(certs);
      setPhysicalStudents(pStudents);
      setCourses(allC);
    } catch (err) {
      console.error('Error loading certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssuePhysical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!physicalForm.studentId) {
      setMsgError('Physical student select karein.');
      return;
    }
    setActionLoading(true);
    setMsgError(null);
    try {
      const cert = await CertificateService.issuePhysicalCertificate(
        physicalForm.studentId,
        physicalForm.courseTitle || '6-Month Comprehensive Digital Skills Diploma',
        user?.id || 'admin',
        role || 'super_admin',
        physicalForm.score ? Number(physicalForm.score) : undefined,
        physicalForm.grade || undefined
      );

      setMsgSuccess(`Physical certificate ${cert.certificateCode} safalta se jari ho gaya!`);
      setShowIssuePhysicalModal(false);
      setPhysicalForm({ studentId: '', courseTitle: '', score: '', grade: '' });
      await loadData();
    } catch (err: any) {
      setMsgError(err.message || 'Certificate issue karne mein masla aaya.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingCert || !revocationReason.trim()) {
      setMsgError('Revocation reason darj karna lazmi hai.');
      return;
    }
    setActionLoading(true);
    setMsgError(null);
    try {
      await CertificateService.revokeCertificate(
        revokingCert.id,
        revocationReason,
        user?.id || 'admin',
        role || 'super_admin'
      );
      setMsgSuccess(`Certificate ${revokingCert.certificateCode} revoke kar diya gaya.`);
      setShowRevokeModal(false);
      setRevokingCert(null);
      setRevocationReason('');
      await loadData();
    } catch (err: any) {
      setMsgError(err.message || 'Revocation mein masla pesh aaya.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCerts = certificates.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.certificateCode.toLowerCase().includes(q) ||
      c.recipientName.toLowerCase().includes(q) ||
      c.courseTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <SEO
        title={isRoman ? 'Certificates Administration - Admin Dashboard' : 'Certificates Registry - Admin Dashboard'}
        description="Issue, inspect, print, and revoke verified academy graduation credentials."
        canonicalPath="/admin/certificates"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm">
              <Award className="w-3.5 h-3.5 mr-1" />
              <span>Official Registry & Verification</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F1F5C]">
            {isRoman ? 'Sanadat & Credentials Administration' : 'Certificate Registry & Issuance'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isRoman
              ? 'Online aur Physical students ki sanadat jari karein, QR verification check karein, ya revoke karein.'
              : 'Issue, view, print, and revoke authentic graduation credentials with secure QR verification tokens.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={openIssueOnline}
            className="bg-emerald-600 hover:bg-emerald-700 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {isRoman ? 'Online Sanad Jari Karein' : 'Issue Online Certificate'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setPhysicalForm({
                studentId: physicalStudents[0]?.id || '',
                courseTitle: '6-Month Comprehensive Digital Skills Diploma',
                score: '85',
                grade: 'Excellence (A)',
              });
              setShowIssuePhysicalModal(true);
            }}
            className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {isRoman ? 'Physical Sanad Jari Karein' : 'Issue Physical Certificate'}
          </Button>
        </div>
      </div>

      {msgSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{msgSuccess}</span>
          </div>
          <button onClick={() => setMsgSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {msgError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{msgError}</span>
          </div>
          <button onClick={() => setMsgError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg bg-white font-medium"
            >
              <option value="all">Tamam (All)</option>
              <option value="valid">Valid (Tasdeeq Shuda)</option>
              <option value="revoked">Revoked (Mansookh)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Track:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg bg-white font-medium"
            >
              <option value="all">All Tracks</option>
              <option value="online">Online Student</option>
              <option value="physical">Physical Academy</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder={isRoman ? 'Code ya naam talash karein...' : 'Search code, student, course...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code / Serial</th>
                <th className="py-3 px-4">Recipient Name</th>
                <th className="py-3 px-4">Course / Program</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Score / Grade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Spinner size="lg" className="text-[#1F3FBF] mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">Loading certificates...</p>
                  </td>
                </tr>
              ) : filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Koi certificate record nahi mila.
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => {
                  const isRevoked = cert.status === 'revoked';
                  return (
                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F1F5C]">
                        {cert.certificateCode}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{cert.recipientName}</span>
                        {cert.recipientEmail && (
                          <span className="text-[11px] text-slate-400 block">{cert.recipientEmail}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate font-medium">
                        {cert.courseTitle}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            cert.studentType === 'online'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {cert.studentType === 'online' ? 'Online' : 'Physical'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {cert.scorePercentage ? (
                          <span className="font-semibold text-emerald-700">
                            {cert.scorePercentage}% {cert.finalGrade ? `(${cert.finalGrade})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <Badge variant="danger" size="sm">
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Valid
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingCert(cert)}
                            className="text-xs"
                            title="View & Print"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#1F3FBF]" />
                          </Button>

                          <a
                            href={`/verify?code=${cert.certificateCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-[#1F3FBF] transition-colors"
                            title="Public Verification Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {!isRevoked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRevokingCert(cert);
                                setRevocationReason('');
                                setShowRevokeModal(true);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                              title="Revoke Certificate"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW & PRINT CERTIFICATE MODAL */}
      {viewingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#1F3FBF] uppercase tracking-wider">
                  Official Credential Viewer
                </span>
                <h3 className="text-lg font-bold text-[#0F1F5C]">
                  {viewingCert.certificateCode} — {viewingCert.recipientName}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setViewingCert(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CertificateView certificate={viewingCert} showActions={true} />
          </div>
        </div>
      )}

      {/* ISSUE ONLINE CERTIFICATE MODAL */}
      {showIssueOnlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Online Student Ki Sanad Jari Karein' : 'Issue Online Certificate'}
              </h3>
              <button onClick={() => setShowIssueOnlineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Input
              placeholder={isRoman ? 'Student ya course dhoondein...' : 'Search student or course...'}
              value={onlineSearch}
              onChange={(e) => setOnlineSearch(e.target.value)}
            />
            <div className="space-y-2">
              {onlineRows
                .filter((r) =>
                  `${r.studentName} ${r.studentEmail} ${r.courseTitle}`.toLowerCase().includes(onlineSearch.toLowerCase())
                )
                .map((r) => (
                  <div key={`${r.userId}-${r.courseId}`} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{r.studentName}</div>
                      <div className="text-slate-500">{r.studentEmail} · {r.courseTitle}</div>
                      <div className="mt-1">
                        {r.examAttempts === 0
                          ? (isRoman ? 'Final exam abhi nahi diya' : 'No final exam attempt yet')
                          : `${isRoman ? 'Best score' : 'Best score'}: ${r.bestPercentage}% ${r.passedExam ? '✔ pass' : '✘ not passed'}`}
                      </div>
                    </div>
                    {r.existingCertificateCode ? (
                      <Badge variant="success" size="sm">{r.existingCertificateCode}</Badge>
                    ) : (
                      <Button variant="primary" size="sm" disabled={actionLoading} onClick={() => handleIssueOnline(r)} className="bg-[#1F3FBF]">
                        {isRoman ? 'Sanad Jari Karein' : 'Issue'}
                      </Button>
                    )}
                  </div>
                ))}
              {onlineRows.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  {isRoman ? 'Koi enrolled online student nahi mila.' : 'No enrolled online students found.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ISSUE PHYSICAL CERTIFICATE MODAL */}
      {showIssuePhysicalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Physical Student Ki Sanad Jari Karein' : 'Issue Physical Certificate'}
              </h3>
              <button onClick={() => setShowIssuePhysicalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssuePhysical} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Physical Student (Select from Academy Database)
                </label>
                <select
                  value={physicalForm.studentId}
                  onChange={(e) => setPhysicalForm({ ...physicalForm, studentId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  required
                >
                  <option value="">Student Muntakhib Karein...</option>
                  {physicalStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentIdCode || s.phone}) — {s.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course / Diploma Title</label>
                <Input
                  value={physicalForm.courseTitle}
                  onChange={(e) => setPhysicalForm({ ...physicalForm, courseTitle: e.target.value })}
                  placeholder="e.g. 6-Month Complete Freelancing Diploma"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Score (%)</label>
                  <Input
                    type="number"
                    value={physicalForm.score}
                    onChange={(e) => setPhysicalForm({ ...physicalForm, score: e.target.value })}
                    placeholder="e.g. 88"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Grade</label>
                  <Input
                    value={physicalForm.grade}
                    onChange={(e) => setPhysicalForm({ ...physicalForm, grade: e.target.value })}
                    placeholder="e.g. Distinction (A+)"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Jari hone par automatic unique serial code (INSPIRE-CERT-2026-XXXX) aur QR code generate hoga.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowIssuePhysicalModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading} className="bg-[#1F3FBF]">
                  {actionLoading ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Issue Certificate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE CERTIFICATE MODAL */}
      {showRevokeModal && revokingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Certificate Revoke Karein</span>
              </h3>
              <button onClick={() => setShowRevokeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRevokeConfirm} className="space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <p className="font-bold">
                  {revokingCert.certificateCode} — {revokingCert.recipientName}
                </p>
                <p className="text-[11px] mt-1">
                  Revoke hone ke baad public verify page par yeh sanad "Revoked" zahir hogi aur iska tasdeeqi status khatam ho jayega.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Revocation Ki Waja (Mandatory Reason) *
                </label>
                <textarea
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="e.g. Assessment violation, incorrect identity details, or administrative cancelation."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs h-24 focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowRevokeModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {actionLoading ? <Spinner size="sm" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                  Confirm Revocation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
