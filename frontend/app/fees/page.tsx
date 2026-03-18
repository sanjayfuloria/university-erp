'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import StatusBadge from '@/components/StatusBadge';

export default function FeesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'invoices' | 'defaulters'>('invoices');
  const [filterStatus, setFilterStatus] = useState('');

  // Payment modal
  const [showPay, setShowPay] = useState(false);
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('upi');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState<any>(null);

  // Fee structure form
  const [showAddFee, setShowAddFee] = useState(false);
  const [feeForm, setFeeForm] = useState({ program_id: '', semester: '1', fee_type: 'tuition', amount: '', due_date: '' });

  // Invoice generation
  const [showGenerate, setShowGenerate] = useState(false);
  const [genProgram, setGenProgram] = useState('');
  const [genSemester, setGenSemester] = useState('1');
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const [inv, def, prg] = await Promise.all([api.getInvoices(params), api.getDefaulters(), api.getPrograms()]);
      setInvoices(inv);
      setDefaulters(def);
      setPrograms(prg);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchData();
  }, [filterStatus]);

  const handlePay = async () => {
    if (!payInvoice) return;
    setPaying(true);
    try {
      await api.recordPayment({
        invoice_id: payInvoice.id,
        amount: parseFloat(payAmount),
        payment_mode: payMode,
        transaction_ref: payRef || undefined,
      });
      setShowPay(false);
      setPayInvoice(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
    setPaying(false);
  };

  const handleCreateFeeStructure = async () => {
    try {
      await api.createFeeStructure({
        program_id: feeForm.program_id,
        semester: parseInt(feeForm.semester),
        fee_type: feeForm.fee_type,
        amount: parseFloat(feeForm.amount),
        due_date: feeForm.due_date || undefined,
      });
      setShowAddFee(false);
      setFeeForm({ program_id: '', semester: '1', fee_type: 'tuition', amount: '', due_date: '' });
      alert('Fee structure added!');
    } catch (err: any) { alert(err.message); }
  };

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const params: Record<string, string> = { semester: genSemester };
      if (genProgram) params.program_id = genProgram;
      const result = await api.generateInvoices(params);
      alert(`Generated ${result.invoices_generated} invoices.`);
      setShowGenerate(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
    setGenerating(false);
  };

  const totalDue = invoices.reduce((a, i) => a + i.net_amount, 0);
  const totalPaid = invoices.reduce((a, i) => a + i.amount_paid, 0);
  const totalBalance = invoices.reduce((a, i) => a + i.balance, 0);

  return (
    <PageShell title="Fee Management" subtitle="Invoices, payments, and fee defaulter tracking"
      action={
        <div className="flex gap-2">
          <button onClick={() => setShowAddFee(true)} className="btn-secondary">+ Fee Structure</button>
          <button onClick={() => setShowGenerate(true)} className="btn-primary">Generate Invoices</button>
        </div>
      }>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invoices', value: invoices.length, color: '' },
          { label: 'Total Billed', value: `₹${(totalDue / 100000).toFixed(1)}L`, color: 'text-brand-700' },
          { label: 'Collected', value: `₹${(totalPaid / 100000).toFixed(1)}L`, color: 'text-green-600' },
          { label: 'Outstanding', value: `₹${(totalBalance / 100000).toFixed(1)}L`, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color || 'text-gray-900'}`} style={{ fontFamily: 'var(--font-display)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs & filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
          {(['invoices', 'defaulters'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}
            >{t === 'invoices' ? 'All Invoices' : `Defaulters (${defaulters.length})`}</button>
          ))}
        </div>
        {tab === 'invoices' && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-40">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
          </select>
        )}
        <div className="flex-1" />
        {tab === 'invoices' && totalBalance > 0 && (
          <div className="text-sm text-gray-500">
            Collection rate: <strong className="text-green-600">{totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(0) : 0}%</strong>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-brand-600">Loading...</div></div>
      ) : tab === 'invoices' ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-3">
                    <button onClick={() => setShowDetail(inv)} className="text-sm font-mono text-brand-600 hover:text-brand-800">{inv.invoice_number}</button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-gray-800">{inv.student_name}</div>
                    <div className="text-xs text-gray-400">{inv.roll_number}</div>
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-500">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right text-sm text-green-600">{inv.scholarship_discount > 0 ? `-₹${inv.scholarship_discount.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-gray-800">₹{inv.net_amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right text-sm text-green-600">₹{inv.amount_paid.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-red-600">{inv.balance > 0 ? `₹${inv.balance.toLocaleString('en-IN')}` : '-'}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3 text-center">
                    {inv.balance > 0 && (
                      <button onClick={() => { setPayInvoice(inv); setPayAmount(String(inv.balance)); setShowPay(true); }} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Defaulters */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-red-50 border-b border-red-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-red-500 uppercase">#</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-red-500 uppercase">Student</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-red-500 uppercase">Program</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-red-500 uppercase">Total Due</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-red-500 uppercase">Paid</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-red-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {defaulters.map((d, i) => (
                <tr key={d.student_id} className="hover:bg-red-50/50">
                  <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-800">{d.student_name}</div>
                    <div className="text-xs text-gray-400">{d.roll_number}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{d.program_name}</td>
                  <td className="px-5 py-3 text-right text-sm">₹{d.total_due.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right text-sm text-green-600">₹{d.total_paid.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-600">₹{d.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {defaulters.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No defaulters. All fees collected!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {showPay && payInvoice && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPay(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Record Payment</h2>
              <p className="text-sm text-gray-500">{payInvoice.invoice_number} - {payInvoice.student_name}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-surface-50 rounded-lg text-sm text-gray-600">
                Balance: <strong className="text-red-600">₹{payInvoice.balance.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input-field" value={payAmount} onChange={e => setPayAmount(e.target.value)} max={payInvoice.balance} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Mode</label>
                  <select className="input-field" value={payMode} onChange={e => setPayMode(e.target.value)}>
                    {['upi', 'neft', 'dd', 'card', 'cash'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Transaction Ref</label>
                  <input className="input-field" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowPay(false)} className="btn-secondary">Cancel</button>
              <button onClick={handlePay} disabled={paying} className="btn-primary bg-green-600 hover:bg-green-700">
                {paying ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200 flex justify-between">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">{showDetail.invoice_number}</h2>
                <p className="text-sm text-gray-500">{showDetail.student_name} ({showDetail.roll_number})</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="px-6 py-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Fee Breakdown</h4>
              <div className="space-y-1 mb-4">
                {showDetail.line_items.map((li: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{li.description}</span>
                    <span className="text-gray-800">₹{li.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t pt-1 flex justify-between text-sm font-semibold">
                  <span>Total</span><span>₹{showDetail.total_amount.toLocaleString('en-IN')}</span>
                </div>
                {showDetail.scholarship_discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Scholarship Discount</span><span>-₹{showDetail.scholarship_discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="border-t pt-1 flex justify-between text-sm font-bold">
                  <span>Net Payable</span><span>₹{showDetail.net_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {showDetail.payments.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Payments</h4>
                  {showDetail.payments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">{p.mode?.toUpperCase()} {p.ref ? `(${p.ref})` : ''}</span>
                      <span className="text-green-600 font-medium">₹{p.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Structure Modal */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddFee(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200"><h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Add Fee Structure</h2></div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="label">Program</label>
                <select className="input-field" value={feeForm.program_id} onChange={e => setFeeForm({...feeForm, program_id: e.target.value})}>
                  <option value="">Select program</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Semester</label>
                  <select className="input-field" value={feeForm.semester} onChange={e => setFeeForm({...feeForm, semester: e.target.value})}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select></div>
                <div><label className="label">Fee Type</label>
                  <select className="input-field" value={feeForm.fee_type} onChange={e => setFeeForm({...feeForm, fee_type: e.target.value})}>
                    {['tuition','examination','library','laboratory','hostel','transport','registration','other'].map(t =>
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Amount (₹)</label><input type="number" className="input-field" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} /></div>
                <div><label className="label">Due Date</label><input type="date" className="input-field" value={feeForm.due_date} onChange={e => setFeeForm({...feeForm, due_date: e.target.value})} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowAddFee(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateFeeStructure} className="btn-primary">Add Fee</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoices Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200"><h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Generate Fee Invoices</h2>
              <p className="text-sm text-gray-500">Creates invoices for all active students based on fee structure</p></div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="label">Program (optional)</label>
                <select className="input-field" value={genProgram} onChange={e => setGenProgram(e.target.value)}>
                  <option value="">All Programs</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="label">Semester</label>
                <select className="input-field" value={genSemester} onChange={e => setGenSemester(e.target.value)}>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select></div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowGenerate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleGenerateInvoices} disabled={generating} className="btn-primary">
                {generating ? 'Generating...' : 'Generate Invoices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
