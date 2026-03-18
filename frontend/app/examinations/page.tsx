'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

const TYPE_COLORS: Record<string, string> = {
  quiz: 'bg-blue-50 text-blue-600',
  assignment: 'bg-purple-50 text-purple-600',
  mid_term: 'bg-orange-50 text-orange-700',
  end_term: 'bg-red-50 text-red-700',
  project: 'bg-green-50 text-green-600',
  presentation: 'bg-teal-50 text-teal-600',
  lab_exam: 'bg-cyan-50 text-cyan-600',
  viva: 'bg-pink-50 text-pink-600',
};

const GRADE_COLORS: Record<string, string> = {
  'O': 'bg-green-100 text-green-800', 'A+': 'bg-green-50 text-green-700',
  'A': 'bg-blue-50 text-blue-700', 'B+': 'bg-blue-50 text-blue-600',
  'B': 'bg-yellow-50 text-yellow-700', 'C': 'bg-yellow-50 text-yellow-600',
  'P': 'bg-orange-50 text-orange-600', 'F': 'bg-red-100 text-red-700',
};

export default function ExaminationsPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedOffering, setSelectedOffering] = useState('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'assessments' | 'marks' | 'grades'>('assessments');

  // Marks view
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [markEntries, setMarkEntries] = useState<Record<string, string>>({});
  const [savingMarks, setSavingMarks] = useState(false);

  // Grades view
  const [grades, setGrades] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);

  // Add assessment form
  const [showAdd, setShowAdd] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: '', assessment_type: 'quiz', max_marks: '20', weightage: '10', date: '',
  });

  useEffect(() => {
    api.getOfferings().then(o => {
      setOfferings(o);
      if (o.length > 0) setSelectedOffering(o[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const fetchAssessments = async () => {
    if (!selectedOffering) return;
    try {
      const data = await api.getAssessments({ offering_id: selectedOffering });
      setAssessments(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAssessments(); }, [selectedOffering]);

  const handleViewMarks = async (assessment: any) => {
    setSelectedAssessment(assessment);
    setTab('marks');
    try {
      const [m, s] = await Promise.all([
        api.getMarks(assessment.id),
        api.getRegisteredStudents(selectedOffering),
      ]);
      setMarks(m);
      setStudents(s);
      const entries: Record<string, string> = {};
      s.forEach((st: any) => {
        const existing = m.find((mk: any) => mk.student_id === st.student_id);
        entries[st.student_id] = existing?.marks_obtained?.toString() || '';
      });
      setMarkEntries(entries);
    } catch (err) { console.error(err); }
  };

  const handleSaveMarks = async () => {
    if (!selectedAssessment) return;
    setSavingMarks(true);
    try {
      const entries = Object.entries(markEntries)
        .filter(([_, v]) => v !== '')
        .map(([student_id, marks_obtained]) => ({ student_id, marks_obtained: parseFloat(marks_obtained) }));
      await api.enterMarks({ assessment_id: selectedAssessment.id, entries });
      alert('Marks saved!');
      handleViewMarks(selectedAssessment);
    } catch (err: any) { alert(err.message); }
    setSavingMarks(false);
  };

  const handleComputeGrades = async () => {
    setComputing(true);
    try {
      const result = await api.computeGrades(selectedOffering);
      setGrades(result);
      setTab('grades');
    } catch (err: any) { alert(err.message); }
    setComputing(false);
  };

  const handleFetchGrades = async () => {
    try {
      const result = await api.getCourseGrades(selectedOffering);
      setGrades(result);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (tab === 'grades' && selectedOffering) handleFetchGrades();
  }, [tab, selectedOffering]);

  const handleAddAssessment = async () => {
    try {
      await api.createAssessment({
        offering_id: selectedOffering,
        name: newAssessment.name,
        assessment_type: newAssessment.assessment_type,
        max_marks: parseFloat(newAssessment.max_marks),
        weightage: parseFloat(newAssessment.weightage),
        date: newAssessment.date || null,
      });
      setShowAdd(false);
      setNewAssessment({ name: '', assessment_type: 'quiz', max_marks: '20', weightage: '10', date: '' });
      fetchAssessments();
    } catch (err: any) { alert(err.message); }
  };

  const currentOffering = offerings.find(o => o.id === selectedOffering);
  const totalWeightage = assessments.reduce((a, b) => a + b.weightage, 0);

  // Grade distribution for chart
  const gradeDist: Record<string, number> = {};
  grades.forEach(g => { gradeDist[g.grade] = (gradeDist[g.grade] || 0) + 1; });

  return (
    <PageShell title="Examinations & Grading" subtitle="Assessments, marks entry, and grade computation">
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="label">Course Offering</label>
          <select value={selectedOffering} onChange={e => setSelectedOffering(e.target.value)} className="input-field w-80">
            <option value="">Select offering</option>
            {offerings.map(o => (
              <option key={o.id} value={o.id}>{o.course_code} - {o.course_name} (Sec {o.section})</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
          {(['assessments', 'marks', 'grades'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'
              }`}
            >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>

      {currentOffering && (
        <div className="card p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center text-sm font-bold">
            {currentOffering.course_code?.split('-')[0]}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">{currentOffering.course_name}</div>
            <div className="text-xs text-gray-400">{currentOffering.faculty_name} &middot; {currentOffering.registered_count} students</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Weightage used</div>
            <div className={`text-lg font-bold ${totalWeightage > 100 ? 'text-red-600' : totalWeightage === 100 ? 'text-green-600' : 'text-yellow-600'}`} style={{ fontFamily: 'var(--font-display)' }}>
              {totalWeightage}%
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : !selectedOffering ? (
        <div className="card p-12 text-center text-gray-400">Select a course offering.</div>
      ) : tab === 'assessments' ? (
        /* ── Assessments Tab ── */
        <div>
          <div className="flex justify-between mb-4">
            <div className="text-sm text-gray-500">{assessments.length} assessments</div>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Assessment</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assessments.map(a => (
              <div key={a.id} className="card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewMarks(a)}>
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[a.assessment_type] || 'bg-surface-100 text-gray-500'}`}>
                    {a.assessment_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">{a.weightage}%</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2" style={{ fontFamily: 'var(--font-display)' }}>{a.name}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 bg-surface-50 rounded">
                    <div className="text-sm font-semibold text-gray-700">{a.max_marks}</div>
                    <div className="text-[10px] text-gray-400">Max</div>
                  </div>
                  <div className="p-1.5 bg-surface-50 rounded">
                    <div className="text-sm font-semibold text-brand-600">{a.marks_entered}</div>
                    <div className="text-[10px] text-gray-400">Entered</div>
                  </div>
                  <div className="p-1.5 bg-surface-50 rounded">
                    <div className="text-sm font-semibold text-gray-700">{a.class_average ?? '-'}</div>
                    <div className="text-[10px] text-gray-400">Avg</div>
                  </div>
                </div>
                {a.date && <div className="text-xs text-gray-400 mt-2">{new Date(a.date).toLocaleDateString('en-IN')}</div>}
              </div>
            ))}
          </div>
          {assessments.length > 0 && totalWeightage === 100 && (
            <div className="mt-6 flex justify-end">
              <button onClick={handleComputeGrades} disabled={computing} className="btn-primary bg-green-600 hover:bg-green-700 px-6">
                {computing ? 'Computing...' : 'Compute Final Grades'}
              </button>
            </div>
          )}
        </div>
      ) : tab === 'marks' ? (
        /* ── Marks Entry Tab ── */
        <div>
          {selectedAssessment ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { setTab('assessments'); setSelectedAssessment(null); }} className="btn-secondary text-xs">Back</button>
                <h3 className="font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
                  {selectedAssessment.name} (Max: {selectedAssessment.max_marks})
                </h3>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase w-32">Marks ({selectedAssessment.max_marks})</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase w-20">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {students.map((s, i) => {
                      const val = markEntries[s.student_id] || '';
                      const pct = val ? ((parseFloat(val) / selectedAssessment.max_marks) * 100).toFixed(1) : '';
                      return (
                        <tr key={s.student_id} className="hover:bg-surface-50">
                          <td className="px-5 py-2.5 text-sm text-gray-400">{i + 1}</td>
                          <td className="px-5 py-2.5 text-sm font-mono text-brand-600">{s.roll_number}</td>
                          <td className="px-5 py-2.5 text-sm text-gray-800">{s.student_name}</td>
                          <td className="px-5 py-2.5 text-center">
                            <input
                              type="number" min="0" max={selectedAssessment.max_marks} step="0.5"
                              value={val}
                              onChange={e => setMarkEntries({ ...markEntries, [s.student_id]: e.target.value })}
                              className="input-field w-24 text-center text-sm"
                              placeholder="--"
                            />
                          </td>
                          <td className="px-5 py-2.5 text-center text-sm text-gray-500">{pct ? `${pct}%` : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={handleSaveMarks} disabled={savingMarks} className="btn-primary px-8">
                  {savingMarks ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-gray-400">Select an assessment from the Assessments tab to enter marks.</div>
          )}
        </div>
      ) : (
        /* ── Grades Tab ── */
        <div>
          {grades.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              No grades computed yet. Add assessments, enter marks, then compute grades.
            </div>
          ) : (
            <>
              {/* Grade distribution */}
              <div className="card p-5 mb-6">
                <h3 className="font-semibold text-gray-900 text-sm mb-3" style={{ fontFamily: 'var(--font-display)' }}>Grade Distribution</h3>
                <div className="flex gap-2 items-end h-24">
                  {['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'].map(g => {
                    const count = gradeDist[g] || 0;
                    const maxCount = Math.max(...Object.values(gradeDist), 1);
                    const height = count > 0 ? Math.max((count / maxCount) * 80, 8) : 4;
                    return (
                      <div key={g} className="flex flex-col items-center flex-1">
                        <div className="text-xs font-semibold text-gray-700 mb-1">{count}</div>
                        <div
                          className={`w-full rounded-t ${GRADE_COLORS[g]?.split(' ')[0] || 'bg-surface-200'} transition-all`}
                          style={{ height: `${height}px` }}
                        />
                        <div className="text-xs font-medium text-gray-500 mt-1">{g}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Weighted %</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">GP</th>
                      <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {grades.map((g, i) => (
                      <tr key={g.student_id} className="hover:bg-surface-50">
                        <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-5 py-3 text-sm font-mono text-brand-600">{g.roll_number}</td>
                        <td className="px-5 py-3 text-sm text-gray-800 font-medium">{g.student_name}</td>
                        <td className="px-5 py-3 text-center text-sm">{g.total_weighted_marks}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${GRADE_COLORS[g.grade] || 'bg-surface-100'}`}>
                            {g.grade}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-gray-700">{g.grade_point}</td>
                        <td className="px-5 py-3 text-center text-sm text-gray-500">{g.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-surface-50 border-t border-surface-200 flex gap-6 text-sm text-gray-500">
                  <span>Class average: <strong className="text-gray-800">
                    {grades.length > 0 ? (grades.reduce((a: number, g: any) => a + g.total_weighted_marks, 0) / grades.length).toFixed(1) : 0}%
                  </strong></span>
                  <span>Pass rate: <strong className="text-green-600">
                    {grades.length > 0 ? ((grades.filter((g: any) => g.grade !== 'F').length / grades.length) * 100).toFixed(0) : 0}%
                  </strong></span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Assessment Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add Assessment</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input-field" value={newAssessment.name} onChange={e => setNewAssessment({ ...newAssessment, name: e.target.value })} placeholder="Quiz 1, Mid-Term Exam..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={newAssessment.assessment_type} onChange={e => setNewAssessment({ ...newAssessment, assessment_type: e.target.value })}>
                    {['quiz', 'assignment', 'mid_term', 'end_term', 'project', 'presentation', 'lab_exam', 'viva'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input-field" value={newAssessment.date} onChange={e => setNewAssessment({ ...newAssessment, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Max Marks</label>
                  <input type="number" className="input-field" value={newAssessment.max_marks} onChange={e => setNewAssessment({ ...newAssessment, max_marks: e.target.value })} />
                </div>
                <div>
                  <label className="label">Weightage (%)</label>
                  <input type="number" className="input-field" value={newAssessment.weightage} onChange={e => setNewAssessment({ ...newAssessment, weightage: e.target.value })} />
                  <div className="text-xs text-gray-400 mt-1">{totalWeightage}% used of 100%</div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddAssessment} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
