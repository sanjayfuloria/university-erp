'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

const ENTITIES = [
  { key: 'programs', label: 'Programs', description: 'Academic programs (MBA, BBA, B.Tech, etc.)', icon: '🎓',
    columns: 'code, name, department, degree_type, duration_years, total_credits, total_seats, fee_per_semester, mode, eligibility_criteria, description' },
  { key: 'courses', label: 'Courses', description: 'Courses within programs', icon: '📚',
    columns: 'code, name, program_code, semester, credits, course_type, description' },
  { key: 'faculty', label: 'Faculty', description: 'Faculty members with profiles', icon: '👨‍🏫',
    columns: 'first_name, last_name, email, phone, employee_id, department, designation, qualification, specialization, experience_years' },
  { key: 'students', label: 'Students', description: 'Student records with enrollment', icon: '🧑‍🎓',
    columns: 'first_name, last_name, email, phone, roll_number, program_code, batch_year, current_semester, date_of_birth, gender, city, state' },
  { key: 'leads', label: 'Leads', description: 'Pre-admission inquiries', icon: '📋',
    columns: 'first_name, last_name, email, phone, source, status, program_code, notes' },
  { key: 'placement-companies', label: 'Placement Companies', description: 'Companies for campus recruitment', icon: '🏢',
    columns: 'name, industry, website, contact_person, contact_email, visit_date, roles_offered, package_min_lpa, package_max_lpa' },
  { key: 'fee-structures', label: 'Fee Structures', description: 'Fee components per program per semester', icon: '💰',
    columns: 'program_code, semester, fee_type, amount, due_date' },
];

export default function ImportPage() {
  const [selectedEntity, setSelectedEntity] = useState(ENTITIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      setFile(f);
      setResult(null);
    } else {
      alert('Please upload a CSV file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await api.importCSV(selectedEntity.key, file);
      setResult(res);
    } catch (err: any) {
      setResult({ status: 'error', message: err.message });
    }
    setImporting(false);
  };

  return (
    <PageShell title="CSV Import" subtitle="Bulk import data from CSV files into the ERP system">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Entity selector */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Select data type</div>
          {ENTITIES.map(ent => (
            <button
              key={ent.key}
              onClick={() => { setSelectedEntity(ent); setFile(null); setResult(null); }}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                selectedEntity.key === ent.key
                  ? 'bg-brand-50 border-2 border-brand-300 shadow-sm'
                  : 'card hover:shadow-md border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{ent.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">{ent.label}</div>
                  <div className="text-xs text-gray-400">{ent.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Upload area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info card */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                  Import {selectedEntity.label}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{selectedEntity.description}</p>
              </div>
              <a
                href={api.getImportTemplate(selectedEntity.key)}
                target="_blank"
                className="btn-secondary text-xs flex-shrink-0"
              >
                Download Template
              </a>
            </div>
            <div className="p-3 bg-surface-50 rounded-lg">
              <div className="text-xs font-medium text-gray-500 mb-1">Expected CSV columns:</div>
              <div className="text-xs text-gray-600 font-mono">{selectedEntity.columns}</div>
            </div>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`card p-12 text-center cursor-pointer transition-all ${
              dragOver ? 'bg-brand-50 border-2 border-brand-400 border-dashed' :
              file ? 'bg-green-50 border-2 border-green-300' :
              'hover:bg-surface-50 border-2 border-dashed border-surface-300'
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            {file ? (
              <div>
                <div className="text-3xl mb-2">📄</div>
                <div className="text-sm font-semibold text-gray-800">{file.name}</div>
                <div className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                  className="text-xs text-red-500 hover:text-red-700 mt-2"
                >Remove</button>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2 opacity-40">📁</div>
                <div className="text-sm text-gray-500">Drag and drop a CSV file here, or click to browse</div>
                <div className="text-xs text-gray-400 mt-1">Supports .csv files with UTF-8 encoding</div>
              </div>
            )}
          </div>

          {/* Import button */}
          {file && (
            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primary px-8 py-2.5"
              >
                {importing ? 'Importing...' : `Import ${selectedEntity.label}`}
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className={`card p-5 ${result.status === 'error' ? 'bg-red-50 border-red-200' : ''}`}>
              {result.status === 'error' ? (
                <div>
                  <div className="text-sm font-semibold text-red-700 mb-1">Import Failed</div>
                  <div className="text-sm text-red-600">{result.message}</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-semibold text-green-700 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                    Import Complete
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-700" style={{ fontFamily: 'var(--font-display)' }}>{result.imported}</div>
                      <div className="text-xs text-green-600">Imported</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-700" style={{ fontFamily: 'var(--font-display)' }}>{result.skipped}</div>
                      <div className="text-xs text-yellow-600">Skipped</div>
                    </div>
                    <div className="p-3 bg-surface-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>{result.total_rows}</div>
                      <div className="text-xs text-gray-500">Total Rows</div>
                    </div>
                  </div>
                  {result.note && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-3">{result.note}</div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-600 uppercase tracking-wider mb-2">
                        Errors ({result.errors.length})
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {result.errors.map((err: string, i: number) => (
                          <div key={i} className="text-xs text-red-500 p-2 bg-red-50 rounded">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import order guide */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Recommended import order
            </h3>
            <div className="space-y-2">
              {[
                { step: 1, label: 'Programs', reason: 'Other entities reference programs by code' },
                { step: 2, label: 'Faculty', reason: 'Needed before creating course offerings' },
                { step: 3, label: 'Courses', reason: 'References programs by program_code' },
                { step: 4, label: 'Students', reason: 'References programs by program_code' },
                { step: 5, label: 'Leads', reason: 'Can reference programs optionally' },
                { step: 6, label: 'Fee Structures', reason: 'References programs by program_code' },
                { step: 7, label: 'Placement Companies', reason: 'Independent, no dependencies' },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
