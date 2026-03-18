const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string;
  last_name?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  department?: string;
  degree_type: string;
  duration_years: number;
  total_credits?: number;
  total_seats?: number;
  fee_per_semester?: number;
  eligibility_criteria?: string;
  description?: string;
  mode: string;
  is_active: boolean;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  interested_program_id?: string;
  program_name?: string;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  application_id: string;
  reviewer_id: string;
  academic_score: number;
  entrance_score: number;
  sop_score: number;
  interview_score: number;
  overall_score: number;
  recommendation: string;
  comments?: string;
  reviewed_at: string;
}

export interface Offer {
  id: string;
  application_id: string;
  offer_date: string;
  response_deadline: string;
  scholarship_percentage: number;
  fee_amount: number;
  is_accepted?: boolean;
  accepted_at?: string;
  remarks?: string;
}

export interface Application {
  id: string;
  application_number: string;
  applicant_id: string;
  program_id: string;
  program_name?: string;
  academic_year: string;
  status: string;
  tenth_board?: string;
  tenth_percentage?: number;
  tenth_year?: number;
  twelfth_board?: string;
  twelfth_percentage?: number;
  twelfth_year?: number;
  graduation_university?: string;
  graduation_degree?: string;
  graduation_percentage?: number;
  graduation_year?: number;
  entrance_exam?: string;
  entrance_score?: number;
  statement_of_purpose?: string;
  applicant_name?: string;
  submitted_at?: string;
  created_at: string;
  reviews?: Review[];
  offer?: Offer;
}

export interface Student {
  id: string;
  roll_number: string;
  program_name?: string;
  batch_year: number;
  current_semester: number;
  is_active: boolean;
  admission_date: string;
  student_name?: string;
  email?: string;
}

export interface DashboardStats {
  total_leads: number;
  new_leads: number;
  total_applications: number;
  submitted_applications: number;
  under_review: number;
  offered: number;
  accepted: number;
  rejected: number;
  total_students: number;
  total_programs: number;
  leads_by_source: Record<string, number>;
  applications_by_status: Record<string, number>;
  applications_by_program: Record<string, number>;
  recent_applications: Application[];
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('erp_token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('erp_user');
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('erp_token', token);
  localStorage.setItem('erp_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_user');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────
export const api = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: any) =>
    apiFetch<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => apiFetch<User>('/api/auth/me'),

  // ─── Dashboard ──────────────────────────────────────────
  getDashboardStats: () => apiFetch<DashboardStats>('/api/dashboard/stats'),

  // ─── Programs ───────────────────────────────────────────
  getPrograms: () => apiFetch<Program[]>('/api/programs/'),

  createProgram: (data: any) =>
    apiFetch<Program>('/api/programs/', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Leads ──────────────────────────────────────────────
  getLeads: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Lead[]>(`/api/leads/${qs}`);
  },

  createLead: (data: any) =>
    apiFetch<Lead>('/api/leads/', { method: 'POST', body: JSON.stringify(data) }),

  updateLead: (id: string, data: any) =>
    apiFetch<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Applications ───────────────────────────────────────
  getApplications: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Application[]>(`/api/applications/${qs}`);
  },

  getApplication: (id: string) => apiFetch<Application>(`/api/applications/${id}`),

  createApplication: (data: any) =>
    apiFetch<Application>('/api/applications/', { method: 'POST', body: JSON.stringify(data) }),

  submitApplication: (id: string) =>
    apiFetch<Application>(`/api/applications/${id}/submit`, { method: 'POST' }),

  changeApplicationStatus: (id: string, status: string) =>
    apiFetch<Application>(`/api/applications/${id}/status/${status}`, { method: 'POST' }),

  // ─── Reviews ────────────────────────────────────────────
  submitReview: (appId: string, data: any) =>
    apiFetch<Review>(`/api/reviews/${appId}/review`, { method: 'POST', body: JSON.stringify(data) }),

  makeOffer: (appId: string, data: any) =>
    apiFetch<Offer>(`/api/reviews/${appId}/offer`, { method: 'POST', body: JSON.stringify(data) }),

  acceptOffer: (appId: string) =>
    apiFetch<Offer>(`/api/reviews/${appId}/offer/accept`, { method: 'POST' }),

  // ─── Students ───────────────────────────────────────────
  getStudents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Student[]>(`/api/students/${qs}`);
  },

  enrollStudent: (appId: string) =>
    apiFetch<Student>(`/api/students/enroll/${appId}`, { method: 'POST' }),

  // ─── Phase 2: Courses ─────────────────────────────────
  getCourses: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/courses/${qs}`);
  },

  createCourse: (data: any) =>
    apiFetch<any>('/api/courses/', { method: 'POST', body: JSON.stringify(data) }),

  getOfferings: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/courses/offerings${qs}`);
  },

  createOffering: (data: any) =>
    apiFetch<any>('/api/courses/offerings', { method: 'POST', body: JSON.stringify(data) }),

  getRegisteredStudents: (offeringId: string) =>
    apiFetch<any[]>(`/api/courses/offerings/${offeringId}/students`),

  registerStudentForCourse: (data: any) =>
    apiFetch<any>('/api/courses/register', { method: 'POST', body: JSON.stringify(data) }),

  bulkRegister: (offeringId: string) =>
    apiFetch<any>(`/api/courses/register/bulk/${offeringId}`, { method: 'POST' }),

  // ─── Phase 2: Timetable ───────────────────────────────
  getTimetable: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/timetable/${qs}`);
  },

  createTimetableSlot: (data: any) =>
    apiFetch<any>('/api/timetable/', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Phase 2: Attendance ──────────────────────────────
  markAttendance: (data: any) =>
    apiFetch<any[]>('/api/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),

  getAttendance: (offeringId: string, date?: string) => {
    const qs = date ? `?attendance_date=${date}` : '';
    return apiFetch<any[]>(`/api/attendance/offering/${offeringId}${qs}`);
  },

  getAttendanceSummary: (offeringId: string) =>
    apiFetch<any[]>(`/api/attendance/summary/${offeringId}`),

  // ─── Phase 3: Examinations ────────────────────────────
  getAssessments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/exams/assessments${qs}`);
  },

  createAssessment: (data: any) =>
    apiFetch<any>('/api/exams/assessments', { method: 'POST', body: JSON.stringify(data) }),

  publishAssessment: (id: string) =>
    apiFetch<any>(`/api/exams/assessments/${id}/publish`, { method: 'POST' }),

  getMarks: (assessmentId: string) =>
    apiFetch<any[]>(`/api/exams/marks/${assessmentId}`),

  enterMarks: (data: any) =>
    apiFetch<any[]>('/api/exams/marks', { method: 'POST', body: JSON.stringify(data) }),

  computeGrades: (offeringId: string) =>
    apiFetch<any[]>(`/api/exams/compute-grades/${offeringId}`, { method: 'POST' }),

  getCourseGrades: (offeringId: string) =>
    apiFetch<any[]>(`/api/exams/grades/${offeringId}`),

  computeSGPA: (studentId: string, semester?: number, year?: string) => {
    const qs = new URLSearchParams();
    if (semester) qs.set('semester', String(semester));
    if (year) qs.set('academic_year', year);
    return apiFetch<any>(`/api/exams/compute-sgpa/${studentId}?${qs}`, { method: 'POST' });
  },

  getGradeCard: (studentId: string, semester?: number, year?: string) => {
    const qs = new URLSearchParams();
    if (semester) qs.set('semester', String(semester));
    if (year) qs.set('academic_year', year);
    return apiFetch<any>(`/api/exams/grade-card/${studentId}?${qs}`);
  },

  // ─── Phase 4: Fees ────────────────────────────────────
  getFeeStructure: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/fees/structure${qs}`);
  },

  createFeeStructure: (data: any) =>
    apiFetch<any>('/api/fees/structure', { method: 'POST', body: JSON.stringify(data) }),

  generateInvoices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/api/fees/generate-invoices${qs}`, { method: 'POST' });
  },

  getInvoices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/fees/invoices${qs}`);
  },

  recordPayment: (data: any) =>
    apiFetch<any>('/api/fees/pay', { method: 'POST', body: JSON.stringify(data) }),

  getDefaulters: () => apiFetch<any[]>('/api/fees/defaulters'),

  // ─── Phase 5: Faculty ─────────────────────────────────
  getFacultyProfiles: () => apiFetch<any[]>('/api/faculty/profiles'),

  getPublications: (profileId: string) => apiFetch<any[]>(`/api/faculty/publications/${profileId}`),

  getLeaves: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/faculty/leaves${qs}`);
  },

  applyLeave: (data: any) =>
    apiFetch<any>('/api/faculty/leaves', { method: 'POST', body: JSON.stringify(data) }),

  approveLeave: (leaveId: string, action: string, remarks?: string) => {
    const qs = new URLSearchParams({ action });
    if (remarks) qs.set('remarks', remarks);
    return apiFetch<any>(`/api/faculty/leaves/${leaveId}/approve?${qs}`, { method: 'POST' });
  },

  getFacultyWorkload: () => apiFetch<any[]>('/api/faculty/workload'),

  // ─── Phase 6: Alumni & Placement ──────────────────────
  getAlumni: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/alumni/alumni${qs}`);
  },
  getPlacementCompanies: () => apiFetch<any[]>('/api/alumni/companies'),
  createPlacementCompany: (data: any) =>
    apiFetch<any>('/api/alumni/companies', { method: 'POST', body: JSON.stringify(data) }),
  getPlacementOffers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any[]>(`/api/alumni/offers${qs}`);
  },
  createPlacementOffer: (data: any) =>
    apiFetch<any>('/api/alumni/offers', { method: 'POST', body: JSON.stringify(data) }),
  getAlumniEvents: () => apiFetch<any[]>('/api/alumni/events'),
  getPlacementDashboard: () => apiFetch<any>('/api/alumni/placement-dashboard'),

  // ─── Phase 7: Analytics ───────────────────────────────
  getAnalytics: () => apiFetch<any>('/api/analytics/comprehensive'),

  // ─── CSV Import ───────────────────────────────────────
  importCSV: async (entity: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('erp_token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/api/import/${entity}`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Import failed: ${res.status}`);
    }
    return res.json();
  },

  getImportTemplate: (entity: string) =>
    `${API_URL}/api/import/templates/${entity}`,
};
