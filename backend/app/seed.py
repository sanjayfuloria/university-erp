"""
Seed Script - Populates database with realistic demo data
============================================================
Run: python -m app.seed
"""

import asyncio
import random
from datetime import date, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.database import engine, async_session, Base
from app.models.models import *
from app.utils.auth import hash_password


PROGRAMS = [
    {"code": "MBA", "name": "Master of Business Administration", "department": "School of Management", "degree_type": "PG", "duration_years": 2, "total_credits": 120, "total_seats": 120, "fee_per_semester": 175000, "mode": "regular",
     "eligibility_criteria": "Bachelor's degree with 50% aggregate. Valid CAT/XAT/GMAT score.", "description": "A rigorous two-year program with specializations in Finance, Marketing, HR, Analytics, and Operations."},
    {"code": "BBA", "name": "Bachelor of Business Administration", "department": "School of Management", "degree_type": "UG", "duration_years": 3, "total_credits": 90, "total_seats": 180, "fee_per_semester": 85000, "mode": "regular",
     "eligibility_criteria": "10+2 with 50% aggregate from a recognized board.", "description": "Foundation program in business and management with industry exposure from Year 1."},
    {"code": "BTech-CSE", "name": "B.Tech Computer Science & Engineering", "department": "School of Engineering", "degree_type": "UG", "duration_years": 4, "total_credits": 160, "total_seats": 120, "fee_per_semester": 95000, "mode": "regular",
     "eligibility_criteria": "10+2 with Physics, Chemistry, Mathematics. Valid JEE/state entrance score.", "description": "Comprehensive program covering software engineering, AI/ML, data structures, and systems design."},
    {"code": "BTech-ECE", "name": "B.Tech Electronics & Communication", "department": "School of Engineering", "degree_type": "UG", "duration_years": 4, "total_credits": 160, "total_seats": 60, "fee_per_semester": 90000, "mode": "regular",
     "eligibility_criteria": "10+2 with Physics, Chemistry, Mathematics. Valid JEE/state entrance score.", "description": "Covers VLSI, embedded systems, signal processing, and communication networks."},
    {"code": "MBA-ONLINE", "name": "MBA (Online Mode)", "department": "Center for Distance & Online Education", "degree_type": "PG", "duration_years": 2, "total_credits": 100, "total_seats": 500, "fee_per_semester": 55000, "mode": "online",
     "eligibility_criteria": "Bachelor's degree with 50% aggregate. Minimum 2 years work experience preferred.", "description": "UGC-entitled online MBA for working professionals with weekend live sessions and self-paced modules."},
    {"code": "BBA-ONLINE", "name": "BBA (Online Mode)", "department": "Center for Distance & Online Education", "degree_type": "UG", "duration_years": 3, "total_credits": 78, "total_seats": 300, "fee_per_semester": 35000, "mode": "online",
     "eligibility_criteria": "10+2 from a recognized board.", "description": "Flexible online undergraduate program in business administration."},
    {"code": "PhD-MGMT", "name": "Ph.D. in Management", "department": "School of Management", "degree_type": "Doctoral", "duration_years": 4, "total_credits": 60, "total_seats": 15, "fee_per_semester": 50000, "mode": "regular",
     "eligibility_criteria": "MBA/M.Com/equivalent with 55% aggregate. Valid UGC-NET/GATE preferred.", "description": "Research-intensive doctoral program with coursework, qualifying exam, and dissertation."},
    {"code": "MCom", "name": "M.Com (Finance & Accounting)", "department": "School of Commerce", "degree_type": "PG", "duration_years": 2, "total_credits": 80, "total_seats": 60, "fee_per_semester": 45000, "mode": "regular",
     "eligibility_criteria": "B.Com/BBA with 50% aggregate.", "description": "Advanced program in financial accounting, taxation, and corporate finance."},
]

FIRST_NAMES = [
    "Aarav", "Aditi", "Arjun", "Ananya", "Bhavesh", "Charvi", "Deepak", "Diya",
    "Eshan", "Falguni", "Gaurav", "Harini", "Ishaan", "Jaya", "Karthik", "Lakshmi",
    "Manish", "Neha", "Omkar", "Priya", "Rahul", "Sanya", "Tanvi", "Uday",
    "Varun", "Wriddhiman", "Yash", "Zara", "Aditya", "Bhavna", "Chirag", "Divya",
    "Eshwar", "Fatima", "Gopal", "Hema", "Irfan", "Janaki", "Kunal", "Lata",
    "Mohan", "Nisha", "Om", "Pallavi", "Rajesh", "Shruti", "Tushar", "Uma",
]

LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Iyer", "Kumar", "Gupta", "Singh", "Nair",
    "Joshi", "Desai", "Mehta", "Rao", "Bhat", "Mishra", "Agarwal", "Das",
    "Choudhury", "Srinivasan", "Pillai", "Verma", "Kulkarni", "Thakur",
    "Banerjee", "Saxena", "Malhotra", "Kapoor", "Menon", "Chatterjee",
]

BOARDS = ["CBSE", "ICSE", "Telangana State Board", "AP State Board", "Maharashtra Board", "Karnataka Board", "Tamil Nadu Board"]
UNIVERSITIES = ["Osmania University", "JNTU Hyderabad", "Anna University", "Delhi University", "Mumbai University", "Pune University", "Bangalore University", "Calcutta University", "Madras University"]
DEGREES = ["B.Com", "BBA", "B.Sc", "BA", "B.Tech", "BCA"]
ENTRANCE_EXAMS = ["CAT", "XAT", "GMAT", "MAT", "CMAT", "ATMA", "JEE Main", "TS EAMCET", "AP EAMCET"]

LEAD_SOURCES_WEIGHTS = [
    (LeadSource.WEBSITE, 30),
    (LeadSource.SOCIAL_MEDIA, 25),
    (LeadSource.REFERRAL, 15),
    (LeadSource.EDUCATION_FAIR, 12),
    (LeadSource.NEWSPAPER, 10),
    (LeadSource.WALK_IN, 5),
    (LeadSource.OTHER, 3),
]


def weighted_choice(choices_weights):
    choices, weights = zip(*choices_weights)
    return random.choices(choices, weights=weights, k=1)[0]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # ── Admin users ──────────────────────────────────────────
        admin = User(
            email="admin@university.edu",
            password_hash=hash_password("admin123"),
            role=UserRole.SUPER_ADMIN,
        )
        db.add(admin)
        await db.flush()
        db.add(UserProfile(user_id=admin.id, first_name="System", last_name="Administrator"))

        dean = User(
            email="dean@university.edu",
            password_hash=hash_password("dean123"),
            role=UserRole.ACADEMIC_ADMIN,
        )
        db.add(dean)
        await db.flush()
        db.add(UserProfile(user_id=dean.id, first_name="Rajendra", last_name="Prasad"))

        faculty1 = User(
            email="faculty@university.edu",
            password_hash=hash_password("faculty123"),
            role=UserRole.FACULTY,
        )
        db.add(faculty1)
        await db.flush()
        db.add(UserProfile(user_id=faculty1.id, first_name="Meena", last_name="Krishnamurthy"))

        # ── Programs ─────────────────────────────────────────────
        programs = []
        for p_data in PROGRAMS:
            prog = Program(**p_data)
            db.add(prog)
            programs.append(prog)
        await db.flush()

        # ── Leads (50 leads) ─────────────────────────────────────
        leads = []
        for i in range(50):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            lead = Lead(
                first_name=fn,
                last_name=ln,
                email=f"{fn.lower()}.{ln.lower()}{random.randint(1,99)}@gmail.com",
                phone=f"+91 {random.randint(70000,99999)}{random.randint(10000,99999)}",
                source=weighted_choice(LEAD_SOURCES_WEIGHTS),
                status=random.choice(list(LeadStatus)),
                interested_program_id=random.choice(programs).id,
                notes=random.choice([
                    "Called and expressed interest in the program.",
                    "Visited campus during open day.",
                    "Inquired about scholarship options.",
                    "Referred by an alumnus.",
                    "Found us through social media campaign.",
                    None, None,
                ]),
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
            )
            db.add(lead)
            leads.append(lead)
        await db.flush()

        # ── Applicants & Applications (30 applications) ──────────
        statuses_distribution = (
            [ApplicationStatus.SUBMITTED] * 8 +
            [ApplicationStatus.UNDER_REVIEW] * 6 +
            [ApplicationStatus.SHORTLISTED] * 4 +
            [ApplicationStatus.OFFERED] * 4 +
            [ApplicationStatus.ACCEPTED] * 4 +
            [ApplicationStatus.REJECTED] * 3 +
            [ApplicationStatus.DRAFT] * 1
        )

        applicants = []
        applications = []
        for i in range(30):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            email = f"{fn.lower()}.{ln.lower()}.{random.randint(100,999)}@gmail.com"

            u = User(
                email=email,
                password_hash=hash_password("applicant123"),
                role=UserRole.APPLICANT,
            )
            db.add(u)
            await db.flush()

            gender = random.choice([Gender.MALE, Gender.FEMALE])
            db.add(UserProfile(
                user_id=u.id,
                first_name=fn,
                last_name=ln,
                phone=f"+91 {random.randint(70000,99999)}{random.randint(10000,99999)}",
                date_of_birth=date(random.randint(1996, 2005), random.randint(1, 12), random.randint(1, 28)),
                gender=gender,
                city=random.choice(["Hyderabad", "Mumbai", "Bangalore", "Chennai", "Delhi", "Pune", "Kolkata", "Ahmedabad"]),
                state=random.choice(["Telangana", "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Gujarat", "West Bengal"]),
                pincode=str(random.randint(100000, 999999)),
            ))

            prog = random.choice(programs)
            status = random.choice(statuses_distribution)
            tenth_pct = round(random.uniform(60, 98), 1)
            twelfth_pct = round(random.uniform(55, 96), 1)
            grad_pct = round(random.uniform(50, 90), 1) if prog.degree_type == "PG" else None

            app = Application(
                application_number=f"APP-2025-{100001 + i}",
                applicant_id=u.id,
                program_id=prog.id,
                academic_year="2025-2026",
                status=status,
                tenth_board=random.choice(BOARDS),
                tenth_percentage=tenth_pct,
                tenth_year=random.randint(2016, 2021),
                twelfth_board=random.choice(BOARDS),
                twelfth_percentage=twelfth_pct,
                twelfth_year=random.randint(2018, 2023),
                graduation_university=random.choice(UNIVERSITIES) if grad_pct else None,
                graduation_degree=random.choice(DEGREES) if grad_pct else None,
                graduation_percentage=grad_pct,
                graduation_year=random.randint(2021, 2024) if grad_pct else None,
                entrance_exam=random.choice(ENTRANCE_EXAMS) if prog.degree_type in ("PG", "UG") else None,
                entrance_score=round(random.uniform(50, 99), 1) if prog.degree_type in ("PG", "UG") else None,
                statement_of_purpose=random.choice([
                    "I am passionate about pursuing this program to advance my career in the field.",
                    "With a strong academic background and industry exposure, I seek to deepen my expertise.",
                    "This program aligns with my long-term goal of contributing to the Indian business ecosystem.",
                    None,
                ]),
                submitted_at=datetime.utcnow() - timedelta(days=random.randint(1, 60)) if status != ApplicationStatus.DRAFT else None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(5, 90)),
            )
            db.add(app)
            await db.flush()
            applicants.append(u)
            applications.append(app)

            # Add reviews for applications under review or beyond
            if status.value in ("under_review", "shortlisted", "offered", "accepted", "rejected"):
                reviewer = random.choice([admin, dean, faculty1])
                acad_score = round(random.uniform(5, 10), 1)
                ent_score = round(random.uniform(4, 10), 1)
                sop_score = round(random.uniform(5, 10), 1)
                int_score = round(random.uniform(4, 10), 1)
                overall = round(acad_score * 0.3 + ent_score * 0.25 + sop_score * 0.2 + int_score * 0.25, 2)

                rec = "admit" if overall >= 7 else ("waitlist" if overall >= 5.5 else "reject")
                review = ApplicationReview(
                    application_id=app.id,
                    reviewer_id=reviewer.id,
                    academic_score=acad_score,
                    entrance_score=ent_score,
                    sop_score=sop_score,
                    interview_score=int_score,
                    overall_score=overall,
                    recommendation=rec,
                    comments=random.choice([
                        "Strong academic record. Recommended for admission.",
                        "Good entrance score but SOP needs more depth.",
                        "Excellent all-round candidate.",
                        "Below threshold on entrance exam. Consider waitlist.",
                        "Outstanding interview performance.",
                    ]),
                )
                db.add(review)

            # Add offers for offered/accepted
            if status.value in ("offered", "accepted"):
                scholarship = random.choice([0, 10, 15, 25, 50])
                fee = prog.fee_per_semester * (1 - scholarship / 100)
                offer = AdmissionOffer(
                    application_id=app.id,
                    offer_date=date.today() - timedelta(days=random.randint(1, 30)),
                    response_deadline=date.today() + timedelta(days=random.randint(7, 30)),
                    scholarship_percentage=scholarship,
                    fee_amount=round(fee, 2),
                    is_accepted=True if status == ApplicationStatus.ACCEPTED else None,
                    accepted_at=datetime.utcnow() - timedelta(days=random.randint(1, 10)) if status == ApplicationStatus.ACCEPTED else None,
                )
                db.add(offer)

        # ── Enrolled Students (from accepted) ────────────────────
        enrolled_students = []
        for app in applications:
            if app.status == ApplicationStatus.ACCEPTED:
                prog_result = await db.execute(select(Program).where(Program.id == app.program_id))
                prog = prog_result.scalar_one()
                student = Student(
                    user_id=app.applicant_id,
                    application_id=app.id,
                    roll_number=f"{prog.code}-2025-{random.randint(1000,9999)}",
                    program_id=app.program_id,
                    batch_year=2025,
                    current_semester=1,
                    admission_date=date.today() - timedelta(days=random.randint(1, 15)),
                )
                db.add(student)
                enrolled_students.append(student)

        await db.flush()

        # ══════════════════════════════════════════════════════════
        # PHASE 2: Academic Management Seed Data
        # ══════════════════════════════════════════════════════════

        # ── Courses ──────────────────────────────────────────────
        COURSE_DATA = {
            "MBA": [
                ("MBA-501", "Management Principles & Practices", 1, 4, "core"),
                ("MBA-502", "Financial Accounting & Analysis", 1, 4, "core"),
                ("MBA-503", "Marketing Management", 1, 3, "core"),
                ("MBA-504", "Organizational Behaviour", 1, 3, "core"),
                ("MBA-505", "Business Statistics & Analytics", 1, 3, "core"),
                ("MBA-506", "Managerial Economics", 1, 3, "core"),
            ],
            "BBA": [
                ("BBA-101", "Principles of Management", 1, 3, "core"),
                ("BBA-102", "Business Communication", 1, 3, "core"),
                ("BBA-103", "Microeconomics", 1, 3, "core"),
                ("BBA-104", "Financial Accounting", 1, 4, "core"),
                ("BBA-105", "Business Mathematics", 1, 3, "core"),
            ],
            "BTech-CSE": [
                ("CSE-101", "Programming in C", 1, 4, "core"),
                ("CSE-102", "Digital Logic Design", 1, 3, "core"),
                ("CSE-103", "Engineering Mathematics I", 1, 4, "core"),
                ("CSE-104", "Engineering Physics", 1, 3, "core"),
                ("CSE-105", "Programming Lab", 1, 2, "lab"),
                ("CSE-106", "Communication Skills", 1, 2, "core"),
            ],
        }

        courses_by_program = {}
        for prog in programs:
            if prog.code in COURSE_DATA:
                courses_by_program[prog.code] = []
                for code, name, sem, credits, ctype in COURSE_DATA[prog.code]:
                    c = Course(
                        code=code, name=name, program_id=prog.id,
                        semester=sem, credits=credits, course_type=ctype,
                        max_students=prog.total_seats or 60,
                    )
                    db.add(c)
                    courses_by_program[prog.code].append(c)

        await db.flush()

        # ── Additional Faculty ───────────────────────────────────
        FACULTY_NAMES = [
            ("Suresh", "Ramanathan", "suresh.r@university.edu"),
            ("Anita", "Deshmukh", "anita.d@university.edu"),
            ("Vikram", "Chandra", "vikram.c@university.edu"),
            ("Pooja", "Iyer", "pooja.i@university.edu"),
            ("Rakesh", "Agarwal", "rakesh.a@university.edu"),
        ]
        all_faculty = [faculty1]
        for fn, ln, email in FACULTY_NAMES:
            f = User(email=email, password_hash=hash_password("faculty123"), role=UserRole.FACULTY)
            db.add(f)
            await db.flush()
            db.add(UserProfile(user_id=f.id, first_name=fn, last_name=ln))
            all_faculty.append(f)

        await db.flush()

        # ── Course Offerings ─────────────────────────────────────
        ROOMS = ["LH-101", "LH-102", "LH-201", "LH-202", "CR-301", "CR-302", "LAB-101", "LAB-102"]
        all_offerings = []
        for prog_code, course_list in courses_by_program.items():
            for course in course_list:
                offering = CourseOffering(
                    course_id=course.id,
                    faculty_id=random.choice(all_faculty).id,
                    academic_year="2025-2026",
                    semester=course.semester,
                    section="A",
                    room_number=random.choice(ROOMS),
                )
                db.add(offering)
                all_offerings.append(offering)

        await db.flush()

        # ── Timetable Slots ──────────────────────────────────────
        DAYS = list(DayOfWeek)
        TIME_SLOTS = [
            ("09:00", "10:00"), ("10:15", "11:15"), ("11:30", "12:30"),
            ("14:00", "15:00"), ("15:15", "16:15"),
        ]
        for offering in all_offerings:
            # Each course gets 3 slots per week
            chosen_days = random.sample(DAYS[:5], min(3, len(DAYS[:5])))
            for day in chosen_days:
                start, end = random.choice(TIME_SLOTS)
                db.add(TimetableSlot(
                    offering_id=offering.id,
                    day_of_week=day,
                    start_time=start,
                    end_time=end,
                    room_number=offering.room_number,
                ))

        await db.flush()

        # ── Course Registrations & Attendance ────────────────────
        for student in enrolled_students:
            # Find offerings for this student's program and semester
            prog_result2 = await db.execute(select(Program).where(Program.id == student.program_id))
            prog2 = prog_result2.scalar_one()

            relevant_offerings = [
                o for o in all_offerings
                if any(
                    c.program_id == student.program_id and c.semester == student.current_semester
                    for c_code, c_list in courses_by_program.items()
                    for c in c_list
                    if c.id == o.course_id
                )
            ]

            for offering in relevant_offerings:
                # Register
                reg = CourseRegistration(student_id=student.id, offering_id=offering.id)
                db.add(reg)

                # Generate 10-15 days of attendance
                for days_ago in range(random.randint(10, 15)):
                    att_date = date.today() - timedelta(days=days_ago + 1)
                    if att_date.weekday() >= 5:  # Skip weekends
                        continue
                    status_choice = random.choices(
                        [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED],
                        weights=[70, 15, 10, 5],
                        k=1
                    )[0]
                    db.add(AttendanceRecord(
                        offering_id=offering.id,
                        student_id=student.id,
                        date=att_date,
                        status=status_choice,
                        marked_by=random.choice(all_faculty).id,
                    ))

        await db.commit()

        # ══════════════════════════════════════════════════════════
        # PHASE 3: Examination & Grading Seed Data
        # ══════════════════════════════════════════════════════════

        ASSESSMENT_TEMPLATES = [
            ("Quiz 1", "quiz", 20, 10),
            ("Assignment 1", "assignment", 20, 10),
            ("Mid-Term Exam", "mid_term", 50, 30),
            ("Assignment 2", "assignment", 20, 10),
            ("Quiz 2", "quiz", 20, 10),
            ("End-Term Exam", "end_term", 100, 30),
        ]

        total_assessments = 0
        total_marks = 0
        total_grades = 0

        for offering in all_offerings:
            # Create assessments
            offering_assessments = []
            for name, atype, max_marks, weightage in ASSESSMENT_TEMPLATES:
                a = Assessment(
                    offering_id=offering.id,
                    name=name,
                    assessment_type=AssessmentType(atype),
                    max_marks=max_marks,
                    weightage=weightage,
                    date=date.today() - timedelta(days=random.randint(1, 60)),
                    is_published=True,
                )
                db.add(a)
                offering_assessments.append(a)
                total_assessments += 1

            await db.flush()

            # Get registered students for this offering
            regs = await db.execute(
                select(CourseRegistration).where(
                    CourseRegistration.offering_id == offering.id,
                    CourseRegistration.is_dropped == False,
                )
            )
            reg_students = [r.student_id for r in regs.scalars().all()]

            # Enter marks for each student and each assessment
            for sid in reg_students:
                for a in offering_assessments:
                    # Generate realistic marks: bell curve around 65%
                    mean_pct = random.gauss(0.68, 0.15)
                    mean_pct = max(0.15, min(0.98, mean_pct))
                    marks = round(a.max_marks * mean_pct, 1)
                    db.add(AssessmentMark(
                        assessment_id=a.id,
                        student_id=sid,
                        marks_obtained=marks,
                        graded_by=random.choice(all_faculty).id,
                    ))
                    total_marks += 1

            await db.flush()

            # Compute course grades
            course_result = await db.execute(select(Course).where(Course.id == offering.course_id))
            course_obj = course_result.scalar_one_or_none()
            credits = course_obj.credits if course_obj else 3

            for sid in reg_students:
                total_weighted = 0
                for a in offering_assessments:
                    mark_r = await db.execute(
                        select(AssessmentMark).where(
                            AssessmentMark.assessment_id == a.id,
                            AssessmentMark.student_id == sid,
                        )
                    )
                    m = mark_r.scalar_one_or_none()
                    if m and m.marks_obtained is not None:
                        pct = (m.marks_obtained / a.max_marks) * 100
                        total_weighted += (pct * a.weightage) / 100

                total_weighted = round(total_weighted, 2)
                grade = marks_to_grade(total_weighted)
                gp = GRADE_POINT_MAP.get(grade, 0)

                db.add(CourseGrade(
                    offering_id=offering.id, student_id=sid,
                    total_weighted_marks=total_weighted,
                    grade=grade, grade_point=gp, credits=credits,
                    is_finalized=True, finalized_by=admin.id,
                    finalized_at=datetime.utcnow(),
                ))
                total_grades += 1

        await db.flush()

        # Compute SGPA/CGPA for each enrolled student
        total_results = 0
        for student in enrolled_students:
            student_grades = await db.execute(
                select(CourseGrade).where(CourseGrade.student_id == student.id)
            )
            cgs = student_grades.scalars().all()
            if not cgs:
                continue

            total_credits = sum(cg.credits for cg in cgs)
            total_points = sum(cg.grade_point * cg.credits for cg in cgs)
            sgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0

            db.add(SemesterResult(
                student_id=student.id,
                semester=1,
                academic_year="2025-2026",
                total_credits_earned=total_credits,
                total_grade_points=total_points,
                sgpa=sgpa,
                cgpa=sgpa,  # First semester, so CGPA = SGPA
                total_credits_cumulative=total_credits,
                total_points_cumulative=total_points,
                is_finalized=True,
            ))
            total_results += 1

        await db.commit()

        # ══════════════════════════════════════════════════════════
        # PHASE 4: Fee Management Seed Data
        # ══════════════════════════════════════════════════════════

        FEE_COMPONENTS = [
            (FeeType.TUITION, 0.65),      # 65% of total fee
            (FeeType.EXAMINATION, 0.10),
            (FeeType.LIBRARY, 0.05),
            (FeeType.LABORATORY, 0.08),
            (FeeType.REGISTRATION, 0.02),
            (FeeType.OTHER, 0.10),
        ]

        total_invoices = 0
        total_payments = 0
        for prog in programs:
            if not prog.fee_per_semester:
                continue
            for fee_type, pct in FEE_COMPONENTS:
                db.add(FeeStructure(
                    program_id=prog.id, semester=1,
                    academic_year="2025-2026", fee_type=fee_type,
                    amount=round(prog.fee_per_semester * pct, 2),
                    due_date=date.today() - timedelta(days=15),
                ))
        await db.flush()

        # Generate invoices for enrolled students
        for student in enrolled_students:
            prog_r = await db.execute(select(Program).where(Program.id == student.program_id))
            prog_obj = prog_r.scalar_one_or_none()
            if not prog_obj or not prog_obj.fee_per_semester:
                continue

            fee_structs = await db.execute(
                select(FeeStructure).where(
                    FeeStructure.program_id == student.program_id,
                    FeeStructure.semester == 1,
                )
            )
            fees = fee_structs.scalars().all()
            if not fees:
                continue

            total_fee = sum(f.amount for f in fees)
            # Check scholarship
            scholarship = 0
            app_r = await db.execute(
                select(AdmissionOffer).where(AdmissionOffer.application_id == student.application_id)
            )
            offer = app_r.scalar_one_or_none()
            if offer:
                scholarship = offer.scholarship_percentage or 0

            discount = round(total_fee * scholarship / 100, 2)
            net = round(total_fee - discount, 2)
            inv_num = f"INV-2025-{random.randint(100000, 999999)}"

            invoice = FeeInvoice(
                invoice_number=inv_num, student_id=student.id,
                semester=1, academic_year="2025-2026",
                total_amount=total_fee, scholarship_discount=discount,
                net_amount=net, amount_paid=0, balance=net,
                due_date=date.today() - timedelta(days=15),
            )
            db.add(invoice)
            await db.flush()

            for f in fees:
                db.add(FeeLineItem(
                    invoice_id=invoice.id, fee_type=f.fee_type,
                    description=f"{f.fee_type.value.replace('_', ' ').title()} Fee",
                    amount=f.amount,
                ))
            total_invoices += 1

            # Some students have paid (60%), some partial (25%), some not (15%)
            roll = random.random()
            if roll < 0.60:
                paid = net
                status = PaymentStatus.COMPLETED
            elif roll < 0.85:
                paid = round(net * random.uniform(0.3, 0.7), 2)
                status = PaymentStatus.PARTIAL
            else:
                paid = 0
                status = PaymentStatus.PENDING

            if paid > 0:
                db.add(FeePayment(
                    invoice_id=invoice.id, amount=paid,
                    payment_mode=random.choice(["upi", "neft", "dd", "card"]),
                    transaction_ref=f"TXN-{random.randint(100000, 999999)}",
                    receipt_number=f"RCP-{random.randint(10000000, 99999999)}",
                    recorded_by=admin.id,
                ))
                invoice.amount_paid = paid
                invoice.balance = round(net - paid, 2)
                invoice.status = status
                total_payments += 1

        await db.flush()

        # ══════════════════════════════════════════════════════════
        # PHASE 5: Faculty & HR Seed Data
        # ══════════════════════════════════════════════════════════

        DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Assistant Professor"]
        QUALIFICATIONS = ["Ph.D.", "Ph.D.", "M.Tech", "MBA", "Ph.D.", "M.Phil"]
        SPECIALIZATIONS = [
            "Strategic Management & Marketing",
            "Financial Engineering & Derivatives",
            "Machine Learning & NLP",
            "Signal Processing & IoT",
            "Operations Research",
            "Organizational Behaviour",
        ]
        DEPARTMENTS = ["School of Management", "School of Engineering", "School of Commerce", "Center for Distance & Online Education"]

        total_pubs = 0
        total_leaves = 0
        for i, fac in enumerate(all_faculty):
            fp = FacultyProfile(
                user_id=fac.id,
                employee_id=f"FAC-{2020 + i:04d}-{i + 1:03d}",
                department=DEPARTMENTS[i % len(DEPARTMENTS)],
                designation=DESIGNATIONS[i % len(DESIGNATIONS)],
                qualification=QUALIFICATIONS[i % len(QUALIFICATIONS)],
                specialization=SPECIALIZATIONS[i % len(SPECIALIZATIONS)],
                date_of_joining=date(2020 + (i % 4), random.randint(1, 12), random.randint(1, 28)),
                experience_years=random.randint(3, 25),
                research_interests=SPECIALIZATIONS[i % len(SPECIALIZATIONS)],
            )
            db.add(fp)
            await db.flush()

            # Add publications
            for j in range(random.randint(2, 8)):
                db.add(Publication(
                    faculty_id=fp.id,
                    title=random.choice([
                        "Impact of Digital Transformation on Indian SMEs",
                        "Machine Learning Approaches for Credit Risk Assessment",
                        "Blockchain Applications in Supply Chain Management",
                        "A Study on Consumer Behaviour in E-Commerce",
                        "Deep Learning for Natural Language Understanding",
                        "Sustainable Business Models in Emerging Economies",
                        "IoT-Based Smart Campus: Architecture and Implementation",
                        "Financial Inclusion Through Mobile Banking in India",
                        "Predicting Stock Returns Using Ensemble Methods",
                        "Role of AI in Higher Education Pedagogy",
                    ]) + f" ({random.randint(1, 99)})",
                    journal_name=random.choice([
                        "Journal of Business Research", "IEEE Transactions",
                        "Decision Support Systems", "Computers & Education",
                        "International Journal of Management",
                        "Journal of Finance", "Indian Management Review",
                    ]),
                    publication_type=random.choice(["journal", "conference", "book_chapter"]),
                    year=random.randint(2019, 2025),
                    indexing=random.choice(["scopus", "wos", "ugc", "scopus"]),
                    is_verified=random.choice([True, True, False]),
                ))
                total_pubs += 1

            # Add leave applications
            for _ in range(random.randint(1, 4)):
                start = date.today() - timedelta(days=random.randint(10, 90))
                num = random.randint(1, 5)
                status = random.choice([LeaveStatus.APPROVED, LeaveStatus.APPROVED, LeaveStatus.PENDING, LeaveStatus.REJECTED])
                db.add(LeaveApplication(
                    applicant_id=fac.id,
                    leave_type=random.choice(list(LeaveType)),
                    start_date=start,
                    end_date=start + timedelta(days=num - 1),
                    num_days=num,
                    reason=random.choice([
                        "Personal work", "Medical appointment",
                        "Conference attendance", "Family function",
                        "Research collaboration visit",
                    ]),
                    status=status,
                    approved_by=admin.id if status != LeaveStatus.PENDING else None,
                    approved_at=datetime.utcnow() if status != LeaveStatus.PENDING else None,
                ))
                total_leaves += 1

        await db.commit()

        # ══════════════════════════════════════════════════════════
        # PHASE 6: Alumni & Placement Seed Data
        # ══════════════════════════════════════════════════════════

        COMPANIES = [
            ("Tata Consultancy Services", "IT Services", 4.5, 8.0, "Software Engineer, Business Analyst"),
            ("Infosys", "IT Services", 3.8, 7.5, "Systems Engineer, Consultant"),
            ("Deloitte India", "Consulting", 6.0, 12.0, "Analyst, Associate Consultant"),
            ("HDFC Bank", "Banking", 5.0, 9.0, "Management Trainee, Analyst"),
            ("Amazon", "E-Commerce/Tech", 12.0, 28.0, "SDE-1, Business Analyst"),
            ("Wipro", "IT Services", 3.5, 6.5, "Project Engineer, Data Analyst"),
            ("ICICI Bank", "Banking", 4.5, 8.0, "Probationary Officer, Credit Analyst"),
            ("Accenture", "Consulting", 4.5, 10.0, "Analyst, Associate"),
            ("HCL Technologies", "IT Services", 4.0, 7.0, "Software Engineer, Network Engineer"),
            ("Reliance Industries", "Conglomerate", 6.0, 15.0, "Management Trainee, Engineer"),
        ]

        placement_companies = []
        for name, industry, min_pkg, max_pkg, roles in COMPANIES:
            c = PlacementCompany(
                name=name, industry=industry,
                visit_date=date.today() - timedelta(days=random.randint(5, 60)),
                roles_offered=roles,
                package_min_lpa=min_pkg, package_max_lpa=max_pkg,
                students_shortlisted=random.randint(5, 20),
                students_selected=0,
            )
            db.add(c)
            placement_companies.append(c)
        await db.flush()

        # Create placement offers for enrolled students
        total_offers_count = 0
        placed_students = set()
        roles_list = ["Software Engineer", "Business Analyst", "Management Trainee", "Data Analyst", "Systems Engineer", "Consultant", "Associate"]

        for student in enrolled_students:
            if random.random() < 0.7:  # 70% placement rate
                company = random.choice(placement_companies)
                pkg = round(random.uniform(company.package_min_lpa, company.package_max_lpa), 2)
                db.add(PlacementOffer(
                    student_id=student.id,
                    company_id=company.id,
                    role=random.choice(roles_list),
                    package_lpa=pkg,
                    offer_date=date.today() - timedelta(days=random.randint(1, 30)),
                    is_accepted=True,
                    placement_status=PlacementStatus.PLACED,
                ))
                company.students_selected += 1
                placed_students.add(student.id)
                total_offers_count += 1

        # Create alumni records for placed students
        total_alumni = 0
        CITIES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai", "Pune", "Gurugram", "Noida"]
        for student in enrolled_students:
            # Get CGPA
            sr = await db.execute(
                select(SemesterResult).where(SemesterResult.student_id == student.id).order_by(SemesterResult.semester.desc())
            )
            sem_result = sr.scalars().first()
            cgpa = sem_result.cgpa if sem_result else round(random.uniform(5.5, 9.5), 2)

            offer_r = await db.execute(
                select(PlacementOffer).options(joinedload(PlacementOffer.company))
                .where(PlacementOffer.student_id == student.id)
            )
            offer = offer_r.unique().scalars().first()

            db.add(AlumniRecord(
                student_id=student.id, user_id=student.user_id,
                graduation_year=2025, program_id=student.program_id,
                final_cgpa=cgpa,
                current_company=offer.company.name if offer and offer.company else random.choice(["Freelancer", "Self-employed", None]),
                current_designation=offer.role if offer else None,
                current_city=random.choice(CITIES),
                is_mentor=random.choice([True, False, False]),
            ))
            total_alumni += 1

        # Alumni events
        EVENTS = [
            ("Annual Alumni Meet 2025", "reunion", "IFHE Hyderabad Campus", False),
            ("AI in Business - Webinar Series", "webinar", "Online (Zoom)", True),
            ("Mentorship Program Launch", "mentorship", "Online", True),
            ("Alumni Networking Dinner - Mumbai Chapter", "networking", "Taj Hotel, Mumbai", False),
            ("Career Guidance Workshop", "workshop", "IFHE Auditorium", False),
        ]
        for title, etype, venue, virtual in EVENTS:
            db.add(AlumniEvent(
                title=title, event_type=etype,
                event_date=date.today() + timedelta(days=random.randint(-30, 60)),
                venue=venue, is_virtual=virtual,
                registration_count=random.randint(15, 150),
                description=f"Join us for {title}. Open to all alumni and current students.",
            ))

        await db.commit()
        print("=" * 60)
        print("  SEED COMPLETE (All 7 Phases)")
        print("=" * 60)
        print(f"  Programs:         {len(programs)}")
        print(f"  Courses:          {sum(len(v) for v in courses_by_program.values())}")
        print(f"  Offerings:        {len(all_offerings)}")
        print(f"  Assessments:      {total_assessments}")
        print(f"  Marks entered:    {total_marks}")
        print(f"  Course grades:    {total_grades}")
        print(f"  SGPA results:     {total_results}")
        print(f"  Fee invoices:     {total_invoices}")
        print(f"  Payments:         {total_payments}")
        print(f"  Faculty:          {len(all_faculty)}")
        print(f"  Publications:     {total_pubs}")
        print(f"  Leave apps:       {total_leaves}")
        print(f"  Companies:        {len(placement_companies)}")
        print(f"  Placement offers: {total_offers_count}")
        print(f"  Alumni records:   {total_alumni}")
        print(f"  Alumni events:    {len(EVENTS)}")
        print(f"  Leads:            {len(leads)}")
        print(f"  Applications:     {len(applications)}")
        print(f"  Students:         {len(enrolled_students)}")
        print()
        print("  Login credentials:")
        print("  ─────────────────────────────────────")
        print("  Super Admin:    admin@university.edu / admin123")
        print("  Academic Admin: dean@university.edu  / dean123")
        print("  Faculty:        faculty@university.edu / faculty123")
        print("  More Faculty:   suresh.r@university.edu / faculty123")
        print("  Any applicant:  (email from DB) / applicant123")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
