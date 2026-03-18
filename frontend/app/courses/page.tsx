'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

const EMPTY_COURSE = { code: '', name: '', program_id: '', semester: '1', credits: '3', course_type: 'core', description: '', max_students: '60' };
const EMPTY_OFFERING = { course_id: '', faculty_id: '', academic_year: '2025-2026', semester: '1', section: 'A', room_number: '' };

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'offerings' | 'courses'>('offerings');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddOffering, setShowAddOffering] = useState(false);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE);
  const [offeringForm, setOfferingForm] = useState(EMPTY_OFFERING);

  const fetchAll = async () => {
    try {
      const [c, o, p] = await Promise.all([api.getCourses(), api.getOfferings(), api.getPrograms()]);
      setCourses(c); setOfferings(o); setPrograms(p);
      // Get faculty list from profiles or workload
      const fac = await api.getFacultyWorkload().catch(() => []);
      setFaculty(fac);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, []);

  const fetchOfferings = async () => {
    const params: Record<string, string> = {};
    if (filterSemester) params.semester = filterSemester;
    if (filterProgram) params.program_id = filterProgram;
    try { setOfferings(await api.getOfferings(params)); } catch (err) { console.error(err); }
  };

  useEffect(() => { if (!loading) fetchOfferings(); }, [filterProgram, filterSemester]);

  const handleViewStudents = async (offering: any) => {
    setSelectedOffering(offering);
    setLoadingStudents(true);
    try { setRegisteredStudents(await api.getRegisteredStudents(offering.id)); } catch (err) { console.error(err); }
    setLoadingStudents(false);
  };

  const handleBulkRegister = async (offeringId: string) => {
    try {
      const result = await api.bulkRegister(offeringId);
      alert(`Registered ${result.registered} of ${result.total_eligible} eligible students.`);
      fetchOfferings();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateCourse = async () => {
    try {
      await api.createCourse({ ...courseForm, semester: parseInt(courseForm.semester), credits: parseInt(courseForm.credits), max_students: parseInt(courseForm.max_students) });
      setShowAddCourse(false); setCourseForm(EMPTY_COURSE); fetchAll();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateOffering = async () => {
    try {
      await api.createOffering({ ...offeringForm, semester: parseInt(offeringForm.semester) });
      setShowAddOffering(false); setOfferingForm(EMPTY_OFFERING); fetchAll();
    } catch (err: any) { alert(err.message); }
  };

  const filteredCourses = courses.filter(c => {
    if (filterProgram && c.program_id !== filterProgram) return false;
    if (filterSemester && c.semester !== parseInt(filterSemester)) return false;
    return true;
  });

  return (
    <PageShell title="Courses & Offerings" subtitle="Course catalog, faculty assignments, and student registrations"
      action={
        <div className="flex gap-2">
          <button onClick={() => setShowAddCourse(true)} className="btn-secondary">+ New Course</button>
          <button onClick={() => setShowAddOffering(true)} className="btn-primary">+ New Offering</button>
        </div>
      }>
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-1 w-fit">
        {(['offerings', 'courses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'offerings' ? 'Course Offerings' : 'Course Catalog'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="input-field w-56">
          <option value="">All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="input-field w-36">
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : tab === 'offerings' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offerings.map(o => (
            <div key={o.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <span className="inline-flex px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-mono font-semibold">{o.course_code}</span>
                <span className="text-xs text-gray-400">Sec {o.section}</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>{o.course_name}</h3>
              <p className="text-xs text-gray-500 mb-3">{o.program_name}</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-surface-50 rounded-lg"><div className="text-sm font-semibold text-gray-800">Sem {o.semester}</div><div className="text-[10px] text-gray-400">Semester</div></div>
                <div className="text-center p-2 bg-surface-50 rounded-lg"><div className="text-sm font-semibold text-brand-600">{o.registered_count}</div><div className="text-[10px] text-gray-400">Enrolled</div></div>
                <div className="text-center p-2 bg-surface-50 rounded-lg"><div className="text-sm font-semibold text-gray-800">{o.room_number || '-'}</div><div className="text-[10px] text-gray-400">Room</div></div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-semibold">{o.faculty_name?.split(' ').map((n: string) => n[0]).join('') || '?'}</div>
                <span className="text-xs text-gray-600">{o.faculty_name || 'Unassigned'}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleViewStudents(o)} className="btn-secondary text-xs py-1.5 flex-1">Students</button>
                <button onClick={() => handleBulkRegister(o.id)} className="btn-primary text-xs py-1.5 flex-1">Auto-Register</button>
              </div>
            </div>
          ))}
          {offerings.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No offerings found.</div>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-surface-50 border-b border-surface-200">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Course Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Program</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Sem</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Credits</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
            </tr></thead>
            <tbody className="divide-y divide-surface-100">
              {filteredCourses.map(c => (
                <tr key={c.id} className="hover:bg-surface-50"><td className="px-5 py-3 text-sm font-mono text-brand-600 font-semibold">{c.code}</td>
                  <td className="px-5 py-3 text-sm text-gray-800 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{c.program_name}</td>
                  <td className="px-5 py-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold">{c.semester}</span></td>
                  <td className="px-5 py-3 text-center text-sm text-gray-600">{c.credits}</td>
                  <td className="px-5 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.course_type === 'core' ? 'bg-blue-50 text-blue-600' : c.course_type === 'lab' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>{c.course_type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Students Modal */}
      {selectedOffering && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOffering(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200 flex justify-between">
              <div><h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">{selectedOffering.course_code} - {selectedOffering.course_name}</h2>
                <p className="text-sm text-gray-500">Section {selectedOffering.section} &middot; {selectedOffering.faculty_name}</p></div>
              <button onClick={() => setSelectedOffering(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingStudents ? <div className="text-center py-8 animate-pulse text-brand-600">Loading...</div> :
              registeredStudents.length === 0 ? <div className="text-center py-8 text-gray-400">No students registered.</div> : (
                <table className="w-full"><thead><tr className="border-b border-surface-200">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Student Name</th>
                </tr></thead><tbody className="divide-y divide-surface-100">
                  {registeredStudents.map((s, i) => <tr key={s.id}><td className="py-2.5 text-sm text-gray-400">{i+1}</td><td className="py-2.5 text-sm font-mono text-brand-600">{s.roll_number}</td><td className="py-2.5 text-sm text-gray-800">{s.student_name}</td></tr>)}
                </tbody></table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddCourse(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200"><h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add New Course</h2></div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Course Code</label><input className="input-field" placeholder="e.g. MBA-601" value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} /></div>
                <div><label className="label">Program</label>
                  <select className="input-field" value={courseForm.program_id} onChange={e => setCourseForm({...courseForm, program_id: e.target.value})}>
                    <option value="">Select program</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
              </div>
              <div><label className="label">Course Name</label><input className="input-field" placeholder="e.g. Strategic Management" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Semester</label><input type="number" className="input-field" value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: e.target.value})} /></div>
                <div><label className="label">Credits</label><input type="number" className="input-field" value={courseForm.credits} onChange={e => setCourseForm({...courseForm, credits: e.target.value})} /></div>
                <div><label className="label">Type</label>
                  <select className="input-field" value={courseForm.course_type} onChange={e => setCourseForm({...courseForm, course_type: e.target.value})}>
                    <option value="core">Core</option><option value="elective">Elective</option><option value="lab">Lab</option><option value="project">Project</option>
                  </select></div>
              </div>
              <div><label className="label">Description</label><textarea className="input-field" rows={2} value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAddCourse(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateCourse} className="btn-primary">Create Course</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Offering Modal */}
      {showAddOffering && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddOffering(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200"><h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Create Course Offering</h2></div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="label">Course</label>
                <select className="input-field" value={offeringForm.course_id} onChange={e => setOfferingForm({...offeringForm, course_id: e.target.value})}>
                  <option value="">Select course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select></div>
              <div><label className="label">Faculty</label>
                <select className="input-field" value={offeringForm.faculty_id} onChange={e => setOfferingForm({...offeringForm, faculty_id: e.target.value})}>
                  <option value="">Select faculty</option>{faculty.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name} ({f.designation || 'Faculty'})</option>)}
                </select></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Semester</label><input type="number" className="input-field" value={offeringForm.semester} onChange={e => setOfferingForm({...offeringForm, semester: e.target.value})} /></div>
                <div><label className="label">Section</label><input className="input-field" value={offeringForm.section} onChange={e => setOfferingForm({...offeringForm, section: e.target.value})} /></div>
                <div><label className="label">Room</label><input className="input-field" placeholder="LH-101" value={offeringForm.room_number} onChange={e => setOfferingForm({...offeringForm, room_number: e.target.value})} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAddOffering(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateOffering} className="btn-primary">Create Offering</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
