'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

export default function PlacementPage() {
  const [tab, setTab] = useState<'dashboard' | 'companies' | 'offers' | 'alumni' | 'events'>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Company form
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', industry: '', website: '', contact_person: '', contact_email: '', visit_date: '', roles_offered: '', package_min_lpa: '', package_max_lpa: '' });

  // Offer form
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({ student_id: '', company_id: '', role: '', package_lpa: '' });

  const fetchAll = async () => {
    try {
      const [d, c, o, a, e, s] = await Promise.all([
        api.getPlacementDashboard().catch(() => null),
        api.getPlacementCompanies().catch(() => []),
        api.getPlacementOffers().catch(() => []),
        api.getAlumni().catch(() => []),
        api.getAlumniEvents().catch(() => []),
        api.getStudents().catch(() => []),
      ]);
      setDashboard(d); setCompanies(c); setOffers(o); setAlumni(a); setEvents(e); setStudents(s);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, []);

  const handleCreateCompany = async () => {
    try {
      await api.createPlacementCompany({
        ...companyForm,
        package_min_lpa: companyForm.package_min_lpa ? parseFloat(companyForm.package_min_lpa) : undefined,
        package_max_lpa: companyForm.package_max_lpa ? parseFloat(companyForm.package_max_lpa) : undefined,
        visit_date: companyForm.visit_date || undefined,
      });
      setShowAddCompany(false);
      setCompanyForm({ name: '', industry: '', website: '', contact_person: '', contact_email: '', visit_date: '', roles_offered: '', package_min_lpa: '', package_max_lpa: '' });
      fetchAll();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateOffer = async () => {
    try {
      await api.createPlacementOffer({
        student_id: offerForm.student_id,
        company_id: offerForm.company_id,
        role: offerForm.role,
        package_lpa: parseFloat(offerForm.package_lpa),
      });
      setShowAddOffer(false);
      setOfferForm({ student_id: '', company_id: '', role: '', package_lpa: '' });
      fetchAll();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <PageShell title="Placement & Alumni" subtitle="Campus recruitment, alumni directory, and engagement"
      action={
        <div className="flex gap-2">
          <button onClick={() => setShowAddCompany(true)} className="btn-secondary">+ Company</button>
          <button onClick={() => setShowAddOffer(true)} className="btn-primary">+ Placement Offer</button>
        </div>
      }>
      <div className="flex flex-wrap gap-1 bg-surface-100 rounded-lg p-1 w-fit mb-6">
        {(['dashboard', 'companies', 'offers', 'alumni', 'events'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : tab === 'dashboard' && dashboard ? (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Placement Rate', value: `${dashboard.placement_percentage}%`, color: dashboard.placement_percentage >= 70 ? 'text-green-600' : 'text-orange-600' },
              { label: 'Highest Package', value: `₹${dashboard.highest_package_lpa}L`, color: 'text-brand-700' },
              { label: 'Average Package', value: `₹${dashboard.average_package_lpa}L`, color: 'text-gray-900' },
              { label: 'Companies Visited', value: dashboard.companies_visited, color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</div>
                <div className={`text-3xl font-bold mt-1 ${s.color}`} style={{ fontFamily: 'var(--font-display)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Company */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Top Recruiters</h3>
              <div className="space-y-3">
                {dashboard.by_company.slice(0, 8).map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center text-xs font-bold">{c.offers}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400">Avg: ₹{c.avg_package}L</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Program */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Program-wise Placement</h3>
              <div className="space-y-3">
                {dashboard.by_program.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-1 text-sm text-gray-600">{p.program}</div>
                    <div className="text-sm font-semibold text-brand-600">{p.placed} placed</div>
                    <div className="text-xs text-gray-400">Avg ₹{p.avg_package}L</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>{dashboard.total_eligible}</div>
              <div className="text-xs text-gray-400">Eligible Students</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'var(--font-display)' }}>{dashboard.total_placed}</div>
              <div className="text-xs text-gray-400">Students Placed</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'var(--font-display)' }}>₹{dashboard.median_package_lpa}L</div>
              <div className="text-xs text-gray-400">Median Package</div>
            </div>
          </div>
        </div>
      ) : tab === 'companies' ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Roles</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Package (LPA)</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Selected</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Visit Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-surface-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{c.industry}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">{c.roles_offered}</td>
                  <td className="px-5 py-3 text-center text-sm text-gray-600">₹{c.package_min_lpa}-{c.package_max_lpa}L</td>
                  <td className="px-5 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 bg-green-50 text-green-700 rounded-lg text-xs font-bold">{c.students_selected}</span></td>
                  <td className="px-5 py-3 text-xs text-gray-400">{c.visit_date ? new Date(c.visit_date).toLocaleDateString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'offers' ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Package</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {offers.map(o => (
                <tr key={o.id} className="hover:bg-surface-50">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-800">{o.student_name}</div>
                    <div className="text-xs text-gray-400">{o.roll_number}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{o.company_name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{o.role}</td>
                  <td className="px-5 py-3 text-center text-sm font-semibold text-brand-600">₹{o.package_lpa}L</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">{o.placement_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'alumni' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alumni.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {a.name?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{a.name}</div>
                  <div className="text-xs text-gray-400">{a.roll_number} &middot; {a.program_name}</div>
                </div>
                {a.is_mentor && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-medium">Mentor</span>}
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Class of <strong className="text-gray-700">{a.graduation_year}</strong> &middot; CGPA: <strong className="text-gray-700">{a.final_cgpa}</strong></div>
                {a.current_company && <div>{a.current_designation} at <strong className="text-gray-700">{a.current_company}</strong></div>}
                {a.current_city && <div>{a.current_city}</div>}
              </div>
            </div>
          ))}
          {alumni.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No alumni records.</div>}
        </div>
      ) : (
        /* Events */
        <div className="space-y-4">
          {events.map(e => (
            <div key={e.id} className="card p-5 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-bold ${
                e.event_type === 'reunion' ? 'bg-blue-500' :
                e.event_type === 'webinar' ? 'bg-purple-500' :
                e.event_type === 'mentorship' ? 'bg-green-500' :
                e.event_type === 'networking' ? 'bg-orange-500' :
                'bg-brand-500'
              }`}>
                {e.event_type?.slice(0, 3).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-sm" style={{ fontFamily: 'var(--font-display)' }}>{e.title}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                  &middot; {e.venue} {e.is_virtual && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">Virtual</span>}
                </div>
                {e.description && <p className="text-xs text-gray-400 mt-1">{e.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-brand-600" style={{ fontFamily: 'var(--font-display)' }}>{e.registration_count}</div>
                <div className="text-[10px] text-gray-400">Registered</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddCompany(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add Placement Company</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Company Name</label>
                  <input className="input-field" placeholder="e.g. Tata Consultancy Services" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} /></div>
                <div><label className="label">Industry</label>
                  <input className="input-field" placeholder="e.g. IT Services" value={companyForm.industry} onChange={e => setCompanyForm({...companyForm, industry: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Contact Person</label>
                  <input className="input-field" placeholder="HR Manager name" value={companyForm.contact_person} onChange={e => setCompanyForm({...companyForm, contact_person: e.target.value})} /></div>
                <div><label className="label">Contact Email</label>
                  <input type="email" className="input-field" placeholder="hr@company.com" value={companyForm.contact_email} onChange={e => setCompanyForm({...companyForm, contact_email: e.target.value})} /></div>
              </div>
              <div><label className="label">Roles Offered</label>
                <input className="input-field" placeholder="e.g. Software Engineer, Business Analyst" value={companyForm.roles_offered} onChange={e => setCompanyForm({...companyForm, roles_offered: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Min Package (LPA)</label>
                  <input type="number" step="0.5" className="input-field" placeholder="4.5" value={companyForm.package_min_lpa} onChange={e => setCompanyForm({...companyForm, package_min_lpa: e.target.value})} /></div>
                <div><label className="label">Max Package (LPA)</label>
                  <input type="number" step="0.5" className="input-field" placeholder="12.0" value={companyForm.package_max_lpa} onChange={e => setCompanyForm({...companyForm, package_max_lpa: e.target.value})} /></div>
                <div><label className="label">Visit Date</label>
                  <input type="date" className="input-field" value={companyForm.visit_date} onChange={e => setCompanyForm({...companyForm, visit_date: e.target.value})} /></div>
              </div>
              <div><label className="label">Website</label>
                <input className="input-field" placeholder="https://company.com" value={companyForm.website} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAddCompany(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateCompany} className="btn-primary">Add Company</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Placement Offer Modal */}
      {showAddOffer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddOffer(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add Placement Offer</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="label">Student</label>
                <select className="input-field" value={offerForm.student_id} onChange={e => setOfferForm({...offerForm, student_id: e.target.value})}>
                  <option value="">Select student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.roll_number} - {s.student_name}</option>)}
                </select></div>
              <div><label className="label">Company</label>
                <select className="input-field" value={offerForm.company_id} onChange={e => setOfferForm({...offerForm, company_id: e.target.value})}>
                  <option value="">Select company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.industry})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Role</label>
                  <input className="input-field" placeholder="e.g. Software Engineer" value={offerForm.role} onChange={e => setOfferForm({...offerForm, role: e.target.value})} /></div>
                <div><label className="label">Package (LPA)</label>
                  <input type="number" step="0.5" className="input-field" placeholder="e.g. 8.5" value={offerForm.package_lpa} onChange={e => setOfferForm({...offerForm, package_lpa: e.target.value})} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAddOffer(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateOffer} className="btn-primary">Create Offer</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
