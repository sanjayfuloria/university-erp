'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};
const TIME_ROWS = [
  '09:00', '10:15', '11:30', '12:30', '14:00', '15:15', '16:15'
];
const SLOT_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-green-50 border-green-200 text-green-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-pink-50 border-pink-200 text-pink-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-yellow-50 border-yellow-200 text-yellow-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
];

export default function TimetablePage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSemester, setFilterSemester] = useState('1');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const fetchTimetable = async () => {
    const params: Record<string, string> = {};
    if (filterProgram) params.program_id = filterProgram;
    if (filterSemester) params.semester = filterSemester;
    try {
      const data = await api.getTimetable(params);
      setSlots(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    api.getPrograms()
      .then(p => { setPrograms(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchTimetable();
  }, [filterProgram, filterSemester, loading]);

  // Build color map per course
  const courseColors: Record<string, string> = {};
  let colorIdx = 0;
  slots.forEach(s => {
    if (s.course_code && !courseColors[s.course_code]) {
      courseColors[s.course_code] = SLOT_COLORS[colorIdx % SLOT_COLORS.length];
      colorIdx++;
    }
  });

  // Group slots by day
  const slotsByDay: Record<string, any[]> = {};
  DAYS.forEach(d => { slotsByDay[d] = []; });
  slots.forEach(s => {
    if (slotsByDay[s.day_of_week]) {
      slotsByDay[s.day_of_week].push(s);
    }
  });
  // Sort each day by start time
  Object.values(slotsByDay).forEach(arr => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));

  // Find all unique time slots for grid
  const uniqueTimes = Array.from(new Set(slots.map(s => s.start_time))).sort();

  return (
    <PageShell title="Timetable" subtitle="Weekly class schedule">
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="input-field w-56">
          <option value="">All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="input-field w-36">
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <div className="flex-1" />
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === v ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'
              }`}
            >{v === 'grid' ? 'Grid' : 'List'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading timetable...</div>
        </div>
      ) : slots.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          No timetable data found. Select a program and semester, or run the seed script.
        </div>
      ) : view === 'grid' ? (
        /* ── Grid View ── */
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase w-16">Time</th>
                {DAYS.filter(d => slotsByDay[d].length > 0 || d !== 'saturday').map(day => (
                  <th key={day} className="px-2 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                    {DAY_LABELS[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimes.map(time => (
                <tr key={time} className="border-b border-surface-100">
                  <td className="px-3 py-2 text-xs text-gray-400 font-mono align-top pt-3">{time}</td>
                  {DAYS.filter(d => slotsByDay[d].length > 0 || d !== 'saturday').map(day => {
                    const daySlots = slotsByDay[day].filter(s => s.start_time === time);
                    return (
                      <td key={day} className="px-1 py-1 align-top">
                        {daySlots.map(slot => (
                          <div
                            key={slot.id}
                            className={`rounded-lg border p-2 mb-1 ${courseColors[slot.course_code] || 'bg-surface-50 border-surface-200'}`}
                          >
                            <div className="font-semibold text-xs">{slot.course_code}</div>
                            <div className="text-[11px] opacity-80 truncate">{slot.course_name}</div>
                            <div className="text-[10px] opacity-60 mt-1">
                              {slot.start_time}-{slot.end_time}
                              {slot.room_number && <span> &middot; {slot.room_number}</span>}
                            </div>
                            <div className="text-[10px] opacity-60">{slot.faculty_name}</div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-4">
          {DAYS.filter(d => slotsByDay[d].length > 0).map(day => (
            <div key={day} className="card overflow-hidden">
              <div className="px-5 py-3 bg-surface-50 border-b border-surface-200">
                <h3 className="font-semibold text-gray-700 text-sm capitalize">{day}</h3>
              </div>
              <div className="divide-y divide-surface-100">
                {slotsByDay[day].map(slot => (
                  <div key={slot.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="text-sm font-mono text-gray-400 w-28 flex-shrink-0">
                      {slot.start_time} - {slot.end_time}
                    </div>
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${
                      courseColors[slot.course_code]?.includes('blue') ? 'bg-blue-400' :
                      courseColors[slot.course_code]?.includes('purple') ? 'bg-purple-400' :
                      courseColors[slot.course_code]?.includes('green') ? 'bg-green-400' :
                      courseColors[slot.course_code]?.includes('orange') ? 'bg-orange-400' :
                      'bg-brand-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        <span className="font-mono text-brand-600 mr-2">{slot.course_code}</span>
                        {slot.course_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {slot.faculty_name} &middot; {slot.room_number || 'No room'} &middot; Sec {slot.section}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {slots.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {Object.entries(courseColors).map(([code, color]) => (
            <div key={code} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${color}`}>
              {code}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
