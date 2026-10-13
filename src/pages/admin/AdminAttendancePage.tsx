import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import { PhysicalStudent, AttendanceStatus, PhysicalAttendanceRecord } from '../../types';
import { OFFICIAL_COURSES } from '../../config/courses';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  CalendarCheck,
  Calendar,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Search,
} from 'lucide-react';

export const AdminAttendancePage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [students, setStudents] = useState<PhysicalStudent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Attendance map: studentId -> { status: AttendanceStatus, notes: string }
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load students and existing attendance for date
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setSaveSuccess(false);

        const [studentsList, existingAttendance] = await Promise.all([
          AdminService.getStudents(),
          AdminService.getAttendanceForDate(selectedDate),
        ]);

        // Only active students get marked
        const activeStudents = studentsList.filter((s) => s.status === 'active');
        setStudents(activeStudents);

        // Pre-fill state from existing attendance or default to 'present'
        const stateMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
        for (const stu of activeStudents) {
          const found = existingAttendance.find((a) => a.studentId === stu.id);
          if (found) {
            stateMap[stu.id] = { status: found.status, notes: found.notes || '' };
          } else {
            stateMap[stu.id] = { status: 'present', notes: '' };
          }
        }
        setAttendanceState(stateMap);
      } catch (err: any) {
        setError(err?.message || 'Hazri ka data load nahi ho saka.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setSaveSuccess(false);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const next: Record<string, { status: AttendanceStatus; notes: string }> = {};
      for (const key of Object.keys(prev)) {
        next[key] = { ...prev[key], status };
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError(null);

      const records = Object.entries(attendanceState).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        notes: data.notes,
      }));

      await AdminService.saveDailyAttendance(selectedDate, records);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message || 'Hazri mehfooz karne mein masla pesh aya.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesCourse = courseFilter === 'all' || s.courseSlug === courseFilter;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentIdCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  // Calculate live stats
  const totalCount = students.length;
  const presentCount = Object.values(attendanceState).filter((a) => a.status === 'present').length;
  const absentCount = Object.values(attendanceState).filter((a) => a.status === 'absent').length;
  const lateCount = Object.values(attendanceState).filter((a) => a.status === 'late').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Physical Academy Daily Attendance' : 'Daily Physical Attendance'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Class hazri register: Har student ki maujoodgi record karein.'
              : 'Mark attendance for active on-campus students in Sadiqabad.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAttendance}
            disabled={saving || loading || students.length === 0}
            leftIcon={<Save className="w-4 h-4" />}
            className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
          >
            {saving
              ? isRoman
                ? 'Save ho raha hai...'
                : 'Saving...'
              : isRoman
              ? 'Hazri Mehfooz Karein'
              : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            {isRoman
              ? `Tareekh ${selectedDate} ki hazri kamyabi se mehfooz kar li gayi hai!`
              : `Attendance for ${selectedDate} has been successfully recorded.`}
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date & Course Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#1F3FBF]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1F3FBF] font-mono"
            />
          </div>

          {/* Course filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          >
            <option value="all">{isRoman ? 'Tamam Classes / Courses' : 'All Classes'}</option>
            {OFFICIAL_COURSES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Batch Marking Actions */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 text-[11px] mr-1">{isRoman ? 'Sab ko mark:' : 'Quick Mark:'}</span>
          <button
            onClick={() => handleMarkAll('present')}
            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-medium text-[11px]"
          >
            All Present
          </button>
          <button
            onClick={() => handleMarkAll('absent')}
            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md font-medium text-[11px]"
          >
            All Absent
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-white p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Students</span>
          <span className="text-lg font-black text-slate-800">{totalCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/20">
          <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Present</span>
          <span className="text-lg font-black text-emerald-700">{presentCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-rose-200 bg-rose-50/20">
          <span className="text-[10px] text-rose-700 font-semibold uppercase block">Absent</span>
          <span className="text-lg font-black text-rose-700">{absentCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/20">
          <span className="text-[10px] text-amber-700 font-semibold uppercase block">Late / Leave</span>
          <span className="text-lg font-black text-amber-700">{lateCount}</span>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              {isRoman ? 'Hazri register khol raha hai...' : 'Opening attendance roster...'}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi active student nahi mila' : 'No active students found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Course / Batch</th>
                  <th className="px-4 py-3 text-center">Attendance Status</th>
                  <th className="px-4 py-3">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const currentStatus = attendanceState[s.id]?.status || 'present';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0F1F5C] whitespace-nowrap">
                        {s.studentIdCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {s.fullName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-800">{s.courseTitle}</span>
                        {s.batchTitle && (
                          <span className="block text-[10px] text-slate-400">{s.batchTitle}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'present')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'absent')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'late')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                              currentStatus === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            L
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'leave')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                              currentStatus === 'leave'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder={isRoman ? 'Koi waja ya remark...' : 'Optional note...'}
                          value={attendanceState[s.id]?.notes || ''}
                          onChange={(e) =>
                            setAttendanceState((prev) => ({
                              ...prev,
                              [s.id]: {
                                ...prev[s.id],
                                notes: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-[#1F3FBF]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
