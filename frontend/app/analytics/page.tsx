'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`} style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color }: { data: any[]; labelKey: string; valueKey: string; color: string }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-500 truncate flex-shrink-0 text-right">{d[labelKey]}</div>
          <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
            <div className={`h-full ${color} rounded-full flex items-center justify-end pr-2 transition-all`}
              style={{ width: `${Math.max((d[valueKey] / max) * 100, 5)}%` }}>
              <span className="text-[10px] font-bold text-white">{d[valueKey]}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <PageShell title="Analytics" subtitle="Loading...">
      <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading analytics...</div></div>
    </PageShell>
  );

  if (!data) return (
    <PageShell title="Analytics">
      <div className="card p-12 text-center text-gray-400">Unable to load analytics. Run seed script first.</div>
    </PageShell>
  );

  const funnelEntries = Object.entries(data.admissions_funnel).filter(([_, v]) => (v as number) > 0);

  return (
    <PageShell title="Analytics & Reports" subtitle="Cross-module insights across the entire ERP">
      <div className="space-y-6">
        {/* Top-level KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Conversion Rate" value={`${data.conversion_rate}%`} sub="Lead to Admitted" color="text-brand-700" />
          <MetricCard label="Avg SGPA" value={data.avg_sgpa} sub="All students" color={data.avg_sgpa >= 7 ? 'text-green-600' : 'text-orange-600'} />
          <MetricCard label="Attendance" value={`${data.attendance_avg}%`} color={data.attendance_avg >= 75 ? 'text-green-600' : 'text-red-600'} />
          <MetricCard label="Fee Collection" value={`${data.fee_collection_rate}%`} sub={`₹${(data.total_revenue / 100000).toFixed(1)}L collected`} color={data.fee_collection_rate >= 80 ? 'text-green-600' : 'text-orange-600'} />
          <MetricCard label="Placement Rate" value={`${data.placement_rate}%`} sub={`Avg ₹${data.avg_package_lpa}L`} color={data.placement_rate >= 70 ? 'text-green-600' : 'text-orange-600'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admissions Funnel */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Admissions Pipeline</h3>
            <div className="space-y-2">
              {funnelEntries.map(([status, count], i) => {
                const maxVal = Math.max(...funnelEntries.map(([_, v]) => v as number));
                const width = Math.max(((count as number) / maxVal) * 100, 8);
                const colors = ['bg-blue-400', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-400', 'bg-purple-500', 'bg-purple-400', 'bg-green-500', 'bg-green-600', 'bg-red-500', 'bg-gray-400'];
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-500 capitalize text-right">{status.replace(/_/g, ' ')}</div>
                    <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} rounded-full flex items-center justify-end pr-2`}
                        style={{ width: `${width}%` }}>
                        <span className="text-[10px] font-bold text-white">{count as number}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead Conversion Funnel */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Lead Funnel</h3>
            <div className="space-y-3">
              {data.lead_conversion_funnel.map((stage: any, i: number) => {
                const max = data.lead_conversion_funnel[0]?.count || 1;
                const width = Math.max((stage.count / max) * 100, 5);
                return (
                  <div key={i} className="text-center">
                    <div className="mx-auto rounded-lg h-10 flex items-center justify-center text-white text-sm font-semibold bg-brand-500 transition-all"
                      style={{ width: `${width}%`, minWidth: '80px', opacity: 1 - (i * 0.12) }}>
                      {stage.count}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stage.stage}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Program-wise SGPA */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Program-wise SGPA</h3>
            {data.program_wise_sgpa.length > 0 ? (
              <div className="space-y-3">
                {data.program_wise_sgpa.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-16 text-xs font-mono text-brand-600 font-semibold">{p.code}</div>
                    <div className="flex-1 bg-surface-100 rounded-full h-4 overflow-hidden">
                      <div className={`h-full rounded-full ${p.avg_sgpa >= 7.5 ? 'bg-green-500' : p.avg_sgpa >= 6 ? 'bg-blue-500' : 'bg-orange-500'}`}
                        style={{ width: `${(p.avg_sgpa / 10) * 100}%` }} />
                    </div>
                    <div className="text-sm font-bold text-gray-700 w-10 text-right">{p.avg_sgpa}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No SGPA data yet.</div>
            )}
          </div>

          {/* Monthly Application Trend */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Monthly Applications</h3>
            {data.monthly_applications.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {data.monthly_applications.map((m: any, i: number) => {
                  const max = Math.max(...data.monthly_applications.map((x: any) => x.count));
                  const height = Math.max((m.count / max) * 100, 5);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end">
                      <div className="text-[10px] font-semibold text-gray-700 mb-1">{m.count}</div>
                      <div className="w-full bg-brand-500 rounded-t transition-all" style={{ height: `${height}%` }} />
                      <div className="text-[10px] text-gray-400 mt-1">{m.month}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No data yet.</div>
            )}
          </div>
        </div>

        {/* Bottom row - operational metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Faculty" value={data.total_faculty} />
          <MetricCard label="Avg Teaching Hours" value={`${data.avg_workload_hours} hrs/wk`} />
          <MetricCard label="Total Publications" value={data.total_publications} color="text-purple-600" />
          <MetricCard label="Outstanding Fees" value={`₹${(data.outstanding_amount / 100000).toFixed(1)}L`} color="text-red-600" />
        </div>
      </div>
    </PageShell>
  );
}
