'use client';

import { useEffect, useState } from 'react';
import { api, Application, Program } from '@/lib/api';
import PageShell from '@/components/PageShell';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

const APP_STATUSES = [
  '', 'draft', 'submitted', 'under_review', 'shortlisted',
  'interview_scheduled', 'interview_completed', 'offered', 'accepted', 'rejected', 'withdrawn'
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [search, setSearch] = useState('');

  const fetchApplications = async () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterProgram) params.program_id = filterProgram;
    try {
      const data = await api.getApplications(params);
      setApplications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([api.getPrograms(), api.getApplications({})])
      .then(([progs, apps]) => { setPrograms(progs); setApplications(apps); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchApplications();
  }, [filterStatus, filterProgram]);

  const filtered = applications.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.applicant_name?.toLowerCase().includes(q) ||
      a.application_number.toLowerCase().includes(q) ||
      a.program_name?.toLowerCase().includes(q)
    );
  });

  // Stats summary
  const statusCounts: Record<string, number> = {};
  applications.forEach(a => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  return (
    <PageShell
      title="Applications"
      subtitle="Manage admission applications across all programs"
    >
      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        {['submitted', 'under_review', 'shortlisted', 'offered', 'accepted', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`card px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer ${
              filterStatus === status ? 'ring-2 ring-brand-500 shadow-md' : 'hover:shadow-md'
            }`}
          >
            <StatusBadge status={status} />
            <span className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, app number, or program..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-80"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-44">
          <option value="">All Statuses</option>
          {APP_STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="input-field w-56">
          <option value="">All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex-1" />
        <div className="text-sm text-gray-400 self-center">{filtered.length} applications</div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading applications...</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">App No.</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Academics</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Entrance</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map(app => (
                <tr key={app.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/applications/${app.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {app.applicant_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-brand-700 transition-colors">
                        {app.applicant_name || 'Unknown'}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/applications/${app.id}`} className="text-sm text-brand-600 hover:text-brand-800 font-mono">
                      {app.application_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{app.program_name || '-'}</td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-gray-600">
                      {app.twelfth_percentage ? `XII: ${app.twelfth_percentage}%` : '-'}
                    </div>
                    {app.graduation_percentage && (
                      <div className="text-xs text-gray-400">Grad: {app.graduation_percentage}%</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {app.entrance_exam ? (
                      <div className="text-sm text-gray-600">{app.entrance_exam}: {app.entrance_score}</div>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-400">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">No applications found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
