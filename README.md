# University ERP System

A comprehensive university ERP system covering the complete student lifecycle — from pre-admission inquiries through alumni management. Built for deployment on free tiers with no credit card required anywhere.

---

## Architecture

```
┌───────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Vercel (Free)     │     │  Render (Free)    │     │  Supabase (Free) │
│  No card required  │────▶│  No card required │────▶│  No card required│
│                    │     │                    │     │                  │
│  Next.js 14        │     │  FastAPI           │     │  PostgreSQL 15   │
│  Frontend + UI     │     │  REST API          │     │  500 MB storage  │
│  Role-based        │     │  JWT Auth          │     │  No expiry       │
│  17 Pages          │     │  15 API Routers    │     │  31 Tables       │
└───────────────────┘     └──────────────────┘     └──────────────────┘
```

| Platform | What it hosts | Cost |
|----------|--------------|------|
| Supabase | PostgreSQL database (500 MB, no expiry) | Free, no card |
| Render | FastAPI backend (750 hrs/month) | Free, no card |
| Vercel | Next.js frontend (100 GB bandwidth) | Free, no card |

---

## Deployment Guide

### Prerequisites

- A GitHub account (https://github.com)
- Git installed on your computer (`git --version` to check)

### Step 1: Set up the database on Supabase (5 minutes)

1. Go to https://supabase.com and sign in with GitHub
2. Click "New Project"
3. Fill in:
   - Project name: `university-erp`
   - Database password: type a simple password using only letters and numbers (e.g. `UnivErp2025db`). Save this password — you will need it shortly.
   - Region: South Asia (Mumbai)
4. Wait 2 minutes for provisioning
5. Click the green "Connect" button at the top
6. Click the "Direct" tab (second tab, says "Connection string")
7. Select "Session pooler" (port 5432)
8. Copy the URI. It looks like:
   ```
   postgresql://postgres.abcxyz:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```
9. Replace `[YOUR-PASSWORD]` (including the square brackets) with your actual password
10. Save this complete URI

If you lose your password, go to Project Settings (gear icon) > Database > Reset Database Password.

### Step 2: Push code to GitHub (5 minutes)

1. Create a new repository at https://github.com/new
   - Name: `university-erp`
   - Do NOT check "Add a README" (the project already has one)
2. Extract the downloaded project archive
3. Open terminal and run:
   ```bash
   cd university-erp
   git init
   git add .
   git commit -m "University ERP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/university-erp.git
   git push -u origin main
   ```

### Step 3: Deploy backend on Render (10 minutes)

1. Go to https://render.com and sign in with GitHub
2. DO NOT add a credit card at any point
3. Click "New" > "Web Service"
4. Connect your `university-erp` repository
5. Configure:
   - Name: `university-erp-api`
   - Root Directory: `backend`
   - Runtime: Docker
   - Instance Type: Free (verify it says Free)
6. Add Environment Variables:
   - `DATABASE_URL` = your Supabase URI from Step 1
   - `SECRET_KEY` = any random string (e.g. `mysecretkey2025xyz`)
   - `FRONTEND_URL` = `http://localhost:3000` (update after Step 4)
7. Click "Deploy Web Service"
8. Wait 3-5 minutes for the build
9. Note your backend URL (e.g. `https://university-erp-api.onrender.com`)

### Step 4: Seed the database

Since the Render free tier does not provide Shell access, a seed endpoint is included. Open this URL in your browser:

```
https://YOUR-RENDER-URL.onrender.com/api/seed
```

The page will appear to hang for 30-60 seconds. Wait for it to return a JSON response with `"status": "success"` and login credentials.

### Step 5: Deploy frontend on Vercel (5 minutes)

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New..." > "Project"
3. Import your `university-erp` repository
4. Set Root Directory to `frontend`
5. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = your Render URL from Step 3
6. Click "Deploy"
7. Note your frontend URL (e.g. `https://university-erp-xxxx.vercel.app`)

### Step 6: Connect frontend to backend

1. Go to Render Dashboard > your service > Environment
2. Edit `FRONTEND_URL` to your Vercel URL
3. Save — Render will auto-redeploy (2-3 minutes)

### Step 7: Login

Open your Vercel URL and login with:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@university.edu | admin123 |
| Academic Admin (Dean) | dean@university.edu | dean123 |
| Faculty | faculty@university.edu | faculty123 |
| Additional Faculty | suresh.r@university.edu | faculty123 |

---

## Keeping It Free

### Supabase (Database)
- No credit card needed
- Database does NOT expire
- Projects pause after 7 days of inactivity — visit the app or Supabase dashboard to keep it active
- If paused, click "Restore" in Supabase dashboard (takes 1 minute)

### Render (Backend)
- Never add a credit card — without a card, you can never be charged
- Service sleeps after 15 minutes of no traffic
- Before any demo, visit `https://YOUR-RENDER-URL.onrender.com/api/health` one minute beforehand to wake it up
- If limits are hit, service is suspended (not billed) and resets on the 1st of the month

### Vercel (Frontend)
- No credit card needed
- 100 GB bandwidth/month — more than enough for demos

---

## Modules

### Phase 1: Admissions
- Lead Management — capture and track pre-admission inquiries from website, referral, social media, education fairs, walk-ins
- Application Lifecycle — Draft > Submit > Review > Shortlist > Interview > Offer > Accept
- Weighted Review Scoring — Academic 30%, Entrance 25%, SOP 20%, Interview 25%
- Offer Management — scholarships, fee calculation, response deadlines
- Student Enrollment — convert accepted applications into student records
- Dashboard — real-time analytics, status breakdowns, program-wise charts

### Phase 2: Academic Management
- Course Catalog — courses with codes, credits, types (core/elective/lab/project)
- Course Offerings — assign faculty to courses with section and room
- Student Registration — individual or bulk auto-register by program and semester
- Weekly Timetable — grid view (time x day) and list view, color-coded by course
- Attendance — mark (click to toggle Present/Absent/Late/Excused), summary with percentage bars

### Phase 3: Examinations & Grading
- Assessments — Quiz, Assignment, Mid-Term, End-Term, Project, Presentation, Lab Exam, Viva
- Marks Entry — bulk entry with weightage validation (must total 100%)
- Grade Computation — 10-point scale (O, A+, A, B+, B, C, P, F) with automatic calculation
- SGPA/CGPA — semester and cumulative GPA computation
- Grade Cards — per-student results with course-wise breakdown and grading scale reference

### Phase 4: Fee Management
- Fee Structure — per-program, per-semester components (tuition, examination, library, laboratory, hostel, transport, registration)
- Invoice Generation — auto-creates invoices for all active students with scholarship discounts
- Payment Recording — UPI, NEFT, DD, card, cash with transaction references and receipt numbers
- Defaulter Tracking — aggregated view of students with overdue unpaid balances

### Phase 5: Faculty & HR
- Faculty Profiles — employee ID, department, designation, qualification, specialization, experience
- Publications — journal, conference, book chapter with Scopus/WoS/UGC indexing
- Leave Management — application and approval workflow (casual, sick, earned, academic, duty, special)
- Workload Summary — courses assigned, total students, weekly teaching hours, publication count

### Phase 6: Alumni & Placement
- Placement Companies — 10 companies with industry, roles, package ranges, visit dates
- Placement Offers — per-student offers with package tracking
- Alumni Directory — with current employer, designation, city, mentor flag
- Alumni Events — reunions, webinars, mentorship programs, networking events
- Placement Dashboard — placement rate, highest/average/median packages, top recruiters, program-wise breakdown

### Phase 7: Analytics & Reporting
- Cross-module KPIs — conversion rate, average SGPA, attendance, fee collection, placement rate
- Admissions Pipeline — visual funnel from lead to enrollment
- Lead Conversion Funnel — stage-wise breakdown
- Program-wise SGPA — comparative bar chart
- Monthly Application Trends — bar chart
- Operational Metrics — faculty count, teaching hours, publications, outstanding fees

---

## CSV Import

The system includes a bulk CSV import feature accessible from the sidebar (CSV Import page). This lets you import your own institutional data from Excel or CSV files.

### How to Use

1. Login as Super Admin or Academic Admin
2. Click "CSV Import" in the sidebar
3. Select the data type you want to import (e.g. Students, Faculty, Programs)
4. Click "Download Template" to get a CSV file with correct headers and a sample row
5. Open the template in Excel or Google Sheets
6. Replace the sample row with your actual data
7. Save as CSV (UTF-8 encoding)
8. Drag the file into the upload zone or click to browse
9. Click "Import" and review the results

### Import Order

Data must be imported in this sequence because entities reference each other:

| Step | Entity | Why |
|------|--------|-----|
| 1 | Programs | Courses, students, and fees all reference programs by code |
| 2 | Faculty | Needed before creating course offerings |
| 3 | Courses | References programs by `program_code` column |
| 4 | Students | References programs by `program_code` column |
| 5 | Leads | Can optionally reference programs |
| 6 | Fee Structures | References programs by `program_code` column |
| 7 | Placement Companies | Independent, no dependencies |

### CSV Templates

#### Programs
```
code,name,department,degree_type,duration_years,total_credits,total_seats,fee_per_semester,mode,eligibility_criteria,description
MBA,Master of Business Administration,School of Management,PG,2,120,120,175000,regular,Bachelor's with 50% aggregate,Two-year MBA program
BBA,Bachelor of Business Administration,School of Management,UG,3,90,180,85000,regular,10+2 with 50% aggregate,Foundation program in business
```

#### Courses
```
code,name,program_code,semester,credits,course_type,description
MBA-501,Management Principles,MBA,1,4,core,Core management course
MBA-502,Financial Accounting,MBA,1,4,core,Accounting fundamentals
```
Note: `program_code` must match a program's `code` that was already imported.

#### Faculty
```
first_name,last_name,email,phone,employee_id,department,designation,qualification,specialization,experience_years,research_interests
Rajesh,Kumar,rajesh.k@university.edu,+91 98765 43210,FAC-2025-001,School of Management,Professor,Ph.D.,Strategic Management,15,Digital Transformation
```
All imported faculty get the default password: `faculty123`

#### Students
```
first_name,last_name,email,phone,roll_number,program_code,batch_year,current_semester,date_of_birth,gender,city,state,pincode
Aarav,Sharma,aarav.s@gmail.com,+91 98765 43210,MBA-2025-001,MBA,2025,1,2000-05-15,male,Hyderabad,Telangana,500032
```
- `program_code` must match an existing program
- `gender` accepts: male, female, m, f
- `date_of_birth` accepts: YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY
- All imported students get the default password: `student123`

#### Leads
```
first_name,last_name,email,phone,source,status,program_code,notes
Priya,Patel,priya.p@gmail.com,+91 87654 32100,website,new,MBA,Interested in MBA program
```
- `source` accepts: website, referral, social_media, newspaper, education_fair, walk_in, other
- `status` accepts: new, contacted, interested, application_sent, converted, lost

#### Fee Structures
```
program_code,semester,fee_type,amount,due_date
MBA,1,tuition,113750,2025-07-15
MBA,1,examination,17500,2025-07-15
MBA,1,library,8750,2025-07-15
```
- `fee_type` accepts: tuition, examination, library, laboratory, hostel, transport, registration, other

#### Placement Companies
```
name,industry,website,contact_person,contact_email,contact_phone,visit_date,roles_offered,package_min_lpa,package_max_lpa
Tata Consultancy Services,IT Services,https://tcs.com,Amit Shah,amit@tcs.com,+91 98765 43210,2025-03-15,Software Engineer; Business Analyst,4.5,8.0
```

### Import Behavior

- Duplicate emails (faculty/students) and duplicate codes (programs/courses) are automatically skipped
- The results screen shows imported count, skipped count, and any row-level errors
- Import is additive — it adds to existing data without deleting anything
- Running the same CSV twice is safe — duplicates will be skipped

---

## Creating Data via the UI

In addition to CSV import, most modules have create forms accessible via buttons in the UI:

| Page | Button | What It Creates |
|------|--------|----------------|
| Programs | + New Program | Academic program with code, name, fees, seats |
| Courses | + New Course | Course within a program |
| Courses | + New Offering | Assigns a faculty member to teach a course |
| Leads | + New Lead | Pre-admission inquiry record |
| Attendance | Save Attendance | Click to toggle student status, then save |
| Examinations | + Add Assessment | Quiz, exam, assignment with weightage |
| Examinations | (click assessment card) | Opens marks entry for that assessment |
| Fees | + Fee Structure | Add fee component for a program |
| Fees | Generate Invoices | Auto-creates invoices for all students |
| Fees | Pay (on each invoice) | Record a payment against an invoice |
| Placement | + Company | Add a recruiting company |
| Placement | + Placement Offer | Record a placement offer for a student |
| Faculty & HR | + Apply Leave | Submit a leave application |

---

## API Documentation

The backend includes auto-generated Swagger documentation at:

```
https://YOUR-RENDER-URL.onrender.com/docs
```

This shows every API endpoint with request/response schemas. You can test endpoints directly from this page by clicking "Try it out".

To authenticate: call POST `/api/auth/login`, copy the `access_token`, then click "Authorize" at the top and paste `Bearer YOUR_TOKEN`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 15 (hosted on Supabase) |
| Auth | JWT (python-jose), bcrypt |
| Deployment | Vercel + Render + Supabase (all free, no card) |

## Project Structure

```
university-erp/
├── render.yaml                      # Render deployment config
├── README.md                        # This file
│
├── backend/
│   ├── Dockerfile                   # Docker build for Render
│   ├── requirements.txt             # Python dependencies
│   └── app/
│       ├── main.py                  # FastAPI app, CORS, router registration
│       ├── database.py              # Supabase-aware async SQLAlchemy
│       ├── seed.py                  # Demo data generator (all 7 phases)
│       ├── models/
│       │   └── models.py            # 31 database tables
│       ├── schemas/
│       │   └── schemas.py           # Pydantic request/response validation
│       ├── routers/
│       │   ├── auth.py              # Login, register, profile
│       │   ├── dashboard.py         # Aggregated statistics
│       │   ├── programs.py          # Academic programs CRUD
│       │   ├── leads.py             # Pre-admission lead CRM
│       │   ├── applications.py      # Application lifecycle
│       │   ├── reviews.py           # Evaluation & offers
│       │   ├── students.py          # Enrollment management
│       │   ├── courses.py           # Courses & offerings
│       │   ├── timetable.py         # Weekly schedule
│       │   ├── attendance.py        # Attendance marking & summary
│       │   ├── examinations.py      # Assessments, marks, grades, SGPA
│       │   ├── fees.py              # Fee invoices & payments
│       │   ├── faculty.py           # Profiles, publications, leave
│       │   ├── alumni.py            # Alumni & placement
│       │   ├── analytics.py         # Cross-module analytics
│       │   └── csv_import.py        # Bulk CSV import with templates
│       └── utils/
│           └── auth.py              # JWT & password utilities
│
├── frontend/
│   ├── vercel.json                  # Vercel deployment config
│   ├── package.json                 # Node.js dependencies
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── lib/
│   │   └── api.ts                   # Typed API client
│   ├── components/
│   │   ├── Sidebar.tsx              # Role-based navigation (14 items)
│   │   ├── PageShell.tsx            # Authenticated layout wrapper
│   │   └── StatusBadge.tsx          # Colored status pills
│   └── app/
│       ├── layout.tsx               # Root layout with fonts
│       ├── globals.css              # Tailwind + design tokens
│       ├── login/page.tsx           # Login with demo credentials
│       ├── dashboard/page.tsx       # Stats & analytics dashboard
│       ├── leads/page.tsx           # Lead management
│       ├── applications/page.tsx    # Application list
│       ├── applications/[id]/page.tsx  # Application detail + review + offer
│       ├── students/page.tsx        # Enrolled students
│       ├── programs/page.tsx        # Program catalog + create
│       ├── courses/page.tsx         # Courses & offerings + create
│       ├── timetable/page.tsx       # Weekly schedule (grid + list)
│       ├── attendance/page.tsx      # Mark attendance + summary
│       ├── examinations/page.tsx    # Assessments, marks, grades
│       ├── results/page.tsx         # Grade cards with SGPA/CGPA
│       ├── fees/page.tsx            # Invoices, payments, defaulters
│       ├── faculty-hr/page.tsx      # Faculty profiles, leave, workload
│       ├── placement/page.tsx       # Companies, offers, alumni, events
│       ├── analytics/page.tsx       # Cross-module analytics
│       └── import/page.tsx          # CSV bulk import
```

---

## Updating the Code

Whenever you receive an updated project archive:

1. Extract and replace your `university-erp` folder
2. Open terminal:
   ```bash
   cd university-erp
   git init
   git add .
   git commit -m "Update"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/university-erp.git
   git push -u origin main --force
   ```
   If `git remote add` gives "already exists", skip that line and just run `git push -u origin main --force`
3. Render and Vercel auto-redeploy within 3-5 minutes

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS error in browser | Check that `FRONTEND_URL` on Render matches your exact Vercel URL (no trailing slash) |
| "Connection refused" from backend | Render is sleeping. Visit the health endpoint and wait 30-50 seconds |
| "Relation does not exist" | Seed script hasn't run. Visit `/api/seed` in your browser |
| Supabase project paused | Go to Supabase dashboard, click "Restore project" |
| "password authentication failed" | Check DATABASE_URL on Render — password must have no square brackets and no special characters |
| "not a git repository" | You need to run `git init` first (happens when you replace the folder) |
| CSV import fails | Check that you're importing in the correct order (Programs first) |
| Slow first load | Normal — Render free tier cold start takes 30-50 seconds |
