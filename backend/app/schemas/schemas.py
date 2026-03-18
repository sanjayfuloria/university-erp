"""
Pydantic Schemas for API request/response validation
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID
from enum import Enum


# ─── Enums (mirror DB enums for API) ────────────────────────────────

class UserRoleEnum(str, Enum):
    SUPER_ADMIN = "super_admin"
    ACADEMIC_ADMIN = "academic_admin"
    FACULTY = "faculty"
    STUDENT = "student"
    ALUMNI = "alumni"
    APPLICANT = "applicant"


class LeadSourceEnum(str, Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    NEWSPAPER = "newspaper"
    EDUCATION_FAIR = "education_fair"
    WALK_IN = "walk_in"
    OTHER = "other"


class LeadStatusEnum(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    APPLICATION_SENT = "application_sent"
    CONVERTED = "converted"
    LOST = "lost"


class ApplicationStatusEnum(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    SHORTLISTED = "shortlisted"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_COMPLETED = "interview_completed"
    OFFERED = "offered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


# ─── Auth Schemas ────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.APPLICANT


# ─── User Schemas ────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    email: str
    role: str
    is_active: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Program Schemas ─────────────────────────────────────────────────

class ProgramCreate(BaseModel):
    code: str
    name: str
    department: Optional[str] = None
    degree_type: str
    duration_years: int
    total_credits: Optional[int] = None
    total_seats: Optional[int] = None
    fee_per_semester: Optional[float] = None
    eligibility_criteria: Optional[str] = None
    description: Optional[str] = None
    mode: str = "regular"


class ProgramResponse(BaseModel):
    id: UUID
    code: str
    name: str
    department: Optional[str]
    degree_type: str
    duration_years: int
    total_credits: Optional[int]
    total_seats: Optional[int]
    fee_per_semester: Optional[float]
    eligibility_criteria: Optional[str]
    description: Optional[str]
    mode: str
    is_active: bool

    class Config:
        from_attributes = True


# ─── Lead Schemas ────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    source: LeadSourceEnum = LeadSourceEnum.WEBSITE
    interested_program_id: Optional[UUID] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[LeadStatusEnum] = None
    interested_program_id: Optional[UUID] = None
    notes: Optional[str] = None
    assigned_to: Optional[UUID] = None


class LeadInteractionCreate(BaseModel):
    interaction_type: str  # call, email, meeting, sms
    notes: str


class LeadInteractionResponse(BaseModel):
    id: UUID
    interaction_type: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True


class LeadResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    source: str
    status: str
    interested_program_id: Optional[UUID]
    program_name: Optional[str] = None
    notes: Optional[str]
    assigned_to: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Application Schemas ─────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    program_id: UUID
    academic_year: str = "2025-2026"

    # Academic details
    tenth_board: Optional[str] = None
    tenth_percentage: Optional[float] = None
    tenth_year: Optional[int] = None
    twelfth_board: Optional[str] = None
    twelfth_percentage: Optional[float] = None
    twelfth_year: Optional[int] = None
    graduation_university: Optional[str] = None
    graduation_degree: Optional[str] = None
    graduation_percentage: Optional[float] = None
    graduation_year: Optional[int] = None
    entrance_exam: Optional[str] = None
    entrance_score: Optional[float] = None
    statement_of_purpose: Optional[str] = None


class ApplicationUpdate(BaseModel):
    tenth_board: Optional[str] = None
    tenth_percentage: Optional[float] = None
    tenth_year: Optional[int] = None
    twelfth_board: Optional[str] = None
    twelfth_percentage: Optional[float] = None
    twelfth_year: Optional[int] = None
    graduation_university: Optional[str] = None
    graduation_degree: Optional[str] = None
    graduation_percentage: Optional[float] = None
    graduation_year: Optional[int] = None
    entrance_exam: Optional[str] = None
    entrance_score: Optional[float] = None
    statement_of_purpose: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: UUID
    application_number: str
    applicant_id: UUID
    program_id: UUID
    program_name: Optional[str] = None
    academic_year: str
    status: str
    tenth_board: Optional[str]
    tenth_percentage: Optional[float]
    tenth_year: Optional[int]
    twelfth_board: Optional[str]
    twelfth_percentage: Optional[float]
    twelfth_year: Optional[int]
    graduation_university: Optional[str]
    graduation_degree: Optional[str]
    graduation_percentage: Optional[float]
    graduation_year: Optional[int]
    entrance_exam: Optional[str]
    entrance_score: Optional[float]
    statement_of_purpose: Optional[str]
    applicant_name: Optional[str] = None
    submitted_at: Optional[datetime]
    created_at: datetime
    reviews: Optional[List["ReviewResponse"]] = []
    offer: Optional["OfferResponse"] = None

    class Config:
        from_attributes = True


# ─── Review Schemas ──────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    academic_score: float = Field(ge=0, le=10)
    entrance_score: float = Field(ge=0, le=10)
    sop_score: float = Field(ge=0, le=10)
    interview_score: float = Field(ge=0, le=10)
    recommendation: str  # admit, reject, waitlist
    comments: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    application_id: UUID
    reviewer_id: UUID
    academic_score: float
    entrance_score: float
    sop_score: float
    interview_score: float
    overall_score: float
    recommendation: str
    comments: Optional[str]
    reviewed_at: datetime

    class Config:
        from_attributes = True


# ─── Offer Schemas ───────────────────────────────────────────────────

class OfferCreate(BaseModel):
    response_deadline: date
    scholarship_percentage: float = 0
    fee_amount: float
    remarks: Optional[str] = None


class OfferResponse(BaseModel):
    id: UUID
    application_id: UUID
    offer_date: date
    response_deadline: date
    scholarship_percentage: float
    fee_amount: float
    is_accepted: Optional[bool]
    accepted_at: Optional[datetime]
    remarks: Optional[str]

    class Config:
        from_attributes = True


# ─── Student Schemas ─────────────────────────────────────────────────

class StudentResponse(BaseModel):
    id: UUID
    roll_number: str
    program_name: Optional[str] = None
    batch_year: int
    current_semester: int
    is_active: bool
    admission_date: date
    student_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Dashboard Schemas ───────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_leads: int
    new_leads: int
    total_applications: int
    submitted_applications: int
    under_review: int
    offered: int
    accepted: int
    rejected: int
    total_students: int
    total_programs: int
    leads_by_source: Dict[str, int]
    applications_by_status: Dict[str, int]
    applications_by_program: Dict[str, int]
    recent_applications: List[ApplicationResponse]


# ─── Phase 2: Academic Management Schemas ────────────────────────────

class CourseCreate(BaseModel):
    code: str
    name: str
    program_id: UUID
    semester: int
    credits: int = 3
    course_type: str = "core"
    description: Optional[str] = None
    max_students: int = 60


class CourseResponse(BaseModel):
    id: UUID
    code: str
    name: str
    program_id: UUID
    program_name: Optional[str] = None
    semester: int
    credits: int
    course_type: str
    description: Optional[str]
    max_students: int
    is_active: bool

    class Config:
        from_attributes = True


class CourseOfferingCreate(BaseModel):
    course_id: UUID
    faculty_id: UUID
    academic_year: str = "2025-2026"
    semester: int
    section: str = "A"
    room_number: Optional[str] = None


class CourseOfferingResponse(BaseModel):
    id: UUID
    course_id: UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    faculty_id: UUID
    faculty_name: Optional[str] = None
    academic_year: str
    semester: int
    section: str
    room_number: Optional[str]
    is_active: bool
    registered_count: int = 0
    program_name: Optional[str] = None

    class Config:
        from_attributes = True


class CourseRegistrationCreate(BaseModel):
    student_id: UUID
    offering_id: UUID


class CourseRegistrationResponse(BaseModel):
    id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    offering_id: UUID
    course_name: Optional[str] = None
    registered_at: datetime
    is_dropped: bool

    class Config:
        from_attributes = True


class TimetableSlotCreate(BaseModel):
    offering_id: UUID
    day_of_week: str
    start_time: str  # "09:00"
    end_time: str    # "10:30"
    room_number: Optional[str] = None


class TimetableSlotResponse(BaseModel):
    id: UUID
    offering_id: UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    faculty_name: Optional[str] = None
    section: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    room_number: Optional[str]

    class Config:
        from_attributes = True


class AttendanceMarkRequest(BaseModel):
    """Mark attendance for multiple students in one go."""
    offering_id: UUID
    date: date
    entries: List[Dict[str, str]]  # [{"student_id": "...", "status": "present"}, ...]


class AttendanceRecordResponse(BaseModel):
    id: UUID
    offering_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    date: date
    status: str
    remarks: Optional[str]

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    total_classes: int
    present: int
    absent: int
    late: int
    excused: int
    percentage: float


# ─── Phase 3: Examination & Grading Schemas ──────────────────────────

class AssessmentCreate(BaseModel):
    offering_id: UUID
    name: str
    assessment_type: str
    max_marks: float
    weightage: float
    date: Optional[date] = None


class AssessmentResponse(BaseModel):
    id: UUID
    offering_id: UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    name: str
    assessment_type: str
    max_marks: float
    weightage: float
    date: Optional[date]
    is_published: bool
    marks_entered: int = 0
    class_average: Optional[float] = None

    class Config:
        from_attributes = True


class MarkEntryRequest(BaseModel):
    """Bulk marks entry for an assessment."""
    assessment_id: UUID
    entries: List[Dict[str, Any]]  # [{"student_id": "...", "marks_obtained": 85.5}, ...]


class AssessmentMarkResponse(BaseModel):
    id: UUID
    assessment_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    marks_obtained: Optional[float]
    max_marks: float = 0
    percentage: Optional[float] = None
    remarks: Optional[str]

    class Config:
        from_attributes = True


class CourseGradeResponse(BaseModel):
    id: UUID
    offering_id: UUID
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    credits: int
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    total_weighted_marks: float
    grade: str
    grade_point: float
    is_finalized: bool

    class Config:
        from_attributes = True


class StudentGradeCard(BaseModel):
    """All grades for a student in a semester."""
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    program_name: Optional[str] = None
    semester: int
    academic_year: str
    courses: List[CourseGradeResponse]
    sgpa: float
    cgpa: float
    total_credits: int
    total_credits_cumulative: int


class SemesterResultResponse(BaseModel):
    id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    semester: int
    academic_year: str
    total_credits_earned: int
    sgpa: float
    cgpa: float
    is_finalized: bool

    class Config:
        from_attributes = True


class AssessmentBreakdown(BaseModel):
    """Per-student breakdown of all assessments in a course."""
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    assessments: List[Dict[str, Any]]  # [{name, type, max, obtained, weightage, weighted_score}]
    total_weighted: float
    grade: str
    grade_point: float


# ─── Phase 4: Fee Management Schemas ─────────────────────────────────

class FeeStructureCreate(BaseModel):
    program_id: UUID
    semester: int
    academic_year: str = "2025-2026"
    fee_type: str
    amount: float
    due_date: Optional[date] = None


class FeeStructureResponse(BaseModel):
    id: UUID
    program_id: UUID
    program_name: Optional[str] = None
    semester: int
    academic_year: str
    fee_type: str
    amount: float
    due_date: Optional[date]
    class Config:
        from_attributes = True


class FeeInvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    semester: int
    academic_year: str
    total_amount: float
    scholarship_discount: float
    net_amount: float
    amount_paid: float
    balance: float
    status: str
    due_date: Optional[date]
    line_items: List[Dict[str, Any]] = []
    payments: List[Dict[str, Any]] = []
    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    invoice_id: UUID
    amount: float
    payment_mode: str = "upi"
    transaction_ref: Optional[str] = None
    remarks: Optional[str] = None


class PaymentResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    amount: float
    payment_mode: str
    transaction_ref: Optional[str]
    receipt_number: str
    paid_at: datetime
    remarks: Optional[str]
    class Config:
        from_attributes = True


class FeeDefaulterResponse(BaseModel):
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    program_name: Optional[str] = None
    total_due: float
    total_paid: float
    balance: float


# ─── Phase 5: Faculty & HR Schemas ───────────────────────────────────

class FacultyProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    date_of_joining: Optional[date] = None
    experience_years: Optional[int] = None
    research_interests: Optional[str] = None
    courses_count: int = 0
    publications_count: int = 0
    class Config:
        from_attributes = True


class FacultyProfileCreate(BaseModel):
    user_id: UUID
    employee_id: str
    department: str
    designation: str
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    date_of_joining: Optional[date] = None
    experience_years: Optional[int] = None
    research_interests: Optional[str] = None


class PublicationCreate(BaseModel):
    title: str
    journal_name: Optional[str] = None
    publication_type: str = "journal"
    year: Optional[int] = None
    doi: Optional[str] = None
    indexing: Optional[str] = None


class PublicationResponse(BaseModel):
    id: UUID
    faculty_id: UUID
    title: str
    journal_name: Optional[str]
    publication_type: str
    year: Optional[int]
    doi: Optional[str]
    indexing: Optional[str]
    is_verified: bool
    class Config:
        from_attributes = True


class LeaveApplicationCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: str


class LeaveApplicationResponse(BaseModel):
    id: UUID
    applicant_id: UUID
    applicant_name: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    num_days: int
    reason: str
    status: str
    approved_by: Optional[UUID] = None
    approver_name: Optional[str] = None
    remarks: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


class FacultyWorkloadResponse(BaseModel):
    faculty_id: UUID
    faculty_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    courses_assigned: int
    total_students: int
    weekly_hours: int
    publications: int


# ─── Phase 6: Alumni & Placement Schemas ─────────────────────────────

class AlumniRecordResponse(BaseModel):
    id: UUID
    student_id: UUID
    user_id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    roll_number: Optional[str] = None
    program_name: Optional[str] = None
    graduation_year: int
    final_cgpa: Optional[float] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    current_city: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_mentor: bool
    class Config:
        from_attributes = True


class PlacementCompanyResponse(BaseModel):
    id: UUID
    name: str
    industry: Optional[str] = None
    visit_date: Optional[date] = None
    roles_offered: Optional[str] = None
    package_min_lpa: Optional[float] = None
    package_max_lpa: Optional[float] = None
    students_shortlisted: int
    students_selected: int
    academic_year: str
    class Config:
        from_attributes = True


class PlacementCompanyCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    visit_date: Optional[date] = None
    roles_offered: Optional[str] = None
    package_min_lpa: Optional[float] = None
    package_max_lpa: Optional[float] = None


class PlacementOfferResponse(BaseModel):
    id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    company_name: Optional[str] = None
    role: Optional[str] = None
    package_lpa: Optional[float] = None
    offer_date: Optional[date] = None
    is_accepted: Optional[bool] = None
    placement_status: str
    class Config:
        from_attributes = True


class PlacementOfferCreate(BaseModel):
    student_id: UUID
    company_id: UUID
    role: str
    package_lpa: float


class AlumniEventResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[date] = None
    venue: Optional[str] = None
    is_virtual: bool
    registration_count: int
    class Config:
        from_attributes = True


class PlacementDashboard(BaseModel):
    total_eligible: int
    total_placed: int
    total_offers: int
    placement_percentage: float
    highest_package_lpa: float
    average_package_lpa: float
    median_package_lpa: float
    companies_visited: int
    by_company: List[Dict[str, Any]]
    by_program: List[Dict[str, Any]]


# ─── Phase 7: Analytics Schemas ──────────────────────────────────────

class ERPAnalytics(BaseModel):
    """Comprehensive analytics across all modules."""
    # Admissions funnel
    admissions_funnel: Dict[str, int]
    conversion_rate: float
    # Academics
    avg_sgpa: float
    program_wise_sgpa: List[Dict[str, Any]]
    attendance_avg: float
    # Fees
    fee_collection_rate: float
    total_revenue: float
    outstanding_amount: float
    # Faculty
    total_faculty: int
    avg_workload_hours: float
    total_publications: int
    # Placement
    placement_rate: float
    avg_package_lpa: float
    # Trends
    monthly_applications: List[Dict[str, Any]]
    lead_conversion_funnel: List[Dict[str, Any]]
