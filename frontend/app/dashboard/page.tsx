'use client';

import { useEffect, useState } from 'react';
import { api, DashboardStats } from '@/lib/api';
import PageShell from '@/components/PageShell';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${accent || 'text-gray-900'}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
    </div>
  );
}

function MiniBar({ data, colorMap }: { data: Record<string, number>; colorMap?: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="text-sm text-gray-400">No data</div>;

  const defaultColors: Record<string, string> = {
    draft: '#dee2e6', submitted: '#748ffc', under_review: '#fcc419',
    shortlisted: '#69db7c', offered: '#b197fc', accepted: '#51cf66',
    rejected: '#ff6b6b', withdrawn: '#adb5bd',
    website: '#748ffc', social_media: '#f783ac', referral: '#69db7c',
    newspaper: '#fcc419', education_fair: '#4ecdc4', walk_in: '#ff922b', other: '#adb5bd',
  };
  const colors = colorMap || defaultColors;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-3">
        {Object.entries(data).filter(([_, v]) => v > 0).map(([key, val]) => (
          <div
            key={key}
            style={{ width: `${(val / total) * 100}%`, backgroundColor: colors[key] || '#adb5bd' }}
            className="transition-all"
            title={`${key}: ${val}`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(data).filter(([_, v]) => v > 0).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[key] || '#adb5bd' }} />
            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="font-medium text-gray-700">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="Dashboard" subtitle="Admissions overview and analytics">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading dashboard...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Leads" value={stats.total_leads} />
            <StatCard label="Applications" value={stats.total_applications} accent="text-brand-700" />
            <StatCard label="Under Review" value={stats.under_review} accent="text-yellow-600" />
            <StatCard label="Offers Made" value={stats.offered} accent="text-purple-600" />
            <StatCard label="Enrolled" value={stats.accepted} accent="text-green-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Applications by Status */}
            <div className="card p-6">
              <h3 style={{ fontFamily: 'var(--font-display)' }} className="font-semibold text-gray-900 mb-4">Applications by Status</h3>
              <MiniBar data={stats.applications_by_status} />
            </div>

            {/* Leads by Source */}
            <div className="card p-6">
              <h3 style={{ fontFamily: 'var(--font-display)' }} className="font-semibold text-gray-900 mb-4">Leads by Source</h3>
              <MiniBar data={stats.leads_by_source} />
            </div>
          </div>

          {/* Applications by Program */}
          <div className="card p-6">
            <h3 style={{ fontFamily: 'var(--font-display)' }} className="font-semibold text-gray-900 mb-4">Applications by Program</h3>
            <div className="space-y-3">
              {Object.entries(stats.applications_by_program).sort(([,a], [,b]) => b - a).map(([prog, count]) => {
                const max = Math.max(...Object.values(stats.applications_by_program));
                return (
                  <div key={prog} className="flex items-center gap-4">
                    <div className="w-48 text-sm text-gray-600 truncate flex-shrink-0">{prog}</div>
                    <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${(count / max) * 100}%`, minWidth: '2rem' }}
                      >
                        <span className="text-[11px] font-semibold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent applications */}
          <div className="card">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h3 style={{ fontFamily: 'var(--font-display)' }} className="font-semibold text-gray-900">Recent Applications</h3>
              <Link href="/applications" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all</Link>
            </div>
            <div className="divide-y divide-surface-100">
              {stats.recent_applications.map(app => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-surface-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {app.applicant_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{app.applicant_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{app.application_number} &middot; {app.program_name}</div>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Programs" value={stats.total_programs} />
            <StatCard label="New Leads" value={stats.new_leads} accent="text-blue-600" />
            <StatCard label="Total Students" value={stats.total_students} accent="text-green-700" />
            <StatCard label="Rejected" value={stats.rejected} accent="text-red-500" />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
