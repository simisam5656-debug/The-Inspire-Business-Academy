import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { ManagerUserRecord, ManagerPermissionKey } from '../../types';
import {
  UserCheck,
  Shield,
  ShieldAlert,
  Plus,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserX,
  UserCheck2,
  KeyRound,
  X,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

const AVAILABLE_MODULES: { key: ManagerPermissionKey; label: string; desc: string }[] = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Overview metrics and operational summary' },
  { key: 'students', label: 'Physical Students', desc: 'Roster, batch allocations and student profiles' },
  { key: 'registrations', label: 'Registrations', desc: 'Physical and online admission applications' },
  { key: 'attendance', label: 'Attendance', desc: 'Daily computer lab attendance marking' },
  { key: 'fees', label: 'Physical Fees', desc: 'Physical campus fee receipts and collections' },
  { key: 'expenses', label: 'Expenses', desc: 'Campus utility and operational expense tracking' },
  { key: 'courses', label: 'Courses CMS', desc: 'Course catalog, modules and video lessons' },
  { key: 'payments', label: 'Online Payments', desc: 'Transaction slip verification and receipts' },
  { key: 'enrollments', label: 'Online Enrollments', desc: 'LMS student course access management' },
  { key: 'quizzes', label: 'Quizzes & Exams', desc: 'MCQs, exam questions, grading and test limits' },
  { key: 'certificates', label: 'Certificates', desc: 'Issue, view and revoke QR digital credentials' },
  { key: 'announcements', label: 'Announcements', desc: 'Post and manage academy updates' },
  { key: 'faqs', label: 'FAQs', desc: 'Frequently asked questions and answers' },
  { key: 'testimonials', label: 'Testimonials', desc: 'Student reviews and success stories' },
  { key: 'notices', label: 'Notice Ticker', desc: 'Header scrolling alerts and banner notices' },
  { key: 'gallery', label: 'Gallery', desc: 'Campus lab and facility photo management' },
  { key: 'offers', label: 'Offers & Discounts', desc: 'Discount percentages and seasonal promotions' },
  { key: 'reports', label: 'Reports & Analytics', desc: 'View operational and financial reports' },
  { key: 'ai_tools', label: 'AI Services', desc: 'Access to Cloudflare Workers AI editorial and drafting tools' },
  { key: 'messages', label: 'Contact Messages', desc: 'Read and respond to website contact form inquiries' },
  { key: 'chatbot', label: 'AI Chatbot', desc: 'Manage public AI chatbot knowledge base and settings' },
];

export const AdminManagersPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin, user } = useAuth();

  const [managers, setManagers] = useState<ManagerUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ManagerUserRecord | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPerms, setNewPerms] = useState<ManagerPermissionKey[]>([
    'dashboard',
    'students',
    'registrations',
    'attendance',
    'fees',
  ]);
  const [editPerms, setEditPerms] = useState<ManagerPermissionKey[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const list = await CmsService.getManagers();
      setManagers(list);
    } catch (err: any) {
      console.error('Error fetching managers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-200 text-center max-w-lg mx-auto mt-8">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {isRoman ? 'Ghair Majaz Dastrasi (Access Denied)' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {isRoman
            ? 'Managers ki governance sirf Super Admin ke ikhtiyar mein hai.'
            : 'Manager governance and permissions are strictly reserved for Super Administrators.'}
        </p>
      </div>
    );
  }

  const managerCount = managers.filter((m) => m.role === 'manager').length;

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Email aur Mukammal Naam darj karein.' : 'Email and full name are required.',
      });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Password kam az kam 8 huroof par mushtamil hona chahiye.' : 'Password must be at least 8 characters.',
      });
      return;
    }

    if (managerCount >= 4) {
      setStatusMsg({
        type: 'error',
        text: isRoman
          ? 'Qanoon: Academy policy ke tehat zyada se zyada 4 Manager accounts ki ijazat hai.'
          : 'Policy: Maximum 4 Manager accounts allowed under academy governance rules.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await CmsService.createManager(
        {
          email: newEmail,
          fullName: newFullName,
          phone: newPhone || undefined,
          password: newPassword,
          permissions: newPerms,
        },
        user?.id
      );
      setStatusMsg({
        type: 'success',
        text: isRoman
          ? 'Naya Manager account kamyabi se ban gaya aur permissions assign ho gayin.'
          : 'Manager account created and permissions assigned successfully.',
      });
      setCreateModalOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPhone('');
      setNewPassword('');
      await fetchManagers();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Manager banane mein kharabi.' : 'Failed to create manager.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (mgr: ManagerUserRecord) => {
    if (mgr.role === 'super_admin') {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Super Admin account ko deactivate nahi kiya ja sakta.' : 'Super Admin account cannot be deactivated.',
      });
      return;
    }

    try {
      await CmsService.toggleManagerActive(mgr.id, !mgr.isActive, user?.id);
      setStatusMsg({
        type: 'success',
        text: !mgr.isActive
          ? isRoman ? 'Manager account active kardiya gaya.' : 'Manager account activated.'
          : isRoman ? 'Manager account deactivate kardiya gaya.' : 'Manager account deactivated.',
      });
      await fetchManagers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  };

  const handleOpenPermModal = (mgr: ManagerUserRecord) => {
    setSelectedManager(mgr);
    setEditPerms([...mgr.permissions]);
    setPermModalOpen(true);
  };

  const handleSavePerms = async () => {
    if (!selectedManager) return;
    setSubmitting(true);
    try {
      await CmsService.updateManagerPermissions(selectedManager.id, editPerms, user?.id);
      setStatusMsg({
        type: 'success',
        text: isRoman ? 'Permissions kamyabi se update ho gayin.' : 'Permissions updated successfully.',
      });
      setPermModalOpen(false);
      await fetchManagers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update permissions' });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePerm = (key: ManagerPermissionKey) => {
    if (editPerms.includes(key)) {
      setEditPerms(editPerms.filter((k) => k !== key));
    } else {
      setEditPerms([...editPerms, key]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Manager Management & Permissions' : 'Manager Accounts & Module Permissions'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Super Admin governance: Academy ke operations managers (Max 4 accounts) ke ikhtiyarat control karein.'
              : 'Governance console: Configure operations manager accounts (Max 4) and grant module-level access.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={managerCount >= 4 ? 'neutral' : 'accent'}>
            {managerCount} / 4 Managers Active
          </Badge>

          <Button
            variant="primary"
            size="sm"
            disabled={managerCount >= 4}
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#FFC20E] text-[#0F1F5C] font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isRoman ? 'Naya Manager Shamil Karein' : 'New Manager'}</span>
          </Button>
        </div>
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

      {/* Security Governance Rules Banner */}
      <div className="bg-[#0F1F5C] text-white p-5 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-[#FFC20E] font-bold text-xs">
          <Lock className="w-4 h-4" />
          <span>{isRoman ? 'Hifazati Qawaneen (Strict Governance Rules)' : 'Administrative Governance Rules'}</span>
        </div>
        <ul className="text-xs text-slate-200 space-y-1 list-disc pl-4 leading-relaxed">
          <li>
            <strong>Max 4 Managers:</strong> Under academy policy, only 4 operational manager accounts can exist concurrently.
          </li>
          <li>
            <strong>Super Admin Protection:</strong> The Super Admin account can never be deactivated or stripped of authority.
          </li>
          <li>
            <strong>Granular Access:</strong> Managers only access administrative modules explicitly enabled below. Direct API access is guarded.
          </li>
        </ul>
      </div>

      {/* Managers Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-[#0F1F5C]">
          {isRoman ? 'Mojooda Administrative Accounts' : 'Active Administrative Accounts'}
        </h2>

        {loading ? (
          <div className="py-12 text-center">
            <Spinner size="md" variant="primary" />
            <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Accounts load ho rahe hain...' : 'Loading accounts...'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {managers.map((mgr) => (
              <div key={mgr.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{mgr.fullName}</span>
                    <Badge variant={mgr.role === 'super_admin' ? 'accent' : 'primary'} size="sm">
                      {mgr.role === 'super_admin' ? 'Super Admin' : 'Operations Manager'}
                    </Badge>
                    <Badge variant={mgr.isActive ? 'success' : 'neutral'} size="sm">
                      {mgr.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {mgr.email}
                    </span>
                    {mgr.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {mgr.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {mgr.role === 'super_admin' ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold">
                        Unconditional All Modules Access
                      </span>
                    ) : mgr.permissions.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">No modules granted</span>
                    ) : (
                      mgr.permissions.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1F3FBF] text-[10px] font-medium capitalize"
                        >
                          {p.replace('_', ' ')}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {mgr.role !== 'super_admin' && (
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPermModal(mgr)}
                      className="text-xs border-slate-200 hover:bg-slate-50"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />
                      <span>{isRoman ? 'Permissions' : 'Permissions'}</span>
                    </Button>

                    <Button
                      variant={mgr.isActive ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleActive(mgr)}
                      className={`text-xs ${
                        mgr.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {mgr.isActive ? (
                        <>
                          <UserX className="w-3.5 h-3.5 mr-1" />
                          <span>{isRoman ? 'Deactivate' : 'Deactivate'}</span>
                        </>
                      ) : (
                        <>
                          <UserCheck2 className="w-3.5 h-3.5 mr-1" />
                          <span>{isRoman ? 'Activate' : 'Activate'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permissions Modal */}
      {permModalOpen && selectedManager && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F1F5C]">
                  {isRoman ? 'Permissions Tanzimat' : 'Module Permissions Governance'}
                </h3>
                <p className="text-xs text-slate-500">{selectedManager.fullName} ({selectedManager.email})</p>
              </div>
              <button onClick={() => setPermModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {AVAILABLE_MODULES.map((mod) => {
                const isChecked = editPerms.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked ? 'bg-blue-50/50 border-[#1F3FBF]/40' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePerm(mod.key)}
                      className="w-4 h-4 text-[#1F3FBF] rounded mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{mod.label}</span>
                      <span className="text-[11px] text-slate-500">{mod.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setPermModalOpen(false)}>
                {isRoman ? 'Cancel' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={submitting}
                onClick={handleSavePerms}
                className="bg-[#1F3FBF] text-white hover:bg-[#0F1F5C] font-bold"
              >
                {submitting ? 'Saving...' : isRoman ? 'Mehfooz Karein' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Manager Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0F1F5C] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#1F3FBF]" />
                {isRoman ? 'Naya Operations Manager Shamil Karein' : 'Create Operations Manager Account'}
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Manager Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="manager@theinspireacademy.com"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="Operations Staff Name"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="03001234567"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Initial Password <span className="text-red-500">* (Min 8 characters)</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                  placeholder="••••••••"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isRoman
                    ? 'Manager ko login ke liye yeh password faraham karein.'
                    : 'Provide this secure initial password to the manager for admin panel login.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Initial Permissions</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {AVAILABLE_MODULES.slice(0, 10).map((m) => (
                    <label key={m.key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPerms.includes(m.key)}
                        onChange={() => {
                          if (newPerms.includes(m.key)) {
                            setNewPerms(newPerms.filter((k) => k !== m.key));
                          } else {
                            setNewPerms([...newPerms, m.key]);
                          }
                        }}
                        className="w-3.5 h-3.5 text-[#1F3FBF] rounded"
                      />
                      <span className="text-[11px] text-slate-700 capitalize">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                  {isRoman ? 'Cancel' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="bg-[#1F3FBF] text-white hover:bg-[#0F1F5C] font-bold"
                >
                  {submitting ? 'Creating...' : isRoman ? 'Manager Banayein' : 'Create Manager'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
