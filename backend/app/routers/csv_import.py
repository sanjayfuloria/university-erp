"""
CSV Import Router - Bulk data import from CSV files
=====================================================
Supports importing: Programs, Courses, Faculty, Students, Leads,
Placement Companies, Fee Structures

Each CSV must have a header row matching the expected column names.
The endpoint returns a summary of rows imported, skipped, and errors.
"""

import csv
import io
from uuid import uuid4
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import (
    Program, Course, CourseOffering,
    User, UserRole, UserProfile, FacultyProfile,
    Student, Lead, LeadSource, LeadStatus,
    PlacementCompany, FeeStructure, FeeType,
)
from app.utils.auth import hash_password, get_current_user, require_roles

router = APIRouter()


def parse_csv(content: bytes) -> list[dict]:
    """Parse CSV bytes into list of dicts, handling BOM and encoding."""
    text = content.decode('utf-8-sig')  # handles BOM
    reader = csv.DictReader(io.StringIO(text))
    # Strip whitespace from headers and values
    rows = []
    for row in reader:
        cleaned = {k.strip().lower().replace(' ', '_'): (v.strip() if v else '') for k, v in row.items()}
        rows.append(cleaned)
    return rows


def safe_int(val, default=None):
    try: return int(float(val)) if val else default
    except: return default


def safe_float(val, default=None):
    try: return float(val) if val else default
    except: return default


# ─── Import Programs ─────────────────────────────────────────────────

@router.post("/programs")
async def import_programs(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: code, name, department, degree_type, duration_years, total_credits,
    total_seats, fee_per_semester, mode, eligibility_criteria, description
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []

    for i, row in enumerate(rows, 1):
        try:
            code = row.get('code', '').upper()
            if not code or not row.get('name'):
                skipped += 1; continue

            # Check duplicate
            existing = await db.execute(select(Program).where(Program.code == code))
            if existing.scalar_one_or_none():
                skipped += 1; continue

            db.add(Program(
                code=code,
                name=row.get('name', ''),
                department=row.get('department', ''),
                degree_type=row.get('degree_type', 'PG'),
                duration_years=safe_int(row.get('duration_years'), 2),
                total_credits=safe_int(row.get('total_credits')),
                total_seats=safe_int(row.get('total_seats')),
                fee_per_semester=safe_float(row.get('fee_per_semester')),
                mode=row.get('mode', 'regular').lower(),
                eligibility_criteria=row.get('eligibility_criteria', ''),
                description=row.get('description', ''),
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows)}


# ─── Import Courses ──────────────────────────────────────────────────

@router.post("/courses")
async def import_courses(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: code, name, program_code, semester, credits, course_type, description
    (program_code must match an existing program's code)
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []

    for i, row in enumerate(rows, 1):
        try:
            code = row.get('code', '').upper()
            prog_code = row.get('program_code', '').upper()
            if not code or not row.get('name') or not prog_code:
                skipped += 1; continue

            # Find program
            prog_r = await db.execute(select(Program).where(Program.code == prog_code))
            prog = prog_r.scalar_one_or_none()
            if not prog:
                errors.append(f"Row {i}: Program '{prog_code}' not found"); continue

            # Check duplicate
            existing = await db.execute(select(Course).where(Course.code == code))
            if existing.scalar_one_or_none():
                skipped += 1; continue

            db.add(Course(
                code=code,
                name=row.get('name', ''),
                program_id=prog.id,
                semester=safe_int(row.get('semester'), 1),
                credits=safe_int(row.get('credits'), 3),
                course_type=row.get('course_type', 'core').lower(),
                description=row.get('description', ''),
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows)}


# ─── Import Faculty ──────────────────────────────────────────────────

@router.post("/faculty")
async def import_faculty(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: first_name, last_name, email, phone, employee_id, department,
    designation, qualification, specialization, experience_years, research_interests
    (Creates user account with default password 'faculty123')
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []

    for i, row in enumerate(rows, 1):
        try:
            email = row.get('email', '').lower()
            if not email or not row.get('first_name'):
                skipped += 1; continue

            # Check duplicate user
            existing = await db.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none():
                skipped += 1; continue

            # Create user
            u = User(email=email, password_hash=hash_password('faculty123'), role=UserRole.FACULTY)
            db.add(u)
            await db.flush()

            # Create profile
            db.add(UserProfile(
                user_id=u.id,
                first_name=row.get('first_name', ''),
                last_name=row.get('last_name', ''),
                phone=row.get('phone', ''),
            ))

            # Create faculty profile
            db.add(FacultyProfile(
                user_id=u.id,
                employee_id=row.get('employee_id', f"FAC-{uuid4().hex[:6].upper()}"),
                department=row.get('department', ''),
                designation=row.get('designation', 'Assistant Professor'),
                qualification=row.get('qualification', ''),
                specialization=row.get('specialization', ''),
                experience_years=safe_int(row.get('experience_years')),
                research_interests=row.get('research_interests', ''),
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows),
            "note": "Default password for all imported faculty: faculty123"}


# ─── Import Students ─────────────────────────────────────────────────

@router.post("/students")
async def import_students(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: first_name, last_name, email, phone, roll_number, program_code,
    batch_year, current_semester, date_of_birth, gender, city, state, pincode
    (Creates user account with default password 'student123')
    (program_code must match an existing program)
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []

    for i, row in enumerate(rows, 1):
        try:
            email = row.get('email', '').lower()
            roll = row.get('roll_number', '')
            prog_code = row.get('program_code', '').upper()
            if not email or not roll or not row.get('first_name'):
                skipped += 1; continue

            # Check duplicate
            existing = await db.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none():
                skipped += 1; continue

            # Find program
            prog_r = await db.execute(select(Program).where(Program.code == prog_code))
            prog = prog_r.scalar_one_or_none()
            if not prog:
                errors.append(f"Row {i}: Program '{prog_code}' not found"); continue

            # Create user
            u = User(email=email, password_hash=hash_password('student123'), role=UserRole.STUDENT)
            db.add(u)
            await db.flush()

            # Create profile
            from app.models.models import Gender
            gender_map = {'male': Gender.MALE, 'female': Gender.FEMALE, 'm': Gender.MALE, 'f': Gender.FEMALE}
            gender_val = gender_map.get(row.get('gender', '').lower())

            dob = None
            if row.get('date_of_birth'):
                try:
                    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y'):
                        try: dob = datetime.strptime(row['date_of_birth'], fmt).date(); break
                        except: continue
                except: pass

            db.add(UserProfile(
                user_id=u.id,
                first_name=row.get('first_name', ''),
                last_name=row.get('last_name', ''),
                phone=row.get('phone', ''),
                date_of_birth=dob,
                gender=gender_val,
                city=row.get('city', ''),
                state=row.get('state', ''),
                pincode=row.get('pincode', ''),
            ))

            # Create student record
            db.add(Student(
                user_id=u.id,
                roll_number=roll,
                program_id=prog.id,
                batch_year=safe_int(row.get('batch_year'), date.today().year),
                current_semester=safe_int(row.get('current_semester'), 1),
                admission_date=date.today(),
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows),
            "note": "Default password for all imported students: student123"}


# ─── Import Leads ────────────────────────────────────────────────────

@router.post("/leads")
async def import_leads(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: first_name, last_name, email, phone, source, status,
    program_code, notes
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []

    source_map = {s.value: s for s in LeadSource}
    status_map = {s.value: s for s in LeadStatus}

    for i, row in enumerate(rows, 1):
        try:
            if not row.get('first_name') or not row.get('email'):
                skipped += 1; continue

            prog_id = None
            if row.get('program_code'):
                prog_r = await db.execute(select(Program).where(Program.code == row['program_code'].upper()))
                prog = prog_r.scalar_one_or_none()
                if prog:
                    prog_id = prog.id

            db.add(Lead(
                first_name=row.get('first_name', ''),
                last_name=row.get('last_name', ''),
                email=row.get('email', ''),
                phone=row.get('phone', ''),
                source=source_map.get(row.get('source', '').lower(), LeadSource.OTHER),
                status=status_map.get(row.get('status', '').lower(), LeadStatus.NEW),
                interested_program_id=prog_id,
                notes=row.get('notes', ''),
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows)}


# ─── Import Placement Companies ──────────────────────────────────────

@router.post("/placement-companies")
async def import_placement_companies(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: name, industry, website, contact_person, contact_email,
    contact_phone, visit_date, roles_offered, package_min_lpa, package_max_lpa
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []

    for i, row in enumerate(rows, 1):
        try:
            if not row.get('name'):
                skipped += 1; continue

            visit_date = None
            if row.get('visit_date'):
                try:
                    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y'):
                        try: visit_date = datetime.strptime(row['visit_date'], fmt).date(); break
                        except: continue
                except: pass

            db.add(PlacementCompany(
                name=row.get('name', ''),
                industry=row.get('industry', ''),
                website=row.get('website', ''),
                contact_person=row.get('contact_person', ''),
                contact_email=row.get('contact_email', ''),
                contact_phone=row.get('contact_phone', ''),
                visit_date=visit_date,
                roles_offered=row.get('roles_offered', ''),
                package_min_lpa=safe_float(row.get('package_min_lpa')),
                package_max_lpa=safe_float(row.get('package_max_lpa')),
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows)}


# ─── Import Fee Structures ───────────────────────────────────────────

@router.post("/fee-structures")
async def import_fee_structures(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """
    CSV columns: program_code, semester, fee_type, amount, due_date
    fee_type: tuition, examination, library, laboratory, hostel, transport, registration, other
    """
    rows = parse_csv(await file.read())
    imported, skipped, errors = 0, 0, []
    fee_type_map = {ft.value: ft for ft in FeeType}

    for i, row in enumerate(rows, 1):
        try:
            prog_code = row.get('program_code', '').upper()
            if not prog_code or not row.get('amount'):
                skipped += 1; continue

            prog_r = await db.execute(select(Program).where(Program.code == prog_code))
            prog = prog_r.scalar_one_or_none()
            if not prog:
                errors.append(f"Row {i}: Program '{prog_code}' not found"); continue

            ft = fee_type_map.get(row.get('fee_type', '').lower(), FeeType.OTHER)

            due = None
            if row.get('due_date'):
                try:
                    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y'):
                        try: due = datetime.strptime(row['due_date'], fmt).date(); break
                        except: continue
                except: pass

            db.add(FeeStructure(
                program_id=prog.id,
                semester=safe_int(row.get('semester'), 1),
                fee_type=ft,
                amount=safe_float(row.get('amount'), 0),
                due_date=due,
            ))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(rows)}


# ─── Download CSV Templates ─────────────────────────────────────────

@router.get("/templates/{entity}")
async def download_template(entity: str):
    """Download a CSV template with the correct headers for each entity type."""
    templates = {
        "programs": "code,name,department,degree_type,duration_years,total_credits,total_seats,fee_per_semester,mode,eligibility_criteria,description\nMBA,Master of Business Administration,School of Management,PG,2,120,120,175000,regular,Bachelor's with 50% aggregate,Two-year MBA program",
        "courses": "code,name,program_code,semester,credits,course_type,description\nMBA-601,Strategic Management,MBA,1,4,core,Core strategy course",
        "faculty": "first_name,last_name,email,phone,employee_id,department,designation,qualification,specialization,experience_years,research_interests\nRajesh,Kumar,rajesh.k@university.edu,+91 98765 43210,FAC-2025-001,School of Management,Professor,Ph.D.,Strategic Management,15,Digital Transformation",
        "students": "first_name,last_name,email,phone,roll_number,program_code,batch_year,current_semester,date_of_birth,gender,city,state,pincode\nAarav,Sharma,aarav.s@gmail.com,+91 98765 43210,MBA-2025-001,MBA,2025,1,2000-05-15,male,Hyderabad,Telangana,500032",
        "leads": "first_name,last_name,email,phone,source,status,program_code,notes\nPriya,Patel,priya.p@gmail.com,+91 87654 32100,website,new,MBA,Interested in MBA program",
        "placement-companies": "name,industry,website,contact_person,contact_email,contact_phone,visit_date,roles_offered,package_min_lpa,package_max_lpa\nTata Consultancy Services,IT Services,https://tcs.com,Amit Shah,amit@tcs.com,+91 98765 43210,2025-03-15,Software Engineer; Business Analyst,4.5,8.0",
        "fee-structures": "program_code,semester,fee_type,amount,due_date\nMBA,1,tuition,113750,2025-07-15\nMBA,1,examination,17500,2025-07-15\nMBA,1,library,8750,2025-07-15",
    }

    if entity not in templates:
        raise HTTPException(400, f"Unknown entity: {entity}. Available: {', '.join(templates.keys())}")

    from fastapi.responses import Response
    return Response(
        content=templates[entity],
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity}_template.csv"}
    )
