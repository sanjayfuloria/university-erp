'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function AttendancePage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffering, setSelectedOffering] = useState<string>('');
  const [tab, setTab] = useState<'mark' | 'summary'>('mark');

  // Mark attendance state
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState(false);
  const [existingRecords, setExistingRecords] = useState<any[]>([]);

  // Summary state
  const [summary, setSummary] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    api.getOfferings()
      .then(o => {
        setOfferings(o);
        if (o.length > 0) setSelectedOffering(o[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch registered students when offering changes
  useEffect(() => {
    if (!selectedOffering) return;
    api.getRegisteredStudents(selectedOffering)
      .then(s => {
        setStudents(s);
        // Default all to present
        const defaultEntries: Record<string, string> = {};
        s.forEach((st: any) => { defaultEntries[st.student_id] = 'present'; });
        setEntries(defaultEntries);
      })
      .catch(console.error);
  }, [selectedOffering]);

  // Fetch existing records for selected date
  useEffect(() => {
    if (!selectedOffering || !attendanceDate) return;
    api.getAttendance(selectedOffering, attendanceDate)
      .then(records => {
        setExistingRecords(records);
        // Pre-fill from existing records
        if (records.length > 0) {
          const prefilled: Record<string, string> = {};
          students.forEach(s => { prefilled[s.student_id] = 'present'; });
          records.forEach((r: any) => { prefilled[r.student_id] = r.status; });
          setEntries(prefilled);
        }
      })
      .catch(console.error);
  }, [selectedOffering, attendanceDate, students]);

  // Fetch summary
  useEffect(() => {
    if (!selectedOffering || tab !== 'summary') return;
    setLoadingSummary(true);
    api.getAttendanceSummary(selectedOffering)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingSummary(false));
  }, [selectedOffering, tab]);

  const handleStatusToggle = (studentId: string) => {
    const order = ['present', 'absent', 'late', 'excused'];
    const current = entries[studentId] || 'present';
    const next = order[(order.indexOf(current) + 1) % order.length];
    setEntries({ ...entries, [studentId]: next });
  };

  const handleMarkAll = (status: string) => {
    const updated: Record<string, string> = {};
    students.forEach(s => { updated[s.student_id] = status; });
    setEntries(updated);
  };

  const handleSubmit = async () => {
    setMarking(true);
    try {
      const entryList = Object.entries(entries).map(([student_id, status]) => ({
        student_id, status,
      }));
      await api.markAttendance({
        offering_id: selectedOffering,
        date: attendanceDate,
        entries: entryList,
      });
      alert('Attendance marked successfully!');
      // Refresh records
      const records = await api.getAttendance(selectedOffering, attendanceDate);
      setExistingRecords(records);
    } catch (err: any) {
      alert(err.message);
    }
    setMarking(false);
  };

  const currentOffering = offerings.find(o => o.id === selectedOffering);
  const presentCount = Object.values(entries).filter(s => s === 'present').length;
  const absentCount = Object.values(entries).filter(s => s === 'absent').length;
  const lateCount = Object.values(entries).filter(s => s === 'late').length;

  return (
    <PageShell title="Attendance" subtitle="Mark and track student attendance">
      {/* Offering selector */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="label">Course Offering</label>
          <select
            value={selectedOffering}
            onChange={e => setSelectedOffering(e.target.value)}
            className="input-field w-80"
          >
            <option value="">Select a course offering</option>
            {offerings.map(o => (
              <option key={o.id} value={o.id}>
                {o.course_code} - {o.course_name} (Sec {o.section})
              </option>
            ))}
          </select>
        </div>
        {tab === 'mark' && (
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="input-field w-44"
            />
          </div>
        )}
        <div className="flex-1" />
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
          {(['mark', 'summary'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'
              }`}
            >{t === 'mark' ? 'Mark Attendance' : 'Summary'}</button>
          ))}
        </div>
      </div>

      {/* Offering info */}
      {currentOffering && (
        <div className="card p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center text-sm font-bold">
            {currentOffering.course_code?.split('-')[0]}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">{currentOffering.course_name}</div>
            <div className="text-xs text-gray-400">
              {currentOffering.faculty_name} &middot; Room {currentOffering.room_number} &middot;
              {currentOffering.registered_count} students &middot; Semester {currentOffering.semester}
            </div>
          </div>
          {tab === 'mark' && existingRecords.length > 0 && (
            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
              Already marked for {attendanceDate}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading...</div>
        </div>
      ) : !selectedOffering ? (
        <div className="card p-12 text-center text-gray-400">Select a course offering to begin.</div>
      ) : tab === 'mark' ? (
        /* ── Mark Attendance Tab ── */
        <div>
          {/* Quick actions */}
          <div className="flex gap-3 mb-4 items-center">
            <span className="text-sm text-gray-500">Quick:</span>
            <button onClick={() => handleMarkAll('present')} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium">
              All Present
            </button>
            <button onClick={() => handleMarkAll('absent')} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
              All Absent
            </button>
            <div className="flex-1" />
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">P: {presentCount}</span>
              <span className="text-red-600 font-medium">A: {absentCount}</span>
              <span className="text-yellow-600 font-medium">L: {lateCount}</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {students.map((s, i) => (
                  <tr key={s.student_id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-mono text-brand-600">{s.roll_number}</td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">{s.student_name}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleStatusToggle(s.student_id)}
                        className={`inline-flex px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer min-w-[80px] justify-center ${
                          STATUS_COLORS[entries[s.student_id] || 'present']
                        }`}
                      >
                        {(entries[s.student_id] || 'present').toUpperCase()}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                      No students registered for this course.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {students.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button onClick={handleSubmit} disabled={marking} className="btn-primary px-8 py-2.5">
                {marking ? 'Saving...' : existingRecords.length > 0 ? 'Update Attendance' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Summary Tab ── */
        <div>
          {loadingSummary ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-brand-600">Loading summary...</div>
            </div>
          ) : summary.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              No attendance data yet for this offering.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Present</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Absent</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Late</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {summary.map((s, i) => (
                    <tr key={s.student_id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3 text-sm font-mono text-brand-600">{s.roll_number}</td>
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium">{s.student_name}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-600">{s.total_classes}</td>
                      <td className="px-5 py-3 text-center text-sm text-green-600 font-medium">{s.present}</td>
                      <td className="px-5 py-3 text-center text-sm text-red-600 font-medium">{s.absent}</td>
                      <td className="px-5 py-3 text-center text-sm text-yellow-600 font-medium">{s.late}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-surface-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                s.percentage >= 75 ? 'bg-green-500' :
                                s.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${
                            s.percentage >= 75 ? 'text-green-600' :
                            s.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {s.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary stats */}
              <div className="px-5 py-3 bg-surface-50 border-t border-surface-200 flex gap-6">
                <div className="text-sm text-gray-500">
                  Class average: <span className="font-semibold text-gray-800">
                    {summary.length > 0 ? (summary.reduce((a, s) => a + s.percentage, 0) / summary.length).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Below 75%: <span className="font-semibold text-red-600">
                    {summary.filter(s => s.percentage < 75).length}
                  </span> students
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
