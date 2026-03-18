'use client';

import { useEffect, useState } from 'react';
import { api, Student, Program } from '@/lib/api';
import PageShell from '@/components/PageShell';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('');

  const fetchStudents = async () => {
    const params: Record<string, string> = {};
    if (filterProgram) params.program_id = filterProgram;
    try {
      const data = await api.getStudents(params);
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([api.getPrograms(), api.getStudents({})])
      .then(([progs, studs]) => { setPrograms(progs); setStudents(studs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchStudents();
  }, [filterProgram]);

  return (
    <PageShell title="Students" subtitle="Enrolled student records">
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="input-field w-56">
          <option value="">All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex-1" />
        <div className="text-sm text-gray-400 self-center">{students.length} students</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading students...</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Admitted</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {s.student_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{s.student_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-mono text-brand-600">{s.roll_number}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.program_name || '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.batch_year}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-brand-50 text-brand-700 rounded-lg text-sm font-semibold">
                      {s.current_semester}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(s.admission_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-gray-500'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No enrolled students yet. Students are created when accepted applications are enrolled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
