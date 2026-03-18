"""
University ERP System - Backend API
====================================
Architecture (Option B - Zero Credit Card):
  - Backend:  Render free tier (no card)
  - Database: Supabase free tier (no card, no expiry)
  - Frontend: Vercel free tier (no card)
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import auth, leads, applications, reviews, students, dashboard, programs
from app.routers import courses, timetable, attendance
from app.routers import examinations
from app.routers import fees, faculty
from app.routers import alumni, analytics
from app.routers import csv_import


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="University ERP API",
    description="Comprehensive University ERP System - Pre-Admission to Alumni Management",
    version="1.0.0",
    lifespan=lifespan,
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", FRONTEND_URL],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(programs.router, prefix="/api/programs", tags=["Programs"])
app.include_router(leads.router, prefix="/api/leads", tags=["Lead Management"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Application Reviews"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses & Offerings"])
app.include_router(timetable.router, prefix="/api/timetable", tags=["Timetable"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(examinations.router, prefix="/api/exams", tags=["Examinations & Grading"])
app.include_router(fees.router, prefix="/api/fees", tags=["Fee Management"])
app.include_router(faculty.router, prefix="/api/faculty", tags=["Faculty & HR"])
app.include_router(alumni.router, prefix="/api/alumni", tags=["Alumni & Placement"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(csv_import.router, prefix="/api/import", tags=["CSV Import"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "University ERP API", "db": "Supabase PostgreSQL"}


@app.get("/api/seed")
async def run_seed():
    """
    One-time database seed endpoint.
    Visit this URL in your browser to populate demo data.
    Safe to call multiple times - it drops and recreates all tables.
    """
    import asyncio
    from app.seed import seed
    try:
        await seed()
        return {
            "status": "success",
            "message": "Database seeded with demo data (all 7 phases)",
            "credentials": {
                "super_admin": "admin@university.edu / admin123",
                "dean": "dean@university.edu / dean123",
                "faculty": "faculty@university.edu / faculty123",
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
