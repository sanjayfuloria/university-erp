'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Application, getUser } from '@/lib/api';
import PageShell from '@/components/PageShell';
import StatusBadge from '@/components/StatusBadge';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-gray-800 mt-0.5">{value || '-'}</div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;
  const user = getUser();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Review form
  const [showReview, setShowReview] = useState(false);
  const [review, setReview] = useState({
    academic_score: 7, entrance_score: 7, sop_score: 7, interview_score: 7,
    recommendation: 'admit', comments: '',
  });

  // Offer form
  const [showOffer, setShowOffer] = useState(false);
  const [offer, setOffer] = useState({
    response_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    scholarship_percentage: 0,
    fee_amount: 0,
    remarks: '',
  });

  const fetchApp = async () => {
    try {
      const data = await api.getApplication(appId);
      setApp(data);
      if (data.program_name) {
        // Try to pre-fill fee from program
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApp(); }, [appId]);

  const handleStatusChange = async (status: string) => {
    setActionLoading(status);
    try {
      await api.changeApplicationStatus(appId, status);
      fetchApp();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleSubmitReview = async () => {
    setActionLoading('review');
    try {
      await api.submitReview(appId, review);
      setShowReview(false);
      fetchApp();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleMakeOffer = async () => {
    setActionLoading('offer');
    try {
      await api.makeOffer(appId, offer);
      setShowOffer(false);
      fetchApp();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleEnroll = async () => {
    setActionLoading('enroll');
    try {
      await api.enrollStudent(appId);
      fetchApp();
      alert('Student enrolled successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'academic_admin';
  const canReview = isAdmin || user?.role === 'faculty';

  if (loading) {
    return (
      <PageShell title="Application Detail" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-brand-600">Loading application...</div>
        </div>
      </PageShell>
    );
  }

  if (error || !app) {
    return (
      <PageShell title="Application Detail">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error || 'Not found'}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={app.application_number}
      subtitle={`${app.applicant_name || 'Applicant'} - ${app.program_name || 'Unknown Program'}`}
      action={
        <button onClick={() => router.back()} className="btn-secondary">Back</button>
      }
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-100 text-brand-700 rounded-xl flex items-center justify-center text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {app.applicant_name?.split(' ').map(n => n[0]).join('') || '?'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>{app.applicant_name}</h2>
                <div className="text-sm text-gray-500">{app.program_name} &middot; {app.academic_year}</div>
              </div>
            </div>
            <StatusBadge status={app.status} />
          </div>

          {/* Status pipeline */}
          <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-2">
            {['draft', 'submitted', 'under_review', 'shortlisted', 'offered', 'accepted'].map((step, i) => {
              const steps = ['draft', 'submitted', 'under_review', 'shortlisted', 'offered', 'accepted'];
              const currentIdx = steps.indexOf(app.status);
              const stepIdx = i;
              const isPast = stepIdx < currentIdx;
              const isCurrent = step === app.status;
              const isRejected = app.status === 'rejected';

              return (
                <div key={step} className="flex items-center">
                  {i > 0 && <div className={`w-8 h-0.5 ${isPast ? 'bg-green-400' : 'bg-surface-200'}`} />}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      isCurrent ? 'bg-brand-700 text-white' :
                      isPast ? 'bg-green-100 text-green-700' :
                      'bg-surface-100 text-gray-400'
                    }`}
                  >
                    {step.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Academic Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Academic Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <InfoRow label="10th Board" value={app.tenth_board} />
                <InfoRow label="10th %" value={app.tenth_percentage ? `${app.tenth_percentage}%` : null} />
                <InfoRow label="10th Year" value={app.tenth_year} />
                <InfoRow label="12th Board" value={app.twelfth_board} />
                <InfoRow label="12th %" value={app.twelfth_percentage ? `${app.twelfth_percentage}%` : null} />
                <InfoRow label="12th Year" value={app.twelfth_year} />
                {app.graduation_university && (
                  <>
                    <InfoRow label="University" value={app.graduation_university} />
                    <InfoRow label="Degree" value={app.graduation_degree} />
                    <InfoRow label="Grad %" value={app.graduation_percentage ? `${app.graduation_percentage}%` : null} />
                  </>
                )}
                {app.entrance_exam && (
                  <>
                    <InfoRow label="Entrance Exam" value={app.entrance_exam} />
                    <InfoRow label="Score" value={app.entrance_score} />
                  </>
                )}
              </div>
            </div>

            {app.statement_of_purpose && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Statement of Purpose</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{app.statement_of_purpose}</p>
              </div>
            )}

            {/* Reviews */}
            {app.reviews && app.reviews.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Reviews</h3>
                <div className="space-y-4">
                  {app.reviews.map(r => (
                    <div key={r.id} className="border border-surface-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.recommendation === 'admit' ? 'bg-green-100 text-green-700' :
                            r.recommendation === 'waitlist' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {r.recommendation.toUpperCase()}
                          </span>
                          <span className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
                            {r.overall_score}/10
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(r.reviewed_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {[
                          { label: 'Academic', val: r.academic_score },
                          { label: 'Entrance', val: r.entrance_score },
                          { label: 'SOP', val: r.sop_score },
                          { label: 'Interview', val: r.interview_score },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <div className="text-xs text-gray-400">{s.label}</div>
                            <div className="text-sm font-semibold text-gray-700">{s.val}</div>
                            <div className="w-full bg-surface-100 rounded-full h-1.5 mt-1">
                              <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${s.val * 10}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {r.comments && <p className="text-sm text-gray-500">{r.comments}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offer details */}
            {app.offer && (
              <div className="card p-6 border-2 border-purple-200 bg-purple-50/30">
                <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Admission Offer</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoRow label="Offer Date" value={new Date(app.offer.offer_date).toLocaleDateString('en-IN')} />
                  <InfoRow label="Deadline" value={new Date(app.offer.response_deadline).toLocaleDateString('en-IN')} />
                  <InfoRow label="Scholarship" value={`${app.offer.scholarship_percentage}%`} />
                  <InfoRow label="Fee Amount" value={`₹${app.offer.fee_amount.toLocaleString('en-IN')}`} />
                </div>
                {app.offer.is_accepted !== null && (
                  <div className={`mt-4 inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${
                    app.offer.is_accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {app.offer.is_accepted ? 'Offer Accepted' : 'Offer Declined'}
                  </div>
                )}
                {app.offer.remarks && <p className="text-sm text-gray-500 mt-3">{app.offer.remarks}</p>}
              </div>
            )}
          </div>

          {/* Actions sidebar */}
          <div className="space-y-4">
            {isAdmin && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm" style={{ fontFamily: 'var(--font-display)' }}>Admin Actions</h3>
                <div className="space-y-2">
                  {app.status === 'submitted' && (
                    <button onClick={() => handleStatusChange('under_review')} disabled={!!actionLoading} className="btn-primary w-full">
                      Start Review
                    </button>
                  )}
                  {['under_review', 'interview_completed'].includes(app.status) && (
                    <button onClick={() => handleStatusChange('shortlisted')} disabled={!!actionLoading} className="btn-primary w-full">
                      Shortlist
                    </button>
                  )}
                  {app.status === 'shortlisted' && (
                    <button onClick={() => handleStatusChange('interview_scheduled')} disabled={!!actionLoading} className="btn-secondary w-full">
                      Schedule Interview
                    </button>
                  )}
                  {app.status === 'interview_scheduled' && (
                    <button onClick={() => handleStatusChange('interview_completed')} disabled={!!actionLoading} className="btn-secondary w-full">
                      Interview Done
                    </button>
                  )}
                  {['shortlisted', 'interview_completed', 'under_review'].includes(app.status) && !app.offer && (
                    <button onClick={() => setShowOffer(true)} disabled={!!actionLoading} className="btn-primary w-full bg-purple-600 hover:bg-purple-700">
                      Make Offer
                    </button>
                  )}
                  {app.status === 'accepted' && (
                    <button onClick={handleEnroll} disabled={!!actionLoading} className="btn-primary w-full bg-green-600 hover:bg-green-700">
                      Enroll as Student
                    </button>
                  )}
                  {!['accepted', 'rejected', 'withdrawn', 'draft'].includes(app.status) && (
                    <button onClick={() => handleStatusChange('rejected')} disabled={!!actionLoading} className="btn-danger w-full">
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )}

            {canReview && !['draft', 'rejected', 'withdrawn'].includes(app.status) && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm" style={{ fontFamily: 'var(--font-display)' }}>Evaluation</h3>
                <button onClick={() => setShowReview(true)} className="btn-secondary w-full">
                  Add Review
                </button>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm" style={{ fontFamily: 'var(--font-display)' }}>Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="text-sm text-gray-700">{new Date(app.created_at).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                {app.submitted_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Submitted</div>
                      <div className="text-sm text-gray-700">{new Date(app.submitted_at).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                )}
                {app.reviews?.map(r => (
                  <div key={r.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Reviewed ({r.recommendation})</div>
                      <div className="text-sm text-gray-700">{new Date(r.reviewed_at).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
                {app.offer && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Offer Made</div>
                      <div className="text-sm text-gray-700">{new Date(app.offer.offer_date).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                )}
                {app.offer?.accepted_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Offer Accepted</div>
                      <div className="text-sm text-gray-700">{new Date(app.offer.accepted_at).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReview(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Application Review</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {['academic_score', 'entrance_score', 'sop_score', 'interview_score'].map(field => (
                  <div key={field}>
                    <label className="label">{field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} (0-10)</label>
                    <input
                      type="number" min="0" max="10" step="0.5"
                      className="input-field"
                      value={(review as any)[field]}
                      onChange={e => setReview({ ...review, [field]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="label">Recommendation</label>
                <select className="input-field" value={review.recommendation} onChange={e => setReview({ ...review, recommendation: e.target.value })}>
                  <option value="admit">Admit</option>
                  <option value="waitlist">Waitlist</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div>
                <label className="label">Comments</label>
                <textarea className="input-field" rows={3} value={review.comments} onChange={e => setReview({ ...review, comments: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowReview(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmitReview} disabled={!!actionLoading} className="btn-primary">
                {actionLoading === 'review' ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOffer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowOffer(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-semibold">Make Admission Offer</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Response Deadline</label>
                  <input type="date" className="input-field" value={offer.response_deadline} onChange={e => setOffer({ ...offer, response_deadline: e.target.value })} />
                </div>
                <div>
                  <label className="label">Scholarship %</label>
                  <input type="number" min="0" max="100" className="input-field" value={offer.scholarship_percentage} onChange={e => setOffer({ ...offer, scholarship_percentage: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="label">Fee Amount (₹)</label>
                <input type="number" min="0" className="input-field" value={offer.fee_amount} onChange={e => setOffer({ ...offer, fee_amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Remarks</label>
                <textarea className="input-field" rows={3} value={offer.remarks} onChange={e => setOffer({ ...offer, remarks: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
              <button onClick={() => setShowOffer(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleMakeOffer} disabled={!!actionLoading} className="btn-primary bg-purple-600 hover:bg-purple-700">
                {actionLoading === 'offer' ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
