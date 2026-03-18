'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

const GRADE_COLORS: Record<string, string> = {
  'O': 'bg-green-100 text-green-800', 'A+': 'bg-green-50 text-green-700',
  'A': 'bg-blue-50 text-blue-700', 'B+': 'bg-blue-50 text-blue-600',
  'B': 'bg-yellow-50 text-yellow-700', 'C': 'bg-yellow-50 text-yellow-600',
  'P': 'bg-orange-50 text-orange-600', 'F': 'bg-red-100 text-red-700',
};

export default function ResultsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [gradeCard, setGradeCard] = useState<any>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [semester, setSemester] = useState('1');

  useEffect(() => {
    api.getStudents()
      .then(s => {
        setStudents(s);
        if (s.length > 0) setSelectedStudent(s[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchGradeCard = async () => {
    if (!selectedStudent) return;
    setLoadingCard(true);
    try {
      const card = await api.getGradeCard(selectedStudent, parseInt(semester), '2025-2026');
      setGradeCard(card);
    } catch (err) {
      console.error(err);
      setGradeCard(null);
    }
    setLoadingCard(false);
  };

  useEffect(() => { fetchGradeCard(); }, [selectedStudent, semester]);

  const handleComputeSGPA = async () => {
    if (!selectedStudent) return;
    try {
      await api.computeSGPA(selectedStudent, parseInt(semester), '2025-2026');
      fetchGradeCard();
      alert('SGPA/CGPA computed successfully!');
    } catch (err: any) { alert(err.message); }
  };

  const currentStudent = students.find(s => s.id === selectedStudent);

  return (
    <PageShell title="Results & Grade Cards" subtitle="Student-wise semester results with SGPA and CGPA">
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="label">Student</label>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="input-field w-80">
            <option value="">Select student</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.roll_number} - {s.student_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Semester</label>
          <select value={semester} onChange={e => setSemester(e.target.value)} className="input-field w-36">
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <button onClick={handleComputeSGPA} className="btn-primary">Compute SGPA</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : !selectedStudent ? (
        <div className="card p-12 text-center text-gray-400">Select a student to view results.</div>
      ) : loadingCard ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading grade card...</div></div>
      ) : !gradeCard || gradeCard.courses.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No grades found for this student in Semester {semester}. Grades must be computed first from the Examinations page.</div>
      ) : (
        <div className="space-y-6">
          {/* Student info + SGPA/CGPA header */}
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-100 text-brand-700 rounded-xl flex items-center justify-center text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {gradeCard.student_name?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>{gradeCard.student_name}</h2>
                  <div className="text-sm text-gray-500">
                    {gradeCard.roll_number} &middot; {gradeCard.program_name} &middot; {gradeCard.academic_year}
                  </div>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">SGPA</div>
                  <div className={`text-3xl font-bold ${gradeCard.sgpa >= 8 ? 'text-green-600' : gradeCard.sgpa >= 6 ? 'text-brand-600' : 'text-orange-600'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    {gradeCard.sgpa}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">CGPA</div>
                  <div className={`text-3xl font-bold ${gradeCard.cgpa >= 8 ? 'text-green-600' : gradeCard.cgpa >= 6 ? 'text-brand-600' : 'text-orange-600'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    {gradeCard.cgpa}
                  </div>
                </div>
              </div>
            </div>

            {/* Credits summary */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-surface-50 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>{gradeCard.total_credits}</div>
                <div className="text-xs text-gray-400">Credits This Sem</div>
              </div>
              <div className="p-3 bg-surface-50 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>{gradeCard.total_credits_cumulative}</div>
                <div className="text-xs text-gray-400">Cumulative Credits</div>
              </div>
              <div className="p-3 bg-surface-50 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>Semester {gradeCard.semester}</div>
                <div className="text-xs text-gray-400">{gradeCard.academic_year}</div>
              </div>
            </div>
          </div>

          {/* Course-wise grades */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200">
              <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Course-wise Results</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Credits</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Marks %</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">GP</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">CP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {gradeCard.courses.map((c: any) => (
                  <tr key={c.id} className="hover:bg-surface-50">
                    <td className="px-5 py-3 text-sm font-mono text-brand-600 font-semibold">{c.course_code}</td>
                    <td className="px-5 py-3 text-sm text-gray-800">{c.course_name}</td>
                    <td className="px-5 py-3 text-center text-sm text-gray-600">{c.credits}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 bg-surface-100 rounded-full h-1.5">
                          <div className={`h-full rounded-full ${c.total_weighted_marks >= 60 ? 'bg-green-500' : c.total_weighted_marks >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${c.total_weighted_marks}%` }} />
                        </div>
                        <span className="text-sm text-gray-600">{c.total_weighted_marks}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${GRADE_COLORS[c.grade] || 'bg-surface-100'}`}>
                        {c.grade}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-gray-700">{c.grade_point}</td>
                    <td className="px-5 py-3 text-center text-sm text-gray-600">{(c.grade_point * c.credits).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-50 border-t-2 border-surface-300">
                  <td className="px-5 py-3 font-semibold text-sm" colSpan={2}>Total</td>
                  <td className="px-5 py-3 text-center font-bold text-sm">{gradeCard.total_credits}</td>
                  <td className="px-5 py-3 text-center text-sm text-gray-500">
                    {(gradeCard.courses.reduce((a: number, c: any) => a + c.total_weighted_marks, 0) / gradeCard.courses.length).toFixed(1)} avg
                  </td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-center font-bold text-sm">
                    {gradeCard.courses.reduce((a: number, c: any) => a + c.grade_point * c.credits, 0).toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grading scale reference */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3" style={{ fontFamily: 'var(--font-display)' }}>Grading Scale</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { g: 'O', label: 'Outstanding', gp: 10, range: '90-100' },
                { g: 'A+', label: 'Excellent', gp: 9, range: '80-89' },
                { g: 'A', label: 'Very Good', gp: 8, range: '70-79' },
                { g: 'B+', label: 'Good', gp: 7, range: '60-69' },
                { g: 'B', label: 'Above Avg', gp: 6, range: '50-59' },
                { g: 'C', label: 'Average', gp: 5, range: '45-49' },
                { g: 'P', label: 'Pass', gp: 4, range: '40-44' },
                { g: 'F', label: 'Fail', gp: 0, range: '<40' },
              ].map(item => (
                <div key={item.g} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${GRADE_COLORS[item.g]}`}>
                  <span className="font-bold">{item.g}</span>
                  <span className="opacity-70">{item.label}</span>
                  <span className="opacity-50">(GP:{item.gp}, {item.range}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
