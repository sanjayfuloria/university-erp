"""
Database configuration for async SQLAlchemy + PostgreSQL
=========================================================
Supports:
  - Local PostgreSQL (default for development)
  - Supabase hosted PostgreSQL (production - free tier, no card required)
  - Render hosted PostgreSQL (alternative)

For Supabase:
  1. Create a free project at https://supabase.com
  2. Go to Project Settings > Database > Connection string > Session pooler (port 5432)
  3. Copy the URI and set it as DATABASE_URL env var
  4. The format will be: postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:5432/postgres
"""

import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/university_erp"
)

# Normalize any postgres:// or postgresql:// prefix to asyncpg driver format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Detect if connecting to a remote host (Supabase, Render, etc.) that needs SSL
is_remote = not any(host in DATABASE_URL for host in ["localhost", "127.0.0.1", "host.docker.internal"])

connect_args = {}
if is_remote:
    # Supabase and most cloud Postgres providers require SSL
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE  # Supabase free tier uses self-signed certs
    connect_args["ssl"] = ssl_context

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_size=5,           # Conservative for free tier
    max_overflow=2,
    pool_pre_ping=True,    # Detect stale connections (important for sleeping DBs)
    pool_recycle=300,       # Recycle connections every 5 min
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
