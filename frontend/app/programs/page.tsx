'use client';

import { useEffect, useState } from 'react';
import { api, Program } from '@/lib/api';
import PageShell from '@/components/PageShell';

const EMPTY_FORM = {
  code: '', name: '', department: '', degree_type: 'PG', duration_years: '2',
  total_credits: '', total_seats: '', fee_per_semester: '', mode: 'regular',
  eligibility_criteria: '', description: '',
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchPrograms = () => api.getPrograms().then(setPrograms).catch(console.error);

  useEffect(() => { fetchPrograms().finally(() => setLoading(false)); }, []);

  const handleCreate = async () => {
    try {
      await api.createProgram({
        ...form,
        duration_years: parseInt(form.duration_years) || 2,
        total_credits: form.total_credits ? parseInt(form.total_credits) : undefined,
        total_seats: form.total_seats ? parseInt(form.total_seats) : undefined,
        fee_per_semester: form.fee_per_semester ? parseFloat(form.fee_per_semester) : undefined,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchPrograms();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <PageShell title="Programs" subtitle="Academic programs offered by the university"
      action={<button onClick={() => setShowAdd(true)} className="btn-primary">+ New Program</button>}>
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {programs.map(p => (
            <div key={p.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-flex px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-mono font-semibold">{p.code}</span>
                  <span className={`ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.mode === 'online' ? 'bg-purple-50 text-purple-600' : p.mode === 'distance' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                    {p.mode.charAt(0).toUpperCase() + p.mode.slice(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 capitalize">{p.degree_type}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{p.department}</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>{p.duration_years}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Years</div>
                </div>
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>{p.total_seats || '-'}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Seats</div>
                </div>
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>{p.total_credits || '-'}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Credits</div>
                </div>
              </div>
              {p.fee_per_semester && (
                <div className="text-sm text-gray-600">
                  <span className="text-gray-400">Fee:</span> <span className="font-semibold">₹{p.fee_per_semester.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-gray-400"> /semester</span>
                </div>
              )}
              {p.description && <p className="text-xs text-gray-500 mt-3 line-clamp-2">{p.description}</p>}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add New Program</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Program Code</label><input className="input-field" placeholder="e.g. MBA, BBA" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
                <div><label className="label">Degree Type</label>
                  <select className="input-field" value={form.degree_type} onChange={e => setForm({...form, degree_type: e.target.value})}>
                    <option value="UG">UG</option><option value="PG">PG</option><option value="Doctoral">Doctoral</option><option value="Diploma">Diploma</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Program Name</label><input className="input-field" placeholder="e.g. Master of Business Administration" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Department</label><input className="input-field" placeholder="e.g. School of Management" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Duration (Years)</label><input type="number" className="input-field" value={form.duration_years} onChange={e => setForm({...form, duration_years: e.target.value})} /></div>
                <div><label className="label">Total Credits</label><input type="number" className="input-field" value={form.total_credits} onChange={e => setForm({...form, total_credits: e.target.value})} /></div>
                <div><label className="label">Total Seats</label><input type="number" className="input-field" value={form.total_seats} onChange={e => setForm({...form, total_seats: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Fee / Semester (₹)</label><input type="number" className="input-field" value={form.fee_per_semester} onChange={e => setForm({...form, fee_per_semester: e.target.value})} /></div>
                <div><label className="label">Mode</label>
                  <select className="input-field" value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}>
                    <option value="regular">Regular</option><option value="online">Online</option><option value="distance">Distance</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Eligibility Criteria</label><textarea className="input-field" rows={2} value={form.eligibility_criteria} onChange={e => setForm({...form, eligibility_criteria: e.target.value})} /></div>
              <div><label className="label">Description</label><textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create Program</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
