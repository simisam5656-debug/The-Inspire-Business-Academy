import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { AuditLogEntry } from '../../types';
import {
  History,
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Lock,
  Eye,
  X,
  FileText,
  User,
  Shield,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

export const AdminAuditLogPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin } = useAuth();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const list = await CmsService.getAuditLogs({ limit: 150 });
      setLogs(list);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-200 text-center max-w-lg mx-auto mt-8">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {isRoman ? 'Ghair Majaz Dastrasi' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-slate-500">
          {isRoman
            ? 'Security Audit Log sirf Super Admin ke liye makhsoos hai.'
            : 'Security Audit Trail is restricted exclusively to Super Administrators.'}
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityId && log.entityId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.actorRole && log.actorRole.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <History className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'System Security Audit Log' : 'Security Audit Trail'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Tanzimat, ailanat, payments, fees aur managers ke tamam ikhtiyarat ka ghair-qabil-e-tabdeeli record.'
              : 'Immutable chronological ledger of privileged actions, permission changes, and transactions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent">Super Admin Exclusive</Badge>
          <button
            onClick={fetchLogs}
            title="Refresh"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Rule Card */}
      <div className="bg-slate-900 text-white p-4 rounded-xl text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#FFC20E] shrink-0 mt-0.5" />
        <p className="text-slate-300 leading-relaxed">
          {isRoman
            ? 'Qanoon: Audit log records immutable hain. Kisi bhi admin ya manager ko logs delete ya modify karne ki ijazat nahi hai.'
            : 'Immutable Security Principle: Audit trail records are strictly write-once and read-only. No user can delete or tamper with historical entries.'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Action, entity ya ID talash karein...' : 'Search action, entity or ID...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1F3FBF] focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Actions' : 'All Actions'}</option>
            <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
            <option value="CREATE_MANAGER_ACCOUNT">CREATE_MANAGER_ACCOUNT</option>
            <option value="UPDATE_MANAGER_PERMISSIONS">UPDATE_MANAGER_PERMISSIONS</option>
            <option value="DEACTIVATE_MANAGER">DEACTIVATE_MANAGER</option>
            <option value="CREATE_ANNOUNCEMENT">CREATE_ANNOUNCEMENT</option>
            <option value="UPDATE_ANNOUNCEMENT">UPDATE_ANNOUNCEMENT</option>
            <option value="CREATE_FAQ">CREATE_FAQ</option>
            <option value="CREATE_OFFER">CREATE_OFFER</option>
            <option value="CREATE_SHORT_SESSION">CREATE_SHORT_SESSION</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="all">{isRoman ? 'Tamam Entities' : 'All Entities'}</option>
            <option value="site_settings_public">Site Settings</option>
            <option value="profiles">Profiles / Managers</option>
            <option value="manager_permissions">Manager Permissions</option>
            <option value="announcements">Announcements</option>
            <option value="faqs">FAQs</option>
            <option value="testimonials">Testimonials</option>
            <option value="notices">Notices</option>
            <option value="gallery_items">Gallery Items</option>
            <option value="offers">Offers</option>
            <option value="short_sessions">Short Sessions</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Spinner size="md" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">{isRoman ? 'Logs load ho rahe hain...' : 'Loading audit logs...'}</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {isRoman ? 'Koi Audit Log Record Nahi Mila' : 'No Audit Entries Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman ? 'Filter saaf karein ya mukhtalif query darj karein.' : 'Clear search or adjust filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor & Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Entity Identifier</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900">
                        {log.actorName || (log.actorId ? 'Unknown user' : 'System')}
                      </span>
                      <span className="text-[10px] font-semibold text-[#1F3FBF] capitalize block">
                        {log.actorRole.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                        ID: {log.actorId ? log.actorId.slice(0, 8) : 'System'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {log.entity}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500 font-mono">
                      {log.entityId || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#0F1F5C] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1F3FBF]" />
                <span>Audit Entry Details</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">Action:</span>
                <span className="font-mono font-bold text-slate-900">{selectedLog.action}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block">Target Entity:</span>
                <span className="text-slate-900">{selectedLog.entity} ({selectedLog.entityId || 'N/A'})</span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block">Timestamp:</span>
                <span className="text-slate-700">{selectedLog.createdAt}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block">Actor Role & ID:</span>
                <span className="text-slate-700">{selectedLog.actorName ? `${selectedLog.actorName} - ` : ''}{selectedLog.actorRole} ({selectedLog.actorId || 'System'})</span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Metadata / Details:</span>
                <pre className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
