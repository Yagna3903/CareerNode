"""
SQLAlchemy ORM models for CareerNode.
Tables mirror the schema.sql — Supabase Auth manages auth.users;
we only define the public-schema tables here.
"""
import uuid
from datetime import datetime, date
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    UUID, Text, SmallInteger, Date, TIMESTAMP, ForeignKey, CheckConstraint,
    UniqueConstraint, String
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    user_context: Mapped[Optional["UserContext"]] = relationship(
        back_populates="profile", uselist=False
    )
    applications: Mapped[list["Application"]] = relationship(back_populates="profile")


class UserContext(Base):
    __tablename__ = "user_context"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    master_resume_text: Mapped[Optional[str]] = mapped_column(Text)
    education_background: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="Advanced Diploma in Computer Systems Technology - Information Systems Engineering",
    )

    profile: Mapped["Profile"] = relationship(back_populates="user_context")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    posting_url: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    date_posted: Mapped[Optional[date]] = mapped_column(Date)
    vector_embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(768))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    applications: Mapped[list["Application"]] = relationship(back_populates="job")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job"),
        CheckConstraint("ai_match_score BETWEEN 0 AND 100", name="ck_match_score"),
        CheckConstraint(
            "status IN ('pending','applied','interviewing','rejected','offered')",
            name="ck_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    ai_match_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    generated_cover_letter: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    profile: Mapped["Profile"] = relationship(back_populates="applications")
    job: Mapped["Job"] = relationship(back_populates="applications")
