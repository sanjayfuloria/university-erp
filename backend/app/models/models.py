"""
Database Models - University ERP
=================================
Covers the full lifecycle: Leads → Applications → Students → Alumni

Designed for PostgreSQL on Render free tier.
"""

import uuid
from datetime import datetime, date
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date, DateTime,
    ForeignKey, Enum, JSON, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


# ─── Enums ───────────────────────────────────────────────────────────

class UserRole(str, PyEnum):
    SUPER_ADMIN = "super_admin"
    ACADEMIC_ADMIN = "academic_admin"
    FACULTY = "faculty"
    STUDENT = "student"
    ALUMNI = "alumni"
    APPLICANT = "applicant"


class LeadSource(str, PyEnum):
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    NEWSPAPER = "newspaper"
    EDUCATION_FAIR = "education_fair"
    WALK_IN = "walk_in"
    OTHER = "other"


class LeadStatus(str, PyEnum):
    NEW = "new"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    APPLICATION_SENT = "application_sent"
    CONVERTED = "converted"
    LOST = "lost"


class ApplicationStatus(str, PyEnum):
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


class Gender(str, PyEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class PaymentStatus(str, PyEnum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETED = "completed"
    REFUNDED = "refunded"


# ─── Users & Auth ────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.APPLICANT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    date_of_birth = Column(Date)
    gender = Column(Enum(Gender))
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    photo_url = Column(String(500))

    user = relationship("User", back_populates="profile")


# ─── Programs & Curriculum ───────────────────────────────────────────

class Program(Base):
    __tablename__ = "programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)  # e.g., MBA, BBA, PhD
    name = Column(String(255), nullable=False)
    department = Column(String(255))
    degree_type = Column(String(50))  # UG, PG, Doctoral, Diploma
    duration_years = Column(Integer)
    total_credits = Column(Integer)
    total_seats = Column(Integer)
    fee_per_semester = Column(Float)
    eligibility_criteria = Column(Text)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    mode = Column(String(20), default="regular")  # regular, distance, online
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    applications = relationship("Application", back_populates="program")
    academic_terms = relationship("AcademicTerm", back_populates="program")


class AcademicTerm(Base):
    """Semester / Term configuration per program"""
    __tablename__ = "academic_terms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    name = Column(String(100))  # e.g., "Semester 1", "Trimester 2"
    term_number = Column(Integer)
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Boolean, default=False)

    program = relationship("Program", back_populates="academic_terms")


# ─── Lead Management (Pre-Admission) ────────────────────────────────

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20))
    source = Column(Enum(LeadSource), default=LeadSource.WEBSITE)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    interested_program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    notes = Column(Text)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    interested_program = relationship("Program")
    counselor = relationship("User", foreign_keys=[assigned_to])
    interactions = relationship("LeadInteraction", back_populates="lead")


class LeadInteraction(Base):
    __tablename__ = "lead_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"))
    interaction_type = Column(String(50))  # call, email, meeting, sms
    notes = Column(Text)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="interactions")


# ─── Applications (Admission) ───────────────────────────────────────

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_number = Column(String(20), unique=True, nullable=False)
    applicant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    academic_year = Column(String(9))  # e.g., "2025-2026"
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT)

    # Academic details
    tenth_board = Column(String(100))
    tenth_percentage = Column(Float)
    tenth_year = Column(Integer)
    twelfth_board = Column(String(100))
    twelfth_percentage = Column(Float)
    twelfth_year = Column(Integer)
    graduation_university = Column(String(255))
    graduation_degree = Column(String(100))
    graduation_percentage = Column(Float)
    graduation_year = Column(Integer)
    entrance_exam = Column(String(50))  # CAT, XAT, GMAT, etc.
    entrance_score = Column(Float)

    # Personal statement
    statement_of_purpose = Column(Text)

    # Documents (URLs/paths)
    documents = Column(JSON, default=dict)  # {"photo": "url", "tenth_marksheet": "url", ...}

    # Timestamps
    submitted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    applicant = relationship("User")
    program = relationship("Program", back_populates="applications")
    reviews = relationship("ApplicationReview", back_populates="application")
    offer = relationship("AdmissionOffer", back_populates="application", uselist=False)


class ApplicationReview(Base):
    __tablename__ = "application_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"))
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    academic_score = Column(Float)  # 0-10
    entrance_score = Column(Float)  # 0-10
    sop_score = Column(Float)  # 0-10
    interview_score = Column(Float)  # 0-10
    overall_score = Column(Float)  # Weighted composite
    recommendation = Column(String(20))  # admit, reject, waitlist
    comments = Column(Text)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="reviews")
    reviewer = relationship("User")


class AdmissionOffer(Base):
    __tablename__ = "admission_offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), unique=True)
    offer_date = Column(Date, default=date.today)
    response_deadline = Column(Date)
    scholarship_percentage = Column(Float, default=0)
    fee_amount = Column(Float)
    is_accepted = Column(Boolean, nullable=True)  # None = pending
    accepted_at = Column(DateTime, nullable=True)
    remarks = Column(Text)

    application = relationship("Application", back_populates="offer")


# ─── Students (Post-Admission) ──────────────────────────────────────

class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), unique=True)
    roll_number = Column(String(20), unique=True, nullable=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    batch_year = Column(Integer)  # Year of admission
    current_semester = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    admission_date = Column(Date, default=date.today)

    user = relationship("User")
    application = relationship("Application")
    program = relationship("Program")
    fee_records = relationship("FeeRecord", back_populates="student")


class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    semester = Column(Integer)
    amount_due = Column(Float)
    amount_paid = Column(Float, default=0)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    due_date = Column(Date)
    paid_at = Column(DateTime, nullable=True)
    transaction_ref = Column(String(100))
    remarks = Column(Text)

    student = relationship("Student", back_populates="fee_records")


# ─── Phase 2: Academic Management ────────────────────────────────────

class DayOfWeek(str, PyEnum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"


class AttendanceStatus(str, PyEnum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class Course(Base):
    """Individual course/subject offered within a program."""
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)  # e.g., MBA-501, CSE-301
    name = Column(String(255), nullable=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    semester = Column(Integer, nullable=False)  # Which semester this course belongs to
    credits = Column(Integer, default=3)
    course_type = Column(String(20), default="core")  # core, elective, lab, project
    description = Column(Text)
    max_students = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    program = relationship("Program")
    offerings = relationship("CourseOffering", back_populates="course")


class CourseOffering(Base):
    """A specific instance of a course in an academic term, assigned to a faculty."""
    __tablename__ = "course_offerings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"))
    academic_term_id = Column(UUID(as_uuid=True), ForeignKey("academic_terms.id"), nullable=True)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    academic_year = Column(String(9), default="2025-2026")
    semester = Column(Integer)
    section = Column(String(10), default="A")  # A, B, C for multiple sections
    room_number = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="offerings")
    faculty = relationship("User")
    registrations = relationship("CourseRegistration", back_populates="offering")
    timetable_slots = relationship("TimetableSlot", back_populates="offering")
    attendance_records = relationship("AttendanceRecord", back_populates="offering")

    __table_args__ = (
        UniqueConstraint("course_id", "academic_year", "semester", "section", name="uq_offering"),
    )


class CourseRegistration(Base):
    """Student enrollment in a specific course offering."""
    __tablename__ = "course_registrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    registered_at = Column(DateTime, default=datetime.utcnow)
    is_dropped = Column(Boolean, default=False)
    dropped_at = Column(DateTime, nullable=True)

    student = relationship("Student")
    offering = relationship("CourseOffering", back_populates="registrations")

    __table_args__ = (
        UniqueConstraint("student_id", "offering_id", name="uq_registration"),
    )


class TimetableSlot(Base):
    """Weekly recurring schedule slot for a course offering."""
    __tablename__ = "timetable_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    day_of_week = Column(Enum(DayOfWeek), nullable=False)
    start_time = Column(String(5), nullable=False)  # "09:00"
    end_time = Column(String(5), nullable=False)    # "10:30"
    room_number = Column(String(20))

    offering = relationship("CourseOffering", back_populates="timetable_slots")


class AttendanceRecord(Base):
    """Per-student, per-session attendance entry."""
    __tablename__ = "attendance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    marked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    remarks = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    offering = relationship("CourseOffering", back_populates="attendance_records")
    student = relationship("Student")
    marker = relationship("User", foreign_keys=[marked_by])

    __table_args__ = (
        UniqueConstraint("offering_id", "student_id", "date", name="uq_attendance"),
    )


# ─── Phase 3: Examination & Grading ─────────────────────────────────

class AssessmentType(str, PyEnum):
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    MID_TERM = "mid_term"
    END_TERM = "end_term"
    PROJECT = "project"
    PRESENTATION = "presentation"
    LAB_EXAM = "lab_exam"
    VIVA = "viva"


class GradePoint(str, PyEnum):
    """10-point CGPA scale common in Indian universities."""
    O = "O"       # Outstanding  - 10
    A_PLUS = "A+"  # Excellent   - 9
    A = "A"        # Very Good   - 8
    B_PLUS = "B+"  # Good        - 7
    B = "B"        # Above Avg   - 6
    C = "C"        # Average     - 5
    P = "P"        # Pass        - 4
    F = "F"        # Fail        - 0
    AB = "AB"      # Absent      - 0


GRADE_POINT_MAP = {
    "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6,
    "C": 5, "P": 4, "F": 0, "AB": 0,
}

MARKS_TO_GRADE = [
    (90, "O"), (80, "A+"), (70, "A"), (60, "B+"),
    (50, "B"), (45, "C"), (40, "P"), (0, "F"),
]


def marks_to_grade(percentage: float) -> str:
    for threshold, grade in MARKS_TO_GRADE:
        if percentage >= threshold:
            return grade
    return "F"


class Assessment(Base):
    """An assessment component within a course offering."""
    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    name = Column(String(255), nullable=False)  # "Quiz 1", "Mid-Term Exam"
    assessment_type = Column(Enum(AssessmentType), nullable=False)
    max_marks = Column(Float, nullable=False)
    weightage = Column(Float, nullable=False)  # Percentage contribution, e.g. 20.0 for 20%
    date = Column(Date, nullable=True)
    is_published = Column(Boolean, default=False)  # Whether marks are visible to students
    created_at = Column(DateTime, default=datetime.utcnow)

    offering = relationship("CourseOffering")
    marks = relationship("AssessmentMark", back_populates="assessment")


class AssessmentMark(Base):
    """Individual student's marks for an assessment."""
    __tablename__ = "assessment_marks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"))
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    marks_obtained = Column(Float, nullable=True)  # None = not attempted / absent
    remarks = Column(String(255))
    graded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    graded_at = Column(DateTime, default=datetime.utcnow)

    assessment = relationship("Assessment", back_populates="marks")
    student = relationship("Student")

    __table_args__ = (
        UniqueConstraint("assessment_id", "student_id", name="uq_assessment_mark"),
    )


class CourseGrade(Base):
    """Final computed grade for a student in a course offering."""
    __tablename__ = "course_grades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    total_weighted_marks = Column(Float)   # Weighted aggregate out of 100
    grade = Column(String(3))              # O, A+, A, B+, B, C, P, F, AB
    grade_point = Column(Float)            # Numeric: 10, 9, 8...
    credits = Column(Integer)              # From course
    is_finalized = Column(Boolean, default=False)
    finalized_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    finalized_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    offering = relationship("CourseOffering")
    student = relationship("Student")

    __table_args__ = (
        UniqueConstraint("offering_id", "student_id", name="uq_course_grade"),
    )


class SemesterResult(Base):
    """SGPA/CGPA per student per semester."""
    __tablename__ = "semester_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(9))
    total_credits_earned = Column(Integer, default=0)
    total_grade_points = Column(Float, default=0)    # Sum of (grade_point * credits)
    sgpa = Column(Float, default=0)                   # Semester GPA
    cgpa = Column(Float, default=0)                   # Cumulative up to this semester
    total_credits_cumulative = Column(Integer, default=0)
    total_points_cumulative = Column(Float, default=0)
    is_finalized = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")

    __table_args__ = (
        UniqueConstraint("student_id", "semester", "academic_year", name="uq_semester_result"),
    )


# ─── Phase 4: Fee Management (Enhanced) ─────────────────────────────

class FeeType(str, PyEnum):
    TUITION = "tuition"
    EXAMINATION = "examination"
    LIBRARY = "library"
    LABORATORY = "laboratory"
    HOSTEL = "hostel"
    TRANSPORT = "transport"
    REGISTRATION = "registration"
    CONVOCATION = "convocation"
    OTHER = "other"


class FeeStructure(Base):
    """Fee template per program per semester."""
    __tablename__ = "fee_structures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(9), default="2025-2026")
    fee_type = Column(Enum(FeeType), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date)
    is_active = Column(Boolean, default=True)

    program = relationship("Program")

    __table_args__ = (
        UniqueConstraint("program_id", "semester", "academic_year", "fee_type", name="uq_fee_structure"),
    )


class FeeInvoice(Base):
    """Generated invoice for a student for a semester."""
    __tablename__ = "fee_invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String(30), unique=True, nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    semester = Column(Integer)
    academic_year = Column(String(9))
    total_amount = Column(Float, nullable=False)
    scholarship_discount = Column(Float, default=0)
    net_amount = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0)
    balance = Column(Float, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    due_date = Column(Date)
    generated_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    line_items = relationship("FeeLineItem", back_populates="invoice")
    payments = relationship("FeePayment", back_populates="invoice")


class FeeLineItem(Base):
    """Individual fee components within an invoice."""
    __tablename__ = "fee_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("fee_invoices.id"))
    fee_type = Column(Enum(FeeType), nullable=False)
    description = Column(String(255))
    amount = Column(Float, nullable=False)

    invoice = relationship("FeeInvoice", back_populates="line_items")


class FeePayment(Base):
    """Payment record against an invoice."""
    __tablename__ = "fee_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("fee_invoices.id"))
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(30))  # cash, upi, neft, dd, card
    transaction_ref = Column(String(100))
    receipt_number = Column(String(30))
    paid_at = Column(DateTime, default=datetime.utcnow)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    remarks = Column(Text)

    invoice = relationship("FeeInvoice", back_populates="payments")
    recorder = relationship("User")


# ─── Phase 5: Faculty & HR Lite ─────────────────────────────────────

class LeaveType(str, PyEnum):
    CASUAL = "casual"
    SICK = "sick"
    EARNED = "earned"
    ACADEMIC = "academic"
    DUTY = "duty"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    SPECIAL = "special"


class LeaveStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class FacultyProfile(Base):
    """Extended faculty-specific profile."""
    __tablename__ = "faculty_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    employee_id = Column(String(20), unique=True)
    department = Column(String(255))
    designation = Column(String(100))  # Professor, Assoc Prof, Asst Prof, Lecturer
    qualification = Column(String(255))  # PhD, M.Tech, MBA
    specialization = Column(String(255))
    date_of_joining = Column(Date)
    experience_years = Column(Integer)
    research_interests = Column(Text)
    is_active = Column(Boolean, default=True)

    user = relationship("User")
    publications = relationship("Publication", back_populates="faculty")


class Publication(Base):
    """Faculty research publication tracker."""
    __tablename__ = "publications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("faculty_profiles.id"))
    title = Column(String(500), nullable=False)
    journal_name = Column(String(255))
    publication_type = Column(String(50))  # journal, conference, book_chapter, patent
    year = Column(Integer)
    doi = Column(String(255))
    indexing = Column(String(50))  # scopus, wos, ugc, other
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    faculty = relationship("FacultyProfile", back_populates="publications")


class LeaveApplication(Base):
    """Faculty leave requests and approval workflow."""
    __tablename__ = "leave_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    applicant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    leave_type = Column(Enum(LeaveType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    num_days = Column(Integer)
    reason = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.PENDING)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    applicant = relationship("User", foreign_keys=[applicant_id])
    approver = relationship("User", foreign_keys=[approved_by])


# ─── Phase 6: Alumni & Placement ────────────────────────────────────

class PlacementStatus(str, PyEnum):
    PLACED = "placed"
    UNPLACED = "unplaced"
    HIGHER_STUDIES = "higher_studies"
    ENTREPRENEUR = "entrepreneur"
    NOT_INTERESTED = "not_interested"


class AlumniRecord(Base):
    """Alumni directory record created at graduation."""
    __tablename__ = "alumni_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), unique=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    graduation_year = Column(Integer, nullable=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"))
    final_cgpa = Column(Float)
    current_company = Column(String(255))
    current_designation = Column(String(255))
    current_city = Column(String(100))
    linkedin_url = Column(String(500))
    is_mentor = Column(Boolean, default=False)  # Willing to mentor current students
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    user = relationship("User")
    program = relationship("Program")


class PlacementCompany(Base):
    """Companies visiting campus for recruitment."""
    __tablename__ = "placement_companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    industry = Column(String(100))
    website = Column(String(500))
    contact_person = Column(String(100))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    visit_date = Column(Date)
    academic_year = Column(String(9), default="2025-2026")
    roles_offered = Column(Text)  # Comma-separated roles
    package_min_lpa = Column(Float)  # In LPA (Lakhs Per Annum)
    package_max_lpa = Column(Float)
    students_shortlisted = Column(Integer, default=0)
    students_selected = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PlacementOffer(Base):
    """Individual placement offer to a student."""
    __tablename__ = "placement_offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("placement_companies.id"))
    role = Column(String(255))
    package_lpa = Column(Float)
    offer_date = Column(Date, default=date.today)
    is_accepted = Column(Boolean, nullable=True)
    placement_status = Column(Enum(PlacementStatus), default=PlacementStatus.PLACED)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    company = relationship("PlacementCompany")


class AlumniEvent(Base):
    """Alumni engagement events."""
    __tablename__ = "alumni_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    event_type = Column(String(50))  # reunion, webinar, mentorship, networking, workshop
    event_date = Column(Date)
    venue = Column(String(255))
    is_virtual = Column(Boolean, default=False)
    registration_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
