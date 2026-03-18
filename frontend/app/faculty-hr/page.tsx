'use client';

import { useEffect, useState } from 'react';
import { api, getUser } from '@/lib/api';
import PageShell from '@/components/PageShell';
import StatusBadge from '@/components/StatusBadge';

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-surface-200 text-gray-500',
};

export default function FacultyHRPage() {
  const [tab, setTab] = useState<'profiles' | 'workload' | 'leaves'>('profiles');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  // Publications modal
  const [showPubs, setShowPubs] = useState<any>(null);
  const [pubs, setPubs] = useState<any[]>([]);
  const [loadingPubs, setLoadingPubs] = useState(false);

  // Leave application
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    Promise.all([
      api.getFacultyProfiles(),
      api.getFacultyWorkload().catch(() => []),
      api.getLeaves(),
    ]).then(([p, w, l]) => {
      setProfiles(p); setWorkload(w); setLeaves(l);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleViewPubs = async (profile: any) => {
    setShowPubs(profile);
    setLoadingPubs(true);
    try {
      setPubs(await api.getPublications(profile.id));
    } catch (err) { console.error(err); }
    setLoadingPubs(false);
  };

  const handleApplyLeave = async () => {
    try {
      await api.applyLeave(leaveForm);
      setShowLeaveForm(false);
      setLeaveForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      setLeaves(await api.getLeaves());
    } catch (err: any) { alert(err.message); }
  };

  const handleApproveLeave = async (id: string, action: string) => {
    try {
      await api.approveLeave(id, action);
      setLeaves(await api.getLeaves());
    } catch (err: any) { alert(err.message); }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'academic_admin';

  return (
    <PageShell title="Faculty & HR" subtitle="Faculty profiles, research output, workload, and leave management">
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
          {(['profiles', 'workload', 'leaves'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}
            >{t === 'profiles' ? 'Faculty Profiles' : t === 'workload' ? 'Workload' : 'Leave Management'}</button>
          ))}
        </div>
        <div className="flex-1" />
        {tab === 'leaves' && (
          <button onClick={() => setShowLeaveForm(true)} className="btn-primary text-sm">+ Apply Leave</button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : tab === 'profiles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map(p => (
            <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {p.name?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</h3>
                  <div className="text-xs text-gray-500">{p.designation}</div>
                  <div className="text-xs text-gray-400">{p.department}</div>
                </div>
                <span className="text-[10px] font-mono text-gray-400">{p.employee_id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <div className="text-sm font-semibold text-brand-600">{p.courses_count}</div>
                  <div className="text-[10px] text-gray-400">Courses</div>
                </div>
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <div className="text-sm font-semibold text-purple-600">{p.publications_count}</div>
                  <div className="text-[10px] text-gray-400">Pubs</div>
                </div>
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <div className="text-sm font-semibold text-gray-700">{p.experience_years || '-'}</div>
                  <div className="text-[10px] text-gray-400">Yrs Exp</div>
                </div>
              </div>
              {p.qualification && <div className="text-xs text-gray-500 mb-1"><strong>Qualification:</strong> {p.qualification}</div>}
              {p.specialization && <div className="text-xs text-gray-500 mb-3"><strong>Specialization:</strong> {p.specialization}</div>}
              <button onClick={() => handleViewPubs(p)} className="btn-secondary text-xs w-full">
                View Publications ({p.publications_count})
              </button>
            </div>
          ))}
          {profiles.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">No faculty profiles found. Run the seed script.</div>
          )}
        </div>
      ) : tab === 'workload' ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Faculty</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Designation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Courses</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Weekly Hrs</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Publications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {workload.map(w => (
                <tr key={w.faculty_id} className="hover:bg-surface-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{w.faculty_name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{w.designation || '-'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{w.department || '-'}</td>
                  <td className="px-5 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold">{w.courses_assigned}</span></td>
                  <td className="px-5 py-3 text-center text-sm text-gray-600">{w.total_students}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-sm font-semibold ${w.weekly_hours > 15 ? 'text-red-600' : w.weekly_hours > 10 ? 'text-yellow-600' : 'text-green-600'}`}>{w.weekly_hours}</span>
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-purple-600 font-medium">{w.publications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Leaves */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Applicant</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                {isAdmin && <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {leaves.map(l => (
                <tr key={l.id} className="hover:bg-surface-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{l.applicant_name}</td>
                  <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 bg-surface-100 rounded capitalize">{l.leave_type}</span></td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(l.start_date).toLocaleDateString('en-IN')} - {new Date(l.end_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-3 text-center text-sm font-semibold text-gray-700">{l.num_days}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-[200px] truncate">{l.reason}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${LEAVE_STATUS_COLORS[l.status] || ''}`}>
                      {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-center">
                      {l.status === 'pending' && (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleApproveLeave(l.id, 'approved')} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100">Approve</button>
                          <button onClick={() => handleApproveLeave(l.id, 'rejected')} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Reject</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-5 py-12 text-center text-gray-400">No leave applications.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Publications Modal */}
      {showPubs && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPubs(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200 flex justify-between">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Publications</h2>
                <p className="text-sm text-gray-500">{showPubs.name} - {showPubs.designation}</p>
              </div>
              <button onClick={() => setShowPubs(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingPubs ? (
                <div className="text-center py-8 animate-pulse text-brand-600">Loading...</div>
              ) : pubs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No publications recorded.</div>
              ) : (
                <div className="space-y-3">
                  {pubs.map(p => (
                    <div key={p.id} className="p-3 border border-surface-200 rounded-lg">
                      <div className="text-sm font-medium text-gray-800 mb-1">{p.title}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {p.journal_name && <span>{p.journal_name}</span>}
                        {p.year && <span>&middot; {p.year}</span>}
                        <span className={`px-1.5 py-0.5 rounded ${
                          p.indexing === 'scopus' ? 'bg-orange-50 text-orange-600' :
                          p.indexing === 'wos' ? 'bg-blue-50 text-blue-600' :
                          'bg-surface-100 text-gray-500'
                        }`}>{p.indexing?.toUpperCase() || 'Other'}</span>
                        <span className="px-1.5 py-0.5 bg-surface-100 rounded capitalize">{p.publication_type}</span>
                        {p.is_verified && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Verified</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLeaveForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Apply for Leave</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Leave Type</label>
                <select className="input-field" value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}>
                  {['casual', 'sick', 'earned', 'academic', 'duty', 'special'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Leave</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input-field" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input-field" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Reason</label>
                <textarea className="input-field" rows={3} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowLeaveForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleApplyLeave} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
