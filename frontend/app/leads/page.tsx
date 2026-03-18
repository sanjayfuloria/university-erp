'use client';

import { useEffect, useState } from 'react';
import { api, Lead, Program } from '@/lib/api';
import PageShell from '@/components/PageShell';
import StatusBadge from '@/components/StatusBadge';

const SOURCES = ['', 'website', 'referral', 'social_media', 'newspaper', 'education_fair', 'walk_in', 'other'];
const STATUSES = ['', 'new', 'contacted', 'interested', 'application_sent', 'converted', 'lost'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    source: 'website', interested_program_id: '', notes: '',
  });

  const fetchLeads = async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    if (filterSource) params.source = filterSource;
    try {
      const data = await api.getLeads(params);
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([api.getPrograms(), api.getLeads({})])
      .then(([progs, lds]) => { setPrograms(progs); setLeads(lds); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(fetchLeads, 300);
      return () => clearTimeout(timer);
    }
  }, [search, filterStatus, filterSource]);

  const handleCreate = async () => {
    try {
      await api.createLead({
        ...form,
        interested_program_id: form.interested_program_id || undefined,
      });
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', source: 'website', interested_program_id: '', notes: '' });
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (lead: Lead, newStatus: string) => {
    try {
      await api.updateLead(lead.id, { status: newStatus });
      fetchLeads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <PageShell
      title="Lead Management"
      subtitle="Pre-admission inquiries and prospect tracking"
      action={
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + New Lead
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-64"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-40">
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="input-field w-40">
          <option value="">All Sources</option>
          {SOURCES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="text-sm text-gray-400 self-center">{leads.length} leads</div>
      </div>

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add New Lead</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input className="input-field" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input-field" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Source</label>
                  <select className="input-field" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    {SOURCES.filter(Boolean).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Interested Program</label>
                  <select className="input-field" value={form.interested_program_id} onChange={e => setForm({ ...form, interested_program_id: e.target.value })}>
                    <option value="">Select program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input-field" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading leads...</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {lead.first_name[0]}{lead.last_name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{lead.first_name} {lead.last_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-gray-600">{lead.email}</div>
                    <div className="text-xs text-gray-400">{lead.phone}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-500 capitalize">{lead.source.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{lead.program_name || '-'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString('en-IN')}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={lead.status}
                      onChange={e => handleUpdateStatus(lead, e.target.value)}
                      className="text-xs border border-surface-300 rounded px-2 py-1 bg-white"
                    >
                      {STATUSES.filter(Boolean).map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">No leads found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
