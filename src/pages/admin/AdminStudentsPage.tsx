import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import {
  PhysicalStudent,
  StudentStatus,
  FeePaymentRecord,
  PaymentMethod,
} from '../../types';
import { OFFICIAL_COURSES } from '../../config/courses';
import { siteConfig } from '../../config/site';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  BookOpen,
  Calendar,
  CreditCard,
  MapPin,
  Trash2,
  Printer,
  Receipt,
  Clock,
  CalendarCheck,
  UserCheck,
  UserX,
  FileText,
  DollarSign,
} from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin, user } = useAuth();

  const [students, setStudents] = useState<PhysicalStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Selected Student & Detail View
  const [selectedStudent, setSelectedStudent] = useState<PhysicalStudent | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'fees' | 'attendance'>('profile');

  // Sub-data for Detail View
  const [feeHistory, setFeeHistory] = useState<FeePaymentRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    monthlyPercentage: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    absentDates: string[];
    totalMarked: number;
  } | null>(null);
  const [subDataLoading, setSubDataLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FeePaymentRecord | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{
    payment: FeePaymentRecord;
    student: PhysicalStudent;
    remainingBalance: number;
  } | null>(null);

  // Form State for Student Create / Edit
  const [studentFormData, setStudentFormData] = useState({
    studentIdCode: '',
    fullName: '',
    guardianName: '',
    phone: '',
    whatsapp: '',
    gender: 'male' as 'male' | 'female' | 'other',
    address: '',
    courseSlug: OFFICIAL_COURSES[0].slug,
    courseTitle: OFFICIAL_COURSES[0].title,
    batchTitle: 'Morning Batch A',
    admissionDate: new Date().toISOString().split('T')[0],
    totalFee: 5040 * 6,
    status: 'active' as StudentStatus,
    notes: '',
  });

  // Payment Form State
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 5040,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as PaymentMethod,
    referenceNote: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const list = await AdminService.getStudents();
      setStudents(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message || (isRoman ? 'Students load nahi ho sakay.' : 'Failed to load students.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudentSubData = async (student: PhysicalStudent) => {
    setSubDataLoading(true);
    try {
      const [fees, att] = await Promise.all([
        AdminService.getStudentFeeHistory(student.id),
        AdminService.getStudentAttendanceSummary(student.id),
      ]);
      setFeeHistory(fees);
      setAttendanceSummary(att);
    } catch (err) {
      console.warn('Error loading student sub-data:', err);
    } finally {
      setSubDataLoading(false);
    }
  };

  const handleOpenStudentDetail = (student: PhysicalStudent) => {
    setSelectedStudent(student);
    setDetailTab('profile');
    loadStudentSubData(student);
  };

  const handleStatusChange = async (studentId: string, newStatus: StudentStatus) => {
    try {
      setActionLoading(true);
      const updated = await AdminService.updateStudent(studentId, { status: newStatus });
      if (updated) {
        setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
        if (selectedStudent?.id === studentId) {
          setSelectedStudent(updated);
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAddStudent = () => {
    const codeNum = Math.floor(100 + Math.random() * 900);
    setStudentFormData({
      studentIdCode: `IBA-PHY-2026-${codeNum}`,
      fullName: '',
      guardianName: '',
      phone: '',
      whatsapp: '',
      gender: 'male',
      address: '',
      courseSlug: OFFICIAL_COURSES[0].slug,
      courseTitle: OFFICIAL_COURSES[0].title,
      batchTitle: 'Morning Batch A',
      admissionDate: new Date().toISOString().split('T')[0],
      totalFee: 30240,
      status: 'active',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const newStu = await AdminService.createStudent(studentFormData);
      setStudents((prev) => [newStu, ...prev]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to create student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditProfile = (student: PhysicalStudent) => {
    setStudentFormData({
      studentIdCode: student.studentIdCode,
      fullName: student.fullName,
      guardianName: student.guardianName,
      phone: student.phone,
      whatsapp: student.whatsapp || '',
      gender: student.gender || 'male',
      address: student.address || '',
      courseSlug: student.courseSlug,
      courseTitle: student.courseTitle,
      batchTitle: student.batchTitle || 'Morning Batch A',
      admissionDate: student.admissionDate,
      totalFee: student.totalFee,
      status: student.status,
      notes: student.notes || '',
    });
    setIsEditProfileModalOpen(true);
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      setActionLoading(true);
      const updated = await AdminService.updateStudent(selectedStudent.id, studentFormData);
      if (updated) {
        setStudents((prev) => prev.map((s) => (s.id === selectedStudent.id ? updated : s)));
        setSelectedStudent(updated);
      }
      setIsEditProfileModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update student profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Payment Add / Edit / Delete
  const handleOpenAddPayment = () => {
    setPaymentFormData({
      amount: 5040,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      referenceNote: `Monthly installment - ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    });
    setIsAddPaymentModalOpen(true);
  };

  const handleSaveNewPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      setActionLoading(true);
      const newPayment = await AdminService.recordFeePayment({
        studentId: selectedStudent.id,
        amount: Number(paymentFormData.amount),
        paymentDate: paymentFormData.paymentDate,
        paymentMethod: paymentFormData.paymentMethod,
        referenceNote: paymentFormData.referenceNote,
      });

      const updatedHistory = [newPayment, ...feeHistory];
      setFeeHistory(updatedHistory);
      setIsAddPaymentModalOpen(false);

      // Offer receipt immediately
      const totalPaid = updatedHistory.reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, selectedStudent.totalFee - totalPaid);
      setReceiptToPrint({
        payment: newPayment,
        student: selectedStudent,
        remainingBalance: remaining,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to record fee payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditPayment = (p: FeePaymentRecord) => {
    setEditingPayment(p);
    setPaymentFormData({
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      referenceNote: p.referenceNote || '',
    });
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      setActionLoading(true);
      const updated = await AdminService.updateFeePayment(
        editingPayment.id,
        {
          amount: Number(paymentFormData.amount),
          paymentDate: paymentFormData.paymentDate,
          paymentMethod: paymentFormData.paymentMethod,
          referenceNote: paymentFormData.referenceNote,
        },
        user?.id
      );
      setFeeHistory((prev) => prev.map((p) => (p.id === editingPayment.id ? updated : p)));
      setEditingPayment(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm(isRoman ? 'Kiya aap waqai yeh payment delete karna chahte hain?' : 'Are you sure you want to delete this payment record?')) return;
    try {
      setActionLoading(true);
      await AdminService.deleteFeePayment(paymentId, 'Deleted by staff', user?.id);
      setFeeHistory((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintReceipt = (p: FeePaymentRecord) => {
    if (!selectedStudent) return;
    const totalPaid = feeHistory.reduce((s, item) => s + item.amount, 0);
    const remaining = Math.max(0, selectedStudent.totalFee - totalPaid);
    setReceiptToPrint({
      payment: p,
      student: selectedStudent,
      remainingBalance: remaining,
    });
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      s.fullName.toLowerCase().includes(q) ||
      s.studentIdCode.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.guardianName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || s.courseSlug === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Calculate Fee Summary for Selected Student
  const totalPaid = feeHistory.reduce((sum, p) => sum + p.amount, 0);
  const pendingBalance = selectedStudent ? Math.max(0, selectedStudent.totalFee - totalPaid) : 0;
  const isOverdue = pendingBalance > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F3FBF]">
              {isRoman ? 'Physical Campus Roster' : 'Physical Academy Roster'}
            </span>
            <Badge variant="navy" size="sm">
              {students.length} {isRoman ? 'Dakhil Talba' : 'Total Enrolled'}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Physical Students Intizam' : 'Physical Students Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Computer lab workstation talba, mahana fees, hazri reports aur rasidat.'
              : 'Workstation assignments, payment ledgers, attendance summaries, and printable fee receipts.'}
          </p>
        </div>

        <Button onClick={handleOpenAddStudent} variant="primary" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {isRoman ? 'Naya Student Shamil Karein' : 'Enroll New Student'}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between print:hidden">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isRoman
                ? 'Student ka naam, roll number, phone ya sarparast talaash karein...'
                : 'Search student by name, roll code, phone or guardian...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]/20 focus:border-[#1F3FBF]"
          />
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]/20"
          >
            <option value="all">{isRoman ? 'Tamam Status' : 'All Statuses'}</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
            <option value="left">Left</option>
          </select>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]/20 max-w-[200px] truncate"
          >
            <option value="all">{isRoman ? 'Tamam Courses' : 'All Courses'}</option>
            {OFFICIAL_COURSES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs print:hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">{isRoman ? 'Students load ho rahe hain...' : 'Loading students...'}</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            {error}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi student record nahi mila' : 'No students found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Roll / ID</th>
                  <th className="px-4 py-3">{isRoman ? 'Naam' : 'Student Name'}</th>
                  <th className="px-4 py-3">{isRoman ? 'Sarparast' : 'Guardian'}</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Fee (PKR)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">{isRoman ? 'Iqdaam' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleOpenStudentDetail(s)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-[#0F1F5C] whitespace-nowrap">
                      {s.studentIdCode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {s.fullName}
                      {s.gender && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5 capitalize">
                          ({s.gender})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.guardianName}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{s.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{s.courseTitle}</span>
                      {s.batchTitle && (
                        <span className="block text-[10px] text-slate-400">{s.batchTitle}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      Rs. {s.totalFee.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        size="sm"
                        variant={
                          s.status === 'active'
                            ? 'accent'
                            : s.status === 'completed'
                            ? 'navy'
                            : 'secondary'
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td
                      className="px-4 py-3 text-right whitespace-nowrap space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2.5 py-1 h-auto"
                        onClick={() => handleOpenStudentDetail(s)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-[#1F3FBF]" />
                        {isRoman ? 'Tafseelat' : 'Details'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STUDENT DETAIL DRAWER / MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs print:hidden animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div>
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center font-bold text-lg">
                    {selectedStudent.fullName[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-[#0F1F5C]">{selectedStudent.fullName}</h2>
                      <Badge size="sm" variant={selectedStudent.status === 'active' ? 'accent' : 'secondary'}>
                        {selectedStudent.status}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-slate-500">
                      {selectedStudent.studentIdCode} | {selectedStudent.courseTitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Quick Action Buttons */}
              <div className="p-4 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-semibold text-slate-600">
                  {isRoman ? 'Status Tabdeel Karein:' : 'Change Status:'}
                </span>
                <div className="flex items-center space-x-1.5">
                  {(['active', 'inactive', 'completed', 'left'] as const).map((st) => (
                    <button
                      key={st}
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(selectedStudent.id, st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-colors ${
                        selectedStudent.status === st
                          ? 'bg-[#0F1F5C] text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-slate-200 px-6 flex space-x-6 text-xs font-bold">
                <button
                  onClick={() => setDetailTab('profile')}
                  className={`py-3 border-b-2 transition-colors ${
                    detailTab === 'profile'
                      ? 'border-[#1F3FBF] text-[#1F3FBF]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isRoman ? 'Profile & Maloomaat' : 'Student Profile'}
                </button>
                <button
                  onClick={() => setDetailTab('fees')}
                  className={`py-3 border-b-2 transition-colors ${
                    detailTab === 'fees'
                      ? 'border-[#1F3FBF] text-[#1F3FBF]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isRoman ? 'Fee History & Report' : 'Fee Report & Receipts'} ({feeHistory.length})
                </button>
                <button
                  onClick={() => setDetailTab('attendance')}
                  className={`py-3 border-b-2 transition-colors ${
                    detailTab === 'attendance'
                      ? 'border-[#1F3FBF] text-[#1F3FBF]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isRoman ? 'Hazri (Attendance) Report' : 'Attendance Summary'}
                </button>
              </div>

              {/* Tab 1: Profile View */}
              {detailTab === 'profile' && (
                <div className="p-6 space-y-4 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      {isRoman ? 'Ahem Maloomaat' : 'Personal & Enrollment Details'}
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditProfile(selectedStudent)}
                      className="text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      {isRoman ? 'Profile Edit Karein' : 'Edit Profile'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Walid / Sarparast</span>
                      <span className="font-semibold text-slate-900">{selectedStudent.guardianName}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Phone</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedStudent.phone}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">WhatsApp</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedStudent.whatsapp || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Batch Timing</span>
                      <span className="font-semibold text-slate-900">{selectedStudent.batchTitle || 'Regular Batch'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Dakhla Tareekh</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedStudent.admissionDate}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Kul Package Fee</span>
                      <span className="font-mono font-bold text-slate-900">Rs. {selectedStudent.totalFee.toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedStudent.address && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Address (Sadiqabad)</span>
                      <span className="text-slate-800">{selectedStudent.address}</span>
                    </div>
                  )}

                  {selectedStudent.notes && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <span className="text-[10px] uppercase text-amber-700 font-semibold block">Internal Notes</span>
                      <span>{selectedStudent.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Fees & Payment History */}
              {detailTab === 'fees' && (
                <div className="p-6 space-y-5 text-xs">
                  {/* Fee Overview Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">
                        {isRoman ? 'Kul Fee' : 'Total Course Fee'}
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        Rs. {selectedStudent.totalFee.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase text-emerald-700 font-semibold block mb-0.5">
                        {isRoman ? 'Ada Shuda' : 'Total Paid'}
                      </span>
                      <span className="text-base font-black text-emerald-800 font-mono">
                        Rs. {totalPaid.toLocaleString()}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border ${pendingBalance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${pendingBalance > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        {isRoman ? 'Baqaya (Pending)' : 'Remaining Balance'}
                      </span>
                      <span className={`text-base font-black font-mono ${pendingBalance > 0 ? 'text-rose-800' : 'text-slate-900'}`}>
                        Rs. {pendingBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Add Payment Button */}
                  <div className="flex justify-between items-center pt-2">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      {isRoman ? 'Adaigi Ka Record (Ledger)' : 'Fee Payment History'}
                    </h3>
                    <Button size="sm" variant="primary" onClick={handleOpenAddPayment}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {isRoman ? 'Payment Jama Karein' : 'Record Payment'}
                    </Button>
                  </div>

                  {/* Payment Records Table */}
                  {feeHistory.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 font-medium">{isRoman ? 'Koi fee record nahi mila' : 'No payments recorded yet'}</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 text-[10px] uppercase">
                          <tr>
                            <th className="px-3 py-2.5">Receipt #</th>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Method</th>
                            <th className="px-3 py-2.5">Amount</th>
                            <th className="px-3 py-2.5 text-right">Receipt / Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {feeHistory.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-[#0F1F5C]">{p.receiptNumber}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{p.paymentDate}</td>
                              <td className="px-3 py-2 capitalize font-medium text-slate-700">{p.paymentMethod}</td>
                              <td className="px-3 py-2 font-mono font-bold text-emerald-800">Rs. {p.amount.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right space-x-1">
                                <button
                                  onClick={() => handlePrintReceipt(p)}
                                  className="p-1 rounded text-[#1F3FBF] hover:bg-blue-50"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5 inline" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditPayment(p)}
                                  className="p-1 rounded text-slate-500 hover:bg-slate-100"
                                  title="Edit Payment"
                                >
                                  <Edit2 className="w-3.5 h-3.5 inline" />
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="p-1 rounded text-red-500 hover:bg-red-50"
                                  title="Delete Payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Attendance Summary */}
              {detailTab === 'attendance' && (
                <div className="p-6 space-y-4 text-xs">
                  {subDataLoading ? (
                    <div className="p-10 text-center">
                      <Spinner size="md" variant="primary" className="mx-auto mb-2" />
                      <p className="text-slate-500">{isRoman ? 'Hazri summary load ho rahi hai...' : 'Loading attendance summary...'}</p>
                    </div>
                  ) : attendanceSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Percentage</span>
                          <span className="text-2xl font-black text-[#1F3FBF]">{attendanceSummary.monthlyPercentage}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Present (Hazir)</span>
                          <span className="text-2xl font-black text-emerald-700">{attendanceSummary.presentCount}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] font-bold text-rose-700 uppercase block mb-1">Absent (Ghair-Hazir)</span>
                          <span className="text-2xl font-black text-rose-700">{attendanceSummary.absentCount}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">Leave (Rukhsaat)</span>
                          <span className="text-2xl font-black text-amber-700">{attendanceSummary.leaveCount}</span>
                        </div>
                      </div>

                      {attendanceSummary.absentDates.length > 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                            {isRoman ? 'Ghair-Hazir Tareekhein (Absent Dates)' : 'Recorded Absent Dates'}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {attendanceSummary.absentDates.map((date, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono text-[11px]"
                              >
                                {date}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      {isRoman ? 'Hazri ka koi record nahi mila' : 'No attendance marked yet'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedStudent(null)}>
                {isRoman ? 'Band Karein' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Naya Physical Student Dakhla' : 'Enroll Physical Student'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Student Roll / ID</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.studentIdCode}
                    onChange={(e) => setStudentFormData({ ...studentFormData, studentIdCode: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-[#1F3FBF]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.fullName}
                    onChange={(e) => setStudentFormData({ ...studentFormData, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#1F3FBF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Guardian / Father Name</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.guardianName}
                    onChange={(e) => setStudentFormData({ ...studentFormData, guardianName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#1F3FBF]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="03011234567"
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-[#1F3FBF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Course</label>
                  <select
                    value={studentFormData.courseSlug}
                    onChange={(e) => {
                      const sel = OFFICIAL_COURSES.find((c) => c.slug === e.target.value);
                      setStudentFormData({
                        ...studentFormData,
                        courseSlug: e.target.value,
                        courseTitle: sel?.title || 'Physical Course',
                      });
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#1F3FBF]"
                  >
                    {OFFICIAL_COURSES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Batch</label>
                  <input
                    type="text"
                    value={studentFormData.batchTitle}
                    onChange={(e) => setStudentFormData({ ...studentFormData, batchTitle: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#1F3FBF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Total Fee (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={studentFormData.totalFee}
                    onChange={(e) => setStudentFormData({ ...studentFormData, totalFee: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-[#1F3FBF]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Admission Date</label>
                  <input
                    type="date"
                    required
                    value={studentFormData.admissionDate}
                    onChange={(e) => setStudentFormData({ ...studentFormData, admissionDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-[#1F3FBF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Address in Sadiqabad</label>
                <input
                  type="text"
                  value={studentFormData.address}
                  onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
                  placeholder="Model Town, Sadiqabad"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:border-[#1F3FBF]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Enroll Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Student Profile Edit Karein' : 'Edit Student Profile'}
              </h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Student Roll / ID</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.studentIdCode}
                    onChange={(e) => setStudentFormData({ ...studentFormData, studentIdCode: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.fullName}
                    onChange={(e) => setStudentFormData({ ...studentFormData, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.guardianName}
                    onChange={(e) => setStudentFormData({ ...studentFormData, guardianName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Total Fee (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={studentFormData.totalFee}
                    onChange={(e) => setStudentFormData({ ...studentFormData, totalFee: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Batch Title</label>
                  <input
                    type="text"
                    value={studentFormData.batchTitle}
                    onChange={(e) => setStudentFormData({ ...studentFormData, batchTitle: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={studentFormData.address}
                  onChange={(e) => setStudentFormData({ ...studentFormData, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={studentFormData.notes}
                  onChange={(e) => setStudentFormData({ ...studentFormData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditProfileModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Fee Wasooli Record Karein' : 'Record Fee Payment'}
              </h3>
              <button onClick={() => setIsAddPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  required
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-base text-emerald-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Method</label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="cash">Cash at Campus</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reference / Note</label>
                <input
                  type="text"
                  value={paymentFormData.referenceNote}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNote: e.target.value })}
                  placeholder="e.g. October Fee Installment"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
                  {actionLoading ? 'Recording...' : 'Save & Print Receipt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C]">Edit Fee Payment</h3>
              <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  required
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Method</label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="cash">Cash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reference / Note</label>
                <input
                  type="text"
                  value={paymentFormData.referenceNote}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNote: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingPayment(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : 'Update Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL FEE RECEIPT MODAL */}
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
